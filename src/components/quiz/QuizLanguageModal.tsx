'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QUIZ_SYNTAX_DOCS } from '@/lib/quiz/quiz-language-docs';
import { toast } from 'sonner';

interface QuizLanguageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuizLanguageModal({
  open,
  onOpenChange,
}: QuizLanguageModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    toast.success('Syntax copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[85vh] overflow-y-auto bg-[#0a0c1a]/95 bkblur border-white/10 text-white p-6 shadow-2xl rounded-2xl custom-scrollbar'>
        <DialogHeader className='space-y-2 border-b border-white/10 pb-4'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <div className='flex items-center gap-2.5'>
              <div className='p-2 rounded-xl bg-pw-primary/10 text-pw-primary border border-pw-primary/20'>
                <Code2 className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-base font-black tracking-wide text-white flex items-center gap-2'>
                  {QUIZ_SYNTAX_DOCS.title}
                  <span className='text-[10px] font-mono px-2 py-0.5 rounded-full bg-pw-primary/20 text-pw-primary border border-pw-primary/30'>
                    v{QUIZ_SYNTAX_DOCS.version}
                  </span>
                </DialogTitle>
                <DialogDescription className='text-xs text-pw-muted mt-0.5'>
                  {QUIZ_SYNTAX_DOCS.description}
                </DialogDescription>
              </div>
            </div>

            <Link href={QUIZ_SYNTAX_DOCS.mainDocsUrl} target='_blank'>
              <Button
                variant='outline'
                size='sm'
                className='text-xs font-bold gap-1.5 border-white/10 hover:border-pw-primary/50 text-pw-primary hover:bg-pw-primary/10'>
                <BookOpen className='h-3.5 w-3.5' /> Read Full Documentation
                <ExternalLink className='h-3 w-3 opacity-60' />
              </Button>
            </Link>
          </div>
        </DialogHeader>

        {/* Parameters & Keywords Legend */}
        <div className='my-4 p-4 rounded-xl bg-black/40 border border-white/5 space-y-3'>
          <div className='flex items-center gap-2 text-pw-cyan text-xs font-bold uppercase tracking-wider'>
            <Info className='h-4 w-4' /> Parameters & Keywords Guide
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs'>
            {QUIZ_SYNTAX_DOCS.parametersExplained.map((p, idx) => (
              <div
                key={idx}
                className='p-2.5 rounded-lg bg-white/2 border border-white/5 space-y-1'>
                <code className='text-[11px] font-mono font-bold text-pw-primary bg-pw-primary/10 px-1.5 py-0.5 rounded'>
                  {p.param}
                </code>
                <p className='text-[11px] text-pw-muted leading-relaxed'>
                  {p.meaning}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Sections */}
        <div className='space-y-6 mt-6'>
          {QUIZ_SYNTAX_DOCS.tokenCategories.map((cat, catIdx) => (
            <div key={catIdx} className='space-y-3'>
              <h3 className='text-xs font-black uppercase tracking-wider text-pw-primary flex items-center gap-2 border-b border-white/5 pb-1'>
                <Sparkles className='h-3.5 w-3.5 text-pw-cyan' /> {cat.category}
              </h3>

              <div className='grid grid-cols-1 gap-3'>
                {cat.items.map((item, itemIdx) => {
                  const copyKey = `${catIdx}-${itemIdx}`;
                  const isCopied = copiedIndex === copyKey;
                  return (
                    <div
                      key={itemIdx}
                      className='p-3.5 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors space-y-2'>
                      <div className='flex items-center justify-between gap-2 flex-wrap'>
                        <span className='font-bold text-xs text-white'>
                          {item.name}
                        </span>
                        <div className='flex items-center gap-2'>
                          <code className='text-[11px] font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10 text-pw-cyan'>
                            {item.syntax}
                          </code>
                          <button
                            type='button'
                            onClick={() => handleCopy(item.syntax, copyKey)}
                            title='Copy Syntax'
                            className='p-1 rounded hover:bg-white/10 text-pw-muted hover:text-white transition-colors'>
                            {isCopied ? (
                              <Check className='h-3.5 w-3.5 text-pw-success' />
                            ) : (
                              <Copy className='h-3.5 w-3.5' />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className='text-[11px] text-pw-muted'>{item.description}</p>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono bg-black/50 p-2.5 rounded-lg border border-white/5'>
                        <div>
                          <span className='text-pw-muted block mb-0.5 uppercase tracking-wider text-[8px]'>
                            Input Syntax
                          </span>
                          <span className='text-pw-warning break-all'>
                            {item.example}
                          </span>
                        </div>
                        <div>
                          <span className='text-pw-muted block mb-0.5 uppercase tracking-wider text-[8px]'>
                            Rendered Result
                          </span>
                          <span className='text-pw-success break-all'>
                            &quot;{item.result}&quot;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
