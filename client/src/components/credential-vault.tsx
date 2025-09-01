import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Shield, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink
} from 'lucide-react';

interface Credential {
  id: string;
  name: string;
  type: 'api_key' | 'oauth' | 'database' | 'certificate' | 'ssh_key';
  service: string;
  description: string;
  value: string;
  masked: boolean;
  status: 'connected' | 'not_set' | 'not_connected' | 'error' | 'rotating' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  rotationInterval?: number; // days
  usageCount: number;
  environment: 'development' | 'production' | 'staging';
}

export function CredentialVault() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});
  const [revealedCredentials, setRevealedCredentials] = useState<Set<string>>(new Set());
  const [newCredential, setNewCredential] = useState({
    name: '',
    type: 'api_key' as const,
    service: '',
    description: '',
    value: '',
    environment: 'development' as const
  });
  const queryClient = useQueryClient();

  // Mock credentials data
  const credentials: Credential[] = [
    {
      id: 'cred-001',
      name: 'OpenAI API Key',
      type: 'api_key',
      service: 'OpenAI',
      description: 'GPT-4o API access for SOP generation and validation',
      value: 'sk-proj-***********************************',
      masked: true,
      status: 'active',
      createdAt: new Date('2025-08-01T00:00:00Z'),
      updatedAt: new Date('2025-08-01T00:00:00Z'),
      lastUsed: new Date('2025-08-03T02:00:00Z'),
      usageCount: 247,
      environment: 'production'
    },
    {
      id: 'cred-002',
      name: 'Google Gemini API Key',
      type: 'api_key',
      service: 'Google AI',
      description: 'Gemini 2.5 Pro for compliance analysis and multi-LLM validation',
      value: 'AIza***********************************',
      masked: true,
      status: 'active',
      createdAt: new Date('2025-08-01T00:00:00Z'),
      updatedAt: new Date('2025-08-01T00:00:00Z'),
      lastUsed: new Date('2025-08-03T02:00:00Z'),
      usageCount: 156,
      environment: 'production'
    },
    {
      id: 'cred-003',
      name: 'MongoDB Database',
      type: 'database',
      service: 'MongoDB',
      description: 'MongoDB connection for document storage and vector operations',
      value: 'mongodb://localhost:27017/sopgrid',
      masked: true,
      status: 'active',
      createdAt: new Date('2025-07-30T00:00:00Z'),
      updatedAt: new Date('2025-08-03T02:15:00Z'),
      lastUsed: new Date('2025-08-03T02:15:00Z'),
      usageCount: 1024,
      environment: 'production'
    },
    {
      id: 'cred-004',
      name: 'Qdrant Vector Database',
      type: 'database',
      service: 'Qdrant',
      description: 'Vector database for document embeddings and similarity search',
      value: 'http://localhost:6333',
      masked: true,
      status: 'active',
      createdAt: new Date('2025-08-02T00:00:00Z'),
      updatedAt: new Date('2025-08-03T01:30:00Z'),
      lastUsed: new Date('2025-08-03T01:30:00Z'),
      usageCount: 89,
      environment: 'production'
    },
    {
      id: 'cred-005',
      name: 'Neon Database URL',
      type: 'database',
      service: 'Neon',
      description: 'PostgreSQL database connection for persistent storage',
      value: 'postgresql://user:pass@ep-********.us-east-1.aws.neon.tech/dbname',
      masked: true,
      status: 'active',
      createdAt: new Date('2025-07-30T00:00:00Z'),
      updatedAt: new Date('2025-07-30T00:00:00Z'),
      lastUsed: new Date('2025-08-03T02:15:00Z'),
      usageCount: 1024,
      environment: 'production'
    }
  ];

  const addCredential = useMutation({
    mutationFn: async (data: typeof newCredential) => {
      return await apiRequest('/api/credentials', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      setShowAddForm(false);
      setNewCredential({
        name: '',
        type: 'api_key',
        service: '',
        description: '',
        value: '',
        environment: 'development'
      });
    },
  });

  const updateCredential = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Credential> }) => {
      return await apiRequest(`/api/credentials/${data.id}`, 'PATCH', data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      setEditingCredential(null);
    },
  });

  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/credentials/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
    },
  });

  const rotateCredential = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/credentials/${id}/rotate`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
    },
  });

  const toggleReveal = (credentialId: string) => {
    const newRevealed = new Set(revealedCredentials);
    if (newRevealed.has(credentialId)) {
      newRevealed.delete(credentialId);
    } else {
      newRevealed.add(credentialId);
    }
    setRevealedCredentials(newRevealed);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleAddCredential = () => {
    if (!newCredential.name || !newCredential.service || !newCredential.value) return;
    addCredential.mutate(newCredential);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'not_set': return <AlertTriangle className="w-4 h-4 text-gray-400" />;
      case 'not_connected': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'rotating': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'disabled': return <Lock className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'border-green-500/20 text-green-400';
      case 'not_set': return 'border-gray-500/20 text-gray-400';
      case 'not_connected': return 'border-red-500/20 text-red-400';
      case 'error': return 'border-red-500/20 text-red-400';
      case 'rotating': return 'border-yellow-500/20 text-yellow-400';
      case 'disabled': return 'border-gray-500/20 text-gray-400';
      default: return 'border-gray-500/20 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api_key': return <Key className="w-4 h-4" />;
      case 'oauth': return <ExternalLink className="w-4 h-4" />;
      case 'database': return <Shield className="w-4 h-4" />;
      case 'certificate': return <Lock className="w-4 h-4" />;
      case 'ssh_key': return <Key className="w-4 h-4" />;
      default: return <Key className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Credential Vault</span>
              <Badge variant="outline" className="border-primary/20 text-primary">
                {credentials.length} credentials
              </Badge>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary/20 hover:bg-primary/30 border border-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Credential
            </Button>
          </CardTitle>
        </CardHeader>
        {showAddForm && (
          <CardContent className="border-t border-primary/20 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                value={newCredential.name}
                onChange={(e) => setNewCredential({...newCredential, name: e.target.value})}
                placeholder="Credential name..."
                className="bg-black/50 border-primary/20 text-white"
              />
              <Select
                value={newCredential.type}
                onValueChange={(value) => setNewCredential({...newCredential, type: value as any})}
              >
                <SelectTrigger className="bg-black/50 border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="oauth">OAuth Token</SelectItem>
                  <SelectItem value="database">Database URL</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="ssh_key">SSH Key</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newCredential.service}
                onChange={(e) => setNewCredential({...newCredential, service: e.target.value})}
                placeholder="Service name..."
                className="bg-black/50 border-primary/20 text-white"
              />
              <Select
                value={newCredential.environment}
                onValueChange={(value) => setNewCredential({...newCredential, environment: value as any})}
              >
                <SelectTrigger className="bg-black/50 border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 space-y-4">
              <Textarea
                value={newCredential.description}
                onChange={(e) => setNewCredential({...newCredential, description: e.target.value})}
                placeholder="Description..."
                className="bg-black/50 border-primary/20 text-white"
              />
              <Textarea
                value={newCredential.value}
                onChange={(e) => setNewCredential({...newCredential, value: e.target.value})}
                placeholder="Credential value (will be encrypted)..."
                className="bg-black/50 border-primary/20 text-white font-mono"
              />
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddCredential}
                  disabled={addCredential.isPending}
                  className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/20 text-green-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credential
                </Button>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="border-gray-500/20 text-gray-400"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Credentials List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {credentials.map((credential) => (
          <Card key={credential.id} className={`glass-panel border ${getStatusColor(credential.status)}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(credential.type)}
                  <div>
                    <h3 className="font-semibold text-white">{credential.name}</h3>
                    <p className="text-sm text-gray-400">{credential.service}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(credential.status)}
                  <Badge variant="outline" className={getStatusColor(credential.status)}>
                    {credential.status === 'connected' ? '✓ Connected' : 
                     credential.status === 'not_set' ? '⚠ Not Set' :
                     credential.status === 'not_connected' ? '✗ Not Connected' :
                     credential.status === 'error' ? '✗ Error' : credential.status}
                  </Badge>
                  <Badge variant="outline" className="border-primary/20 text-primary text-xs">
                    {credential.environment}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4">{credential.description}</p>

              {/* Credential Value */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {editingCredentials.has(credential.id) ? (
                    <Input
                      value={editValues[credential.id] || credential.value}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [credential.id]: e.target.value }))}
                      type={revealedCredentials.has(credential.id) ? 'text' : 'password'}
                      className="flex-1 bg-black/50 border-primary/20 font-mono text-sm text-white"
                    />
                  ) : (
                    <div className="flex-1 p-3 bg-black/50 rounded border border-primary/20 font-mono text-sm">
                      {revealedCredentials.has(credential.id) ? credential.value : credential.value}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleReveal(credential.id)}
                    className="border-primary/20"
                  >
                    {revealedCredentials.has(credential.id) ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credential.value)}
                    className="border-primary/20"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <span>Created:</span>
                    <p className="text-gray-400">{credential.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span>Last Used:</span>
                    <p className="text-gray-400">
                      {credential.lastUsed ? credential.lastUsed.toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <span>Usage Count:</span>
                    <p className="text-gray-400">{credential.usageCount}</p>
                  </div>
                  {credential.expiresAt && (
                    <div>
                      <span>Expires:</span>
                      <p className={credential.status === 'expired' ? 'text-red-400' : 'text-gray-400'}>
                        {credential.expiresAt.toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className={editingCredentials.has(credential.id) 
                    ? "border-green-500/20 text-green-400 hover:bg-green-500/10"
                    : "border-blue-500/20 text-blue-400 hover:bg-blue-500/10"}
                  onClick={() => {
                    const newEditing = new Set(editingCredentials);
                    if (newEditing.has(credential.id)) {
                      // Save changes
                      if (editValues[credential.id]) {
                        updateCredential.mutate({
                          id: credential.id,
                          updates: { value: editValues[credential.id] }
                        });
                      }
                      newEditing.delete(credential.id);
                    } else {
                      newEditing.add(credential.id);
                      setEditValues(prev => ({ ...prev, [credential.id]: credential.value }));
                    }
                    setEditingCredentials(newEditing);
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  {editingCredentials.has(credential.id) ? 'Save' : 'Edit'}
                </Button>
                {credential.type === 'api_key' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                    onClick={() => rotateCredential.mutate(credential.id)}
                    disabled={rotateCredential.isPending}
                  >
                    <Unlock className="w-3 h-3 mr-1" />
                    Rotate
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                  onClick={() => deleteCredential.mutate(credential.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Notice */}
      <Card className="glass-panel border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-400 mb-2">Security Notice</h3>
              <p className="text-sm text-gray-300">
                All credentials are encrypted at rest using AES-256 encryption. Access is logged and monitored. 
                Rotate credentials regularly and never share them via insecure channels. Production credentials 
                require additional security clearance for access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}