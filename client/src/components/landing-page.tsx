import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';

interface GlowEffect {
  id: number;
  x: number;
  y: number;
}

export function LandingPage() {
  const [glowEffects, setGlowEffects] = useState<GlowEffect[]>([]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newGlow: GlowEffect = {
      id: Date.now(),
      x,
      y
    };
    
    setGlowEffects(prev => [...prev, newGlow]);
    
    // Remove the glow effect after animation completes
    setTimeout(() => {
      setGlowEffects(prev => prev.filter(glow => glow.id !== newGlow.id));
    }, 2000);
  };

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {/* Navigation Buttons - Top Left */}
      <motion.div 
        className="absolute top-8 left-8 z-50 flex gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <Link to="/login">
          <Button 
            variant="outline" 
            className="bg-black/60 backdrop-blur-xl border-cyan-500 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white transition-all duration-300 px-8 py-3 text-lg font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
          >
            SECURE LOGIN
          </Button>
        </Link>
        <Link to="/chat">
          <Button 
            variant="outline" 
            className="bg-black/60 backdrop-blur-xl border-blue-500 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 hover:text-white transition-all duration-300 px-8 py-3 text-lg font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            SOPGRID CHAT
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button 
            variant="outline" 
            className="bg-black/60 backdrop-blur-xl border-purple-500 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 hover:text-white transition-all duration-300 px-8 py-3 text-lg font-bold shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
          >
            CONTROL CENTER
          </Button>
        </Link>
      </motion.div>

      {/* SOPGRID Industrial Header - Top Right */}
      <motion.div 
        className="absolute top-8 right-8 z-50 text-right"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div className="bg-black/60 backdrop-blur-xl border border-cyan-500/50 rounded-lg p-6 shadow-[0_0_40px_rgba(6,182,212,0.3)]">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">SOPGRID</h2>
          <p className="text-sm font-bold text-cyan-300 mb-1">COGNITIVE OS FOR ARBITRATION & COMPLIANCE</p>
          <p className="text-xs font-medium text-gray-400 leading-relaxed max-w-sm">
            Industrial-grade multi-agent system • Zero-tolerance compliance • Production-ready SOPs
          </p>
        </div>
      </motion.div>

      {/* Full Screen Background Image */}
      <div className="absolute inset-0 z-0" onClick={handleImageClick}>
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23111827'/%3E%3C/svg%3E"
          alt="SOPGRID Industrial System"
          className="w-full h-full object-cover opacity-90"
        />
        
        {/* Glow Effects */}
        <AnimatePresence>
          {glowEffects.map(glow => (
            <motion.div
              key={glow.id}
              className="absolute pointer-events-none"
              style={{
                left: glow.x,
                top: glow.y,
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ 
                scale: 3,
                opacity: 0
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <div
                className="w-32 h-32 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(147, 51, 234, 0.8) 0%, rgba(6, 182, 212, 0.6) 30%, transparent 70%)',
                  filter: 'blur(20px)'
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}