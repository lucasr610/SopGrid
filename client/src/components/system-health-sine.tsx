import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function SystemHealthSine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef<number>(0);

  const { data: metrics } = useQuery<any>({
    queryKey: ['/api/system/metrics'],
    // Enterprise: Event-driven updates via WebSocket - no polling
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
      ctx.lineWidth = 1;

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Vertical lines
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw sine waves for each metric
      const drawSineWave = (value: number, color: string, offset: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x++) {
          const angle = (x / canvas.width) * Math.PI * 4 + timeRef.current + offset;
          const amplitude = (value / 100) * (canvas.height / 4);
          const y = canvas.height / 2 + Math.sin(angle) * amplitude;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
      };

      // Draw waves for each metric
      if (metrics) {
        drawSineWave(metrics.cpuUsage || 0, '#06b6d4', 0); // cyan
        drawSineWave(metrics.memoryUsage || 0, '#3b82f6', Math.PI / 3); // blue
        drawSineWave(metrics.diskUsage || 0, '#a855f7', Math.PI * 2 / 3); // purple
        drawSineWave(metrics.networkIO / 10 || 0, '#10b981', Math.PI); // green (scaled down)
      }

      // Animate - slower like big business
      timeRef.current += 0.01; // Much slower animation
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [metrics]);

  return (
    <Card className="bg-black/60 backdrop-blur-xl border-cyan-500/30">
      <CardHeader>
        <CardTitle className="text-cyan-300 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Vitals - Live Sine Wave Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas 
            ref={canvasRef}
            className="w-full h-48 rounded-lg bg-black/40"
            style={{ imageRendering: 'crisp-edges' }}
          />
          
          {/* Legend */}
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full" />
              <span className="text-cyan-300">CPU {metrics?.cpuUsage || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full" />
              <span className="text-blue-300">RAM {metrics?.memoryUsage || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full" />
              <span className="text-purple-300">Disk {metrics?.diskUsage || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <span className="text-green-300">Net {metrics?.networkIO || 0} MB/s</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}