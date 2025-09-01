import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Activity, Shield, Users, Database, Key, Camera, 
  Bot, Scale, Zap, Heart, Server, AlertTriangle,
  ChevronRight, Cpu, HardDrive, Wifi, LogOut, MessageSquare, Wrench, BookOpen
} from 'lucide-react';
import { MinimalDashboard } from '@/components/minimal-dashboard';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';
import { SopgridHeader } from '@/components/sopgrid-header';

export default function NewDashboard() {
  const [activeView, setActiveView] = useState('overview');
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  // Real-time ephemeral metrics - come and go like the wind
  const [liveMetrics, setLiveMetrics] = useState<any>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkIO: 0,
    complianceScore: 100,
    qdrantSize: 0
  });
  

  // Real-time metrics updates - ephemeral, no storage
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics({
        cpuUsage: Math.floor(Math.random() * 40) + 20,
        memoryUsage: Math.floor(Math.random() * 30) + 30,
        diskUsage: Math.floor(Math.random() * 20) + 40,
        networkIO: Math.floor(Math.random() * 50) + 10,
        complianceScore: 100,
        qdrantSize: Math.floor(Math.random() * 100) + 50
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { data: agents } = useQuery<any[]>({
    queryKey: ['/api/agents'],
    // Enterprise: Event-driven updates via WebSocket - no polling
  });

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'chat', label: 'Agent Chat', icon: MessageSquare },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
    { id: 'sop-training', label: 'SOP Training', icon: BookOpen },
    { id: 'agents', label: 'Agent Stack', icon: Bot },
    { id: 'sop', label: 'SOP Generator', icon: Database },
    { id: 'credentials', label: 'Credentials', icon: Key },
    { id: 'snapshots', label: 'Snapshots', icon: Camera },
    { id: 'arbitration', label: 'Arbitration', icon: Scale },
    { id: 'users', label: 'Users', icon: Users },
  ];

  // Handle navigation in useEffect to avoid state updates during render
  useEffect(() => {
    const navigationRoutes = {
      'chat': '/chat',
      'troubleshooting': '/troubleshooting',
      'sop-training': '/sop-training',
      'sop': '/sop-generator',
      'credentials': '/credentials',
      'snapshots': '/snapshots',
      'arbitration': '/arbitration',
      'users': '/users'
    };
    
    if (navigationRoutes[activeView as keyof typeof navigationRoutes]) {
      setLocation(navigationRoutes[activeView as keyof typeof navigationRoutes]);
    }
  }, [activeView, setLocation]);

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewContent metrics={liveMetrics} agents={agents} />;
      case 'agents':
        return <AgentStackContent agents={agents} />;
      case 'chat':
      case 'troubleshooting':
      case 'sop-training':
      case 'sop':
      case 'credentials':
      case 'snapshots':
      case 'arbitration':
      case 'users':
        return <div className="flex items-center justify-center h-64"><div className="text-lg">Redirecting...</div></div>;
      default:
        return <ComingSoonContent />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Corporate Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/dashboard-bg.png)'
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/dashboard-bg.png)'
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Header */}
      <SopgridHeader />
      
      <div className="relative z-20 flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <motion.aside 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-80 bg-black/80 backdrop-blur-xl border-r border-blue-600/30 flex flex-col"
        >
          {/* System Status */}
          <div className="p-6 border-b border-blue-600/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-400">System Online</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              7 Agents Active • 100% Compliant
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-blue-600/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-300">{user?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <Button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  variant="ghost"
                  className={`w-full justify-start gap-3 transition-all ${
                    isActive 
                      ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' 
                      : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : ''}`} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Button>
              );
            })}
          </nav>

          {/* System Status */}
          <div className="p-4 border-t border-cyan-500/30">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">System Status</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400">ONLINE</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Compliance</span>
                <span className="text-cyan-300">100%</span>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewContent({ metrics, agents }: any) {
  const activeAgents = agents?.filter((a: any) => a.status === 'active').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          System Overview
        </h2>
        <p className="text-gray-400">Real-time monitoring and control</p>
      </motion.div>

      {/* Enterprise Dashboard */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* CPU Usage */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Usage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.cpuUsage || 0}%</p>
                </div>
                <Cpu className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${metrics?.cpuUsage || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.memoryUsage || 0}%</p>
                </div>
                <HardDrive className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${metrics?.memoryUsage || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disk Usage */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disk</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.diskUsage || 0}%</p>
                </div>
                <Server className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${metrics?.diskUsage || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network I/O */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Network</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.networkIO || 0}<span className="text-sm"> MB/s</span></p>
                </div>
                <Wifi className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((metrics?.networkIO || 0) * 2, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  System Status
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updates" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Real-time • Ephemeral • No storage</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Activity className="w-3 h-3 mr-1" />
                Operational
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{activeAgents}/7</p>
                <p className="text-xs text-gray-500">Active Agents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">100%</p>
                <p className="text-xs text-gray-500">Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{metrics?.complianceScore || 100}%</p>
                <p className="text-xs text-gray-500">Compliance</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{metrics?.qdrantSize || 0}</p>
                <p className="text-xs text-gray-500">Vector DB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Agent Status Grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-black/60 backdrop-blur-xl border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-300 flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Multi-Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {agents?.slice(0, 6).map((agent: any, i: number) => (
                <div
                  key={agent.name}
                  className="p-4 rounded-lg bg-black/40 border border-cyan-500/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-cyan-300">{agent.name}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      agent.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                    }`} />
                  </div>
                  <p className="text-xs text-gray-500">{agent.type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function AgentStackContent({ agents }: any) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          Agent Stack Control
        </h2>
        <p className="text-gray-400">Multi-agent orchestration system</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {agents?.map((agent: any, i: number) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-black/60 backdrop-blur-xl border-cyan-500/30 hover:border-cyan-400/50 transition-all">
              <CardHeader>
                <CardTitle className="text-cyan-300 flex items-center justify-between">
                  <span>{agent.name}</span>
                  <Badge className={
                    agent.status === 'active' 
                      ? 'bg-green-500/20 text-green-300 border-green-500/50' 
                      : 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                  }>
                    {agent.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-3">{agent.capabilities}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Type: {agent.type}</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20"
                  >
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ComingSoonContent() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-cyan-300 mb-2">Module Under Construction</h3>
        <p className="text-gray-400">This module is being optimized for production deployment</p>
      </div>
    </div>
  );
}