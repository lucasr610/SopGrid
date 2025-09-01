import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Users, Plus, Edit, Trash2, Shield, ChevronLeft, UserPlus, Key, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { SopgridHeader } from '@/components/sopgrid-header';

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export function UserManagementNew() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'technician'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users']
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddDialogOpen(false);
      setFormData({ username: '', password: '', role: 'technician' });
      toast({
        title: 'User Created',
        description: 'New user has been added successfully.',
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'technician' });
      toast({
        title: 'User Updated',
        description: 'User information has been updated.',
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User Deleted',
        description: 'User has been removed from the system.',
      });
    }
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'supervisor': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'technician': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
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

      {/* Header */}
      <SopgridHeader />

      <div className="relative z-20 min-h-screen p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setLocation('/dashboard')}
                variant="ghost"
                className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-gray-400">Manage system access and permissions</p>
              </div>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-black/90 backdrop-blur-xl border border-cyan-500/50 text-white shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                <DialogHeader>
                  <DialogTitle className="text-cyan-300 text-xl font-bold">Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-cyan-300 mb-2 block font-medium">Username</Label>
                    <div className="relative">
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-md border border-cyan-500/50 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
                        placeholder="Enter username"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/10 to-blue-500/10 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-cyan-300 mb-2 block font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-md border border-cyan-500/50 text-white placeholder:text-gray-500 pr-12 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
                        placeholder="Enter password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/10 to-blue-500/10 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-cyan-300 mb-2 block font-medium">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-md border border-cyan-500/50 text-white focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                        <SelectItem value="admin" className="text-red-400 hover:bg-red-500/20">Admin</SelectItem>
                        <SelectItem value="supervisor" className="text-yellow-400 hover:bg-yellow-500/20">Supervisor</SelectItem>
                        <SelectItem value="technician" className="text-cyan-400 hover:bg-cyan-500/20">Technician</SelectItem>
                        <SelectItem value="viewer" className="text-gray-400 hover:bg-gray-500/20">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => createUserMutation.mutate(formData)}
                    className="w-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 text-cyan-300 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 font-semibold"
                    disabled={createUserMutation.isPending}
                  >
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users?.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <span className="text-cyan-300">{user.username}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-400">
                      <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20"
                            onClick={() => {
                              setEditingUser(user);
                              setFormData({ username: user.username, password: '', role: user.role });
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-black/90 backdrop-blur-xl border border-cyan-500/50 text-white shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                          <DialogHeader>
                            <DialogTitle className="text-cyan-300 text-xl font-bold">Edit User</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label className="text-cyan-300 mb-2 block font-medium">Username</Label>
                              <div className="relative">
                                <Input
                                  value={formData.username}
                                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                  className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-md border border-cyan-500/50 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/10 to-blue-500/10 pointer-events-none" />
                              </div>
                            </div>
                            <div>
                              <Label className="text-cyan-300 mb-2 block font-medium">New Password (optional)</Label>
                              <div className="relative">
                                <Input
                                  type={showEditPassword ? "text" : "password"}
                                  value={formData.password}
                                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                  className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-md border border-cyan-500/50 text-white placeholder:text-gray-500 pr-12 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
                                  placeholder="Leave blank to keep current"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                                  onClick={() => setShowEditPassword(!showEditPassword)}
                                >
                                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/10 to-blue-500/10 pointer-events-none" />
                              </div>
                            </div>
                            <div>
                              <Label className="text-cyan-300 mb-2 block font-medium">Role</Label>
                              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                <SelectTrigger className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-md border border-cyan-500/50 text-white focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                                  <SelectItem value="admin" className="text-red-400 hover:bg-red-500/20">Admin</SelectItem>
                                  <SelectItem value="supervisor" className="text-yellow-400 hover:bg-yellow-500/20">Supervisor</SelectItem>
                                  <SelectItem value="technician" className="text-cyan-400 hover:bg-cyan-500/20">Technician</SelectItem>
                                  <SelectItem value="viewer" className="text-gray-400 hover:bg-gray-500/20">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={() => editingUser && updateUserMutation.mutate({ id: editingUser.id, ...formData })}
                              className="w-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 text-cyan-300 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 font-semibold"
                              disabled={updateUserMutation.isPending}
                            >
                              Update User
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {user.username !== 'admin' && user.id !== currentUser?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                          onClick={() => {
                            if (confirm(`Delete user ${user.username}?`)) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-4 gap-4"
        >
          <Card className="bg-gradient-to-br from-gray-900/50 to-black/60 backdrop-blur-xl border border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">{users?.length || 0}</p>
                <p className="text-xs text-gray-400">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-black/60 backdrop-blur-xl border-cyan-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-300">
                  {users?.filter(u => u.role === 'admin').length || 0}
                </p>
                <p className="text-xs text-gray-400">Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-black/60 backdrop-blur-xl border-cyan-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-300">
                  {users?.filter(u => u.role === 'supervisor').length || 0}
                </p>
                <p className="text-xs text-gray-400">Supervisors</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-black/60 backdrop-blur-xl border-cyan-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-300">
                  {users?.filter(u => u.role === 'technician').length || 0}
                </p>
                <p className="text-xs text-gray-400">Technicians</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}