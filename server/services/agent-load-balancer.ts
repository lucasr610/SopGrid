import { EventEmitter } from 'events';

interface AgentMetrics {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'processing' | 'error' | 'overloaded';
  cpuUsage: number;
  memoryUsage: number;
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  lastActivity: Date;
  capacity: number;
  currentLoad: number;
}

interface LoadBalancingStrategy {
  name: string;
  selectAgent: (agents: AgentMetrics[], taskType?: string) => AgentMetrics | null;
}

interface TaskQueue {
  id: string;
  taskType: string;
  priority: number;
  payload: any;
  createdAt: Date;
  assignedAgent?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

class AgentLoadBalancer extends EventEmitter {
  private agents: Map<string, AgentMetrics> = new Map();
  private taskQueue: TaskQueue[] = [];
  private strategies: Map<string, LoadBalancingStrategy> = new Map();
  private currentStrategy: string = 'roundRobin';
  private roundRobinIndex: number = 0;

  constructor() {
    super();
    this.initializeStrategies();
    this.startMetricsCollection();
    this.startTaskProcessor();
  }

  private initializeStrategies() {
    // Round Robin Strategy
    this.strategies.set('roundRobin', {
      name: 'Round Robin',
      selectAgent: (agents: AgentMetrics[]) => {
        const availableAgents = agents.filter(a => a.status === 'active' || a.status === 'idle');
        if (availableAgents.length === 0) return null;
        
        const selected = availableAgents[this.roundRobinIndex % availableAgents.length];
        this.roundRobinIndex++;
        return selected;
      }
    });

    // Least Connections Strategy
    this.strategies.set('leastConnections', {
      name: 'Least Connections',
      selectAgent: (agents: AgentMetrics[]) => {
        const availableAgents = agents.filter(a => a.status === 'active' || a.status === 'idle');
        if (availableAgents.length === 0) return null;
        
        return availableAgents.reduce((least, current) => 
          current.currentLoad < least.currentLoad ? current : least
        );
      }
    });

    // Weighted Response Time Strategy
    this.strategies.set('weightedResponseTime', {
      name: 'Weighted Response Time',
      selectAgent: (agents: AgentMetrics[]) => {
        const availableAgents = agents.filter(a => a.status === 'active' || a.status === 'idle');
        if (availableAgents.length === 0) return null;
        
        // Score based on response time (lower is better) and current load
        const scored = availableAgents.map(agent => ({
          agent,
          score: (1000 / (agent.avgResponseTime || 1)) * (1 - (agent.currentLoad / agent.capacity))
        }));
        
        return scored.reduce((best, current) => 
          current.score > best.score ? current : best
        ).agent;
      }
    });

    // Resource-Based Strategy
    this.strategies.set('resourceBased', {
      name: 'Resource Based',
      selectAgent: (agents: AgentMetrics[]) => {
        const availableAgents = agents.filter(a => 
          (a.status === 'active' || a.status === 'idle') && 
          a.cpuUsage < 80 && 
          a.memoryUsage < 85
        );
        if (availableAgents.length === 0) return null;
        
        // Score based on available resources
        return availableAgents.reduce((best, current) => {
          const currentScore = (100 - current.cpuUsage) + (100 - current.memoryUsage/1024/1024);
          const bestScore = (100 - best.cpuUsage) + (100 - best.memoryUsage/1024/1024);
          return currentScore > bestScore ? current : best;
        });
      }
    });

    // Adaptive Strategy (switches based on system load)
    this.strategies.set('adaptive', {
      name: 'Adaptive',
      selectAgent: (agents: AgentMetrics[]) => {
        const availableAgents = agents.filter(a => a.status === 'active' || a.status === 'idle');
        if (availableAgents.length === 0) return null;
        
        const avgLoad = availableAgents.reduce((sum, a) => sum + (a.currentLoad / a.capacity), 0) / availableAgents.length;
        
        // Use different strategies based on system load
        if (avgLoad < 0.3) {
          return this.strategies.get('roundRobin')!.selectAgent(agents);
        } else if (avgLoad < 0.7) {
          return this.strategies.get('leastConnections')!.selectAgent(agents);
        } else {
          return this.strategies.get('resourceBased')!.selectAgent(agents);
        }
      }
    });
  }

  registerAgent(agentInfo: Partial<AgentMetrics>): void {
    const agent: AgentMetrics = {
      id: agentInfo.id || `agent-${Date.now()}`,
      name: agentInfo.name || 'Unknown Agent',
      status: 'idle',
      cpuUsage: 0,
      memoryUsage: 0,
      requestCount: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastActivity: new Date(),
      capacity: agentInfo.capacity || 10,
      currentLoad: 0,
      ...agentInfo
    };

    this.agents.set(agent.id, agent);
    this.emit('agentRegistered', agent);
    console.log(`🤖 Agent registered: ${agent.name} (${agent.id})`);
  }

  updateAgentMetrics(agentId: string, metrics: Partial<AgentMetrics>): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`Unknown agent: ${agentId}`);
      return;
    }

    Object.assign(agent, metrics, { lastActivity: new Date() });
    
    // Update status based on metrics
    if (agent.cpuUsage > 90 || agent.memoryUsage > 90 || agent.currentLoad >= agent.capacity) {
      agent.status = 'overloaded';
    } else if (agent.errorRate > 10) {
      agent.status = 'error';
    } else if (agent.currentLoad > 0) {
      agent.status = 'processing';
    } else {
      agent.status = 'active';
    }

    this.emit('agentMetricsUpdated', agent);
  }

  removeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.emit('agentRemoved', agent);
      console.log(`🤖 Agent removed: ${agent.name} (${agentId})`);
    }
  }

  assignTask(taskType: string, payload: any, priority: number = 0): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const task: TaskQueue = {
        id: `task-${Date.now()}-${require('crypto').randomUUID().substr(0, 8)}`,
        taskType,
        priority,
        payload,
        createdAt: new Date(),
        status: 'queued'
      };

      // Try to assign immediately
      const agent = this.selectAgent(taskType);
      if (agent && agent.currentLoad < agent.capacity) {
        task.assignedAgent = agent.id;
        task.status = 'processing';
        agent.currentLoad++;
        
        console.log(`📋 Task ${task.id} assigned to agent ${agent.name}`);
        this.emit('taskAssigned', task, agent);
        resolve(agent.id);
      } else {
        // Queue the task
        this.taskQueue.push(task);
        this.taskQueue.sort((a, b) => b.priority - a.priority); // Higher priority first
        
        console.log(`📋 Task ${task.id} queued (${this.taskQueue.length} tasks in queue)`);
        this.emit('taskQueued', task);
        resolve(null);
      }
    });
  }

  completeTask(taskId: string, success: boolean = true): void {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) return;

    task.status = success ? 'completed' : 'failed';
    
    if (task.assignedAgent) {
      const agent = this.agents.get(task.assignedAgent);
      if (agent) {
        agent.currentLoad = Math.max(0, agent.currentLoad - 1);
        agent.requestCount++;
        
        if (!success) {
          agent.errorRate = Math.min(100, agent.errorRate + 1);
        }
        
        this.updateAgentMetrics(agent.id, {});
      }
    }

    // Remove completed/failed tasks after a delay
    setTimeout(() => {
      const index = this.taskQueue.findIndex(t => t.id === taskId);
      if (index !== -1) {
        this.taskQueue.splice(index, 1);
      }
    }, 30000); // Keep for 30 seconds for monitoring

    this.emit('taskCompleted', task, success);
    
    // Try to process queued tasks
    this.processQueuedTasks();
  }

  private selectAgent(taskType?: string): AgentMetrics | null {
    const agentArray = Array.from(this.agents.values());
    const strategy = this.strategies.get(this.currentStrategy);
    
    if (!strategy) {
      console.error(`Unknown load balancing strategy: ${this.currentStrategy}`);
      return null;
    }

    return strategy.selectAgent(agentArray, taskType);
  }

  private processQueuedTasks(): void {
    const queuedTasks = this.taskQueue.filter(t => t.status === 'queued');
    
    for (const task of queuedTasks) {
      const agent = this.selectAgent(task.taskType);
      if (agent && agent.currentLoad < agent.capacity) {
        task.assignedAgent = agent.id;
        task.status = 'processing';
        agent.currentLoad++;
        
        console.log(`📋 Queued task ${task.id} assigned to agent ${agent.name}`);
        this.emit('taskAssigned', task, agent);
      }
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Cleanup stale agents (no activity for 5 minutes)
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      
      for (const [agentId, agent] of this.agents.entries()) {
        if (agent.lastActivity < staleThreshold) {
          console.log(`🧹 Removing stale agent: ${agent.name}`);
          this.removeAgent(agentId);
        }
      }
      
      // Emit metrics summary
      this.emit('metricsCollected', {
        totalAgents: this.agents.size,
        activeAgents: Array.from(this.agents.values()).filter(a => a.status === 'active').length,
        queuedTasks: this.taskQueue.filter(t => t.status === 'queued').length,
        processingTasks: this.taskQueue.filter(t => t.status === 'processing').length
      });
    }, 60000); // Every minute
  }

  private startTaskProcessor(): void {
    setInterval(() => {
      this.processQueuedTasks();
    }, 5000); // Every 5 seconds
  }

  setLoadBalancingStrategy(strategy: string): boolean {
    if (this.strategies.has(strategy)) {
      this.currentStrategy = strategy;
      console.log(`⚖️ Load balancing strategy changed to: ${strategy}`);
      this.emit('strategyChanged', strategy);
      return true;
    }
    return false;
  }

  getSystemStatus() {
    const agentArray = Array.from(this.agents.values());
    const queuedTasks = this.taskQueue.filter(t => t.status === 'queued');
    const processingTasks = this.taskQueue.filter(t => t.status === 'processing');
    
    return {
      strategy: this.currentStrategy,
      agents: {
        total: agentArray.length,
        active: agentArray.filter(a => a.status === 'active').length,
        idle: agentArray.filter(a => a.status === 'idle').length,
        processing: agentArray.filter(a => a.status === 'processing').length,
        error: agentArray.filter(a => a.status === 'error').length,
        overloaded: agentArray.filter(a => a.status === 'overloaded').length
      },
      tasks: {
        queued: queuedTasks.length,
        processing: processingTasks.length,
        completed: this.taskQueue.filter(t => t.status === 'completed').length,
        failed: this.taskQueue.filter(t => t.status === 'failed').length
      },
      performance: {
        avgResponseTime: agentArray.length > 0 
          ? agentArray.reduce((sum, a) => sum + a.avgResponseTime, 0) / agentArray.length 
          : 0,
        totalRequests: agentArray.reduce((sum, a) => sum + a.requestCount, 0),
        avgErrorRate: agentArray.length > 0
          ? agentArray.reduce((sum, a) => sum + a.errorRate, 0) / agentArray.length
          : 0,
        systemLoad: agentArray.length > 0
          ? agentArray.reduce((sum, a) => sum + (a.currentLoad / a.capacity), 0) / agentArray.length
          : 0
      },
      availableStrategies: Array.from(this.strategies.keys())
    };
  }

  getAgentMetrics(): AgentMetrics[] {
    return Array.from(this.agents.values());
  }

  getTaskQueue(): TaskQueue[] {
    return [...this.taskQueue];
  }
}

export const agentLoadBalancer = new AgentLoadBalancer();