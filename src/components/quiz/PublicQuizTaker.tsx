'use client';

// jules edit: Sleek High-Fidelity Quiz Taker with Per-Question scroll states, Form/Research layout segregation, and glowing bg-objects
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
  AlertTriangle,
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
  HelpCircle,
  Folder,
  Flag,
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
import type { Question, Quiz, QuizOption } from '@/app/(main)/quiz/page';
import { useParams } from 'next/navigation';
import { usePageLayout } from '@/components/layout';

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'dropdown'
  | 'checkbox'
  | 'input'
  | 'range'
  | 'rating';

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

// --- Calculator Component ---
const Calculator = () => {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const calculate = (expression: string) => {
    try {
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

export default function PublicQuizTaker() {
  const { setHideNavbar, setHideFooter, setPaddingTop } = usePageLayout();
  setHideNavbar(true);
  setHideFooter(true);
  setPaddingTop('pt-0');

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
  const [started, setStart] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Record<string, (string | QuizOption)[]>
  >({});

  const bottomRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (quiz?.quizScroll && started) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentQuestion, started, quiz?.quizScroll]);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [hasAlreadyCompleted, setHasAlreadyCompleted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineUncached, setIsOfflineUncached] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet restored! Online syncing active.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Working Offline: Responses will be saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [showIntro, setShowIntro] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [detailsCollected, setDetailsCollected] = useState(false);
  const [userData, setUserData] = useState<Record<string, string>>({});

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportedStatus, setReportedStatus] = useState(false);

  // jules edit: Per-question scroll answers dictionary mapping question IDs to selections
  const [scrollAnswers, setScrollAnswers] = useState<Record<string, any>>({});

  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);
  const [lastUncatIndex, setLastUncatIndex] = useState<number>(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [quizTheme, setQuizTheme] = useState<'dark' | 'light'>('dark');
  const [cheatAttempts, setCheatAttempts] = useState(0);
  const [showSecurityProtocol, setShowSecurityProtocol] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const pendingUnloadCb = React.useRef<(() => void) | null>(null);

  const correctAnswersRef = React.useRef<Record<string, any>>({});

  // Custom states for reporting quizzes
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('Spam');
  const [reportNotes, setReportNotes] = useState('');

  // 1. Initial Load
  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      const data = await HybridStorage.getAll('quiz');
      const target = (data.find((q: any) => String(q.id) === String(quizId)) ||
        null) as Quiz | null;

      if (!target && !navigator.onLine) {
        setIsOfflineUncached(true);
        setLoading(false);
        return;
      }

      if (target) {
        // Block expired quizzes from loading
        if (
          target.expires_at &&
          new Date(target.expires_at).getTime() < Date.now()
        ) {
          setQuiz(null);
          setLoading(false);
          return;
        }

        // Auth check if enabled
        let session = null;
        try {
          const { data } = await supabase.auth.getSession();
          session = data?.session;
        } catch (err) {
          console.warn('Supabase auth check failed', err);
        }

        if (!target.askDetails && !session) {
          setAuthRequired(true);
        }

        // Migration: Ensure options have IDs
        const secureAnswers: Record<string, any> = {};
        const migratedQuestions = target.questions.map((q) => {
          let newCorrectIndex = q.correctIndex;
          if (q.options.length > 0 && typeof q.options[0] === 'string') {
            const optionsWithIds = q.options.map((opt, idx) => ({
              id: `${q.id}-opt-${idx}`,
              text: opt as string,
            }));

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

            secureAnswers[q.id] = newCorrectIndex;
            return {
              ...q,
              options: optionsWithIds,
              correctIndex: null,
            };
          }
          secureAnswers[q.id] = q.correctIndex;
          return {
            ...q,
            correctIndex: null,
          };
        });

        correctAnswersRef.current = secureAnswers;

        const finalQuiz = {
          ...target,
          questions: migratedQuestions.map((q) => ({
            ...q,
            correctIndex: null,
          })),
        };
        setQuiz(finalQuiz);
        if (finalQuiz)
          document.title = `${capFirst(finalQuiz.title)} | Ping World`;

        // Completion check
        const completionMarker = localStorage.getItem(`completed_quiz_${finalQuiz.id}`);
        if (completionMarker && !finalQuiz.allowRetry) {
          setHasAlreadyCompleted(true);
        }

        // Shuffle questions
        let questionsToUse = [...migratedQuestions];
        if (finalQuiz.randomizeQuestions) {
          const uncategorized = migratedQuestions.filter(
            (q) => !q.category || q.category.trim() === '',
          );
          const categoriesMap: Record<string, Question[]> = {};
          migratedQuestions.forEach((q) => {
            if (q.category && q.category.trim() !== '') {
              if (!categoriesMap[q.category]) {
                categoriesMap[q.category] = [];
              }
              categoriesMap[q.category].push(q);
            }
          });

          const shuffledUncat = [...uncategorized];
          for (let i = shuffledUncat.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledUncat[i], shuffledUncat[j]] = [shuffledUncat[j], shuffledUncat[i]];
          }

          const shuffledCategories: Question[] = [];
          Object.entries(categoriesMap).forEach(([catName, questions]) => {
            const shuffledCat = [...questions];
            for (let i = shuffledCat.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledCat[i], shuffledCat[j]] = [shuffledCat[j], shuffledCat[i]];
            }
            shuffledCategories.push(...shuffledCat);
          });

          questionsToUse = [...shuffledUncat, ...shuffledCategories];
        }
        setActiveQuestions(questionsToUse);
        const firstUncatIdx = questionsToUse.findIndex(
          (quest) => !quest.category || quest.category.trim() === '',
        );
        if (firstUncatIdx !== -1) {
          setCurrentQuestion(firstUncatIdx);
        } else {
          setCurrentQuestion(0);
        }

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
    if (started && !isFinished && quiz?.hasTimer) {
      const totalQuestionTimers = activeQuestions.reduce(
        (sum, q) => sum + (q.timer || 0),
        0,
      );
      let generalTimerSeconds =
        (typeof quiz.hasTimer === 'number' ? quiz.hasTimer : 10) * 60;
      if (totalQuestionTimers > generalTimerSeconds) {
        const remainder = totalQuestionTimers - generalTimerSeconds;
        generalTimerSeconds += remainder;
      }
      if (generalTimerSeconds > 0) {
        setTimeLeft(generalTimerSeconds);
      }
    }
  }, [started, quiz, activeQuestions]);

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

  useEffect(() => {
    const activeQ = activeQuestions[currentQuestion];
    if (started && activeQ && activeQ.timer && !isFinished) {
      setQuestionTimeLeft(activeQ.timer);
    } else {
      setQuestionTimeLeft(null);
    }
  }, [started, currentQuestion, activeQuestions, isFinished]);

  useEffect(() => {
    if (questionTimeLeft === null || questionTimeLeft <= 0 || isFinished) {
      if (questionTimeLeft === 0 && !isFinished) {
        handleNext(true);
      }
      return;
    }
    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev && prev > 1) return prev - 1;
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [questionTimeLeft, isFinished]);

  // Tab focus change monitoring cybersecurity shield
  useEffect(() => {
    if (!started || !quiz?.enforceSecurity || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const nextAttempts = cheatAttempts + 1;
        setCheatAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          toast.error('Multiple security violations detected. Auto-submitting assessment.');
          finalizeQuiz(userAnswers);
        } else {
          toast.warning(
            `Security Violation (${nextAttempts}/3): Tab switching is strictly prohibited!`,
            { duration: 5000 }
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [started, quiz, cheatAttempts, userAnswers, isFinished]);

  // Cybersecurity: lock highlighting, copy/paste, right-click context menus
  useEffect(() => {
    if (!started || !quiz?.enforceSecurity || isFinished) return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
      toast.warning('Security Mode: Clipboard actions & right-clicks are disabled.');
    };

    const blockedEvents = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'drag', 'dragstart'] as const;
    blockedEvents.forEach((evt) => document.addEventListener(evt, preventDefault, true));

    return () => {
      blockedEvents.forEach((evt) => document.removeEventListener(evt, preventDefault, true));
    };
  }, [started, quiz?.enforceSecurity, isFinished]);

  const q = useMemo(() => {
    if (!activeQuestions || activeQuestions.length === 0) return null;
    return activeQuestions[currentQuestion] || null;
  }, [activeQuestions, currentQuestion]);

  const answeredCount = useMemo(() => {
    return new Set(userAnswers.map((a) => a.questionId)).size;
  }, [userAnswers]);

  const categoryScores = useMemo(() => {
    if (!quiz || userAnswers.length === 0) return {};
    const catStats: Record<string, { correct: number; total: number }> = {};
    const qMap = new Map(quiz.questions.map((quest) => [quest.id, quest]));

    userAnswers.forEach((ans) => {
      const question = qMap.get(ans.questionId);
      if (question && question.category && question.category.trim() !== '') {
        const cat = question.category.trim();
        if (!catStats[cat]) {
          catStats[cat] = { correct: 0, total: 0 };
        }
        catStats[cat].total += 1;
        if (ans.correct) {
          catStats[cat].correct += 1;
        }
      }
    });

    return catStats;
  }, [quiz, userAnswers]);

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
            className='flex-1 h-9 rounded-xl bg-pw-danger/20 border border-pw-danger/40 text-pw-danger text-xs font-bold'
            onClick={() => {
              toast.dismiss('quiz-leave-confirm');
              pendingUnloadCb.current?.();
              pendingUnloadCb.current = null;
            }}>
            Leave
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/20 border border-pw-primary/40 text-pw-primary text-xs font-bold'
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
      }
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const confirmSubmitQuiz = () => {
    toast(
      <div className='flex flex-col gap-3 py-1'>
        <p className='font-bold text-sm'>Submit Assessment?</p>
        <p className='text-xs text-pw-muted leading-relaxed'>
          Are you sure you want to finalize your answers and submit?
        </p>
        <div className='flex gap-2 pt-1'>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-success/20 border border-pw-success/40 text-pw-success text-xs font-bold'
            onClick={() => {
              toast.dismiss('quiz-submit-confirm');
              finalizeQuiz(userAnswers);
            }}>
            Submit
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary text-xs font-bold'
            onClick={() => toast.dismiss('quiz-submit-confirm')}>
            Cancel
          </button>
        </div>
      </div>,
      {
        id: 'quiz-submit-confirm',
        duration: Infinity,
        position: 'top-center',
      }
    );
  };

  // jules edit: Helper to dynamically compute if an answer is correct
  const computeIsCorrect = (qId: string, answer: any) => {
    const secureAnswer = correctAnswersRef.current[qId];
    if (!secureAnswer) return true;
    let decodedCorrect: any = secureAnswer;
    try {
      if (typeof secureAnswer === 'string' && secureAnswer.length > 5) {
        const decoded = atob(secureAnswer);
        decodedCorrect = JSON.parse(decoded);
      }
    } catch {
      decodedCorrect = secureAnswer;
    }

    const question = activeQuestions.find(quest => quest.id === qId);
    if (!question) return false;

    if (question.type === 'checkbox') {
      const correctIds = Array.isArray(decodedCorrect) ? decodedCorrect : [decodedCorrect];
      return Array.isArray(answer) && answer.length === correctIds.length && answer.every((val: any) => correctIds.includes(val));
    } else if (question.type === 'input') {
      const userAns = String(answer).trim();
      const targetAns = String(decodedCorrect).trim();
      return question.caseSensitive ? userAns === targetAns : userAns.toLowerCase() === targetAns.toLowerCase();
    } else if (question.type === 'true_false') {
      return String(answer).toLowerCase() === String(decodedCorrect).toLowerCase();
    }
    return String(answer) === String(decodedCorrect);
  };

  const handleNext = (isAutoSubmit: any = false) => {
    const autoSubmit = isAutoSubmit === true;

    // jules edit: Support scrollAnswers state lookups
    const currentQId = q?.id || '';
    let currentSelectedOption = quiz?.quizScroll ? scrollAnswers[currentQId] : selectedOption;

    if (!autoSubmit) {
      if (q?.type === 'checkbox') {
        const activeBoxAnswers = quiz?.quizScroll ? (scrollAnswers[currentQId] || []) : selectedOptions;
        if (activeBoxAnswers.length === 0) {
          return toast.error('Please select at least one answer');
        }
      }
      if (q?.type === 'range' && currentSelectedOption === null) {
        currentSelectedOption = (q.min || 0).toString();
      }

      if (currentSelectedOption === null && q?.type !== 'input' && q?.type !== 'checkbox') {
        return toast.error('Please select an answer');
      }
    }

    let correct = false;
    if (quiz?.type === 'quiz' && q) {
      const activeAns = q.type === 'checkbox'
        ? (quiz?.quizScroll ? (scrollAnswers[currentQId] || []) : selectedOptions)
        : q.type === 'input'
          ? (quiz?.quizScroll ? (scrollAnswers[currentQId] || '') : content)
          : currentSelectedOption;

      correct = computeIsCorrect(q.id, activeAns);

      if (correct) setScore((s) => s + 1);
      setIsCorrect(correct);

      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);

      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = { questionId: qId, answer: activeAns, correct };
      } else {
        updatedAnswers = [...userAnswers, { questionId: qId, answer: activeAns, correct }];
      }

      setUserAnswers(updatedAnswers);
      setScore(updatedAnswers.filter((a) => a.correct).length);

      if (quiz?.correctOption) {
        setShowFeedback(true);
        setTimeout(() => {
          proceedToNext(updatedAnswers);
        }, 1500);
      } else {
        proceedToNext(updatedAnswers);
      }
    } else if (q) {
      const activeAns = q.type === 'checkbox'
        ? (quiz?.quizScroll ? (scrollAnswers[currentQId] || []) : selectedOptions)
        : q.type === 'input'
          ? (quiz?.quizScroll ? (scrollAnswers[currentQId] || '') : content)
          : currentSelectedOption;

      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);
      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = { questionId: qId, answer: activeAns };
      } else {
        updatedAnswers = [...userAnswers, { questionId: qId, answer: activeAns }];
      }
      setUserAnswers(updatedAnswers);
      proceedToNext(updatedAnswers);
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

  // jules edit: Proceed to the next question, taking logical branching configuration into account
  const proceedToNext = (latestAnswers?: any[]) => {
    setShowFeedback(false);
    const answersToSave = latestAnswers || userAnswers;

    const q = activeQuestions[currentQuestion];
    let nextIdx = currentQuestion + 1;

    // Apply logical branching (skipTo / skipToCat targets on both options and questions) for progressive layouts
    if (q && !quiz?.quizScroll) {
      let branchTarget: string | undefined = undefined;
      let branchCat: string | undefined = undefined;

      // Option-level branching
      if (q.type !== 'checkbox' && q.type !== 'input') {
        const currentQId = q.id;
        const currentSelectedOption = selectedOption;

        if (currentSelectedOption !== null) {
          const currentOpts = shuffledOptions[q.id] || q.options || [];
          const foundOpt = currentOpts.find((opt: any, oIdx: number) => {
            const optId = opt && typeof opt === 'object' ? (opt.id || String(oIdx)) : String(oIdx);
            return optId === currentSelectedOption;
          });
          if (foundOpt && typeof foundOpt === 'object') {
            if (foundOpt.skipTo) branchTarget = foundOpt.skipTo;
            if (foundOpt.skipToCat) branchCat = foundOpt.skipToCat;
          }
        }
      }

      // Question-level branching fallback
      if (!branchTarget && !branchCat) {
        if (q.skipTo) branchTarget = q.skipTo;
        if (q.skipToCat) branchCat = q.skipToCat;
      }

      if (branchTarget === 'end') {
        finalizeQuiz(answersToSave);
        return;
      } else if (branchTarget) {
        const targetIdx = activeQuestions.findIndex((quest) => quest.id === branchTarget);
        if (targetIdx !== -1) {
          nextIdx = targetIdx;
        }
      } else if (branchCat) {
        const targetIdx = activeQuestions.findIndex(
          (quest) => quest.category && quest.category.trim().toLowerCase() === branchCat!.trim().toLowerCase()
        );
        if (targetIdx !== -1) {
          nextIdx = targetIdx;
        }
      }
    }

    const nextQ = activeQuestions[nextIdx];

    if (!nextQ) {
      finalizeQuiz(answersToSave);
      return;
    }

    if (quiz && nextIdx < activeQuestions.length) {
      setNavigationHistory((prev) => [...prev, currentQuestion]);
      setCurrentQuestion(nextIdx);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    } else {
      finalizeQuiz(answersToSave);
    }
  };

  const GoBack = () => {
    setShowFeedback(false);
    if (!quiz?.canGoBack) return;
    if (navigationHistory.length > 0) {
      const prevHistory = [...navigationHistory];
      const prevIdx = prevHistory.pop()!;
      setNavigationHistory(prevHistory);
      setCurrentQuestion(prevIdx);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    }
  };

  // jules edit: Render question cards with distinct question values mapped to scrollAnswers
  const renderQuestionCard = (quest: Question, index: number) => {
    const isActive = index === currentQuestion;

    // Read selections dynamically from scrollAnswers inside scroll layouts
    const currentOptions = shuffledOptions[quest.id] || quest.options;

    const activeSelected = quiz?.quizScroll ? (scrollAnswers[quest.id] || null) : selectedOption;
    const activeChecked = quiz?.quizScroll ? (scrollAnswers[quest.id] || []) : selectedOptions;
    const activeText = quiz?.quizScroll ? (scrollAnswers[quest.id] || '') : content;

    return (
      <Card
        key={quest.id}
        className={cn(
          'sm:glass sm:rounded-3xl bg-transparent sm:p-6 sm:bg-pw-surface/40 sm:border-white/5 sm:shadow-2xl ring-0 sm:ring-1 flex flex-col w-full max-w-[600px] mb-8 transition-all duration-300',
          !isActive && quiz?.quizLayout !== 'scroll' && 'opacity-65 pointer-events-none',
        )}
      >
        <div className='flex items-center gap-3 mb-4'>
          {quiz?.quizScroll && quiz?.quizLayout === 'scroll' ? (
            // jules edit: Clean plain numeric list-style list numbering with no large card-like container box
            <div className='text-pw-primary font-black text-xl select-none mr-1'>
              {index + 1}.
            </div>
          ) : (
            <div className='h-10 w-10 rounded-xl bg-pw-primary/10 border border-pw-primary/20 flex items-center justify-center text-pw-primary font-bold'>
              {index + 1}
            </div>
          )}
          <div>
            <span className='text-[9px] font-black text-pw-muted uppercase block'>Question {index + 1}</span>
            <h2 className='text-base font-bold text-white'>{quest.text}</h2>
          </div>
        </div>

        <div className='space-y-3 mt-2'>
          {quest.type === 'input' ? (
            <textarea
              value={activeText}
              onChange={(e) => {
                if (quiz?.quizScroll) {
                  setScrollAnswers(prev => ({ ...prev, [quest.id]: e.target.value }));
                  // Sync to answers
                  const correct = computeIsCorrect(quest.id, e.target.value);
                  const existingIdx = userAnswers.findIndex((a) => a.questionId === quest.id);
                  let updated;
                  if (existingIdx > -1) {
                    updated = [...userAnswers];
                    updated[existingIdx] = { questionId: quest.id, answer: e.target.value, correct };
                  } else {
                    updated = [...userAnswers, { questionId: quest.id, answer: e.target.value, correct }];
                  }
                  setUserAnswers(updated);
                } else {
                  setContent(e.target.value);
                }
              }}
              placeholder='Type your answer here...'
              className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-pw-primary resize-none'
            />
          ) : (
            <div className='grid gap-2.5'>
              {currentOptions.map((opt: any, oIdx) => {
                const optId = opt.id || String(oIdx);
                const optText = opt.text || String(opt);

                const isSelected =
                  quest.type === 'checkbox' ? activeChecked.includes(optId) : activeSelected === optId;

                return (
                  <button
                    key={optId}
                    onClick={() => {
                      if (quiz?.quizScroll) {
                        let val;
                        if (quest.type === 'checkbox') {
                          val = activeChecked.includes(optId) ? activeChecked.filter((i: any) => i !== optId) : [...activeChecked, optId];
                        } else {
                          val = optId;
                        }
                        setScrollAnswers(prev => ({ ...prev, [quest.id]: val }));

                        const correct = computeIsCorrect(quest.id, val);
                        const existingIdx = userAnswers.findIndex((a) => a.questionId === quest.id);
                        let updated;
                        if (existingIdx > -1) {
                          updated = [...userAnswers];
                          updated[existingIdx] = { questionId: quest.id, answer: val, correct };
                        } else {
                          updated = [...userAnswers, { questionId: quest.id, answer: val, correct }];
                        }
                        setUserAnswers(updated);
                      } else {
                        if (quest.type === 'checkbox') {
                          setSelectedOptions((p) => p.includes(optId) ? p.filter((i) => i !== optId) : [...p, optId]);
                        } else {
                          setSelectedOption(optId);
                        }
                      }
                    }}
                    className={cn(
                      'w-full h-11 px-3 text-left rounded-xl border transition-all text-xs flex items-center justify-between',
                      isSelected ? 'bg-pw-primary/10 border-pw-primary text-white font-bold' : 'bg-white/5 border-white/10 text-pw-muted'
                    )}
                  >
                    <span>{optText}</span>
                    <CheckCircle className={cn('h-4 w-4 text-pw-primary transition-opacity', isSelected ? 'opacity-100' : 'opacity-0')} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-6'>
        <Puzzle className='h-12 w-12 text-pw-muted mb-4 opacity-20' />
        <h2 className='text-2xl font-bold mb-2'>Loading Assessment...</h2>
      </div>
    );
  }

  if (isOfflineUncached) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-4 py-6'>
        <AlertTriangle className='h-12 w-12 text-pw-warning mb-4 animate-pulse' />
        <h2 className='text-2xl font-bold mb-1'>Offline: Quiz Not Cached Yet</h2>
        <p className='text-sm text-pw-muted max-w-sm'>Please connect to the internet to load this assessment.</p>
      </div>
    );
  }

  if (isFinished) {
    const totalQuestions = activeQuestions.length;
    return (
      <div className='relative min-h-screen bg-[#0A0C1B] text-white flex items-center justify-center p-6'>
        <div className='max-w-md w-full text-center space-y-6'>
          <div className='w-16 h-16 bg-pw-success/10 rounded-full flex items-center justify-center mx-auto border border-pw-success/20'>
            <CheckCircle2 className='h-8 w-8 text-pw-success' />
          </div>
          <h1 className='text-3xl font-extrabold font-display'>Assessment Completed!</h1>
          <p className='text-pw-muted text-sm'>Your responses have been successfully submitted.</p>

          {quiz?.type === 'quiz' && (
            <Card className='p-6 bg-white/[0.02] border border-white/5 rounded-2xl'>
              <span className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block mb-1'>Your Performance</span>
              <span className='text-3xl font-bold font-mono text-pw-primary'>{score} / {totalQuestions}</span>
            </Card>
          )}

          <Link href='/quiz'>
            <Button className='btn-primary w-full h-11 rounded-xl font-bold mt-4'>Back to Quiz Builder</Button>
          </Link>
        </div>
      </div>
    );
  }

  // jules edit: Setup beautiful animated floating bg-objects and hide horizontal overflows
  return (
    <div
      onContextMenu={(e) => quiz?.enforceSecurity && e.preventDefault()}
      className={cn(
        'relative min-h-screen flex flex-col bg-pw-bg text-white overflow-x-hidden selection:bg-pw-primary/30 selection:text-white',
        quiz?.enforceSecurity && 'select-none'
      )}
    >
      {/* Sleek Glowing Background Objects */}
      <div className='absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-pw-primary/10 blur-[100px] pointer-events-none' />
      <div className='absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pw-secondary/10 blur-[120px] pointer-events-none' />

      {/* Intro Gate */}
      {showIntro && !started && (
        <div className='container mx-auto px-6 py-20 max-w-2xl text-center flex-1 flex flex-col justify-center relative z-10'>
          {quiz?.introBgUrl && (
            <div
              className='absolute inset-0 z-0 bg-cover bg-center pointer-events-none'
              style={{ backgroundImage: `url(${quiz?.introBgUrl})`, opacity: 0.1, filter: 'blur(8px)' }}
            />
          )}

          <div className='relative z-10 space-y-6'>
            <h1 className='text-4xl font-extrabold font-display tracking-tight'>{quiz?.title.toUpperCase()}</h1>
            <p className='text-pw-muted text-sm leading-relaxed max-w-lg mx-auto'>{quiz?.description}</p>

            {/* jules edit: Sleek positioned disclaimer layout inside the Intro card */}
            {quiz?.disclaimer && (
              <div className='flex items-start gap-3 p-4 bg-pw-warning/5 border border-pw-warning/15 rounded-2xl max-w-lg mx-auto text-xs text-pw-muted leading-relaxed text-left'>
                <AlertTriangle size={16} className='text-pw-warning shrink-0 mt-0.5' />
                <span>{quiz.disclaimer}</span>
              </div>
            )}

            <Button
              className='btn-primary h-11 px-10 rounded-full font-bold shadow-lg shadow-pw-primary/20'
              onClick={() => {
                setStart(true);
                setShowIntro(false);
              }}
            >
              START ASSESSMENT
            </Button>
          </div>
        </div>
      )}

      {/* Main quiz interface */}
      {started && !isFinished && (
        <div className='container mx-auto px-6 py-12 max-w-3xl flex-1 flex flex-col justify-center relative z-10'>
          <div className='mb-6 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 flex-wrap gap-4'>
            <div>
              <h2 className='text-md font-bold text-white'>{quiz?.title}</h2>
              <span className='text-[10px] text-pw-muted uppercase font-mono tracking-wider'>
                {currentQuestion + 1} of {activeQuestions.length} Questions
              </span>
            </div>

            <div className='flex items-center gap-3.5 flex-wrap'>
              {/* jules edit: Live presentation layout switcher dropdown directly inside the taker header (locked for mandatory form types) */}
              {quiz?.surveyType !== 'form' && (
                <div className='flex flex-col gap-1 items-start'>
                  <span className='text-[8px] uppercase tracking-widest text-pw-muted font-black'>Presentation</span>
                  <select
                    value={quiz?.quizLayout || (quiz?.quizScroll ? 'scroll' : 'single')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuiz(prev => prev ? {
                        ...prev,
                        quizLayout: val,
                        quizScroll: val !== 'single'
                      } : null);
                      toast.success(`Presentation layout set to: ${val.toUpperCase().replace('_', ' ')}`);
                    }}
                    className='bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none cursor-pointer font-bold'
                  >
                    <option value='single' className='bg-[#0A0C1B]'>Single Page</option>
                    <option value='scroll' className='bg-[#0A0C1B]'>Scroll All</option>
                    <option value='scroll_show' className='bg-[#0A0C1B]'>Scroll Show</option>
                  </select>
                </div>
              )}

              {quiz?.hasTimer && timeLeft !== null && (
                <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pw-danger/10 border border-pw-danger/20 text-pw-danger text-xs font-bold font-mono'>
                  <Clock className='h-3.5 w-3.5 animate-pulse' />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
          </div>

          {/* jules edit: Layout selector routing (Scroll All vs Scroll Show vs Single Show) */}
          <div className='flex flex-col items-center w-full'>
            {quiz?.quizScroll && (quiz?.quizLayout === 'scroll_show' || !quiz?.quizLayout) ? (
              // Continuous scroll on-response dynamic layout (Research setting)
              <div className='flex flex-col items-center w-full gap-0'>
                {activeQuestions
                  .slice(0, Math.min(currentQuestion + 1, userAnswers.length + 1))
                  .map((quest, idx) => renderQuestionCard(quest, idx))}
                <div ref={bottomRef} />

                <div className='flex items-center gap-3 mt-4'>
                  <Button onClick={() => handleNext()} className='btn-primary h-11 px-10 rounded-xl font-bold gap-2'>
                    {currentQuestion + 1 === activeQuestions.length ? 'Finish Assessment' : 'Next Question'}
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ) : quiz?.quizScroll && quiz?.quizLayout === 'scroll' ? (
              // continuous full-scroll-all layout strictly for 'form' type survey, with 0 logic branching
              <div className='flex flex-col items-center w-full gap-0'>
                {activeQuestions.map((quest, idx) => renderQuestionCard(quest, idx))}
                <div ref={bottomRef} />

                <div className='flex items-center gap-3 mt-4'>
                  <Button
                    onClick={() => finalizeQuiz(userAnswers)}
                    disabled={userAnswers.length < activeQuestions.length}
                    className='btn-primary h-11 px-10 rounded-xl font-bold gap-2 disabled:opacity-40'
                  >
                    Finish Survey Form
                    <CheckCircle2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ) : (
              // Single Show page-by-page layout (with Previous and Next working perfectly)
              <div className='w-full flex flex-col items-center'>
                {renderQuestionCard(q!, currentQuestion)}

                <div className='flex justify-between w-full max-w-[600px] mt-6'>
                  <Button
                    onClick={GoBack}
                    disabled={currentQuestion === 0}
                    variant='outline'
                    className='h-10 px-6 border-white/10 text-xs font-bold gap-1'
                  >
                    <ChevronLeft className='h-4 w-4' /> Previous
                  </Button>
                  <Button onClick={() => handleNext()} className='btn-primary h-10 px-8 rounded-xl font-bold gap-1'>
                    {currentQuestion + 1 === activeQuestions.length ? 'Finish' : 'Next'}
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
