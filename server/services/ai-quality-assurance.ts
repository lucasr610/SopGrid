import { enhancedContradictionDetector } from './contradiction-detection-enhanced';
import { businessIntelligenceService } from './business-intelligence';
import { enhancedEvidenceLedger } from './evidence-ledger-enhanced';

interface QualityMetrics {
  accuracy: number;
  consistency: number;
  safety: number;
  compliance: number;
  readability: number;
  completeness: number;
}

interface FeedbackAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  themes: string[];
  actionableItems: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface QualityImprovement {
  currentScore: number;
  targetScore: number;
  recommendations: string[];
  estimatedImpact: number;
  implementationComplexity: 'low' | 'medium' | 'high';
}

export class AIQualityAssuranceService {
  private qualityHistory: Map<string, QualityMetrics[]> = new Map();
  private feedbackBuffer: Array<{ content: string; userId: string; timestamp: Date }> = [];

  async reviewSOPQuality(
    sopContent: string,
    sopId: string,
    validator: string = 'system'
  ): Promise<{
    qualityScore: number;
    metrics: QualityMetrics;
    improvements: QualityImprovement[];
    requiresHumanReview: boolean;
    autoApproved: boolean;
  }> {
    console.log('🔍 AI Quality Assurance: Reviewing SOP quality');

    // CRITICAL: All AI suggestions require human validation - NEVER bypass HITL
    const requiresHumanReview = true; // Always true to maintain safety
    
    try {
      // Analyze quality metrics
      const metrics = await this.analyzeQualityMetrics(sopContent);
      
      // Calculate overall quality score
      const qualityScore = this.calculateOverallScore(metrics);
      
      // Generate improvement recommendations (for human review)
      const improvements = await this.generateImprovements(sopContent, metrics);
      
      // Store quality history
      this.storeQualityHistory(sopId, metrics);
      
      // Log evidence of quality review
      await enhancedEvidenceLedger.addEvidence({
        sopId,
        qualityScore,
        metrics,
        validator,
        humanReviewRequired: true,
        timestamp: new Date()
      }, 'agent_action', validator);

      console.log(`✅ Quality review complete: Score ${qualityScore.toFixed(2)} (Human review required)`);

      return {
        qualityScore,
        metrics,
        improvements,
        requiresHumanReview: true, // ALWAYS require human review for safety
        autoApproved: false // NEVER auto-approve - humans must validate
      };

    } catch (error) {
      console.error('❌ Quality assurance failed:', error);
      
      // Failsafe: Always require human review on errors
      return {
        qualityScore: 0.5,
        metrics: this.getDefaultMetrics(),
        improvements: [],
        requiresHumanReview: true,
        autoApproved: false
      };
    }
  }

  async analyzeTechnicianFeedback(
    feedback: string,
    userId: string,
    sopId?: string
  ): Promise<FeedbackAnalysis> {
    console.log('📝 Analyzing technician feedback for quality insights');

    // Buffer feedback for batch processing
    this.feedbackBuffer.push({
      content: feedback,
      userId,
      timestamp: new Date()
    });

    try {
      // Simple sentiment analysis (would use NLP service in production)
      const sentiment = this.analyzeSentiment(feedback);
      const themes = this.extractThemes(feedback);
      const actionableItems = this.extractActionableItems(feedback);
      const priority = this.determinePriority(feedback, sentiment);

      // Log feedback evidence
      await enhancedEvidenceLedger.addEvidence({
        feedback,
        userId,
        sopId,
        analysis: { sentiment, themes, actionableItems, priority },
        timestamp: new Date()
      }, 'human_approval', userId);

      console.log(`📊 Feedback analyzed: ${sentiment} sentiment, ${priority} priority`);

      return {
        sentiment,
        confidence: 0.85,
        themes,
        actionableItems,
        priority
      };

    } catch (error) {
      console.error('❌ Feedback analysis failed:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        themes: [],
        actionableItems: ['Manual review required'],
        priority: 'medium'
      };
    }
  }

  async continuousLearning(
    sopId: string,
    realWorldOutcome: {
      successful: boolean;
      timeToComplete: number;
      issuesEncountered: string[];
      technicianFeedback: string;
    }
  ): Promise<{
    learningApplied: boolean;
    confidenceUpdate: number;
    suggestedUpdates: string[];
    humanApprovalRequired: boolean;
  }> {
    console.log('🧠 Continuous learning: Processing real-world outcome data');

    // CRITICAL: All learning updates require human approval
    const humanApprovalRequired = true;

    try {
      // Analyze outcome vs predicted results
      const outcomeAnalysis = await this.analyzeOutcome(sopId, realWorldOutcome);
      
      // Generate suggested improvements (for human review only)
      const suggestedUpdates = await this.generateLearningUpdates(outcomeAnalysis);
      
      // Calculate confidence adjustment
      const confidenceUpdate = this.calculateConfidenceUpdate(realWorldOutcome);
      
      // Log learning evidence for human review
      await enhancedEvidenceLedger.addEvidence({
        sopId,
        outcome: realWorldOutcome,
        analysis: outcomeAnalysis,
        suggestedUpdates,
        confidenceUpdate,
        requiresHumanApproval: true,
        timestamp: new Date()
      }, 'agent_action', 'continuous_learning_system');

      console.log(`🎯 Learning analysis complete: ${suggestedUpdates.length} suggestions (Human approval required)`);

      return {
        learningApplied: false, // Never auto-apply - humans must approve
        confidenceUpdate,
        suggestedUpdates,
        humanApprovalRequired: true
      };

    } catch (error) {
      console.error('❌ Continuous learning failed:', error);
      return {
        learningApplied: false,
        confidenceUpdate: 0,
        suggestedUpdates: [],
        humanApprovalRequired: true
      };
    }
  }

  private async analyzeQualityMetrics(content: string): Promise<QualityMetrics> {
    // Comprehensive quality analysis
    const accuracy = this.assessAccuracy(content);
    const consistency = this.assessConsistency(content);
    const safety = this.assessSafety(content);
    const compliance = this.assessCompliance(content);
    const readability = this.assessReadability(content);
    const completeness = this.assessCompleteness(content);

    return {
      accuracy,
      consistency,
      safety,
      compliance,
      readability,
      completeness
    };
  }

  private assessAccuracy(content: string): number {
    // Check for technical accuracy indicators
    const technicalTerms = ['voltage', 'amperage', 'pressure', 'temperature', 'torque'];
    const hasSpecs = technicalTerms.some(term => content.toLowerCase().includes(term));
    const hasUnits = /\d+\s*(v|a|psi|°f|°c|ft-lb|nm)/i.test(content);
    
    return (hasSpecs ? 0.5 : 0) + (hasUnits ? 0.5 : 0);
  }

  private assessConsistency(content: string): number {
    // Check for consistent terminology and formatting
    const stepPattern = /step\s+\d+/gi;
    const steps = content.match(stepPattern);
    const hasConsistentSteps = steps && steps.length > 1;
    
    return hasConsistentSteps ? 0.8 : 0.6;
  }

  private assessSafety(content: string): number {
    const safetyKeywords = ['safety', 'warning', 'caution', 'danger', 'ppe', 'lockout', 'tagout'];
    const safetyCount = safetyKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    
    return Math.min(safetyCount / 3, 1.0); // Max score with 3+ safety terms
  }

  private assessCompliance(content: string): number {
    const complianceTerms = ['osha', 'epa', 'dot', 'nfpa', 'ieee', 'regulation'];
    const complianceCount = complianceTerms.filter(term => 
      content.toLowerCase().includes(term)
    ).length;
    
    return Math.min(complianceCount / 2, 1.0);
  }

  private assessReadability(content: string): number {
    // Simple readability score based on sentence length and complexity
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    
    // Optimal sentence length for technical content: 15-20 words
    if (avgSentenceLength >= 15 && avgSentenceLength <= 20) return 1.0;
    if (avgSentenceLength >= 10 && avgSentenceLength <= 25) return 0.8;
    return 0.6;
  }

  private assessCompleteness(content: string): number {
    const requiredSections = ['materials', 'tools', 'steps', 'safety'];
    const sectionCount = requiredSections.filter(section => 
      content.toLowerCase().includes(section)
    ).length;
    
    return sectionCount / requiredSections.length;
  }

  private calculateOverallScore(metrics: QualityMetrics): number {
    // Weighted average with safety as highest priority
    const weights = {
      accuracy: 0.15,
      consistency: 0.10,
      safety: 0.30,      // Highest weight for safety
      compliance: 0.25,  // High weight for compliance
      readability: 0.10,
      completeness: 0.10
    };

    return Object.entries(metrics).reduce((score, [key, value]) => {
      return score + (value * weights[key as keyof QualityMetrics]);
    }, 0);
  }

  private async generateImprovements(content: string, metrics: QualityMetrics): Promise<QualityImprovement[]> {
    const improvements: QualityImprovement[] = [];

    if (metrics.safety < 0.8) {
      improvements.push({
        currentScore: metrics.safety,
        targetScore: 0.9,
        recommendations: [
          'Add specific safety warnings',
          'Include PPE requirements',
          'Add lockout/tagout procedures where applicable'
        ],
        estimatedImpact: 0.3,
        implementationComplexity: 'medium'
      });
    }

    if (metrics.compliance < 0.7) {
      improvements.push({
        currentScore: metrics.compliance,
        targetScore: 0.85,
        recommendations: [
          'Reference applicable regulations (OSHA, EPA, DOT)',
          'Include compliance checkpoints',
          'Add regulatory documentation requirements'
        ],
        estimatedImpact: 0.25,
        implementationComplexity: 'high'
      });
    }

    return improvements;
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'clear', 'helpful', 'easy'];
    const negativeWords = ['bad', 'poor', 'unclear', 'difficult', 'confusing', 'wrong'];
    
    const positiveCount = positiveWords.filter(word => text.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractThemes(text: string): string[] {
    const themes: string[] = [];
    
    if (text.toLowerCase().includes('safety')) themes.push('safety');
    if (text.toLowerCase().includes('clarity')) themes.push('clarity');
    if (text.toLowerCase().includes('time')) themes.push('efficiency');
    if (text.toLowerCase().includes('tool')) themes.push('tools');
    if (text.toLowerCase().includes('step')) themes.push('procedures');
    
    return themes;
  }

  private extractActionableItems(text: string): string[] {
    const actionable: string[] = [];
    
    if (text.toLowerCase().includes('should') || text.toLowerCase().includes('need')) {
      actionable.push('Review and update based on feedback');
    }
    if (text.toLowerCase().includes('missing')) {
      actionable.push('Add missing information');
    }
    if (text.toLowerCase().includes('unclear')) {
      actionable.push('Improve clarity and detail');
    }
    
    return actionable.length > 0 ? actionable : ['No specific actions identified'];
  }

  private determinePriority(text: string, sentiment: string): 'low' | 'medium' | 'high' | 'critical' {
    if (text.toLowerCase().includes('safety') || text.toLowerCase().includes('danger')) {
      return 'critical';
    }
    if (sentiment === 'negative') return 'high';
    if (sentiment === 'positive') return 'low';
    return 'medium';
  }

  private async analyzeOutcome(sopId: string, outcome: any): Promise<any> {
    // Analyze real-world outcome vs expected results
    return {
      performanceDelta: outcome.successful ? 0.1 : -0.1,
      timeVariance: outcome.timeToComplete,
      issuePattern: outcome.issuesEncountered.length > 0 ? 'needs_improvement' : 'stable'
    };
  }

  private async generateLearningUpdates(analysis: any): Promise<string[]> {
    const updates: string[] = [];
    
    if (analysis.performanceDelta < 0) {
      updates.push('Review and strengthen procedural steps');
    }
    
    if (analysis.issuePattern === 'needs_improvement') {
      updates.push('Add troubleshooting section for common issues');
    }
    
    return updates;
  }

  private calculateConfidenceUpdate(outcome: any): number {
    return outcome.successful ? 0.05 : -0.1;
  }

  private storeQualityHistory(sopId: string, metrics: QualityMetrics): void {
    const history = this.qualityHistory.get(sopId) || [];
    history.push(metrics);
    
    // Keep last 10 quality assessments
    if (history.length > 10) {
      history.shift();
    }
    
    this.qualityHistory.set(sopId, history);
  }

  private getDefaultMetrics(): QualityMetrics {
    return {
      accuracy: 0.5,
      consistency: 0.5,
      safety: 0.5,
      compliance: 0.5,
      readability: 0.5,
      completeness: 0.5
    };
  }
}

export const aiQualityAssurance = new AIQualityAssuranceService();