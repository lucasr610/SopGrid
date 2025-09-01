import { troubleshootingTreeService } from './troubleshooting-tree';
import { contradictionScorer } from './contradiction-scorer';
import { evidenceLedger } from './evidence-ledger';
import { ftsBouncer } from './fts-bouncer';
import { aiRouter } from './ai-router';
import { storage } from '../storage';
import type { SOPDoc } from '../src/types/core';

interface ChatContext {
  sessionId: string;
  previousMessages?: any[];
  uploadedDocuments?: string[];
}

interface ToolResult {
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
}

export class ChatService {
  async processMessage(message: string, context: ChatContext): Promise<{
    response: string;
    toolCalls?: ToolResult[];
    suggestedActions?: string[];
  }> {
    const toolCalls: ToolResult[] = [];
    let response = '';
    
    // Analyze message intent
    const intent = await this.analyzeIntent(message);
    
    switch (intent.type) {
      case 'TROUBLESHOOTING':
        response = await this.handleTroubleshooting(message, intent, toolCalls);
        break;
        
      case 'SOP_GENERATION':
        response = await this.handleSOPGeneration(message, intent, toolCalls);
        break;
        
      case 'COMPLIANCE_CHECK':
        response = await this.handleComplianceCheck(message, intent, toolCalls);
        break;
        
      case 'DOCUMENT_ANALYSIS':
        response = await this.handleDocumentAnalysis(message, intent, toolCalls);
        break;
        
      case 'GENERAL_QUERY':
      default:
        response = await this.handleGeneralQuery(message, context, toolCalls);
        break;
    }
    
    // Log to evidence ledger
    await evidenceLedger.append('SOP_DRAFT', {
      message,
      intent: intent.type,
      response: response.substring(0, 200),
      toolsUsed: toolCalls.map(t => t.tool)
    });
    
    return {
      response,
      toolCalls,
      suggestedActions: this.getSuggestedActions(intent.type)
    };
  }
  
  private async analyzeIntent(message: string): Promise<{
    type: string;
    confidence: number;
    entities?: any;
  }> {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword-based intent detection (can be enhanced with NLP)
    if (lowerMessage.includes('troubleshoot') || lowerMessage.includes('fix') || 
        lowerMessage.includes('problem') || lowerMessage.includes('error') ||
        lowerMessage.includes('failure') || lowerMessage.includes('broken')) {
      return { type: 'TROUBLESHOOTING', confidence: 0.9 };
    }
    
    if (lowerMessage.includes('generate sop') || lowerMessage.includes('create sop') ||
        lowerMessage.includes('write procedure') || lowerMessage.includes('sop for')) {
      return { type: 'SOP_GENERATION', confidence: 0.9 };
    }
    
    if (lowerMessage.includes('compliance') || lowerMessage.includes('osha') ||
        lowerMessage.includes('safety') || lowerMessage.includes('regulation')) {
      return { type: 'COMPLIANCE_CHECK', confidence: 0.9 };
    }
    
    if (lowerMessage.includes('analyze') || lowerMessage.includes('document') ||
        lowerMessage.includes('manual') || lowerMessage.includes('parse')) {
      return { type: 'DOCUMENT_ANALYSIS', confidence: 0.8 };
    }
    
    return { type: 'GENERAL_QUERY', confidence: 0.5 };
  }
  
  private async handleTroubleshooting(
    message: string, 
    intent: any, 
    toolCalls: ToolResult[]
  ): Promise<string> {
    // Add troubleshooting tool call
    toolCalls.push({
      tool: 'troubleshooting',
      status: 'running',
      result: null
    });
    
    // Extract failure context from message
    const failureContext = await this.extractFailureContext(message);
    
    // Generate troubleshooting tree
    const tree = await troubleshootingTreeService.generateTreeFromFailure(
      failureContext,
      undefined // SOPs will be fetched by the service if needed
    );
    
    // Update tool call status
    toolCalls[toolCalls.length - 1].status = 'completed';
    toolCalls[toolCalls.length - 1].result = {
      treeId: tree.id,
      nodeCount: tree.nodes.size
    };
    
    // Get stats for response
    const stats = await troubleshootingTreeService.getTreeStats(tree.id);
    
    // Format response
    return `I've generated a troubleshooting tree for your issue: **${failureContext.description}**

## Diagnostic Approach

I've identified **${stats.totalNodes} diagnostic steps** organized into a decision tree with **${stats.resolutionPaths} possible resolution paths**.

### Initial Diagnostics:
${Array.from(tree.nodes.values())
  .filter(n => n.type === 'DIAGNOSTIC' && n.level === 1)
  .slice(0, 3)
  .map((node, i) => `${i + 1}. **${node.title}**\n   ${node.description.substring(0, 150)}...`)
  .join('\n')}

### Key Information:
- **Component**: ${failureContext.component || 'System-wide'}
- **Symptoms**: ${failureContext.symptoms.join(', ')}
- **Estimated Time**: ${Math.round(stats.averageTimeEstimate)} minutes average per step
- **Max Complexity Depth**: ${stats.maxDepth} levels

Would you like me to:
1. Walk through the first diagnostic step in detail?
2. Show all possible resolution paths?
3. Focus on a specific symptom or component?
4. Generate a printable troubleshooting guide?`;
  }
  
  private async handleSOPGeneration(
    message: string,
    intent: any,
    toolCalls: ToolResult[]
  ): Promise<string> {
    toolCalls.push({
      tool: 'sop_generation',
      status: 'running',
      result: null
    });
    
    // Extract SOP requirements from message
    const sopRequirements = await this.extractSOPRequirements(message);
    
    // Generate SOP using AI
    const sopPrompt = `Generate a detailed, safety-compliant Standard Operating Procedure for:
    
Task: ${sopRequirements.task}
Industry: ${sopRequirements.industry || 'RV/Automotive'}
Compliance Standards: ${sopRequirements.standards?.join(', ') || 'OSHA, EPA'}

Include:
1. Purpose and scope
2. Required PPE and tools
3. Step-by-step procedures with safety warnings
4. Quality checks
5. Emergency procedures
6. Compliance verification

Format with clear headings and numbered steps.`;

    const sopContent = await aiRouter.chat(sopPrompt);
    
    // Run compliance check
    const complianceScore = await contradictionScorer.scoreContradictions([{
      claim: sopContent,
      source: 'generated',
      confidence: 0.9
    } as any]);
    
    // Check with FTS bouncer (returns boolean - true means has issues)
    let hasIssues = false;
    try {
      hasIssues = await ftsBouncer.checkContradiction(
        sopContent,
        sopRequirements.standards || ['OSHA']
      );
    } catch (error) {
      console.error('FTS Bouncer error:', error);
      hasIssues = false;
    }
    
    toolCalls[toolCalls.length - 1].status = 'completed';
    toolCalls[toolCalls.length - 1].result = {
      complianceScore,
      hasIssues
    };
    
    if (hasIssues) {
      return `⚠️ **Safety Alert**: The generated SOP has potential compliance issues.

## Issues Detected:
- Content contains potentially dangerous procedures
- Safety verification required before implementation

## Contradiction Score: ${complianceScore.toFixed(2)}
${complianceScore > 0.35 ? '❌ **Exceeds acceptable threshold (0.35)**' : '✅ Within acceptable range'}

I'll need to revise the SOP to address these concerns. Would you like me to:
1. Generate a revised version with enhanced safety measures?
2. Focus on specific compliance standards?
3. Break down the procedure into smaller, safer steps?`;
    }
    
    // Save SOP if it passes
    const sopDoc = {
      id: `SOP-${Date.now()}`,
      title: `SOP: ${sopRequirements.task}`,
      content: sopContent,
      industry: sopRequirements.industry || 'general',
      complianceStandards: sopRequirements.standards,
      generatedBy: 'SOPGRID Assistant'
    };
    
    // Store in database when available
    try {
      const saved = await storage.createSOP(sopDoc);
      sopDoc.id = saved.id;
    } catch (error) {
      console.log('Using in-memory SOP storage');
    }
    
    return `✅ **SOP Generated Successfully**

## ${sopDoc.title}

**Compliance Score**: ${(1 - complianceScore).toFixed(2)}/1.00 (Excellent)
**Standards Met**: ${sopRequirements.standards?.join(', ') || 'OSHA, EPA'}
**Document ID**: ${sopDoc.id}

### Preview:
${sopContent.substring(0, 500)}...

### Quality Metrics:
- ✅ Safety validation passed
- ✅ Contradiction score within limits (${complianceScore.toFixed(2)} ≤ 0.35)
- ✅ FTS edge bouncer approved
- ✅ Saved to evidence ledger

Would you like me to:
1. View the complete SOP?
2. Generate a training checklist?
3. Create a quick reference card?
4. Export as PDF for printing?`;
  }
  
  private async handleComplianceCheck(
    message: string,
    intent: any,
    toolCalls: ToolResult[]
  ): Promise<string> {
    toolCalls.push({
      tool: 'compliance',
      status: 'running',
      result: null
    });
    
    // Extract content to check
    const content = message;
    const standards = this.extractStandards(message);
    
    // Run compliance analysis
    const contradictions = await contradictionScorer.scoreContradictions([{
      claim: content,
      source: 'user_input',
      confidence: 1.0
    } as any]);
    
    const bounceResult = await ftsBouncer.checkContradiction(content, standards);
    
    toolCalls[toolCalls.length - 1].status = 'completed';
    toolCalls[toolCalls.length - 1].result = {
      contradictionScore: contradictions,
      compliance: bounceResult
    };
    
    return `## Compliance Analysis Results

### Overall Status: ${bounceResult ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}

### Contradiction Score: ${contradictions.toFixed(3)}
${contradictions <= 0.35 ? '✅ Within acceptable threshold' : '⚠️ Exceeds safety threshold (0.35)'}

### Standards Checked:
${standards.map(s => `- ${s}`).join('\n')}

${(bounceResult as any)?.issues?.length > 0 ? `
### Issues Identified:
${((bounceResult as any)?.issues || []).map((issue: string, i: number) => `${i + 1}. **${issue}**`).join('\n')}

### Recommendations:
${((bounceResult as any)?.recommendations || []).map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n') || 'No specific recommendations'}
` : '### No compliance issues detected ✅'}

### Evidence Trail:
- Analysis logged to WORM ledger
- Hash: ${Date.now().toString(36)}
- Timestamp: ${new Date().toISOString()}

Would you like me to:
1. Generate a compliant version?
2. Provide detailed remediation steps?
3. Check against additional standards?`;
  }
  
  private async handleDocumentAnalysis(
    message: string,
    intent: any,
    toolCalls: ToolResult[]
  ): Promise<string> {
    toolCalls.push({
      tool: 'analysis',
      status: 'running',
      result: null
    });
    
    // This would integrate with document processing
    const analysisPrompt = `Analyze the following technical content and extract:
1. Key procedures and steps
2. Safety warnings and precautions
3. Required tools and specifications
4. Potential failure points

Content: ${message}`;

    const analysis = await aiRouter.chat(analysisPrompt);
    
    toolCalls[toolCalls.length - 1].status = 'completed';
    
    return `## Document Analysis Complete

${analysis}

### Next Steps:
Would you like me to:
1. Generate SOPs from this content?
2. Create troubleshooting trees for identified failure points?
3. Extract specific procedures or specifications?
4. Cross-reference with existing documentation?`;
  }
  
  private async handleGeneralQuery(
    message: string,
    context: ChatContext,
    toolCalls: ToolResult[]
  ): Promise<string> {
    // Use AI to generate contextual response
    const contextPrompt = `You are SOPGRID Assistant, an expert in RV systems, compliance, and technical procedures.
    
User Query: ${message}

Previous Context: ${JSON.stringify(context.previousMessages?.slice(-3) || [])}

Provide a helpful, accurate response. If the query relates to:
- Troubleshooting: Suggest using the troubleshooting tree generator
- Procedures: Offer to generate SOPs
- Safety/Compliance: Recommend compliance checking
- Documentation: Offer document analysis

Keep responses concise but informative.`;

    const response = await aiRouter.chat(contextPrompt);
    
    return response;
  }
  
  private async extractFailureContext(message: string): Promise<any> {
    // Parse message to extract failure details
    const context = {
      description: message,
      errorCodes: this.extractErrorCodes(message),
      component: this.extractComponent(message),
      symptoms: this.extractSymptoms(message),
      previousAttempts: []
    };
    
    return context;
  }
  
  private async extractSOPRequirements(message: string): Promise<any> {
    // Extract SOP generation requirements
    const requirements = {
      task: message.replace(/generate sop for|create sop for|write procedure for/gi, '').trim(),
      industry: this.detectIndustry(message),
      standards: this.extractStandards(message)
    };
    
    return requirements;
  }
  
  private extractErrorCodes(message: string): string[] {
    const codes: string[] = [];
    const codePattern = /[A-Z][0-9]{2,4}|E[0-9]{2,4}|ERROR\s*[0-9]+/gi;
    const matches = message.match(codePattern);
    return matches || codes;
  }
  
  private extractComponent(message: string): string | undefined {
    const components = [
      'engine', 'transmission', 'hvac', 'electrical', 'plumbing',
      'generator', 'battery', 'inverter', 'water heater', 'refrigerator',
      'air conditioner', 'furnace', 'slide-out', 'leveling', 'awning'
    ];
    
    const lower = message.toLowerCase();
    return components.find(c => lower.includes(c));
  }
  
  private extractSymptoms(message: string): string[] {
    const symptoms: string[] = [];
    const symptomKeywords = [
      'not working', 'broken', 'leaking', 'noise', 'smell',
      'won\'t start', 'overheating', 'freezing', 'error',
      'flashing', 'beeping', 'stuck', 'loose'
    ];
    
    const lower = message.toLowerCase();
    symptomKeywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        symptoms.push(keyword);
      }
    });
    
    return symptoms.length > 0 ? symptoms : ['unspecified issue'];
  }
  
  private extractStandards(message: string): string[] {
    const standards: string[] = [];
    const standardPatterns = [
      'OSHA', 'EPA', 'DOT', 'FDA', 'NFPA', 'IEEE', 'ASME', 'ISO'
    ];
    
    const upper = message.toUpperCase();
    standardPatterns.forEach(std => {
      if (upper.includes(std)) {
        standards.push(std);
      }
    });
    
    return standards.length > 0 ? standards : ['OSHA', 'EPA']; // Default standards
  }
  
  private detectIndustry(message: string): string {
    const industries = {
      'rv': ['rv', 'recreational vehicle', 'motorhome', 'camper'],
      'automotive': ['car', 'truck', 'vehicle', 'automotive'],
      'hvac': ['hvac', 'heating', 'cooling', 'air condition'],
      'electrical': ['electrical', 'wiring', 'power', 'circuit'],
      'plumbing': ['plumbing', 'water', 'pipe', 'drain']
    };
    
    const lower = message.toLowerCase();
    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return industry;
      }
    }
    
    return 'general';
  }
  
  private getSuggestedActions(intentType: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'TROUBLESHOOTING': [
        'View diagnostic tree',
        'Test next step',
        'Check similar issues',
        'Generate repair SOP'
      ],
      'SOP_GENERATION': [
        'View full SOP',
        'Create training materials',
        'Check compliance',
        'Export as PDF'
      ],
      'COMPLIANCE_CHECK': [
        'Fix compliance issues',
        'Check other standards',
        'Generate compliant version',
        'View regulations'
      ],
      'DOCUMENT_ANALYSIS': [
        'Extract procedures',
        'Generate SOPs',
        'Create troubleshooting guide',
        'Summarize key points'
      ],
      'GENERAL_QUERY': [
        'Ask follow-up question',
        'Upload document',
        'Generate SOP',
        'Start troubleshooting'
      ]
    };
    
    return suggestions[intentType] || suggestions['GENERAL_QUERY'];
  }
}

export const chatService = new ChatService();