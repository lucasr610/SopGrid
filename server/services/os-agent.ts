import { execa } from 'execa';
import pidusage from 'pidusage';
import si from 'systeminformation';

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

interface TuneRequest {
  pid: number;
  policy?: 'latency' | 'throughput' | 'balanced';
  cpuset?: string;          // "0-3" or "2,4"
  niceness?: number;        // -20..19
  ioniceClass?: 1 | 2 | 3;  // 1=rt, 2=be, 3=idle
  ioniceLevel?: number;     // 0..7
}

interface AgentStatus {
  enabled: boolean;
  loopRunning: boolean;
  lastTickAt?: number;
  host: { 
    cpuLoad: number; 
    memUsedPct: number; 
    tempsC?: number[]; 
    governor?: string; 
  };
  managed: Record<number, {
    policy: string; 
    cpuset: string; 
    niceness: number; 
    ionice?: string;
  }>;
}

interface PinRequest {
  pid: number;
  cpuset: string;
}

interface LimitsRequest {
  pid: number;
  niceness: number;
  ioniceClass?: 1 | 2 | 3;
  ioniceLevel?: number;
}

export class OSAgent {
  private enabled: boolean = false;
  private loopRunning: boolean = false;
  private intervalMs: number = 1500;
  private defaultCpuset: string = '0-3';
  private maxCpu: number = 90;
  private maxMem: number = 85;
  private logLevel: LogLevel = 'info';
  private timer?: NodeJS.Timeout;
  private lastTickAt?: number;
  private managed: Record<number, {
    policy: string;
    cpuset: string;
    niceness: number;
    ionice?: string;
  }> = {};

  constructor() {
    // Load configuration from environment
    this.enabled = process.env.OS_AGENT_ENABLED === 'true';
    this.intervalMs = parseInt(process.env.OS_AGENT_INTERVAL_MS || '1500');
    this.defaultCpuset = process.env.OS_AGENT_DEFAULT_CPUSET || '0-3';
    this.maxCpu = parseInt(process.env.OS_AGENT_MAX_CPU || '90');
    this.maxMem = parseInt(process.env.OS_AGENT_MAX_MEM || '85');
    this.logLevel = (process.env.OS_AGENT_LOG_LEVEL as LogLevel) || 'info';
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    const levels = ['silent', 'error', 'warn', 'info', 'debug'];
    const currentLevel = levels.indexOf(this.logLevel);
    const messageLevel = levels.indexOf(level);
    
    if (messageLevel <= currentLevel && level !== 'silent') {
      const prefix = `[OS-Agent ${level.toUpperCase()}]`;
      console.log(prefix, message, ...args);
    }
  }

  async start(): Promise<void> {
    if (!this.enabled) {
      this.log('info', 'OS Agent disabled via OS_AGENT_ENABLED=false');
      return;
    }

    if (this.loopRunning) {
      this.log('warn', 'OS Agent already running');
      return;
    }

    this.log('info', `Starting OS Agent with ${this.intervalMs}ms interval`);
    this.loopRunning = true;
    
    // Start monitoring loop
    this.timer = setInterval(async () => {
      try {
        await this.tick();
      } catch (error) {
        this.log('error', 'Error in OS Agent tick:', error);
      }
    }, this.intervalMs);

    // Run first tick immediately
    await this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.loopRunning = false;
    this.log('info', 'OS Agent stopped');
  }

  private async tick(): Promise<void> {
    this.lastTickAt = Date.now();
    
    try {
      const hostMetrics = await this.getHostMetrics();
      
      // Check for overload and apply guardrails
      if (hostMetrics.cpuLoad > this.maxCpu || hostMetrics.memUsedPct > this.maxMem) {
        this.log('warn', `Host overload detected (CPU: ${hostMetrics.cpuLoad}%, MEM: ${hostMetrics.memUsedPct}%)`);
        await this.applyOverloadGuardrails();
      }
      
      this.log('debug', `Tick completed - CPU: ${hostMetrics.cpuLoad}%, MEM: ${hostMetrics.memUsedPct}%`);
    } catch (error) {
      this.log('error', 'Failed to complete tick:', error);
    }
  }

  private async getHostMetrics(): Promise<{ cpuLoad: number; memUsedPct: number; tempsC?: number[]; governor?: string; }> {
    try {
      // Try to use existing system metrics from SOPGRID if available
      const existingMetrics = (global as any).systemMetrics;
      if (existingMetrics && existingMetrics.cpuUsage !== undefined && existingMetrics.memoryUsage !== undefined) {
        return {
          cpuLoad: existingMetrics.cpuUsage,
          memUsedPct: existingMetrics.memoryUsage,
          tempsC: existingMetrics.temperature ? [existingMetrics.temperature] : undefined
        };
      }

      // Fallback to systeminformation
      const [cpu, mem, temp] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature().catch(() => ({ main: undefined }))
      ]);

      return {
        cpuLoad: Math.round(cpu.currentLoad || 0),
        memUsedPct: Math.round((mem.used / mem.total) * 100),
        tempsC: temp.main ? [temp.main] : undefined
      };
    } catch (error) {
      this.log('error', 'Failed to get host metrics:', error);
      return { cpuLoad: 0, memUsedPct: 0 };
    }
  }

  private async applyOverloadGuardrails(): Promise<void> {
    const managedPids = Object.keys(this.managed).map(Number);
    
    for (const pid of managedPids) {
      try {
        const current = this.managed[pid];
        const newNiceness = Math.min(15, current.niceness + 2);
        
        if (newNiceness !== current.niceness) {
          await this.executeRenice(pid, newNiceness);
          this.managed[pid].niceness = newNiceness;
          this.log('info', `Overload guardrail: raised niceness for PID ${pid} to ${newNiceness}`);
        }
      } catch (error) {
        this.log('error', `Failed to apply overload guardrail to PID ${pid}:`, error);
      }
    }
  }

  async tune(request: TuneRequest): Promise<{ ok: boolean; error?: string }> {
    try {
      const { pid, policy = 'balanced', cpuset, niceness, ioniceClass, ioniceLevel } = request;
      
      // Check if process exists
      if (!(await this.processExists(pid))) {
        return { ok: false, error: 'Process not found' };
      }

      // Apply policy defaults if not explicitly specified
      let finalCpuset = cpuset;
      let finalNiceness = niceness;
      let finalIoniceClass = ioniceClass;
      let finalIoniceLevel = ioniceLevel;

      if (!finalCpuset || finalNiceness === undefined) {
        const policyDefaults = this.getPolicyDefaults(policy);
        finalCpuset = finalCpuset || policyDefaults.cpuset;
        finalNiceness = finalNiceness !== undefined ? finalNiceness : policyDefaults.niceness;
        finalIoniceClass = finalIoniceClass || policyDefaults.ioniceClass;
        finalIoniceLevel = finalIoniceLevel !== undefined ? finalIoniceLevel : policyDefaults.ioniceLevel;
      }

      // Apply tuning
      await this.executeTaskset(pid, finalCpuset!);
      await this.executeRenice(pid, finalNiceness!);
      
      let ioniceStr = '';
      if (finalIoniceClass) {
        await this.executeIonice(pid, finalIoniceClass, finalIoniceLevel);
        ioniceStr = `${finalIoniceClass}${finalIoniceLevel !== undefined ? `:${finalIoniceLevel}` : ''}`;
      }

      // Track managed process
      this.managed[pid] = {
        policy,
        cpuset: finalCpuset!,
        niceness: finalNiceness!,
        ionice: ioniceStr || undefined
      };

      this.log('info', `Tuned PID ${pid} with policy ${policy}: cpuset=${finalCpuset}, nice=${finalNiceness}`);
      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to tune PID ${request.pid}:`, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async pin(request: PinRequest): Promise<{ ok: boolean; error?: string }> {
    try {
      const { pid, cpuset } = request;
      
      if (!(await this.processExists(pid))) {
        return { ok: false, error: 'Process not found' };
      }

      await this.executeTaskset(pid, cpuset);
      
      // Update managed process or create new entry
      if (this.managed[pid]) {
        this.managed[pid].cpuset = cpuset;
      } else {
        this.managed[pid] = {
          policy: 'balanced',
          cpuset,
          niceness: 0
        };
      }

      this.log('info', `Pinned PID ${pid} to cpuset ${cpuset}`);
      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to pin PID ${request.pid}:`, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async limits(request: LimitsRequest): Promise<{ ok: boolean; error?: string }> {
    try {
      const { pid, niceness, ioniceClass, ioniceLevel } = request;
      
      if (!(await this.processExists(pid))) {
        return { ok: false, error: 'Process not found' };
      }

      await this.executeRenice(pid, niceness);
      
      let ioniceStr = '';
      if (ioniceClass) {
        await this.executeIonice(pid, ioniceClass, ioniceLevel);
        ioniceStr = `${ioniceClass}${ioniceLevel !== undefined ? `:${ioniceLevel}` : ''}`;
      }

      // Update managed process or create new entry
      if (this.managed[pid]) {
        this.managed[pid].niceness = niceness;
        if (ioniceStr) this.managed[pid].ionice = ioniceStr;
      } else {
        this.managed[pid] = {
          policy: 'balanced',
          cpuset: this.defaultCpuset,
          niceness,
          ionice: ioniceStr || undefined
        };
      }

      this.log('info', `Set limits for PID ${pid}: niceness=${niceness}${ioniceStr ? `, ionice=${ioniceStr}` : ''}`);
      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to set limits for PID ${request.pid}:`, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async inspect(pid: number): Promise<any> {
    try {
      const stats = await pidusage(pid);
      return {
        pid: stats.pid,
        cpu: stats.cpu,
        memory: stats.memory,
        elapsed: stats.elapsed,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error('Process not found');
    }
  }

  getStatus(): AgentStatus {
    return {
      enabled: this.enabled,
      loopRunning: this.loopRunning,
      lastTickAt: this.lastTickAt,
      host: { cpuLoad: 0, memUsedPct: 0 }, // Will be updated by next tick
      managed: { ...this.managed }
    };
  }

  private getPolicyDefaults(policy: string) {
    switch (policy) {
      case 'latency':
        return {
          cpuset: '0-1',  // Isolate to fewer cores
          niceness: -5,   // Higher priority
          ioniceClass: 1, // Real-time IO
          ioniceLevel: 0  // Highest IO priority
        };
      case 'throughput':
        return {
          cpuset: this.defaultCpuset, // Use all available cores
          niceness: 5,    // Lower priority
          ioniceClass: 2, // Best-effort IO
          ioniceLevel: 4  // Medium IO priority
        };
      default: // balanced
        return {
          cpuset: this.defaultCpuset,
          niceness: 0,    // Normal priority
          ioniceClass: 2, // Best-effort IO
          ioniceLevel: 2  // Medium IO priority
        };
    }
  }

  private async processExists(pid: number): Promise<boolean> {
    try {
      await pidusage(pid);
      return true;
    } catch {
      return false;
    }
  }

  private async executeTaskset(pid: number, cpuset: string): Promise<void> {
    const { stdout, stderr } = await execa('taskset', ['-pc', cpuset, String(pid)]);
    this.log('debug', `taskset output:`, stdout, stderr);
  }

  private async executeRenice(pid: number, niceness: number): Promise<void> {
    const { stdout, stderr } = await execa('renice', [String(niceness), '-p', String(pid)]);
    this.log('debug', `renice output:`, stdout, stderr);
  }

  private async executeIonice(pid: number, ioniceClass: number, ioniceLevel?: number): Promise<void> {
    const args = ['-c', String(ioniceClass)];
    if (ioniceLevel !== undefined) {
      args.push('-n', String(ioniceLevel));
    }
    args.push('-p', String(pid));
    
    const { stdout, stderr } = await execa('ionice', args);
    this.log('debug', `ionice output:`, stdout, stderr);
  }
}

// Export singleton instance
export const osAgent = new OSAgent();