'use client';

import { useState, useMemo } from 'react';
import { useComposer } from '@/lib/composer/useComposerStore';
import { splitTextIntoSlides } from '@/lib/composer/canvas-utils';
import { AlertCircle, Type, Palette, ChevronDown, ChevronUp, Sparkles, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const INSTA_THEMES = [
  {
    label: 'Sunset Gradient',
    value: 'linear-gradient(135deg, #FFB347 0%, #FF5C7A 100%)',
    text: '#ffffff',
  },
  {
    label: 'Deep Blue',
    value: 'linear-gradient(135deg, #12152E 0%, #1A1F40 100%)',
    text: '#f8f9ff',
  },
  {
    label: 'Emerald Mint',
    value: 'linear-gradient(135deg, #22C985 0%, #22D4FD 100%)',
    text: '#111827',
  },
  { label: 'Minimal Light', value: '#ffffff', text: '#1f2937' },
  { label: 'Bold Dark', value: '#111827', text: '#f9fafb' },
];

const FONTS = ['Space Grotesk', 'Syne', 'Inter', 'JetBrains Mono'];

export function InstagramCanvasSettings() {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const [isOpen, setIsOpen] = useState(false);
  const themeIndex = state.instaCanvasThemeIdx ?? 0;
  const font = state.instaCanvasFont ?? 'Syne';
  const fontSize = 24;

  const isInstagramSelected = state.selectedPlatforms.includes('instagram');
  const hasNoMedia = state.mediaAssets.length === 0;

  const content = getContentForPlatform('instagram');
  const slides = useMemo(() => splitTextIntoSlides(content), [content]);

  if (!isInstagramSelected || !hasNoMedia) return null;

  return (
    <div className='w-full my-2'>
      {/* Header bar / Accordion trigger */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className='flex items-center justify-between p-3 rounded-xl bg-pw-surface/60 border border-white/5 hover:border-pw-primary/30 transition-all cursor-pointer select-none'>
        <div className='flex items-center gap-2.5'>
          <div className='h-7 w-7 rounded-lg bg-gradient-to-tr from-[#FFB347]/20 via-[#FF5C7A]/20 to-[#E4405F]/20 border border-[#E4405F]/30 flex items-center justify-center shrink-0'>
            <Sparkles className='h-3.5 w-3.5 text-[#E4405F]' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-white'>
                Instagram Slide Builder
              </span>
          
            </div>
            <p className='text-[10px] text-pw-muted leading-tight mt-0.5'>
              Formats text into styled swipeable slides
            </p>
          </div>
        </div>

        <div className='flex flex-col gap-1 items-start justify-center'>
        <span className='text-[9px] px-1.5 py-0.2 rounded-full bg-[#E4405F]/15 text-[#E4405F] font-semibold'>
                {slides.length} {slides.length === 1 ? 'Slide' : 'Slides'}
              </span>
        <button
          type='button'
          className='flex items-center gap-1 text-[11px] font-semibold text-pw-primary px-2.5 py-1 rounded-lg bg-pw-primary/10 hover:bg-pw-primary/20 transition-colors'>
          <SlidersHorizontal className='h-3 w-3' />
          <span>{isOpen ? 'Collapse' : 'Customize'}</span>
          {isOpen ?
            <ChevronUp className='h-3.5 w-3.5' />
          : <ChevronDown className='h-3.5 w-3.5' />}
        </button>
        </div>
      </div>

      {/* Collapsible content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className='overflow-hidden'>
            <div className='p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 mt-2'>
              <div className='flex items-start gap-2.5 text-pw-warning bg-pw-warning/5 p-2.5 rounded-lg border border-pw-warning/15'>
                <AlertCircle className='h-4 w-4 mt-0.5 shrink-0 text-pw-warning' />
                <div>
                  <p className='text-[11px] font-bold text-white'>
                    Text Post Auto-Convert
                  </p>
                  <p className='text-[10px] text-pw-muted leading-relaxed mt-0.5'>
                    Instagram requires images. Your text will be auto-rendered onto{' '}
                    {slides.length < 1 ? '0' : slides.length} elegant text slides.
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
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_INSTA_CANVAS_SETTINGS',
                        payload: { themeIdx: Number(e.target.value) },
                      })
                    }
                    className='w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none no-outline cursor-pointer'>
                    {INSTA_THEMES.map((theme, i) => (
                      <option
                        key={`theme-${i}`}
                        value={i}
                        className='bg-pw-surface'>
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
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_INSTA_CANVAS_SETTINGS',
                        payload: { font: e.target.value },
                      })
                    }
                    className='w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none no-outline cursor-pointer'>
                    {FONTS.map((f) => (
                      <option
                        key={`font-${f}`}
                        value={f}
                        className='bg-pw-surface'>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slide Carousels preview inside settings panel */}
              {slides.length > 0 ?
                <div className='space-y-1.5'>
                  <label className='text-[9px] font-bold uppercase tracking-wider text-pw-muted'>
                    Auto-generated Slides ({slides.length})
                  </label>
                  <div className='flex gap-2 overflow-x-auto pb-1 scrollable-row'>
                    {slides.map((slide, idx) => (
                      <div
                        key={`insta-slide-${idx}-${slide.slice(0, 8)}`}
                        id={`insta-slide-card-${idx}`}
                        className='relative aspect-square w-28 shrink-0 rounded-lg flex items-center justify-center p-2 text-center text-[10px] font-bold leading-normal'
                        style={{
                          background: INSTA_THEMES[themeIndex]?.value || '#111827',
                          color: INSTA_THEMES[themeIndex]?.text || '#ffffff',
                          fontFamily: font,
                          fontSize: `${fontSize * 0.4}px`,
                          textShadow:
                            INSTA_THEMES[themeIndex]?.value === '#ffffff' ?
                              'none'
                            : '0 1px 4px rgba(0,0,0,0.3)',
                        }}>
                        <span className='truncate-4-lines max-w-24 break-all'>
                          {slide}
                        </span>
                        <span className='absolute bottom-1 right-1 text-[7px] opacity-60'>
                          {idx + 1}/{slides.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              : <div className='w-full space-y-1.5 items-center flex bg-pw-primary/5 flex-col border-dashed border-primary/10 p-4 rounded-xl py-4'>
                  <p className='w-full text-[10px] text-center tracking-widest break-all text-pw-muted'>
                    Type text into the Instagram post editor to preview text-post slides
                  </p>
                </div>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
