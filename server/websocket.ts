import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage';

interface WebSocketMessage {
  type: string;
  data: any;
}

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function setupWebSocket(server: HTTPServer) {
  wss = new WebSocketServer({ 
    server,
    perMessageDeflate: false, // Disable compression to avoid frame issues
    maxPayload: 1024 * 1024, // 1MB max payload
    skipUTF8Validation: true // Skip UTF8 validation to prevent frame errors
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    // Set up heartbeat to prevent connection issues
    const heartbeat = global.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error('WebSocket ping error:', error);
          global.clearInterval(heartbeat);
          clients.delete(ws);
        }
      } else {
        clearInterval(heartbeat);
        clients.delete(ws);
      }
    }, 30000);

    ws.on('message', async (message: Buffer) => {
      try {
        // Add safety check for message format
        if (message.length === 0) return;
        
        const messageStr = message.toString('utf8');
        if (!messageStr || messageStr.trim() === '') return;
        
        const parsed: WebSocketMessage = JSON.parse(messageStr);
        await handleMessage(ws, parsed);
      } catch (error) {
        console.error('WebSocket message error:', error);
        // Don't throw, just log and continue
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
      clearInterval(heartbeat);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
      clearInterval(heartbeat);
    });

    // Send initial system status
    sendSystemStatus(ws);
  });

  // Periodically broadcast system metrics (reduced frequency) 
  setInterval(() => {
    try {
      broadcastSystemMetrics();
    } catch (error) {
      console.error('Failed to broadcast system metrics:', error);
    }
  }, 15000); // Every 15 seconds to reduce load
}

async function handleMessage(ws: WebSocket, message: WebSocketMessage) {
  switch (message.type) {
    case 'subscribe_system_status':
      await sendSystemStatus(ws);
      break;
    case 'subscribe_agent_status':
      await sendAgentStatus(ws);
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
}

async function sendSystemStatus(ws: WebSocket) {
  try {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    const metrics = await storage.getLatestSystemMetrics();
    const agents = await storage.getAgents();
    
    const message = JSON.stringify({
      type: 'system_status',
      data: {
        metrics,
        activeAgents: agents.filter(a => a.status === 'active').length,
        totalAgents: agents.length
      }
    });
    
    ws.send(message);
  } catch (error) {
    console.error('Error sending system status:', error);
  }
}

async function sendAgentStatus(ws: WebSocket) {
  try {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    const agents = await storage.getAgents();
    
    const message = JSON.stringify({
      type: 'agent_status',
      data: agents
    });
    
    ws.send(message);
  } catch (error) {
    console.error('Error sending agent status:', error);
  }
}

async function broadcastSystemMetrics() {
  if (clients.size === 0) return;

  try {
    // Generate new metrics
    const process = await import('process');
    const metrics = await storage.createSystemMetrics({
      cpuUsage: Math.round(20 + Math.random() * 60), // 20-80%
      memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
      diskUsage: Math.round(15 + Math.random() * 30), // 15-45%
      networkIO: Math.round(100 + Math.random() * 1000),
      activeAgents: (await storage.getAgents()).filter(a => a.status === 'active').length,
      complianceScore: 95 + Math.round(Math.random() * 5) // 95-100%
    });

    const message = JSON.stringify({
      type: 'system_metrics_update',
      data: metrics
    });

    clients.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      } catch (error) {
        console.error('Error broadcasting message:', error);
        clients.delete(ws);
      }
    });
  } catch (error) {
    console.error('Error broadcasting system metrics:', error);
  }
}

export function broadcastMessage(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  
  clients.forEach(ws => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (error) {
      console.error('Error broadcasting message:', error);
      clients.delete(ws);
    }
  });
}

export function broadcastAgentUpdate(agentId: string, status: string) {
  broadcastMessage('agent_update', { agentId, status });
}

export function broadcastSOPGenerated(sopId: string) {
  broadcastMessage('sop_generated', { sopId });
}

export function broadcastProcessingStatus(status: any) {
  broadcastMessage('processing_status_update', status);
}
