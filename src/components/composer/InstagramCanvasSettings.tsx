'use client';

import { useState, useMemo } from 'react';
import { useComposer } from '@/lib/composer/useComposerStore';
import { splitTextIntoSlides } from '@/lib/composer/canvas-utils';
import { AlertCircle, Sliders, Type, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const INSTA_THEMES = [
  { label: 'Sunset Gradient', value: 'linear-gradient(135deg, #FFB347 0%, #FF5C7A 100%)', text: '#ffffff' },
  { label: 'Deep Blue', value: 'linear-gradient(135deg, #12152E 0%, #1A1F40 100%)', text: '#f8f9ff' },
  { label: 'Emerald Mint', value: 'linear-gradient(135deg, #22C985 0%, #22D4FD 100%)', text: '#111827' },
  { label: 'Minimal Light', value: '#ffffff', text: '#1f2937' },
  { label: 'Bold Dark', value: '#111827', text: '#f9fafb' },
];

const FONTS = ['Space Grotesk', 'Syne', 'Inter', 'JetBrains Mono'];

/**
 * jules edit: Component to configure Instagram text-to-canvas styling when no media is uploaded
 */
export function InstagramCanvasSettings() {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const themeIndex = state.instaCanvasThemeIdx ?? 0;
  const font = state.instaCanvasFont ?? 'Syne';
  const [fontSize, setFontSize] = useState(24);

  const isInstagramSelected = state.selectedPlatforms.includes('instagram');
  const hasNoMedia = state.mediaAssets.length === 0;

  const content = getContentForPlatform('instagram');
  const slides = useMemo(() => splitTextIntoSlides(content), [content]);

  if (!isInstagramSelected || !hasNoMedia) return null;

  return (
    <div className='p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 my-3'>
      <div className='flex items-start gap-2.5 text-pw-warning'>
        <AlertCircle className='h-4 w-4 mt-0.5 shrink-0' />
        <div>
          <p className='text-xs font-bold text-white'>Instagram Text Post Auto-Convert</p>
          <p className='text-[10px] text-pw-muted leading-relaxed mt-0.5'>
            Instagram requires images. Your text will be auto-rendered onto {slides.length} elegant text slides below.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3 pt-1'>
        {/* Theme select */}
        <div className='space-y-1.5'>
          <label className='text-[9px] font-bold uppercase tracking-wider text-pw-muted flex items-center gap-1'>
            <Palette className='h-3 w-3' /> Design Theme
          </label>
          <select
            value={themeIndex}
            onChange={(e) => dispatch({ type: 'SET_INSTA_CANVAS_SETTINGS', payload: { themeIdx: Number(e.target.value) } })}
            className='w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none no-outline appearance-none'
          >
            {INSTA_THEMES.map((theme, i) => (
              <option key={i} value={i} className='bg-pw-surface'>
                {theme.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font select */}
        <div className='space-y-1.5'>
          <label className='text-[9px] font-bold uppercase tracking-wider text-pw-muted flex items-center gap-1'>
            <Type className='h-3 w-3' /> Typography
          </label>
          <select
            value={font}
            onChange={(e) => dispatch({ type: 'SET_INSTA_CANVAS_SETTINGS', payload: { font: e.target.value } })}
            className='w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none no-outline appearance-none'
          >
            {FONTS.map((f) => (
              <option key={f} value={f} className='bg-pw-surface'>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Slide Carousels preview inside settings panel */}
      <div className='space-y-1.5'>
        <label className='text-[9px] font-bold uppercase tracking-wider text-pw-muted'>
          Auto-generated Slides ({slides.length})
        </label>
        <div className='flex gap-2 overflow-x-auto pb-1 scrollable-row'>
          {slides.map((slide, idx) => (
            <div
              key={idx}
              id={`insta-slide-card-${idx}`}
              className='relative aspect-square w-24 shrink-0 rounded-lg flex items-center justify-center p-2 text-center text-[10px] font-bold leading-normal'
              style={{
                background: INSTA_THEMES[themeIndex].value,
                color: INSTA_THEMES[themeIndex].text,
                fontFamily: font,
                fontSize: `${fontSize * 0.4}px`,
                textShadow: INSTA_THEMES[themeIndex].value === '#ffffff' ? 'none' : '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              <span className='truncate-3-lines'>{slide}</span>
              <span className='absolute bottom-1 right-1 text-[7px] opacity-60'>
                {idx + 1}/{slides.length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
