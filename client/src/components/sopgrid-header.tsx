import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { LogOut, Shield, Menu } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SopgridHeader() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/sop-generator', label: 'SOP Generator' },
    { path: '/crawler', label: 'Web Crawler' },
    { path: '/credentials', label: 'Credentials' },
    { path: '/snapshots', label: 'Snapshots' },
    { path: '/arbitration', label: 'Arbitration' },
    { path: '/users', label: 'Users' },
  ];

  return (
    <header className="bg-black/80 backdrop-blur-xl border-b border-blue-600/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/dashboard" className="flex items-center gap-3">
            {/* Mini Shield Logo */}
            <div className="relative w-10 h-12">
              <svg viewBox="0 0 100 110" className="w-full h-full">
                <defs>
                  <linearGradient id="headerSteelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e5e7eb" />
                    <stop offset="50%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#e5e7eb" />
                  </linearGradient>
                  <filter id="headerNeonGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M50,10 L85,25 L85,60 C85,80 70,95 50,105 C30,95 15,80 15,60 L15,25 Z"
                  fill="url(#headerSteelGradient)"
                  stroke="#0066ff"
                  strokeWidth="2"
                  filter="url(#headerNeonGlow)"
                  className="drop-shadow-[0_0_5px_#0066ff]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-500 drop-shadow-[0_0_10px_#0066ff]">
                  SG
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                SOPGRID
              </h1>
              <p className="text-xs text-gray-400">Powered by People • Driven on Intelligence</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`
                    text-sm font-medium transition-all
                    ${location === item.path 
                      ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-500' 
                      : 'text-gray-300 hover:text-blue-400 hover:bg-blue-500/5'
                    }
                  `}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-gray-300">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                {navItems.map(item => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className="text-gray-300 hover:text-blue-400 hover:bg-blue-500/10"
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-200">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="icon"
                  className="text-gray-300 hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}