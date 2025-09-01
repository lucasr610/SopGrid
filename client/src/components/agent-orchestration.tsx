import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Plus, Triangle } from 'lucide-react';
import type { Agent } from '@shared/schema';

export function AgentOrchestration() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const agentTypes = [
    // Top Row
    { id: 'compliance', name: 'Compliance', color: 'bg-green-400', position: { top: '10%', left: '50%', transform: 'translateX(-50%)' } },
    
    // Middle Row
    { id: 'scraper', name: 'Scraper', color: 'bg-yellow-400', position: { top: '35%', left: '20%' } },
    { id: 'arbitrator', name: 'Arbitrator', color: 'bg-orange-400', position: { top: '35%', right: '20%' } },
    
    // Bottom Row
    { id: 'sop-generator', name: 'SOP Gen', color: 'bg-blue-400', position: { bottom: '10%', left: '15%' } },
    { id: 'vectorizer', name: 'Vector', color: 'bg-cyan-400', position: { bottom: '10%', left: '50%', transform: 'translateX(-50%)' } },
    { id: 'validator', name: 'Validator', color: 'bg-purple-400', position: { bottom: '10%', right: '15%' } },
  ];

  const getAgentStatus = (type: string) => {
    const agent = agents?.find(a => a.type === type);
    return agent?.status || 'inactive';
  };

  const getAgentConfig = (type: string) => {
    const agent = agents?.find(a => a.type === type);
    return agent?.config as any || {};
  };

  if (isLoading) {
    return (
      <div className="col-span-8 glass-panel p-6 rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-96 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <Card className="col-span-8 glass-panel border-cyan-400/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold holographic">Agent Orchestration Matrix</CardTitle>
          <Button variant="default" className="shadow-[0_0_30px_rgba(6,182,212,0.5)]">
            <Plus className="w-4 h-4 mr-2" />
            Deploy Agent
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Clean Agent Stack Layout */}
        <div className="relative h-[500px] bg-black/40 rounded-xl p-4">
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {/* Top to Center */}
            <line x1="50%" y1="15%" x2="50%" y2="45%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="2" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </line>
            {/* Left Middle to Center */}
            <line x1="20%" y1="40%" x2="45%" y2="50%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="2" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </line>
            {/* Right Middle to Center */}
            <line x1="80%" y1="40%" x2="55%" y2="50%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="2" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </line>
            {/* Bottom Left to Center */}
            <line x1="15%" y1="85%" x2="45%" y2="55%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="2" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </line>
            {/* Bottom Center to Center */}
            <line x1="50%" y1="85%" x2="50%" y2="55%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="2" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </line>
            {/* Bottom Right to Center */}
            <line x1="85%" y1="85%" x2="55%" y2="55%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="2" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </line>
          </svg>

          {/* Central Rotor */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-32 h-32 relative bg-black/80 rounded-full p-4 border-2 border-purple-500/50 shadow-[0_0_30px_rgba(147,51,234,0.5)]">
              <div className="w-full h-full relative">
                <div className="absolute inset-0 triangle-clip bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 animate-spin-slow"></div>
                <div className="absolute inset-0 triangle-clip bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 blur-xl opacity-60"></div>
              </div>
            </div>
            <p className="text-sm text-center mt-4 text-purple-300 font-bold">ROTOR CORE</p>
            <p className="text-xs text-center text-purple-300/60">Orchestrator</p>
          </div>
          
          {/* Agent Nodes in Triangular Formation */}
          {agentTypes.map((agentType) => {
            const status = getAgentStatus(agentType.id);
            const config = getAgentConfig(agentType.id);
            const isSelected = selectedAgent === agentType.id;
            
            return (
              <div
                key={agentType.id}
                className={`absolute bg-black/80 backdrop-blur-md p-4 rounded-xl border-2 cursor-pointer transition-all min-w-[120px] ${
                  isSelected ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105' : 'border-cyan-400/30 hover:border-cyan-400/60'
                }`}
                style={agentType.position}
                onClick={() => setSelectedAgent(isSelected ? null : agentType.id)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`w-12 h-12 ${agentType.color} rounded-full flex items-center justify-center ${
                    status === 'active' ? 'animate-pulse shadow-lg' : status === 'processing' ? 'animate-pulse-slow' : ''
                  }`}>
                    <div className="w-6 h-6 bg-white/20 rounded-full"></div>
                  </div>
                  <p className="text-sm font-semibold text-white">{agentType.name}</p>
                  <Badge 
                    variant={status === 'active' ? 'default' : 'secondary'}
                    className={`text-xs px-2 py-0.5 ${
                      status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/50' : 
                      status === 'processing' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 
                      'bg-gray-500/20 text-gray-300 border-gray-500/50'
                    }`}
                  >
                    {status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Agent Details Panel */}
        {selectedAgent && (
          <div className="mt-6 glass-panel p-4 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">
                {agentTypes.find(a => a.id === selectedAgent)?.name} Agent Details
              </h4>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{getAgentStatus(selectedAgent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Heartbeat</p>
                <p className="font-medium">2 minutes ago</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tasks Completed</p>
                <p className="font-medium">1,247</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
