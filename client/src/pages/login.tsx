import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { User, Lock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import shopBg from '@assets/generated_images/Purple_toolbox_shop_background_b4a533dc.png';
import sopgridLogo from '@assets/generated_images/SOPGRID_text_logo_only_2f343ebb.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(username, password);
    
    if (success) {
      toast({
        title: 'Authentication Successful',
        description: `Welcome to SOPGRID, ${username}!`,
      });
      setLocation('/');
    } else {
      toast({
        title: 'Authentication Failed',
        description: 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url(${shopBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Main Content */}
      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          {/* SOPGRID Logo */}
          <div className="mb-4">
            <img 
              src={sopgridLogo} 
              alt="SOPGRID" 
              className="h-16 w-auto mx-auto opacity-95"
            />
          </div>
          <p className="text-white text-sm mb-4 font-medium drop-shadow-lg">The Cognitive OS for Arbitration, Compliance, Repair, and Visualization</p>
          
          {/* Your Tagline */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-white font-medium drop-shadow-lg">Powered by People</span>
            <span className="text-white/70">•</span>
            <span className="text-white font-medium drop-shadow-lg">Driven on Intelligence</span>
            <span className="text-white/70">•</span>
            <span className="text-white font-medium drop-shadow-lg">Ensured by Real-Time Compliance</span>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/90 border-white/20 shadow-2xl backdrop-blur-md">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Username Field */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Username
                  </label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400"
                    required
                    data-testid="input-username"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400"
                    required
                    data-testid="input-password"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 shadow-lg"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </div>
                  ) : (
                    'Access SOPGRID'
                  )}
                </Button>
              </form>

              {/* Security Notice */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-600">Protected by Multi-Agent Authentication</p>
                <p className="text-xs text-gray-600">All access monitored for compliance</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white font-medium drop-shadow-lg">System Online</span>
          </div>
          <p className="text-xs text-white/80 mt-1 font-medium drop-shadow-lg">Multi-Agent System Ready</p>
        </motion.div>
      </div>
    </div>
  );
}