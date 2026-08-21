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
  frontCoverTemplate: 'minimal' | 'bold' | 'split' | 'center';
  backCoverTemplate: 'minimal' | 'bold' | 'split' | 'center';
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

  // jules edit: Combine cover items, chapters, and pages in sequential index order
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl bg-[#0a0c1b] border-white/10 text-white rounded-3xl p-6 shadow-2xl h-[90vh] flex flex-col justify-between overflow-hidden relative'>
        <DialogHeader className='flex flex-row items-center justify-between border-b border-white/10 pb-4'>
          <div>
            <DialogTitle className='text-lg font-bold font-display text-white flex items-center gap-2'>
              <BookOpen className='h-5 w-5 text-pw-primary' /> Interactive Reader
            </DialogTitle>
            <DialogDescription className='text-xs text-pw-muted'>
              Horizontal swiping reader with font and sizing.
            </DialogDescription>
          </div>

          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-pw-muted font-mono'>Zoom: {readerZoom}%</span>
              <input
                type='range'
                min='60'
                max='140'
                value={readerZoom}
                onChange={(e) => setReaderZoom(Number(e.target.value))}
                className='w-24 accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Explicit Close Button */}
            <Button
              size='icon'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='h-8 w-8 text-pw-muted hover:text-white rounded-full bg-white/5 border border-white/10'>
              <X className='h-4 w-4' />
            </Button>
          </div>
        </DialogHeader>

        {/* Reader Swiping Body */}
        <div className='flex-1 flex items-center justify-between px-4 my-2 relative overflow-hidden'>
          <Button
            size='icon'
            variant='ghost'
            onClick={handlePrev}
            disabled={activeItemIndex === 0}
            className='h-12 w-12 rounded-full bg-white/10 text-white disabled:opacity-20 hover:bg-pw-primary z-20 shrink-0'>
            <ChevronLeft className='h-6 w-6' />
          </Button>

          <div className='flex-1 flex items-center justify-center overflow-y-auto px-4 py-2 custom-scrollbar h-full'>
            <div
              style={{
                transform: `scale(${readerZoom / 100})`,
                transformOrigin: 'center center',
              }}
              className='w-full max-w-xl transition-transform duration-200'>
              {currentItem?.type === 'front_cover' && (
                <div
                  className={cn(
                    'p-10 rounded-2xl border border-white/10 shadow-2xl min-h-[460px] flex flex-col justify-between text-white bg-slate-900',
                    coverConfig.frontCoverTemplate === 'bold' && 'border-2 border-pw-primary bg-gradient-to-b from-pw-primary/20 to-slate-950 text-center',
                    coverConfig.frontCoverTemplate === 'split' && 'border-l-8 border-l-pw-primary bg-slate-900 text-left',
                    coverConfig.frontCoverTemplate === 'center' && 'text-center border-white/20 items-center justify-center',
                  )}>
                  <div className='space-y-4 my-auto'>
                    <h1 className='text-3xl font-extrabold font-display tracking-tight text-pw-primary'>
                      {coverConfig.frontCoverTitle || 'Untitled Book'}
                    </h1>
                    <p className='text-sm text-slate-300 italic'>
                      {coverConfig.frontCoverSubtitle}
                    </p>
                  </div>
                  <div className='border-t border-white/10 pt-4 space-y-1 text-xs text-slate-400 font-mono'>
                    <p>By {coverConfig.frontCoverAuthor || 'Author'}</p>
                    <p className='text-[10px] text-slate-500'>PING WORLD PUBLISHING</p>
                  </div>
                </div>
              )}

              {currentItem?.type === 'chapter_header' && currentItem.data && (
                <div className='p-10 rounded-2xl border border-pw-primary/30 shadow-2xl min-h-[460px] flex flex-col items-center justify-center text-center bg-slate-950 text-white space-y-4'>
                  <span className='text-xs font-mono font-bold text-pw-primary uppercase tracking-[0.3em]'>
                    CHAPTER SECTION
                  </span>
                  <h1 className='text-3xl font-extrabold font-display text-white'>
                    {currentItem.data.name}
                  </h1>
                </div>
              )}

              {currentItem?.type === 'page' && currentItem.data && (
                <Card
                  style={{
                    backgroundColor: paperBgColor,
                    color: bodyColor,
                    fontFamily: fontFamily,
                  }}
                  className='p-10 rounded-2xl border border-slate-200 shadow-2xl min-h-[460px] flex flex-col justify-between relative'>
                  <div>
                    {currentItem.data.showTitle && (
                      <h2
                        style={{
                          textAlign: currentItem.data.titleAlign || 'left',
                          color: currentItem.data.titleColor || globalTitleColor || '#3b82f6',
                        }}
                        className='text-2xl font-bold border-b border-slate-200/50 pb-3 mb-4'>
                        {currentItem.data.title}
                      </h2>
                    )}
                    <div
                      style={{ color: bodyColor }}
                      className='text-sm leading-relaxed whitespace-pre-wrap'
                      dangerouslySetInnerHTML={{
                        __html: renderFormattedContent(currentItem.data.content, imagePalette),
                      }}
                    />
                  </div>

                  {currentItem.data.footnotes && currentItem.data.footnotes.length > 0 && (
                    <div className='border-t border-slate-200 pt-3 mt-6 text-xs text-slate-500 font-sans space-y-1'>
                      {currentItem.data.footnotes.map((fn: any) => (
                        <div key={fn.id}>
                          <span className='font-bold text-pw-primary'>[{fn.number}]</span> {fn.text}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {currentItem?.type === 'back_cover' && (
                <div
                  className={cn(
                    'p-10 rounded-2xl border border-white/10 shadow-2xl min-h-[460px] flex flex-col justify-between text-white bg-slate-900 text-center',
                    coverConfig.backCoverTemplate === 'bold' && 'border-2 border-pw-primary bg-gradient-to-t from-pw-primary/20 to-slate-950',
                    coverConfig.backCoverTemplate === 'split' && 'border-r-8 border-r-pw-primary bg-slate-900',
                  )}>
                  <div className='my-auto space-y-4'>
                    <h3 className='text-lg font-bold text-pw-primary uppercase tracking-widest'>Summary</h3>
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
            className='h-12 w-12 rounded-full bg-white/10 text-white disabled:opacity-20 hover:bg-pw-primary z-20 shrink-0'>
            <ChevronRight className='h-6 w-6' />
          </Button>
        </div>

        <DialogFooter className='border-t border-white/10 pt-3 flex flex-row items-center justify-between'>
          <span className='text-xs font-mono text-pw-muted'>
            Item {activeItemIndex + 1} of {readerItems.length}
          </span>
          <Button
            onClick={() => onOpenChange(false)}
            className='btn-primary h-9 px-6 text-xs font-bold'>
            Close Reader
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
