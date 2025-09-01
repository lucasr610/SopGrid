import { openaiService } from './openai-service.js';
import { geminiService } from './gemini-service.js';
import { evidenceLedger } from './evidence-ledger.js';

interface NLIResult {
  entailment: number;
  contradiction: number;
  neutral: number;
  confidence: number;
}

interface ContradictionAnalysis {
  pairwiseScore: number;
  semanticScore: number;
  factualScore: number;
  procedureScore: number;
  safetyScore: number;
  overallScore: number;
  contradictions: string[];
  entailments: string[];
  neutrals: string[];
  confidence: number;
}

export class NLIContradictionScorer {
  private readonly CONTRADICTION_THRESHOLD = 0.35;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private readonly CONFIDENCE_THRESHOLD = parseFloat(process.env.NLI_CONFIDENCE_THRESHOLD || '0.8');
  
  // Log NLI failures for auditability
  private async logNLIFailure(
    failureType: 'no_providers_available' | 'low_confidence' | 'system_error',
    textA: string,
    textB: string,
    confidence?: number,
    errorMessage?: string
  ): Promise<void> {
    await evidenceLedger.append({
      type: 'nli_failure',
      timestamp: new Date(),
      failureType,
      confidence,
      errorMessage,
      action: 'fail_closed_blocked',
      textAHash: this.hashText(textA),
      textBHash: this.hashText(textB)
    });
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  async scoreContradictions(responses: Array<{agent: string, response: string, confidence: number}>): Promise<ContradictionAnalysis> {
    console.log(`🔍 Performing NLI-based contradiction analysis on ${responses.length} responses`);

    if (responses.length < 2) {
      return {
        pairwiseScore: 0,
        semanticScore: 0,
        factualScore: 0,
        procedureScore: 0,
        safetyScore: 0,
        overallScore: 0,
        contradictions: [],
        entailments: [],
        neutrals: [],
        confidence: 1.0
      };
    }

    // Perform pairwise NLI analysis
    const pairwiseResults = await this.performPairwiseNLI(responses);
    
    // Analyze semantic contradictions
    const semanticResults = await this.analyzeSemanticContradictions(responses);
    
    // Analyze factual contradictions
    const factualResults = await this.analyzeFactualContradictions(responses);
    
    // Analyze procedure step contradictions
    const procedureResults = await this.analyzeProcedureContradictions(responses);
    
    // Analyze safety requirement contradictions
    const safetyResults = await this.analyzeSafetyContradictions(responses);

    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore({
      pairwise: pairwiseResults.score,
      semantic: semanticResults.score,
      factual: factualResults.score,
      procedure: procedureResults.score,
      safety: safetyResults.score
    });

    // Combine all contradictions found
    const allContradictions = [
      ...pairwiseResults.contradictions,
      ...semanticResults.contradictions,
      ...factualResults.contradictions,
      ...procedureResults.contradictions,
      ...safetyResults.contradictions
    ];

    const averageConfidence = [
      pairwiseResults.confidence,
      semanticResults.confidence,
      factualResults.confidence,
      procedureResults.confidence,
      safetyResults.confidence
    ].reduce((sum, conf) => sum + conf, 0) / 5;

    return {
      pairwiseScore: pairwiseResults.score,
      semanticScore: semanticResults.score,
      factualScore: factualResults.score,
      procedureScore: procedureResults.score,
      safetyScore: safetyResults.score,
      overallScore,
      contradictions: allContradictions,
      entailments: pairwiseResults.entailments,
      neutrals: pairwiseResults.neutrals,
      confidence: averageConfidence
    };
  }

  private async performPairwiseNLI(responses: Array<{agent: string, response: string}>): Promise<{
    score: number;
    contradictions: string[];
    entailments: string[];
    neutrals: string[];
    confidence: number;
  }> {
    const contradictions: string[] = [];
    const entailments: string[] = [];
    const neutrals: string[] = [];
    let totalScore = 0;
    let totalComparisons = 0;
    let totalConfidence = 0;

    // Compare every pair of responses
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const response1 = responses[i];
        const response2 = responses[j];
        
        const nliResult = await this.performNLIAnalysis(response1.response, response2.response);
        totalComparisons++;
        totalConfidence += nliResult.confidence;

        if (nliResult.contradiction > 0.6) {
          contradictions.push(`${response1.agent} vs ${response2.agent}: High contradiction (${nliResult.contradiction.toFixed(2)})`);
          totalScore += nliResult.contradiction;
        } else if (nliResult.entailment > 0.6) {
          entailments.push(`${response1.agent} vs ${response2.agent}: Strong entailment (${nliResult.entailment.toFixed(2)})`);
          totalScore += (1 - nliResult.entailment); // Lower score for entailment (good)
        } else {
          neutrals.push(`${response1.agent} vs ${response2.agent}: Neutral/compatible (${nliResult.neutral.toFixed(2)})`);
          totalScore += 0.2; // Small penalty for neutral
        }
      }
    }

    return {
      score: totalComparisons > 0 ? totalScore / totalComparisons : 0,
      contradictions,
      entailments,
      neutrals,
      confidence: totalComparisons > 0 ? totalConfidence / totalComparisons : 0
    };
  }

  private async performNLIAnalysis(text1: string, text2: string): Promise<NLIResult> {
    const prompt = `Analyze the relationship between these two texts using Natural Language Inference:

TEXT 1: ${text1.substring(0, 500)}...

TEXT 2: ${text2.substring(0, 500)}...

Determine if TEXT 1 and TEXT 2 have:
- ENTAILMENT: TEXT 1 logically implies TEXT 2 (or vice versa)
- CONTRADICTION: TEXT 1 contradicts TEXT 2 in facts, procedures, or safety requirements
- NEUTRAL: TEXT 1 and TEXT 2 are compatible but don't imply each other

Return a JSON object with scores 0-1 for each relationship and overall confidence:
{
  "entailment": 0.0-1.0,
  "contradiction": 0.0-1.0,
  "neutral": 0.0-1.0,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    try {
      const response = await openaiService.chat(prompt);
      const parsed = JSON.parse(response);
      
      return {
        entailment: parsed.entailment || 0,
        contradiction: parsed.contradiction || 0,
        neutral: parsed.neutral || 0,
        confidence: parsed.confidence || 0.5
      };
    } catch (error) {
      console.error('NLI analysis failed:', error);
      // Fallback to simple similarity check
      return this.fallbackSimilarityCheck(text1, text2);
    }
  }

  private async analyzeSemanticContradictions(responses: Array<{agent: string, response: string}>): Promise<{
    score: number;
    contradictions: string[];
    confidence: number;
  }> {
    const contradictions: string[] = [];
    let totalScore = 0;
    
    // Extract key concepts from each response
    const concepts = await Promise.all(responses.map(async (response) => {
      return await this.extractKeyConcepts(response.response);
    }));

    // Compare concepts for semantic contradictions
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const contradictingConcepts = this.findConceptContradictions(concepts[i], concepts[j]);
        
        if (contradictingConcepts.length > 0) {
          contradictions.push(`Semantic contradiction between ${responses[i].agent} and ${responses[j].agent}: ${contradictingConcepts.join(', ')}`);
          totalScore += 0.7; // High penalty for semantic contradictions
        }
      }
    }

    return {
      score: Math.min(totalScore, 1.0),
      contradictions,
      confidence: 0.85
    };
  }

  private async analyzeFactualContradictions(responses: Array<{agent: string, response: string}>): Promise<{
    score: number;
    contradictions: string[];
    confidence: number;
  }> {
    const contradictions: string[] = [];
    let totalScore = 0;

    // Extract numerical values, measurements, specifications
    const facts = responses.map(response => this.extractFactualClaims(response.response));

    // Compare factual claims
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const factContradictions = this.findFactualContradictions(facts[i], facts[j]);
        
        if (factContradictions.length > 0) {
          contradictions.push(`Factual contradiction between ${responses[i].agent} and ${responses[j].agent}: ${factContradictions.join(', ')}`);
          totalScore += 0.8; // Very high penalty for factual contradictions
        }
      }
    }

    return {
      score: Math.min(totalScore, 1.0),
      contradictions,
      confidence: 0.9
    };
  }

  private async analyzeProcedureContradictions(responses: Array<{agent: string, response: string}>): Promise<{
    score: number;
    contradictions: string[];
    confidence: number;
  }> {
    const contradictions: string[] = [];
    let totalScore = 0;

    // Extract procedure steps from each response
    const procedures = responses.map(response => this.extractProcedureSteps(response.response));

    // Compare procedure sequences
    for (let i = 0; i < procedures.length; i++) {
      for (let j = i + 1; j < procedures.length; j++) {
        const stepContradictions = this.findProcedureContradictions(procedures[i], procedures[j]);
        
        if (stepContradictions.length > 0) {
          contradictions.push(`Procedure contradiction between ${responses[i].agent} and ${responses[j].agent}: ${stepContradictions.join(', ')}`);
          totalScore += 0.6; // High penalty for procedure contradictions
        }
      }
    }

    return {
      score: Math.min(totalScore, 1.0),
      contradictions,
      confidence: 0.8
    };
  }

  private async analyzeSafetyContradictions(responses: Array<{agent: string, response: string}>): Promise<{
    score: number;
    contradictions: string[];
    confidence: number;
  }> {
    const contradictions: string[] = [];
    let totalScore = 0;

    // Extract safety requirements from each response
    const safetyReqs = responses.map(response => this.extractSafetyRequirements(response.response));

    // Compare safety requirements
    for (let i = 0; i < safetyReqs.length; i++) {
      for (let j = i + 1; j < safetyReqs.length; j++) {
        const safetyContradictions = this.findSafetyContradictions(safetyReqs[i], safetyReqs[j]);
        
        if (safetyContradictions.length > 0) {
          contradictions.push(`Safety contradiction between ${responses[i].agent} and ${responses[j].agent}: ${safetyContradictions.join(', ')}`);
          totalScore += 1.0; // Maximum penalty for safety contradictions
        }
      }
    }

    return {
      score: Math.min(totalScore, 1.0),
      contradictions,
      confidence: 0.95
    };
  }

  private calculateWeightedScore(scores: {
    pairwise: number;
    semantic: number;
    factual: number;
    procedure: number;
    safety: number;
  }): number {
    // Weighted importance: Safety > Factual > Procedure > Semantic > Pairwise
    const weights = {
      safety: 0.4,    // Safety contradictions are most critical
      factual: 0.25,  // Factual contradictions very important
      procedure: 0.2, // Procedure contradictions important
      semantic: 0.1,  // Semantic contradictions moderate
      pairwise: 0.05  // General NLI baseline
    };

    return (
      scores.safety * weights.safety +
      scores.factual * weights.factual +
      scores.procedure * weights.procedure +
      scores.semantic * weights.semantic +
      scores.pairwise * weights.pairwise
    );
  }

  private fallbackSimilarityCheck(text1: string, text2: string): NLIResult {
    // Simple word overlap similarity as fallback
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const common = words1.filter(word => words2.includes(word));
    const similarity = common.length / Math.max(words1.length, words2.length);
    
    return {
      entailment: similarity > 0.8 ? 0.8 : 0,
      contradiction: similarity < 0.3 ? 0.7 : 0,
      neutral: similarity >= 0.3 && similarity <= 0.8 ? 0.7 : 0,
      confidence: 0.3
    };
  }

  private async extractKeyConcepts(text: string): Promise<string[]> {
    // Extract key technical concepts, tools, materials, processes
    const conceptRegex = /\b(?:voltage|amperage|torque|pressure|temperature|RPM|PSI|CFM|BTU|horsepower|watts|ohms|capacitor|relay|fuse|breaker|pump|motor|compressor|inverter|generator|battery|alternator)\b/gi;
    return text.match(conceptRegex) || [];
  }

  private extractFactualClaims(text: string): Array<{type: string, value: string, unit?: string}> {
    const claims: Array<{type: string, value: string, unit?: string}> = [];
    
    // Extract numerical values with units
    const numberRegex = /(\d+(?:\.\d+)?)\s*(volts?|amps?|ohms?|watts?|PSI|RPM|degrees?|inches?|feet?|mm|cm|meters?)/gi;
    const matches = Array.from(text.matchAll(numberRegex));
    
    for (const match of matches) {
      claims.push({
        type: 'measurement',
        value: match[1],
        unit: match[2]
      });
    }
    
    return claims;
  }

  private extractProcedureSteps(text: string): string[] {
    // Extract numbered steps and procedure sequences
    const stepRegex = /(?:^|\n)\s*(\d+\.?\s+[^.\n]+\.?)/gm;
    const steps = text.match(stepRegex) || [];
    return steps.map(step => step.trim());
  }

  private extractSafetyRequirements(text: string): string[] {
    // Extract safety-related requirements and warnings
    const safetyKeywords = ['PPE', 'safety', 'hazard', 'warning', 'caution', 'lockout', 'tagout', 'disconnect', 'isolation', 'protective equipment'];
    const safetyReqs: string[] = [];
    
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (safetyKeywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase()))) {
        safetyReqs.push(sentence.trim());
      }
    }
    
    return safetyReqs;
  }

  private findConceptContradictions(concepts1: string[], concepts2: string[]): string[] {
    // Find contradictory technical concepts
    const contradictions: string[] = [];
    
    // Simple contradiction detection for common conflicts
    const conflictPairs = [
      ['AC', 'DC'],
      ['120V', '240V'],
      ['clockwise', 'counterclockwise'],
      ['open', 'close'],
      ['on', 'off']
    ];
    
    for (const [concept1, concept2] of conflictPairs) {
      const has1inFirst = concepts1.some(c => c.toLowerCase().includes(concept1.toLowerCase()));
      const has2inFirst = concepts1.some(c => c.toLowerCase().includes(concept2.toLowerCase()));
      const has1inSecond = concepts2.some(c => c.toLowerCase().includes(concept1.toLowerCase()));
      const has2inSecond = concepts2.some(c => c.toLowerCase().includes(concept2.toLowerCase()));
      
      if ((has1inFirst && has2inSecond) || (has2inFirst && has1inSecond)) {
        contradictions.push(`${concept1} vs ${concept2}`);
      }
    }
    
    return contradictions;
  }

  private findFactualContradictions(facts1: Array<{type: string, value: string, unit?: string}>, facts2: Array<{type: string, value: string, unit?: string}>): string[] {
    const contradictions: string[] = [];
    
    // Compare numerical values for same units
    for (const fact1 of facts1) {
      for (const fact2 of facts2) {
        if (fact1.unit === fact2.unit) {
          const val1 = parseFloat(fact1.value);
          const val2 = parseFloat(fact2.value);
          
          if (!isNaN(val1) && !isNaN(val2)) {
            const difference = Math.abs(val1 - val2) / Math.max(val1, val2);
            
            if (difference > 0.1) { // More than 10% difference
              contradictions.push(`${fact1.value} ${fact1.unit} vs ${fact2.value} ${fact2.unit}`);
            }
          }
        }
      }
    }
    
    return contradictions;
  }

  private findProcedureContradictions(steps1: string[], steps2: string[]): string[] {
    const contradictions: string[] = [];
    
    // Check for conflicting action words in similar steps
    const conflictingActions = [
      ['remove', 'install'],
      ['disconnect', 'connect'],
      ['open', 'close'],
      ['turn on', 'turn off'],
      ['engage', 'disengage']
    ];
    
    for (const step1 of steps1) {
      for (const step2 of steps2) {
        for (const [action1, action2] of conflictingActions) {
          if (step1.toLowerCase().includes(action1.toLowerCase()) && 
              step2.toLowerCase().includes(action2.toLowerCase())) {
            // Check if they're referring to similar context
            const words1 = step1.toLowerCase().split(/\s+/);
            const words2 = step2.toLowerCase().split(/\s+/);
            const commonWords = words1.filter(word => words2.includes(word));
            
            if (commonWords.length > 2) { // Similar context
              contradictions.push(`Step conflict: ${action1} vs ${action2}`);
            }
          }
        }
      }
    }
    
    return contradictions;
  }

  private findSafetyContradictions(safety1: string[], safety2: string[]): string[] {
    const contradictions: string[] = [];
    
    // Check for conflicting safety requirements
    const safetyConflicts = [
      ['energized', 'de-energized'],
      ['live work', 'dead work'],
      ['with power', 'without power'],
      ['hot work', 'cold work']
    ];
    
    for (const req1 of safety1) {
      for (const req2 of safety2) {
        for (const [safe1, safe2] of safetyConflicts) {
          if (req1.toLowerCase().includes(safe1.toLowerCase()) && 
              req2.toLowerCase().includes(safe2.toLowerCase())) {
            contradictions.push(`Safety conflict: ${safe1} vs ${safe2}`);
          }
        }
      }
    }
    
    return contradictions;
  }
}

export const nliContradictionScorer = new NLIContradictionScorer();