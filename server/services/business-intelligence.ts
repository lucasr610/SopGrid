import { storage } from '../storage';

interface PerformanceMetrics {
  sopGenerationTime: number;
  contradictionDetectionTime: number;
  complianceCheckTime: number;
  totalProcessingTime: number;
  humanReviewTime?: number;
}

interface QualityMetrics {
  contradictionScore: number;
  complianceScore: number;
  safetyScore: number;
  accuracyRating: number;
  userSatisfaction?: number;
}

interface AnalyticsData {
  date: Date;
  metrics: PerformanceMetrics;
  quality: QualityMetrics;
  volume: {
    sopsGenerated: number;
    documentsProcessed: number;
    complianceChecks: number;
  };
  user: string;
  category: string;
}

export class BusinessIntelligenceService {
  private metricsBuffer: AnalyticsData[] = [];
  private readonly BUFFER_SIZE = 20; // MEMORY FIX: Reduced buffer size to prevent bloat

  async trackSOPGeneration(
    userId: string,
    category: string,
    metrics: PerformanceMetrics,
    quality: QualityMetrics
  ): Promise<void> {
    const analyticsData: AnalyticsData = {
      date: new Date(),
      metrics,
      quality,
      volume: {
        sopsGenerated: 1,
        documentsProcessed: 0,
        complianceChecks: 1
      },
      user: userId,
      category
    };

    this.metricsBuffer.push(analyticsData);
    
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flushMetrics();
    }

    console.log(`📊 Tracked SOP generation: ${category} (${metrics.totalProcessingTime}ms)`);
  }

  async generatePerformanceReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<{
    summary: {
      totalSOPs: number;
      avgProcessingTime: number;
      avgContradictionScore: number;
      avgComplianceScore: number;
    };
    trends: {
      daily: Array<{ date: string; count: number; avgTime: number }>;
      categories: Array<{ category: string; count: number; avgQuality: number }>;
    };
    recommendations: string[];
  }> {
    // This would query actual database in production
    const mockData = this.generateMockReport(startDate, endDate, userId);
    
    console.log(`📈 Generated performance report for ${userId || 'all users'}`);
    return mockData;
  }

  async getSystemHealthDashboard(): Promise<{
    currentLoad: {
      activeRotors: number;
      queuedTasks: number;
      processingTasks: number;
    };
    performance: {
      avgResponseTime: number;
      successRate: number;
      errorRate: number;
    };
    quality: {
      avgContradictionScore: number;
      avgComplianceScore: number;
      humanApprovalRate: number;
    };
    recommendations: string[];
  }> {
    // This would integrate with actual system metrics
    return {
      currentLoad: {
        activeRotors: 4,
        queuedTasks: 2,
        processingTasks: 1
      },
      performance: {
        avgResponseTime: 2500,
        successRate: 97.8,
        errorRate: 2.2
      },
      quality: {
        avgContradictionScore: 0.23,
        avgComplianceScore: 0.89,
        humanApprovalRate: 0.95
      },
      recommendations: [
        'System performance is optimal',
        'Contradiction scores are well below threshold',
        'High human approval rate indicates good AI-human collaboration'
      ]
    };
  }

  private async flushMetrics(): Promise<void> {
    try {
      // In production, this would batch insert to analytics database
      console.log(`💾 Flushing ${this.metricsBuffer.length} analytics records`);
      this.metricsBuffer = [];
    } catch (error) {
      console.error('❌ Failed to flush analytics metrics:', error);
    }
  }

  private generateMockReport(startDate: Date, endDate: Date, userId?: string) {
    // Mock data for demonstration
    return {
      summary: {
        totalSOPs: 847,
        avgProcessingTime: 2340,
        avgContradictionScore: 0.24,
        avgComplianceScore: 0.91
      },
      trends: {
        daily: [
          { date: '2025-01-20', count: 45, avgTime: 2200 },
          { date: '2025-01-21', count: 52, avgTime: 2100 },
          { date: '2025-01-22', count: 48, avgTime: 2400 }
        ],
        categories: [
          { category: 'RV Electrical', count: 234, avgQuality: 0.92 },
          { category: 'RV Plumbing', count: 189, avgQuality: 0.89 },
          { category: 'RV HVAC', count: 156, avgQuality: 0.94 }
        ]
      },
      recommendations: [
        'Electrical SOPs show highest quality scores',
        'Consider optimizing HVAC SOP generation workflows',
        'Processing times are consistent and within targets'
      ]
    };
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();