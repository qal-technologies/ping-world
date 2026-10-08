'use client';

import { Badge, CheckCircle, Diamond, Trophy } from 'lucide-react';
import { capFirst, cn } from '@/lib/utils';
import React from 'react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import {usePageLayout} from '@/components/layout';

const textAlign: 'center' | 'left' | 'right' = 'center';
const completionIcon: 'check' | 'diamond' | 'badge' | 'trophy' = 'diamond';
const endTitle = "You're all set!";
const endMsg = 'Thank you for completing...';
export default function TestPage() {
  const { setHideNavbar, setHideFooter, setPaddingTop } = usePageLayout();
  setHideNavbar(true);
  setHideFooter(true);
  setPaddingTop('pt-0');
  const [isEndMsgExpanded, setIsEndMsgExpanded] = useState(false);

  return (
    <div
      key='completion-view'
      className='quiz-taker-font relative h-[100dvh] w-full bg-[#0A0C1B] text-white flex items-center justify-center p-4 overflow-hidden'>
      <div
        className={cn(
          'max-w-md w-full space-y-1 relative z-10 text-center max-h-full overflow-hidden',
          textAlign === 'center' && 'text-center',
          textAlign === 'left' && 'text-left',
          textAlign === 'right' && 'text-right',
              )}>
              
        <div className='flex flex-col item-center sticky top-0 z-50 space-y-2 bg-[#0A0C1B]/80 bkblur w-full h-full p-2 pt-3'>
          <div
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center border mb-3',
              textAlign === 'left' ? 'ml-0 mr-auto'
              : textAlign === 'right' ? 'ml-auto mr-0'
              : 'mx-auto',
              completionIcon === 'diamond' &&
                'bg-pw-success/10 border-pw-success/20',
              completionIcon === 'badge' &&
                'bg-pw-primary/10 border-pw-primary/20',
              completionIcon === 'trophy' &&
                'bg-pw-warning/10 border-pw-warning/20',
            )}>
            {completionIcon === 'diamond' ?
              <Diamond className='h-12 w-12 text-pw-success animate-float' />
            : completionIcon === 'badge' ?
              <Badge className='h-12 w-12 text-pw-primary' />
            : completionIcon === 'trophy' ?
              <Trophy className='h-12 w-12 text-pw-warning' />
            : <CheckCircle className='h-12 w-12 text-pw-success' />}
          </div>
          <h1
            className='text-lg font-extrabold font-display whitespace-pre-wrap'
            dangerouslySetInnerHTML={{ __html: endTitle }}
          />
          <div className='relative'>
            <p
              className={cn(
                'text-white/90 text-sm mb-1 whitespace-pre-wrap transition-all',
                !isEndMsgExpanded && endMsg.length > 80 ?
                  'line-clamp-3 max-h-24 overflow-hidden'
                : 'max-h-96 overflow-y-auto pr-1',
              )}
              dangerouslySetInnerHTML={{ __html: endMsg }}
            />
            {endMsg.length > 80 && (
              <button
                type='button'
                onClick={() => setIsEndMsgExpanded(!isEndMsgExpanded)}
                className='text-pw-cyan hover:underline text-[11px] font-semibold mt-1 inline-flex items-center gap-1 focus:outline-none'>
                {isEndMsgExpanded ? 'Read less' : 'Read more...'}
              </button>
            )}
          </div>

          <div className='divider mt-4 sm:hidden' />
        </div>

        <div className='block space-y-2 w-full h-[65dvh] overflow-y-auto no-scrollbar'>
          <Card className='p-2 sm:p-6 bg-transparent ring-0 sm:bg-white/[0.02] sm:bkblur sm:backdrop-blur-lg sm:border sm:border-white/5 h-fit sm:rounded-2xl space-y-4 mt-4 text-left'>
            <div className='text-center'>
              <span className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block mb-1'>
                TOTAL OVERALL SCORE
              </span>
              <span className='text-3xl font-bold font-mono text-pw-primary'>
                10 / 20
              </span>
            </div>

            <div className='border-t border-white/5 pt-3 space-y-1.5'>
              <div className='flex items-center justify-between text-xs p-2 bg-white/5 rounded-xl'>
                <span className='font-bold text-white'>
                  Other Questions (10)
                </span>
                <span className='font-mono text-pw-cyan font-bold'>2 / 5</span>
              </div>
            </div>

            {/* Group / Category Questions Score Breakdown */}

            <div className='border-t border-white/5 pt-3 space-y-2'>
              <span className='text-[10px] text-pw-primary uppercase font-bold tracking-widest block'>
                Category Scores
              </span>
              <div className='flex items-center justify-between text-xs p-2 bg-white/5 rounded-xl'>
                <span className='font-bold text-white'>
                  📁 {capFirst('group')} (20)
                </span>
                <span className='font-mono text-pw-primary font-bold'>
                  5 / 10
                </span>
              </div>
            </div>
                  </Card>
                  
          
                  <div className='divider my-4 sm:hidden' />

          {/* Per-question explanation review */}

          <Card className='p-2 sm:p-5 bg-transparent ring-0 sm:bg-white/[0.02] sm:bkblur sm:border h-fit sm:border-white/5 sm:rounded-2xl space-y-3 mt-4 text-left max-h-[300px] overflow-y-auto no-scrollbar'>
            <span className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block'>
              Question Review & Explanations
            </span>

            <div
              className={cn(
                'p-2 sm:p-3 rounded-xl border text-xs space-y-1.5',
                'bg-pw-success/5 border-pw-success/20',
              )}>
              <div className='flex items-start gap-2'>
                <span className={cn('font-bold shrink-0', 'text-pw-success')}>
                  .
                </span>
                <span className='text-white/80 whitespace-pre-wrap'>
                  Question here....
                </span>
              </div>

              {/* Question img attachment if present */}
              <div className='pl-5 my-1'>
                <Image
                  src='/images/logo.png'
                  alt='Question media'
                  width={320}
                  height={160}
                  unoptimized
                  className='max-h-24 rounded-lg object-contain border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity'
                />
              </div>

              <p className='text-pw-muted pl-5 whitespace-pre-wrap'>
                Your answer:{' '}
                <span className='font-bold text-white'>Answer...</span>
              </p>

              {/* Selected option img display */}
              <div className='pl-5 my-1 flex items-center gap-2'>
                <span className='text-[10px] text-pw-muted'>Selected img:</span>
                <Image
                  src='/images/logo.png'
                  alt='Selected option attachment'
                  width={48}
                  height={48}
                  unoptimized
                  className='h-12 w-12 rounded-lg object-cover border border-white/10 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                />
              </div>

              <Image
                src='/images/logo.png'
                alt={'alt'}
                width={224}
                height={112}
                unoptimized
                className='max-h-28 rounded-lg object-contain border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity'
              />
              <button
                type='button'
                className='text-[10px] text-pw-cyan hover:underline truncate'>
                Preview
              </button>

              {/* Show correct answer if taker got it wrong */}

              <div className='pl-5 text-xs text-pw-success/90 font-medium space-y-1 pt-0.5'>
                <p>
                  Correct answer:{' '}
                  <span className='font-bold text-pw-success'>
                    Answer (correct)
                  </span>
                </p>

                <div className='flex items-center gap-2 mt-1'>
                  <span className='text-[10px] text-pw-muted'>
                    Correct img:
                  </span>
                  <Image
                    src='/images/logo.png'
                    alt='Correct option attachment'
                    width={48}
                    height={48}
                    unoptimized
                    className='h-12 w-12 rounded-lg object-cover border border-pw-success/30 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                  />
                </div>
              </div>

              <p className='pl-5 text-pw-cyan/90 italic whitespace-pre-wrap'>
                Explanation...
              </p>
              <p className='pl-5 text-pw-primary/90 italic whitespace-pre-wrap'>
                Correct one
              </p>
            </div>
          </Card>
        </div>
              
        {/* PingWorld compliance disclaimer footer on completion screen */}
              <div className='text-[10px] text-pw-muted leading-tight max-w-sm mx-auto text-center font-body'>
                  <div className='divider my-4'/>
          <p>
            {' '}
            PingWorld is a service provider hosting this assessment. We are not
            responsible for any questions, responses, or outcomes generated in
            this assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
