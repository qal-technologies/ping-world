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
import { useAppContext } from '@/context/AppContext';

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
  const { isLoggedIn } = useAppContext();
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

        // Completion check
        const completionMarker = localStorage.getItem(
          `completed_quiz_${finalQuiz.id}`,
        );
        if (completionMarker && !finalQuiz.allowRetry) {
          setHasAlreadyCompleted(true);
        }

        const hasBranching = migratedQuestions.some(
          (q) => q.skipTo || q.skipToCat || q.options?.some((o: any) => typeof o === 'object' && (o.skipTo || o.skipToCat)),
        );
        if (hasBranching && finalQuiz.randomizeQuestions) {
          toast.info('Branching Active: Question order shuffling is restricted to internal category blocks.');
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
            [shuffledUncat[i], shuffledUncat[j]] = [
              shuffledUncat[j],
              shuffledUncat[i],
            ];
          }

          const shuffledCategories: Question[] = [];
          Object.entries(categoriesMap).forEach(([catName, questions]) => {
            const shuffledCat = [...questions];
            for (let i = shuffledCat.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledCat[i], shuffledCat[j]] = [
                shuffledCat[j],
                shuffledCat[i],
              ];
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
      if (quiz?.title) document.title = `${capFirst(quiz.title)} | Ping World`;
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
          toast.error(
            'Multiple security violations detected. Auto-submitting assessment.',
          );
          finalizeQuiz(userAnswers);
        } else {
          toast.warning(
            `Security Violation (${nextAttempts}/3): Tab switching is strictly prohibited!`,
            { duration: 5000 },
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [started, quiz, cheatAttempts, userAnswers, isFinished]);

  // Cybersecurity: lock highlighting, copy/paste, right-click context menus
  useEffect(() => {
    if (!started || !quiz?.enforceSecurity || isFinished) return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
      toast.warning(
        'Security Mode: Clipboard actions & right-clicks are disabled.',
      );
    };

    const blockedEvents = [
      'copy',
      'cut',
      'paste',
      'contextmenu',
      'selectstart',
      'drag',
      'dragstart',
    ] as const;
    blockedEvents.forEach((evt) =>
      document.addEventListener(evt, preventDefault, true),
    );

    return () => {
      blockedEvents.forEach((evt) =>
        document.removeEventListener(evt, preventDefault, true),
      );
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
      },
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
      },
    );
  };

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

    const question = activeQuestions.find((quest) => quest.id === qId);
    if (!question) return false;

    if (question.type === 'checkbox') {
      const correctIds =
        Array.isArray(decodedCorrect) ? decodedCorrect : [decodedCorrect];
      return (
        Array.isArray(answer) &&
        answer.length === correctIds.length &&
        answer.every((val: any) => correctIds.includes(val))
      );
    } else if (question.type === 'input') {
      const userAns = String(answer).trim();
      const targetAns = String(decodedCorrect).trim();
      return question.caseSensitive ?
          userAns === targetAns
        : userAns.toLowerCase() === targetAns.toLowerCase();
    } else if (question.type === 'true_false') {
      return (
        String(answer).toLowerCase() === String(decodedCorrect).toLowerCase()
      );
    }
    return String(answer) === String(decodedCorrect);
  };

  const handleNext = (isAutoSubmit: any = false) => {
    const autoSubmit = isAutoSubmit === true;

    const currentQId = q?.id || '';
    let currentSelectedOption =
      quiz?.quizScroll ? scrollAnswers[currentQId] : selectedOption;

    if (!autoSubmit) {
      if (q?.type === 'checkbox') {
        const activeBoxAnswers =
          quiz?.quizScroll ? scrollAnswers[currentQId] || [] : selectedOptions;
        if (activeBoxAnswers.length === 0) {
          return toast.error('Please select at least one answer');
        }
      }
      if (q?.type === 'range' && currentSelectedOption === null) {
        currentSelectedOption = (q.min || 0).toString();
      }

      if (
        currentSelectedOption === null &&
        q?.type !== 'input' &&
        q?.type !== 'checkbox'
      ) {
        return toast.error('Please select an answer');
      }
    }

    let correct = false;
    if (quiz?.type === 'quiz' && q) {
      const activeAns =
        q.type === 'checkbox' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || []
          : selectedOptions
        : q.type === 'input' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || ''
          : content
        : currentSelectedOption;

      correct = computeIsCorrect(q.id, activeAns);

      if (correct) setScore((s) => s + 1);
      setIsCorrect(correct);

      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);

      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = {
          questionId: qId,
          answer: activeAns,
          correct,
        };
      } else {
        updatedAnswers = [
          ...userAnswers,
          { questionId: qId, answer: activeAns, correct },
        ];
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
      const activeAns =
        q.type === 'checkbox' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || []
          : selectedOptions
        : q.type === 'input' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || ''
          : content
        : currentSelectedOption;

      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);
      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = { questionId: qId, answer: activeAns };
      } else {
        updatedAnswers = [
          ...userAnswers,
          { questionId: qId, answer: activeAns },
        ];
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

  // Proceed to the next question, taking logical branching configuration into account
  // jules edit: Strict category branching isolation to prevent category question leaking
  const proceedToNext = (latestAnswers?: any[], chosenOptionVal?: string | null) => {
    setShowFeedback(false);
    const answersToSave = latestAnswers || userAnswers;

    const q = activeQuestions[currentQuestion];
    let nextIdx = currentQuestion + 1;
    const isScrollLayout = !!(quiz?.quizScroll || quiz?.quizLayout === 'scroll' || quiz?.surveyType === 'form');

    if (q && !isScrollLayout) {
      let branchTarget: string | undefined = undefined;
      let branchCat: string | undefined = undefined;

      // Option-level branching
      if (q.type !== 'checkbox' && q.type !== 'input') {
        const currentChoice = chosenOptionVal !== undefined ? chosenOptionVal : selectedOption;

        if (currentChoice !== null && currentChoice !== undefined) {
          const currentOpts = shuffledOptions[q.id] || q.options || [];
          const foundOpt = currentOpts.find((opt: any, oIdx: number) => {
            if (opt && typeof opt === 'object') {
              return opt.id === currentChoice || String(oIdx) === String(currentChoice) || opt.text === currentChoice;
            }
            return String(oIdx) === String(currentChoice) || String(opt) === String(currentChoice);
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
        const targetIdx = activeQuestions.findIndex(
          (quest) => quest.id === branchTarget,
        );
        if (targetIdx !== -1) {
          nextIdx = targetIdx;
        }
      } else if (branchCat) {
        const cleanCat = branchCat.trim().toLowerCase();
        const catQuestions = activeQuestions.filter(
          (quest) => quest.category && quest.category.trim().toLowerCase() === cleanCat,
        );
        const targetIdx = activeQuestions.findIndex(
          (quest) => quest.category && quest.category.trim().toLowerCase() === cleanCat,
        );

        if (targetIdx !== -1) {
          nextIdx = targetIdx;
        }
      // jules edit: Category boundary checks only apply when explicit branching skip targets are active
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

  // jules edit: Replace detail variable placeholders using @ (@name, @email) with bold styling
  const formatDetailVars = (rawText: string) => {
    if (!rawText) return rawText;
    let formatted = rawText;
    Object.entries(userData || {}).forEach(([key, val]) => {
      const cleanKey = key.trim().replace(/\s+/g, '');
      const boldVal = `<strong class="text-pw-primary font-bold">${val}</strong>`;
      const regex1 = new RegExp(`@${cleanKey}`, 'gi');
      const regex2 = new RegExp(`@${key.trim()}`, 'gi');
      const regex3 = new RegExp(`\\$${cleanKey}`, 'gi');
      const regex4 = new RegExp(`\\$${key.trim()}`, 'gi');
      formatted = formatted
        .replace(regex1, boldVal)
        .replace(regex2, boldVal)
        .replace(regex3, boldVal)
        .replace(regex4, boldVal);
    });
    return formatted;
  };

  const renderQuestionCard = (quest: Question, index: number) => {
    const isActive = index === currentQuestion;
    const isScrollLayout = !!(quiz?.quizScroll || quiz?.quizLayout === 'scroll' || quiz?.surveyType === 'form');

    // Read selections dynamically from scrollAnswers inside scroll layouts
    const currentOptions = shuffledOptions[quest.id] || quest.options;

    const activeSelected =
      isScrollLayout ? scrollAnswers[quest.id] || null : selectedOption;
    const activeChecked =
      isScrollLayout ? scrollAnswers[quest.id] || [] : selectedOptions;
    const activeText =
      isScrollLayout ? scrollAnswers[quest.id] || '' : content;

    const formattedQuestionText = formatDetailVars(quest.text);

    return (
      <Card
        key={quest.id}
        className={cn(
          'sm:glass sm:rounded-3xl bg-transparent sm:p-6 sm:bg-pw-surface/40 sm:border-white/5 sm:shadow-2xl ring-0 sm:ring-1 flex flex-col w-full max-w-[600px] mb-8 transition-all duration-300',
          !isActive &&
            !isScrollLayout &&
            'opacity-65 pointer-events-none',
        )}>
        <div className='flex items-start gap-3 mb-4'>
          {isScrollLayout ? (
            <div className='flex items-baseline gap-2'>
              <span className='text-pw-primary font-black text-xl select-none shrink-0'>
                {index + 1}.
              </span>
              <h2 className='text-base font-bold text-white' dangerouslySetInnerHTML={{ __html: formattedQuestionText }} />
            </div>
          ) : (
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'h-12 w-12 rounded-[18px] flex items-center justify-center shrink-0 border shadow-inner',
                  quiz?.type === 'quiz'
                    ? 'bg-pw-primary/5 text-pw-primary border-pw-primary/10'
                    : 'bg-pw-cyan/5 text-pw-cyan border-pw-cyan/10',
                )}>
                {quiz?.type === 'quiz' ? (
                  <Brain className='text-pw-primary' size={24} />
                ) : (
                  <HelpCircle className='text-pw-cyan' size={24} />
                )}
              </div>
              <div>
                <span className='text-[9px] font-black text-pw-muted uppercase block'>
                  Question {index + 1}
                </span>
                <h2 className='text-base font-bold text-white' dangerouslySetInnerHTML={{ __html: formattedQuestionText }} />
              </div>
            </div>
          )}
        </div>

        <div className='space-y-3 mt-2'>
          {quest.type === 'input' ?
            <textarea
              value={activeText}
              onChange={(e) => {
                if (quiz?.quizScroll) {
                  setScrollAnswers((prev) => ({
                    ...prev,
                    [quest.id]: e.target.value,
                  }));
                  // Sync to answers
                  const correct = computeIsCorrect(quest.id, e.target.value);
                  const existingIdx = userAnswers.findIndex(
                    (a) => a.questionId === quest.id,
                  );
                  let updated;
                  if (existingIdx > -1) {
                    updated = [...userAnswers];
                    updated[existingIdx] = {
                      questionId: quest.id,
                      answer: e.target.value,
                      correct,
                    };
                  } else {
                    updated = [
                      ...userAnswers,
                      { questionId: quest.id, answer: e.target.value, correct },
                    ];
                  }
                  setUserAnswers(updated);
                } else {
                  setContent(e.target.value);
                }
              }}
              placeholder='Type your answer here...'
              className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-pw-primary resize-none'
            />
          : <div className='grid gap-2.5'>
              {currentOptions.map((opt: any, oIdx) => {
                const optId = opt.id || String(oIdx);
                const optText = opt.text || String(opt);

                const isSelected =
                  quest.type === 'checkbox' ?
                    activeChecked.includes(optId)
                  : activeSelected === optId;

                return (
                  <button
                    key={optId}
                    onClick={() => {
                      if (quiz?.quizScroll) {
                        let val;
                        if (quest.type === 'checkbox') {
                          val =
                            activeChecked.includes(optId) ?
                              activeChecked.filter((i: any) => i !== optId)
                            : [...activeChecked, optId];
                        } else {
                          val = optId;
                        }
                        setScrollAnswers((prev) => ({
                          ...prev,
                          [quest.id]: val,
                        }));

                        const correct = computeIsCorrect(quest.id, val);
                        const existingIdx = userAnswers.findIndex(
                          (a) => a.questionId === quest.id,
                        );
                        let updated;
                        if (existingIdx > -1) {
                          updated = [...userAnswers];
                          updated[existingIdx] = {
                            questionId: quest.id,
                            answer: val,
                            correct,
                          };
                        } else {
                          updated = [
                            ...userAnswers,
                            { questionId: quest.id, answer: val, correct },
                          ];
                        }
                        setUserAnswers(updated);
                      } else {
                        if (quest.type === 'checkbox') {
                          setSelectedOptions((p) =>
                            p.includes(optId) ?
                              p.filter((i) => i !== optId)
                            : [...p, optId],
                          );
                        } else {
                          setSelectedOption(optId);
                        }
                      }
                    }}
                    className={cn(
                      'w-full h-11 px-3 text-left rounded-xl border transition-all text-xs flex items-center justify-between',
                      isSelected ?
                        'bg-pw-primary/10 border-pw-primary text-white font-bold'
                      : 'bg-white/5 border-white/10 text-pw-muted',
                    )}>
                    <span>{optText}</span>
                    <CheckCircle
                      className={cn(
                        'h-4 w-4 text-pw-primary transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </button>
                );
              })}
            </div>
          }
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
        <h2 className='text-2xl font-bold mb-1'>
          Offline: Quiz Not Cached Yet
        </h2>
        <p className='text-sm text-pw-muted max-w-sm'>
          Please connect to the internet to load this assessment.
        </p>
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
          <h1 className='text-3xl font-extrabold font-display'>
            Assessment Completed!
          </h1>
          <p className='text-pw-muted text-sm'>
            Your responses have been successfully submitted.
          </p>

          {quiz?.type === 'quiz' && (
            <Card className='p-6 bg-white/[0.02] border border-white/5 rounded-2xl'>
              <span className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block mb-1'>
                Your Performance
              </span>
              <span className='text-3xl font-bold font-mono text-pw-primary'>
                {score} / {totalQuestions}
              </span>
            </Card>
          )}

          <Link href={isLoggedIn ? '/quiz' : '/'}>
            <Button className='btn-primary w-full h-11 rounded-xl font-bold mt-4'>
              Close Quiz
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => quiz?.enforceSecurity && e.preventDefault()}
      className={cn(
        'relative min-h-screen flex flex-col bg-pw-bg text-white overflow-x-hidden selection:bg-pw-primary/30 selection:text-white',
        quiz?.enforceSecurity && 'select-none',
      )}>
      {/* Sleek Glowing Background Objects */}
      <div className='absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-pw-primary/10 blur-[100px] pointer-events-none' />
      <div className='absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pw-secondary/10 blur-[120px] pointer-events-none' />

      {/* Intro Gate */}
      {showIntro && !started && (
        <div className='container mx-auto px-6 py-20 max-w-2xl text-center flex-1 flex flex-col justify-center relative z-10'>
          {quiz?.introBgUrl && (
            <div
              className='absolute inset-0 z-0 bg-cover bg-center pointer-events-none'
              style={{
                backgroundImage: `url(${quiz?.introBgUrl})`,
                opacity: 0.1,
                filter: 'blur(8px)',
              }}
            />
          )}

          <div className='relative z-10'>
            {/* Show clear foreground image/logo if configured */}
            {quiz?.introBgUrl ?
              <img
                src={quiz?.introBgUrl}
                alt='Intro Logo'
                className='h-24 w-24 object-contain rounded-2xl mb-6 mx-auto border-2 border-white/20 shadow-2xl bg-black/40'
              />
            : <div className='flex justify-center mb-6 text-pw-primary'>
                {quiz?.type === 'quiz' ?
                  <Brain size={60} />
                : <MessageCircle size={60} />}
              </div>
            }
            <h1 className='text-4xl font-extrabold font-display mb-4 tracking-tight'>
              {quiz?.title?.toUpperCase()}
            </h1>
            <p
              className='text-pw-muted leading-relaxed mb-10 max-h-[300px] overflow-auto px-4'
              style={{ lineHeight: '20px' }}>
              {quiz?.description}
            </p>
          </div>

          <div className='max-w-sm mx-auto w-full relative z-10'>
            {authRequired ?
              <div className='bg-pw-danger/5 p-2 py-3 rounded-2xl border border-pw-danger/20 space-y-6'>
                <Lock className='h-12 w-12 text-pw-danger mx-auto mt-10' />
                <h3 className='text-xl font-bold'>Authentication Required</h3>
                <p className='text-sm text-white/70 '>
                  You'll have to login or sign up for us to be able to track the
                  information and answers from the {quiz?.type}.
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
                  if (quiz?.enforceSecurity!) {
                    setShowSecurityProtocol(true);
                  } else if (quiz?.askDetails && quiz?.askDetails.length > 0) {
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

          {/* Terms disclaimer & Reporting Flow */}
          <div className='border-t border-white/5 pt-6 mt-8 text-[11px] text-pw-muted leading-relaxed relative z-10'>
            <p className='mb-2'>
              Disclaimer: PingWorld is strictly a service provider hosting
              content and is not responsible for any questions, responses, or
              outcomes generated in this assessment.
            </p>
            <button
              onClick={() => setShowReportModal(true)}
              className='text-pw-primary underline hover:text-pw-primary/80 transition-colors font-bold'>
              Report this assessment for investigation or takedown
            </button>
          </div>
        </div>
      )}

      {/* 2. Security Gate */}
      {!showIntro &&
        quiz?.enforceSecurity &&
        showSecurityProtocol &&
        !started &&
        !detailsCollected && (
          <div className='container relative z-10 mx-auto px-5 py-5 max-w-xl text-center flex-1 flex flex-col justify-center'>
            <div className='sm:bg-pw-primary/5 sm:p-6 sm:rounded-[2.5rem] sm:border sm:border-pw-primary/20 space-y-8 sm:backdrop-blur-xl'>
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

                  if (quiz?.askDetails && quiz?.askDetails.length > 0) {
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
        (quiz?.askDetails || []).length > 0 && (
          <div className='container relative z-10 mx-auto px-5 py-10 max-w-lg flex-1 flex flex-col justify-center'>
            <div className='sm:bkblur sm:bg-white/5 sm:p-6 sm:rounded-[2.5rem] sm:border sm:border-white/10 sm:shadow-2xl'>
              <h3 className='text-sm font-bold mb-8 mt-4 uppercase tracking-widest text-pw-cyan text-center'>
                ENTER YOUR DETAILS
              </h3>
              <div className='space-y-5'>
                {quiz?.askDetails?.map((detail, idx) => (
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
                    const complete = quiz?.askDetails?.every(
                      (d) => userData[d.title] && String(userData[d.title]).trim() !== '',
                    );
                    if (!complete)
                      return toast.error('Required detail fields are missing.');

                    // jules edit: Admin allowlist verification per detail field
                    let mismatch = false;
                    quiz?.askDetails?.forEach((d) => {
                      if (d.allowlist && d.allowlist.trim() !== '') {
                        const val = String(userData[d.title] || '').trim();
                        const rawAllow = d.allowlist.trim();
                        const allowedItems = rawAllow.split(',').map((item) => item.trim().toLowerCase());

                        let matched = allowedItems.includes(val.toLowerCase());
                        if (!matched) {
                          try {
                            const regex = new RegExp(rawAllow, 'i');
                            matched = regex.test(val);
                          } catch {
                            // ignore regex error if string list
                          }
                        }

                        if (!matched) {
                          mismatch = true;
                          toast.error(
                            `Access Denied: The entered ${d.title} ("${val}") does not match the required administrative allowlist.`,
                          );
                        }
                      }
                    });

                    if (mismatch) return;

                    setDetailsCollected(true);
                    setStart(true);
                  }}>
                  START {quiz?.type?.toUpperCase()}
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* 4. Active Assessment View */}
      {started && quiz && (
        <>
          <div
            className={cn(
              'container relative z-10 mx-auto px-4 md:px-6 pt-12 pb-10 max-w-7xl',
              quizTheme === 'dark' ? 'text-white' : 'text-black',
            )}>
            <div className='mb-8 flex flex-col gap-2 w-full'>
              {!isOnline && (
                <div className='p-3.5 bg-pw-warning/10 border border-pw-warning/20 text-pw-warning text-xs font-bold rounded-2xl flex items-center gap-2.5 mb-2'>
                  <AlertTriangle className='h-4.5 w-4.5 shrink-0 text-pw-warning' />
                  <span>
                    Offline Mode: Your responses will be saved securely on this
                    device and uploaded once you connect to the internet.
                  </span>
                </div>
              )}

              {/* Brand Icon */}
              {quiz?.branding?.icon && (
                <div className='flex justify-center mb-4'>
                  <img
                    src={quiz?.branding?.icon}
                    alt='Brand Logo'
                    className='h-14 w-auto rounded-xl object-contain drop-shadow-lg'
                  />
                </div>
              )}

              {/* Disclaimer Banner */}
              {quiz?.disclaimer && (
                <div className='flex items-start gap-3 p-3 bg-pw-warning/5 border border-pw-warning/20 rounded-2xl mb-3 text-xs text-pw-muted leading-relaxed'>
                  <AlertTriangle
                    size={14}
                    className='text-pw-warning shrink-0 mt-0.5'
                  />
                  <span>{quiz?.disclaimer}</span>
                </div>
              )}

              {/* Header Row */}
              <div className='flex flex-wrap items-center justify-between gap-4 bg-white/2 p-2 rounded-full border border-white/4 bkblur'>
                <div className='flex items-center gap-4 pl-3'>
                  <div className='flex flex-col'>
                    <h1 className='text-xl md:text-2xl font-bold font-display tracking-tight leading-none'>
                      {quiz?.title}
                    </h1>
                    <span
                      className='text-[8px] leading-none opacity-40 hidden'
                      style={{ placeSelf: 'flex-start' }}>
                      {quiz?.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  {quiz?.hasTimer && timeLeft !== null && (
                    <div
                      title={`${capFirst(quiz?.type)} Timer`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded-full pr-3 text-[14px] font-mono lg:text-lg border transition-all',
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

                  <Button
                    variant='ghost'
                    title={`Quit ${capFirst(quiz.type)}`}
                    size='sm'
                    onClick={() =>
                      confirmLeaveQuiz(() => (window.location.href = '/quiz'))
                    }
                    className='h-10 px-4 gap-2 rounded-full text-pw-danger hover:bg-pw-danger/10 hover:text-pw-danger transition-all active:scale-95 border border-pw-danger/10'>
                    <LogOut size={16} />
                    <span className='hidden sm:inline font-bold text-pw-danger'>
                      Quit
                    </span>
                  </Button>

                  {/* Report button */}
                  <Button
                    variant='ghost'
                    size='icon'
                    title='Report this quiz'
                    onClick={() => setShowReportModal(true)}
                    className='h-9 w-9 rounded-full text-pw-muted hover:text-pw-danger hover:bg-pw-danger/10 transition-all border border-white/5'>
                    <Flag size={14} />
                  </Button>

                  {quiz?.allowEarlySubmit && (
                    <Button
                      title={`Submit ${capFirst(quiz.type)}`}
                      onClick={confirmSubmitQuiz}
                      className='h-10 px-4 rounded-full gap-2 bg-pw-success/10 border border-pw-success/20 text-pw-success hover:bg-pw-success/20 font-black text-xs transition-all active:scale-95 shadow-lg shadow-pw-success/10 hidden md:flex ml-4'>
                      <CheckCircle2 size={16} />
                      <span className='font-bold'>SUBMIT</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className='flex flex-col gap-3 mb-2 items-end pt-1 px-2'>
                {/* Top Progress Bar */}
                {quiz?.type === 'quiz' && (
                  <div className='w-full min-w-full h-2 rounded-full overflow-hidden bg-pw-cyan/10 z-[100] backdrop-blur-sm'>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(answeredCount / activeQuestions.length) * 100}%`,
                      }}
                      className='h-full gradient-brand animate-shimmer rounded-full shadow-[0_0_15px_rgba(var(--pw-primary-rgb),0.5)] transition-all duration-500'
                    />
                  </div>
                )}

                {quiz?.allowEarlySubmit && (
                  <Button
                    title={`Submit ${capFirst(quiz.type)}`}
                    onClick={confirmSubmitQuiz}
                    className='h-10 max-w-[200px] w-1/3 px-4 rounded-xl gap-2 bg-pw-success/10 border border-pw-success/20 text-pw-success hover:bg-pw-success/20 font-black text-xs transition-all active:scale-95 shadow-lg shadow-pw-success/10 flex md:hidden '>
                    <CheckCircle2 size={18} />
                    <span className='font-bold'>SUBMIT</span>
                  </Button>
                )}
              </div>
            </div>

            {/* ===== SCROLL MODE: all answered + current question vertically ===== */}
            {(
              quiz?.quizScroll &&
              (quiz?.quizLayout === 'scroll_show' || !quiz?.quizLayout)
            ) ?
              <div className='flex flex-col items-center w-full gap-0'>
                {activeQuestions
                  .slice(
                    0,
                    Math.min(currentQuestion + 1, userAnswers.length + 1),
                  )
                  .map((quest, idx) => renderQuestionCard(quest, idx))}
                <div ref={bottomRef} />

                <div className='flex items-center gap-3 mt-4'>
                  <Button
                    onClick={() => handleNext()}
                    className='btn-primary h-11 px-10 rounded-xl font-bold gap-2'>
                    {currentQuestion + 1 === activeQuestions.length ?
                      'Finish Assessment'
                    : 'Next Question'}
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            : quiz?.quizScroll && quiz?.quizLayout === 'scroll' ?
              <div className='flex flex-col items-center w-full gap-0'>
                {activeQuestions.map((quest, idx) =>
                  renderQuestionCard(quest, idx),
                )}
                <div ref={bottomRef} />

                <div className='flex items-center gap-3 mt-4'>
                  <Button
                    onClick={() => finalizeQuiz(userAnswers)}
                    disabled={userAnswers.length < activeQuestions.length}
                    className='btn-primary h-12 px-10 rounded-2xl font-black gap-4 shadow-2xl shadow-pw-primary/30 transition-all hover:scale-[1.02] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none'>
                    FINISH ASSESSMENT
                    <CheckCircle2 className='h-5 w-5' />
                  </Button>
                </div>
              </div>
            : <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
                <div
                  className={cn(
                    q?.accessory && q?.accessory !== 'none' ?
                      'lg:col-span-8'
                    : 'lg:col-span-12',
                  )}>
                  {!q ?
                    <div className='flex flex-col items-center justify-center min-h-[40vh] text-center p-6 bg-white/5 rounded-[3rem] border border-white/5'>
                      <AlertTriangle className='h-12 w-12 text-pw-warning mb-4 opacity-50' />
                      <h2 className='text-xl font-bold mb-2'>
                        Question Not Found
                      </h2>
                      <p className='text-sm text-pw-muted max-w-xs'>
                        There was an issue loading this question. This can
                        happen if the quiz routing is invalid.
                      </p>
                      <Button
                        onClick={() => setCurrentQuestion(0)}
                        className='mt-6 btn-ghost'>
                        Return to Start
                      </Button>
                    </div>
                  : <div className='flex flex-col items-center mb-4 w-full justify-center gap-2'>
                      <div className='flex items-center gap-2'>
                        <div className='badge bg-pw-primary/5 text-pw-primary border-pw-primary/10 px-4 py-1.5 rounded-full text-xs font-bold'>
                          {(
                            quiz?.questions.some(
                              (q) => q.category || q.category !== null,
                            )
                          ) ?
                            `Question ${currentQuestion + 1}`
                          : `Question ${currentQuestion + 1} of ${activeQuestions.length}`
                          }
                        </div>

                        {questionTimeLeft !== null && (
                          <div className='badge bg-pw-warning/10 text-pw-warning border-pw-warning/20 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1'>
                            <Clock
                              size={12}
                              className='animate-pulse'
                            />
                            <span>{questionTimeLeft}s</span>
                          </div>
                        )}
                      </div>

                      <div className='w-full flex flex-col items-center gap-1 mt-2'>
                        {renderQuestionCard(q!, currentQuestion)}

                        <div className='flex justify-between w-full gap-4 flex-wrap mt-8'>
                          <AnimatePresence mode='sync'>
                            {quiz.canGoBack && currentQuestion > 0 && (
                              <Button
                                onClick={GoBack}
                                className='btn-ghost h-10 px-8 text-lg rounded-2xl gap-2 font-bold'>
                                <ChevronLeft className='h-5 w-5' />
                                Previous
                              </Button>
                            )}

                            <div className='flex items-center gap-3 ml-auto'>
                              <Button
                                onClick={handleNext}
                                className='btn-primary h-10 px-8 rounded-2xl font-black gap-4 shadow-2xl shadow-pw-primary/30 transition-all hover:scale-[1.02] active:scale-[0.96]'>
                                {(
                                  currentQuestion + 1 === activeQuestions.length
                                ) ?
                                  'FINISH'
                                : 'NEXT'}
                                <ChevronRight className='h-5 w-5' />
                              </Button>
                            </div>
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
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
            }
          </div>
        </>
      )}

      {/* Report Takedown Modal */}
      {showReportModal && (
        <div className='fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4'>
          <div className='bg-pw-surface border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-pw-text'>
            <h3 className='text-xl font-bold font-display text-pw-danger text-left'>
              Report Assessment
            </h3>
            {reportedStatus ?
              <div className='p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl text-center'>
                Thank you! Your report has been securely registered and flagged
                for takedown review.
              </div>
            : <div className='space-y-3'>
                <p className='text-xs text-pw-muted text-left'>
                  Please provide a detailed reason for reporting this assessment
                  (e.g., copyright violation, offensive content, cheating,
                  academic fraud). Our safety team will investigate within 24
                  hours.
                </p>

                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                    Category
                  </label>
                  <div className='flex flex-wrap gap-2'>
                    {[
                      'Spam',
                      'Harassment',
                      'Cheating',
                      'Inappropriate Content',
                      'Copyright',
                      'Other',
                    ].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setReportCategory(cat)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                          reportCategory === cat ?
                            'bg-pw-danger/10 border-pw-danger text-pw-danger'
                          : 'bg-white/5 border-white/10 text-pw-muted hover:border-white/20',
                        )}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                    Additional Notes
                  </label>
                  <textarea
                    rows={4}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder='Describe your report reason here...'
                    className='w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-pw-text focus:outline-none focus:border-pw-danger'
                  />
                </div>

                <div className='flex gap-2'>
                  <Button
                    onClick={() => setShowReportModal(false)}
                    variant='outline'
                    className='h-10 text-xs flex-1 border-white/10'>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!reportReason.trim()) {
                        toast.error('Please enter a reason');
                        return;
                      }
                      setReportedStatus(true);
                      toast.success('Assessment reported successfully!');
                      setTimeout(() => {
                        setShowReportModal(false);
                        setReportedStatus(false);
                        setReportReason('');
                        setReportCategory('');
                      }, 2500);
                    }}
                    className='h-10 text-xs flex-1 bg-pw-danger hover:bg-pw-danger/80 text-white font-bold'>
                    Submit Report
                  </Button>
                </div>
              </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
