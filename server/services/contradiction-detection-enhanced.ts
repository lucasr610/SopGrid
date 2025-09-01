import { openaiService } from './openai-service';
import { geminiService } from './gemini-service';
import { anthropicService } from './anthropic-service';

interface ContradictionResult {
  contradictionScore: number;
  contradictions: string[];
  semanticSimilarity: number;
  consensusReached: boolean;
  conflictingSources: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

interface MultiModelResponse {
  model: string;
  response: string;
  confidence: number;
  embedding?: number[];
  timestamp: Date;
}

export class EnhancedContradictionDetector {
  private readonly CONTRADICTION_THRESHOLD = 0.35;
  private readonly SEMANTIC_THRESHOLD = 0.7;
  private contradictionCache = new Map<string, ContradictionResult>();

  async analyzeMultiModel(
    prompt: string,
    context: string = ''
  ): Promise<ContradictionResult> {
    console.log('🔍 Running enhanced contradiction detection with multi-model analysis');

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, context);
    if (this.contradictionCache.has(cacheKey)) {
      console.log('💾 Using cached contradiction analysis');
      return this.contradictionCache.get(cacheKey)!;
    }

    try {
      // Get responses from all available models
      const responses = await this.gatherMultiModelResponses(prompt, context);
      
      // Generate embeddings for semantic analysis
      const embeddedResponses = await this.generateEmbeddings(responses);
      
      // Perform contradiction analysis
      const contradictionAnalysis = await this.detectContradictions(embeddedResponses);
      
      // Calculate semantic similarity
      const semanticSimilarity = this.calculateSemanticSimilarity(embeddedResponses);
      
      // Generate final result
      const result: ContradictionResult = {
        contradictionScore: contradictionAnalysis.score,
        contradictions: contradictionAnalysis.contradictions,
        semanticSimilarity,
        consensusReached: contradictionAnalysis.score <= this.CONTRADICTION_THRESHOLD,
        conflictingSources: contradictionAnalysis.conflictingSources,
        recommendation: this.generateRecommendation(contradictionAnalysis.score, semanticSimilarity)
      };

      // Cache result
      this.contradictionCache.set(cacheKey, result);
      
      console.log(`🎯 Contradiction analysis complete: Score ${result.contradictionScore.toFixed(3)} (${result.recommendation})`);
      return result;

    } catch (error) {
      console.error('❌ Enhanced contradiction detection failed:', error);
      return this.getFallbackResult();
    }
  }

  private async gatherMultiModelResponses(
    prompt: string, 
    context: string
  ): Promise<MultiModelResponse[]> {
    const responses: MultiModelResponse[] = [];
    const fullPrompt = context ? `Context: ${context}\n\nPrompt: ${prompt}` : prompt;

    // OpenAI Response
    try {
      const openaiResponse = await openaiService.analyzeSafety(fullPrompt);
      responses.push({
        model: 'openai-gpt4o',
        response: JSON.stringify(openaiResponse),
        confidence: 0.85,
        timestamp: new Date()
      });
    } catch (error) {
      console.warn('⚠️ OpenAI response failed:', error);
    }

    // Gemini Response
    try {
      const geminiResponse = await geminiService.analyzeCompliance(fullPrompt);
      responses.push({
        model: 'gemini-1.5-pro',
        response: JSON.stringify(geminiResponse),
        confidence: 0.82,
        timestamp: new Date()
      });
    } catch (error) {
      console.warn('⚠️ Gemini response failed:', error);
    }

    // Anthropic Response
    try {
      const anthropicResponse = await anthropicService.generateSOP('Analysis', fullPrompt);
      responses.push({
        model: 'claude-3.5-sonnet',
        response: anthropicResponse,
        confidence: 0.88,
        timestamp: new Date()
      });
    } catch (error) {
      console.warn('⚠️ Anthropic response failed:', error);
    }

    return responses;
  }

  private async generateEmbeddings(responses: MultiModelResponse[]): Promise<MultiModelResponse[]> {
    const embeddedResponses = [...responses];
    
    try {
      // Generate embeddings for semantic comparison
      const texts = responses.map(r => r.response);
      const embeddings = await openaiService.generateEmbeddings(texts);
      
      embeddedResponses.forEach((response, index) => {
        response.embedding = embeddings[index];
      });
    } catch (error) {
      console.warn('⚠️ Embedding generation failed:', error);
    }

    return embeddedResponses;
  }

  private async detectContradictions(responses: MultiModelResponse[]): Promise<{
    score: number;
    contradictions: string[];
    conflictingSources: string[];
  }> {
    const contradictions: string[] = [];
    const conflictingSources: string[] = [];
    let totalContradictionScore = 0;

    // Pairwise comparison of responses
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const response1 = responses[i];
        const response2 = responses[j];
        
        // Semantic similarity check
        const similarity = this.calculateCosineSimilarity(
          response1.embedding || [],
          response2.embedding || []
        );
        
        if (similarity < this.SEMANTIC_THRESHOLD) {
          const contradictionScore = 1 - similarity;
          totalContradictionScore += contradictionScore;
          
          contradictions.push(
            `Semantic divergence between ${response1.model} and ${response2.model}: ${(contradictionScore * 100).toFixed(1)}% difference`
          );
          
          if (!conflictingSources.includes(response1.model)) {
            conflictingSources.push(response1.model);
          }
          if (!conflictingSources.includes(response2.model)) {
            conflictingSources.push(response2.model);
          }
        }
      }
    }

    // Normalize score
    const maxPossibleComparisons = (responses.length * (responses.length - 1)) / 2;
    const normalizedScore = maxPossibleComparisons > 0 ? totalContradictionScore / maxPossibleComparisons : 0;

    return {
      score: Math.min(normalizedScore, 1.0),
      contradictions,
      conflictingSources
    };
  }

  private calculateSemanticSimilarity(responses: MultiModelResponse[]): number {
    if (responses.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateCosineSimilarity(
          responses[i].embedding || [],
          responses[j].embedding || []
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length === 0 || vectorB.length === 0) return 0.5; // Neutral similarity

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * (vectorB[i] || 0), 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private generateRecommendation(
    contradictionScore: number, 
    semanticSimilarity: number
  ): 'approve' | 'review' | 'reject' {
    if (contradictionScore <= this.CONTRADICTION_THRESHOLD && semanticSimilarity >= this.SEMANTIC_THRESHOLD) {
      return 'approve';
    } else if (contradictionScore <= 0.6 && semanticSimilarity >= 0.5) {
      return 'review';
    } else {
      return 'reject';
    }
  }

  private generateCacheKey(prompt: string, context: string): string {
    const combined = `${prompt}${context}`;
    return require('crypto').createHash('md5').update(combined).digest('hex');
  }

  private getFallbackResult(): ContradictionResult {
    return {
      contradictionScore: 0.8,
      contradictions: ['Unable to perform contradiction analysis'],
      semanticSimilarity: 0.5,
      consensusReached: false,
      conflictingSources: ['system'],
      recommendation: 'review'
    };
  }

  public clearCache(): void {
    this.contradictionCache.clear();
    console.log('🧹 Contradiction detection cache cleared');
  }

  public getCacheStats(): { size: number; hitRate: number } {
    // Simple cache stats (would need proper hit tracking in production)
    return {
      size: this.contradictionCache.size,
      hitRate: 0.75 // Placeholder
    };
  }
}

export const enhancedContradictionDetector = new EnhancedContradictionDetector();