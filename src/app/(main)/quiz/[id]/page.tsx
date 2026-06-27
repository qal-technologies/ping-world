'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  Check,
  CheckCircle,
  ChevronLeft,
  Brain,
  Clock,
  Sun,
  Moon,
  AlertTriangle,
  X,
  Layers,
  FileText,
  BookOpen,
  ArrowLeft,
  Star,
  StickyNote,
  ShieldCheck,
  MessageCircle,
  EyeOff,
  Lock,
  LogOut,
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
import type { Question, Quiz, QuizOption } from '../page';
import { useParams } from 'next/navigation';

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'dropdown'
  | 'checkbox'
  | 'input'
  | 'range'
  | 'rating';

// export interface QuizOption {
//   id: string;
//   text: string;
//   skipTo?: string;
// }

// interface Question {
//   id: string;
//   type: QuestionType;
//   text: string;
//   options: (string | QuizOption)[];
//   correctIndex: any;
//   caseSensitive?: boolean;
//   min?: number;
//   max?: number;
//   step?: number;
//   accessory?:
//     | 'none'
//     | 'calculator'
//     | 'note'
//     | 'periodic_table'
//     | 'formula_sheet'
//     | 'glossary';
//   accessoryNote?: string;
//   accessoryConfig?: any;
//   correctExplanation?: string;
// }

const NoteSheet = ({ note }: { note: string }) => (
  <Card className='p-6 bg-pw-surface bkblur border-white/10 shadow-2xl m-2 max-w-sm'>
    <div className='flex items-center gap-2 mb-4 text-pw-primary'>
      <StickyNote size={20} />
      <h3 className='font-bold uppercase tracking-widest text-xs'>Note</h3>
    </div>
    <div className='text-sm leading-relaxed text-pw-text whitespace-pre-wrap whitespace-pre-line'>
      {note}
    </div>
  </Card>
);

const PeriodicTable = () => {
  const elements = [
    { s: 'H', n: 'Hydrogen', cat: 'nonmetal', c: '#4ADE80' },
    { s: 'He', n: 'Helium', cat: 'noble', c: '#60A5FA' },
    { s: 'Li', n: 'Lithium', cat: 'alkali', c: '#F87171' },
    { s: 'Be', n: 'Beryllium', cat: 'alkaline', c: '#FB923C' },
    { s: 'B', n: 'Boron', cat: 'metalloid', c: '#FACC15' },
    { s: 'C', n: 'Carbon', cat: 'nonmetal', c: '#4ADE80' },
    { s: 'N', n: 'Nitrogen', cat: 'nonmetal', c: '#4ADE80' },
    { s: 'O', n: 'Oxygen', cat: 'nonmetal', c: '#4ADE80' },
    { s: 'F', n: 'Fluorine', cat: 'halogen', c: '#A78BFA' },
    { s: 'Ne', n: 'Neon', cat: 'noble', c: '#60A5FA' },
    { s: 'Na', n: 'Sodium', cat: 'alkali', c: '#F87171' },
    { s: 'Mg', n: 'Magnesium', cat: 'alkaline', c: '#FB923C' },
    { s: 'Al', n: 'Aluminium', cat: 'metal', c: '#94A3B8' },
    { s: 'Si', n: 'Silicon', cat: 'metalloid', c: '#FACC15' },
    { s: 'P', n: 'Phosphorus', cat: 'nonmetal', c: '#4ADE80' },
    { s: 'S', n: 'Sulfur', cat: 'nonmetal', c: '#4ADE80' },
    { s: 'Cl', n: 'Chlorine', cat: 'halogen', c: '#A78BFA' },
    { s: 'Ar', n: 'Argon', cat: 'noble', c: '#60A5FA' },
  ];

  return (
    <Card className='p-4 bg-pw-surface bkblur border-white/10 shadow-2xl m-2 max-w-sm'>
      <div className='flex items-center gap-2 mb-4 text-pw-cyan'>
        <Layers size={18} />
        <h3 className='font-bold uppercase tracking-widest text-xs'>
          Periodic Table
        </h3>
      </div>
      <div className='grid grid-cols-6 gap-1'>
        {elements.map((el) => (
          <div
            key={el.s}
            title={`${el.n} (${el.cat})`}
            className='aspect-square flex flex-col items-center justify-center rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-help p-1'>
            <span
              className='font-bold text-[10px]'
              style={{ color: el.c }}>
              {el.s}
            </span>
            <span className='text-[6px] opacity-50 truncate w-full text-center'>
              {el.n}
            </span>
          </div>
        ))}
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        <div className='flex items-center gap-1'>
          <div className='w-2 h-2 rounded bg-[#4ADE80]'></div>
          <span className='text-[8px] text-pw-muted uppercase'>Nonmetal</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='w-2 h-2 rounded bg-[#60A5FA]'></div>
          <span className='text-[8px] text-pw-muted uppercase'>Noble</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='w-2 h-2 rounded bg-[#F87171]'></div>
          <span className='text-[8px] text-pw-muted uppercase'>Alkali</span>
        </div>
      </div>
    </Card>
  );
};

const FormulaSheet = ({
  config,
  customFormulas,
}: {
  config?: any;
  customFormulas?: string;
}) => {
  const allFormulas = [
    {
      cat: 'Math',
      items: [
        { n: 'Area of Circle', f: 'πr²' },
        { n: 'Pythagoras', f: 'a² + b² = c²' },
        { n: 'Quadratic', f: '(-b ± √(b²-4ac)) / 2a' },
      ],
    },
    {
      cat: 'Physics',
      items: [
        { n: 'Force', f: 'F = ma' },
        { n: 'Energy', f: 'E = mc²' },
        { n: "Ohm's Law", f: 'V = IR' },
      ],
    },
    {
      cat: 'Chemistry',
      items: [
        { n: 'Ideal Gas Law', f: 'PV = nRT' },
        { n: 'Molarity', f: 'M = n/V' },
        { n: 'Density', f: 'ρ = m/v' },
      ],
    },
  ];

  const allowedCategories = config?.categories || [
    'Math',
    'Physics',
    'Chemistry',
  ];
  const formulas = allFormulas.filter((group) =>
    allowedCategories.includes(group.cat),
  );

  const parsedCustomFormulas = (customFormulas || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        return { n: parts[0].trim(), f: parts.slice(1).join('=').trim() };
      }
      return { n: 'Custom', f: line.trim() };
    });

  if (parsedCustomFormulas.length > 0) {
    formulas.push({ cat: 'Custom', items: parsedCustomFormulas });
  }

  return (
    <Card className='p-4 bg-pw-surface bkblur border-white/10 shadow-2xl m-2 max-w-sm max-h-[400px] overflow-y-auto custom-scrollbar'>
      <div className='flex items-center gap-2 mb-4 text-pw-primary'>
        <FileText size={18} />
        <h3 className='font-bold uppercase tracking-widest text-xs'>
          Formula Sheet
        </h3>
      </div>
      <div className='space-y-6'>
        {formulas.map((group) => (
          <div
            key={group.cat}
            className='space-y-2'>
            <h4 className='text-[8px] font-black text-pw-muted uppercase tracking-[0.3em] border-b border-white/5 pb-1'>
              {group.cat}
            </h4>
            <div className='space-y-2'>
              {group.items.map((item) => (
                <div
                  key={item.n + item.f}
                  className='flex justify-between items-center group'>
                  <span className='text-[10px] text-pw-text opacity-70 group-hover:opacity-100 transition-opacity'>
                    {item.n}
                  </span>
                  <span className='font-mono text-[10px] text-pw-primary bg-pw-primary/5 px-2 py-0.5 rounded'>
                    {item.f}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {formulas.length === 0 && (
          <p className='text-xs text-pw-muted italic text-center'>
            No formulas available.
          </p>
        )}
      </div>
    </Card>
  );
};

const Glossary = () => (
  <Card className='p-6 bg-pw-surface bkblur border-white/10 shadow-2xl m-2 max-w-sm'>
    <div className='flex items-center gap-2 mb-4 text-pw-success'>
      <BookOpen size={20} />
      <h3 className='font-bold uppercase tracking-widest text-xs'>
        Terminology
      </h3>
    </div>
    <div className='space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar'>
      <div>
        <p className='font-bold text-pw-success mb-1'>Hypothesis</p>
        <p className='text-[10px] leading-relaxed text-pw-muted'>
          A proposed explanation made on the basis of limited evidence as a
          starting point for further investigation.
        </p>
      </div>
      <div>
        <p className='font-bold text-pw-success mb-1'>Velocity</p>
        <p className='text-[10px] leading-relaxed text-pw-muted'>
          The speed of something in a given direction.
        </p>
      </div>
    </div>
  </Card>
);

// --- Accessory Components ---
const Calculator = () => {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const calculate = (expression: string) => {
    try {
      // Basic safe parser for math
      const clean = expression.replace(/[^-+*/.0-9]/g, '');
      const fn = new Function(`return ${clean}`);
      const res = fn();
      setResult(res.toString());
    } catch {
      setResult('Error');
    }
  };

  return (
    <Card className='p-4 bg-pw bkblur border-white/10 shadow-2xl w-72 m-2 ring-1 ring-white/10'>
      <div className='bg-black/40 p-4 rounded-xl mb-4 text-right font-mono border border-white/5'>
        <div className='text-xs text-pw-muted h-4 overflow-hidden truncate'>
          {val || '0'}
        </div>
        <div className='text-2xl font-bold text-pw-primary drop-shadow-[0_0_8px_rgba(var(--pw-primary-rgb),0.3)]'>
          {result || val || '0'}
        </div>
      </div>
      <div className='grid grid-cols-4 gap-1.5'>
        {[
          'C',
          'del',
          '/',
          '*',
          '7',
          '8',
          '9',
          '-',
          '4',
          '5',
          '6',
          '+',
          '1',
          '2',
          '3',
          '.',
          '0',
          '=',
          '(',
          ')',
        ].map((btn) => {
          const isOp = ['/', '*', '-', '+', '='].includes(btn);
          const isClr = ['C', 'del'].includes(btn);

          return (
            <Button
              key={btn}
              variant={
                isOp ? 'secondary'
                : isClr ?
                  'destructive'
                : 'outline'
              }
              size='sm'
              className={cn(
                'h-10 text-xs font-bold transition-all active:scale-90 rounded-lg',
                btn === '=' &&
                  'col-span-1 bg-pw-primary text-white hover:bg-pw-primary/80',
                isOp &&
                  !isClr &&
                  btn !== '=' &&
                  'bg-pw-primary/10 text-pw-primary border-pw-primary/20',
              )}
              onClick={() => {
                if (btn === 'C') {
                  setVal('');
                  setResult(null);
                } else if (btn === 'del') {
                  setVal((v) => v.slice(0, -1));
                  setResult(null);
                } else if (btn === '=') calculate(val);
                else {
                  if (result) {
                    setVal(result + btn);
                    setResult(null);
                  } else setVal((v) => v + btn);
                }
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
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
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

  // --- Performance: Memoized Current Question Data ---
  const q = useMemo(() => {
    if (!activeQuestions || activeQuestions.length === 0) return null;
    return activeQuestions[currentQuestion] || null;
  }, [activeQuestions, currentQuestion]);

  const answeredCount = useMemo(() => {
    return new Set(userAnswers.map((a) => a.questionId)).size;
  }, [userAnswers]);

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
        icon: <AlertTriangle className='text-pw-danger' />,
        className: 'border border-white/10 bg-pw-surface rounded-2xl',
      },
    );
  };

  // Custom themed confirm for Submitting Quiz
  const confirmSubmitQuiz = () => {
    toast(
      <div className='flex flex-col gap-3 py-1'>
        <p className='font-bold text-sm'>Submit Assessment?</p>
        <p className='text-xs text-pw-muted leading-relaxed'>
          Are you sure you want to finalize your answers and submit?
        </p>
        <div className='flex gap-2 pt-1'>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-success/20 border border-pw-success/40 text-pw-success text-xs font-bold hover:bg-pw-success/30 transition-colors'
            onClick={() => {
              toast.dismiss('quiz-submit-confirm');
              finalizeQuiz(userAnswers);
            }}>
            Submit
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary text-xs font-bold hover:bg-pw-primary/20 transition-colors'
            onClick={() => toast.dismiss('quiz-submit-confirm')}>
            Cancel
          </button>
        </div>
      </div>,
      {
        id: 'quiz-submit-confirm',
        duration: Infinity,
        position: 'top-center',
      },
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  // --- Removed redundant q declaration as it is now memoized ---

  const handleNext = () => {
    if (q?.type === 'checkbox' && selectedOptions.length === 0) {
      toast.error('Please select at least one answer');
      return;
    }
    let currentSelectedOption = selectedOption;
    if (q?.type === 'range' && currentSelectedOption === null) {
      currentSelectedOption = (q.min || 0).toString();
    }

    if (
      currentSelectedOption === null &&
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
        if (typeof q.correctIndex === 'string' && q.correctIndex.length > 5) {
          // Assuming secured keys are at least some length, avoid decoding normal IDs
          const decoded = atob(q.correctIndex);
          try {
            decodedCorrect = JSON.parse(decoded);
          } catch {
            decodedCorrect = decoded;
          }
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
        if (!decodedCorrect || String(decodedCorrect).trim() === '') {
          correct = true;
        } else {
          const userAns = content.trim();
          const targetAns = String(decodedCorrect).trim();
          correct =
            q.caseSensitive ?
              userAns === targetAns
            : userAns.toLowerCase() === targetAns.toLowerCase();
        }
      } else if (q.type === 'true_false') {
        correct =
          String(currentSelectedOption).toLowerCase() ===
          String(decodedCorrect).toLowerCase();
      } else if (q.type === 'range' || q.type === 'rating') {
        // Typically range/rating in a 'quiz' mode would check for a specific value
        correct = Number(currentSelectedOption) >= Number(decodedCorrect);
      } else {
        correct = String(currentSelectedOption) === String(decodedCorrect);
      }

      if (correct) setScore((s) => s + 1);
      setIsCorrect(correct);

      const answer =
        q.type === 'checkbox' ? selectedOptions
        : q.type === 'input' ? content
        : q.type === 'range' || q.type === 'rating' ? currentSelectedOption
        : currentSelectedOption;

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
      // Survey Mode
      const answer =
        q.type === 'checkbox' ? selectedOptions
        : q.type === 'input' ? content
        : q.type === 'range' || q.type === 'rating' ? currentSelectedOption
        : currentSelectedOption;

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

    let targetSkipTo: string | undefined;
    let targetSkipToCat: string | undefined;

    // 1. Check for Option-level Skip Logic overrides for single-choice answers
    if (
      q?.type === 'multiple_choice' ||
      q?.type === 'dropdown' ||
      q?.type === 'true_false'
    ) {
      const selectedOptObj = q.options.find(
        (opt) => typeof opt !== 'string' && opt.id === selectedOption,
      ) as QuizOption | undefined;

      if (selectedOptObj?.skipToCat) {
        targetSkipToCat = selectedOptObj.skipToCat;
      } else if (selectedOptObj?.skipTo) {
        targetSkipTo = selectedOptObj.skipTo;
      }
    }

    // 2. Cascade down to Question-level skip logic if no option-specific override
    if (!targetSkipTo && !targetSkipToCat) {
      if ((q as any).skipToCat) {
        targetSkipToCat = (q as any).skipToCat;
      } else if ((q as any).skipTo) {
        targetSkipTo = (q as any).skipTo;
      }
    }

    // 3. Process routing
    let nextIdx = currentQuestion + 1;

    if (targetSkipToCat) {
      // Find the FIRST UNANSWERED question in the target group/category
      const jumpIdx = activeQuestions.findIndex(
        (quest) =>
          (quest as any).category === targetSkipToCat &&
          !answersToSave.some((a) => a.questionId === quest.id),
      );

      if (jumpIdx !== -1) {
        nextIdx = jumpIdx;
      } else {
        // If all in that group are answered, find the first question in that group anyway
        // relative to the current position to avoid getting stuck, or fall back to linear
        const firstInGroup = activeQuestions.findIndex(
          (quest) => (quest as any).category === targetSkipToCat,
        );
        if (firstInGroup !== -1) nextIdx = firstInGroup;
      }
    } else if (targetSkipTo) {
      if (targetSkipTo === 'end') {
        finalizeQuiz(answersToSave);
        return;
      }
      const jumpIdx = activeQuestions.findIndex(
        (quest) => quest.id === targetSkipTo,
      );
      if (jumpIdx !== -1) {
        nextIdx = jumpIdx;
      }
    }

    // --- Dynamic Loop Detection & Auto-Submission ---
    const nextQ = activeQuestions[nextIdx];

    // Auto-submit only if we truly reach the end or have a definitive jump to "end"
    if (!nextQ) {
      finalizeQuiz(answersToSave);
      return;
    }

    // Conservative Loop Protection:
    // Only auto-submit if jumping back to an ALREADY answered question
    // AND that question is not the immediate previous or next linear neighbor (allowing for some flex)
    // AND we are in a branching jump (nextIdx !== currentQuestion + 1)
    const isAlreadyAnswered =
      latestAnswers ?
        latestAnswers.some((a) => a.questionId === nextQ?.id)
      : userAnswers.some((a) => a.questionId === nextQ?.id);

    if (
      isAlreadyAnswered &&
      nextIdx !== currentQuestion + 1 &&
      nextIdx !== currentQuestion - 1
    ) {
      // Final sanity check: are there ANY unanswered questions left in the entire quiz?
      // If the setter says "Early Submission OFF", we should be VERY careful.
      const hasUnanswered = activeQuestions.some(
        (quest) => !answersToSave.some((a) => a.questionId === quest.id),
      );

      if (!hasUnanswered || !quiz?.allowEarlySubmit) {
        finalizeQuiz(answersToSave);
        return;
      }
    }

    if (quiz && nextIdx < activeQuestions.length) {
      setCurrentQuestion(nextIdx);
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
        const finalScore = finalAnswers.filter((a) => a.correct).length;
        await HybridStorage.saveResponse(quiz.id, {
          userData,
          answers: finalAnswers,
          score: finalScore,
          totalQuestions: activeQuestions.length,
          answeredQuestions: finalAnswers.length,
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
          <h1 className='text-3xl font-bold mb-4 font-display'>
            Access Restricted
          </h1>
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
        <h2 className='text-2xl md:text-3xl font-bold mb-1'>
          Assessment Not Found
        </h2>
        <p className='text-sm text-white/80 max-w-md font-light'>
          This assessment may have been removed, ended or you used the wrong
          link
        </p>
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
                    key={(detail?.title as string) + idx + '6r5e4wx4wyn6rs43'}
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
        <>
          {/* Top Progress Bar */}
          <div className='fixed top-0 left-0 w-full h-1.5 bg-black/10 z-[100] backdrop-blur-sm'>
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${(answeredCount / activeQuestions.length) * 100}%`,
              }}
              className='h-full bg-pw-primary shadow-[0_0_15px_rgba(var(--pw-primary-rgb),0.5)] transition-all duration-500'
            />
          </div>

          <div
            className={cn(
              'container relative z-10 mx-auto px-4 md:px-6 pt-12 pb-10 max-w-7xl',
              quizTheme === 'dark' ? 'text-white' : 'text-black',
            )}>
            {/* Header Row */}
            <div className='flex flex-wrap items-center justify-between gap-4 mb-8 bg-white/5 p-4 rounded-[2rem] border border-white/5 backdrop-blur-md'>
              <div className='flex items-center gap-4'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() =>
                    confirmLeaveQuiz(() => (window.location.href = '/quiz'))
                  }
                  className='h-10 px-4 gap-2 rounded-xl text-pw-muted hover:text-pw-danger hover:bg-pw-danger/10 transition-all active:scale-95 border border-white/5'>
                  <LogOut size={16} />
                  <span className='hidden sm:inline font-bold'>Quit</span>
                </Button>

                <div className='h-8 w-px bg-white/10 hidden sm:block' />

                <div>
                  <h1 className='text-xl md:text-2xl font-bold font-display tracking-tight leading-none'>
                    {quiz.title}
                  </h1>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                {quiz.hasTimer && timeLeft !== null && (
                  <div
                    title={`${capFirst(quiz.type)} Timer`}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg border transition-all',
                      timeLeft < 60 ?
                        'bg-pw-danger/10 border-pw-danger/50 text-pw-danger animate-pulse'
                      : 'bg-white/5 border-white/10 text-pw-primary',
                    )}>
                    <Clock
                      size={18}
                      className={
                        timeLeft < 60 ? 'text-pw-danger' : 'text-pw-primary'
                      }
                    />
                    {Math.floor(timeLeft / 60)}:
                    {String(timeLeft % 60).padStart(2, '0')}
                  </div>
                )}

                {quiz?.allowEarlySubmit && (
                  <Button
                    onClick={confirmSubmitQuiz}
                    className='h-10 px-5 rounded-xl gap-2 bg-pw-success/10 border border-pw-success/20 text-pw-success hover:bg-pw-success/20 font-black text-xs transition-all active:scale-95 shadow-lg shadow-pw-success/10'>
                    <CheckCircle2 size={18} />
                    <span className='hidden sm:inline font-bold'>SUBMIT</span>
                  </Button>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
              <div className='lg:col-span-8'>
                {!q ?
                  <div className='flex flex-col items-center justify-center min-h-[40vh] text-center p-6 bg-white/5 rounded-[3rem] border border-white/5'>
                    <AlertTriangle className='h-12 w-12 text-pw-warning mb-4 opacity-50' />
                    <h2 className='text-xl font-bold mb-2'>
                      Question Not Found
                    </h2>
                    <p className='text-sm text-pw-muted max-w-xs'>
                      There was an issue loading this question. This can happen
                      if the quiz routing is invalid.
                    </p>
                    <Button
                      onClick={() => setCurrentQuestion(0)}
                      className='mt-6 btn-ghost'>
                      Return to Start
                    </Button>
                  </div>
                : <>
                    <div className='flex flex-col mb-4 w-full'>
                      <div className='badge bg-pw-primary/10 text-pw-primary border-pw-primary/20 px-4 py-1.5 rounded-full text-xs font-bold'>
                        {`Question ${currentQuestion + 1} of ${activeQuestions.length}`}
                      </div>

                      <div className='w-full grid grid-cols-1 gap-1 mt-2'>
                        <AnimatePresence mode='wait'>
                          <motion.div
                            key={q.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className='space-y-8'>
                            <Card className='glass bkblur rounded-[3rem] p-6 md:p-10 bg-pw-surface/40 border-white/5 shadow-2xl relative overflow-hidden group min-h-[450px] flex flex-col'>
                              <div className='absolute -top-24 -right-24 w-64 h-64 bg-pw-primary/5 rounded-full blur-3xl group-hover:bg-pw-primary/10 transition-colors duration-700' />

                              <div className='flex-1 w-full flex flex-col'>
                                <div className='flex flex-col gap-6 mb-8'>
                                  <div className='flex justify-between items-start gap-4'>
                                    <div className='flex items-start gap-4 flex-1'>
                                      <div className='h-12 w-12 rounded-[1.25rem] bg-pw-primary/10 flex items-center justify-center shrink-0 border border-pw-primary/20 shadow-inner'>
                                        <Brain
                                          className='text-pw-primary'
                                          size={24}
                                        />
                                      </div>
                                      <h2 className='text-lg md:text-2xl font-medium leading-tight text-balance'>
                                        {q.text}
                                      </h2>
                                    </div>

                                    {quiz.correctOption && showFeedback && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={cn(
                                          'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm shrink-0',
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
                                        className='p-4 rounded-2xl bg-pw-primary/5 border border-pw-primary/10 text-sm leading-relaxed text-pw-text'>
                                        <div className='flex items-center gap-2 font-bold text-pw-primary uppercase text-[10px] mb-2 tracking-[0.2em]'>
                                          <Brain size={14} /> Explanation
                                        </div>
                                        {q.correctExplanation}
                                      </motion.div>
                                    )}
                                </div>

                                <div className='space-y-4'>
                                  {q.type === 'dropdown' ?
                                    <div className='flex justify-center py-4'>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger>
                                          <Button
                                            variant='outline'
                                            className='h-14 flex items-center justify-between px-8 gap-4 min-w-[300px] bg-white/5 border-white/10 text-xl rounded-2xl hover:bg-white/10 transition-all font-medium'>
                                            {selectedOption ?
                                              (
                                                (
                                                  shuffledOptions[q.id] ||
                                                  q.options
                                                ).find(
                                                  (o) =>
                                                    (typeof o === 'string' ? o
                                                    : o.id) === selectedOption,
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
                                          {(
                                            shuffledOptions[q.id] || q.options
                                          )?.map((opt, idx) => {
                                            const optId =
                                              typeof opt === 'string' ?
                                                idx.toString()
                                              : opt.id;
                                            const optText =
                                              typeof opt === 'string' ? opt : (
                                                opt.text
                                              );
                                            return (
                                              <DropdownMenuItem
                                                key={
                                                  optId +
                                                  idx +
                                                  'dropdown-option'
                                                }
                                                onClick={() =>
                                                  setSelectedOption(optId)
                                                }
                                                className='h-12 text-base rounded-xl focus:bg-pw-primary/10 cursor-pointer px-4 flex items-center justify-between'>
                                                {optText}
                                                {selectedOption === optId && (
                                                  <Check
                                                    size={18}
                                                    className='text-pw-primary'
                                                  />
                                                )}
                                              </DropdownMenuItem>
                                            );
                                          })}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  : q.type === 'input' ?
                                    <div className='py-2'>
                                      <textarea
                                        value={content}
                                        onChange={(e) =>
                                          setContent(e.target.value)
                                        }
                                        placeholder='Type your answer here...'
                                        className='w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-lg focus:border-pw-primary focus:outline-none resize-none transition-all placeholder:text-pw-muted/50 focus:ring-1 focus:ring-pw-primary'
                                      />
                                    </div>
                                  : q.type === 'range' ?
                                    <div className='flex flex-col items-center gap-10 py-8'>
                                      <div className='w-full max-w-md space-y-6'>
                                        <div className='flex justify-between text-xs font-bold text-pw-muted opacity-50 uppercase tracking-widest'>
                                          <span>{q.min || 0}</span>
                                          <span>
                                            {selectedOption || q.min || 0}
                                          </span>
                                          <span>{q.max || 10}</span>
                                        </div>
                                        <input
                                          type='range'
                                          min={q.min || 0}
                                          max={q.max || 10}
                                          step={q.step || 1}
                                          value={selectedOption || q.min || 0}
                                          onChange={(e) =>
                                            setSelectedOption(e.target.value)
                                          }
                                          className='w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary hover:bg-white/20 transition-all'
                                        />
                                        <div className='flex justify-center'>
                                          <span className='text-6xl font-black text-pw-primary font-display drop-shadow-[0_0_20px_rgba(var(--pw-primary-rgb),0.4)]'>
                                            {selectedOption || q.min || 0}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  : q.type === 'rating' ?
                                    <div className='flex flex-col items-center gap-10 py-8'>
                                      <div className='flex gap-4'>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                          <button
                                            key={i}
                                            onClick={() =>
                                              setSelectedOption(i.toString())
                                            }
                                            className={cn(
                                              'transition-all transform hover:scale-125 active:scale-95',
                                              Number(selectedOption) >= i ?
                                                'text-pw-warning drop-shadow-[0_0_15px_rgba(var(--pw-warning-rgb),0.5)]'
                                              : 'text-white/10 hover:text-white/20',
                                            )}>
                                            <Star
                                              size={56}
                                              fill={
                                                Number(selectedOption) >= i ?
                                                  'currentColor'
                                                : 'none'
                                              }
                                              strokeWidth={1.5}
                                            />
                                          </button>
                                        ))}
                                      </div>
                                      <p className='text-sm text-pw-muted uppercase font-black tracking-[0.3em]'>
                                        {selectedOption ?
                                          `Rating: ${selectedOption} / 5`
                                        : 'Select a Rating'}
                                      </p>
                                    </div>
                                  : <div
                                      className={cn(
                                        'grid gap-4',
                                        q.type === 'multiple_choice' ?
                                          'grid-cols-1'
                                        : 'grid-cols-1 md:grid-cols-2',
                                      )}>
                                      {(shuffledOptions[q.id] || q.options).map(
                                        (opt, idx) => {
                                          const optId =
                                            typeof opt === 'string' ?
                                              idx.toString()
                                            : opt.id;
                                          const optText =
                                            typeof opt === 'string' ? opt : (
                                              opt.text
                                            );
                                          const isSelected =
                                            q.type === 'checkbox' ?
                                              selectedOptions.includes(optId)
                                            : selectedOption === optId;
                                          return (
                                            <button
                                              key={
                                                optId +
                                                idx +
                                                'assessment-option'
                                              }
                                              onClick={() =>
                                                q.type === 'checkbox' ?
                                                  setSelectedOptions((p) =>
                                                    p.includes(optId) ?
                                                      p.filter(
                                                        (i) => i !== optId,
                                                      )
                                                    : [...p, optId],
                                                  )
                                                : setSelectedOption(optId)
                                              }
                                              className={cn(
                                                'w-full p-5 text-left rounded-2xl border-2 transition-all hover:scale-[1.01] active:scale-[0.99] group flex items-center justify-between',
                                                isSelected ?
                                                  'bg-pw-primary/10 border-pw-primary text-pw-text shadow-xl shadow-pw-primary/5'
                                                : 'bg-white/5 border-white/5 text-pw-muted hover:border-white/10 hover:bg-white/10',
                                              )}>
                                              <span className='font-bold text-base md:text-lg'>
                                                {optText}
                                              </span>
                                              <CheckCircle
                                                className={cn(
                                                  'h-6 w-6 transition-all text-pw-primary',
                                                  isSelected ?
                                                    'opacity-100 scale-110'
                                                  : 'opacity-0 scale-50',
                                                )}
                                              />
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                  }
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        </AnimatePresence>

                        <div className='flex justify-between items-center gap-4 flex-wrap mt-8'>
                          <AnimatePresence mode='sync'>
                            {quiz.canGoBack && currentQuestion > 0 && (
                              <Button
                                onClick={GoBack}
                                className='btn-ghost h-12 px-8 text-lg rounded-2xl gap-2 font-bold'>
                                <ChevronLeft className='h-5 w-5' />
                                Previous
                              </Button>
                            )}

                            <div className='flex items-center gap-3 ml-auto'>

                              <Button
                                onClick={handleNext}
                                className='btn-primary h-14 px-12 rounded-2xl text-2xl font-black gap-4 shadow-2xl shadow-pw-primary/30 transition-all hover:scale-[1.02] active:scale-[0.96]'>
                                {currentQuestion + 1 === activeQuestions.length ?
                                  'FINISH'
                                : 'NEXT'}
                                <ChevronRight size={32} />
                              </Button>
                            </div>
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </>
                }
              </div>

              {/* Assistant Sidebar */}
              <div className='lg:col-span-4 space-y-6'>
                {q?.accessory && q.accessory !== 'none' && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='sticky top-10'>
                    <div className='flex items-center gap-2 mb-4 px-4'>
                      <AlertTriangle
                        size={14}
                        className='text-pw-primary'
                      />
                      <h4 className='text-[10px] font-black text-pw-muted uppercase tracking-[0.3em]'>
                        TOOLS
                      </h4>
                    </div>
                    {q.accessory === 'calculator' && <Calculator />}
                    {q.accessory === 'note' && (
                      <NoteSheet note={q.accessoryNote || ''} />
                    )}
                    {q.accessory === 'periodic_table' && <PeriodicTable />}
                    {q.accessory === 'formula_sheet' && (
                      <FormulaSheet
                        config={q.accessoryConfig}
                        customFormulas={q.accessoryNote}
                      />
                    )}
                    {q.accessory === 'glossary' && <Glossary />}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
