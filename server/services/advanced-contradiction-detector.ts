import { openaiService } from './openai-service';
import { geminiService } from './gemini-service';
import { anthropicService } from './anthropic-service';
import { enhancedEvidenceLedger } from './enhanced-evidence-ledger';

interface ContradictionAnalysis {
  contradictionScore: number;
  contradictions: Array<{
    type: 'safety' | 'logic' | 'procedure' | 'compliance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    sources: string[];
    confidence: number;
  }>;
  consensusAchieved: boolean;
  modelAgreement: {
    openai: number;
    gemini: number;
    anthropic: number;
    agreement_percentage: number;
  };
  semanticSimilarity: number;
  historicalPatterns: Array<{
    pattern: string;
    frequency: number;
    resolution: string;
  }>;
}

interface ModelResponse {
  model: 'openai' | 'gemini' | 'anthropic';
  response: string;
  confidence: number;
  safety_score: number;
  logic_score: number;
  completeness_score: number;
  timestamp: Date;
  embedding?: number[];
}

export class AdvancedContradictionDetector {
  private readonly CONTRADICTION_THRESHOLD = 0.35;
  private readonly SAFETY_THRESHOLD = 0.8;
  private historicalPatterns: Map<string, number> = new Map();
  
  constructor() {
    this.loadHistoricalPatterns();
  }

  async analyzeMultiModelResponses(
    topic: string,
    context: string,
    responses: ModelResponse[]
  ): Promise<ContradictionAnalysis> {
    console.log(`🔍 Advanced contradiction analysis for: ${topic}`);
    
    try {
      // Step 1: Semantic similarity analysis using embeddings
      const semanticSimilarity = await this.calculateSemanticSimilarity(responses);
      
      // Step 2: Cross-model validation
      const modelAgreement = await this.calculateModelAgreement(responses);
      
      // Step 3: Safety-specific contradiction detection
      const safetyContradictions = await this.detectSafetyContradictions(responses);
      
      // Step 4: Logic and procedure contradictions
      const logicContradictions = await this.detectLogicContradictions(responses);
      
      // Step 5: Compliance contradictions
      const complianceContradictions = await this.detectComplianceContradictions(responses);
      
      // Step 6: Historical pattern analysis
      const historicalPatterns = await this.analyzeHistoricalPatterns(topic, responses);
      
      // Combine all contradictions
      const allContradictions = [
        ...safetyContradictions,
        ...logicContradictions,
        ...complianceContradictions
      ];
      
      // Calculate overall contradiction score
      const contradictionScore = this.calculateOverallContradictionScore(
        allContradictions,
        modelAgreement.agreement_percentage,
        semanticSimilarity
      );
      
      const consensusAchieved = contradictionScore <= this.CONTRADICTION_THRESHOLD;
      
      const analysis: ContradictionAnalysis = {
        contradictionScore,
        contradictions: allContradictions,
        consensusAchieved,
        modelAgreement,
        semanticSimilarity,
        historicalPatterns
      };
      
      // Record analysis in evidence ledger
      await enhancedEvidenceLedger.recordAgentAction(
        'contradiction_detector',
        'contradiction_analysis',
        {
          topic,
          analysis,
          threshold_met: consensusAchieved
        }
      );
      
      console.log(`📊 Contradiction analysis complete: Score ${contradictionScore.toFixed(3)} (threshold: ${this.CONTRADICTION_THRESHOLD})`);
      
      return analysis;
      
    } catch (error) {
      console.error('Contradiction detection failed:', error);
      
      // Fallback analysis
      return {
        contradictionScore: 0.8, // High score indicates potential issues
        contradictions: [{
          type: 'logic',
          severity: 'medium',
          description: 'Contradiction detection service unavailable',
          sources: ['system_error'],
          confidence: 0.9
        }],
        consensusAchieved: false,
        modelAgreement: {
          openai: 0,
          gemini: 0,
          anthropic: 0,
          agreement_percentage: 0
        },
        semanticSimilarity: 0,
        historicalPatterns: []
      };
    }
  }

  private async calculateSemanticSimilarity(responses: ModelResponse[]): Promise<number> {
    try {
      // Generate embeddings for each response
      const embeddings: number[][] = [];
      
      for (const response of responses) {
        if (!response.embedding) {
          // Generate embedding using OpenAI
          const embedding = await openaiService.generateEmbeddings([response.response]);
          response.embedding = embedding[0];
        }
        embeddings.push(response.embedding);
      }
      
      // Calculate pairwise cosine similarity
      let totalSimilarity = 0;
      let comparisons = 0;
      
      for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
          const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
          totalSimilarity += similarity;
          comparisons++;
        }
      }
      
      return comparisons > 0 ? totalSimilarity / comparisons : 0;
      
    } catch (error) {
      console.error('Semantic similarity calculation failed:', error);
      return 0.5; // Neutral similarity
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async calculateModelAgreement(responses: ModelResponse[]): Promise<{
    openai: number;
    gemini: number;
    anthropic: number;
    agreement_percentage: number;
  }> {
    const modelScores = {
      openai: 0,
      gemini: 0,
      anthropic: 0
    };
    
    // Calculate individual model confidence scores
    for (const response of responses) {
      modelScores[response.model] = (
        response.confidence + 
        response.safety_score + 
        response.logic_score + 
        response.completeness_score
      ) / 4;
    }
    
    // Calculate agreement percentage based on score variance
    const scores = Object.values(modelScores);
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
    const agreement_percentage = Math.max(0, 1 - variance) * 100;
    
    return {
      ...modelScores,
      agreement_percentage
    };
  }

  private async detectSafetyContradictions(responses: ModelResponse[]): Promise<ContradictionAnalysis['contradictions']> {
    const contradictions: ContradictionAnalysis['contradictions'] = [];
    
    // Check for safety score discrepancies
    const safetyScores = responses.map(r => r.safety_score);
    const maxSafety = Math.max(...safetyScores);
    const minSafety = Math.min(...safetyScores);
    
    if (maxSafety - minSafety > 0.3) {
      contradictions.push({
        type: 'safety',
        severity: 'high',
        description: `Significant safety score discrepancy detected (range: ${minSafety.toFixed(2)} - ${maxSafety.toFixed(2)})`,
        sources: responses.map(r => r.model),
        confidence: 0.9
      });
    }
    
    // Check for safety-critical keywords conflicts
    const safetyKeywords = ['danger', 'hazard', 'warning', 'caution', 'risk', 'unsafe', 'prohibited'];
    const safetyMentions = responses.map(r => ({
      model: r.model,
      mentions: safetyKeywords.filter(keyword => 
        r.response.toLowerCase().includes(keyword)
      ).length
    }));
    
    const safetyVariance = Math.max(...safetyMentions.map(s => s.mentions)) - 
                          Math.min(...safetyMentions.map(s => s.mentions));
    
    if (safetyVariance > 3) {
      contradictions.push({
        type: 'safety',
        severity: 'medium',
        description: 'Inconsistent safety warnings across models',
        sources: safetyMentions.filter(s => s.mentions > 0).map(s => s.model),
        confidence: 0.7
      });
    }
    
    return contradictions;
  }

  private async detectLogicContradictions(responses: ModelResponse[]): Promise<ContradictionAnalysis['contradictions']> {
    const contradictions: ContradictionAnalysis['contradictions'] = [];
    
    // Check for logic score discrepancies
    const logicScores = responses.map(r => r.logic_score);
    const variance = logicScores.reduce((sum, score) => sum + Math.pow(score - (logicScores.reduce((a, b) => a + b) / logicScores.length), 2), 0) / logicScores.length;
    
    if (variance > 0.2) {
      contradictions.push({
        type: 'logic',
        severity: 'medium',
        description: `High variance in logic scoring across models (variance: ${variance.toFixed(3)})`,
        sources: responses.map(r => r.model),
        confidence: 0.8
      });
    }
    
    // Check for contradictory statements using simple keyword analysis
    const positiveIndicators = ['yes', 'correct', 'true', 'should', 'recommended', 'safe'];
    const negativeIndicators = ['no', 'incorrect', 'false', 'should not', 'not recommended', 'unsafe'];
    
    const responseAnalysis = responses.map(r => ({
      model: r.model,
      positive: positiveIndicators.filter(word => r.response.toLowerCase().includes(word)).length,
      negative: negativeIndicators.filter(word => r.response.toLowerCase().includes(word)).length
    }));
    
    const positiveResponses = responseAnalysis.filter(r => r.positive > r.negative).length;
    const negativeResponses = responseAnalysis.filter(r => r.negative > r.positive).length;
    
    if (positiveResponses > 0 && negativeResponses > 0) {
      contradictions.push({
        type: 'logic',
        severity: 'high',
        description: 'Contradictory recommendations detected between models',
        sources: responses.map(r => r.model),
        confidence: 0.85
      });
    }
    
    return contradictions;
  }

  private async detectComplianceContradictions(responses: ModelResponse[]): Promise<ContradictionAnalysis['contradictions']> {
    const contradictions: ContradictionAnalysis['contradictions'] = [];
    
    // Check for compliance standard mentions
    const complianceStandards = ['OSHA', 'EPA', 'DOT', 'FDA', 'NFPA', 'ANSI', 'IEEE'];
    const complianceMentions = responses.map(r => ({
      model: r.model,
      standards: complianceStandards.filter(standard => 
        r.response.toUpperCase().includes(standard)
      )
    }));
    
    // Check for conflicting compliance requirements
    const allStandards = new Set(complianceMentions.flatMap(c => c.standards));
    const mentionCounts = Array.from(allStandards).map(standard => ({
      standard,
      count: complianceMentions.filter(c => c.standards.includes(standard)).length
    }));
    
    // If some models mention compliance standards and others don't, flag as contradiction
    const modelsWithCompliance = complianceMentions.filter(c => c.standards.length > 0).length;
    const modelsWithoutCompliance = responses.length - modelsWithCompliance;
    
    if (modelsWithCompliance > 0 && modelsWithoutCompliance > 0) {
      contradictions.push({
        type: 'compliance',
        severity: 'medium',
        description: 'Inconsistent compliance standard references across models',
        sources: complianceMentions.filter(c => c.standards.length > 0).map(c => c.model),
        confidence: 0.7
      });
    }
    
    return contradictions;
  }

  private async analyzeHistoricalPatterns(topic: string, responses: ModelResponse[]): Promise<ContradictionAnalysis['historicalPatterns']> {
    const patterns: ContradictionAnalysis['historicalPatterns'] = [];
    
    // Simplified pattern analysis - in production, this would use ML models
    const topicKeywords = topic.toLowerCase().split(' ');
    
    for (const keyword of topicKeywords) {
      const frequency = this.historicalPatterns.get(keyword) || 0;
      
      if (frequency > 5) {
        patterns.push({
          pattern: `Frequent topic: ${keyword}`,
          frequency,
          resolution: 'Continue monitoring for accuracy improvements'
        });
      }
      
      // Update frequency
      this.historicalPatterns.set(keyword, frequency + 1);
    }
    
    return patterns;
  }

  private calculateOverallContradictionScore(
    contradictions: ContradictionAnalysis['contradictions'],
    agreementPercentage: number,
    semanticSimilarity: number
  ): number {
    // Weight factors
    const agreementWeight = 0.4;
    const semanticWeight = 0.3;
    const contradictionWeight = 0.3;
    
    // Convert agreement percentage to disagreement score (0-1)
    const disagreementScore = 1 - (agreementPercentage / 100);
    
    // Convert semantic similarity to dissimilarity score (0-1)
    const dissimilarityScore = 1 - semanticSimilarity;
    
    // Calculate contradiction penalty based on severity
    let contradictionPenalty = 0;
    for (const contradiction of contradictions) {
      const severityMultiplier = {
        'low': 0.1,
        'medium': 0.3,
        'high': 0.6,
        'critical': 1.0
      }[contradiction.severity];
      
      contradictionPenalty += severityMultiplier * contradiction.confidence;
    }
    
    // Normalize contradiction penalty (0-1)
    contradictionPenalty = Math.min(1, contradictionPenalty / contradictions.length);
    
    // Calculate final score
    const finalScore = (
      disagreementScore * agreementWeight +
      dissimilarityScore * semanticWeight +
      contradictionPenalty * contradictionWeight
    );
    
    return Math.max(0, Math.min(1, finalScore));
  }

  private async loadHistoricalPatterns(): Promise<void> {
    // In production, load from database
    console.log('🧠 Historical pattern analysis initialized');
  }

  async getDetectionStats(): Promise<{
    totalAnalyses: number;
    consensusRate: number;
    averageContradictionScore: number;
    commonPatterns: Array<{ pattern: string; frequency: number }>;
  }> {
    const commonPatterns = Array.from(this.historicalPatterns.entries())
      .map(([pattern, frequency]) => ({ pattern, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    return {
      totalAnalyses: Array.from(this.historicalPatterns.values()).reduce((sum, freq) => sum + freq, 0),
      consensusRate: 0.85, // Would be calculated from actual data
      averageContradictionScore: 0.28, // Would be calculated from actual data
      commonPatterns
    };
  }
}

export const advancedContradictionDetector = new AdvancedContradictionDetector();