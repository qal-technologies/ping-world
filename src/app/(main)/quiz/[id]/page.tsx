'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Check,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HybridStorage } from '@/lib/storage-utils';
import { cn } from '@/lib/utils';
import React from 'react';
import type { Quiz } from '../page';

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'dropdown'
  | 'checkbox'
  | 'input';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctIndex: any;
  accessory?: 'none' | 'calculator';
}

// --- Accessory Components ---
const Calculator = () => {
  const [val, setVal] = useState('');
  return (
    <Card className='p-4 bg-pw-surface border-white/10 shadow-2xl w-64'>
      <div className='bg-black/20 p-2 rounded mb-2 text-right font-mono text-lg min-h-[40px] break-all'>
        {val || '0'}
      </div>
      <div className='grid grid-cols-4 gap-1'>
        {[
          '7',
          '8',
          '9',
          '/',
          '4',
          '5',
          '6',
          '*',
          '1',
          '2',
          '3',
          '-',
          '0',
          '.',
          '=',
          '+',
        ].map((btn) => (
          <Button
            key={btn}
            variant='ghost'
            size='sm'
            className='h-8 p-0'
            onClick={() => {
              if (btn === '=') {
                try {
                  setVal(eval(val).toString());
                } catch {
                  setVal('Error');
                }
              } else {
                setVal((v) => v + btn);
              }
            }}>
            {btn}
          </Button>
        ))}
        <Button
          variant='ghost'
          size='sm'
          className='col-span-4 h-8 text-[10px]'
          onClick={() => setVal('')}>
          CLEAR
        </Button>
      </div>
    </Card>
  );
};

export default function PublicQuizPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [content, setContent] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      const data = await HybridStorage.getAll('quiz');
      const target = data.find((q: any) => String(q.id) === String(params.id));

      if (target) {
        setQuiz(target);
      } else if (params.id === 'demo') {
        setQuiz({
          title: 'Demo Quiz',
          type: 'quiz',
          createdAt: Date.now(),
          description: 'This is a description',
          id: 'tttvvrb34cr',
          correctOption: true,
          questions: [
            {
              id: 'demo',
              type: 'multiple_choice',
              text: 'Welcome to Ping World! Is this tool free?',
              options: ['Yes, absolutely', 'No', 'Maybe', "I don't know"],
              correctIndex: 0,
            },
          ],
          endScreen: {
            title: 'Demo Finished!',
            message: 'Thanks for trying the demo.',
          },
        });
      }
    };
    loadQuiz();
  }, []);

  const q = quiz?.questions[currentQuestion];

  const handleNext = () => {
    if (q?.type === 'checkbox' && selectedOptions.length === 0) {
      toast.error('Please select at least one answer');
      return;
    }
    if (
      selectedOption === null &&
      q?.type !== 'input' &&
      q?.type !== 'checkbox'
    ) {
      toast.error('Please select an answer');
      return;
    }

    // Scoring logic (only if type is quiz)
    let correct = false;
    if (quiz?.type === 'quiz' && q) {
      if (q.type === 'checkbox') {
        const correctIndices =
          Array.isArray(q.correctIndex) ? q.correctIndex
          : typeof q.correctIndex === 'number' ? [q.correctIndex]
          : [];

        correct =
          selectedOptions.length === correctIndices.length &&
          selectedOptions.every((val) => correctIndices.includes(val));
      } else if (q.type === 'input') {
        correct =
          content.toLowerCase().trim() ===
          String(q.correctIndex || '')
            .toLowerCase()
            .trim();
      } else {
        correct = selectedOption === q.correctIndex;
      }

      if (correct) setScore((s) => s + 1);
      setIsCorrect(correct);
      setShowFeedback(true);

      // Delay for feedback
      setTimeout(() => {
        proceedToNext();
      }, 1500);
    } else {
      proceedToNext();
    }
  };

  const proceedToNext = () => {
    setShowFeedback(false);
    if (quiz && currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion((c) => c + 1);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    } else {
      setIsFinished(true);
    }
  };

  if (!quiz) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-6'>
        <Puzzle className='h-12 w-12 text-pw-muted mb-4 opacity-20' />
        <h2 className='text-2xl font-bold'>Quiz Not Found</h2>
        <p className='text-pw-muted mt-2'>
          The quiz you are looking for does not exist or has been removed. (
          {String(params)})
        </p>
        <Link
          href='/tools'
          className='mt-6 text-pw-primary font-bold inline-flex items-center gap-2'>
          <ArrowLeft className='h-4 w-4' /> Back to Tools
        </Link>
      </div>
    );
  }

  if (isFinished && quiz?.endScreen) {
    return (
      <div className='relative min-h-screen overflow-hidden bg-pw-bg flex items-center justify-center'>
        <div className='globe-div fixed inset-0'>
          <div className='globe opacity-20' />
        </div>

        <div className='container relative z-10 mx-auto px-6 py-20 max-w-2xl text-center'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}>
            <div className='w-20 h-20 bg-pw-success/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-pw-success/20'>
              <CheckCircle2 className='h-10 w-10 text-pw-success' />
            </div>
            <h1 className='text-4xl font-extrabold font-display mb-4'>
              {quiz.endScreen.title}
            </h1>
            <p className='text-pw-muted text-lg mb-8'>
              {quiz.endScreen.message}
            </p>

            {quiz.type === 'quiz' && quiz.endScreen.showPerformance && (
              <Card className='card-glow p-5 mb-8 bg-white/5 border-white/10'>
                <div className='text-sm font-bold text-pw-muted uppercase mb-2'>
                  Your Performance
                </div>
                <div className='text-3xl font-bold mb-4'>
                  {score} / {quiz.questions.length}
                </div>
                <div className='w-full h-4 bg-pw-surface rounded-full overflow-hidden border border-white/5 mb-4'>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(score / quiz.questions.length) * 100}%`,
                    }}
                    className='h-full gradient-brand'
                  />
                </div>
              </Card>
            )}

            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button
                onClick={() => window.location.reload()}
                variant='outline'
                className='h-12 px-4 border-white/10'>
                Try Again
              </Button>
              <Link
                href='/tools'
                className='btn-primary h-12 flex items-center px-8'>
                Browse More Tools
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative min-h-screen overflow-hidden bg-pw-bg'>
      {/* Planetary Background */}
      <div className='globe-div fixed inset-0'>
        <div className='globe opacity-40' />
      </div>

      <div className='container relative z-10 mx-auto px-4 md:px-6 py-10 md:py-10 max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12'>
        <div className='lg:col-span-8'>
          <div className='mb-12'>
            <div className='flex justify-between items-end mb-6'>
              <div>
                <div className='badge mb-4'>
                  Question {currentQuestion + 1} of {quiz.questions.length}
                </div>
                <h1 className='text-3xl font-bold font-display'>
                  {quiz.title}
                </h1>
              </div>
              {quiz.type === 'quiz' && (
                <div className='text-[10px] font-bold text-pw-muted uppercase tracking-widest text-right'>
                  Score: {score}
                </div>
              )}
            </div>
            <div className='w-full h-1 bg-white/5 rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-pw-primary'
                animate={{
                  width: `${(currentQuestion / quiz.questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <Card className='card-glow p-2 md:p-4 mb-8 bg-pw-surface border-white/10'>
            <div className='flex justify-between items-start mb-4'>
              <h2 className='text-lg md:text-2xl pt-4 font-bold leading-relaxed flex-1'>
                {q?.text}
              </h2>
              {quiz.correctOption && showFeedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'ml-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border',
                    isCorrect ?
                      'bg-pw-success/10 border-pw-success text-pw-success'
                    : 'bg-pw-danger/10 border-pw-danger text-pw-danger',
                  )}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </motion.div>
              )}
            </div>

            <AnimatePresence mode='wait'>
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}>
                {q?.type === 'dropdown' ?
                  <div className='flex justify-center py-8'>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant='outline'
                          className='h-14 px-8 gap-4 min-w-[280px] bg-white/5 border-white/10 text-lg'>
                          {selectedOption !== null ?
                            q.options[selectedOption]
                          : 'Select an answer...'}
                          <ChevronDown className='h-5 w-5 text-pw-muted' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='bg-pw-surface border-white/10 w-72 p-2'>
                        {q.options?.map((opt, idx) => (
                          <DropdownMenuItem
                            key={idx}
                            onClick={() => setSelectedOption(idx)}
                            className='h-12 text-base gap-3 focus:bg-pw-primary/10 rounded-lg cursor-pointer'>
                            {selectedOption === idx && (
                              <Check className='h-4 w-4 text-pw-primary' />
                            )}
                            {opt}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                : q?.type === 'input' ?
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder='Type your answer here...'
                    className='w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-lg focus:border-pw-primary focus:outline-none resize-none transition-all'
                  />
                : <div
                    className={cn(
                      'grid gap-3',
                      q?.type === 'multiple_choice' ?
                        'grid-cols-1'
                      : 'grid-cols-2',
                    )}>
                    {q?.options?.map((opt, idx) => {
                      const isSelected =
                        q.type === 'checkbox' ?
                          selectedOptions.includes(idx)
                        : selectedOption === idx;

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (q.type === 'checkbox') {
                              setSelectedOptions((prev) =>
                                prev.includes(idx) ?
                                  prev.filter((i) => i !== idx)
                                : [...prev, idx],
                              );
                            } else {
                              setSelectedOption(idx);
                            }
                          }}
                          className={cn(
                            'w-full p-2 md:p-3 text-left rounded-2xl border transition-all duration-200 flex items-center justify-between group',
                            isSelected ?
                              'bg-pw-primary/10 border-pw-primary text-pw-text shadow-lg shadow-pw-primary/10'
                            : 'bg-white/5 border-white/5 text-pw-muted hover:border-white/10 hover:bg-white/10',
                          )}>
                          <span className='font-medium text-sm md:text-base'>
                            {opt}
                          </span>
                          <CheckCircle
                            className={cn(
                              'h-4 w-4 transition-all opacity-0',
                              isSelected ?
                                'opacity-100 translate-x-0'
                              : 'group-hover:opacity-50 -translate-x-2',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                }
              </motion.div>
            </AnimatePresence>
          </Card>

          <div className='flex justify-end'>
            <Button
              onClick={handleNext}
              className='btn-primary h-12 w-[20vmin] text-lg gap-2'>
              {currentQuestion + 1 === quiz.questions.length ?
                'Finish'
              : 'Next'}
              <ArrowRight className='h-5 w-5' />
            </Button>
          </div>
        </div>

        {/* Sidebar for accessories */}
        <div className='lg:col-span-4 space-y-6'>
          {q?.accessory === 'calculator' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}>
              <h4 className='text-[10px] font-bold text-pw-muted uppercase tracking-widest mb-3 px-1'>
                Tool Assistant
              </h4>
              <Calculator />
            </motion.div>
          )}

          <div className='p-6 bg-white/5 border border-white/5 rounded-2xl'>
            <h4 className='text-xs font-bold mb-4 flex items-center gap-2'>
              <Puzzle className='h-4 w-4 text-pw-primary' /> Quiz Info
            </h4>
            <p className='text-xs text-pw-muted leading-relaxed'>
              {quiz.description ||
                'Interactive assessment built on Ping World platform.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
