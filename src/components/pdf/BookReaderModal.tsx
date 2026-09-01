'use client';

import { useState } from 'react';
import { BookOpen, Minimize2, Maximize2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface CoverConfig {
  hasFrontCover: boolean;
  hasBackCover: boolean;
  frontCoverTitle: string;
  frontCoverSubtitle: string;
  frontCoverAuthor: string;
  backCoverSummary: string;
  frontCoverTemplate: 'minimal' | 'bold' | 'split' | 'center' | 'modern_gradient' | 'editorial_classic' | 'cyberpunk_dark' | 'luxury_gold';
  backCoverTemplate: 'minimal' | 'bold' | 'split' | 'center' | 'modern_gradient' | 'editorial_classic' | 'cyberpunk_dark' | 'luxury_gold';
}

export interface BookReaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: any[];
  chapters: any[];
  coverConfig: CoverConfig;
  paperBgColor: string;
  bodyColor: string;
  fontFamily: string;
  globalTitleColor: string;
  imagePalette: any[];
  renderFormattedContent: (content: string, palette: any[]) => string;
}

export default function BookReaderModal({
  open,
  onOpenChange,
  pages,
  chapters,
  coverConfig,
  paperBgColor,
  bodyColor,
  fontFamily,
  globalTitleColor,
  imagePalette,
  renderFormattedContent,
}: BookReaderProps) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [readerZoom, setReaderZoom] = useState(100);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Combine cover items, chapters, and pages in sequential index order
  const readerItems: { type: 'front_cover' | 'chapter_header' | 'page' | 'back_cover'; data?: any; pageIndex?: number }[] = [];

  if (coverConfig.hasFrontCover) {
    readerItems.push({ type: 'front_cover' });
  }

  const renderedChapters = new Set<string>();

  pages.forEach((p, idx) => {
    if (p.chapterId && !renderedChapters.has(p.chapterId)) {
      const ch = chapters.find((c) => c.id === p.chapterId);
      if (ch) {
        readerItems.push({ type: 'chapter_header', data: ch });
        renderedChapters.add(p.chapterId);
      }
    }
    readerItems.push({ type: 'page', data: p, pageIndex: idx });
  });

  if (coverConfig.hasBackCover) {
    readerItems.push({ type: 'back_cover' });
  }

  const currentItem = readerItems[activeItemIndex] || readerItems[0];

  const handlePrev = () => {
    setActiveItemIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveItemIndex((prev) => Math.min(readerItems.length - 1, prev + 1));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='w-[95%] sm:max-w-4xl max-w-[calc(100%-2rem)] mx-auto bg-[#0a0c1b]/90 backdrop-blur-xl border-white/10 text-white rounded-3xl p-4 sm:p-6 shadow-2xl h-[95vh] flex flex-col justify-between overflow-hidden flex-1'>
        <DialogHeader className='w-full flex flex-col items-center justify-between border-b border-white/10 pb-3 gap-2'>
          <div className='w-full flex items-center justify-between pt-1'>
            <div>
              <DialogTitle className='text-lg font-bold font-display text-white flex items-center gap-2'>
                <BookOpen className='h-5 w-5 text-pw-primary' />
                My Book Reader
              </DialogTitle>
              <DialogDescription className='text-[10px] text-pw-muted'>
                Read through each cover, chapter and page with all styling and
                formatting. 
              </DialogDescription>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  setOrientation(
                    orientation === 'portrait' ? 'landscape' : 'portrait',
                  )
                }
                className='h-7 text-[10px] font-bold border-white/10 bg-white/5 hover:bg-white/10 text-pw-primary gap-1'>
                {orientation === 'portrait' ? '📱 Portrait' : '💻 Landscape'}
              </Button>
            </div>
          </div>

          <div className='flex items-center gap-4 w-full justify-between flex-wrap'>
            <div className='w-full flex-1 flex items-center gap-2'>
              <span className='text-xs text-pw-muted font-mono'>
                Zoom: {readerZoom}%
              </span>
              <input
                type='range'
                min='60'
                max='140'
                value={readerZoom}
                onChange={(e) => setReaderZoom(Number(e.target.value))}
                className='w-1/2 accent-pw-primary cursor-pointer'
              />
            </div>
          </div>
        </DialogHeader>

        {/* Reader Swiping Body */}
        <div className='flex-1 flex items-center justify-between my-1 h-full relative overflow-hidden'>
          <Button
            size='icon'
            variant='ghost'
            onClick={handlePrev}
            disabled={activeItemIndex === 0}
            className='h-10 sm:h-12 w-10 sm:w-12 rounded-full bg-white/10 bkblur text-white disabled:opacity-20 hover:bg-pw-primary z-20 shrink-0'>
            <ChevronLeft className='h-6 w-6' />
          </Button>

          <div className='flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar h-full p-2'>
            <div
              style={{
                transform: `scale(${readerZoom / 100})`,
                transformOrigin: 'center center',
              }}
              className='w-full flex justify-center transition-transform duration-200'>
              {currentItem?.type === 'front_cover' && (
                /* Premium Cover Preview */
                <div
                  className={cn(
                    'mx-auto p-8 rounded-2xl border shadow-2xl flex flex-col justify-between text-white transition-all overflow-hidden',
                    orientation === 'portrait' ?
                      'w-[320px] sm:w-[400px] aspect-[210/297]'
                    : 'w-[480px] sm:w-[560px] aspect-[297/210]',
                    coverConfig.frontCoverTemplate === 'minimal' &&
                      'bg-slate-950 border-white/10 text-left',
                    coverConfig.frontCoverTemplate === 'bold' &&
                      'border-2 border-pw-primary bg-gradient-to-b from-pw-primary/30 via-slate-950 to-slate-950 text-center',
                    coverConfig.frontCoverTemplate === 'split' &&
                      'border-l-8 border-l-pw-primary bg-slate-900 text-left',
                    coverConfig.frontCoverTemplate === 'center' &&
                      'text-center border-white/20 items-center justify-between bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950',
                    coverConfig.frontCoverTemplate === 'modern_gradient' &&
                      'bg-gradient-to-br from-pw-primary via-purple-900 to-pw-secondary border-none text-center',
                    coverConfig.frontCoverTemplate === 'editorial_classic' &&
                      'bg-[#fdfbf7] text-[#1c1917] border-stone-300 font-serif text-center',
                    coverConfig.frontCoverTemplate === 'cyberpunk_dark' &&
                      'bg-black border-pw-cyan text-pw-cyan font-mono text-left',
                    coverConfig.frontCoverTemplate === 'luxury_gold' &&
                      'bg-gradient-to-br from-amber-950 via-black to-amber-900 border border-amber-500/40 text-amber-200 text-center',
                  )}>
                  <div className='w-full space-y-2 pt-4'>
                    <span className='text-[10px] font-mono tracking-[0.3em] uppercase text-pw-primary font-bold block'>
                      PingWorld Manuscript Edition
                    </span>
                    <h1 className='text-2xl sm:text-3xl font-extrabold font-display tracking-tight leading-tight'>
                      {coverConfig.frontCoverTitle || 'Untitled Book'}
                    </h1>
                    {coverConfig.frontCoverSubtitle && (
                      <p className='text-xs sm:text-sm italic pt-1 border-t border-white/10 opacity-80'>
                        {coverConfig.frontCoverSubtitle}
                      </p>
                    )}
                  </div>
                  <div className='w-full border-t border-white/15 pt-4 space-y-1 text-xs opacity-90 font-mono'>
                    <p className='font-bold text-sm'>
                      By {coverConfig.frontCoverAuthor || 'Author'}
                    </p>
                    <p className='text-[10px] opacity-70'>
                      Published & Styled with PingWorld Studio
                    </p>
                  </div>
                </div>
              )}

              {currentItem?.type === 'chapter_header' && currentItem.data && (
                <div
                  className={cn(
                    'mx-auto p-6 rounded-2xl border border-pw-primary/30 shadow-2xl flex flex-col items-center justify-center text-center bg-slate-950 text-white space-y-4',
                    orientation === 'portrait' ?
                      'w-[320px] sm:w-[400px] aspect-[210/297]'
                    : 'w-[480px] sm:w-[560px] aspect-[297/210]',
                  )}>
                  <span className='text-xs font-mono font-bold text-pw-primary uppercase tracking-[0.3em]'>
                    CHAPTER SECTION
                  </span>
                  <h1 className='text-3xl font-extrabold font-display text-white'>
                    {currentItem.data.name}
                  </h1>
                </div>
              )}

              {currentItem?.type === 'page' && currentItem.data && (
                /* True A4 proportions for book reader page view */
                <Card
                  style={{
                    backgroundColor: paperBgColor || '#ffffff',
                    color: bodyColor || '#1e293b',
                    fontFamily: fontFamily || 'inherit',
                  }}
                  className={cn(
                    'mx-auto p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xl flex flex-col justify-between relative overflow-y-auto custom-scrollbar',
                    orientation === 'portrait' ?
                      'w-[320px] sm:w-[400px] aspect-[210/297]'
                    : 'w-[480px] sm:w-[560px] aspect-[297/210]',
                  )}>
                  <div>
                    {currentItem.data.showTitle && (
                      <h2
                        style={{
                          textAlign: currentItem.data.titleAlign || 'left',
                          color:
                            currentItem.data.titleColor ||
                            globalTitleColor ||
                            '#3b82f6',
                        }}
                        className='text-lg font-bold border-b border-slate-200/50 pb-1 mb-2'>
                        {currentItem.data.title}
                      </h2>
                    )}
                    <div
                      style={{ color: bodyColor }}
                      className='text-xs sm:text-sm leading-relaxed whitespace-pre-wrap'
                      dangerouslySetInnerHTML={{
                        __html: renderFormattedContent(
                          currentItem.data.content,
                          imagePalette,
                        ),
                      }}
                    />
                  </div>

                  {currentItem.data.footnotes &&
                    currentItem.data.footnotes.length > 0 && (
                      <div className='border-t border-slate-200 pt-3 mt-6 text-xs text-slate-500 font-sans space-y-1'>
                        {currentItem.data.footnotes.map((fn: any) => (
                          <div key={fn.id}>
                            <span className='font-bold text-pw-primary'>
                              [{fn.number}]
                            </span>{' '}
                            {fn.text}
                          </div>
                        ))}
                      </div>
                    )}
                </Card>
              )}

              {currentItem?.type === 'back_cover' && (
                <div
                  className={cn(
                    'mx-auto p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between text-white bg-slate-900 text-center',
                    orientation === 'portrait' ?
                      'w-[320px] sm:w-[400px] aspect-[210/297]'
                    : 'w-[480px] sm:w-[560px] aspect-[297/210]',
                    coverConfig.backCoverTemplate === 'bold' &&
                      'border-2 border-pw-primary bg-gradient-to-t from-pw-primary/20 to-slate-950',
                    coverConfig.backCoverTemplate === 'split' &&
                      'border-r-8 border-r-pw-primary bg-slate-900',
                  )}>
                  <div className='my-auto space-y-4'>
                    <h3 className='text-lg font-bold text-pw-primary uppercase tracking-widest'>
                      Summary
                    </h3>
                    <p className='text-sm leading-relaxed text-slate-300 italic max-w-md mx-auto'>
                      &quot;{coverConfig.backCoverSummary}&quot;
                    </p>
                  </div>
                  <div className='text-xs font-mono text-slate-500 border-t border-white/10 pt-4'>
                    PING WORLD CREATIVE STUDIOS
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            size='icon'
            variant='ghost'
            onClick={handleNext}
            disabled={activeItemIndex === readerItems.length - 1}
            className='h-10 sm:h-12 w-10 sm:w-12 rounded-full bg-white/10 text-white disabled:opacity-20 hover:bg-pw-primary z-20 shrink-0'>
            <ChevronRight className='h-6 w-6' />
          </Button>
        </div>

        <DialogFooter className='flex flex-row items-center gap-4 justify-between rounded-full bg-pw-surface/20 backdrop-blur-md'>
          <span className='text-xs font-mono text-pw-muted'>
            Page {activeItemIndex + 1} of {readerItems.length}
          </span>
          <Button
            onClick={() => onOpenChange(false)}
            className='btn-primary h-9 px-6 text-xs font-bold rounded-full'>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
