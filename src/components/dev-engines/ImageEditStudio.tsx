'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageIcon, Sliders, RefreshCw, Layers, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageEditingEngine, ColorFilterConfig } from '@/lib/dev-engines/image-editing';

export default function ImageEditStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Custom Filters & parameters
  const [activeFilter, setActiveFilter] = useState<'normal' | 'removeBg' | 'blueTone' | 'blackAndWhite'>('normal');
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(100);
  const [contrast, setContrast] = useState(0);
  const [highlight, setHighlight] = useState(0);

  const engineRef = useRef(new ImageEditingEngine());

  useEffect(() => {
    drawCanvas();
  }, [activeFilter, hue, sat, contrast, highlight]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw solid base canvas dimensions
    canvas.width = 320;
    canvas.height = 180;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render professional cyberpunk mock design background
    ctx.fillStyle = '#0c0d1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw design grid lines for contrast checks
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 20; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Centered subject sphere (Cyberpunk cyan color)
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(160, 90, 45, 0, Math.PI * 2);
    ctx.fill();

    // Magenta accent sphere
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(190, 70, 18, 0, Math.PI * 2);
    ctx.fill();

    // Text details (highlights evaluation)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PIXEL EVALUATION', 160, 155);

    // Apply custom Image Editing Engine algorithms
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Compose filter config options
    const config: ColorFilterConfig = {
      hueShift: hue,
      saturation: sat,
      contrast: contrast,
      highlight: highlight,
      blueTone: activeFilter === 'blueTone',
      blackAndWhite: activeFilter === 'blackAndWhite',
    };

    let processedData = imgData;

    if (activeFilter === 'removeBg') {
      processedData = engineRef.current.removeBackground({
        width: canvas.width,
        height: canvas.height,
        data: imgData.data,
      }, 40) as any;
    }

    // Apply main filters (contrast, highlight, black & white, blue tone, saturation, hue)
    processedData = engineRef.current.applyFilters({
      width: canvas.width,
      height: canvas.height,
      data: processedData.data,
    }, config) as any;

    // Repopulate canvas with modified pixels
    const finalData = ctx.createImageData(canvas.width, canvas.height);
    finalData.data.set(processedData.data);
    ctx.putImageData(finalData, 0, 0);
  };

  const handleReset = () => {
    setActiveFilter('normal');
    setHue(0);
    setSat(100);
    setContrast(0);
    setHighlight(0);
  };

  return (
    <Card className="card-glow bkblur p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold font-display flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-pw-primary" />
          Pro Canvas Image Pixel Processing Studio
        </h3>
        <Button onClick={handleReset} variant="outline" size="sm" className="h-8 text-xs border-white/10 gap-1.5">
          <RefreshCw className="h-3 w-3" />
          Reset All
        </Button>
      </div>

      {/* Canvas rendering output area */}
      <div className="flex justify-center bg-black/80 rounded-2xl border border-white/10 p-4 relative overflow-hidden">
        <canvas ref={canvasRef} className="rounded-xl border border-white/10 shadow-2xl max-w-full" />
      </div>

      {/* Filter Presets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant={activeFilter === 'normal' ? 'default' : 'outline'}
          onClick={() => { setActiveFilter('normal'); }}
          className={`h-10 text-xs font-bold ${activeFilter === 'normal' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Normal Image
        </Button>
        <Button
          variant={activeFilter === 'removeBg' ? 'default' : 'outline'}
          onClick={() => { setActiveFilter('removeBg'); }}
          className={`h-10 text-xs font-bold ${activeFilter === 'removeBg' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Remove Background
        </Button>
        <Button
          variant={activeFilter === 'blueTone' ? 'default' : 'outline'}
          onClick={() => { setActiveFilter('blueTone'); }}
          className={`h-10 text-xs font-bold ${activeFilter === 'blueTone' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Cold Blue Tone
        </Button>
        <Button
          variant={activeFilter === 'blackAndWhite' ? 'default' : 'outline'}
          onClick={() => { setActiveFilter('blackAndWhite'); }}
          className={`h-10 text-xs font-bold ${activeFilter === 'blackAndWhite' ? 'bg-pw-primary text-black' : 'border-white/10'}`}
        >
          Black & White
        </Button>
      </div>

      {/* Slider Adjustments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-pw-muted block">Contrast Adjustment: {contrast}%</label>
          <input
            type="range"
            min="-100"
            max="100"
            value={contrast}
            onChange={e => setContrast(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-pw-muted block">Highlight Gain: {highlight}%</label>
          <input
            type="range"
            min="-100"
            max="100"
            value={highlight}
            onChange={e => setHighlight(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-pw-muted block">Color Saturation: {sat}%</label>
          <input
            type="range"
            min="0"
            max="300"
            value={sat}
            onChange={e => setSat(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-pw-muted block">Hue Shift Angle: {hue}°</label>
          <input
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={e => setHue(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
          />
        </div>
      </div>
    </Card>
  );
}
