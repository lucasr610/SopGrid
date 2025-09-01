import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Camera, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  Calendar,
  Database,
  FileArchive,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface SystemSnapshot {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  size: string;
  status: 'creating' | 'ready' | 'restoring' | 'error';
  agentStates: number;
  sopCount: number;
  dbVersion: string;
}

export function SystemSnapshots() {
  const [snapshotName, setSnapshotName] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Mock snapshots data - in real implementation, this would come from the backend
  const snapshots: SystemSnapshot[] = [
    {
      id: 'snap-001',
      name: 'Production Baseline',
      description: 'Initial system state with all agents configured',
      timestamp: new Date('2025-08-03T00:00:00Z'),
      size: '2.4 GB',
      status: 'ready',
      agentStates: 8,
      sopCount: 15,
      dbVersion: '1.0.0'
    },
    {
      id: 'snap-002', 
      name: 'Enhanced Agents Release',
      description: 'Lucas Reynolds multi-agent architecture implementation',
      timestamp: new Date('2025-08-03T02:00:00Z'),
      size: '3.1 GB',
      status: 'ready',
      agentStates: 8,
      sopCount: 23,
      dbVersion: '2.0.0'
    },
    {
      id: 'snap-003',
      name: 'Safety Protocol Update',
      description: 'Enhanced OSHA compliance and safety validation',
      timestamp: new Date('2025-08-03T02:30:00Z'),
      size: '3.2 GB', 
      status: 'creating',
      agentStates: 8,
      sopCount: 25,
      dbVersion: '2.1.0'
    }
  ];

  const createSnapshot = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await apiRequest('/api/rotor/save-zip', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/snapshots'] });
      setSnapshotName('');
    },
  });

  const restoreSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      return await apiRequest(`/api/rotor/boot/${snapshotId}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/snapshots'] });
      setSelectedSnapshot(null);
    },
  });

  const deleteSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      return await apiRequest(`/api/snapshots/${snapshotId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/snapshots'] });
    },
  });

  const handleCreateSnapshot = () => {
    if (!snapshotName.trim()) return;
    
    createSnapshot.mutate({
      name: snapshotName,
      description: `System snapshot created on ${new Date().toLocaleString()}`
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'creating': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'restoring': return <RotateCcw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'border-green-500/20 text-green-400';
      case 'creating': return 'border-yellow-500/20 text-yellow-400';
      case 'restoring': return 'border-blue-500/20 text-blue-400';
      case 'error': return 'border-red-500/20 text-red-400';
      default: return 'border-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Snapshot */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-primary" />
            <span>Create System Snapshot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <Input
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="Enter snapshot name..."
              className="flex-1 bg-black/50 border-primary/20 text-white"
            />
            <Button
              onClick={handleCreateSnapshot}
              disabled={!snapshotName.trim() || createSnapshot.isPending}
              className="bg-primary/20 hover:bg-primary/30 border border-primary/20"
            >
              <Camera className="w-4 h-4 mr-2" />
              {createSnapshot.isPending ? 'Creating...' : 'Create Snapshot'}
            </Button>
          </div>
          <p className="text-sm text-gray-400">
            Snapshots capture the complete system state including agent configurations, SOPs, database, and user settings.
          </p>
        </CardContent>
      </Card>

      {/* Snapshot Management */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileArchive className="w-5 h-5 text-primary" />
            <span>System Snapshots</span>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {snapshots.length} snapshots
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {snapshots.map((snapshot) => (
              <Card key={snapshot.id} className={`glass-panel border ${getStatusColor(snapshot.status)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(snapshot.status)}
                        <h3 className="font-semibold text-white">{snapshot.name}</h3>
                        <Badge variant="outline" className={getStatusColor(snapshot.status)}>
                          {snapshot.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">{snapshot.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{snapshot.timestamp.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Database className="w-3 h-3" />
                          <span>{snapshot.size}</span>
                        </div>
                        <div>Agents: {snapshot.agentStates}</div>
                        <div>SOPs: {snapshot.sopCount}</div>
                        <div>DB: v{snapshot.dbVersion}</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {snapshot.status === 'ready' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => restoreSnapshot.mutate(snapshot.id)}
                            disabled={restoreSnapshot.isPending}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/20 text-green-400 hover:bg-green-500/10"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Export
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                            onClick={() => deleteSnapshot.mutate(snapshot.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {snapshot.status === 'creating' && (
                        <div className="text-sm text-yellow-400">Creating snapshot...</div>
                      )}
                      {snapshot.status === 'restoring' && (
                        <div className="text-sm text-blue-400">Restoring system...</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Snapshot */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-primary" />
            <span>Import Snapshot</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-white mb-2">Import System Snapshot</p>
            <p className="text-sm text-gray-400 mb-4">
              Drag and drop a snapshot file or click to browse
            </p>
            <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}