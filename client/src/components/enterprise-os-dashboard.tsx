import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Activity, 
  Cpu, 
  HardDrive, 
  Workflow,
  Building,
  Shield,
  Zap,
  Settings,
  Monitor
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface OSComponent {
  id: string;
  name: string;
  type: 'service' | 'ui' | 'integration' | 'driver';
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid?: number;
  dependencies: string[];
}

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: { sent: number; received: number };
  process_count: number;
  uptime: number;
}

interface SystemStatus {
  overlay_status: string;
  uptime: number;
  platform: string;
  arch: string;
  components: OSComponent[];
  metrics: SystemMetrics;
  performance: {
    components_running: number;
    components_total: number;
    memory_footprint: string;
    cpu_efficiency: number;
  };
}

interface EnterpriseWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  created_at: string;
  updated_at: string;
}

export function EnterpriseOSDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [workflows, setWorkflows] = useState<EnterpriseWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemStatus();
    fetchWorkflows();
    
    // Update every 5 seconds
    const interval = setInterval(() => {
      fetchSystemStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await apiRequest('/api/os-overlay/status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data.system);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const response = await apiRequest('/api/enterprise/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const startComponent = async (componentId: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/os-overlay/components/${componentId}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "Component Started",
          description: `Successfully started ${componentId}`,
        });
        await fetchSystemStatus();
      } else {
        throw new Error('Failed to start component');
      }
    } catch (error) {
      toast({
        title: "Start Failed",
        description: `Failed to start component ${componentId}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopComponent = async (componentId: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/os-overlay/components/${componentId}/stop`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "Component Stopped",
          description: `Successfully stopped ${componentId}`,
        });
        await fetchSystemStatus();
      } else {
        throw new Error('Failed to stop component');
      }
    } catch (error) {
      toast({
        title: "Stop Failed",
        description: `Failed to stop component ${componentId}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restartOverlay = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/os-overlay/restart', {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "System Restarted",
          description: "SOPGRID Cognitive OS Overlay restarted successfully",
        });
        setTimeout(fetchSystemStatus, 3000); // Wait 3 seconds before refreshing
      } else {
        throw new Error('Failed to restart overlay');
      }
    } catch (error) {
      toast({
        title: "Restart Failed",
        description: "Failed to restart OS overlay",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/enterprise/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: {} })
      });

      if (response.ok) {
        toast({
          title: "Workflow Started",
          description: `Enterprise workflow ${workflowId} is now running`,
        });
        await fetchWorkflows();
      } else {
        throw new Error('Failed to execute workflow');
      }
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: `Failed to execute workflow ${workflowId}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': case 'active': case 'completed': return 'bg-green-500';
      case 'starting': case 'pending': return 'bg-yellow-500';
      case 'stopped': case 'paused': case 'draft': return 'bg-gray-500';
      case 'error': case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'service': return <Building className="h-4 w-4" />;
      case 'ui': return <Monitor className="h-4 w-4" />;
      case 'integration': return <Workflow className="h-4 w-4" />;
      case 'driver': return <Cpu className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (!systemStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-400" />
          <p className="text-gray-400">Loading Enterprise OS Overlay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">SOPGRID Cognitive OS</h2>
          <p className="text-gray-400">Enterprise-grade operating system overlay</p>
          <div className="flex items-center space-x-4 mt-2">
            <Badge className="bg-green-500 text-white">
              {systemStatus.overlay_status}
            </Badge>
            <span className="text-sm text-gray-400">
              Platform: {systemStatus.platform} {systemStatus.arch}
            </span>
            <span className="text-sm text-gray-400">
              Uptime: {Math.floor(systemStatus.uptime / 60)}m
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={restartOverlay}
            disabled={loading}
            variant="outline"
            className="border-cyan-500 hover:bg-cyan-600/20"
            data-testid="button-restart-overlay"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Overlay
          </Button>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-cyan-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemStatus.metrics.cpu_usage.toFixed(1)}%
            </div>
            <Progress 
              value={systemStatus.metrics.cpu_usage} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-cyan-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Memory</CardTitle>
            <Activity className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemStatus.metrics.memory_usage.toFixed(1)}%
            </div>
            <Progress 
              value={systemStatus.metrics.memory_usage} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-cyan-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemStatus.metrics.disk_usage.toFixed(1)}%
            </div>
            <Progress 
              value={systemStatus.metrics.disk_usage} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-cyan-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Components</CardTitle>
            <Shield className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemStatus.performance.components_running}/{systemStatus.performance.components_total}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {systemStatus.performance.memory_footprint} footprint
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-900/50">
          <TabsTrigger value="components">OS Components</TabsTrigger>
          <TabsTrigger value="workflows">Enterprise Workflows</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {systemStatus.components.map((component) => (
              <Card key={component.id} className="bg-gray-900/50 border-cyan-500/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center space-x-3">
                    {getComponentIcon(component.type)}
                    <div>
                      <CardTitle className="text-white text-sm">{component.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {component.type} component
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getStatusColor(component.status)} text-white text-xs`}>
                      {component.status}
                    </Badge>
                    {component.pid && (
                      <span className="text-xs text-gray-400">PID: {component.pid}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {component.dependencies.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Dependencies:</p>
                      <div className="flex flex-wrap gap-1">
                        {component.dependencies.map((dep, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    {component.status === 'stopped' || component.status === 'error' ? (
                      <Button
                        onClick={() => startComponent(component.id)}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-start-${component.id}`}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Start
                      </Button>
                    ) : (
                      <Button
                        onClick={() => stopComponent(component.id)}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                        className="border-red-500 hover:bg-red-600/20"
                        data-testid={`button-stop-${component.id}`}
                      >
                        <Square className="mr-1 h-3 w-3" />
                        Stop
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="bg-gray-900/50 border-cyan-500/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-white text-sm">{workflow.name}</CardTitle>
                    <CardDescription>{workflow.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getPriorityColor(workflow.priority)} text-white text-xs`}>
                      {workflow.priority}
                    </Badge>
                    <Badge className={`${getStatusColor(workflow.status)} text-white text-xs`}>
                      {workflow.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">Progress</span>
                      <span className="text-xs text-gray-400">{workflow.progress}%</span>
                    </div>
                    <Progress value={workflow.progress} className="h-2" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Created: {new Date(workflow.created_at).toLocaleDateString()}</span>
                    <span>Updated: {new Date(workflow.updated_at).toLocaleDateString()}</span>
                  </div>
                  {(workflow.status === 'draft' || workflow.status === 'paused') && (
                    <Button
                      onClick={() => executeWorkflow(workflow.id)}
                      disabled={loading}
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      data-testid={`button-execute-${workflow.id}`}
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      Execute
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900/50 border-cyan-500/50">
              <CardHeader>
                <CardTitle className="text-cyan-400">System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">CPU Efficiency</span>
                    <span className="text-white font-semibold">
                      {systemStatus.performance.cpu_efficiency}%
                    </span>
                  </div>
                  <Progress value={systemStatus.performance.cpu_efficiency} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Memory Footprint</span>
                    <span className="text-white">{systemStatus.performance.memory_footprint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Process Count</span>
                    <span className="text-white">{systemStatus.metrics.process_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network I/O</span>
                    <span className="text-white text-xs">
                      ↑{(systemStatus.metrics.network_io.sent / 1024).toFixed(1)}KB 
                      ↓{(systemStatus.metrics.network_io.received / 1024).toFixed(1)}KB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-cyan-500/50">
              <CardHeader>
                <CardTitle className="text-cyan-400">Enterprise Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">IBM-Style BPM</span>
                  <Badge className="bg-green-500 text-white">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Multi-LLM Orchestration</span>
                  <Badge className="bg-green-500 text-white">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">OS Integration Layer</span>
                  <Badge className="bg-green-500 text-white">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Enterprise Security</span>
                  <Badge className="bg-green-500 text-white">Enforced</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Performance Monitoring</span>
                  <Badge className="bg-green-500 text-white">Real-time</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}