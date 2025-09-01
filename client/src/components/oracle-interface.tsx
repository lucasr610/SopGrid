import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Triangle, Shield, FileText, Database, Key, Activity, Camera, Bot, Scale, Zap, Users } from 'lucide-react';
import { Link } from 'wouter';

interface OracleInterfaceProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export function OracleInterface({ onNavigate, activeSection }: OracleInterfaceProps) {
  const [godModeActive, setGodModeActive] = useState(true);

  const navigationItems = [
    { id: 'nexus', label: 'Multi-Agent Nexus', icon: Triangle, category: 'Core Systems' },
    { id: 'compliance', label: 'Compliance Monitor', icon: Shield, category: 'Core Systems' },
    { id: 'sop', label: 'SOP Generator', icon: FileText, category: 'Core Systems' },
    { id: 'vectorizer', label: 'Document Vectorizer', icon: Database, category: 'Core Systems' },
    { id: 'users', label: 'User Management', icon: Users, category: 'Management', isLink: true },
    { id: 'credentials', label: 'Credential Vault', icon: Key, category: 'Management' },
    { id: 'health', label: 'System Health', icon: Activity, category: 'Management' },
    { id: 'snapshots', label: 'System Snapshots', icon: Camera, category: 'Management' },
    { id: 'agents', label: 'Agent Stack', icon: Bot, category: 'Agents' },
    { id: 'arbitration', label: 'Arbitration Engine', icon: Scale, category: 'Agents' },
    { id: 'god-mode', label: 'GOD MODE', icon: Zap, category: 'Control' },
  ];

  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof navigationItems>);

  return (
    <aside className="w-80 glass-panel border-r border-primary/30 flex flex-col relative z-20">
      {/* SOPGRID Logo Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.5)]">
              <span className="flex items-center justify-center h-full text-white text-2xl font-bold">S</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg blur-xl opacity-50"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">SOPGRID</h1>
            <p className="text-xs text-cyan-400/70">Universal Knowledge OS</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {category}
            </h3>
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                if (item.isLink) {
                  return (
                    <Link key={item.id} to={`/${item.id}`}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-3 transition-all duration-300 relative overflow-hidden hover:bg-primary/10 hover:text-primary hover:border-primary/50 border-transparent"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Button>
                    </Link>
                  );
                }
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start space-x-3 transition-all duration-300 relative overflow-hidden ${
                      isActive 
                        ? 'cyber-button border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]' 
                        : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50 border-transparent'
                    }`}
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      {/* God Mode Status */}
      <div className="p-4 border-t border-primary/20">
        <Card className="glass-panel">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">GOD MODE</span>
              <div className={`w-3 h-3 rounded-full ${
                godModeActive ? 'bg-green-400 animate-pulse-slow' : 'bg-red-400'
              }`}></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {godModeActive ? 'Self-healing active' : 'Manual mode'}
            </p>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
