'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  Plus,
  Save,
  Trash2,
  Download,
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Settings2,
  Share2,
  X,
  ChevronDown,
  Check,
  Type,
  ShieldCheck,
  Clock,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  RefreshCw,
  Brain,
  Play,
  Star,
  File,
  Folder,
  Lock,
  Image,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { capFirst, cn } from '@/lib/utils';
import { useAppModal } from '@/components/ui/AppModalProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HybridStorage } from '@/lib/storage-utils';
import Wrapper from '@/components/ui/wrapper';
import QuizSettingItem from '@/components/quiz/quiz-setting-item';
import { useAppContext } from '@/context/AppContext';
import { computeExpiry, tierAtLeast } from '@/lib/config/premium';

// --- Types ---
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'dropdown'
  | 'checkbox'
  | 'input'
  | 'range'
  | 'rating'
  | 'upload';

export interface QuizOption {
  id: string; // questionId-index or uuid
  text: string;
  uploadType?: 'image' | 'video' | 'audio';
  skipTo?: string; // ID of the next question to jump to
  skipToCat?: string; // Category name to jump to (jumps to first question in category)
}
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: (string | QuizOption)[];
  correctExplanation?: string;
  correctIndex: any; // index, bool, string (optionId), or Array<string> (optionIds)
  caseSensitive?: boolean; // for input type
  min?: number; // for range
  max?: number; // for range
  step?: number; // for range
  accessory?:
    | 'none'
    | 'calculator'
    | 'note'
    | 'periodic_table'
    | 'formula_sheet'
    | 'glossary';
  accessoryNote?: string; // content for the 'note' or custom formulas
  accessoryConfig?: any; // specific IDs or categories for formulas/glossary
  skipTo?: string; // Question-level branching: jump to specific question after this one
  skipToCat?: string; // Question-level branching: jump to first question of this category
  category?: string; // Optional category tag for grouping questions
  timer?: number; // Optional question timer in seconds
}

export interface Details {
  title: string;
  type: 'sex' | 'input' | 'number' | 'date' | 'tel' | 'email' | 'dropdown' | 'dob';
  allowlist?: string;
  options?: string[];
}

export interface QuizTakerResponse {
  userData: Record<string, string>;
  answers: any[];
  score: number;
  totalQuestions: number;
  timestamp: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'survey';
  surveyType?: 'research' | 'form'; // research = branching/page-by-page; form = scroll-all, no branching
  questions: Question[];
  canGoBack?: boolean;
  showScore?: boolean;
  introBgUrl?: string;
  showCategoryInPerformance?: boolean;
  askDetails?: Details[];
  hasTimer?: boolean | string | number;
  randomizeOptions?: boolean;
  randomizeQuestions?: boolean;
  allowRetry?: boolean;
  enforceSecurity?: boolean;
  endScreen: {
    title: string;
    message: string;
    showPerformance?: boolean;
  };
  correctOption?: boolean;
  correctOptionDes?: boolean;
  createdAt: number;
  responses?: QuizTakerResponse[];
  allowEarlySubmit?: boolean;
  expires_at?: string; // ISO date - max 3 days from creation, cleaned by cron
  quizScroll?: boolean;
  quizLayout?: string;
  branding?: {
    image?: string;
    opacity?: number;
    shadeColor?: string;
    blur?: number;
    icon?: string;
  };
  disclaimer?: string;
}

// Helper: compute a capped expiry date max 3 days out
export function computeQuizExpiry(daysUntilExpiry: number): string {
  const capped = Math.min(Math.max(daysUntilExpiry, 1), 3);
  const d = new Date();
  d.setDate(d.getDate() + capped);
  return d.toISOString();
}

// Helper: human-readable countdown from now to expiry
export function quizExpiryCountdown(expires_at: string): {
  label: string;
  urgent: boolean;
} {
  const diff = new Date(expires_at).getTime() - Date.now();
  if (diff <= 0) return { label: 'Expired', urgent: true };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days >= 1)
    return { label: `${days}d ${remHours}h left`, urgent: days === 0 };
  return { label: `${hours}h left`, urgent: hours < 6 };
}

// --- Components ---

const QuizBuilder = ({
  quiz,
  onSave,
  onCancel,
}: {
  quiz: Quiz;
  onSave: (q: Quiz) => void;
  onCancel: () => void;
}) => {
  const { premiumTier } = useAppContext();
  const [collapse, setCollapse] = useState<Record<string, boolean>>({});
  const [allowlistArr, setAllowlistArr] = useState<Record<string, boolean>>({});

  // Pre-process quiz to decode secured indices for editing
  const decodedQuestions = (quiz.questions || []).map((q) => {
    let plainIndex = q.correctIndex;
    try {
      if (typeof q.correctIndex === 'string') {
        const decoded = atob(q.correctIndex);
        try {
          plainIndex = JSON.parse(decoded);
        } catch {
          plainIndex = decoded;
        }
      }
    } catch (e) {
      // Not base64 or other error, keep as is
    }
    return { ...q, correctIndex: plainIndex };
  });

  const { showConfirm } = useAppModal();
  const [editedQuiz, setEditedQuiz] = useState<Quiz>({
    ...quiz,
    questions: decodedQuestions,
  });
  const [currentStep, setCurrentStep] = useState<number>(-1); // -1 for settings

  // Pre-calculate groups for sidebar rendering
  const sidebarGroups = useMemo(() => {
    const uncategorized: { question: Question; index: number }[] = [];
    const categoriesMap: Record<
      string,
      { question: Question; index: number }[]
    > = {};

    editedQuiz.questions.forEach((q, idx) => {
      const cat =
        q.category && q.category.trim() !== '' ? q.category.trim() : null;
      if (!cat) {
        uncategorized.push({ question: q, index: idx });
      } else {
        if (!categoriesMap[cat]) {
          categoriesMap[cat] = [];
        }
        categoriesMap[cat].push({ question: q, index: idx });
      }
    });

    return {
      uncategorized,
      categories: Object.entries(categoriesMap).map(([name, list]) => ({
        name,
        questions: list,
      })),
    };
  }, [editedQuiz.questions]);

  useEffect(() => {
    // Autosave to draft storage as the user types
    const timer = setTimeout(async () => {
      await HybridStorage.save(
        `draft-quiz-${editedQuiz.id}`,
        editedQuiz,
        'quiz',
      );
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timer);
  }, [editedQuiz]);

  const addQuestion = (category?: string) => {
    if (editedQuiz.questions.length >= 10 && premiumTier === 'free') {
      return toast.error(
        'Free tier accounts are capped at a maximum of 10 questions per quiz! Please upgrade to add more.',
      );
    }

    const qId = Math.random().toString(36).substr(2, 9);
    const newQuestion: Question = {
      id: qId,
      type: 'multiple_choice',
      text: '',
      options: [
        { id: `${qId}-opt-0`, text: '' },
        { id: `${qId}-opt-1`, text: '' },
      ],
      correctIndex: `${qId}-opt-0`,
      accessory: 'none',
      category: category && category.trim() !== '' ? category : undefined,
    };

    if (category && category.trim() !== '') {
      // Find the index of the last question in this category
      let lastIndex = -1;
      for (let i = editedQuiz.questions.length - 1; i >= 0; i--) {
        if (editedQuiz.questions[i].category === category) {
          lastIndex = i;
          break;
        }
      }

      if (lastIndex !== -1) {
        // Insert right after the last question of this category
        const updatedQuestions = [...editedQuiz.questions];
        updatedQuestions.splice(lastIndex + 1, 0, newQuestion);
        setEditedQuiz({
          ...editedQuiz,
          questions: updatedQuestions,
        });
        setCurrentStep(lastIndex + 1);
        return;
      }
    }

    setEditedQuiz({
      ...editedQuiz,
      questions: [...editedQuiz?.questions, newQuestion],
    });
    setCurrentStep(editedQuiz?.questions?.length);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = editedQuiz.questions.filter((_, i) => i !== index);
    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
    if (currentStep >= newQuestions.length) {
      setCurrentStep(newQuestions.length - 1);
    }
  };

  const updateQuestion = (index: number, updated: Question) => {
    const newQuestions = [...(editedQuiz?.questions || [])];
    newQuestions[index] = updated;
    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...editedQuiz.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
    setCurrentStep(targetIndex);
  };

  return (
    <div className='flex flex-col gap-8'>
      {/* Quiz Header Info */}
      <div className='flex flex-col md:flex-row justify-between gap-6'>
        <div>
          <h2 className='text-2xl font-bold font-display'>
            {editedQuiz.title || 'Untitled Quiz'}
          </h2>
          <p className='text-sm text-pw-muted mt-1'>
            {editedQuiz?.questions?.length} Questions
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={onCancel}
            className='h-10 bg-white/5 border-white/10 hover:bg-white/10'>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const hasActiveBranching = editedQuiz.questions.some(
                (q) =>
                  q.skipTo ||
                  q.skipToCat ||
                  q.options.some(
                    (o) => typeof o === 'object' && (o.skipTo || o.skipToCat),
                  ),
              );
              if (hasActiveBranching) {
                const confirmed = await showConfirm(
                  'Branching is active on one or more questions. Question order randomization will be restricted to internal category shuffling to preserve valid logical paths. Save quiz now?',
                  {
                    title: 'Branching Active Guard',
                    confirmText: 'Save Quiz',
                    type: 'info',
                  },
                );
                if (!confirmed) return;
              }
              onSave(editedQuiz);
            }}
            className='btn-primary h-10 gap-2'>
            <Save className='h-4 w-4' /> Save Quiz
          </Button>
        </div>
      </div>

      <div className='w-full grid grid-cols-1 lg:grid-cols-5 gap-8'>
        {/* Navigation Sidebar */}
        <div className='lg:col-span-2 flex flex-col gap-4'>
          <button
            onClick={() => setCurrentStep(-1)}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl text-sm font-medium transition-all group',
              currentStep === -1 ?
                'bg-pw-primary text-white shadow-lg shadow-pw-primary/20'
              : 'bg-pw-surface border border-white/5 text-pw-muted hover:text-pw-text',
            )}>
            <Settings2 className='h-4 w-4' /> Quiz Settings
          </button>

          <div className='flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 pb-3 custom-scrollbar'>
            {/* Uncategorized Questions */}
            {sidebarGroups.uncategorized.map(({ question: q, index: i }) => (
              <button
                key={q.id}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl text-xs font-medium transition-all group border',
                  currentStep === i ?
                    'bg-pw-primary/10 border-pw-primary text-pw-primary'
                  : 'bg-pw-surface/50 border-white/5 text-pw-muted hover:border-white/10 hover:text-pw-text',
                )}>
                <span className='truncate flex-1 text-left'>
                  Q{i + 1}: {q.text || 'New Question...'}
                </span>
                <Trash2
                  className='h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-pw-danger transition-all ml-2'
                  onClick={(e) => {
                    e.stopPropagation();
                    removeQuestion(i);
                  }}
                />
              </button>
            ))}

            {/* Categorized Questions grouped by Category */}
            {sidebarGroups.categories.map((cat) => {
              const isCollapsed = !!collapse[cat.name];

              return (
                <div
                  key={cat.name}
                  className={cn(
                    'flex flex-col gap-1',
                    !isCollapsed && ' border-l border-white/10 pl-2',
                  )}>
                  {/* Category Header */}
                  <div
                    className='flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase text-pw-primary/80 tracking-wider bg-white/5 rounded-md cursor-pointer'
                    onClick={(e) => {
                      e.stopPropagation();

                      setCollapse((prev) => ({
                        ...prev,
                        [cat.name]: !prev[cat.name],
                      }));
                    }}>
                    <span className='truncate flex items-center'>
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 text-pw-primary shrink-0 transition-transform duration-200',
                          !isCollapsed && 'rotate-90',
                        )}
                      />
                      <Folder className='w-4 h-4 mx-1' /> {cat.name}
                    </span>
                    <button
                      type='button'
                      title={`Add question under ${cat.name.toUpperCase()}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        addQuestion(cat.name);
                      }}
                      className='p-1 rounded hover:bg-white/10 text-pw-muted hover:text-pw-primary transition-all'>
                      <Plus className='h-3.5 w-3.5' />
                    </button>
                  </div>

                  {/* Categorized Questions List (with visual indentation) */}
                  {!isCollapsed && (
                    <div className='flex flex-col gap-1 ml-4'>
                      {cat.questions.map(({ question: q, index: i }) => (
                        <button
                          key={q.id}
                          onClick={() => setCurrentStep(i)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all group border',
                            currentStep === i ?
                              'bg-pw-primary/10 border-pw-primary text-pw-primary'
                            : 'bg-pw-surface/50 border-white/5 text-pw-muted hover:border-white/10 hover:text-pw-text',
                          )}>
                          <span className='truncate flex-1 text-left'>
                            Q{i + 1}: {q.text || 'New Question...'}
                          </span>
                          <Trash2
                            className='h-3 w-3 base:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:text-pw-danger transition-all ml-2'
                            onClick={(e) => {
                              e.stopPropagation();
                              removeQuestion(i);
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            onClick={() => addQuestion()}
            variant='outline'
            className='w-full border-dashed border-white/20 hover:border-pw-primary/50 hover:bg-pw-primary/5 gap-2 h-12'>
            <Plus className='h-4 w-4' /> Add Question
          </Button>
        </div>

        {/* Editor Area */}
        <div className='lg:col-span-3'>
          <Card className='bg-transparent p-1 sm:p-4 pb-2 ring-0 sm:ring-1 pt-6 lg:pt-9 lg:p-8 h-full sm:bkblur'>
            {currentStep === -1 ?
              <div className='space-y-4 mt-1'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-xl font-bold flex items-center gap-2'>
                      <Settings2 className='h-5 w-5 text-pw-primary' />{' '}
                      Assessment Config
                    </h3>
                    <p className='text-[10px] text-pw-muted mt-0.5'>
                      Customize your assessment behavior and security.
                    </p>
                  </div>
                </div>

                <div className='divider opacity-50' />

                {/* Identity & Basic Info */}
                <Wrapper
                  title='General Info'
                  description='Control the title, description and type of your assessment'
                  icon={<Brain className='h-4 w-4' />}
                  color='cyan'
                  defaultOpen>
                  <div className='flex flex-col gap-4 mt-2'>
                    <div className='space-y-2'>
                      <label className='text-xs font-bold text-pw-muted uppercase tracking-widest mb-1'>
                        Assessment Type
                      </label>
                      <div className='flex p-0.5 bg-white/5 rounded-full border border-white/5'>
                        <Button
                          variant='ghost'
                          onClick={() =>
                            setEditedQuiz({
                              ...editedQuiz,
                              type: 'quiz',
                              surveyType: undefined,
                              quizLayout: 'single',
                              quizScroll: false,
                            })
                          }
                          className={cn(
                            'flex-1 h-9 rounded-full transition-all',
                            editedQuiz.type === 'quiz' ?
                              'bg-pw-primary text-white shadow-lg'
                            : 'text-pw-muted',
                          )}>
                          Quiz
                        </Button>
                        <Button
                          variant='ghost'
                          onClick={() =>
                            setEditedQuiz({
                              ...editedQuiz,
                              type: 'survey',
                              surveyType: 'research',
                            })
                          }
                          className={cn(
                            'flex-1 h-9 rounded-full transition-all',
                            editedQuiz.type === 'survey' ?
                              'bg-pw-primary text-white shadow-lg'
                            : 'text-pw-muted',
                          )}>
                          Survey
                        </Button>
                      </div>
                    </div>

                    {editedQuiz.type === 'survey' && (
                      <div className='space-y-2'>
                        <label className='text-xs font-bold text-pw-muted uppercase tracking-widest block'>
                          Survey Style
                        </label>
                        <select
                          value={editedQuiz.surveyType || 'research'}
                          onChange={(e) => {
                            const val = e.target.value as 'research' | 'form';
                            const isForm = val === 'form';
                            setEditedQuiz({
                              ...editedQuiz,
                              surveyType: val,
                              quizLayout:
                                isForm ? 'scroll'
                                : editedQuiz.quizLayout === 'scroll' ? 'single'
                                : editedQuiz.quizLayout,
                              quizScroll: isForm,
                            });
                            toast.success(
                              `Survey style set to ${isForm ? 'Form (Scroll All enforced)' : 'Research (Branching enabled)'}`,
                            );
                          }}
                          className='w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-pw-text focus:outline-none focus:border-pw-primary cursor-pointer'>
                          <option
                            value='research'
                            className='bg-[#0A0C1B]'>
                            Research - Logical Branching, Page-by-Page
                          </option>
                          <option
                            value='form'
                            className='bg-[#0A0C1B]'>
                            Form - Scroll All (Branching Disabled)
                          </option>
                        </select>
                        {editedQuiz.surveyType === 'form' && (
                          <p className='text-[10px] text-pw-warning ml-1 mt-1'>
                            ⚠ Form type locks layout to Scroll All. Branching
                            is disabled.
                          </p>
                        )}
                      </div>
                    )}
                    <div className='space-y-2'>
                      <label className='text-xs font-bold text-pw-muted uppercase'>
                        Title
                      </label>
                      <Input
                        value={editedQuiz.title}
                        maxLength={20}
                        onChange={(e) =>
                          setEditedQuiz({
                            ...editedQuiz,
                            title: e.target.value,
                          })
                        }
                        placeholder='e.g., General Relativity Crash Course'
                        className='bg-white/5 border-white/10 h-10 focus:border-pw-primary'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-xs font-bold text-pw-muted uppercase'>
                        Intro Message
                      </label>
                      <textarea
                        value={editedQuiz.description}
                        onChange={(e) =>
                          setEditedQuiz({
                            ...editedQuiz,
                            description: e.target.value,
                          })
                        }
                        placeholder='Welcome your takers and explain the rules...'
                        className='w-full h-20 lg:h-24 bg-white/5 border border-white/10 rounded-lg p-2 px-3 text-sm focus:border-pw-primary focus:outline-none resize-none'
                      />
                    </div>
                  </div>

                  <QuizSettingItem
                    label={`${capFirst(editedQuiz.type)} Layout Presentation`}
                    description={
                      editedQuiz.surveyType === 'form' ?
                        'Form type is locked to Scroll All, all other layouts are disabled.'
                      : editedQuiz.quizScroll ?
                        'Branching is only available in Single Show (Progressive) mode.'
                      : 'Select how questions are rendered visually: Single Show (page-by-page), Scroll All (continuous), or Scroll Show (add next on-response).'

                    }
                    className='mt-2'>
                    <div className='flex flex-col gap-1'>
                      <select
                        value={
                          editedQuiz.quizLayout ||
                          (editedQuiz.quizScroll ? 'scroll' : 'single')
                        }
                        disabled={editedQuiz.surveyType === 'form'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedQuiz({
                            ...editedQuiz,
                            quizLayout: val,
                            quizScroll: val !== 'single',
                          });
                          toast.success(
                            `Layout changed to: ${val.toUpperCase().replace('_', ' ')}`,
                          );
                        }}
                        className={cn(
                          'bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none cursor-pointer',
                          editedQuiz.surveyType === 'form' &&
                            'opacity-40 cursor-not-allowed',
                        )}>
                        <option
                          value='single'
                          className='bg-[#0A0C1B]'>
                          Single Show - Progressive (Branching Enabled)
                        </option>
                        <option
                          value='scroll'
                          className='bg-[#0A0C1B]'
                          disabled={
                            editedQuiz.surveyType === 'form' ? false : false
                          }>
                          Scroll All - Continuous (Branching Disabled)
                        </option>
                        <option
                          value='scroll_show'
                          className='bg-[#0A0C1B]'>
                          Scroll Show - On Response (Branching Disabled)
                        </option>
                      </select>
                      {editedQuiz.quizScroll &&
                        editedQuiz.surveyType !== 'form' && (
                          <p className='text-[10px] text-pw-muted ml-1'>
                            💡 Switch to Single Show to enable logical branching
                            on questions and options.
                          </p>
                        )}
                    </div>
                  </QuizSettingItem>
                </Wrapper>

                {/* Participant Details */}
                <Wrapper
                  title='Data Collection'
                  description='Required identify/details fields for participants'
                  icon={<Type className='h-4 w-4' />}
                  color='primary'>
                  <div className='flex flex-col gap-3 py-2'>
                    {(editedQuiz.askDetails || []).map((detail, idx) => {
                      const showAllow = allowlistArr[idx];
                      const hasAllow =
                        detail.allowlist && detail.allowlist.length > 0;

                      return (
                        <div
                          key={idx}
                          className='flex flex-col gap-2 bg-white/5 lg:p-2 p-1 rounded-xl border border-white/5'>
                          <div className='flex gap-2 items-center flex-wrap'>
                            <Input
                              value={detail.title}
                              onChange={(e) => {
                                const newDetails = [
                                  ...(editedQuiz.askDetails || []),
                                ];
                                newDetails[idx].title = e.target.value;
                                setEditedQuiz({
                                  ...editedQuiz,
                                  askDetails: newDetails,
                                });
                              }}
                              className='flex-1 bg-transparent focus-visible:border focus-visible:border-pw-primary/5 h-8 text-xs'
                              placeholder='Detail Label'
                            />
                            <div className='flex'>
                              <DropdownMenu>
                                <DropdownMenuTrigger>
                                  <Button
                                    title={'Type of detail required'}
                                    variant='ghost'
                                    size='sm'
                                    className='h-7 sm:h-8 text-[10px] font-bold uppercase tracking-tighter bg-white/5'>
                                    {detail.type}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className='w-40 bg-pw-surface/70 bkblur border-white/10'>
                                  {[
                                    'email',
                                    'tel',
                                    'number',
                                    'dropdown',
                                    'input',
                                    'sex',
                                    'date',
                                    'dob'
                                  ].map((t) => (
                                    <DropdownMenuItem
                                      key={t}
                                      onClick={() => {
                                        const newDetails = [
                                          ...(editedQuiz.askDetails || []),
                                        ];
                                        newDetails[idx].type = t as any;
                                        setEditedQuiz({
                                          ...editedQuiz,
                                          askDetails: newDetails,
                                        });
                                      }}
                                      className={'h-8 px-2'}>
                                      {t.toUpperCase()}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button
                                variant='ghost'
                                size='icon'
                                title='Add Allowlist'
                                onClick={() => {
                                  setAllowlistArr((prev) => ({
                                    [idx]: !prev[idx],
                                  }));
                                }}
                                className={cn(
                                  'h-8 w-8',
                                  hasAllow ?
                                    'text-pw-primary bg-pw-primary/6'
                                  : 'text-pw-muted',
                                )}>
                                <CheckCircle size={14} />
                              </Button>

                              <Button
                                variant='ghost'
                                title='Delete Detail'
                                size='icon'
                                onClick={() => {
                                  const newDetails = (
                                    editedQuiz.askDetails || []
                                  ).filter((_, i) => i !== idx);
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    askDetails: newDetails,
                                  });
                                }}
                                className='h-8 w-8 text-pw-danger'>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>

                          {detail.type === 'dropdown' && (
                            <div className='space-y-1 mt-1'>
                              <Input
                                placeholder='Option 1, Option 2...'
                                value={detail.options?.join(', ') || ''}
                                onChange={(e) => {
                                  const newDetails = [
                                    ...(editedQuiz.askDetails || []),
                                  ];
                                  newDetails[idx].options = e.target.value
                                    .split(',')
                                    .map((s) => s.trim());
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    askDetails: newDetails,
                                  });
                                }}
                                className='h-8 text-[10px] bg-black/20'
                              />
                              <p className='text-[8px] text-pw-muted italic ml-1'>
                                Separate options with commas
                              </p>
                            </div>
                          )}
                          {showAllow && (
                            <div className='space-y-1 mt-1'>
                              <Input
                                placeholder='Allowlist / Allowed Values'
                                value={detail.allowlist || ''}
                                onChange={(e) => {
                                  const newDetails = [
                                    ...(editedQuiz.askDetails || []),
                                  ];
                                  newDetails[idx].allowlist = e.target.value;
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    askDetails: newDetails,
                                  });
                                }}
                                className='h-8 text-[10px] bg-black/10 bkblur font-mono'
                              />
                              <p className='text-[9px] text-pw-muted italic ml-1'>
                                Restrict access: Comma-separated allowed values
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setEditedQuiz({
                          ...editedQuiz,
                          askDetails: [
                            ...(editedQuiz.askDetails || []),
                            { title: '', type: 'input' },
                          ],
                        })
                      }
                      className='h-10 w-full border-dashed border-white/20 gap-2 text-xs opacity-70 hover:opacity-100'>
                      <Plus size={14} /> Add details field
                    </Button>
                  </div>
                </Wrapper>

                {/* Quiz Specific Logic */}
                {editedQuiz.type === 'quiz' && (
                  <>
                    <Wrapper
                      title='Logic & Flow'
                      description='Control how takers progress and interact with scores'
                      icon={<Play className='h-4 w-4' />}
                      color='primary'>
                      <div className='flex flex-col gap-2 pt-2'>
                        <QuizSettingItem
                          label='Show Real-time Score'
                          description='Displays the current score as takers answer questions.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                showScore: !editedQuiz.showScore,
                              })
                            }
                            className={cn(
                              'h-6 min-w-[80px] gap-2',
                              editedQuiz.showScore ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {editedQuiz.showScore ?
                              <Check className='h-3 w-3' />
                            : <X className='h-3 w-3' />}
                            {editedQuiz.showScore ? 'ON' : 'OFF'}
                          </Button>
                        </QuizSettingItem>

                        <QuizSettingItem
                          label='Category Breakdown'
                          description='Display performance scores broken down by question categories on results page.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              if (
                                !editedQuiz.endScreen.showPerformance &&
                                !editedQuiz.showCategoryInPerformance
                              ) {
                                toast.error(
                                  `To show category breakdown, go to 'Results & Review' and turn on (Show Performance Stats)`,
                                );
                                return null;
                              }

                              setEditedQuiz({
                                ...editedQuiz,
                                showCategoryInPerformance:
                                  !editedQuiz.showCategoryInPerformance,
                              });
                            }}
                            className={cn(
                              'h-6 min-w-[80px] gap-2',
                              editedQuiz.showCategoryInPerformance ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {editedQuiz.showCategoryInPerformance ?
                              <Check className='h-3 w-3' />
                            : <X className='h-3 w-3' />}
                            {editedQuiz.showCategoryInPerformance ?
                              'ON'
                            : 'OFF'}
                          </Button>
                        </QuizSettingItem>

                        <QuizSettingItem
                          label='Next Only'
                          description='Disable back navigation. Takers cannot go back to previous questions.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                canGoBack: !editedQuiz.canGoBack,
                              })
                            }
                            className={cn(
                              'h-6 min-w-[80px] gap-2 font-bold',
                              !editedQuiz.canGoBack ?
                                'bg-pw-warning/10 border-pw-warning text-pw-warning'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {!editedQuiz.canGoBack ?
                              <ShieldCheck className='h-3 w-3' />
                            : <X className='h-3 w-3' />}
                            {!editedQuiz.canGoBack ? 'ON' : 'OFF'}
                          </Button>
                        </QuizSettingItem>

                        <QuizSettingItem
                          label='Early Submission'
                          description='Allow participants to submit the assessment even if questions remain.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                allowEarlySubmit: !editedQuiz.allowEarlySubmit,
                              })
                            }
                            className={cn(
                              'h-6 min-w-[80px] gap-2 font-bold',
                              editedQuiz.allowEarlySubmit ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {editedQuiz.allowEarlySubmit ?
                              <Check className='h-3 w-3' />
                            : <X className='h-3 w-3' />}
                            {editedQuiz.allowEarlySubmit ? 'ENABLED' : 'OFF'}
                          </Button>
                        </QuizSettingItem>

                        <QuizSettingItem
                          label='Time Limit'
                          description='Auto-submits when time expires. Set to minutes.'>
                          <div className='flex gap-2 items-center'>
                            <Input
                              type='number'
                              value={
                                typeof editedQuiz.hasTimer === 'number' ?
                                  editedQuiz.hasTimer
                                : ''
                              }
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  hasTimer:
                                    e.target.value ?
                                      parseInt(e.target.value)
                                    : false,
                                })
                              }
                              placeholder='Min'
                              className='h-8 w-16 bg-white/5 border-white/10 text-center text-xs'
                            />
                            {editedQuiz.hasTimer && (
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() =>
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    hasTimer: false,
                                  })
                                }
                                className='h-8 w-8 text-pw-muted opacity-50 hover:opacity-100'>
                                <X size={14} />
                              </Button>
                            )}
                          </div>
                        </QuizSettingItem>

                        <QuizSettingItem
                          label='Active Lifespan (Expiry)'
                          description={`Select how long this assessment remains active. Free tier max is 2 days.`}>
                          <div className='flex flex-col gap-2 w-full'>
                            <DropdownMenu>
                              <DropdownMenuTrigger>
                                <Button
                                  variant='outline'
                                  className='h-10 w-full justify-between bg-white/5 border-white/10 text-xs text-pw-text px-4 rounded-xl'>
                                  <span>
                                    {(() => {
                                      let currentDays = 2; // Default
                                      if (editedQuiz.expires_at) {
                                        const diff =
                                          new Date(
                                            editedQuiz.expires_at,
                                          ).getTime() - Date.now();
                                        currentDays = Math.max(
                                          1,
                                          Math.round(
                                            diff / (1000 * 60 * 60 * 24),
                                          ),
                                        );
                                      }
                                      const closestSelected = [
                                        1, 2, 3, 5, 7, 14, 30,
                                      ].reduce((prev, curr) =>
                                        (
                                          Math.abs(curr - currentDays) <
                                          Math.abs(prev - currentDays)
                                        ) ?
                                          curr
                                        : prev,
                                      );
                                      return `${closestSelected} ${closestSelected === 1 ? 'Day' : 'Days'} ${closestSelected <= 2 ? ' (Free)' : ''}`;
                                    })()}
                                  </span>
                                  <ChevronDown className='h-4 w-4 opacity-50' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className='bg-pw-surface border-white/10 w-56 rounded-2xl'>
                                {[
                                  { days: 1, tier: 'free' },
                                  { days: 2, tier: 'free' },
                                  { days: 3, tier: 'flexible' },
                                  { days: 5, tier: 'flexible' },
                                  { days: 7, tier: 'flexible' },
                                  { days: 14, tier: 'standard' },
                                  { days: 30, tier: 'pro' },
                                ].map(({ days, tier }) => {
                                  const isEligible = tierAtLeast(
                                    premiumTier,
                                    tier as any,
                                  );
                                  return (
                                    <DropdownMenuItem
                                      key={`exp-select-${days}`}
                                      disabled={!isEligible}
                                      onClick={() => {
                                        if (isEligible) {
                                          const newExpiry = computeExpiry(
                                            premiumTier,
                                            days,
                                          );
                                          setEditedQuiz({
                                            ...editedQuiz,
                                            expires_at: newExpiry.toISOString(),
                                          });
                                          toast.success(
                                            `Expiry set to ${days} ${days === 1 ? 'day' : 'days'}!`,
                                          );
                                        } else {
                                          toast.info(
                                            `Unlock ${days} days expiry with the ${tier} tier.`,
                                          );
                                        }
                                      }}
                                      className={cn(
                                        'h-10 text-xs rounded-xl flex items-center justify-between cursor-pointer px-4',
                                        !isEligible &&
                                          'opacity-40 grayscale pointer-events-none',
                                      )}>
                                      <span>
                                        {days} {days === 1 ? 'Day' : 'Days'}
                                      </span>
                                      {!isEligible && (
                                        <Lock className='h-3.5 w-3.5 opacity-60 text-pw-warning' />
                                      )}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <p className='text-[10px] text-pw-muted pl-1'>
                              {editedQuiz.expires_at ?
                                <>
                                  Currently expires on:{' '}
                                  <span className='text-pw-primary font-bold'>
                                    {new Date(
                                      editedQuiz.expires_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </>
                              : <>Default lifespan is 2 days (Free tier)</>}
                            </p>
                          </div>
                        </QuizSettingItem>
                      </div>
                    </Wrapper>

                    <Wrapper
                      title='Security'
                      description='Advanced protection for high-stakes assessments'
                      icon={<ShieldCheck className='h-4 w-4' />}
                      color='danger'>
                      <div className='flex flex-col gap-2 pt-2'>
                        <QuizSettingItem
                          label='Multiple Attempts'
                          description={`This restricts or allows takers to retake the ${editedQuiz.type} after completion.`}>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                allowRetry: !editedQuiz.allowRetry,
                              })
                            }
                            className={cn(
                              'h-6 min-w-[100px] gap-2 font-black tracking-tighter',
                              editedQuiz.allowRetry ?
                                'bg-pw-cyan/10 border-pw-cyan/80 text-pw-cyan'
                              : 'bg-pw-danger/5 border-pw-danger/80 text-pw-danger',
                            )}>
                            {editedQuiz.allowRetry ? 'ALLOW' : 'RESTRICT'}
                          </Button>
                        </QuizSettingItem>

                        <QuizSettingItem
                          label='Enforce Anticheat'
                          description='Detects tab switching, copy-pasting, and print-screen. Auto-submits on repeated violations.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                enforceSecurity: !editedQuiz.enforceSecurity,
                              })
                            }
                            className={cn(
                              'h-6 min-w-[100px] gap-2 font-black tracking-tighter',
                              editedQuiz.enforceSecurity ?
                                'bg-pw-danger/10 border-pw-danger text-pw-danger'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {editedQuiz.enforceSecurity ? 'STRICT' : 'STANDARD'}
                          </Button>
                        </QuizSettingItem>

                        {editedQuiz.questions.some(
                          (q) =>
                            q.skipTo ||
                            q.skipToCat ||
                            q.options.some(
                              (o) =>
                                typeof o === 'object' &&
                                (o.skipTo || o.skipToCat),
                            ),
                        ) && (
                          <div className='p-3 bg-pw-warning/10 border border-pw-warning/20 text-pw-warning text-xs rounded-xl flex items-center gap-2 mb-2'>
                            <AlertTriangle className='h-4 w-4 shrink-0' />
                            <span>
                              Branching Active: Question order randomization is
                              restricted to internal category shuffling to
                              maintain valid logical branching paths.
                            </span>
                          </div>
                        )}

                        <QuizSettingItem
                          label='Randomization'
                          description='Randomize your questions and options to improve quiz integrity and security.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                randomizeOptions: !editedQuiz.randomizeOptions,
                                randomizeQuestions:
                                  !editedQuiz.randomizeQuestions,
                              })
                            }
                            className={cn(
                              'h-6 min-w-[80px] gap-2',
                              (
                                editedQuiz.randomizeOptions &&
                                  editedQuiz.randomizeQuestions
                              ) ?
                                'bg-pw-primary/10 border-pw-primary text-white'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {(
                              editedQuiz.randomizeOptions &&
                              editedQuiz.randomizeQuestions
                            ) ?
                              <Check className='h-3 w-3' />
                            : <X className='h-3 w-3' />}
                            {(
                              editedQuiz.randomizeOptions &&
                              editedQuiz.randomizeQuestions
                            ) ?
                              'RANDOM'
                            : 'OFF'}
                          </Button>
                        </QuizSettingItem>
                      </div>
                    </Wrapper>

                    <Wrapper
                      title='Results & Review'
                      description='What happens after submission?'
                      icon={<CheckCircle2 className='h-4 w-4' />}
                      color='success'>
                      <div className='flex flex-col gap-2 pt-2'>
                        <QuizSettingItem
                          label='Show Performance Stats'
                          description='Reveal final score and breakdown to the taker.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                endScreen: {
                                  ...editedQuiz.endScreen,
                                  showPerformance:
                                    !editedQuiz.endScreen.showPerformance,
                                },
                              })
                            }
                            className={cn(
                              'h-6 min-w-[80px]',
                              editedQuiz.endScreen.showPerformance ?
                                'bg-pw-success/10 border-pw-success text-pw-success'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {editedQuiz.endScreen.showPerformance ?
                              'SHOW'
                            : 'HIDE'}
                          </Button>
                        </QuizSettingItem>

                        <div className='space-y-4 mt-4'>
                          <div className='space-y-2'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase'>
                              Custom Finish Title
                            </label>
                            <Input
                              value={editedQuiz.endScreen.title}
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  endScreen: {
                                    ...editedQuiz.endScreen,
                                    title: e.target.value,
                                  },
                                })
                              }
                              className='bg-white/5 border-white/10 h-10'
                            />
                          </div>
                          <div className='space-y-2'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase'>
                              Custom Finish Message
                            </label>
                            <textarea
                              value={editedQuiz.endScreen.message}
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  endScreen: {
                                    ...editedQuiz.endScreen,
                                    message: e.target.value,
                                  },
                                })
                              }
                              className='w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-xs'
                            />
                          </div>
                        </div>
                      </div>
                    </Wrapper>

                    <Wrapper
                      title='Branding & Layout'
                      description='Customize background image, logo, and scrolling layout'
                      icon={<Image className='h-4 w-4 text-pw-primary' />}
                      color='primary'>
                      <div className='flex flex-col gap-4 pt-2'>
                        <div className='space-y-4 mt-4 border-t border-white/5 pt-4'>
                          <h4 className='text-[10px] font-bold text-pw-primary uppercase tracking-widest'>
                            Institutional Branding (File Uploads)
                          </h4>

                          <div className='grid grid-cols-2 gap-2'>
                            <div className='space-y-2'>
                              <label className='text-[10px] font-bold text-pw-muted uppercase'>
                                Background Image
                              </label>
                              <Input
                                type='file'
                                accept='image/*'
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const r = new FileReader();
                                    r.onload = (ev) => {
                                      setEditedQuiz({
                                        ...editedQuiz,
                                        branding: {
                                          ...(editedQuiz.branding || {}),
                                          image: ev.target?.result as string,
                                        },
                                      });
                                      toast.success('Background image loaded!');
                                    };
                                    r.readAsDataURL(file);
                                  }
                                }}
                                className='bg-white/5 border-white/10 h-10'
                              />
                            </div>

                            <div className='space-y-2'>
                              <label className='text-[10px] font-bold text-pw-muted uppercase'>
                                Brand Icon / Logo
                              </label>
                              <Input
                                type='file'
                                accept='image/*'
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const r = new FileReader();
                                    r.onload = (ev) => {
                                      setEditedQuiz({
                                        ...editedQuiz,
                                        branding: {
                                          ...(editedQuiz.branding || {}),
                                          icon: ev.target?.result as string,
                                        },
                                      });
                                      toast.success('Brand logo loaded!');
                                    };
                                    r.readAsDataURL(file);
                                  }
                                }}
                                className='bg-white/5 border-white/10 h-10'
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Wrapper>
                  </>
                )}
              </div>
            : <div className='space-y-8'>
                <div className='flex items-center justify-between flex-wrap'>
                  <h3 className='text-xl font-bold'>
                    Question {currentStep + 1}
                  </h3>
                  <div className='flex gap-2 flex-wrap'>
                    <Button
                      variant='ghost'
                      title='Move question up'
                      size='icon'
                      onClick={() => moveQuestion(currentStep, 'up')}
                      disabled={currentStep === 0}
                      className='h-9 w-9 text-pw-muted hover:text-pw-primary'>
                      <ArrowUp className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      title='Move question down'
                      onClick={() => moveQuestion(currentStep, 'down')}
                      disabled={currentStep === editedQuiz.questions.length - 1}
                      className='h-9 w-9 text-pw-muted hover:text-pw-primary'>
                      <ArrowDown className='h-4 w-4' />
                    </Button>

                    <div className='w-[1px] h-9 bg-white/5 mx-2' />

                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant='outline'
                          title='Change question type'
                          className='h-9 gap-2 text-xs bg-white/5 border-white/10'>
                          {editedQuiz.questions[currentStep].type
                            .replace('_', ' ')
                            .toUpperCase()}{' '}
                          <ChevronDown className='h-3 w-3' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='bg-pw-surface border-white/10 w-48'>
                        {(
                          [
                            'multiple_choice',
                            'true_false',
                            'dropdown',
                            'checkbox',
                            'input',
                            editedQuiz.type === 'survey' && 'rating',
                            editedQuiz.type === 'survey' && 'range',
                          ] as QuestionType[]
                        ).map((type) => {
                          if (!type) return null;
                          return (
                            <DropdownMenuItem
                              key={type}
                              onClick={() => {
                                const q = {
                                  ...editedQuiz.questions[currentStep],
                                  type,
                                };
                                // Reset options/correct Index for new type
                                if (type === 'true_false') {
                                  q.options = [
                                    { id: 'true', text: 'True' },
                                    { id: 'false', text: 'False' },
                                  ];
                                  q.correctIndex = 'true';
                                } else if (type === 'input') {
                                  q.options = [];
                                  q.correctIndex = '';
                                } else if (type === 'checkbox') {
                                  q.correctIndex = [];
                                } else if (type === 'range') {
                                  q.options = [];
                                  q.min = 0;
                                  q.max = 10;
                                  q.step = 1;
                                  q.correctIndex = 5;
                                } else if (type === 'rating') {
                                  q.options = [];
                                  q.correctIndex = 5;
                                } else {
                                  // For MC/Dropdown, ensure options are objects
                                  if (
                                    q.options.length > 0 &&
                                    typeof q.options[0] === 'string'
                                  ) {
                                    q.options = q.options.map((opt, idx) => ({
                                      id: `${q.id}-opt-${idx}`,
                                      text: opt as string,
                                    }));
                                  }
                                  q.correctIndex =
                                    (q.options[0] as QuizOption)?.id || '';
                                }
                                updateQuestion(currentStep, q);
                              }}>
                              {type.replace('_', ' ').toUpperCase()}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant='outline'
                          title='Add accessory'
                          className='h-9 gap-2 text-[10px] bg-white/5 border-white/10 uppercase font-bold tracking-widest'>
                          {editedQuiz.questions[currentStep].accessory ||
                            'No Accessory'}{' '}
                          <ChevronDown className='h-3 w-3' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='bg-pw-surface border-white/10 w-48'>
                        {(
                          [
                            'none',
                            'calculator',
                            'note',
                            'periodic_table',
                            'formula_sheet',
                            'glossary',
                          ] as const
                        ).map((acc) => (
                          <DropdownMenuItem
                            key={acc}
                            onClick={() => {
                              const q = {
                                ...editedQuiz.questions[currentStep],
                                accessory: acc,
                              };
                              updateQuestion(currentStep, q);
                            }}
                            className='text-xs uppercase font-bold'>
                            {acc.replace('_', ' ')}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {editedQuiz.questions[currentStep].accessory === 'note' && (
                      <Input
                        placeholder='Add your note/formula here...'
                        value={
                          editedQuiz.questions[currentStep].accessoryNote || ''
                        }
                        onChange={(e) => {
                          const q = {
                            ...editedQuiz.questions[currentStep],
                            accessoryNote: e.target.value,
                          };
                          updateQuestion(currentStep, q);
                        }}
                        className='h-9 text-xs bg-white/5 border-white/10 min-w-[200px]'
                      />
                    )}

                    {/* Question Timer */}
                    <div className='flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 rounded-md h-9'>
                      <Clock className='h-3.5 w-3.5 text-pw-muted' />
                      <input
                        type='number'
                        placeholder='Timer (s)'
                        value={editedQuiz.questions[currentStep].timer || ''}
                        onChange={(e) => {
                          const val =
                            e.target.value ?
                              parseInt(e.target.value, 10)
                            : undefined;
                          updateQuestion(currentStep, {
                            ...editedQuiz.questions[currentStep],
                            timer: val && val > 0 ? val : undefined,
                          });
                        }}
                        className='w-14 bg-transparent border-none outline-none text-[10px] text-pw-text font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none no-outline'
                        title='Set question timer in seconds (optional)'
                      />
                    </div>

                    <div className='w-[1px] h-9 bg-white/5 mx-2' />

                    <div className='gap-2 flex'>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='Previous question'
                        onClick={() =>
                          setCurrentStep(Math.max(0, currentStep - 1))
                        }
                        disabled={currentStep === 0}>
                        <ChevronLeft className='h-5 w-5' />
                      </Button>

                      <Button
                        variant='ghost'
                        size='icon'
                        title='Next question'
                        onClick={() =>
                          setCurrentStep(
                            Math.min(
                              editedQuiz.questions.length - 1,
                              currentStep + 1,
                            ),
                          )
                        }
                        disabled={
                          currentStep === editedQuiz.questions.length - 1
                        }>
                        <ChevronRight className='h-5 w-5' />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Question Content based on Type */}
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                      Question Text
                    </label>

                    <div className='w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm'>
                      <div className='relative'>
                        <textarea
                          value={editedQuiz.questions[currentStep].text}
                          onChange={(e) =>
                            updateQuestion(currentStep, {
                              ...editedQuiz.questions[currentStep],
                              text: e.target.value,
                            })
                          }
                          placeholder='Enter your question (Use @ to mention parameters like @name or @email)'
                          className='w-full h-20 bg-transparent p-0 text-sm no-outline resize-none transition-all'
                        />
                        {/* Mention Helper Badge List */}
                        {editedQuiz.askDetails &&
                          editedQuiz.askDetails.length > 0 && (
                            <div className='flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5'>
                              <span className='text-[10px] font-bold text-pw-muted uppercase'>
                                Mention Detail:
                              </span>
                              {editedQuiz.askDetails.map((d) => (
                                <button
                                  key={d.title}
                                  type='button'
                                  onClick={() => {
                                    const mentionTag = `@${d.title.trim().replace(/\s+/g, '')}`;
                                    const curText =
                                      editedQuiz.questions[currentStep].text ||
                                      '';
                                    updateQuestion(currentStep, {
                                      ...editedQuiz.questions[currentStep],
                                      text: `${curText} ${mentionTag} `.trimStart(),
                                    });
                                    toast.success(
                                      `Inserted ${mentionTag} tag!`,
                                    );
                                  }}
                                  className='px-2 py-0.5 rounded bg-pw-primary/15 border border-pw-primary/30 text-pw-primary text-[10px] font-bold hover:bg-pw-primary/25 transition-all'>
                                  @{d.title}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      {/* Group + Question Routing row */}
                      <div className='flex flex-wrap items-center justify-between gap-2 mt-2 border-t border-white/5 pt-2'>
                        {/* Group Tag Input (Combo-box Style) */}
                        <div className='flex flex-col gap-1'>
                          <div className='flex items-center gap-1.5'>
                            <span className='text-[11px] text-pw-muted uppercase tracking-wider font-bold shrink-0'>
                              Group
                            </span>
                            <div className='relative'>
                              <input
                                type='text'
                                list='existing-groups'
                                placeholder='e.g. Male, Section A'
                                value={
                                  editedQuiz.questions[currentStep].category ||
                                  ''
                                }
                                onChange={(e) =>
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    category: e.target.value || undefined,
                                  })
                                }
                                className='h-6 w-32 bg-white/5 border border-white/10 px-2 text-[10px] rounded-md text-pw-text placeholder:text-pw-muted/40 outline-none focus:border-pw-primary/60 transition-colors'
                              />
                              <datalist id='existing-groups'>
                                {Array.from(
                                  new Set(
                                    editedQuiz.questions
                                      .map((q) => q.category)
                                      .filter(Boolean),
                                  ),
                                ).map((group) => (
                                  <option
                                    key={group}
                                    value={group}
                                  />
                                ))}
                              </datalist>
                            </div>
                            {editedQuiz.questions[currentStep].category && (
                              <span className='px-1.5 py-0.5 bg-pw-primary/15 text-pw-primary rounded text-[8px] font-bold uppercase'>
                                {editedQuiz.questions[currentStep].category}
                              </span>
                            )}
                          </div>
                          <p className='text-[10px] text-pw-muted/60 pl-1'>
                            Group questions to create automated sequential
                            branches.
                          </p>
                        </div>

                        {/* Question-level routing dropdown */}
                        {(
                          editedQuiz.quizScroll ||
                          editedQuiz.quizLayout === 'scroll' ||
                          editedQuiz.quizLayout === 'scroll_show' ||
                          editedQuiz.surveyType === 'form'
                        ) ?
                          <div className='relative group'>
                            <Button
                              variant='ghost'
                              size='sm'
                              disabled
                              className='h-6 text-[10px] gap-1 px-2 text-pw-muted opacity-40 cursor-not-allowed'>
                              Next →
                            </Button>
                            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0E1026] border border-white/10 text-[9px] text-white px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none'>
                              Branching logic is exclusive to Progressive
                              Single-Show mode
                            </div>
                          </div>
                        : <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button
                                variant='ghost'
                                size='sm'
                                className={cn(
                                  'h-6 text-[10px] gap-1 px-2',
                                  (
                                    editedQuiz.questions[currentStep].skipTo ||
                                      editedQuiz.questions[currentStep]
                                        .skipToCat
                                  ) ?
                                    'text-pw-warning hover:text-pw-warning/80'
                                  : 'text-pw-muted hover:text-pw-primary',
                                )}>
                                {editedQuiz.questions[currentStep].skipToCat ?
                                  `↪ Group: ${editedQuiz.questions[currentStep].skipToCat}`
                                : (
                                  editedQuiz.questions[currentStep].skipTo ===
                                  'end'
                                ) ?
                                  '⛔ Ends Here'
                                : editedQuiz.questions[currentStep].skipTo ?
                                  `↪ Q${editedQuiz.questions.findIndex((q) => q.id === editedQuiz.questions[currentStep].skipTo) + 1}`
                                : 'Next →'}
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className='bg-pw-surface border-white/10 w-56 max-h-[280px] overflow-y-auto'>
                              <div className='px-2 pt-1.5 pb-0.5'>
                                <p className='text-[8px] font-black uppercase tracking-widest text-pw-muted'>
                                  After this question…
                                </p>
                              </div>
                              <DropdownMenuItem
                                onClick={() => {
                                  const cur = {
                                    ...editedQuiz.questions[currentStep],
                                  };
                                  delete cur.skipTo;
                                  delete (cur as any).skipToCat;
                                  updateQuestion(currentStep, cur);
                                }}>
                                <span className='text-xs text-pw-muted'>
                                  ↩ Default (Next in order)
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const cur = {
                                    ...editedQuiz.questions[currentStep],
                                  };
                                  delete (cur as any).skipToCat;
                                  updateQuestion(currentStep, {
                                    ...cur,
                                    skipTo: 'end',
                                  });
                                }}>
                                <span className='text-xs text-pw-danger'>
                                  ⛔ Finish Assessment
                                </span>
                              </DropdownMenuItem>

                              {editedQuiz.questions.filter(
                                (q) =>
                                  q.id !== editedQuiz.questions[currentStep].id,
                              ).length > 0 && (
                                <div className='px-2 pt-2 pb-0.5 mt-1 border-t border-white/5'>
                                  <p className='text-[8px] font-black uppercase tracking-widest text-pw-muted'>
                                    Jump to Specific Question
                                  </p>
                                </div>
                              )}
                              {editedQuiz.questions
                                .filter(
                                  (q) =>
                                    q.id !==
                                    editedQuiz.questions[currentStep].id,
                                )
                                .map((q) => (
                                  <DropdownMenuItem
                                    key={q.id}
                                    className={'cursor-pointer'}
                                    onClick={() => {
                                      const cur = {
                                        ...editedQuiz.questions[currentStep],
                                      };
                                      delete (cur as any).skipToCat;
                                      updateQuestion(currentStep, {
                                        ...cur,
                                        skipTo: q.id,
                                      });
                                    }}>
                                    <span className='text-xs'>
                                      Q{editedQuiz.questions.indexOf(q) + 1}{' '}
                                      {q.text.slice(0, 18)}
                                    </span>
                                  </DropdownMenuItem>
                                ))}

                              {Array.from(
                                new Set(
                                  editedQuiz.questions
                                    .filter(
                                      (q) =>
                                        (q as any).category &&
                                        q.id !==
                                          editedQuiz.questions[currentStep].id,
                                    )
                                    .map((q) => (q as any).category as string),
                                ),
                              ).length > 0 && (
                                <div className='px-2 pt-2 pb-0.5 mt-1 border-t border-white/5'>
                                  <p className='text-[8px] font-black uppercase tracking-widest text-pw-muted'>
                                    Jump to Group (sequential flow)
                                  </p>
                                </div>
                              )}
                              {Array.from(
                                new Set(
                                  editedQuiz.questions
                                    .filter(
                                      (q) =>
                                        (q as any).category &&
                                        q.id !==
                                          editedQuiz.questions[currentStep].id,
                                    )
                                    .map((q) => (q as any).category as string),
                                ),
                              ).map((cat) => (
                                <DropdownMenuItem
                                  key={`cat-${cat}`}
                                  onClick={() => {
                                    const cur = {
                                      ...editedQuiz.questions[currentStep],
                                    };
                                    delete cur.skipTo;
                                    updateQuestion(currentStep, {
                                      ...cur,
                                      skipToCat: cat,
                                    } as any);
                                  }}>
                                  <span className='text-xs flex items-center gap-1.5'>
                                    <span className='px-1.5 py-0.5 bg-pw-primary/15 text-pw-primary rounded text-[8px] font-bold uppercase'>
                                      {cat}
                                    </span>
                                    Start this group
                                  </span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        }
                      </div>
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                      Answers & Logic
                    </label>

                    {editedQuiz.questions[currentStep].type === 'input' ?
                      <div className='space-y-4'>
                        <div className='bg-pw-primary/5 p-4 rounded-2xl border border-pw-primary/10 flex flex-col items-center text-center gap-4 pt-12 md:pt-8 md:flex-row md:align-start justify-evenly'>
                          <div className='gap-2 flex flex-col items-center'>
                            <Type className='h-8 w-8 text-pw-primary opacity-50' />
                            <div>
                              <p className='text-sm font-bold'>
                                Input Question
                              </p>
                              <p className='text-[10px] text-pw-muted max-w-[350px]'>
                                Takers will type their answer.
                                <br />
                                Leave the "Keyword" field empty to accept any
                                text as correct.
                              </p>
                            </div>
                            <Input
                              placeholder='Keyword (Optional)'
                              value={
                                editedQuiz.questions[currentStep]
                                  .correctIndex || ''
                              }
                              onChange={(e) =>
                                updateQuestion(currentStep, {
                                  ...editedQuiz.questions[currentStep],
                                  correctIndex: e.target.value,
                                })
                              }
                              className='h-8 w-full max-w-[300px] bg-white/5 border-white/10 text-center transition-all focus:border-pw-primary placeholder:text-pw-muted/50 mt-2'
                            />

                            <div
                              className={cn(
                                'items-center gap-2 w-full mt-1 justify-between px-1',
                                (
                                  !editedQuiz.questions[currentStep]
                                    .correctIndex
                                ) ?
                                  'hidden'
                                : 'flex',
                              )}>
                              <label className='text-[10px] font-bold text-pw-muted uppercase'>
                                Case Sensitive
                              </label>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    caseSensitive:
                                      !editedQuiz.questions[currentStep]
                                        .caseSensitive,
                                  })
                                }
                                className={cn(
                                  'h-8 px-3 text-[10px] gap-1',
                                  (
                                    editedQuiz.questions[currentStep]
                                      .caseSensitive
                                  ) ?
                                    'bg-pw-primary/10 border-pw-primary text-pw-primary'
                                  : 'bg-white/5 border-white/10',
                                )}>
                                {(
                                  editedQuiz.questions[currentStep]
                                    .caseSensitive
                                ) ?
                                  <Check className='h-3 w-3' />
                                : <X className='h-3 w-3' />}
                                {(
                                  editedQuiz.questions[currentStep]
                                    .caseSensitive
                                ) ?
                                  'ON'
                                : 'OFF'}
                              </Button>
                            </div>
                          </div>

                          <div className='space-y-2 mt-4'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest pl-1'>
                              Correct Explanation (Optional)
                            </label>
                            <textarea
                              value={
                                editedQuiz.questions[currentStep]
                                  .correctExplanation || ''
                              }
                              onChange={(e) =>
                                updateQuestion(currentStep, {
                                  ...editedQuiz.questions[currentStep],
                                  correctExplanation: e.target.value,
                                })
                              }
                              placeholder='Explain why this is correct...'
                              className='w-full h-full max-h-[200px] bg-white/5 border border-white/10 rounded-xl p-4 text-xs focus:border-pw-primary focus:outline-none resize-none custom-scrollbar'
                            />
                          </div>
                        </div>
                      </div>
                    : editedQuiz.questions[currentStep].type === 'range' ?
                      <div className='space-y-6 flex flex-col items-center py-4'>
                        <div className='w-full max-w-sm space-y-4'>
                          <div className='flex justify-between text-xs font-bold text-pw-muted opacity-50 uppercase'>
                            <span>
                              Min: {editedQuiz.questions[currentStep].min || 0}
                            </span>
                            <span>
                              Max: {editedQuiz.questions[currentStep].max || 10}
                            </span>
                          </div>
                          <input
                            type='range'
                            min={editedQuiz.questions[currentStep].min || 0}
                            max={editedQuiz.questions[currentStep].max || 10}
                            step={editedQuiz.questions[currentStep].step || 1}
                            className='w-full accent-pw-primary cursor-pointer'
                            disabled
                          />
                          <div className='grid grid-cols-3 gap-2'>
                            <div className='space-y-1'>
                              <label className='text-[8px] text-pw-muted uppercase'>
                                Min
                              </label>
                              <Input
                                type='number'
                                value={
                                  editedQuiz.questions[currentStep].min ?? 0
                                }
                                onChange={(e) =>
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    min: parseInt(e.target.value) || 0,
                                  })
                                }
                                className='h-8 text-[10px] bg-white/5'
                              />
                            </div>
                            <div className='space-y-1'>
                              <label className='text-[8px] text-pw-muted uppercase'>
                                Max
                              </label>
                              <Input
                                type='number'
                                value={
                                  editedQuiz.questions[currentStep].max ?? 10
                                }
                                onChange={(e) =>
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    max: parseInt(e.target.value) || 10,
                                  })
                                }
                                className='h-8 text-[10px] bg-white/5'
                              />
                            </div>
                            <div className='space-y-1'>
                              <label className='text-[8px] text-pw-muted uppercase'>
                                Step
                              </label>
                              <Input
                                type='number'
                                value={
                                  editedQuiz.questions[currentStep].step ?? 1
                                }
                                onChange={(e) =>
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    step: parseInt(e.target.value) || 1,
                                  })
                                }
                                className='h-8 text-[10px] bg-white/5'
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    : editedQuiz.questions[currentStep].type === 'rating' ?
                      <div className='flex flex-col items-center gap-4 py-8'>
                        <div className='flex gap-2 text-pw-warning'>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className='h-8 w-8 fill-current opacity-20'
                            />
                          ))}
                        </div>
                        <p className='text-xs text-pw-muted'>
                          Survey only: no correct answer required.
                        </p>
                      </div>
                    : <div className='space-y-3'>
                        <div
                          className={cn(
                            'w-full grid grid-cols-1 gap-2',
                            editedQuiz.questions[currentStep].type ===
                              'true_false' && 'grid-cols-1 lg:grid-cols-2',
                          )}>
                          {(
                            editedQuiz.questions[currentStep]
                              .options as QuizOption[]
                          ).map((opt, idx) => {
                            const isCheckbox =
                              editedQuiz.questions[currentStep].type ===
                              'checkbox';
                            const isCorrect =
                              isCheckbox ?
                                Array.isArray(
                                  editedQuiz.questions[currentStep]
                                    .correctIndex,
                                ) &&
                                (
                                  editedQuiz.questions[currentStep]
                                    .correctIndex as string[]
                                ).includes(opt.id)
                              : editedQuiz.questions[currentStep]
                                  .correctIndex === opt.id;
                            return (
                              <div
                                key={opt.id}
                                className={cn(
                                  'group flex flex-col gap-1 p-3 rounded-xl border transition-all',
                                  isCorrect ?
                                    'bg-pw-success/10 border-pw-success/50 shadow-md shadow-pw-success/5'
                                  : 'bg-white/5 border-white/5 hover:border-pw-primary/30',
                                )}>
                                <div className='flex items-center gap-3'>
                                  {editedQuiz.type === 'quiz' && (
                                    <button
                                      onClick={() => {
                                        if (isCheckbox) {
                                          const currentCorrect =
                                            (
                                              Array.isArray(
                                                editedQuiz.questions[
                                                  currentStep
                                                ].correctIndex,
                                              )
                                            ) ?
                                              editedQuiz.questions[currentStep]
                                                .correctIndex
                                            : [];
                                          const newCorrect =
                                            currentCorrect.includes(opt.id) ?
                                              currentCorrect.filter(
                                                (id: string) => id !== opt.id,
                                              )
                                            : [...currentCorrect, opt.id];
                                          updateQuestion(currentStep, {
                                            ...editedQuiz.questions[
                                              currentStep
                                            ],
                                            correctIndex: newCorrect,
                                          });
                                        } else {
                                          updateQuestion(currentStep, {
                                            ...editedQuiz.questions[
                                              currentStep
                                            ],
                                            correctIndex: opt.id,
                                          });
                                        }
                                      }}
                                      className={cn(
                                        'h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-transform active:scale-95',
                                        isCorrect ?
                                          'bg-pw-success border-pw-success text-white scale-110'
                                        : 'bg-black/20 border-white/20 text-transparent hover:border-pw-primary hover:text-pw-primary/50',
                                      )}>
                                      <Check className='h-3 w-3' />
                                    </button>
                                  )}
                                  <Input
                                    value={opt.text}
                                    onChange={(e) => {
                                      const newOpts = [
                                        ...(editedQuiz.questions[currentStep]
                                          .options as QuizOption[]),
                                      ];
                                      newOpts[idx].text = e.target.value;
                                      updateQuestion(currentStep, {
                                        ...editedQuiz.questions[currentStep],
                                        options: newOpts,
                                      });
                                    }}
                                    placeholder={`Option ${idx + 1}`}
                                    className='bg-transparent border-none rounded-none p-0 h-auto text-sm focus-visible:ring-0 no-outline flex-1'
                                  />

                                  <div className='flex items-center gap-1 shrink-0'>
                                    {/* Branching Logic for Option */}
                                    {(
                                      editedQuiz.quizScroll ||
                                      editedQuiz.quizLayout === 'scroll' ||
                                      editedQuiz.quizLayout === 'scroll_show' ||
                                      editedQuiz.surveyType === 'form'
                                    ) ?
                                      <div className='relative group'>
                                        <Button
                                          variant='ghost'
                                          size='sm'
                                          disabled
                                          className='h-7 px-2 text-[10px] gap-1 text-pw-muted opacity-40 cursor-not-allowed'>
                                          <Share2 size={10} /> Branch
                                        </Button>
                                        <div className='absolute bottom-full right-0 mb-1 hidden group-hover:block bg-[#0E1026] border border-white/10 text-[9px] text-white px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none'>
                                          Branching logic is exclusive to
                                          Progressive Single-Show mode
                                        </div>
                                      </div>
                                    : <DropdownMenu>
                                        <DropdownMenuTrigger>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            className={cn(
                                              'h-7 px-2 text-[10px] gap-1 transition-all',
                                              opt.skipTo || opt.skipToCat ?
                                                'bg-pw-warning/10 text-pw-warning border-pw-warning/20'
                                              : 'md:opacity-0 opacity-100 group-hover:opacity-100 md:group-hover:opacity-100 group-active:opacity-100 text-pw-muted hover:text-pw-primary',
                                            )}>
                                            {opt.skipTo || opt.skipToCat ?
                                              <>
                                                <Share2 size={10} />
                                                {opt.skipToCat ?
                                                  `To Grp: ${opt.skipToCat}`
                                                : opt.skipTo === 'end' ?
                                                  'Finish Assessment'
                                                : `To Q${editedQuiz.questions.findIndex((q) => q.id === opt.skipTo) + 1}`
                                                }
                                              </>
                                            : <>
                                                <Share2 size={10} /> Branch
                                              </>
                                            }
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className='bg-pw-surface border-white/10 w-56'>
                                          <div className='px-2 py-1.5 border-b border-white/5'>
                                            <p className='text-[10px] font-black uppercase text-pw-muted tracking-widest'>
                                              Route this answer to:
                                            </p>
                                          </div>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              const newOpts = [
                                                ...(editedQuiz.questions[
                                                  currentStep
                                                ].options as QuizOption[]),
                                              ];
                                              const o = { ...newOpts[idx] };
                                              delete o.skipTo;
                                              delete o.skipToCat;
                                              newOpts[idx] = o;
                                              updateQuestion(currentStep, {
                                                ...editedQuiz.questions[
                                                  currentStep
                                                ],
                                                options: newOpts,
                                              });
                                            }}>
                                            <span className='text-xs text-pw-muted italic'>
                                              Default (Next Question)
                                            </span>
                                          </DropdownMenuItem>

                                          <DropdownMenuItem
                                            onClick={() => {
                                              const newOpts = [
                                                ...(editedQuiz.questions[
                                                  currentStep
                                                ].options as QuizOption[]),
                                              ];
                                              const o = { ...newOpts[idx] };
                                              o.skipTo = 'end';
                                              delete o.skipToCat;
                                              newOpts[idx] = o;
                                              updateQuestion(currentStep, {
                                                ...editedQuiz.questions[
                                                  currentStep
                                                ],
                                                options: newOpts,
                                              });
                                            }}>
                                            <span className='text-xs text-pw-danger'>
                                              ⛔ Finish Assessment
                                            </span>
                                          </DropdownMenuItem>

                                          <div className='px-2 pt-2 pb-1'>
                                            <p className='text-[8px] font-bold uppercase text-pw-primary/60'>
                                              Specific Questions
                                            </p>
                                          </div>

                                          {editedQuiz.questions
                                            .filter(
                                              (q) =>
                                                q.id !==
                                                editedQuiz.questions[
                                                  currentStep
                                                ].id,
                                            )
                                            .map((q) => (
                                              <DropdownMenuItem
                                                key={q.id}
                                                onClick={() => {
                                                  const newOpts = [
                                                    ...(editedQuiz.questions[
                                                      currentStep
                                                    ].options as QuizOption[]),
                                                  ];
                                                  newOpts[idx] = {
                                                    ...newOpts[idx],
                                                    skipTo: q.id,
                                                    skipToCat: undefined,
                                                  };
                                                  updateQuestion(currentStep, {
                                                    ...editedQuiz.questions[
                                                      currentStep
                                                    ],
                                                    options: newOpts,
                                                  });
                                                }}>
                                                <span className='text-xs'>
                                                  Q
                                                  {editedQuiz.questions.indexOf(
                                                    q,
                                                  ) + 1}{' '}
                                                  {q.text.slice(0, 18)}
                                                </span>
                                              </DropdownMenuItem>
                                            ))}

                                          {Array.from(
                                            new Set(
                                              editedQuiz.questions
                                                .filter(
                                                  (q) =>
                                                    (q as any).category &&
                                                    q.id !==
                                                      editedQuiz.questions[
                                                        currentStep
                                                      ].id,
                                                )
                                                .map(
                                                  (q) =>
                                                    (q as any)
                                                      .category as string,
                                                ),
                                            ),
                                          ).length > 0 && (
                                            <>
                                              <div className='px-2 pt-2 pb-1 border-t border-white/5'>
                                                <p className='text-[8px] font-bold uppercase text-pw-primary/60'>
                                                  Jump to Group
                                                </p>
                                              </div>
                                              {Array.from(
                                                new Set(
                                                  editedQuiz.questions
                                                    .filter(
                                                      (q) =>
                                                        (q as any).category &&
                                                        q.id !==
                                                          editedQuiz.questions[
                                                            currentStep
                                                          ].id,
                                                    )
                                                    .map(
                                                      (q) =>
                                                        (q as any)
                                                          .category as string,
                                                    ),
                                                ),
                                              ).map((cat) => (
                                                <DropdownMenuItem
                                                  key={`cat-opt-${cat}`}
                                                  onClick={() => {
                                                    const newOpts = [
                                                      ...(editedQuiz.questions[
                                                        currentStep
                                                      ]
                                                        .options as QuizOption[]),
                                                    ];
                                                    newOpts[idx] = {
                                                      ...newOpts[idx],
                                                      skipToCat: cat,
                                                      skipTo: undefined,
                                                    };
                                                    updateQuestion(
                                                      currentStep,
                                                      {
                                                        ...editedQuiz.questions[
                                                          currentStep
                                                        ],
                                                        options: newOpts,
                                                      },
                                                    );
                                                  }}>
                                                  <span className='text-[10px] font-bold uppercase'>
                                                    {cat}
                                                  </span>
                                                </DropdownMenuItem>
                                              ))}
                                            </>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    }

                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      onClick={() => {
                                        const newOpts = (
                                          editedQuiz.questions[currentStep]
                                            .options as QuizOption[]
                                        ).filter((_, i) => i !== idx);
                                        updateQuestion(currentStep, {
                                          ...editedQuiz.questions[currentStep],
                                          options: newOpts,
                                        });
                                      }}
                                      className='h-7 w-7 hidden group-hover:inline-flex text-pw-danger transition-all duration-200'>
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            if (
                              editedQuiz.questions[currentStep].options
                                .length >= 4 &&
                              premiumTier === 'free'
                            ) {
                              return toast.error(
                                'Free tier accounts are capped at a maximum of 4 options per question! Please upgrade to add more.',
                              );
                            }

                            const newId = `${editedQuiz.questions[currentStep].id}-opt-${editedQuiz.questions[currentStep].options.length}`;
                            const newOpts = [
                              ...(editedQuiz.questions[currentStep]
                                .options as QuizOption[]),
                              { id: newId, text: '' },
                            ];
                            updateQuestion(currentStep, {
                              ...editedQuiz.questions[currentStep],
                              options: newOpts,
                            });
                          }}
                          className='w-full border-dashed border-white/20 h-10 gap-2 text-xs'>
                          <Plus className='h-3 w-3' /> Add Option
                        </Button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </Card>
        </div>
      </div>
    </div>
  );
};

export default function QuizPage() {
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [filenameInput, setFilenameInput] = useState('');
  const [filenameExtension, setFilenameExtension] = useState('');
  const [onConfirmFilename, setOnConfirmFilename] = useState<
    ((cleanName: string) => void) | null
  >(null);

  const triggerExport = (
    defaultName: string,
    ext: string,
    callback: (cleanName: string) => void,
  ) => {
    setFilenameInput(defaultName.replace(/\.[^/.]+$/, '')); // Strip any extension initially
    setFilenameExtension(ext);
    setOnConfirmFilename(() => callback);
    setIsNameModalOpen(true);
  };

  const handleConfirmFilename = () => {
    let clean = filenameInput.trim();
    if (!clean) clean = 'untitled';
    // Screen/strip common extensions to avoid double extension bugs
    clean = clean.replace(/\.(txt|pdf|png|doc|docx|json|csv)$/i, '');
    if (onConfirmFilename) {
      onConfirmFilename(clean);
    }
    setIsNameModalOpen(false);
  };

  const { premiumTier, isFeatureUnlocked } = useAppContext();
  const isQuizzablePremium = isFeatureUnlocked('quizzable');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Quiz | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<number | null>(null);

  const safeDecodeBase64 = (str: any): any => {
    if (typeof str !== 'string' || str.trim() === '') return str;
    // Check if string is structured as standard Base64 characters and padding
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (!base64Regex.test(str)) return str;
    try {
      const decoded = atob(str);
      try {
        return JSON.parse(decoded);
      } catch {
        return decoded;
      }
    } catch {
      return str;
    }
  };

  const resolveAnswerToText = (quiz: Quiz, questionId: string, val: any) => {
    const question = quiz.questions?.find((q) => q.id === questionId);
    if (!question) return String(val !== undefined && val !== null ? val : '');
    if (question.type === 'input')
      return String(val !== undefined && val !== null ? val :  '');

    const options = question.options || [];
    const findText = (id: any) => {
      if (id === undefined || id === null) return '';
      const idStr = String(id);

      // 1. Try to find by option.id matches idStr exactly
      const foundById = options.find(
        (o) => typeof o !== 'string' && o && o.id === idStr,
      );
      if (foundById && typeof foundById !== 'string') return foundById.text;

      // 2. Try to find by index (legacy representation)
      const numIdx = parseInt(idStr, 10);
      if (!isNaN(numIdx) && numIdx >= 0 && numIdx < options.length) {
        const opt = options[numIdx];
        if (typeof opt === 'string') return opt;
        if (opt && typeof opt === 'object') return opt.text;
      }

      // 3. Try to match options text of any object option (incase it was stored as text already)
      const foundByText = options.find(
        (o) => typeof o !== 'string' && o && o.text === idStr,
      );
      if (foundByText && typeof foundByText !== 'string')
        return foundByText.text;

      // 4. Try to match options string if options list is string list
      const foundInStringArray = options.find(
        (o) => typeof o === 'string' && o === idStr,
      );
      if (foundInStringArray && typeof foundInStringArray === 'string')
        return foundInStringArray;

      // Special Boolean/True/False check
      if (idStr === 'true' || idStr === 'false') {
        const foundTF = options.find(
          (o) => typeof o !== 'string' && o && o.id.toLowerCase() === idStr,
        );
        if (foundTF && typeof foundTF !== 'string') return foundTF.text;
        return idStr === 'true' ? 'True' : 'False';
      }

      return idStr;
    };

    if (Array.isArray(val)) {
      return val.map((v) => findText(v)).join(', ');
    }
    return findText(val);
  };

  const resolveCorrectText = (quiz: Quiz, questionId: string) => {
    const question = quiz.questions?.find((q) => q.id === questionId);
    if (!question) return '';
    const decodedVal = safeDecodeBase64(question.correctIndex);
    return resolveAnswerToText(quiz, questionId, decodedVal);
  };

  const exportResponsesAsCSV = (quiz: Quiz) => {
    if (!quiz.responses || quiz.responses.length === 0) return;

    const userKeys = Array.from(
      new Set(
        quiz.responses.flatMap((resp) => Object.keys(resp.userData || {})),
      ),
    );

    const headers = [
      'Timestamp',
      'Score',
      'Total',
      ...userKeys.map((k) => k.toUpperCase()),
      ...quiz.questions.map((q, i) => `Q${i + 1}: ${q.text}`),
    ];

    // Build perfectly aligned rows with nested quote escaping
    const rows = quiz.responses.map((resp) => [
      `"${new Date(resp.timestamp).toLocaleString().replace(/"/g, '""')}"`,
      `"${resp.score}"`,
      `"${resp.totalQuestions}"`,
      ...userKeys.map(
        (k) => `"${String(resp.userData[k] || '').replace(/"/g, '""')}"`,
      ),
      ...quiz.questions.map((q) => {
        const a = resp.answers.find((ans: any) => ans.questionId === q.id);
        if (!a) return '""';
        const resolvedText = formatDetailVars(resolveAnswerToText(quiz, q.id, a.answer), resp.userData, true, true);
        return `"${resolvedText.replace(/"/g, '""')}"`;
      }),
    ]);

    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    triggerExport(
      `${quiz.title.replace(/\s+/g, '_')}_responses`,
      'csv',
      (filename) => {
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Responses exported to CSV!');
      },
    );
  };

  const clearResponses = async (quizId: string) => {
    if (
      !confirm(
        'Are you sure you want to clear all responses? This cannot be undone.',
      )
    )
      return;

    const data = await HybridStorage.getAll('quiz');
    const index = data.findIndex((q: any) => q.id === quizId);
    if (index !== -1) {
      data[index].responses = [];
      await HybridStorage.save(quizId, data[index], 'quiz');
      setQuizzes([...data]);
      if (viewingResponses?.id === quizId) {
        setViewingResponses({ ...data[index] });
      }
      toast.success('Responses cleared!');
    }
  };

  const loadQuizzes = async () => {
    // 1. Serve local cache immediately
    const localData = await HybridStorage.getAll('quiz', (freshItems) => {
      // 2. Called in background when remote data arrives — silently refresh
      setQuizzes(freshItems);
    });
    setQuizzes(localData);
  };

  // Load from hybrid storage (offline-first)
  useEffect(() => {
    loadQuizzes();
  }, []);

  // Managed by HybridStorage exclusively

  const handleStartNew = () => {
    const newQuiz: Quiz = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      description: '',
      type: 'quiz',
      questions: [],
      endScreen: {
        title: 'Thank You!',
        message: 'You have completed the task.',
      },
      createdAt: Date.now(),
    };
    setActiveQuiz(newQuiz);
    setIsCreating(true);
  };

  const handleSaveQuiz = async (quiz: Quiz) => {
    if (!quiz.title) return toast.error('Quiz needs a title!');
    if (quiz?.questions?.length === 0)
      return toast.error('Quiz needs at least one question!');

    // Check if questions are valid
    const invalid = quiz?.questions?.some(
      (q) => !q.text || q.options.some((o) => !o),
    );
    if (invalid)
      return toast.error('Please fill in all questions and options.');

    // Obfuscate answer key for security
    const securedQuestions = quiz.questions.map((q) => {
      let securedIndex = q.correctIndex;
      try {
        if (typeof q.correctIndex === 'string') {
          securedIndex = btoa(q.correctIndex);
        } else if (Array.isArray(q.correctIndex)) {
          // Encode array values too if needed, but for now simple string btoa
          securedIndex = btoa(JSON.stringify(q.correctIndex));
        }
      } catch (e) {
        securedIndex = q.correctIndex;
      }
      return { ...q, correctIndex: securedIndex };
    });

    let finalExpiry = quiz.expires_at;
    if (!finalExpiry) {
      finalExpiry = computeExpiry(premiumTier, 2).toISOString();
    }

    const quizToSave = {
      ...quiz,
      questions: securedQuestions,
      expires_at: finalExpiry,
    };

    try {
      const savedItem = await HybridStorage.save(
        quizToSave.id,
        quizToSave,
        'quiz',
      );

      const existingIndex = quizzes.findIndex((q) => q.id === quiz.id);
      let newQuizzes;
      if (existingIndex > -1) {
        newQuizzes = [...quizzes];
        newQuizzes[existingIndex] = {
          ...quiz,
          is_synced: savedItem.is_synced,
        } as any;
      } else {
        newQuizzes = [
          { ...quiz, is_synced: savedItem.is_synced } as any,
          ...quizzes,
        ];
      }

      setQuizzes(newQuizzes);
      setIsCreating(false);
      setActiveQuiz(null);
      toast.success('Quiz saved successfully!');
    } catch (e) {
      toast.error('Failed to save quiz.');
    }
  };

  const deleteQuiz = async (id: string) => {
    const check = confirm(
      'Do you want to delete this assessment? This cannot be undone',
    );

    if (check) {
      await HybridStorage.delete(id, 'quiz');
      const newQuizzes = quizzes.filter((q) => q.id !== id);
      setQuizzes(newQuizzes);
      toast.success('Quiz deleted');
    }
  };

  const exportQuiz = (quiz: Quiz) => {
    triggerExport(
      quiz.title.replace(/\s+/g, '-').toLowerCase(),
      'json',
      (filename) => {
        const dataStr =
          'data:text/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(quiz));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', `${filename}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success('Quiz exported to JSON!');
      },
    );
  };

  const importQuiz = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const quiz = JSON.parse(event.target?.result as string);
        if (!quiz.title || !quiz?.questions) throw new Error('Invalid format');
        quiz.id = Math.random().toString(36).substr(2, 9); // New ID for import
        handleSaveQuiz(quiz);
      } catch {
        toast.error('Invalid quiz file format.');
      }
    };
    reader.readAsText(file);
  };

  const playQuiz = (id: string) => {
    window.open(`/quiz/${id}`, '_blank');
  };

  const formatDetailVars = (rawText: string, details:any, showPrev?:boolean, hideBold?:boolean) => {
    if (!rawText) return rawText;
    let formatted = rawText;
    Object.entries(details || {}).forEach(([key, val]) => {
      const cleanKey = key.trim().replace(/\s+/g, '');
      const boldVal = `${showPrev ? `@${cleanKey} (<strong class="text-pw-cyan font-bold">${val}</strong>)` : `<strong class="text-pw-cyan font-bold">${val}</strong>`}`;
      const normalVal = `${showPrev ? `@${cleanKey} (${val})` : `${val}`}`;
      const replText = `${hideBold ? normalVal : boldVal}`
      const regex1 = new RegExp(`@${cleanKey}`, 'gi');
      const regex2 = new RegExp(`@${key.trim()}`, 'gi');
      const regex3 = new RegExp(`\\$${cleanKey}`, 'gi');
      const regex4 = new RegExp(`\\$${key.trim()}`, 'gi');
      formatted = formatted
        .replace(regex1, replText)
        .replace(regex2, replText)
        .replace(regex3, replText)
        .replace(regex4, replText);
    });
    return formatted;
  };

  return (
    <div className='container mx-auto px-4 py-12 max-w-8xl min-h-[calc(100vh-64px)] pb-20'>
      <AnimatePresence mode='wait'>
        {!isCreating ?
          <motion.div
            key='list'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}>
            <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
              <div>
                <div className='badge mb-4'>
                  <Puzzle className='h-3.5 w-3.5' />
                  Quizzable
                </div>
                <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
                  Quiz <span className='gradient-text'>Builder.</span>
                </h1>
                <p className='mt-2 text-pw-muted'>
                  Create interactive quizzes, export to JSON, and share with
                  friends.
                </p>
              </div>
              <div className='flex gap-3 flex-wrap'>
                <Button
                  variant='outline'
                  title='Refresh Quiz'
                  onClick={loadQuizzes}
                  className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
                  <RefreshCw className='h-4 w-4' />
                </Button>
                <div className='relative'>
                  <Button
                    variant='outline'
                    title='Import Quiz'
                    className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
                    <Upload className='h-4 w-4' /> Import JSON
                    <input
                      type='file'
                      accept='.json'
                      onChange={importQuiz}
                      className='absolute inset-0 opacity-0 cursor-pointer'
                    />
                  </Button>
                </div>
                <Button
                  title='Create New Quiz'
                  onClick={handleStartNew}
                  className='btn-primary gap-2 h-11 px-8'>
                  <Plus className='h-5 w-5' /> Create New Quiz
                </Button>
              </div>
            </div>

            {quizzes.length > 0 ?
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {quizzes.map((quiz, i) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}>
                    <Card className='card-glow h-full flex flex-col p-6 group'>
                      <div className='flex justify-between items-start mb-4 flex-wrap gap-2'>
                        <div
                          className={cn(
                            'flex items-center gap-2 text-[10px] text-pw-muted font-mono uppercase tracking-widest',
                          )}>
                          {(quiz as any).is_synced ?
                            <span
                              className='text-pw-success flex items-center gap-1.5'
                              title='Synced'>
                              <ShieldCheck className='h-3 w-3' />
                            </span>
                          : <span
                              className='text-pw-warning flex items-center gap-1.5'
                              title='Not synced'>
                              <Clock className='h-3 w-3' />
                            </span>
                          }
                          {quiz?.questions?.length} Qts
                          {quiz?.responses && quiz?.responses?.length > 0 && (
                            <span className='text-pw-primary'>
                              {(quiz as any).responses?.length || 0} Ans
                            </span>
                          )}
                          {quiz?.expires_at &&
                            (() => {
                              const { label, urgent } = quizExpiryCountdown(
                                quiz?.expires_at || '',
                              );
                              return (
                                <span
                                  title='Quiz expiry'
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border',
                                    label === 'Expired' ?
                                      'text-red-400 border-red-400/30 bg-red-400/10'
                                    : urgent ?
                                      'text-amber-400 border-amber-400/30 bg-amber-400/10'
                                    : 'text-pw-success border-pw-success/30 bg-pw-success/10',
                                  )}>
                                  <Clock className='h-2.5 w-2.5' />
                                  {label}
                                </span>
                              );
                            })()}
                        </div>

                        <div className='flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity'>
                          <Button
                            variant='ghost'
                            title='View Feedback'
                            size='icon'
                            onClick={() => {
                              // Migration: Ensure options have IDs if legacy
                              const migratedQuestions = quiz.questions.map(
                                (question: any) => {
                                  if (
                                    question.options.length > 0 &&
                                    typeof question.options[0] === 'string'
                                  ) {
                                    return {
                                      ...question,
                                      options: question.options.map(
                                        (opt: string, idx: number) => ({
                                          id: `${question.id}-opt-${idx}`,
                                          text: opt,
                                        }),
                                      ),
                                    };
                                  }
                                  return question;
                                },
                              );
                              setViewingResponses({
                                ...quiz,
                                questions: migratedQuestions,
                              });
                            }}
                            className='h-8 w-8 text-pw-muted hover:text-pw-cyan'>
                            <MessageSquare className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            title='Download as JSON'
                            size='icon'
                            onClick={() => exportQuiz(quiz)}
                            className='h-8 w-8 text-pw-muted hover:text-pw-primary'>
                            <Download className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            title='Edit'
                            onClick={() => {
                              setActiveQuiz(quiz);
                              setIsCreating(true);
                            }}
                            className='h-8 w-8 text-pw-muted hover:text-pw-primary'>
                            <Settings2 className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            title='Delete'
                            size='icon'
                            onClick={() => deleteQuiz(quiz.id)}
                            className='h-8 w-8 text-pw-muted hover:text-pw-danger'>
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                      <h3 className='text-xl font-bold font-display mb-2 group-hover:text-pw-primary transition-colors'>
                        {quiz.title}
                      </h3>
                      <p className='text-sm text-pw-muted line-clamp-2 mb-8 flex-1'>
                        {quiz.description || 'No description provided.'}
                      </p>
                      <div className='flex gap-3 flex-wrap sm:flex-nowrap'>
                        <Button
                          title='Start Assessment'
                          onClick={() => playQuiz(quiz.id)}
                          className='btn-primary flex-1 h-10 gap-2 min-w-[120px]'>
                          <Play className='h-4 w-4' /> Start
                        </Button>
                        <Button
                          variant='outline'
                          title='Share link'
                          onClick={() => {
                            const url = `${window.location.origin}/q/${quiz.id}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Short link copied to clipboard!');
                          }}
                          className='h-10 px-4 border-pw-primary/20 hover:bg-pw-primary/5 shrink-0 gap-2'>
                          <Share2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            : <div className='flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]'>
                <div className='w-20 h-20 rounded-2xl bg-pw-surface border border-white/10 flex items-center justify-center mb-6 shadow-2xl'>
                  <Puzzle className='h-10 w-10 text-pw-muted' />
                </div>
                <h3 className='text-2xl font-bold font-display mb-2'>
                  Start your first quiz
                </h3>
                <p className='text-pw-muted max-w-sm mb-10'>
                  Create interactive quizzes with multiple choice questions.
                  Save them locally or export to JSON.
                </p>
                <Button
                  onClick={handleStartNew}
                  className='btn-primary h-12 px-10 gap-2 text-base'>
                  <Plus className='h-5 w-5' /> Create New Quiz
                </Button>
              </div>
            }
          </motion.div>
        : <motion.div
            key='editor'
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className='min-w-full flex-1 flex flex-col p-0'>
            <QuizBuilder
              quiz={activeQuiz!}
              onSave={handleSaveQuiz}
              onCancel={() => {
                setIsCreating(false);
                setActiveQuiz(null);
              }}
            />
          </motion.div>
        }
      </AnimatePresence>

      <AnimatePresence>
        {viewingResponses && (
          <div className='fixed inset-0 z-50 flex items-center justify-end'>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingResponses(null)}
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className='relative h-full w-full max-w-2xl bg-pw-surface border-l border-white/10 p-8 shadow-2xl overflow-y-auto'>
              <div className='flex justify-between items-center mb-8 flex-wrap'>
                <div>
                  <h2 className='text-2xl font-bold'>
                    Feedback{' '}
                    {viewingResponses.responses &&
                      `(${viewingResponses.responses?.length})`}
                  </h2>
                  <p className='text-sm text-pw-muted'>
                    {viewingResponses.title}
                  </p>
                </div>
                <div className='flex gap-2'>
                  {viewingResponses.responses &&
                    viewingResponses.responses.length > 0 && (
                      <>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => exportResponsesAsCSV(viewingResponses)}
                          className='bg-pw-success/10 border-pw-success/20 text-pw-success hover:bg-pw-success/20 h-9'>
                          <Download
                            size={16}
                            className='mr-2'
                          />{' '}
                          Export CSV
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => clearResponses(viewingResponses.id)}
                          className='bg-pw-danger/10 border-pw-danger/20 text-pw-danger hover:bg-pw-danger/20 h-9'>
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => {
                      setViewingResponses(null);
                      setExpandedResponse(null);
                    }}>
                    <X />
                  </Button>
                </div>
              </div>

              <div className='space-y-4 pb-20'>
                {(
                  !viewingResponses.responses ||
                  viewingResponses.responses.length === 0
                ) ?
                  <div className='py-20 text-center opacity-40'>
                    <MessageSquare
                      size={40}
                      className='mx-auto mb-4'
                    />
                    <p>No responses yet.</p>
                  </div>
                : [...(viewingResponses.responses || [])]
                    .reverse()
                    .map((resp, idx) => (
                      <Card
                        key={idx}
                        className='p-4 bg-white/5 border-white/10 space-y-0.5 relative overflow-hidden'>
                        <div className='flex justify-between items-start'>
                          <div>
                            <p className='font-bold text-pw-cyan truncate max-w-[200px]'>
                              {resp.userData.name ||
                                resp.userData.email ||
                                resp.userData.pingAuthName ||
                                resp.userData.pingAuthEmail ||
                                `Taker ${idx + 1}`}
                            </p>
                            <p className='text-[10px] text-pw-muted italic'>
                              {new Date(resp.timestamp).toLocaleString()}
                            </p>
                          </div>

                          {viewingResponses.type === 'quiz' && (
                            <div className='bg-pw-primary/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-pw-primary border border-pw-primary/20 shrink-0'>
                              {resp.score} / {resp.totalQuestions}
                            </div>
                          )}
                        </div>

                        <div className='flex flex-wrap gap-x-4 gap-y-1 py-2 border-y border-white/5'>
                          {Object.entries(resp.userData).map(([key, val]) => (
                            <div
                              key={key}
                              className='flex gap-1.5 text-[11px]'>
                              <span className='text-pw-muted font-bold uppercase'>
                                {key}:
                              </span>
                              <span className='text-white'>{val}</span>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div className='flex justify-between items-center'>
                            <div className='flex gap-1 flex-wrap'>
                              {resp.answers.map((a, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    'w-5 h-5 rounded-sm flex items-center justify-center text-[7px] font-bold',
                                    a.correct === undefined ?
                                      'bg-white/10 text-white/40'
                                    : a.correct ?
                                      'bg-pw-success/20 text-pw-success'
                                    : 'bg-pw-danger/20 text-pw-danger',
                                  )}>
                                  {i + 1}
                                </div>
                              ))}
                            </div>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 text-[10px] text-pw-cyan font-bold p-0 px-2'
                              onClick={() =>
                                setExpandedResponse(
                                  expandedResponse === idx ? null : idx,
                                )
                              }>
                              {expandedResponse === idx ?
                                'HIDE'
                              : 'VIEW DETAILS'}
                            </Button>
                          </div>

                          <AnimatePresence>
                            {expandedResponse === idx && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className='overflow-hidden space-y-1 pt-2'>
                                {resp.answers.map((ans, i) => {
                                  const question =
                                    viewingResponses.questions.find(
                                      (q) => q.id === ans.questionId,
                                    );
                                  const resolvedAnswer = resolveAnswerToText(viewingResponses, ans.questionId, ans.answer)
                                  const resolvedCorrect = resolveCorrectText(
                                    viewingResponses,
                                    ans.questionId,
                                  );

                                  return (
                                    <div
                                      key={i}
                                      className='p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-0.5'>
                                      <p className='text-[10px] font-bold text-pw-muted uppercase'>
                                        Question {i + 1}
                                      </p>
                                      <p className='text-xs font-medium leading-relaxed' dangerouslySetInnerHTML={{__html:
                                        formatDetailVars(question?.text as string || '', resp.userData, true)
                                        || 'Question removed.'
                                      }} />
                                      
                                      <div className='flex items-start gap-2 pt-1'>
                                        <p className='text-[10px] font-bold text-pw-cyan shrink-0'>
                                          ANSWER:
                                        </p>
                                        <p
                                          className={cn(
                                            'text-[11px] font-mono',
                                            ans.correct === undefined ?
                                              'text-white/80'
                                              : ans.correct ? 'text-pw-success'
                                                : 'text-pw-danger',
                                          )} dangerouslySetInnerHTML={{__html: formatDetailVars(resolvedAnswer, resp.userData, false, true)}}/>
                                      </div>
                                      {viewingResponses.type === 'quiz' &&
                                        !ans.correct && (
                                          <div className='flex items-start gap-2 pt-1'>
                                            <p className='text-[10px] font-bold text-pw-cyan shrink-0'>
                                              CORRECT:
                                            </p>
                                            <p
                                              className={cn(
                                                'text-[11px] font-mono text-white/80',
                                              )} dangerouslySetInnerHTML={{__html: formatDetailVars(resolvedCorrect, resp.userData, false, true) }}
                                          />
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </Card>
                    ))
                }
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Dialog
        open={isNameModalOpen}
        onOpenChange={setIsNameModalOpen}>
        <DialogContent className='max-w-md w-full pt-5 bg-[#0c0d1c] border border-white/10 rounded-2xl shadow-2xl text-pw-text z-50 animate-fade-in'>
          <DialogHeader className='p-2'>
            <DialogTitle className='text-xl font-extrabold font-display'>
              Export Name Customization
            </DialogTitle>
            <DialogDescription className='text-pw-muted text-xs'>
              Specify the filename you want to save. Do not include extensions.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='relative'>
              <Input
                value={filenameInput}
                onChange={(e) => setFilenameInput(e.target.value)}
                placeholder='Enter filename...'
                className='card-glow bg-transparent h-11 text-sm border-white/5 focus-visible:ring-0 w-full'
              />
              <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-pw-primary font-mono uppercase'>
                .{filenameExtension}
              </span>
            </div>
          </div>

          <DialogFooter className='flex flex-col sm:flex-row gap-2'>
            <button
              onClick={() => setIsNameModalOpen(false)}
              className='flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-pw-muted hover:text-pw-text transition-all'>
              Cancel
            </button>
            <button
              onClick={handleConfirmFilename}
              className='flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold text-white transition-all'>
              Confirm &amp; Export
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
