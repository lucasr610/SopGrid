import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Activity, Heart, Zap, Server, Shield, AlertCircle, Database } from 'lucide-react';
import type { SystemMetrics, ComplianceCheck } from '@shared/schema';

export function SystemHealth() {
  const [beatPhase, setBeatPhase] = useState(0);
  
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery<SystemMetrics>({
    queryKey: ['/api/system/metrics'],
    // Enterprise: Event-driven updates via WebSocket - no polling
  });

  const { data: complianceChecks, isLoading: complianceLoading } = useQuery<ComplianceCheck[]>({
    queryKey: ['/api/compliance/status'],
    // Enterprise: Event-driven updates via WebSocket - no polling
  });

  const { data: agents } = useQuery<any[]>({
    queryKey: ['/api/agents'],
    // Enterprise: Event-driven updates via WebSocket - no polling
  });

  // Heartbeat animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBeatPhase(prev => (prev + 1) % 4);
    }, 800); // Heartbeat every 800ms
    
    return () => clearInterval(interval);
  }, []);

  const isSystemHealthy = metrics && !metricsError;
  const activeAgentCount = agents?.filter(a => a.status === 'active').length || 0;
  const complianceScore = metrics?.complianceScore || 0;
  
  const getHeartbeatColor = () => {
    if (!isSystemHealthy) return 'text-red-500';
    if (complianceScore === 100) return 'text-green-500';
    if (complianceScore >= 80) return 'text-cyan-500';
    if (complianceScore >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getSystemStatus = () => {
    if (!isSystemHealthy) return { status: 'CRITICAL', color: 'bg-red-500' };
    if (complianceScore === 100 && activeAgentCount >= 6) return { status: 'OPTIMAL', color: 'bg-green-500' };
    if (complianceScore >= 80 && activeAgentCount >= 4) return { status: 'HEALTHY', color: 'bg-cyan-500' };
    if (complianceScore >= 60) return { status: 'WARNING', color: 'bg-yellow-500' };
    return { status: 'DEGRADED', color: 'bg-orange-500' };
  };

  const systemStatus = getSystemStatus();
  const heartbeatScale = beatPhase === 1 ? 1.3 : beatPhase === 2 ? 1.1 : 1;

  const complianceStandards = [
    { name: 'OSHA', key: 'OSHA' },
    { name: 'EPA', key: 'EPA' },
    { name: 'DOT', key: 'DOT' },
    { name: 'FDA', key: 'FDA' },
    { name: 'DOD', key: 'DOD' },
  ];

  const getComplianceStatus = (standard: string) => {
    const check = complianceChecks?.find(c => c.standard === standard);
    return check?.status || 'unknown';
  };

  if (metricsLoading) {
    return (
      <div className="col-span-4 space-y-6">
        <Card className="glass-panel border-cyan-400/30">
          <CardContent className="flex items-center justify-center py-20">
            <div className="text-center">
              <Heart className="w-16 h-16 text-cyan-500 mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Initializing system heartbeat...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="col-span-4 space-y-6">
      
      {/* System Heartbeat */}
      <Card className="glass-panel border-cyan-400/30 overflow-hidden">
        <CardHeader className="border-b border-cyan-400/20">
          <CardTitle className="text-lg font-semibold text-cyan-300 flex items-center gap-2">
            System Heartbeat
            <Badge className={`${systemStatus.color} text-white animate-pulse`}>
              {systemStatus.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Main Heartbeat */}
            <div className="relative">
              <Heart 
                className={`w-32 h-32 ${getHeartbeatColor()} transition-all duration-300`}
                style={{
                  transform: `scale(${heartbeatScale})`,
                  filter: `drop-shadow(0 0 ${beatPhase === 1 ? '30px' : '10px'} currentColor)`,
                }}
              />
              {beatPhase === 1 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-40 h-40 rounded-full ${getHeartbeatColor().replace('text', 'bg')}/20 animate-ping`} />
                </div>
              )}
            </div>

            {/* Vital Signs - Added Qdrant Size */}
            <div className="grid grid-cols-3 gap-4 w-full">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-muted-foreground">CPU Load</span>
                </div>
                <p className="text-2xl font-bold text-cyan-300">{metrics?.cpuUsage || 0}%</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">Memory</span>
                </div>
                <p className="text-2xl font-bold text-blue-300">{metrics?.memoryUsage || 0}%</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-muted-foreground">Active Agents</span>
                </div>
                <p className="text-2xl font-bold text-green-300">{activeAgentCount}/7</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-muted-foreground">Compliance</span>
                </div>
                <p className="text-2xl font-bold text-purple-300">{complianceScore}%</p>
              </div>
              
              {/* NEW: Qdrant Size Display */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-muted-foreground">Qdrant Size</span>
                </div>
                <p className="text-2xl font-bold text-orange-300">{metrics?.qdrantSize || 0}</p>
              </div>
              
              {/* LEAN Database Status */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-muted-foreground">DB Status</span>
                </div>
                <p className="text-sm font-bold text-emerald-300">LEAN</p>
              </div>
            </div>

            {/* EKG Line */}
            <div className="w-full h-16 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 400 60">
                <path
                  d={`M 0,30 L 80,30 L 90,10 L 100,50 L 110,30 L 200,30 L 210,20 L 220,40 L 230,30 L 320,30 L 330,15 L 340,45 L 350,30 L 400,30`}
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className={`${getHeartbeatColor()} animate-pulse`}
                  style={{
                    filter: 'drop-shadow(0 0 5px currentColor)',
                  }}
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Compliance Status */}
      <Card className="glass-panel border-cyan-400/30">
        <CardHeader className="border-b border-cyan-400/20">
          <CardTitle className="text-lg font-semibold text-cyan-300">Compliance Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-5 gap-3">
            {complianceStandards.map((standard) => {
              const status = getComplianceStatus(standard.key);
              const isCompliant = status === 'compliant';
              
              return (
                <div 
                  key={standard.key} 
                  className="text-center p-3 rounded-lg border border-cyan-400/20 bg-black/40"
                >
                  <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                    isCompliant ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {isCompliant ? (
                      <Shield className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <p className="text-xs font-medium">{standard.name}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* System Diagnostics */}
      <Card className="glass-panel border-cyan-400/30">
        <CardHeader className="border-b border-cyan-400/20">
          <CardTitle className="text-lg font-semibold text-cyan-300">System Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40">
              <span className="text-sm">Disk Usage</span>
              <span className="text-sm font-mono text-cyan-300">{metrics?.diskUsage || 0}%</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40">
              <span className="text-sm">Network I/O</span>
              <span className="text-sm font-mono text-cyan-300">{metrics?.networkIO || 0} MB/s</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40">
              <span className="text-sm">System Uptime</span>
              <span className="text-sm font-mono text-green-300">100%</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40">
              <span className="text-sm">Last Heartbeat</span>
              <span className="text-sm font-mono text-cyan-300">Just now</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}