import Redis from 'ioredis';
import { EventEmitter } from 'events';

interface QueueTask {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  payload: any;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startAfter?: Date;
}

export class RedisQueueManager extends EventEmitter {
  private redis: Redis;
  private redisSubscriber: Redis;
  private queueKey = 'sopgrid:task_queue';
  private processingKey = 'sopgrid:processing';
  private deadLetterKey = 'sopgrid:dead_letter';

  constructor() {
    super();
    
    // Use environment variables for Redis connection
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });

    this.redisSubscriber = new Redis(redisUrl);
    
    this.setupErrorHandling();
    this.startHealthCheck();
  }

  private setupErrorHandling(): void {
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.emit('error', error);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected for task queue');
    });
  }

  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        await this.redis.ping();
      } catch (error) {
        console.error('Redis health check failed:', error);
        this.emit('redis_down', error);
      }
    }, 30000); // Check every 30 seconds
  }

  async enqueueTask(task: Omit<QueueTask, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueTask: QueueTask = {
      ...task,
      id: taskId,
      createdAt: new Date(),
      retryCount: 0,
    };

    // Priority-based scoring (higher priority = higher score)
    const priorityScore = {
      'critical': 1000,
      'high': 750,
      'medium': 500,
      'low': 250
    }[task.priority];

    const score = priorityScore + Date.now(); // Add timestamp for FIFO within priority

    await this.redis.zadd(this.queueKey, score, JSON.stringify(queueTask));
    
    console.log(`📤 Task ${taskId} queued with priority ${task.priority}`);
    this.emit('task_queued', queueTask);
    
    return taskId;
  }

  async dequeueTask(): Promise<QueueTask | null> {
    // Get highest priority task (highest score)
    const result = await this.redis.zpopmax(this.queueKey);
    
    if (!result.length) {
      return null;
    }

    const taskData = JSON.parse(result[0]);
    const task: QueueTask = {
      ...taskData,
      createdAt: new Date(taskData.createdAt)
    };

    // Move to processing queue
    await this.redis.hset(this.processingKey, task.id, JSON.stringify(task));
    
    console.log(`📥 Task ${task.id} dequeued for processing`);
    this.emit('task_dequeued', task);
    
    return task;
  }

  async completeTask(taskId: string): Promise<void> {
    await this.redis.hdel(this.processingKey, taskId);
    console.log(`✅ Task ${taskId} completed and removed from processing`);
    this.emit('task_completed', taskId);
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const taskData = await this.redis.hget(this.processingKey, taskId);
    
    if (!taskData) {
      console.error(`Task ${taskId} not found in processing queue`);
      return;
    }

    const task: QueueTask = JSON.parse(taskData);
    task.retryCount++;

    if (task.retryCount >= task.maxRetries) {
      // Move to dead letter queue
      await this.redis.lpush(this.deadLetterKey, JSON.stringify({
        ...task,
        error,
        failedAt: new Date()
      }));
      await this.redis.hdel(this.processingKey, taskId);
      console.error(`💀 Task ${taskId} moved to dead letter queue after ${task.retryCount} retries`);
      this.emit('task_dead_letter', task);
    } else {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, task.retryCount) * 1000; // 2s, 4s, 8s, etc.
      task.startAfter = new Date(Date.now() + retryDelay);
      
      const priorityScore = {
        'critical': 1000,
        'high': 750,
        'medium': 500,
        'low': 250
      }[task.priority];

      await this.redis.zadd(this.queueKey, priorityScore + Date.now() + retryDelay, JSON.stringify(task));
      await this.redis.hdel(this.processingKey, taskId);
      
      console.log(`🔄 Task ${taskId} scheduled for retry in ${retryDelay}ms (attempt ${task.retryCount}/${task.maxRetries})`);
      this.emit('task_retry', task);
    }
  }

  async getQueueStats(): Promise<{
    queued: number;
    processing: number;
    deadLetter: number;
    queuedByPriority: Record<string, number>;
  }> {
    const [queued, processing, deadLetter] = await Promise.all([
      this.redis.zcard(this.queueKey),
      this.redis.hlen(this.processingKey),
      this.redis.llen(this.deadLetterKey)
    ]);

    // Get queued tasks by priority
    const queuedTasks = await this.redis.zrange(this.queueKey, 0, -1);
    const queuedByPriority = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const taskStr of queuedTasks) {
      try {
        const task = JSON.parse(taskStr);
        queuedByPriority[task.priority]++;
      } catch (e) {
        // Skip malformed tasks
      }
    }

    return {
      queued,
      processing,
      deadLetter,
      queuedByPriority
    };
  }

  async getProcessingTasks(): Promise<QueueTask[]> {
    const taskData = await this.redis.hgetall(this.processingKey);
    return Object.values(taskData).map(data => {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt)
      };
    });
  }

  async clearQueues(): Promise<void> {
    await Promise.all([
      this.redis.del(this.queueKey),
      this.redis.del(this.processingKey),
      this.redis.del(this.deadLetterKey)
    ]);
    console.log('🧹 All queues cleared');
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    await this.redisSubscriber.quit();
  }
}

export const redisQueueManager = new RedisQueueManager();