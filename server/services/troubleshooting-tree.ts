import type { SOPDoc, SOPStep } from '../src/types/core';
import { evidenceLedger } from './evidence-ledger';
import { aiRouter } from './ai-router';
import { storage } from '../storage';

// SOPGRID Dynamic Troubleshooting Tree System
// Generates troubleshooting paths starting from failure points

export interface TroubleshootingNode {
  id: string;
  type: 'FAILURE' | 'DIAGNOSTIC' | 'ACTION' | 'VERIFICATION' | 'RESOLUTION';
  title: string;
  description: string;
  level: number;
  metadata: {
    failureCode?: string;
    component?: string;
    symptoms?: string[];
    tools?: string[];
    specs?: Record<string, string>;
    timeEstimate?: number; // minutes
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
    safetyWarnings?: string[];
  };
  children: TroubleshootingNode[];
  parent?: string;
  sopReference?: { sopId: string; stepId: string };
  probability?: number; // Success probability 0-1
}

export interface TroubleshootingTree {
  id: string;
  title: string;
  rootFailure: string;
  createdAt: Date;
  updatedAt: Date;
  source: 'SOP' | 'MANUAL' | 'LLM' | 'HYBRID';
  nodes: Map<string, TroubleshootingNode>;
  currentPath: string[];
  resolutionRate: number;
}

export interface FailureContext {
  description: string;
  errorCodes?: string[];
  component?: string;
  symptoms: string[];
  previousAttempts?: string[];
  environmentalFactors?: Record<string, any>;
}

export class TroubleshootingTreeService {
  private trees: Map<string, TroubleshootingTree> = new Map();
  private nodeIdCounter = 0;

  async generateTreeFromFailure(
    failure: FailureContext,
    sops?: SOPDoc[],
    manualContent?: string
  ): Promise<TroubleshootingTree> {
    const treeId = `tree_${Date.now()}`;
    
    // Create root failure node
    const rootNode = this.createFailureNode(failure);
    
    // Initialize tree
    const tree: TroubleshootingTree = {
      id: treeId,
      title: `Troubleshooting: ${failure.component || 'System'} - ${failure.description}`,
      rootFailure: rootNode.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'HYBRID',
      nodes: new Map([[rootNode.id, rootNode]]),
      currentPath: [rootNode.id],
      resolutionRate: 0
    };

    // Generate diagnostic branches
    const diagnosticNodes = await this.generateDiagnosticNodes(failure, rootNode, sops, manualContent);
    
    // Add diagnostic nodes to tree
    for (const node of diagnosticNodes) {
      tree.nodes.set(node.id, node);
      rootNode.children.push(node);
      
      // Generate action nodes for each diagnostic
      const actionNodes = await this.generateActionNodes(node, failure, sops);
      for (const actionNode of actionNodes) {
        tree.nodes.set(actionNode.id, actionNode);
        node.children.push(actionNode);
        
        // Generate verification nodes
        const verificationNode = await this.generateVerificationNode(actionNode);
        tree.nodes.set(verificationNode.id, verificationNode);
        actionNode.children.push(verificationNode);
        
        // Generate resolution or further diagnostic nodes
        const resolutionNodes = await this.generateResolutionNodes(verificationNode, failure);
        for (const resNode of resolutionNodes) {
          tree.nodes.set(resNode.id, resNode);
          verificationNode.children.push(resNode);
        }
      }
    }

    // Store tree
    this.trees.set(treeId, tree);
    
    // Log to ledger
    await evidenceLedger.append('SOP_DRAFT', {
      type: 'TROUBLESHOOTING_TREE',
      treeId,
      rootFailure: failure.description,
      nodeCount: tree.nodes.size
    });

    return tree;
  }

  private createFailureNode(failure: FailureContext): TroubleshootingNode {
    return {
      id: this.generateNodeId(),
      type: 'FAILURE',
      title: failure.description,
      description: `Initial failure point: ${failure.description}`,
      level: 0,
      metadata: {
        failureCode: failure.errorCodes?.[0],
        component: failure.component,
        symptoms: failure.symptoms
      },
      children: []
    };
  }

  private async generateDiagnosticNodes(
    failure: FailureContext,
    parentNode: TroubleshootingNode,
    sops?: SOPDoc[],
    manualContent?: string
  ): Promise<TroubleshootingNode[]> {
    const diagnosticNodes: TroubleshootingNode[] = [];
    
    // Extract diagnostics from SOPs
    if (sops) {
      const sopDiagnostics = this.extractDiagnosticsFromSOPs(sops, failure);
      diagnosticNodes.push(...sopDiagnostics);
    }
    
    // Generate LLM-based diagnostics
    const llmPrompt = `Generate diagnostic steps for the following RV system failure:
    
Failure: ${failure.description}
Component: ${failure.component || 'Unknown'}
Symptoms: ${failure.symptoms.join(', ')}
Error Codes: ${failure.errorCodes?.join(', ') || 'None'}

Provide 3-5 diagnostic steps that would help identify the root cause, starting with the most likely issues.
Each diagnostic should be specific, measurable, and actionable.

Format as JSON array with: {
  "title": "Brief diagnostic title",
  "description": "Detailed diagnostic procedure",
  "tools": ["required tools"],
  "timeEstimate": minutes as number,
  "probability": 0-1 success likelihood
}`;

    try {
      const llmResponse = await aiRouter.chat(llmPrompt);
      const llmDiagnostics = this.parseLLMDiagnostics(llmResponse, parentNode.id);
      diagnosticNodes.push(...llmDiagnostics);
    } catch (error) {
      console.error('Failed to generate LLM diagnostics:', error);
    }
    
    // Parse manual content if available
    if (manualContent) {
      const manualDiagnostics = this.parseManualDiagnostics(manualContent, failure, parentNode.id);
      diagnosticNodes.push(...manualDiagnostics);
    }
    
    return diagnosticNodes;
  }

  private extractDiagnosticsFromSOPs(sops: SOPDoc[], failure: FailureContext): TroubleshootingNode[] {
    const diagnostics: TroubleshootingNode[] = [];
    
    for (const sop of sops) {
      for (const step of sop.steps) {
        // Check if step relates to failure symptoms or component
        if (this.stepMatchesFailure(step, failure)) {
          const node: TroubleshootingNode = {
            id: this.generateNodeId(),
            type: 'DIAGNOSTIC',
            title: `Check: ${step.text.substring(0, 50)}...`,
            description: step.text,
            level: 1,
            metadata: {
              tools: step.tools,
              specs: step.specs,
              safetyWarnings: [...step.risks, ...step.ppe]
            },
            children: [],
            sopReference: { sopId: sop.id, stepId: step.id }
          };
          diagnostics.push(node);
        }
      }
    }
    
    return diagnostics;
  }

  private stepMatchesFailure(step: SOPStep, failure: FailureContext): boolean {
    const stepText = step.text.toLowerCase();
    const failureText = failure.description.toLowerCase();
    
    // Check for component match
    if (failure.component && stepText.includes(failure.component.toLowerCase())) {
      return true;
    }
    
    // Check for symptom matches
    for (const symptom of failure.symptoms) {
      if (stepText.includes(symptom.toLowerCase())) {
        return true;
      }
    }
    
    // Check for error code references
    for (const code of failure.errorCodes || []) {
      if (stepText.includes(code.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  private parseLLMDiagnostics(llmResponse: string, parentId: string): TroubleshootingNode[] {
    const nodes: TroubleshootingNode[] = [];
    
    try {
      // Extract JSON from response
      const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return nodes;
      
      const diagnostics = JSON.parse(jsonMatch[0]);
      
      for (const diag of diagnostics) {
        nodes.push({
          id: this.generateNodeId(),
          type: 'DIAGNOSTIC',
          title: diag.title || 'Diagnostic Step',
          description: diag.description || '',
          level: 1,
          metadata: {
            tools: diag.tools || [],
            timeEstimate: diag.timeEstimate || 15,
            difficulty: this.estimateDifficulty(diag)
          },
          children: [],
          parent: parentId,
          probability: diag.probability || 0.5
        });
      }
    } catch (error) {
      console.error('Failed to parse LLM diagnostics:', error);
    }
    
    return nodes;
  }

  private parseManualDiagnostics(manual: string, failure: FailureContext, parentId: string): TroubleshootingNode[] {
    const nodes: TroubleshootingNode[] = [];
    
    // Simple parsing - in production, use more sophisticated NLP
    const lines = manual.split('\n');
    const relevantSections: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Find sections related to troubleshooting or diagnostics
      if (line.includes('troubleshoot') || line.includes('diagnostic') || 
          line.includes('problem') || line.includes('failure')) {
        
        // Extract next 5-10 lines as relevant content
        const section = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
        relevantSections.push(section);
        i += 10; // Skip processed lines
      }
    }
    
    // Convert sections to nodes
    for (const section of relevantSections.slice(0, 3)) {
      nodes.push({
        id: this.generateNodeId(),
        type: 'DIAGNOSTIC',
        title: `Manual Check: ${section.substring(0, 40)}...`,
        description: section,
        level: 1,
        metadata: {
          difficulty: 'MEDIUM'
        },
        children: [],
        parent: parentId
      });
    }
    
    return nodes;
  }

  private async generateActionNodes(
    diagnosticNode: TroubleshootingNode,
    failure: FailureContext,
    sops?: SOPDoc[]
  ): Promise<TroubleshootingNode[]> {
    const actionNodes: TroubleshootingNode[] = [];
    
    // Generate 2-3 possible actions based on diagnostic
    const actionPrompt = `Based on this diagnostic step: "${diagnosticNode.description}"
For the failure: "${failure.description}"

Generate 2-3 specific repair actions that could resolve the issue.
Include required tools, specifications, and safety warnings.

Format as JSON array with: {
  "title": "Action title",
  "description": "Detailed procedure",
  "tools": ["required tools"],
  "specs": {"key": "value"},
  "timeEstimate": minutes,
  "difficulty": "EASY|MEDIUM|HARD|EXPERT",
  "safetyWarnings": ["warnings"]
}`;

    try {
      const response = await aiRouter.chat(actionPrompt);
      const actions = this.parseActionResponse(response, diagnosticNode.id);
      actionNodes.push(...actions);
    } catch (error) {
      console.error('Failed to generate action nodes:', error);
      
      // Fallback to basic action
      actionNodes.push({
        id: this.generateNodeId(),
        type: 'ACTION',
        title: 'Perform Repair',
        description: `Execute repair based on diagnostic: ${diagnosticNode.title}`,
        level: 2,
        metadata: {
          timeEstimate: 30,
          difficulty: 'MEDIUM'
        },
        children: [],
        parent: diagnosticNode.id
      });
    }
    
    return actionNodes;
  }

  private parseActionResponse(response: string, parentId: string): TroubleshootingNode[] {
    const nodes: TroubleshootingNode[] = [];
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return nodes;
      
      const actions = JSON.parse(jsonMatch[0]);
      
      for (const action of actions) {
        nodes.push({
          id: this.generateNodeId(),
          type: 'ACTION',
          title: action.title || 'Repair Action',
          description: action.description || '',
          level: 2,
          metadata: {
            tools: action.tools || [],
            specs: action.specs || {},
            timeEstimate: action.timeEstimate || 30,
            difficulty: action.difficulty || 'MEDIUM',
            safetyWarnings: action.safetyWarnings || []
          },
          children: [],
          parent: parentId
        });
      }
    } catch (error) {
      console.error('Failed to parse action response:', error);
    }
    
    return nodes;
  }

  private async generateVerificationNode(actionNode: TroubleshootingNode): Promise<TroubleshootingNode> {
    return {
      id: this.generateNodeId(),
      type: 'VERIFICATION',
      title: `Verify: ${actionNode.title}`,
      description: `Test the system after completing: ${actionNode.description}
      
Verification steps:
1. Power on the system
2. Check for error codes
3. Test the affected component
4. Monitor for ${actionNode.metadata.timeEstimate || 5} minutes
5. Document results`,
      level: 3,
      metadata: {
        timeEstimate: 10,
        difficulty: 'EASY'
      },
      children: [],
      parent: actionNode.id
    };
  }

  private async generateResolutionNodes(
    verificationNode: TroubleshootingNode,
    failure: FailureContext
  ): Promise<TroubleshootingNode[]> {
    const nodes: TroubleshootingNode[] = [];
    
    // Success resolution
    nodes.push({
      id: this.generateNodeId(),
      type: 'RESOLUTION',
      title: 'Issue Resolved',
      description: `The ${failure.component || 'system'} is now functioning correctly. Document the repair and update maintenance logs.`,
      level: 4,
      metadata: {
        timeEstimate: 5,
        difficulty: 'EASY'
      },
      children: [],
      parent: verificationNode.id,
      probability: 0.7
    });
    
    // Failure - needs escalation
    nodes.push({
      id: this.generateNodeId(),
      type: 'DIAGNOSTIC',
      title: 'Issue Persists - Further Diagnosis Required',
      description: 'The initial repair did not resolve the issue. Proceed with advanced diagnostics or escalate to specialist.',
      level: 4,
      metadata: {
        difficulty: 'EXPERT'
      },
      children: [],
      parent: verificationNode.id,
      probability: 0.3
    });
    
    return nodes;
  }

  async traverseTree(
    treeId: string,
    nodeId: string,
    userFeedback?: string
  ): Promise<{
    currentNode: TroubleshootingNode;
    suggestedNext: TroubleshootingNode[];
    pathHistory: string[];
  }> {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error('Tree not found');
    
    const currentNode = tree.nodes.get(nodeId);
    if (!currentNode) throw new Error('Node not found');
    
    // Update current path
    if (!tree.currentPath.includes(nodeId)) {
      tree.currentPath.push(nodeId);
    }
    
    // Get suggested next steps based on probability and user feedback
    let suggestedNext = [...currentNode.children];
    
    if (userFeedback) {
      // Re-rank based on user feedback
      suggestedNext = await this.rerankNodes(suggestedNext, userFeedback);
    }
    
    // Sort by probability if available
    suggestedNext.sort((a, b) => (b.probability || 0.5) - (a.probability || 0.5));
    
    return {
      currentNode,
      suggestedNext: suggestedNext.slice(0, 3), // Top 3 suggestions
      pathHistory: [...tree.currentPath]
    };
  }

  private async rerankNodes(nodes: TroubleshootingNode[], feedback: string): Promise<TroubleshootingNode[]> {
    // Use LLM to rerank based on user feedback
    const prompt = `User feedback: "${feedback}"
    
Available next steps:
${nodes.map((n, i) => `${i + 1}. ${n.title}: ${n.description}`).join('\n')}

Rank these steps from most to least relevant based on the user feedback.
Return as JSON array of indices in order of relevance.`;

    try {
      const response = await aiRouter.chat(prompt);
      const ranking = this.parseRanking(response, nodes.length);
      
      return ranking.map(i => nodes[i]).filter(n => n);
    } catch (error) {
      console.error('Failed to rerank nodes:', error);
      return nodes;
    }
  }

  private parseRanking(response: string, nodeCount: number): number[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return Array.from({ length: nodeCount }, (_, i) => i);
      
      const indices = JSON.parse(jsonMatch[0]);
      return indices.map((i: any) => parseInt(i) - 1).filter((i: number) => i >= 0 && i < nodeCount);
    } catch (error) {
      return Array.from({ length: nodeCount }, (_, i) => i);
    }
  }

  private estimateDifficulty(diagnostic: any): 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT' {
    const tools = diagnostic.tools || [];
    const time = diagnostic.timeEstimate || 15;
    
    if (time < 15 && tools.length < 3) return 'EASY';
    if (time < 30 && tools.length < 5) return 'MEDIUM';
    if (time < 60) return 'HARD';
    return 'EXPERT';
  }

  private generateNodeId(): string {
    return `node_${++this.nodeIdCounter}_${Date.now()}`;
  }

  async exportTree(treeId: string): Promise<string> {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error('Tree not found');
    
    const exportData = {
      ...tree,
      nodes: Array.from(tree.nodes.entries()).map(([nodeId, node]) => ({ nodeId, ...node }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  async getTreeStats(treeId: string): Promise<{
    totalNodes: number;
    nodesByType: Record<string, number>;
    maxDepth: number;
    averageTimeEstimate: number;
    resolutionPaths: number;
  }> {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error('Tree not found');
    
    const nodesByType: Record<string, number> = {};
    let totalTime = 0;
    let timeCount = 0;
    let maxDepth = 0;
    let resolutionPaths = 0;
    
    for (const [nodeId, node] of Array.from(tree.nodes.entries())) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      
      if (node.metadata.timeEstimate) {
        totalTime += node.metadata.timeEstimate;
        timeCount++;
      }
      
      if (node.level > maxDepth) {
        maxDepth = node.level;
      }
      
      if (node.type === 'RESOLUTION') {
        resolutionPaths++;
      }
    }
    
    return {
      totalNodes: tree.nodes.size,
      nodesByType,
      maxDepth,
      averageTimeEstimate: timeCount > 0 ? totalTime / timeCount : 0,
      resolutionPaths
    };
  }
}

export const troubleshootingTreeService = new TroubleshootingTreeService();