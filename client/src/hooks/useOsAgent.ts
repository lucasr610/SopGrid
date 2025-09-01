import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface TuneRequest {
  pid: number;
  policy?: 'latency' | 'throughput' | 'balanced';
  cpuset?: string;          // "0-3" or "2,4"
  niceness?: number;        // -20..19
  ioniceClass?: 1 | 2 | 3;  // 1=rt, 2=be, 3=idle
  ioniceLevel?: number;     // 0..7
}

export interface PinRequest {
  pid: number;
  cpuset: string;
}

export interface LimitsRequest {
  pid: number;
  niceness: number;
  ioniceClass?: 1 | 2 | 3;
  ioniceLevel?: number;
}

export interface AgentStatus {
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

export interface ProcessStats {
  pid: number;
  cpu: number;
  memory: number;
  elapsed: number;
  timestamp: number;
}

export function useOsAgent() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll status every 2.5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/os/agent/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, 30000); // MEMORY FIX: Reduced to 30 seconds to prevent bloat

    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/os/agent/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to refresh status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const tune = useCallback(async (request: TuneRequest): Promise<{ ok: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/os/agent/tune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh status after successful tune
        await refresh();
        return data;
      } else {
        const errorData = await response.json();
        return { ok: false, error: errorData.error || 'Failed to tune process' };
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Network error';
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const pin = useCallback(async (request: PinRequest): Promise<{ ok: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/os/agent/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh status after successful pin
        await refresh();
        return data;
      } else {
        const errorData = await response.json();
        return { ok: false, error: errorData.error || 'Failed to pin process' };
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Network error';
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const limits = useCallback(async (request: LimitsRequest): Promise<{ ok: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/os/agent/limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh status after successful limits change
        await refresh();
        return data;
      } else {
        const errorData = await response.json();
        return { ok: false, error: errorData.error || 'Failed to set process limits' };
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Network error';
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const inspect = useCallback(async (pid: number): Promise<ProcessStats | null> => {
    try {
      const response = await fetch(`/api/os/agent/inspect/${pid}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to inspect process');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    }
  }, []);

  return {
    status,
    loading,
    error,
    refresh,
    tune,
    pin,
    limits,
    inspect,
  };
}