import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Camera, Download, Upload, RotateCcw, Archive, 
  ChevronLeft, Loader2, Clock, Database, Save
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { SopgridHeader } from '@/components/sopgrid-header';

export function Snapshots() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const snapshots = [
    { id: '1', name: 'Production Baseline', date: '2025-08-20 14:30', size: '45.2 MB', type: 'full' },
    { id: '2', name: 'Pre-Update Backup', date: '2025-08-19 09:15', size: '42.8 MB', type: 'full' },
    { id: '3', name: 'Configuration Save', date: '2025-08-18 16:45', size: '12.3 MB', type: 'config' },
  ];

  const createSnapshot = () => {
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      toast({
        title: 'Snapshot Created',
        description: 'System snapshot has been created successfully.',
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/document-bg.png)'
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
                  System Snapshots
                </h1>
                <p className="text-gray-400">Backup and restore system state</p>
              </div>
            </div>
            
            <Button 
              onClick={createSnapshot}
              disabled={isCreating}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Snapshot...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Create Snapshot
                </>
              )}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {snapshots.map((snapshot, index) => (
            <motion.div
              key={snapshot.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-transparent backdrop-blur-none border-cyan-500/30 hover:border-cyan-400/50 transition-all">
                <CardHeader>
                  <CardTitle className="text-cyan-300 flex items-center justify-between">
                    <span className="truncate">{snapshot.name}</span>
                    <Badge className={
                      snapshot.type === 'full'
                        ? 'bg-green-500/20 text-green-300 border-green-500/50'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                    }>
                      {snapshot.type}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{snapshot.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Database className="w-4 h-4" />
                      <span>{snapshot.size}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}