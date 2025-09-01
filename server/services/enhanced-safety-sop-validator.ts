/**
 * ENHANCED SAFETY SOP VALIDATOR
 * 
 * Multi-layered safety validation that catches the specific issues ChatGPT identified:
 * - LOTO/AGS lockout procedures
 * - CO/exhaust controls 
 * - Vehicle securement
 * - Fire & spill readiness
 * - Used-oil compliance
 * - SDS/HazCom requirements
 * - Technical safety gaps
 */

import { aiRouter } from './ai-router';
import { evidenceLedger } from './evidence-ledger';
import { comprehensiveTechnicalKnowledge } from './comprehensive-technical-knowledge';

export interface SafetyValidationResult {
  passed: boolean;
  criticalIssues: string[];
  warnings: string[];
  complianceGaps: ComplianceGap[];
  safetyScore: number;
  requiredFixes: string[];
  detailedAnalysis: string;
  missingTechnicalElements?: string[];
  technicalSuggestions?: string[];
}

export interface ComplianceGap {
  standard: 'OSHA' | 'EPA' | 'CDC' | 'NFPA' | 'IEEE' | 'ASME' | 'ISO';
  requirement: string;
  missing: string;
  severity: 'critical' | 'major' | 'minor';
  citation?: string;
}

class EnhancedSafetySOPValidator {
  
  /**
   * CRITICAL SAFETY VALIDATION - Catches the exact issues ChatGPT identified
   */
  async validateSOPSafety(sopContent: string, metadata: {
    title: string;
    system: string;
    component: string;
    complexity: string;
  }): Promise<SafetyValidationResult> {
    
    console.log('🛡️ ENHANCED SAFETY VALIDATION: Multi-layer safety analysis starting...');
    
    // Build comprehensive safety prompt with specific requirements
    const safetyPrompt = this.buildComprehensiveSafetyPrompt(sopContent, metadata);
    
    // Get validation from ALL THREE LLMs for comprehensive consensus
    const [motherResult, fatherResult, arbiterResult] = await Promise.all([
      this.validateWithMother(sopContent, safetyPrompt),
      this.validateWithFather(sopContent, safetyPrompt),
      this.validateWithArbiter(sopContent, safetyPrompt)
    ]);
    
    // Additional triple-LLM consensus validation
    const consensusResults = await this.validateWithAllThreeLLMs(sopContent, safetyPrompt);
    
    // Combine all validation results (6 total: 3 agents + 3 consensus)
    const allValidationResults = [motherResult, fatherResult, arbiterResult, ...consensusResults];
    
    // Consolidate results from all 6 LLM validations
    const consolidatedResult = this.consolidateValidationResults(allValidationResults);
    
    // ENHANCED: Add technical completeness validation
    const technicalValidation = comprehensiveTechnicalKnowledge.validateProcedureCompleteness(sopContent);
    if (!technicalValidation.complete) {
      consolidatedResult.missingTechnicalElements = technicalValidation.missingElements;
      consolidatedResult.technicalSuggestions = technicalValidation.suggestions;
      
      // Add technical gaps as critical issues
      technicalValidation.missingElements.forEach(element => {
        consolidatedResult.criticalIssues.push(`MISSING TECHNICAL REQUIREMENT: ${element}`);
      });
      
      // Lower safety score if technical elements are missing
      consolidatedResult.safetyScore = Math.max(0, consolidatedResult.safetyScore - (technicalValidation.missingElements.length * 15));
      consolidatedResult.passed = consolidatedResult.passed && technicalValidation.complete;
    }
    
    // Log to evidence ledger
    await evidenceLedger.append('SAFETY_VALIDATION', {
      sopTitle: metadata.title,
      safetyScore: consolidatedResult.safetyScore,
      criticalIssues: consolidatedResult.criticalIssues.length,
      complianceGaps: consolidatedResult.complianceGaps.length,
      validationModels: ['gemini', 'claude', 'chatgpt', 'gemini_consensus', 'claude_consensus', 'chatgpt_consensus'],
      llmModelsUsed: 6,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🛡️ SAFETY VALIDATION: Score ${consolidatedResult.safetyScore}% - ${consolidatedResult.criticalIssues.length} critical issues found`);
    
    return consolidatedResult;
  }
  
  /**
   * Build comprehensive safety prompt covering all the gaps ChatGPT identified
   */
  private buildComprehensiveSafetyPrompt(sopContent: string, metadata: any): string {
    return `
CRITICAL SAFETY VALIDATION REQUIRED - COMPREHENSIVE ANALYSIS

You are analyzing this SOP for RV/generator maintenance safety. Look for these SPECIFIC gaps that are commonly missed:

CRITICAL SAFETY REQUIREMENTS TO VERIFY:

1. LOCKOUT/TAGOUT (LOTO) & UNEXPECTED START PREVENTION:
   - Is AGS (Auto-Gen Start) disabled?
   - Are all generator controls switched OFF?
   - Is power isolated (fuse pulled or battery disconnect)?
   - Is there proper tagging ("DO NOT START - SERVICE IN PROGRESS")?
   - Are remote start apps/inverter autostart disabled?

2. CARBON MONOXIDE (CO) CONTROLS:
   - Is outdoor operation specified (not just "well-ventilated")?
   - Is >20 ft from openings requirement stated?
   - Are hard-ducted exhaust requirements mentioned?
   - Is CO alarm verification included?
   - Is garage/bay operation explicitly prohibited?

3. VEHICLE SECUREMENT:
   - Parking brake engagement?
   - Wheel chocks for chassis work?
   - Level parking verification?

4. FIRE & SPILL READINESS:
   - Class B fire extinguisher within reach?
   - Secondary containment/drip tray?
   - Ignition source control (no smoking, hot work)?
   - Oily rag management in closed metal container?

5. USED OIL COMPLIANCE (EPA 40 CFR 279.22):
   - Closed, sound container requirement?
   - "USED OIL" labeling requirement?
   - No mixing with solvents/fuel prohibition?
   - Approved collection site transport?

6. HAZCOM/SDS REQUIREMENTS:
   - Engine oil SDS availability?
   - PPE selection from hazard assessment?
   - Eye protection specification?
   - Glove/sleeve requirements for splash risk?

7. TECHNICAL SAFETY GAPS:
   - Proper warm-up procedure (not hot operation)?
   - Clean before opening (prevent contamination)?
   - Filter gasket check (double-gasket prevention)?
   - Proper drain plug procedure (crush washer, no thread tape)?
   - Filter prefill safety (upright only, dirt prevention)?
   - Post-run check procedure (60-120 sec max)?

8. WASTE HANDLING COMPLIANCE:
   - Filter hot-draining procedure?
   - Metal recycling requirements?
   - Daily oily rag disposal?
   - Record keeping (hour meter, intervals)?

SOP TO ANALYZE:
Title: ${metadata.title}
System: ${metadata.system}
Component: ${metadata.component}
Complexity: ${metadata.complexity}

Content:
${sopContent}

PROVIDE DETAILED ANALYSIS:
1. List each CRITICAL safety gap (must fix before use)
2. List each MAJOR safety concern (should fix) 
3. List each MINOR improvement (recommended)
4. Cite specific compliance standards (OSHA, EPA, CDC, etc.)
5. Provide overall safety score (0-100)
6. Give specific fix recommendations

FORMAT AS JSON with these fields:
- criticalIssues: string[]
- majorConcerns: string[]  
- minorIssues: string[]
- complianceGaps: [{standard, requirement, missing, severity, citation}]
- safetyScore: number
- detailedAnalysis: string
- requiredFixes: string[]
`;
  }
  
  /**
   * COMPREHENSIVE MULTI-LLM VALIDATION - ALL 3 AI MODELS FOR MAXIMUM SAFETY
   */
  
  /**
   * Mother Agent - Safety Conscience validation with Gemini
   */
  private async validateWithMother(sopContent: string, prompt: string): Promise<any> {
    console.log('🛡️ Mother (Gemini): Running safety validation...');
    try {
      const response = await aiRouter.callAI({
        model: 'gemini',
        messages: [{ role: 'system', content: 'You are Mother, the Safety Conscience agent with comprehensive OSHA training. You NEVER approve unsafe procedures and always catch safety gaps. Your training includes OSHAcademy 30-Hour programs, hazard communication, fall prevention, ASSP materials, and government safety consultation expertise. Use this extensive safety knowledge to identify EVERY missing safety control.' }, { role: 'user', content: prompt }],
        temperature: 0.0,
        systemName: 'mother_safety_validation'
      });
      
      return this.parseValidationResponse(response, 'mother_gemini');
    } catch (error) {
      console.error('🚨 Mother (Gemini) validation failed:', error);
      return this.createFailsafeResponse('mother_gemini');
    }
  }
  
  /**
   * Father Agent - Logic & Research Quality validation with Claude
   */
  private async validateWithFather(sopContent: string, prompt: string): Promise<any> {
    console.log('🔍 Father (Claude): Running logic validation...');
    try {
      const response = await aiRouter.callAI({
        model: 'anthropic',
        messages: [{ role: 'system', content: 'You are Father, the Logic & Research Quality agent. You validate technical accuracy and catch logical gaps in procedures. Be extremely thorough in identifying missing steps and safety controls.' }, { role: 'user', content: prompt }],
        temperature: 0.1,
        systemName: 'father_logic_validation'
      });
      
      return this.parseValidationResponse(response, 'father_claude');
    } catch (error) {
      console.error('🚨 Father (Claude) validation failed:', error);
      return this.createFailsafeResponse('father_claude');
    }
  }
  
  /**
   * Arbiter Agent - Multi-LLM validation with ChatGPT
   */
  private async validateWithArbiter(sopContent: string, prompt: string): Promise<any> {
    console.log('⚖️ Arbiter (ChatGPT): Running cross-validation...');
    try {
      const response = await aiRouter.callAI({
        model: 'openai',
        messages: [{ role: 'system', content: 'You are the Enhanced Arbiter using ChatGPT. You cross-check safety validations and identify gaps that other agents might miss. Be as thorough as external ChatGPT analysis.' }, { role: 'user', content: prompt }],
        temperature: 0.2,
        systemName: 'arbiter_safety_validation'
      });
      
      return this.parseValidationResponse(response, 'arbiter_chatgpt');
    } catch (error) {
      console.error('🚨 Arbiter (ChatGPT) validation failed:', error);
      return this.createFailsafeResponse('arbiter_chatgpt');
    }
  }

  /**
   * ADDITIONAL VALIDATION - Use all 3 LLMs for consensus validation
   */
  private async validateWithAllThreeLLMs(sopContent: string, prompt: string): Promise<any[]> {
    console.log('🤖 TRIPLE-LLM VALIDATION: Running parallel validation with all 3 AI models...');
    
    // Run all 3 LLMs in parallel for maximum efficiency and consensus
    const [geminiResult, claudeResult, chatgptResult] = await Promise.all([
      // Gemini validation
      aiRouter.callAI({
        model: 'gemini',
        messages: [{ role: 'system', content: 'You are a safety validation expert. Identify ALL missing safety controls, LOTO procedures, CO controls, waste handling, and compliance gaps.' }, { role: 'user', content: prompt }],
        temperature: 0.0,
        systemName: 'gemini_consensus_validation'
      }).then(response => this.parseValidationResponse(response, 'gemini_consensus')).catch(() => this.createFailsafeResponse('gemini_consensus')),
      
      // Claude validation  
      aiRouter.callAI({
        model: 'anthropic',
        messages: [{ role: 'system', content: 'You are a technical accuracy expert. Validate logic, identify missing steps, and ensure compliance with OSHA, EPA, and DOT standards.' }, { role: 'user', content: prompt }],
        temperature: 0.1,
        systemName: 'claude_consensus_validation'
      }).then(response => this.parseValidationResponse(response, 'claude_consensus')).catch(() => this.createFailsafeResponse('claude_consensus')),
      
      // ChatGPT validation
      aiRouter.callAI({
        model: 'openai',
        messages: [{ role: 'system', content: 'You are a comprehensive safety auditor. Perform the same thorough analysis that external ChatGPT would do - catch every missing safety control and compliance gap.' }, { role: 'user', content: prompt }],
        temperature: 0.2,
        systemName: 'chatgpt_consensus_validation'
      }).then(response => this.parseValidationResponse(response, 'chatgpt_consensus')).catch(() => this.createFailsafeResponse('chatgpt_consensus'))
    ]);

    return [geminiResult, claudeResult, chatgptResult];
  }
  
  /**
   * Parse validation response from AI models
   */
  private parseValidationResponse(response: any, agentName: string): any {
    try {
      // Try to parse JSON response
      let parsed;
      if (typeof response === 'string') {
        // Extract JSON from response if wrapped in text
        const jsonMatch = response.match(/\{.*\}/s);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } else {
        parsed = response;
      }
      
      return {
        agent: agentName,
        criticalIssues: parsed.criticalIssues || [],
        majorConcerns: parsed.majorConcerns || [],
        minorIssues: parsed.minorIssues || [],
        complianceGaps: parsed.complianceGaps || [],
        safetyScore: parsed.safetyScore || 0,
        detailedAnalysis: parsed.detailedAnalysis || 'Analysis failed',
        requiredFixes: parsed.requiredFixes || []
      };
    } catch (error) {
      console.error(`🚨 Failed to parse ${agentName} validation response:`, error);
      return this.createFailsafeResponse(agentName);
    }
  }
  
  /**
   * Create failsafe response when AI validation fails
   */
  private createFailsafeResponse(agentName: string): any {
    return {
      agent: agentName,
      criticalIssues: [`${agentName} validation failed - manual review required`],
      majorConcerns: ['AI validation system error'],
      minorIssues: [],
      complianceGaps: [{
        standard: 'SYSTEM' as const,
        requirement: 'AI Safety Validation',
        missing: `${agentName} agent validation failed`,
        severity: 'critical' as const
      }],
      safetyScore: 0, // Fail-safe to 0 when validation fails
      detailedAnalysis: `${agentName} agent validation system failed. Manual safety review required before approving this SOP.`,
      requiredFixes: ['Manual safety review required', 'Fix AI validation system']
    };
  }
  
  /**
   * Consolidate results from all validation agents
   */
  private consolidateValidationResults(results: any[]): SafetyValidationResult {
    const allCriticalIssues = new Set<string>();
    const allWarnings = new Set<string>();
    const allComplianceGaps: ComplianceGap[] = [];
    const allRequiredFixes = new Set<string>();
    let detailedAnalysis = '';
    
    // Aggregate all issues from all agents
    for (const result of results) {
      result.criticalIssues.forEach((issue: string) => allCriticalIssues.add(issue));
      result.majorConcerns.forEach((concern: string) => allWarnings.add(concern));
      result.minorIssues.forEach((issue: string) => allWarnings.add(issue));
      result.complianceGaps.forEach((gap: ComplianceGap) => allComplianceGaps.push(gap));
      result.requiredFixes.forEach((fix: string) => allRequiredFixes.add(fix));
      detailedAnalysis += `\\n\\n${result.agent.toUpperCase()} ANALYSIS:\\n${result.detailedAnalysis}`;
    }
    
    // Calculate consensus safety score (use the lowest/most conservative score)
    const safetyScore = Math.min(...results.map(r => r.safetyScore));
    
    // Determine if validation passed (no critical issues AND score > 80)
    const passed = allCriticalIssues.size === 0 && safetyScore >= 80;
    
    return {
      passed,
      criticalIssues: Array.from(allCriticalIssues),
      warnings: Array.from(allWarnings),
      complianceGaps: allComplianceGaps,
      safetyScore,
      requiredFixes: Array.from(allRequiredFixes),
      detailedAnalysis: detailedAnalysis.trim()
    };
  }
  
  /**
   * Generate corrected SOP with safety fixes applied
   */
  async generateCorrectedSOP(originalSOP: string, validationResult: SafetyValidationResult, metadata: any): Promise<string> {
    if (validationResult.passed) {
      return originalSOP; // No corrections needed
    }
    
    console.log('🔧 GENERATING CORRECTED SOP: Applying safety fixes...');
    
    const correctionPrompt = `
GENERATE CORRECTED SOP WITH SAFETY FIXES APPLIED

Original SOP had these CRITICAL safety issues that must be fixed:
${validationResult.criticalIssues.map(issue => `- ${issue}`).join('\\n')}

Required fixes:
${validationResult.requiredFixes.map(fix => `- ${fix}`).join('\\n')}

Compliance gaps to address:
${validationResult.complianceGaps.map(gap => `- ${gap.standard}: ${gap.requirement} - ${gap.missing}`).join('\\n')}

Original SOP Content:
${originalSOP}

GENERATE A CORRECTED VERSION that:
1. Fixes ALL critical safety issues
2. Addresses ALL compliance gaps
3. Maintains the original structure and clarity
4. Adds proper safety controls, warnings, and procedures
5. Includes proper LOTO, CO controls, waste handling, etc.
6. Cites relevant compliance standards

Return ONLY the corrected SOP content, properly formatted.
`;
    
    try {
      const correctedSOP = await aiRouter.callAI({
        model: 'openai', // Use GPT-4o for comprehensive rewriting
        messages: [
          { role: 'system', content: 'You are Soap, the expert SOP author. You write safety-compliant SOPs that pass all validation checks.' },
          { role: 'user', content: correctionPrompt }
        ],
        temperature: 0.3,
        systemName: 'sop_correction'
      });
      
      console.log('✅ CORRECTED SOP: Safety fixes applied successfully');
      return correctedSOP;
      
    } catch (error) {
      console.error('🚨 SOP correction failed:', error);
      throw new Error('Failed to generate corrected SOP. Manual review required.');
    }
  }
}

// Export singleton instance
export const enhancedSafetySOPValidator = new EnhancedSafetySOPValidator();