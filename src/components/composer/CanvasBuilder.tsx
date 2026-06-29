'use client';

import { useRef, useState } from 'react';
import {
  Type,
  Palette,
  Plus,
  Trash2,
  Download,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { CANVAS_FONTS, PREMIUM_FEATURES } from '@/lib/composer/constants';
import { PremiumGate } from './PremiumGate';
import { toast } from 'sonner';
import type { CanvasTextOverlay } from '@/lib/composer/types';

const BG_PRESETS = [
  { label: 'Dark', value: 'linear-gradient(135deg, #12152e 0%, #1a1f40 100%)' },
  { label: 'Purple', value: 'linear-gradient(135deg, #5c6fff 0%, #985cff 100%)' },
  { label: 'Cyan', value: 'linear-gradient(135deg, #22d4fd 0%, #0a66c2 100%)' },
  { label: 'Warm', value: 'linear-gradient(135deg, #ff8c42 0%, #ff5c7a 100%)' },
  { label: 'Emerald', value: 'linear-gradient(135deg, #22c985 0%, #0a66c2 100%)' },
  { label: 'Gold', value: 'linear-gradient(135deg, #ffb347 0%, #985cff 100%)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
];

const templateFeature = PREMIUM_FEATURES.find((f) => f.id === 'canvas_templates')!;

export function CanvasBuilder() {
  const { state, dispatch } = useComposer();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [newText, setNewText] = useState('Add your text...');
  const [newFont, setNewFont] = useState('Syne');
  const [newFontSize, setNewFontSize] = useState(32);
  const [newColor, setNewColor] = useState('#ffffff');
  const [newBold, setNewBold] = useState(true);
  const [selectedOverlayIdx, setSelectedOverlayIdx] = useState<number | null>(null);

  const addTextOverlay = () => {
    const overlay: CanvasTextOverlay = {
      text: newText,
      fontFamily: newFont,
      fontSize: newFontSize,
      color: newColor,
      bold: newBold,
      italic: false,
      x: 50,
      y: 50,
    };
    dispatch({ type: 'ADD_CANVAS_TEXT', payload: overlay });
    toast.success('Text layer added to canvas');
  };

  const removeOverlay = (idx: number) => {
    dispatch({ type: 'REMOVE_CANVAS_TEXT', payload: idx });
    if (selectedOverlayIdx === idx) setSelectedOverlayIdx(null);
  };

  const handleDownload = async () => {
    const el = canvasRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: null });
      
      // Add PingWorld watermark
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '14px Syne, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('pingwrld.com', canvas.width - 120, canvas.height - 12);
      }

      const link = document.createElement('a');
      link.download = 'pingworld-canvas.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Canvas downloaded!');
    } catch (err) {
      toast.error('Download failed — try again');
    }
  };

  return (
    <div className='space-y-5'>
      <div className='flex items-center gap-2'>
        <Layers className='h-4 w-4 text-pw-secondary' />
        <p className='text-xs font-bold text-pw-text'>
          Canvas Builder
        </p>
        <span className='text-[10px] text-pw-muted ml-auto'>
          Text-on-image composer
        </span>
      </div>

      {/* Canvas Preview */}
      <div
        ref={canvasRef}
        className='relative w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center'
        style={{ background: state.canvasBackground }}
      >
        {state.canvasTextOverlays.length === 0 && (
          <p className='text-white/30 text-sm font-semibold'>
            Add text layers below
          </p>
        )}
        {state.canvasTextOverlays.map((overlay, i) => (
          <div
            key={i}
            className={cn(
              'absolute cursor-pointer select-none transition-all',
              selectedOverlayIdx === i && 'ring-1 ring-white/50 rounded px-1',
            )}
            style={{
              top: `${overlay.y}%`,
              left: `${overlay.x}%`,
              transform: 'translate(-50%, -50%)',
              fontFamily: overlay.fontFamily,
              fontSize: `${overlay.fontSize}px`,
              color: overlay.color,
              fontWeight: overlay.bold ? 700 : 400,
              fontStyle: overlay.italic ? 'italic' : 'normal',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              maxWidth: '90%',
              textAlign: 'center',
              wordBreak: 'break-word',
            }}
            onClick={() =>
              setSelectedOverlayIdx(selectedOverlayIdx === i ? null : i)
            }
          >
            {overlay.text}
          </div>
        ))}

        {/* PingWorld watermark */}
        <div className='absolute bottom-2 right-3 text-[10px] font-bold text-white/30 pointer-events-none'>
          pingwrld.com
        </div>
      </div>

      {/* BG Presets */}
      <div className='space-y-2'>
        <label className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
          Background
        </label>
        <div className='flex gap-2 flex-wrap'>
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                dispatch({ type: 'SET_CANVAS_BG', payload: preset.value })
              }
              className={cn(
                'h-8 w-8 rounded-lg border-2 transition-all',
                state.canvasBackground === preset.value
                  ? 'border-pw-primary scale-110'
                  : 'border-white/10 hover:border-white/30',
              )}
              title={preset.label}
              style={{ background: preset.value }}
            />
          ))}
        </div>
      </div>

      {/* Text Layer controls */}
      <div className='space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/10'>
        <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
          Add Text Layer
        </p>

        <input
          type='text'
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder='Your text...'
          className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-pw-text placeholder:text-pw-muted/40 focus:outline-none focus:border-pw-primary/40 no-outline'
        />

        <div className='grid grid-cols-2 gap-2'>
          <select
            value={newFont}
            onChange={(e) => setNewFont(e.target.value)}
            className='bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-pw-text focus:outline-none no-outline appearance-none'
          >
            {CANVAS_FONTS.map((f) => (
              <option key={f} value={f} className='bg-pw-surface'>
                {f}
              </option>
            ))}
          </select>

          <div className='flex items-center gap-2'>
            <input
              type='number'
              value={newFontSize}
              onChange={(e) => setNewFontSize(Number(e.target.value))}
              min={12}
              max={120}
              className='w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-pw-text focus:outline-none no-outline'
            />
            <span className='text-[10px] text-pw-muted shrink-0'>px</span>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2 flex-1'>
            <Palette className='h-3.5 w-3.5 text-pw-muted shrink-0' />
            <input
              type='color'
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className='h-6 w-10 rounded cursor-pointer border-none bg-transparent'
            />
            <span className='text-[10px] font-mono text-pw-muted'>{newColor}</span>
          </div>
          <button
            onClick={() => setNewBold((b) => !b)}
            className={cn(
              'px-2 py-1 rounded-lg text-xs font-bold border transition-all',
              newBold
                ? 'bg-pw-primary/20 border-pw-primary/40 text-pw-primary'
                : 'bg-white/5 border-white/10 text-pw-muted',
            )}
          >
            B
          </button>
        </div>

        <button
          onClick={addTextOverlay}
          className='w-full flex items-center justify-center gap-2 py-2 rounded-xl btn-primary text-xs font-semibold'
        >
          <Plus className='h-3.5 w-3.5' />
          Add to Canvas
        </button>
      </div>

      {/* Overlay list */}
      {state.canvasTextOverlays.length > 0 && (
        <div className='space-y-2'>
          <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
            Text Layers
          </p>
          {state.canvasTextOverlays.map((overlay, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all',
                selectedOverlayIdx === i
                  ? 'border-pw-primary/40 bg-pw-primary/5'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10',
              )}
              onClick={() =>
                setSelectedOverlayIdx(selectedOverlayIdx === i ? null : i)
              }
            >
              <div
                className='h-6 w-6 rounded-md shrink-0 flex items-center justify-center'
                style={{ backgroundColor: overlay.color + '33' }}
              >
                <Type
                  className='h-3 w-3'
                  style={{ color: overlay.color }}
                />
              </div>
              <span className='text-xs text-pw-text flex-1 truncate'>
                {overlay.text}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeOverlay(i);
                }}
                className='text-pw-muted hover:text-pw-danger transition-colors p-1'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Premium Templates */}
      <PremiumGate
        feature={templateFeature}
        isPremium={state.isPremium}
        showPartial={false}
        className='h-14'
      >
        <div className='p-3 flex items-center gap-2'>
          <span className='text-xs text-pw-muted'>10+ premium templates available</span>
        </div>
      </PremiumGate>

      {/* Download */}
      <button
        onClick={handleDownload}
        className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-pw-primary/30 bg-pw-primary/5 text-pw-primary text-sm font-semibold hover:bg-pw-primary/10 transition-all'
      >
        <Download className='h-4 w-4' />
        Download Canvas PNG
      </button>
    </div>
  );
}
