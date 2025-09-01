import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { 
  Key, Database, Cloud, Shield, Plus, Edit, Trash2, 
  ChevronLeft, Eye, EyeOff, Copy, Check
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SopgridHeader } from '@/components/sopgrid-header';

interface Credential {
  id: string;
  name: string;
  type: 'api' | 'database' | 'oauth' | 'certificate';
  value: string;
  lastUpdated: string;
  status: 'connected' | 'not_set' | 'not_connected' | 'error' | 'pending';
}

export function CredentialsVault() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'api',
    value: ''
  });

  const { data: credentials } = useQuery<Credential[]>({
    queryKey: ['/api/credentials'],
    // Enterprise: No polling - event-driven updates // Refresh every 30 seconds to get real status
    initialData: []
  });

  const addCredential = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add credential');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      setIsAddDialogOpen(false);
      setFormData({ name: '', type: 'api', value: '' });
      toast({
        title: 'Credential Added',
        description: 'New credential has been securely stored.',
      });
    }
  });

  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/credentials/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete credential');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      toast({
        title: 'Credential Deleted',
        description: 'Credential has been removed from the vault.',
      });
    }
  });

  const copyToClipboard = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Copied',
      description: 'Credential copied to clipboard',
    });
  };

  const credentialTypes = {
    api: { icon: Key, color: 'text-cyan-400' },
    database: { icon: Database, color: 'text-blue-400' },
    oauth: { icon: Cloud, color: 'text-purple-400' },
    certificate: { icon: Shield, color: 'text-green-400' }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Corporate Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/vault-bg.png)'
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Header */}
      <SopgridHeader />

      <div className="relative z-20 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Key className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Credentials Vault
                </h1>
                <p className="text-gray-400">Secure storage for API keys and secrets</p>
              </div>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credential
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-black/90 backdrop-blur-md border-cyan-500/30 text-white">
                <DialogHeader>
                  <DialogTitle className="text-cyan-300">Add New Credential</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-cyan-300">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-transparent border-cyan-500/50 text-white"
                      placeholder="e.g., OpenAI API Key"
                    />
                  </div>
                  <div>
                    <Label className="text-cyan-300">Type</Label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-transparent border border-cyan-500/50 text-white rounded-md p-2"
                    >
                      <option value="api">API Key</option>
                      <option value="database">Database</option>
                      <option value="oauth">OAuth Token</option>
                      <option value="certificate">Certificate</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-cyan-300">Value</Label>
                    <Input
                      type="password"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="bg-transparent border-cyan-500/50 text-white"
                      placeholder="Enter secret value"
                    />
                  </div>
                  <Button
                    onClick={() => addCredential.mutate(formData)}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                    disabled={addCredential.isPending}
                  >
                    Add Credential
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-transparent border border-cyan-500/30">
            <TabsTrigger value="all" className="data-[state=active]:bg-cyan-500/20">All Credentials</TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-cyan-500/20">API Keys</TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-cyan-500/20">Databases</TabsTrigger>
            <TabsTrigger value="oauth" className="data-[state=active]:bg-cyan-500/20">OAuth</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {credentials?.map((credential, index) => {
                const TypeIcon = credentialTypes[credential.type as keyof typeof credentialTypes].icon;
                const colorClass = credentialTypes[credential.type as keyof typeof credentialTypes].color;
                
                return (
                  <motion.div
                    key={credential.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-transparent backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/50 transition-all">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TypeIcon className={`w-5 h-5 ${colorClass}`} />
                            <span className="text-cyan-300 text-sm">{credential.name}</span>
                          </div>
                          <Badge className={
                            credential.status === 'connected'
                              ? 'bg-green-500/20 text-green-300 border-green-500/50'
                              : credential.status === 'not_set'
                              ? 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                              : credential.status === 'not_connected'
                              ? 'bg-red-500/20 text-red-300 border-red-500/50'
                              : credential.status === 'error'
                              ? 'bg-red-500/20 text-red-300 border-red-500/50'
                              : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                          }>
                            {credential.status === 'connected' ? '✓ Connected' : 
                             credential.status === 'not_set' ? '⚠ Not Set' :
                             credential.status === 'not_connected' ? '✗ Not Connected' :
                             credential.status === 'error' ? '✗ Error' : credential.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Input
                              type={showValues[credential.id] ? 'text' : 'password'}
                              value={editingCredential === credential.id ? (editValues[credential.id] || credential.value) : credential.value}
                              readOnly={editingCredential !== credential.id}
                              onChange={(e) => editingCredential === credential.id && setEditValues(prev => ({ ...prev, [credential.id]: e.target.value }))}
                              className="bg-transparent border-cyan-500/50 text-white flex-1 mr-2"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowValues(prev => ({ ...prev, [credential.id]: !prev[credential.id] }))}
                                className="text-cyan-300 hover:bg-cyan-500/20"
                              >
                                {showValues[credential.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(credential.value, credential.id)}
                                className="text-cyan-300 hover:bg-cyan-500/20"
                              >
                                {copiedId === credential.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (editingCredential === credential.id) {
                                    // Save changes
                                    if (editValues[credential.id]) {
                                      // Here you would call updateCredential API
                                      console.log('Saving credential:', credential.id, editValues[credential.id]);
                                    }
                                    setEditingCredential(null);
                                  } else {
                                    setEditingCredential(credential.id);
                                    setEditValues(prev => ({ ...prev, [credential.id]: credential.value }));
                                  }
                                }}
                                className="text-green-400 hover:bg-green-500/20"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Delete ${credential.name}?`)) {
                                    deleteCredential.mutate(credential.id);
                                  }
                                }}
                                className="text-red-400 hover:bg-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Last updated: {credential.lastUpdated}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {['api', 'database', 'oauth'].map(type => (
            <TabsContent key={type} value={type}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {credentials?.filter(c => c.type === type).map((credential, index) => {
                  const TypeIcon = credentialTypes[credential.type as keyof typeof credentialTypes].icon;
                  const colorClass = credentialTypes[credential.type as keyof typeof credentialTypes].color;
                  
                  return (
                    <motion.div
                      key={credential.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-transparent backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/50 transition-all">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TypeIcon className={`w-5 h-5 ${colorClass}`} />
                              <span className="text-cyan-300 text-sm">{credential.name}</span>
                            </div>
                            <Badge className={
                              credential.status === 'connected'
                                ? 'bg-green-500/20 text-green-300 border-green-500/50'
                                : credential.status === 'not_set'
                                ? 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                                : credential.status === 'not_connected'
                                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                                : credential.status === 'error'
                                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                            }>
                              {credential.status === 'connected' ? '✓ Connected' : 
                               credential.status === 'not_set' ? '⚠ Not Set' :
                               credential.status === 'not_connected' ? '✗ Not Connected' :
                               credential.status === 'error' ? '✗ Error' : credential.status}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Input
                                type={showValues[credential.id] ? 'text' : 'password'}
                                value={credential.value}
                                readOnly
                                className="bg-transparent border-cyan-500/50 text-white flex-1 mr-2"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowValues(prev => ({ ...prev, [credential.id]: !prev[credential.id] }))}
                                  className="text-cyan-300 hover:bg-cyan-500/20"
                                >
                                  {showValues[credential.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(credential.value, credential.id)}
                                  className="text-cyan-300 hover:bg-cyan-500/20"
                                >
                                  {copiedId === credential.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Last updated: {credential.lastUpdated}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}