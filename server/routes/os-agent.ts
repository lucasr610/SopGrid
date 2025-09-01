import { Router } from 'express';
import { osAgent } from '../services/os-agent.js';

const router = Router();

// GET /api/os/agent/status → agent status + host load
router.get('/status', async (req, res) => {
  try {
    const status = osAgent.getStatus();
    
    // Update with current host metrics if agent is running
    if (status.loopRunning) {
      // The host metrics will be updated by the agent's tick loop
      const existingMetrics = (global as any).systemMetrics;
      if (existingMetrics) {
        status.host = {
          cpuLoad: existingMetrics.cpuUsage || 0,
          memUsedPct: existingMetrics.memoryUsage || 0,
          tempsC: existingMetrics.temperature ? [existingMetrics.temperature] : undefined
        };
      }
    }
    
    res.json(status);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

// POST /api/os/agent/tune → { pid, policy?, cpuset?, niceness?, ioniceClass?, ioniceLevel? }
router.post('/tune', async (req, res) => {
  try {
    const { pid, policy, cpuset, niceness, ioniceClass, ioniceLevel } = req.body;
    
    if (!pid || typeof pid !== 'number') {
      return res.status(400).json({ error: 'Valid PID is required' });
    }
    
    const result = await osAgent.tune({
      pid,
      policy,
      cpuset,
      niceness,
      ioniceClass,
      ioniceLevel
    });
    
    if (result.ok) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

// POST /api/os/agent/pin → { pid, cpuset }
router.post('/pin', async (req, res) => {
  try {
    const { pid, cpuset } = req.body;
    
    if (!pid || typeof pid !== 'number') {
      return res.status(400).json({ error: 'Valid PID is required' });
    }
    
    if (!cpuset || typeof cpuset !== 'string') {
      return res.status(400).json({ error: 'Valid cpuset is required' });
    }
    
    const result = await osAgent.pin({ pid, cpuset });
    
    if (result.ok) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

// POST /api/os/agent/limits → { pid, niceness, ioniceClass?, ioniceLevel? }
router.post('/limits', async (req, res) => {
  try {
    const { pid, niceness, ioniceClass, ioniceLevel } = req.body;
    
    if (!pid || typeof pid !== 'number') {
      return res.status(400).json({ error: 'Valid PID is required' });
    }
    
    if (niceness === undefined || typeof niceness !== 'number') {
      return res.status(400).json({ error: 'Valid niceness is required' });
    }
    
    const result = await osAgent.limits({
      pid,
      niceness,
      ioniceClass,
      ioniceLevel
    });
    
    if (result.ok) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

// GET /api/os/agent/inspect/:pid → pidusage snapshot
router.get('/inspect/:pid', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid);
    
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Valid PID is required' });
    }
    
    const stats = await osAgent.inspect(pid);
    res.json(stats);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Process not found';
    res.status(400).json({ error: errorMsg });
  }
});

export default router;