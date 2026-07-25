'use client';

import { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Sliders, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ImageEditStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFilter, setActiveFilter] = useState<'normal' | 'removeBg' | 'hueShift' | 'saturation'>('normal');
  const [hue, setHue] = useState(90);
  const [sat, setSat] = useState(150);

  useEffect(() => {
    drawCanvas();
  }, [activeFilter, hue, sat]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background grid pattern
    canvas.width = 320;
    canvas.height = 180;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sample subject (Circle & PingWorld Logo mock)
    ctx.fillStyle = '#111625';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subject circle
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(160, 90, 50, 0, Math.PI * 2);
    ctx.fill();

    // Secondary accent
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(190, 70, 20, 0, Math.PI * 2);
    ctx.fill();

    // Get pixel data
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    if (activeFilter === 'removeBg') {
      for (let i = 0; i < d.length; i += 4) {
        // If dark background pixel, make transparent
        if (d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 50) {
          d[i + 3] = 0;
        }
      }
    } else if (activeFilter === 'hueShift') {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 0) {
          d[i] = (d[i] + hue) % 255;
          d[i + 1] = (d[i + 1] + hue / 2) % 255;
        }
      }
    } else if (activeFilter === 'saturation') {
      const factor = sat / 100;
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
        d[i] = Math.min(255, avg + (d[i] - avg) * factor);
        d[i + 1] = Math.min(255, avg + (d[i + 1] - avg) * factor);
        d[i + 2] = Math.min(255, avg + (d[i + 2] - avg) * factor);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  return (
    <Card className="card-glow bkblur p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold font-display flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-pw-primary" />
          Canvas Image Pixel Processing Studio
        </h3>
        <span className="text-xs font-mono text-pw-muted bg-white/5 px-2.5 py-1 rounded-full">
          Zero-Dep Canvas Ops
        </span>
      </div>

      {/* Canvas preview */}
      <div className="flex justify-center bg-black/80 rounded-2xl border border-white/10 p-4 relative overflow-hidden">
        <canvas ref={canvasRef} className="rounded-xl border border-white/10 shadow-2xl max-w-full" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant={activeFilter === 'normal' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('normal')}
          className={`h-10 text-xs font-bold ${activeFilter === 'normal' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Original Image
        </Button>
        <Button
          variant={activeFilter === 'removeBg' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('removeBg')}
          className={`h-10 text-xs font-bold ${activeFilter === 'removeBg' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Remove Background
        </Button>
        <Button
          variant={activeFilter === 'hueShift' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('hueShift')}
          className={`h-10 text-xs font-bold ${activeFilter === 'hueShift' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Hue Shift
        </Button>
        <Button
          variant={activeFilter === 'saturation' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('saturation')}
          className={`h-10 text-xs font-bold ${activeFilter === 'saturation' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Adjust Saturation
        </Button>
      </div>

      {activeFilter === 'hueShift' && (
        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Hue Angle Shift: {hue}°</label>
          <input
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={e => setHue(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
          />
        </div>
      )}

      {activeFilter === 'saturation' && (
        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Saturation Factor: {sat}%</label>
          <input
            type="range"
            min="0"
            max="300"
            value={sat}
            onChange={e => setSat(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
          />
        </div>
      )}
    </Card>
  );
}
