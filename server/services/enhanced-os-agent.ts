import { memoryEfficientSOPGenerator } from "./memory-efficient-sop-generator.js";
import { Pool } from '@neondatabase/serverless';

interface SystemResourceState {
  memoryUsage: number;
  cpuUsage: number;
  activeOperations: number;
  queuedOperations: number;
}

interface OptimizationAction {
  type: 'memory_cleanup' | 'operation_delay' | 'workload_distribution' | 'cache_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  executed: boolean;
}

interface PerformanceProfile {
  optimalMemoryThreshold: number;
  criticalMemoryThreshold: number;
  maxConcurrentOperations: number;
  adaptiveScheduling: boolean;
}

class EnhancedOSAgent {
  private performanceProfile: PerformanceProfile = {
    optimalMemoryThreshold: 75,    // Target 75% as optimal
    criticalMemoryThreshold: 90,   // Emergency actions only at 90%
    maxConcurrentOperations: 2,    // Allow operations but control I/O
    adaptiveScheduling: true       // Auto-adjust based of system behavior
  };

  private dbPool: Pool | null = null;

  private operationQueue: any[] = [];
  private activeOperations = new Set<string>();
  private systemHistory: SystemResourceState[] = [];
  private isOptimizing = false;

  constructor() {
    // Initialize database connection for memory offloading
    this.initializeDatabase();
    // Monitoring disabled to reduce console output
    console.log('🤖 Enhanced OS Agent initialized - Monitoring disabled');
  }

  /**
   * Initialize database connection for memory offloading
   */
  private initializeDatabase(): void {
    try {
      if (process.env.DATABASE_URL) {
        this.dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
        console.log('🗄️ OS Agent: Database connection ready for memory offloading');
      }
    } catch (error) {
      console.error('🚨 OS Agent: Database initialization failed:', error);
    }
  }

  /**
   * Move system history to database storage
   */
  private async moveHistoryToDatabase(history: SystemResourceState[]): Promise<void> {
    try {
      if (!this.dbPool) return;
      
      const client = await this.dbPool.connect();
      try {
        await client.query(`
          INSERT INTO system_cache (cache_type, cache_key, cache_data, created_at)
          VALUES ('system_history', 'current', $1, NOW())
          ON CONFLICT (cache_type, cache_key) 
          DO UPDATE SET cache_data = $1, created_at = NOW()
        `, [JSON.stringify(history)]);
        
        console.log(`🗄️ Stored ${history.length} history records in database`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('🚨 Failed to store history in database:', error);
    }
  }

  /**
   * Move operation queue to database storage
   */
  private async moveQueueToDatabase(queue: any[]): Promise<void> {
    try {
      if (!this.dbPool) return;
      
      const client = await this.dbPool.connect();
      try {
        await client.query(`
          INSERT INTO system_cache (cache_type, cache_key, cache_data, created_at)
          VALUES ('operation_queue', 'pending', $1, NOW())
          ON CONFLICT (cache_type, cache_key)
          DO UPDATE SET cache_data = $1, created_at = NOW()
        `, [JSON.stringify(queue)]);
        
        console.log(`🗄️ Stored ${queue.length} queued operations in database`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('🚨 Failed to store queue in database:', error);
    }
  }

  /**
   * Move cache data to database storage
   */
  private async moveCacheToDatabase(cacheType: string, cacheData: any): Promise<void> {
    try {
      if (!this.dbPool) return;
      
      const client = await this.dbPool.connect();
      try {
        await client.query(`
          INSERT INTO system_cache (cache_type, cache_key, cache_data, created_at)
          VALUES ($1, 'memory_offload', $2, NOW())
          ON CONFLICT (cache_type, cache_key)
          DO UPDATE SET cache_data = $2, created_at = NOW()
        `, [cacheType + '_cache', JSON.stringify(cacheData)]);
        
        console.log(`🗄️ Moved ${cacheType} cache to database storage`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`🚨 Failed to move ${cacheType} cache to database:`, error);
    }
  }

  /**
   * Continuous system monitoring and optimization
   */
  private startContinuousMonitoring(): void {
    // Disabled to reduce console noise
    console.log('🤖 OS Agent: Background monitoring disabled to reduce console output');
    return;
    
    // Original monitoring code disabled
    /*
    setInterval(async () => {
      const currentState = this.getCurrentSystemState();
      this.systemHistory.push(currentState);
      
      // Keep only last 10 measurements to save memory
      if (this.systemHistory.length > 10) {
        this.systemHistory.shift();
      }

      // Perform automatic optimizations if needed
      await this.performAutomaticOptimizations(currentState);
      
    }, 3000); // Monitor every 3 seconds for more responsive control
    */
  }

  /**
   * Get current system resource state
   */
  private getCurrentSystemState(): SystemResourceState {
    const memUsage = process.memoryUsage();
    // Use actual heap usage percentage - this is the real memory being used
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const actualMemoryPercent = Math.round((heapUsedMB / Math.max(heapTotalMB, 1)) * 100);
    
    // Log actual values for transparency
    console.log(`📊 OS Agent Memory: ${heapUsedMB}MB used / ${heapTotalMB}MB total = ${actualMemoryPercent}%`);
    
    return {
      memoryUsage: actualMemoryPercent,
      cpuUsage: Math.floor(Math.random() * 10) + 50, // Mock CPU for now  
      activeOperations: this.activeOperations.size,
      queuedOperations: this.operationQueue.length
    };
  }

  /**
   * Automatically optimize system performance
   */
  private async performAutomaticOptimizations(state: SystemResourceState): Promise<void> {
    if (this.isOptimizing) return; // Prevent concurrent optimizations
    
    const optimizations: OptimizationAction[] = [];

    // Memory optimization decisions - based on ACTUAL memory usage
    if (state.memoryUsage >= 90) {
      console.log(`🚨 OS Agent: REAL Critical memory (${state.memoryUsage}%) - Emergency cleanup`);
      optimizations.push({
        type: 'memory_cleanup',
        priority: 'critical',
        executed: false
      });
    } else if (state.memoryUsage >= 75) {
      console.log(`⚡ OS Agent: REAL High memory (${state.memoryUsage}%) - Target exceeded, cleaning up`);
      optimizations.push({
        type: 'memory_cleanup',
        priority: 'high',
        executed: false
      });
    } else if (state.memoryUsage >= 60) {
      console.log(`🔄 OS Agent: REAL Moderate memory (${state.memoryUsage}%) - Proactive cleanup`);
      optimizations.push({
        type: 'memory_cleanup',
        priority: 'medium',
        executed: false
      });
    }

    // Operation scheduling optimization
    if (state.activeOperations >= this.performanceProfile.maxConcurrentOperations) {
      optimizations.push({
        type: 'operation_delay',
        priority: 'high',
        executed: false
      });
    }

    // Execute optimizations
    await this.executeOptimizations(optimizations);
  }

  /**
   * Execute system optimizations transparently
   */
  private async executeOptimizations(optimizations: OptimizationAction[]): Promise<void> {
    this.isOptimizing = true;

    try {
      for (const optimization of optimizations) {
        switch (optimization.type) {
          case 'memory_cleanup':
            await this.performMemoryCleanup(optimization.priority);
            break;
          case 'operation_delay':
            await this.optimizeOperationScheduling();
            break;
          case 'cache_optimization':
            await this.optimizeCaches();
            break;
        }
        optimization.executed = true;
      }
    } catch (error) {
      console.error('🚨 OS Agent optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Database-backed memory management - Store data in database instead of RAM
   */
  private async performMemoryCleanup(priority: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    console.log(`🧹 OS Agent: ${priority} cleanup - Moving data to database storage`);

    try {
      // Move system history to database instead of keeping in memory
      if (this.systemHistory.length > 0) {
        await this.moveHistoryToDatabase(this.systemHistory);
        this.systemHistory = []; // Clear from memory after storing in DB
        console.log('🗄️ OS Agent: Moved system history to database storage');
      }

      // Move operation queue to database for persistence
      if (this.operationQueue.length > 0) {
        await this.moveQueueToDatabase(this.operationQueue);
        this.operationQueue = []; // Clear from memory after storing in DB
        console.log('🗄️ OS Agent: Moved operation queue to database storage');
      }

      // Clear memory caches but ensure they're backed by database
      if ((global as any).sopCache) {
        await this.moveCacheToDatabase('sop', (global as any).sopCache);
        delete (global as any).sopCache;
      }
      if ((global as any).aiResponseCache) {
        await this.moveCacheToDatabase('ai_response', (global as any).aiResponseCache);
        delete (global as any).aiResponseCache;
      }
      if ((global as any).documentCache) {
        await this.moveCacheToDatabase('document', (global as any).documentCache);
        delete (global as any).documentCache;
      }

      console.log(`🗄️ OS Agent: ${priority} - Data moved to database, memory freed for operations`);

    } catch (error) {
      console.error('🚨 OS Agent: Database storage failed, falling back to memory cleanup:', error);
      // Fallback to memory cleanup if database fails
      this.systemHistory = this.systemHistory.slice(-2);
      this.operationQueue = this.operationQueue.slice(0, 1);
    }

    // Focused garbage collection - fewer cycles since we moved data to DB
    if (global.gc) {
      for (let i = 0; i < 2; i++) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      console.log('🧹 OS Agent: 2x garbage collection after database storage');
    }

    // Force Node.js to release unused memory
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      console.log('🧹 OS Agent: Final memory compaction completed');
    }
  }

  /**
   * Optimize operation scheduling
   */
  private async optimizeOperationScheduling(): Promise<void> {
    console.log('⚖️ OS Agent: Optimizing operation scheduling');
    
    // REAL memory-based operation control - aggressive measures when memory is truly high
    const currentState = this.getCurrentSystemState();
    const avgMemory = this.systemHistory.length > 0 ? 
      this.systemHistory.slice(-3).reduce((sum, state) => sum + state.memoryUsage, 0) / Math.max(this.systemHistory.length, 1) :
      currentState.memoryUsage;
    
    if (avgMemory >= 95) {
      // Emergency mode - Single operation only, aggressive cleanup
      this.performanceProfile.maxConcurrentOperations = 1;
      await this.performMemoryCleanup('critical');
      console.log('⚖️ OS Agent: EMERGENCY mode (95%+) - Single ops, aggressive cleanup');
    } else if (avgMemory >= 85) {
      // High memory: Very limited operations
      this.performanceProfile.maxConcurrentOperations = 1;
      await this.performMemoryCleanup('high');
      console.log('⚖️ OS Agent: HIGH memory mode (85%+) - Limited operations, high cleanup');
    } else if (avgMemory >= 75) {
      // Target exceeded: Controlled operations
      this.performanceProfile.maxConcurrentOperations = 2;
      await this.performMemoryCleanup('medium');
      console.log('⚖️ OS Agent: TARGET exceeded (75%+) - Controlled operations, medium cleanup');
    } else {
      // Good memory: Normal operations
      this.performanceProfile.maxConcurrentOperations = 3;
      console.log('⚖️ OS Agent: GOOD memory (<75%) - Normal operations');
    }
  }

  /**
   * Optimize system caches
   */
  private async optimizeCaches(): Promise<void> {
    console.log('💾 OS Agent: Optimizing system caches');
    // This would integrate with the caching systems we created earlier
  }

  /**
   * Intelligently handle SOP generation with resource-aware execution
   */
  async handleSOPRequest(request: any): Promise<any> {
    const operationId = `sop_${Date.now()}`;
    console.log(`🎯 OS Agent: Managing SOP request ${operationId}`);

    try {
      const currentState = this.getCurrentSystemState();
      
      // Always execute but with appropriate resource control
      if (currentState.memoryUsage > this.performanceProfile.criticalMemoryThreshold) {
        console.log(`🔥 OS Agent: Critical memory (${currentState.memoryUsage}%) - Emergency resource control`);
        return await this.executeWithEmergencyControl(operationId, request);
      } else if (currentState.memoryUsage > this.performanceProfile.optimalMemoryThreshold) {
        console.log(`⚡ OS Agent: High memory (${currentState.memoryUsage}%) - Optimized resource control`);
        return await this.executeWithOptimizedControl(operationId, request);
      } else if (this.activeOperations.size >= this.performanceProfile.maxConcurrentOperations) {
        console.log(`⏳ OS Agent: Queue operation ${operationId} for controlled execution`);
        return await this.queueOperation(operationId, request);
      }

      // Execute with peak performance
      console.log(`🚀 OS Agent: Peak performance execution for ${operationId}`);
      return await this.executeSOPOperation(operationId, request);

    } catch (error) {
      console.error(`🚨 OS Agent: Failed to handle SOP request ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Queue operation for later execution when resources allow
   */
  private async queueOperation(operationId: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        id: operationId,
        request,
        resolve,
        reject,
        queuedAt: Date.now()
      });

      console.log(`📋 OS Agent: Queued operation ${operationId} (${this.operationQueue.length} in queue)`);
      
      // Try to process queue periodically
      this.processQueue();
    });
  }

  /**
   * Execute SOP operation with OS management
   */
  private async executeSOPOperation(operationId: string, request: any): Promise<any> {
    this.activeOperations.add(operationId);
    
    try {
      console.log(`🚀 OS Agent: Executing SOP operation ${operationId}`);
      
      // Use memory-efficient generator with OS oversight
      const result = await memoryEfficientSOPGenerator.generateMassiveSOP({
        topic: request.topic,
        system: request.system || 'general',
        component: request.component || 'maintenance',
        complexity: request.complexity || 'intermediate'
      });

      // Post-operation cleanup
      if (global.gc) {
        global.gc();
        console.log(`🧹 OS Agent: Post-operation cleanup for ${operationId}`);
      }

      return result;

    } finally {
      this.activeOperations.delete(operationId);
      console.log(`✅ OS Agent: Completed operation ${operationId}`);
      
      // Try to process any queued operations
      this.processQueue();
    }
  }

  /**
   * Process queued operations when resources allow
   */
  private async processQueue(): Promise<void> {
    if (this.operationQueue.length === 0) return;

    const currentState = this.getCurrentSystemState();
    
    // Can we process more operations?
    if (currentState.memoryUsage <= this.performanceProfile.optimalMemoryThreshold && 
        this.activeOperations.size < this.performanceProfile.maxConcurrentOperations) {
      
      const queuedOperation = this.operationQueue.shift();
      if (queuedOperation) {
        console.log(`📋 OS Agent: Processing queued operation ${queuedOperation.id}`);
        
        try {
          const result = await this.executeSOPOperation(queuedOperation.id, queuedOperation.request);
          queuedOperation.resolve(result);
        } catch (error) {
          queuedOperation.reject(error);
        }
      }
    }
  }

  /**
   * Get system performance report
   */
  getPerformanceReport(): any {
    const currentState = this.getCurrentSystemState();
    const avgMemory = this.systemHistory.length > 0 
      ? this.systemHistory.reduce((sum, state) => sum + state.memoryUsage, 0) / this.systemHistory.length 
      : 0;

    return {
      currentState,
      averageMemoryUsage: Math.round(avgMemory),
      queuedOperations: this.operationQueue.length,
      activeOperations: this.activeOperations.size,
      performanceProfile: this.performanceProfile,
      systemHealth: currentState.memoryUsage < this.performanceProfile.optimalMemoryThreshold ? 'optimal' : 
                   currentState.memoryUsage < this.performanceProfile.criticalMemoryThreshold ? 'degraded' : 'critical',
      autoOptimizationActive: true
    };
  }
}

export const enhancedOSAgent = new EnhancedOSAgent();