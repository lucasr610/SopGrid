import { storage } from '../storage';

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  description: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number; // in seconds
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: string[];
  safetyLevel: 'low' | 'medium' | 'high' | 'critical';
  completionRate: number;
  lastUpdated: Date;
}

interface TrainingProgress {
  userId: string;
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'certified';
  progress: number; // 0-100
  timeSpent: number; // in seconds
  score?: number; // 0-100
  completedAt?: Date;
  certificationValid?: Date;
}

interface ARInstruction {
  step: number;
  instruction: string;
  safetyWarning?: string;
  imageUrl?: string;
  videoClip?: string;
  checkpointRequired: boolean;
  estimatedDuration: number; // seconds
}

export class ARTrainingSystem {
  private modules: Map<string, TrainingModule> = new Map();
  private progressCache: Map<string, TrainingProgress[]> = new Map();

  constructor() {
    this.initializeDefaultModules();
  }

  private initializeDefaultModules(): void {
    const defaultModules: TrainingModule[] = [
      {
        id: 'rv-electrical-basics',
        title: 'RV Electrical System Fundamentals',
        category: 'Electrical',
        description: 'Learn the basics of RV electrical systems, 12V DC circuits, and safety procedures',
        duration: 1800, // 30 minutes
        difficulty: 'beginner',
        tags: ['electrical', 'safety', 'fundamentals'],
        safetyLevel: 'high',
        completionRate: 0.89,
        lastUpdated: new Date()
      },
      {
        id: 'rv-plumbing-repair',
        title: 'RV Plumbing Repair and Maintenance',
        category: 'Plumbing',
        description: 'Step-by-step guide to common RV plumbing repairs and preventive maintenance',
        duration: 2400, // 40 minutes
        difficulty: 'intermediate',
        tags: ['plumbing', 'repair', 'maintenance'],
        safetyLevel: 'medium',
        completionRate: 0.76,
        lastUpdated: new Date()
      },
      {
        id: 'rv-hvac-diagnostics',
        title: 'RV HVAC System Diagnostics',
        category: 'HVAC',
        description: 'Advanced diagnostics and troubleshooting for RV air conditioning and heating systems',
        duration: 3600, // 60 minutes
        difficulty: 'advanced',
        tags: ['hvac', 'diagnostics', 'troubleshooting'],
        safetyLevel: 'medium',
        completionRate: 0.64,
        lastUpdated: new Date()
      },
      {
        id: 'safety-protocols',
        title: 'RV Service Safety Protocols',
        category: 'Safety',
        description: 'Critical safety procedures, PPE requirements, and emergency protocols for RV technicians',
        duration: 1200, // 20 minutes
        difficulty: 'beginner',
        tags: ['safety', 'ppe', 'emergency', 'protocols'],
        safetyLevel: 'critical',
        completionRate: 0.95,
        lastUpdated: new Date()
      }
    ];

    defaultModules.forEach(module => {
      this.modules.set(module.id, module);
    });

    console.log('🎓 AR Training System initialized with 4 core modules');
  }

  async getAvailableModules(
    category?: string,
    difficulty?: string,
    userId?: string
  ): Promise<TrainingModule[]> {
    let modules = Array.from(this.modules.values());

    // Filter by category
    if (category) {
      modules = modules.filter(m => m.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by difficulty
    if (difficulty) {
      modules = modules.filter(m => m.difficulty === difficulty);
    }

    // Add user progress if available
    if (userId) {
      const userProgress = await this.getUserProgress(userId);
      // Could enhance modules with progress data here
    }

    return modules.sort((a, b) => {
      // Sort by safety level first (critical first), then by completion rate
      const safetyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (a.safetyLevel !== b.safetyLevel) {
        return safetyOrder[b.safetyLevel] - safetyOrder[a.safetyLevel];
      }
      return b.completionRate - a.completionRate;
    });
  }

  async startTrainingSession(
    userId: string,
    moduleId: string
  ): Promise<{
    module: TrainingModule;
    instructions: ARInstruction[];
    sessionId: string;
  }> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Training module ${moduleId} not found`);
    }

    // Generate session ID
    const sessionId = `session-${userId}-${moduleId}-${Date.now()}`;

    // Get or create progress record
    let progress = await this.getModuleProgress(userId, moduleId);
    if (!progress) {
      progress = {
        userId,
        moduleId,
        status: 'in_progress',
        progress: 0,
        timeSpent: 0
      };
      await this.updateProgress(progress);
    } else {
      progress.status = 'in_progress';
      await this.updateProgress(progress);
    }

    // Generate AR instructions for the module
    const instructions = await this.generateARInstructions(moduleId);

    console.log(`🎯 Started training session: ${sessionId} for module ${moduleId}`);
    
    return {
      module,
      instructions,
      sessionId
    };
  }

  private async generateARInstructions(moduleId: string): Promise<ARInstruction[]> {
    // In production, this would be dynamically generated or stored in database
    const instructionTemplates: Record<string, ARInstruction[]> = {
      'rv-electrical-basics': [
        {
          step: 1,
          instruction: 'Put on safety glasses and insulated gloves before working with electrical systems',
          safetyWarning: 'CRITICAL: Never work on live electrical circuits without proper PPE',
          checkpointRequired: true,
          estimatedDuration: 120
        },
        {
          step: 2,
          instruction: 'Locate the main electrical panel and identify the 12V DC circuits',
          checkpointRequired: false,
          estimatedDuration: 180
        },
        {
          step: 3,
          instruction: 'Use multimeter to test voltage levels at battery terminals',
          safetyWarning: 'Ensure proper multimeter settings for DC voltage measurement',
          checkpointRequired: true,
          estimatedDuration: 240
        }
      ],
      'rv-plumbing-repair': [
        {
          step: 1,
          instruction: 'Turn off water pump and drain the system before beginning repairs',
          safetyWarning: 'Ensure all water pressure is released before disconnecting fittings',
          checkpointRequired: true,
          estimatedDuration: 300
        },
        {
          step: 2,
          instruction: 'Identify the leak source and assess the required repair approach',
          checkpointRequired: false,
          estimatedDuration: 180
        }
      ],
      'safety-protocols': [
        {
          step: 1,
          instruction: 'Review the Material Safety Data Sheet (MSDS) for all chemicals being used',
          safetyWarning: 'MANDATORY: Never skip MSDS review when handling chemicals',
          checkpointRequired: true,
          estimatedDuration: 240
        },
        {
          step: 2,
          instruction: 'Verify emergency shutdown procedures and evacuation routes',
          safetyWarning: 'Know the location of emergency stops and fire extinguishers',
          checkpointRequired: true,
          estimatedDuration: 180
        }
      ]
    };

    return instructionTemplates[moduleId] || [];
  }

  async updateProgress(progress: TrainingProgress): Promise<void> {
    const userKey = progress.userId;
    let userProgress = this.progressCache.get(userKey) || [];
    
    const existingIndex = userProgress.findIndex(p => 
      p.moduleId === progress.moduleId
    );

    if (existingIndex >= 0) {
      userProgress[existingIndex] = progress;
    } else {
      userProgress.push(progress);
    }

    this.progressCache.set(userKey, userProgress);
    
    console.log(`📊 Updated training progress: ${progress.userId} - ${progress.moduleId} (${progress.progress}%)`);
  }

  async completeModule(
    userId: string,
    moduleId: string,
    score: number,
    timeSpent: number
  ): Promise<{ certified: boolean; validUntil?: Date }> {
    const progress = await this.getModuleProgress(userId, moduleId);
    if (!progress) {
      throw new Error('Training progress not found');
    }

    progress.status = score >= 80 ? 'certified' : 'completed';
    progress.progress = 100;
    progress.score = score;
    progress.timeSpent = timeSpent;
    progress.completedAt = new Date();

    if (progress.status === 'certified') {
      // Certification valid for 2 years
      progress.certificationValid = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
    }

    await this.updateProgress(progress);

    console.log(`🏆 Module completed: ${moduleId} by ${userId} (Score: ${score}%)`);
    
    return {
      certified: progress.status === 'certified',
      validUntil: progress.certificationValid
    };
  }

  async getUserProgress(userId: string): Promise<TrainingProgress[]> {
    return this.progressCache.get(userId) || [];
  }

  async getModuleProgress(userId: string, moduleId: string): Promise<TrainingProgress | null> {
    const userProgress = await this.getUserProgress(userId);
    return userProgress.find(p => p.moduleId === moduleId) || null;
  }

  async generateProgressReport(userId: string): Promise<{
    totalModules: number;
    completedModules: number;
    certifiedModules: number;
    totalTimeSpent: number;
    averageScore: number;
    upcomingExpirations: Array<{ moduleId: string; expiresAt: Date }>;
  }> {
    const progress = await this.getUserProgress(userId);
    const completed = progress.filter(p => p.status === 'completed' || p.status === 'certified');
    const certified = progress.filter(p => p.status === 'certified');
    
    const totalTimeSpent = progress.reduce((sum, p) => sum + p.timeSpent, 0);
    const averageScore = completed.length > 0 
      ? completed.reduce((sum, p) => sum + (p.score || 0), 0) / completed.length 
      : 0;

    // Check for certifications expiring in next 3 months
    const threeMonthsFromNow = new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000);
    const upcomingExpirations = certified
      .filter(p => p.certificationValid && p.certificationValid <= threeMonthsFromNow)
      .map(p => ({ 
        moduleId: p.moduleId, 
        expiresAt: p.certificationValid! 
      }));

    return {
      totalModules: this.modules.size,
      completedModules: completed.length,
      certifiedModules: certified.length,
      totalTimeSpent,
      averageScore,
      upcomingExpirations
    };
  }
}

export const arTrainingSystem = new ARTrainingSystem();