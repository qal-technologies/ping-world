'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Download, Camera, Check, Circle, Square,
  Hexagon, RotateCw, ZoomIn, ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BORDER_PALETTES = [
  { name: 'Neon Cyan',          stops: ['#00F2FE', '#4FACFE'] },
  { name: 'Sunset Glow',        stops: ['#FF512F', '#DD2476'] },
  { name: 'Emerald Mint',       stops: ['#11998E', '#38EF7D'] },
  { name: 'Cosmic Purple',      stops: ['#7F00FF', '#E100FF'] },
  { name: 'Amber Fire',         stops: ['#F857A6', '#FF5858'] },
  { name: 'Gold Luxury',        stops: ['#FFD700', '#9C7B00'] },
  { name: 'Ultra Violet',       stops: ['#654ea3', '#eaafc8'] },
  { name: 'PingWorld',          stops: ['#0EBAE1', '#6C3AEB', '#E100FF'] },
];

const BG_OPTIONS = [
  { label: 'Dark',         value: '#0A0C1B' },
  { label: 'Navy',         value: '#0F172A' },
  { label: 'Blue',         value: '#1e3a8a' },
  { label: 'Purple',       value: '#4c1d95' },
  { label: 'Emerald',      value: '#064e3b' },
  { label: 'Rose',         value: '#881337' },
  { label: 'White',        value: '#ffffff' },
  { label: 'Transparent',  value: 'transparent' },
];

type FrameShape = 'circle' | 'squircle' | 'hexagon';
type BadgeKind = 'none' | 'verified' | 'pro' | 'creator';

const SHAPE_CLASSES: Record<FrameShape, string> = {
  circle:   'rounded-full',
  squircle: 'rounded-[2.5rem]',
  hexagon:  'rounded-3xl',
};

const INNER_CLASSES: Record<FrameShape, string> = {
  circle:   'rounded-full',
  squircle: 'rounded-[2.1rem]',
  hexagon:  'rounded-2xl',
};

export default function ProfilePicMaker() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [shape, setShape]     = useState<FrameShape>('circle');
  const [palette, setPalette] = useState(0);
  const [border, setBorder]   = useState(7);
  const [glow, setGlow]       = useState(40);
  const [zoom, setZoom]       = useState(100);
  const [badge, setBadge]     = useState<BadgeKind>('verified');
  const [bg, setBg]           = useState('#0A0C1B');
  const [exporting, setExporting] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar(ev.target?.result as string);
      toast.success('Photo loaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: null,
        scale: 4,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-pic-${Date.now()}.png`;
      a.click();
      toast.success('Exported at 4× resolution — crystal clear!');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const { stops } = BORDER_PALETTES[palette];
  const gradient = `linear-gradient(135deg, ${stops.join(', ')})`;
  const glowColor = stops[0];

  return (
    <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
      {/* ───── Preview ───── */}
      <div className='lg:col-span-6 flex flex-col items-center justify-center p-10
                      bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl
                      space-y-8 shadow-2xl'>
        <div
          ref={previewRef}
          className='relative flex items-center justify-center p-6'
          style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow / 2}px ${glowColor}AA)` : 'none' }}>

          {/* Gradient border ring */}
          <div
            className={cn('flex items-center justify-center relative', SHAPE_CLASSES[shape])}
            style={{
              padding: `${border}px`,
              background: gradient,
              width: 260,
              height: 260,
            }}>
            {/* Inner image well */}
            <div
              className={cn('w-full h-full overflow-hidden flex items-center justify-center relative', INNER_CLASSES[shape])}
              style={{ background: bg === 'transparent' ? 'transparent' : bg }}>
              {avatar ? (
                <img
                  src={avatar}
                  alt='Avatar'
                  crossOrigin='anonymous'
                  className='w-full h-full object-cover select-none pointer-events-none'
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              ) : (
                <div className='flex flex-col items-center justify-center text-white/30 p-4 text-center'>
                  <Camera className='h-12 w-12 mb-2' />
                  <span className='text-[10px] font-bold uppercase tracking-wide'>Upload Photo</span>
                </div>
              )}
            </div>

            {/* Badge overlay */}
            {badge !== 'none' && (
              <div className='absolute bottom-3 right-3 p-1
                              bg-[#0A0C1B] rounded-full border-2 border-white/20
                              shadow-xl flex items-center justify-center z-10'>
                {badge === 'verified' && (
                  <span className='h-7 w-7 rounded-full bg-pw-primary flex items-center justify-center text-white text-xs font-black'>✓</span>
                )}
                {badge === 'pro' && (
                  <span className='h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500
                                   flex items-center justify-center text-white text-[9px] font-black'>PRO</span>
                )}
                {badge === 'creator' && (
                  <span className='h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500
                                   flex items-center justify-center text-white text-xs font-black'>★</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA buttons */}
        <div className='flex items-center gap-3 w-full max-w-xs'>
          <label className='flex-1 cursor-pointer'>
            <input type='file' accept='image/*' onChange={handleUpload} className='hidden' />
            <div className='w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10
                            flex items-center justify-center gap-2 text-xs font-bold text-pw-muted
                            transition-colors cursor-pointer select-none'>
              <Upload className='h-4 w-4' />
              {avatar ? 'Change Photo' : 'Upload Photo'}
            </div>
          </label>
          <Button
            onClick={handleExport}
            disabled={!avatar || exporting}
            className='flex-1 h-11 rounded-xl btn-primary font-bold gap-2 text-xs shadow-lg shadow-pw-primary/20'>
            <Download className='h-4 w-4' />
            {exporting ? 'Exporting…' : 'Export PNG'}
          </Button>
        </div>
      </div>

      {/* ───── Controls ───── */}
      <div className='lg:col-span-6 space-y-5'>
        <Card className='p-6 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl space-y-6 shadow-xl'>

          {/* Frame Shape */}
          <section className='space-y-2'>
            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>Frame Shape</label>
            <div className='grid grid-cols-3 gap-2'>
              {(['circle', 'squircle', 'hexagon'] as FrameShape[]).map((s) => (
                <Button key={s} type='button' variant='outline'
                  onClick={() => setShape(s)}
                  className={cn(
                    'h-10 text-xs font-bold gap-2 rounded-xl capitalize',
                    shape === s
                      ? 'bg-pw-primary/20 border-pw-primary text-pw-primary'
                      : 'bg-white/5 border-white/10 text-pw-muted hover:bg-white/10',
                  )}>
                  {s === 'circle' && <Circle className='h-3.5 w-3.5' />}
                  {s === 'squircle' && <Square className='h-3.5 w-3.5' />}
                  {s === 'hexagon' && <Hexagon className='h-3.5 w-3.5' />}
                  {s}
                </Button>
              ))}
            </div>
          </section>

          {/* Gradient Border Palettes */}
          <section className='space-y-2'>
            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>Gradient Ring</label>
            <div className='grid grid-cols-4 gap-2'>
              {BORDER_PALETTES.map((p, idx) => (
                <button key={p.name} type='button' onClick={() => setPalette(idx)}
                  title={p.name}
                  className={cn(
                    'h-10 rounded-xl relative flex items-center justify-center border-2 transition-all',
                    palette === idx ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                  style={{ background: `linear-gradient(135deg, ${p.stops.join(', ')})` }}>
                  {palette === idx && <Check className='h-4 w-4 text-white drop-shadow' />}
                </button>
              ))}
            </div>
          </section>

          {/* Background Color */}
          <section className='space-y-2'>
            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>Background</label>
            <div className='flex gap-2 flex-wrap'>
              {BG_OPTIONS.map((b) => (
                <button key={b.value} type='button' onClick={() => setBg(b.value)}
                  title={b.label}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-all',
                    bg === b.value ? 'border-white scale-110 shadow-lg' : 'border-white/20 hover:border-white/50',
                    b.value === 'transparent' && 'bg-transparent border-dashed',
                  )}
                  style={b.value !== 'transparent' ? { background: b.value } : {}}
                />
              ))}
            </div>
          </section>

          {/* Sliders */}
          <section className='space-y-4 pt-3 border-t border-white/5'>
            {[
              { label: 'Ring Thickness', value: border, set: setBorder, min: 0, max: 18, unit: 'px', color: 'text-pw-cyan' },
              { label: 'Glow Radiance',  value: glow,   set: setGlow,   min: 0, max: 100, unit: '%', color: 'text-pw-primary' },
              { label: 'Photo Zoom',     value: zoom,   set: setZoom,   min: 80, max: 200, unit: '%', color: 'text-pw-success' },
            ].map(({ label, value, set, min, max, unit, color }) => (
              <div key={label} className='space-y-1.5'>
                <div className='flex justify-between text-xs font-bold'>
                  <span className='text-pw-muted'>{label}</span>
                  <span className={cn('font-mono', color)}>{value}{unit}</span>
                </div>
                <input type='range' min={min} max={max} value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className='w-full accent-pw-primary' />
              </div>
            ))}
          </section>

          {/* Status Badge */}
          <section className='space-y-2 pt-3 border-t border-white/5'>
            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>Status Badge</label>
            <div className='grid grid-cols-4 gap-2'>
              {([
                { id: 'none',     label: 'None' },
                { id: 'verified', label: '✓ Verified' },
                { id: 'pro',      label: '★ PRO' },
                { id: 'creator',  label: 'Creator' },
              ] as { id: BadgeKind; label: string }[]).map((b) => (
                <Button key={b.id} type='button' variant='outline'
                  onClick={() => setBadge(b.id)}
                  className={cn(
                    'h-9 text-xs font-bold rounded-xl',
                    badge === b.id
                      ? 'bg-pw-primary/20 border-pw-primary text-pw-primary'
                      : 'bg-white/5 border-white/10 text-pw-muted hover:bg-white/10',
                  )}>
                  {b.label}
                </Button>
              ))}
            </div>
          </section>
        </Card>
      </div>
    </div>
  );
}
