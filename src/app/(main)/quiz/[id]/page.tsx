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
  ChevronLeft,
  Brain,
  MessageCircle,
  Clock,
  ShieldCheck,
  Sun,
  Moon,
  EyeOff,
  AlertTriangle,
  Lock,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
import { capFirst, cn } from '@/lib/utils';
import React from 'react';
import type { Quiz } from '../page';
import { useParams } from 'next/navigation';

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'dropdown'
  | 'checkbox'
  | 'input';

export interface QuizOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: (string | QuizOption)[];
  correctIndex: any;
  accessory?: 'none' | 'calculator';
  correctExplanation?: string;
}

// --- Accessory Components ---
const Calculator = () => {
  const [val, setVal] = useState('');
  return (
    <Card className='p-4 bg-pw bkblur border-white/10 shadow-2xl w-70 m-2'>
      <div className='bg-black/20 p-2 py-4 rounded-lg mb-2 text-right font-mono text-lg min-h-[40px] break-all border-white/10'>
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
          '+',
          'C',
          '=',
          'del',
        ].map((btn, index) => {
          if (btn === '=') {
            return (
              <Button
                key={btn + index + 'rfsc3gyuug'}
                variant='secondary'
                size='sm'
                className='mt-2 col-span-3 text-white text-[18px] h-8 p-0 border-white/10'
                onClick={() => {
                  try {
                    setVal(eval(val).toString());
                  } catch {
                    setVal('Error');
                  }
                }}>
                {btn}
              </Button>
            );
          }
          if (btn === 'del') {
            return (
              <Button
                key={btn + index +'ytdvserrfurats'}
                variant='destructive'
                size='sm'
                className='mt-2 h-8 p-0'
                onClick={() => {
                  try {
                    setVal((e) => e.slice(0, e.length - 1));
                  } catch {
                    setVal('Error');
                  }
                }}>
                {btn}
              </Button>
            );
          }
          if (btn === 'C') {
            return (
              <Button
                key={btn + index + 'uigdtrdsrsdtdvytrd'}
                size='sm'
                className='h-8 text-[10px]'
                onClick={() => setVal('')}>
                {btn}
              </Button>
            );
          }
          return (
            <Button
              key={btn + index + 'usdfghcasdtfg7gy'}
              variant='outline'
              size='sm'
              className='h-8 p-0 border-white/10'
              onClick={() => {
                if (val === 'Error') setVal('');
                setVal((v) => v + btn);
              }}>
              {btn}
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

export default function PublicQuizPage() {
  const params = useParams();
  const { id: quizId } = params;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Record<string, (string | QuizOption)[]>
  >({});
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [hasAlreadyCompleted, setHasAlreadyCompleted] = useState(false);

  const [started, setStart] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const [isLoading, setLoading] = useState(true);
  const [detailsCollected, setDetailsCollected] = useState(false);
  const [userData, setUserData] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [quizTheme, setQuizTheme] = useState<'dark' | 'light'>('dark');
  const [cheatAttempts, setCheatAttempts] = useState(0);
  const [showSecurityProtocol, setShowSecurityProtocol] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const pendingUnloadCb = React.useRef<(() => void) | null>(null);

  // 1. Initial Load
  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      const data = await HybridStorage.getAll('quiz');
      const target = (data.find((q: any) => String(q.id) === String(quizId)) ||
        null) as Quiz | null;

      if (target) {
        // Auth check if enabled
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!target.askDetails && !session) {
          setAuthRequired(true);
        }

        // Migration: Ensure options have IDs
        const migratedQuestions = target.questions.map((q) => {
          if (q.options.length > 0 && typeof q.options[0] === 'string') {
            const optionsWithIds = q.options.map((opt, idx) => ({
              id: `${q.id}-opt-${idx}`,
              text: opt as string,
            }));

            let newCorrectIndex = q.correctIndex;
            if (typeof q.correctIndex === 'number' && target.type === 'quiz') {
              newCorrectIndex = optionsWithIds[q.correctIndex]?.id;
            } else if (
              Array.isArray(q.correctIndex) &&
              q.correctIndex.length > 0 &&
              typeof q.correctIndex[0] === 'number'
            ) {
              newCorrectIndex = q.correctIndex.map(
                (idx) => optionsWithIds[idx]?.id,
              );
            }

            return {
              ...q,
              options: optionsWithIds,
              correctIndex: newCorrectIndex,
            };
          }
          return q;
        });

        const finalQuiz = { ...target, questions: migratedQuestions };
        setQuiz(finalQuiz);

        // Completion check
        const completionMarker = localStorage.getItem(
          `completed_quiz_${finalQuiz.id}`,
        );
        if (completionMarker && !finalQuiz.allowRetry) {
          setHasAlreadyCompleted(true);
        }

        // Shuffle questions
        let questionsToUse = [...migratedQuestions];
        if (finalQuiz.randomizeQuestions) {
          for (let i = questionsToUse.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questionsToUse[i], questionsToUse[j]] = [
              questionsToUse[j],
              questionsToUse[i],
            ];
          }
        }
        setActiveQuestions(questionsToUse);

        // Pre-shuffle options
        if (finalQuiz.randomizeOptions) {
          const shuffled: Record<string, (string | QuizOption)[]> = {};
          questionsToUse.forEach((question) => {
            const opts = [...question.options];
            for (let i = opts.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [opts[i], opts[j]] = [opts[j], opts[i]];
            }
            shuffled[question.id] = opts;
          });
          setShuffledOptions(shuffled);
        }
      }
      setLoading(false);
    };
    loadQuiz();
  }, [quizId]);

  // 2. Timer Setup
  useEffect(() => {
    if (started && quiz?.hasTimer && !isFinished) {
      const minutes = typeof quiz.hasTimer === 'number' ? quiz.hasTimer : 10;
      setTimeLeft(minutes * 60);
    }
  }, [started, quiz]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev > 1) return prev - 1;
        finalizeQuiz(userAnswers);
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished, userAnswers]);

  // 3. Security: Multi-Tab Monitoring
  useEffect(() => {
    if (!started || !quiz?.enforceSecurity || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const nextAttempts = cheatAttempts + 1;
        setCheatAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          toast.error(
            'Multiple security violations detected. Auto-submitting assessment.',
          );
          finalizeQuiz(userAnswers);
        } else {
          toast.warning(
            `Security Warning (${nextAttempts}/3): Tab switching is prohibited. Assessment will auto-submit on 3 violations.`,
            {
              duration: 5000,
            },
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [started, quiz, cheatAttempts, userAnswers, isFinished]);

  // 4. Reload / Navigate-away Guard
  useEffect(() => {
    if (!started || isFinished) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [started, isFinished]);

  // Custom themed confirm for in-app navigation (back-button, link clicks)
  const confirmLeaveQuiz = (onConfirm: () => void) => {
    pendingUnloadCb.current = onConfirm;
    toast(
      <div className='flex flex-col gap-3 py-1'>
        <p className='font-bold text-sm'>Leave Assessment?</p>
        <p className='text-xs text-pw-muted leading-relaxed'>
          Your progress will be lost and you will need to start over.
        </p>
        <div className='flex gap-2 pt-1'>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-danger/20 border border-pw-danger/40 text-pw-danger text-xs font-bold hover:bg-pw-danger/30 transition-colors'
            onClick={() => {
              toast.dismiss('quiz-leave-confirm');
              pendingUnloadCb.current?.();
              pendingUnloadCb.current = null;
            }}>
            Leave
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/20 border border-pw-primary/40 text-pw-primary text-xs font-bold hover:bg-pw-primary/30 transition-colors'
            onClick={() => {
              toast.dismiss('quiz-leave-confirm');
              pendingUnloadCb.current = null;
            }}>
            Keep Going
          </button>
        </div>
      </div>,
      {
        id: 'quiz-leave-confirm',
        duration: Infinity,
        className: 'border border-white/10 bg-pw-surface rounded-2xl',
      },
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const q = activeQuestions[currentQuestion] as Question;

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

    let correct = false;
    if (quiz?.type === 'quiz' && q) {
      let decodedCorrect: any = q.correctIndex;
      try {
        if (typeof q.correctIndex === 'string' && q.correctIndex.length > 0) {
          decodedCorrect = atob(q.correctIndex);
        }
      } catch (e) {
        decodedCorrect = q.correctIndex;
      }

      if (q.type === 'checkbox') {
        const correctIds =
          Array.isArray(decodedCorrect) ? decodedCorrect : [decodedCorrect];
        correct =
          selectedOptions.length === correctIds.length &&
          selectedOptions.every((val) => correctIds.includes(val));
      } else if (q.type === 'input') {
        if (!decodedCorrect || decodedCorrect.trim() === '') {
          correct = true;
        } else {
          correct =
            content.toLowerCase().trim() ===
            String(decodedCorrect).toLowerCase().trim();
        }
      } else if (q.type === 'true_false') {
        correct =
          String(selectedOption).toLowerCase() ===
          String(decodedCorrect).toLowerCase();
      } else {
        correct = String(selectedOption) === String(decodedCorrect);
      }

      if (correct) setScore((s) => s + 1);
      setIsCorrect(correct);

      const answer =
        q.type === 'checkbox' ? selectedOptions
        : q.type === 'input' ? content
        : selectedOption;
      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);

      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = { questionId: qId, answer, correct };
      } else {
        updatedAnswers = [...userAnswers, { questionId: qId, answer, correct }];
      }

      setUserAnswers(updatedAnswers);
      const newScore = updatedAnswers.filter((a) => a.correct).length;
      setScore(newScore);

      if (quiz?.correctOption) {
        setShowFeedback(true);
        setTimeout(
          () => {
            proceedToNext(updatedAnswers);
          },
          quiz?.correctOptionDes && q.correctExplanation ? 4000 : 1500,
        );
      } else {
        proceedToNext(updatedAnswers);
      }
    } else if (q) {
      const answer =
        q.type === 'checkbox' ? selectedOptions
        : q.type === 'input' ? content
        : selectedOption;
      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);
      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = { questionId: qId, answer };
      } else {
        updatedAnswers = [...userAnswers, { questionId: qId, answer }];
      }
      setUserAnswers(updatedAnswers);
      proceedToNext(updatedAnswers);
    }
  };

  const proceedToNext = (latestAnswers?: any[]) => {
    setShowFeedback(false);
    const answersToSave = latestAnswers || userAnswers;

    if (quiz && currentQuestion + 1 < activeQuestions.length) {
      setCurrentQuestion((c) => c + 1);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    } else {
      finalizeQuiz(answersToSave);
    }
  };

  const finalizeQuiz = async (finalAnswers: any[]) => {
    setIsFinished(true);
    if (quiz) {
      localStorage.setItem(`completed_quiz_${quiz.id}`, 'true');
      try {
        await HybridStorage.saveResponse(quiz.id, {
          userData,
          answers: finalAnswers,
          score,
          totalQuestions: activeQuestions.length,
        });
      } catch (e) {
        console.error('Failed to save response:', e);
      }
    }
  };

  const GoBack = () => {
    setShowFeedback(false);
    if (!quiz?.canGoBack) return;
    if (quiz && currentQuestion > 0) {
      setCurrentQuestion((c) => c - 1);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    }
  };

  // Rendering
  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-6'>
        <Puzzle className='h-12 w-12 text-pw-muted mb-4 opacity-20' />
        <h2 className='text-2xl font-bold mb-2'>Loading Assessment...</h2>
        <div className='loader spinner'></div>
      </div>
    );
  }

  if (hasAlreadyCompleted && quiz) {
    return (
      <div className='relative min-h-screen overflow-hidden bg-pw-bg flex items-center justify-center'>
        <div className='container relative z-10 mx-auto px-6 py-10 max-w-2xl text-center'>
          <ShieldCheck className='h-20 w-20 text-pw-danger mx-auto mb-8 opacity-50' />
          <h1 className='text-3xl font-bold mb-4 font-display'>Access Restricted</h1>
          <p className='text-pw-muted text-lg mb-8'>
            You have already attempted this {quiz.type}. Multiple attempts are
            not allowed.
          </p>
          <Link
            href='/quiz'
            className='btn-primary inline-flex items-center px-10'>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-6'>
        <Puzzle className='h-12 w-12 text-pw-muted mb-4 opacity-20' />
        <h2 className='text-2xl md:text-3xl font-bold mb-1'>Assessment Not Found</h2>
        <p className='text-sm text-white/80 max-w-md font-light'>This assessment may have been removed, ended or you used the wrong link</p>
        <Link
          href='/quiz'
          className='mt-6 text-pw-primary font-bold inline-flex items-center gap-2 hover:underline'>
          <ArrowLeft className='h-4 w-4' /> Back
        </Link>
      </div>
    );
  }

  if (isFinished && quiz.endScreen) {
    return (
      <div className='relative min-h-screen overflow-hidden bg-pw-bg flex items-center justify-center'>
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
                  Result
                </div>
                <div className='text-3xl font-bold mb-4'>
                  {score} / {activeQuestions.length}
                </div>
                <div className='w-full h-3 bg-pw-surface rounded-full overflow-hidden border border-white/5'>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(score / activeQuestions.length) * 100}%`,
                    }}
                    className='h-full gradient-brand rounded-full'
                  />
                </div>
              </Card>
            )}

            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              {(quiz.allowRetry !== false || quiz.type === 'survey') && (
                <Button
                  onClick={() => window.location.reload()}
                  variant='outline'
                  className='h-12 px-4 border-white/10'>
                  Try Again
                </Button>
              )}
              <Link
                href='/quiz'
                className='btn-primary h-12 flex items-center px-8'>
                Close Quiz
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => quiz.enforceSecurity && e.preventDefault()}
      className={cn(
        'relative min-h-screen flex flex-col transition-colors duration-500 pb-20 overflow-x-hidden',
        quizTheme === 'dark' ? 'bg-pw-bg text-white' : 'bg-slate-50 text-black',
        quiz.enforceSecurity && 'select-none',
      )}>
      {/* Dynamic Background */}
      {quizTheme === 'dark' && (
        <>
          <div className='globe-div fixed inset-0'>
            <div
              className={cn(
                'globe transition-opacity duration-1000',
                quizTheme === 'dark' ? 'opacity-10' : 'opacity-[0.03]',
              )}
            />
          </div>

          {/* Background orbs */}
          <div
            className={cn(
              'orb orb-accent w-[500px] h-[500px] -top-40 -left-40 blur-xl float transition-opacity',
              quizTheme === 'dark' ? 'opacity-40' : 'opacity-10',
            )}
          />
          <div
            className={cn(
              'orb orb-primary w-[400px] h-[400px] -bottom-20 -right-20 blur-all float transition-opacity',
              quizTheme === 'dark' ? 'opacity-30' : 'opacity-10',
            )}
          />
        </>
      )}

      {/* 1. Intro Gate */}
      {showIntro && !started && !showSecurityProtocol && !detailsCollected && (
        <div className='container relative z-10 mx-auto px-4 py-20 max-w-2xl text-center flex-1 flex flex-col justify-center'>
          <div className='flex justify-center mb-6 text-pw-primary'>
            {quiz.type === 'quiz' ?
              <Brain size={60} />
            : <MessageCircle size={60} />}
          </div>
          <h1 className='text-4xl font-extrabold font-display mb-4 tracking-tight'>
            {quiz.title.toUpperCase()}
          </h1>
          <p className='text-pw-muted text-lg leading-relaxed mb-10 max-h-[300px] overflow-auto px-4'>
            {quiz.description}
          </p>

          <div className='max-w-sm mx-auto w-full'>
            {authRequired ?
              <div className='bg-pw-danger/5 p-4 rounded-2xl border border-pw-danger/20 space-y-6'>
                <Lock className='h-12 w-12 text-pw-danger mx-auto mt-10' />
                <h3 className='text-xl font-bold'>Authentication Required</h3>
                <p className='text-sm text-white/70 '>
                  You'll have to login or sign up for us to be able to track the
                  information and answers from the {quiz.type}.
                </p>
                <Link
                  href='/login'
                  className='btn-primary h-10 flex items-center justify-center font-bold mt-2'>
                  Sign In
                </Link>
              </div>
            : <Button
                className='w-full btn-primary h-10 text-lg font-bold shadow-xl shadow-pw-primary/20 transition-all hover:scale-105 active:scale-95'
                onClick={() => {
                  if (quiz.enforceSecurity!) {
                    setShowSecurityProtocol(true);
                  } else if (quiz.askDetails && quiz.askDetails.length > 0) {
                    setDetailsCollected(false);
                    setShowDetails(true);
                    setShowSecurityProtocol(false);
                  } else {
                    setStart(true);
                  }
                  setShowIntro(false);
                }}>
                CONTINUE
              </Button>
            }
          </div>
        </div>
      )}

      {/* 2. Security Gate */}
      {!showIntro &&
        quiz.enforceSecurity &&
        showSecurityProtocol &&
        !started &&
        !detailsCollected && (
          <div className='container relative z-10 mx-auto px-2 py-5 max-w-xl text-center flex-1 flex flex-col justify-center'>
            <div className='bg-pw-primary/5 p-6 rounded-[2.5rem] border border-pw-primary/20 space-y-8 backdrop-blur-xl'>
              <div className='flex flex-col items-center gap-4 mt-2'>
                <ShieldCheck className='h-16 w-16 text-pw-primary animate-pulse' />
                <div className='text-center'>
                  <h3 className='text-2xl font-bold'>Security Protocol</h3>
                  <p className='text-xs text-pw-muted uppercase font-bold tracking-[0.2em] mt-1'>
                    Active Monitoring Enabled
                  </p>
                </div>
              </div>

              <div className='divider' />

              <div className='space-y-6 text-left text-sm leading-relaxed'>
                <div className='flex gap-4 p-2 lg:p-4 bg-white/5 rounded-2xl border border-white/5 items-center'>
                  <EyeOff className='h-6 w-6 text-pw-primary shrink-0' />
                  <p>
                    <span className='font-bold text-pw-text'>
                      Tab-Lock System:
                    </span>{' '}
                    Leaving this window or switching tabs will trigger a
                    violation. 3 violations result in immediate submission.
                  </p>
                </div>
                <div className='flex gap-4 p-2 lg:p-4 bg-white/5 rounded-2xl border border-white/5 items-center'>
                  <Lock className='h-6 w-6 text-pw-primary shrink-0' />
                  <p>
                    <span className='font-bold text-pw-text'>
                      Privacy Lockdown:
                    </span>{' '}
                    Context menus, text selection, and clipboard actions are
                    restricted for integrity.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowSecurityProtocol(false);

                  if (quiz.askDetails && quiz.askDetails.length > 0) {
                    setShowDetails(true);
                  } else {
                    setStart(true);
                  }
                }}
                className='w-full btn-primary h-12 text-lg font-bold shadow-2xl relative overflow-hidden group'>
                I UNDERSTAND & AGREE
              </Button>
            </div>
          </div>
        )}

      {/* 3. Details Gate */}
      {showDetails &&
        !detailsCollected &&
        (quiz.askDetails || []).length > 0 && (
          <div className='container relative z-10 mx-auto px-2 py-10 max-w-lg flex-1 flex flex-col justify-center'>
            <div className='bkblur bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl'>
              <h3 className='text-sm font-bold mb-8 mt-4 uppercase tracking-widest text-pw-cyan text-center'>
                ENTER YOU DETAILS
              </h3>
              <div className='space-y-5'>
                {quiz.askDetails?.map((detail, idx) => (
                  <div
                    key={detail?.title as string + idx + '6r5e4wx4wyn6rs43'}
                    className='space-y-2'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase ml-2'>
                      {detail.title}
                    </label>
                    {detail.type === 'sex' ?
                      <div className='flex gap-3'>
                        {['Male', 'Female'].map((s) => (
                          <Button
                            key={s + '990087g87g7f7'}
                            variant='outline'
                            onClick={() =>
                              setUserData({ ...userData, [detail.title]: s })
                            }
                            className={cn(
                              'flex-1 h-12 rounded-2xl transition-all',
                              userData[detail.title] === s ?
                                'bg-pw-primary text-white border-pw-primary shadow-lg shadow-pw-primary/30'
                              : 'bg-black/20 hover:bg-black/40',
                            )}>
                            {s}
                          </Button>
                        ))}
                      </div>
                    : detail.type === 'dropdown' ?
                      <div
                        className='flex gap-2 w-full'
                        style={{
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                        <p className='title font-bold'>{detail.title}</p>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={'w-[40%] min-w-[100px] overflow-hidden'}>
                            <Button
                              variant='outline'
                              className='h-8 text-xs w-full flex justify-between'>
                              {userData[detail.title] || 'Select'}
                              <ChevronDown size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className='w-56 bg-pw-surface border-white/10 rounded-2xl'>
                            {detail.options?.map((opt, index) => (
                              <DropdownMenuItem
                                key={opt + index + '98gdewaa576yfy'}
                                onClick={() =>
                                  setUserData({
                                    ...userData,
                                    [detail.title]: opt,
                                  })
                                }
                                className='h-10 rounded-xl focus:bg-pw-primary/10 cursor-pointer'>
                                {opt}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    : <input
                        type={detail.type}
                        className='w-full h-12 bg-black/20 border border-white/10 rounded-2xl px-5 text-sm focus:border-pw-primary outline-none transition-all focus:ring-1 focus:ring-pw-primary'
                        placeholder={`Enter ${detail.title}...`}
                        value={userData[detail.title] || ''}
                        onChange={(e) =>
                          setUserData({
                            ...userData,
                            [detail.title]: e.target.value,
                          })
                        }
                      />
                    }
                  </div>
                ))}
                <Button
                  className='btn-primary h-12 w-full mt-6 text-lg font-bold shadow-xl shadow-pw-primary/20'
                  onClick={() => {
                    const complete = quiz.askDetails?.every(
                      (d) => userData[d.title],
                    );
                    if (!complete)
                      return toast.error('Required fields missing');
                    setDetailsCollected(true);
                    setStart(true);
                  }}>
                  START {quiz.type.toUpperCase()}
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* 4. Active Assessment View */}
      {started && (
        <div
          className={cn(
            'container relative z-10 mx-auto px-4 md:px-6 py-10 max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8',
            quizTheme === 'dark' ? 'text-white' : 'text-black',
          )}>
          <div className='lg:col-span-8'>
            <div className='grid grid-cols-4 mb-10 w-full'>
              <div className='flex justify-between items-end mb-4 col-span-4'>
                <div>
                  <div className='badge bg-pw-primary/10 text-pw-primary border-pw-primary/20 mb-4'>
                    Question {currentQuestion + 1} of {activeQuestions.length}
                  </div>
                  <h1 className='text-3xl font-bold font-display tracking-tight'>
                    {quiz.title}
                  </h1>
                </div>
                <div className='flex gap-3 items-center hidden'>
                  <Button
                    variant='ghost'
                    size='icon'
                    title={`Toggle ${capFirst(quiz.type)} Theme`}
                    onClick={() =>
                      setQuizTheme(quizTheme === 'dark' ? 'light' : 'dark')
                    }
                    className={cn(
                      'rounded-full h-10 w-10 border bkblur shadow-sm transition-all active:scale-90',
                      quizTheme === 'dark' ?
                        'bg-white/5 border-white/10 text-pw-cyan hover:bg-white/10'
                      : 'bg-white border-slate-200 text-pw-primary shadow-sm hover:bg-slate-50',
                    )}>
                    {quizTheme === 'dark' ?
                      <Sun size={18} />
                    : <Moon size={18} />}
                  </Button>
                </div>

                <div className='flex flex-col items-end gap-3'>
                  {quiz.hasTimer && timeLeft !== null && (
                    <div
                      title={`${capFirst(quiz.type)} Timer`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 pr-3 rounded-2xl font-mono text-lg border-1 transition-all',
                        timeLeft < 60 ?
                          'bg-pw-danger/10 border-pw-danger text-pw-danger animate-pulse shadow-lg shadow-pw-danger/20'
                        : 'bg-white/5 border-white/10 shadow-xl',
                      )}>
                      <Clock size={20} />
                      {formatTime(timeLeft)}
                    </div>
                  )}
                  {quiz.type === 'quiz' && quiz.showScore && (
                    <div
                      className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'
                      title={`Quiz Score Count`}>
                      Score: {score}
                    </div>
                  )}
                </div>
              </div>

              <div className='w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 col-span-4'>
                <motion.div
                  className='h-full gradient-brand rounded-full shadow-[0_0_15px_rgba(var(--pw-primary-rgb),0.5)]'
                  animate={{
                    width: `${(currentQuestion / activeQuestions.length) * 100}%`,
                  }}
                />
              </div>

              <Button
                title={`Quit ${quiz.type}`}
                variant='ghost'
                className='h-10 col-span-4 px-4 mt-4 align-end text-xs text-pw-muted hover:text-pw-danger hover:bg-pw-danger/10 gap-1.5 rounded-xl border border-white/5 transition-all'
                onClick={() => confirmLeaveQuiz(() => window.location.href='/quiz')} style={{justifySelf:'flex-end'}}>
                <X size={14} /> Quit
              </Button>
            </div>

            <Card className='glass bkblur rounded-[1.5rem] p-4 md:p-6 mb-6 bg-pw-surface border-white/10 shadow-xl relative overflow-hidden'>
              {/* Question Header */}
              <div className='flex flex-col gap-4 pt-1 mb-4'>
                <div className='flex justify-between items-start gap-2'>
                  <h2
                    className='text-lg md:text-2xl font-bold leading-snug flex-1'
                    title={`${capFirst(quiz.type)} Question`}>
                    {q?.text}
                  </h2>
                  {quiz.correctOption && showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'px-2 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm',
                        isCorrect ?
                          'bg-pw-success/10 border-pw-success text-pw-success'
                        : 'bg-pw-danger/10 border-pw-danger text-pw-danger',
                      )}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </motion.div>
                  )}
                </div>
                {quiz.correctOptionDes &&
                  showFeedback &&
                  q?.correctExplanation && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      title='Answer Explanation'
                      className='p-2 rounded-2xl bg-pw-primary/5 border border-pw-primary/10 text-sm leading-relaxed text-pw-text'>
                      <div className='flex items-center gap-2 font-bold text-pw-primary uppercase text-[10px] mb-2 tracking-[0.2em]'>
                        <Brain size={14} /> Explanation
                      </div>
                      {q.correctExplanation}
                    </motion.div>
                  )}
              </div>

              {/* Options Section */}
              <AnimatePresence mode='sync'>
                <motion.div
                  key={currentQuestion + 'tv765ecwxartdufybgiun'}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className='space-y-2'>
                  {q?.type === 'dropdown' ?
                    <div className='flex justify-center py-1'>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant='outline'
                            className='h-12 flex items-center justify-between px-8 gap-4 min-w-[280px] bg-white/5 border-white/10 text-xl rounded-2xl hover:bg-white/10 transition-all font-medium'>
                            {selectedOption ?
                              (
                                (shuffledOptions[q.id] || q.options).find(
                                  (o) =>
                                    (typeof o === 'string' ? o : o.id) ===
                                    selectedOption,
                                ) as any
                              )?.text || selectedOption
                            : 'Choose your answer...'}
                            <ChevronDown
                              size={20}
                              className='text-pw-primary'
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-pw-surface border-white/10 w-80 p-2 rounded-[1.5rem] shadow-2xl'>
                          {(shuffledOptions[q.id] || q.options)?.map(
                            (opt, idx) => {
                              const optId =
                                typeof opt === 'string' ?
                                  idx.toString()
                                : opt.id;
                              const optText =
                                typeof opt === 'string' ? opt : opt.text;
                              return (
                                <DropdownMenuItem
                                  key={optId + idx + 'y7f65awxsyribyt'}
                                  onClick={() => setSelectedOption(optId)}
                                  className='h-10 text-base rounded-xl focus:bg-pw-primary/10 cursor-pointer px-4'>
                                  {optText}
                                  {selectedOption === optId && (
                                    <Check
                                      size={15}
                                      className='text-pw-primary mr-2'
                                    />
                                  )}
                                </DropdownMenuItem>
                              );
                            },
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  : q?.type === 'input' ?
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder='Type your answer here...'
                      className='w-full h-20 bg-white/5 border border-white/10 rounded-2xl p-2 text-base focus:border-pw-primary focus:outline-none resize-none transition-all placeholder:text-pw-muted focus:ring-1 focus:ring-pw-primary'
                    />
                  : <div
                      className={cn(
                        'grid gap-4',
                        q?.type === 'multiple_choice' ?
                          'grid-cols-1'
                        : 'grid-cols-2',
                      )}>
                      {(shuffledOptions[q.id] || q?.options).map((opt, idx) => {
                        const optId =
                          typeof opt === 'string' ? idx.toString() : opt?.id;
                        const optText =
                          typeof opt === 'string' ? opt : opt?.text;
                        const isSelected =
                          q?.type === 'checkbox' ?
                            selectedOptions.includes(optId)
                          : selectedOption === optId;
                        return (
                          <button
                            key={optId + idx + '5ef3aTASDVFBIGU'} 
                            onClick={() =>
                              q?.type === 'checkbox' ?
                                setSelectedOptions((p) =>
                                  p.includes(optId) ?
                                    p.filter((i) => i !== optId)
                                  : [...p, optId],
                                )
                              : setSelectedOption(optId)
                            }
                            className={cn(
                              'w-full p-2 pl-3 md:p-4 text-left rounded-2xl border-2 transition-all group flex items-center justify-between',
                              isSelected ?
                                'bg-pw-primary/10 border-pw-primary text-pw-text shadow-lg'
                              : 'bg-white/5 border-white/5 text-pw-muted hover:border-white/10 hover:bg-white/10',
                            )}>
                            <span className='font-medium text-sm md:text-base'>
                              {optText}
                            </span>
                            <CheckCircle
                              className={cn(
                                'h-5 w-5 transition-all',
                                isSelected ?
                                  'opacity-100 scale-110 text-pw-primary'
                                : 'opacity-0 scale-50',
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

            <div className='flex justify-between gap-2 flex-wrap'>
              <AnimatePresence mode='sync'>
                {quiz.canGoBack && currentQuestion > 0 && (
                  <Button
                    onClick={GoBack}
                    className='btn-ghost h-10 px-6 text-lg gap-2'>
                    <ChevronLeft className='h-5 w-5' />
                    Previous
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  className='btn-primary h-10 px-8 rounded-2xl text-lg font-bold gap-2 shadow-xl shadow-pw-primary/20 ml-auto transition-transform active:scale-95'>
                  {currentQuestion + 1 === activeQuestions.length ?
                    'Finish'
                  : 'Next'}
                  <ChevronRight size={22} />
                </Button>
              </AnimatePresence>
            </div>
          </div>

          {/* Assistant Sidebar */}
          <div className='lg:col-span-4 space-y-6'>
            {q?.accessory === 'calculator' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}>
                <div className='flex items-center gap-2 mb-4 px-2'>
                  <AlertTriangle
                    size={14}
                    className='text-pw-primary'
                  />
                  <h4 className='text-[10px] font-bold text-pw-muted uppercase tracking-[0.3em]'>
                    System Assistant
                  </h4>
                </div>
                <Calculator />
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
