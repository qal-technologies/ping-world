'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Folder,
  Lock,
  Image,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  MoreVertical,
  Ungroup,
  Crown,
  CloudCheck,
  BookOpen,
  Eye,
  EyeOff,
  User,
  File,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Mail,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HybridStorage } from '@/lib/storage-utils';
import Wrapper from '@/components/ui/wrapper';
import QuizSettingItem from '@/components/quiz/quiz-setting-item';
import { useAppContext } from '@/context/AppContext';
import {
  computeExpiry,
  tierAtLeast,
  PREMIUM_TIERS,
} from '@/lib/config/premium';
import { DEFAULT_PINGWORLD_SHOWCASE_QUIZ } from '@/lib/quiz/default-quiz-template';
import {
  exportResponsesToCSV,
  exportResponsesToJSON,
  exportResponsesToText,
} from '@/lib/quiz/text-parser';
import QuizLanguageModal from '@/components/quiz/QuizLanguageModal';
import { validateQuizExpiry, isQuizTemplate } from '@/lib/quiz/quiz-expiry';
import {
  resolvePipedText,
  unpackPingWorldMediaUrl,
} from '@/lib/quiz/quiz-piping';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';
import type {
  Question,
  Quiz,
  QuizOption,
  InputBranchRule,
  QuestionType,
} from '.';
import {supabase} from '@/lib/supabase';

const seedTemplateStorageKey = () =>
  `pw_quiz_template_v1`;

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

const isExpired = async (quiz: Quiz): Promise<boolean> => {
  const now = Date.now();
  if (quiz.expires_at) {
    const expiresAt = new Date(quiz.expires_at).getTime();
    const isExpired = expiresAt < now;
    return isExpired;
  } else {
    return false;
  }
};

const generateQuizId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
  });
};

const normalizeQuizRecord = (quiz: any): Quiz => ({
  ...quiz,
  id: String(quiz.id),
  title: quiz.title || 'Untitled assessment',
  description: quiz.description || '',
  type: quiz.type === 'survey' ? 'survey' : 'quiz',
  questions: Array.isArray(quiz.questions) ? quiz.questions : [],
  endScreen: quiz.endScreen || { title: 'Completed', message: 'Thank you for your response.' },
  createdAt: Number(quiz.createdAt) || (quiz.created_at ? new Date(quiz.created_at).getTime() : Date.now()),
  customUrl: quiz.custom_id || quiz.customUrl || '',
});

// --- Components ---

const QuizBuilder = ({
  quiz,
  onSave,
  onCancel,
  isSaving,
}: {
  quiz: Quiz;
  onSave: (q: Quiz) => void;
  onCancel: () => void;
  isSaving: boolean;
}) => {
  const { premiumTier, isFeatureUnlocked, user } = useAppContext();
  const [collapse, setCollapse] = useState<Record<string, boolean>>({});
  const [showBranchRules, setShowBranchRules] = useState(false);
  const [showLanguageDocs, setShowLanguageDocs] = useState(false);

  const quizUnlocked = isFeatureUnlocked('quiz');

  // Pre-process quiz to decode secured indices for editing
  const decodedQuestions = (quiz.questions || []).map((q) => {
    return { ...q, correctIndex: decodeStoredCorrectAnswer(q.correctIndex) };
  });

  const { showConfirm, showPrompt } = useAppModal();
  const [editedQuiz, setEditedQuiz] = useState<Quiz>({
    ...quiz,
    questions: decodedQuestions,
  });
  const [quizId, setQuizId] = useState<string>(editedQuiz?.customUrl || '');

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
      if (editedQuiz.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
        try {
          localStorage.setItem(
            seedTemplateStorageKey(),
            JSON.stringify(editedQuiz),
          );
        } catch {
          toast.error(
            'Could not save the local template draft on this device.',
          );
        }
      } else {
        await HybridStorage.saveQuizDraft(editedQuiz.id, editedQuiz);
      }
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timer);
  }, [editedQuiz, user?.id]);

  const addQuestion = (category?: string) => {
    if (editedQuiz.questions.length >= 10 && !quizUnlocked) {
      return toast.error(
        'Free tier accounts are capped at a maximum of 10 questions per quiz! Please upgrade to add more.',
      );
    }

    const qId = generateQuizId();
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
      maxFileSize:
        !quizUnlocked ? 5
        : premiumTier === 'pro' ? 50
        : 15,
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

  const removeQuestion = async (index: number) => {
    const proceed = await showConfirm(
      `Are you sure you want to delete this question?`,
      { cancelText: 'No', confirmText: 'Delete', type: 'danger' },
    );

    if (proceed) {
      const newQuestions = editedQuiz.questions.filter((_, i) => i !== index);
      setEditedQuiz({ ...editedQuiz, questions: newQuestions });
      setCurrentStep((step) => {
        if (newQuestions.length === 0) return -1;
        if (step === index) return Math.min(index, newQuestions.length - 1);
        if (step > index) return step - 1;
        return step;
      });
    }
  };

  const updateQuestion = (index: number, updated: Question) => {
    const newQuestions = [...(editedQuiz?.questions || [])];
    newQuestions[index] = updated;
    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
  };

  const moveQuestion = (
    index: number,
    direction: 'up' | 'down',
    catName?: string,
  ) => {
    const questions = [...editedQuiz.questions];
    const currentQ = questions[index];
    if (!currentQ) return;

    const targetCat = catName !== undefined ? catName : currentQ.category;

    if (targetCat) {
      // Find all questions in this category and their indices
      const catIndices = questions
        .map((q, idx) => (q.category === targetCat ? idx : -1))
        .filter((idx) => idx !== -1);

      const posInCat = catIndices.indexOf(index);
      if (posInCat === -1) return;

      const targetPosInCat = direction === 'up' ? posInCat - 1 : posInCat + 1;
      if (targetPosInCat < 0 || targetPosInCat >= catIndices.length) return;

      const targetIndex = catIndices[targetPosInCat];
      [questions[index], questions[targetIndex]] = [
        questions[targetIndex],
        questions[index],
      ];

      setEditedQuiz({ ...editedQuiz, questions });
      setCurrentStep(targetIndex);
    } else {
      // Uncategorized: scope movement to uncategorized questions only
      const uncatIndices = questions
        .map((q, idx) => (!q.category || q.category.trim() === '' ? idx : -1))
        .filter((idx) => idx !== -1);

      const posInUncat = uncatIndices.indexOf(index);
      if (posInUncat === -1) return;

      const targetPosInUncat =
        direction === 'up' ? posInUncat - 1 : posInUncat + 1;
      if (targetPosInUncat < 0 || targetPosInUncat >= uncatIndices.length)
        return;

      const targetIndex = uncatIndices[targetPosInUncat];
      [questions[index], questions[targetIndex]] = [
        questions[targetIndex],
        questions[index],
      ];
      setEditedQuiz({ ...editedQuiz, questions });
      setCurrentStep(targetIndex);
    }
  };

  /**
   * Move a question to the very top or bottom of its current stack
   * (categorized stack OR uncategorized stack — never crossing boundaries).
   */
  const moveToEdge = (
    index: number,
    edge: 'top' | 'bottom',
    catName?: string,
  ) => {
    const questions = [...editedQuiz.questions];
    const currentQ = questions[index];
    if (!currentQ) return;

    const targetCat = catName !== undefined ? catName : currentQ.category;

    const stackIndices = questions
      .map((q, idx) => {
        if (targetCat) return q.category === targetCat ? idx : -1;
        return !q.category || q.category.trim() === '' ? idx : -1;
      })
      .filter((idx) => idx !== -1);

    const posInStack = stackIndices.indexOf(index);
    if (posInStack === -1) return;

    const targetStackPos = edge === 'top' ? 0 : stackIndices.length - 1;
    if (posInStack === targetStackPos) return;

    // Remove from current slot and insert at target slot within the stack
    const reorderedSrcIndices = [...stackIndices];
    reorderedSrcIndices.splice(posInStack, 1);
    if (edge === 'top') {
      reorderedSrcIndices.unshift(index);
    } else {
      reorderedSrcIndices.push(index);
    }

    // Rebuild full questions array: place each source question into its new slot
    const newQuestions = [...questions];
    stackIndices.forEach((globalSlot, slotPos) => {
      newQuestions[globalSlot] = questions[reorderedSrcIndices[slotPos]];
    });

    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
    setCurrentStep(stackIndices[targetStackPos]);
  };

  const moveCategory = (catName: string, direction: 'up' | 'down') => {
    const questions = [...editedQuiz.questions];
    const activeQuestionId = questions[currentStep]?.id;
    const uniqueCats = Array.from(
      new Set(questions.map((q) => q.category).filter(Boolean)),
    ) as string[];

    const catIdx = uniqueCats.indexOf(catName);
    if (catIdx === -1) return;

    const targetCatIdx = direction === 'up' ? catIdx - 1 : catIdx + 1;
    if (targetCatIdx < 0 || targetCatIdx >= uniqueCats.length) return;

    const targetCatName = uniqueCats[targetCatIdx];

    const catQs = questions.filter((q) => q.category === catName);
    const targetQs = questions.filter((q) => q.category === targetCatName);

    // Swap in place without scattering other questions
    const reordered: Question[] = [];
    let insertedSwap = false;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.category === catName || q.category === targetCatName) {
        if (!insertedSwap) {
          if (direction === 'up') {
            reordered.push(...catQs, ...targetQs);
          } else {
            reordered.push(...targetQs, ...catQs);
          }
          insertedSwap = true;
        }
      } else {
        reordered.push(q);
      }
    }

    setEditedQuiz({ ...editedQuiz, questions: reordered });
    const newActiveIndex = reordered.findIndex((question) => question.id === activeQuestionId);
    if (newActiveIndex >= 0) setCurrentStep(newActiveIndex);
    toast.success(`Moved group "${catName}" ${direction}`);
  };

  const disband = (catName: string) => {
    // Retain exact array positions for all questions when disbanding
    const updatedQuestions = editedQuiz.questions.map((q) =>
      q.category === catName ? { ...q, category: undefined } : q,
    );
    setEditedQuiz({ ...editedQuiz, questions: updatedQuestions });
    toast.success(
      `Group "${catName}" disbanded without altering question order.`,
    );
  };

  /**
   * Add or remove a category tag on a single question.
   * When added to an existing group, pushes right after the index of the last question in that group.
   */
  const handleQuestionCategory = (
    action: 'add' | 'remove',
    questionId: string,
    newCat?: string,
  ) => {
    const cleanCat = newCat?.trim() || '';
    const currentList = [...editedQuiz.questions];
    const targetIdx = currentList.findIndex((q) => q.id === questionId);
    if (targetIdx === -1) return;

    if (action === 'remove' || !cleanCat) {
      currentList[targetIdx] = {
        ...currentList[targetIdx],
        category: undefined,
      };
      setEditedQuiz({ ...editedQuiz, questions: currentList });
      toast.success('Question removed from group');
      return;
    }

    // Adding to group: extract question and update category
    const [targetQuestion] = currentList.splice(targetIdx, 1);
    const updatedQuestion = { ...targetQuestion, category: cleanCat };

    // Find the last index of cleanCat in the remaining array
    let lastGroupIdx = -1;
    for (let i = currentList.length - 1; i >= 0; i--) {
      if (currentList[i].category === cleanCat) {
        lastGroupIdx = i;
        break;
      }
    }

    if (lastGroupIdx !== -1) {
      // Insert right after the last question of that group
      currentList.splice(lastGroupIdx + 1, 0, updatedQuestion);
      const newIndex = lastGroupIdx + 1;
      setEditedQuiz({ ...editedQuiz, questions: currentList });
      setCurrentStep(newIndex);
    } else {
      // First question in this group: restore at original position
      currentList.splice(targetIdx, 0, updatedQuestion);
      setEditedQuiz({ ...editedQuiz, questions: currentList });
    }

    toast.success(`Question added to group "${cleanCat}"`);
  };

  const handleQuestionScroll = () => {
    const wait = setTimeout(() => {
      const input = document.getElementById('question-text-input');
      const editor = document.getElementById('question-editor');

      input?.focus();
      editor?.scrollIntoView();

      clearTimeout(wait);
    }, 100);
  };

  const formatQuestionText = (tag: 'b' | 'i' | 'u' | 'mark') => {
    const textarea = document.getElementById('question-text-input') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const value = editedQuiz.questions[currentStep].text || '';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    const content = selected || 'text';
    const updatedText = `${value.slice(0, start)}${open}${content}${close}${value.slice(end)}`;
    updateQuestion(currentStep, { ...editedQuiz.questions[currentStep], text: updatedText });
    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + open.length;
      textarea.setSelectionRange(selectionStart, selectionStart + content.length);
    });
  };

  const [navWrap, setNavWrap] = useState(false);

  const QuestionButton = ({
    q,
    i,
    isCat,
    catName = '',
    length,
    idx = 0,
  }: {
    q: Question;
    i: number;
    isCat?: boolean;
    catName?: string;
    length?: number;
    idx?: number;
  }) => {
    return (
      <div
        key={q.id + idx + catName + i}
        onClick={(e) => {
          setCurrentStep(i);
          // handleQuestionScroll();
          setShowBranchRules(false);
        }}
        className={cn(
          'flex items-center justify-between p-2 px-3 pr-1 bkblur rounded-xl text-xs font-medium transition-all group border cursor-pointer',
          currentStep === i ?
            'bg-pw-primary/10 border-pw-primary text-pw-primary'
          : 'bg-pw-surface/40 border-white/5 text-pw-muted hover:border-white/10 hover:text-pw-text',
        )}>
        <span className='truncate flex-1 text-left min-w-0 '>
          {idx + 1}: {q.text || 'New Question...'}
        </span>

        <div className='ml-1 flex gap-1'>
          {/* Desktop quick move buttons */}
          <div className='hidden lg:flex items-center gap-0.5 shrink-0 mr-0.5'>
            <button
              type='button'
              title='Move Up'
              disabled={idx === 0}
              onClick={(e) => {
                e.stopPropagation();
                moveQuestion(i, 'up', isCat ? catName : undefined);
              }}
              className='p-0.5 rounded hover:bg-pw-cyan/15 text-pw-muted hover:text-pw-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
              <ArrowUp className='h-3 w-3' />
            </button>
            <button
              type='button'
              title='Move Down'
              disabled={idx + 1 === length}
              onClick={(e) => {
                e.stopPropagation();
                moveQuestion(i, 'down', isCat ? catName : undefined);
              }}
              className='p-0.5 rounded hover:bg-pw-cyan/15 text-pw-muted hover:text-pw-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
              <ArrowDown className='h-3 w-3' />
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className='p-1 hover:bg-pw-cyan/10 rounded-full'>
              <MoreVertical className='h-4 w-4' />
            </DropdownMenuTrigger>

            <DropdownMenuContent className='w-48 bg-pw-surface/90 bkblur border-white/10 p-1'>
              <DropdownMenuItem
                className='h-8 gap-1 px-2'
                onSelect={(e) => e.preventDefault()}>
                <DropdownMenu>
                  <DropdownMenuTrigger className='flex gap-1.5 items-center w-full'>
                    <Plus className='h-3.5 w-3.5 text-pw-success' />{' '}
                    <span>
                      {sidebarGroups.categories.length > 0 ?
                        'Add to Group'
                      : 'New Group'}
                    </span>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className='w-48 bg-[#0c0d1c]/80 bkblur border-white/15 p-2 shadow-2xl rounded-xl space-y-1'
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}>
                    {sidebarGroups.categories &&
                      sidebarGroups.categories
                        .filter((c) => c.name !== catName)
                        .map((cat, idx) => (
                          <DropdownMenuItem
                            key={cat.name + idx}
                            onClick={() => {
                              handleQuestionCategory('add', q.id, cat.name);
                            }}
                            className='h-7 gap-1 px-2 text-xs cursor-pointer'>
                            <Folder className='w-3.5 h-3.5 mr-1 text-pw-cyan' />{' '}
                            <span className='truncate'>{cat.name}</span>
                          </DropdownMenuItem>
                        ))}

                    <DropdownMenuItem
                      className='mt-1 border-t border-white/10 pt-2 text-xs text-pw-primary'
                      onClick={async () => {
                        const enteredName = await showPrompt(
                          'Enter a name for this question group.',
                          { title: 'Create question group', placeholder: 'e.g. Section A' },
                        );
                        if (enteredName?.trim()) {
                          handleQuestionCategory('add', q.id, enteredName.trim());
                        }
                      }}>
                      Create new group…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DropdownMenuItem>

              {isCat && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuestionCategory(
                      isCat ? 'remove' : 'add',
                      q.id,
                      catName,
                    );
                  }}
                  className={'h-8 gap-1 px-2'}>
                  <Ungroup className='h-3 w-3 text-pw-success transition-all' />{' '}
                  Ungroup
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled={idx === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  moveToEdge(i, 'top', isCat ? catName : undefined);
                }}
                className={'h-8 gap-1 px-2'}
                style={{ opacity: idx === 0 ? 0.5 : 1 }}>
                <ArrowUp className='h-3 w-3 text-pw-primary transition-all' />
                Move to Top
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={idx == 0}
                onClick={(e) => {
                  e.stopPropagation();
                  moveQuestion(i, 'up', isCat ? catName : undefined);
                }}
                className={'h-8 gap-1 px-2'}
                style={{ opacity: idx === 0 ? 0.5 : 1 }}>
                <ArrowUp className='h-3 w-3 text-pw-cyan transition-all' /> Move
                Up
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={idx + 1 === length}
                onClick={(e) => {
                  e.stopPropagation();
                  moveQuestion(i, 'down', isCat ? catName : undefined);
                }}
                className={'h-8 gap-1 px-2'}
                style={{ opacity: idx + 1 === length ? 0.5 : 1 }}>
                <ArrowDown className='h-3 w-3 text-pw-cyan transition-all' />{' '}
                Move Down
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={idx + 1 === length}
                onClick={(e) => {
                  e.stopPropagation();
                  moveToEdge(i, 'bottom', isCat ? catName : undefined);
                }}
                className={'h-8 gap-1 px-2'}
                style={{ opacity: idx + 1 === length ? 0.5 : 1 }}>
                <ArrowDown className='h-3 w-3 text-pw-primary transition-all' />
                Move to Bottom
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  removeQuestion(i);
                }}
                className={'h-8 gap-1 px-2'}>
                <Trash2 className='h-3 w-3 text-pw-danger transition-all' />{' '}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
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
              const hasExpired = await isExpired(editedQuiz);
              if (hasExpired) {
                toast.warning(
                  `This ${editedQuiz.type} has expired, adjust expiry time.`,
                );
                return;
              }
              const hasActiveBranching = editedQuiz.questions.some(
                (q) =>
                  q.skipTo ||
                  q.skipToCat ||
                  q.options.some(
                    (o) => typeof o === 'object' && (o.skipTo || o.skipToCat),
                  ),
              );
              if (
                hasActiveBranching &&
                (editedQuiz?.randomizeOptions || editedQuiz?.randomizeQuestions)
              ) {
                const confirmed = await showConfirm(
                  'Branching is active on some questions. Question randomization will be restricted to internal group shuffling to preserve valid logical paths. Still save?',
                  {
                    title: 'Branching Active',
                    confirmText: 'Save Quiz',
                    type: 'info',
                  },
                );
                if (!confirmed) return;
              }

              onSave({
                ...editedQuiz,
                isCustom: Boolean(quizId),
                customUrl: quizId,
                userId: user?.id || '',
                fromPremium: quizUnlocked,
              });
            }}
            className='btn-primary h-10 gap-2'>
            {isSaving ?
              'Saving....'
            : <>
                <Save className='h-4 w-4' /> Save Quiz
              </>
            }
          </Button>
        </div>
      </div>

      <div className='w-full grid grid-cols-1 lg:grid-cols-5 gap-8'>
        {/* Navigation Sidebar */}
        <div className='lg:col-span-2 flex flex-col gap-4'>
          <button
            onClick={() => setCurrentStep(-1)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-2xl text-sm font-medium border border-transparent transition-all group justify-between',
              currentStep === -1 ?
                'bg-pw-primary text-white shadow-lg shadow-pw-primary/20'
              : 'bg-pw-surface border-white/5 text-pw-muted hover:text-pw-text',
            )}>
            <div className='flex gap-3 items-center'>
              <Settings2 className='h-5 w-5' /> Quiz Settings
            </div>{' '}
            {editedQuiz?.questions.length > 0 && (
              <ChevronDown
                onClick={(e) => {
                  e.stopPropagation();
                  setNavWrap(!navWrap);
                }}
                className={cn(
                  'text-white w-7 h-7 p-1 hover:bg-white/10 rounded-full',
                  navWrap && 'rotate-90 bg-white/10 rounded-full',
                )}
              />
            )}
          </button>

          {!navWrap && (
            <div className='flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2 pb-3 custom-scrollbar'>
              {/* Uncategorized Questions */}
              {sidebarGroups.uncategorized.map(
                ({ question: q, index: i }, idx) => (
                  <QuestionButton
                    q={q}
                    i={i}
                    key={idx}
                    idx={idx}
                    length={sidebarGroups.uncategorized.length}
                  />
                ),
              )}

              {/* Categorized Questions grouped by Category */}
              {sidebarGroups.categories.map((cat, i) => {
                const isCollapsed = !!collapse[cat.name];

                return (
                  <div
                    key={cat.name + i}
                    className={cn(
                      'flex flex-col gap-1 mt-1',
                      !isCollapsed && ' border-l border-white/10 pl-2',
                    )}>
                    {/* Category Header */}
                    <div
                      className='flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase text-pw-primary/80 tracking-wider bg-white/5 bkblur rounded-xl cursor-pointer'
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
                        <Folder className='w-4 h-4 mx-1' /> {cat.name} (
                        {cat.questions.length})
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <MoreVertical className='p-1 rounded-xl hover:bg-white/5 text-pw-muted hover:text-pw-primary transition-all' />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          className={'w-37 bg-pw-surface/60 bkblur'}>
                          <DropdownMenuItem>
                            <div
                              title={`Add question under ${cat.name.toUpperCase()}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                addQuestion(cat.name);
                              }}
                              className='w-full flex gap-1 items-center'>
                              <Plus className='h-3.5 w-3.5 text-pw-success' />{' '}
                              Add Question
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => disband(cat.name)}
                            className='flex gap-1 items-center'>
                            <Ungroup className='h-3.5 w-3.5 text-pw-danger' />{' '}
                            Disband Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Categorized Questions List (with visual indentation) */}
                    {!isCollapsed && (
                      <div className='flex flex-col gap-1 ml-4'>
                        {cat.questions.map(({ question: q, index: i }, idx) => (
                          <QuestionButton
                            key={q.text + i + idx}
                            q={q}
                            i={i}
                            idx={idx}
                            catName={cat.name}
                            isCat={!!cat.name}
                            length={cat.questions.length}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={() => {
              addQuestion();
              navWrap && setNavWrap(false);
              handleQuestionScroll();
            }}
            variant='outline'
            className='w-full border-dashed border-white/20 hover:border-pw-primary/50 hover:bg-pw-primary/5 gap-2 h-12'>
            <Plus className='h-4 w-4' /> Add Question
          </Button>

          <Button
            variant='outline'
            onClick={() => setShowLanguageDocs(true)}
            className='w-full border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold gap-2 text-pw-cyan hover:text-white transition-all h-10'>
            <BookOpen className='h-4 w-4' /> Authoring Language & Syntax Guide
          </Button>
        </div>

        {/* Editor Area */}
        <div className='lg:col-span-3'>
          <Card className='bg-transparent p-1 sm:p-4 pb-2 ring-0 sm:ring-1 pt-6 lg:pt-9 lg:p-8 h-full sm:bkblur'>
            {currentStep === -1 ?
              <div className='space-y-2 mt-1'>
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

                <div className='divider opacity-50 my-4' />

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
                      <div className='flex p-0.5 bg-white/5 rounded-full border border-white/2'>
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
                          <p className='text-[9px] text-pw-warning ml-1 mt-1'>
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
                        maxLength={premiumTier === 'pro' ? 40 : 20}
                        onChange={(e) =>
                          setEditedQuiz({
                            ...editedQuiz,
                            title: e.target.value,
                          })
                        }
                        placeholder='e.g., General Relativity Crash Course'
                        className='bg-white/5 border-white/10 h-10 focus:border-pw-primary'
                      />
                      {premiumTier === 'pro' && (
                        <>
                          <label className='text-xs font-bold text-pw-muted uppercase mt-1'>
                            Custom URL
                          </label>

                          <Input
                            value={quizId}
                            id={'custom-quiz-input'}
                            key={'custom-quiz-input'}
                            maxLength={premiumTier === 'pro' ? 12 : 8}
                            onChange={(e) =>
                              setQuizId(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9_-]/g, '')
                                  .slice(0, 12),
                              )
                            }
                            placeholder={`my-${editedQuiz.type}-url`}
                            className='bg-white/5 border-white/10 h-9 focus:border-pw-primary mt-1'
                          />
                          <p className='text-[10px] text-pw-muted px-1 italic'>
                            Underscore, hyphens, letters and numbers only
                            allowed. No space allowed.
                          </p>
                        </>
                      )}
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
                        className='w-full h-20 lg:h-24 bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:border-pw-primary focus:outline-none resize-none'
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
                  <div className='flex flex-col gap-2.5 py-2'>
                    {editedQuiz?.askDetails &&
                      editedQuiz?.askDetails?.length > 0 &&
                      editedQuiz?.askDetails?.some((d) =>
                        d?.allowlist?.trim(),
                      ) && (
                        <div className='flex-col flex w-full mb-2 bg-white/5 p-2 rounded-xl border border-white/5'>
                          <label className='text-xs font-bold text-pw-muted uppercase'>
                            Allowlist Reject Message
                          </label>
                          <p className='text-[10px] text-pw-muted mb-1.5'>
                            Message displayed when a participant's input does
                            not match an allowlist.
                          </p>
                          <Input
                            value={editedQuiz?.allowlistMessage || ''}
                            onChange={(e) => {
                              setEditedQuiz({
                                ...editedQuiz,
                                allowlistMessage: e.target.value,
                              });
                            }}
                            className='w-full bg-black/20 h-8 text-xs'
                            placeholder='e.g. Access Denied: Entered detail is not authorized.'
                          />
                        </div>
                      )}

                    {(editedQuiz.askDetails || []).map((detail, idx) => {
                      return (
                        <div
                          key={`detail-item-${idx}`}
                          className='flex flex-col gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5'>
                          <div className='flex gap-1 items-center'>
                            <Input
                              value={detail.title}
                              onChange={(e) => {
                                const newDetails = [
                                  ...(editedQuiz.askDetails || []),
                                ];
                                newDetails[idx] = {
                                  ...newDetails[idx],
                                  title: e.target.value,
                                };
                                setEditedQuiz({
                                  ...editedQuiz,
                                  askDetails: newDetails,
                                });
                              }}
                              className='flex-1 bg-transparent focus-visible:border focus-visible:border-pw-primary/20 h-8 text-xs'
                              placeholder='Field Title (e.g. Full Name, Email...)'
                            />

                            {/* Type selector */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  title='Type of detail required'
                                  variant='ghost'
                                  size='sm'
                                  className='h-7 text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 px-2 shrink-0'>
                                  {detail.type === 'input' ?
                                    'Text'
                                  : detail.type === 'sex' ?
                                    'Gender'
                                  : detail.type === 'dob' ?
                                    'DOB'
                                  : detail.type}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className='w-45 bg-pw-surface/60 bkblur border-white/10'>
                                {[
                                  { id: 'input', label: 'TEXT INPUT' },
                                  { id: 'email', label: 'EMAIL' },
                                  { id: 'sex', label: 'GENDER (M/F)' },
                                  { id: 'dropdown', label: 'DROPDOWN' },
                                  { id: 'date', label: 'DATE' },
                                  { id: 'dob', label: 'DATE OF BIRTH' },
                                  { id: 'tel', label: 'PHONE (TEL)' },
                                  { id: 'number', label: 'NUMBER' },
                                ].map((t, i) => (
                                  <DropdownMenuItem
                                    key={t.id + i + t.label}
                                    onClick={() => {
                                      const newDetails = [
                                        ...(editedQuiz.askDetails || []),
                                      ];
                                      newDetails[idx] = {
                                        ...newDetails[idx],
                                        type: t.id as any,
                                      };
                                      setEditedQuiz({
                                        ...editedQuiz,
                                        askDetails: newDetails,
                                      });
                                    }}
                                    className='h-6 px-2.5 text-xs font-semibold cursor-pointer'>
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* More Menu for THIS specific detail */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                className='items-center'>
                                <div
                                  title='Detail Configuration'
                                  className='hover:bg-white/10 h-full p-1 rounded-xl text-pw-muted hover:text-white shrink-0'>
                                  <MoreVertical size={14} />
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align='end'
                                className='w-64 p-2 bg-[#0c0d1c]/60 bkblur border border-white/15 shadow-2xl rounded-xl space-y-2 z-50'
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}>
                                <p className='text-[10px] font-bold uppercase tracking-wider text-pw-muted border-b border-white/5 pb-1'>
                                  {detail.title || 'Detail'} Settings
                                </p>

                                {/* Allowlist */}
                                <div className='space-y-1'>
                                  <label className='text-[10px] font-semibold text-white'>
                                    Allowlist (Exact Matches)
                                  </label>
                                  <Input
                                    placeholder='e.g. Alice, Bob, Charlie'
                                    value={detail.allowlist || ''}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const newDetails = [
                                        ...(editedQuiz.askDetails || []),
                                      ];
                                      newDetails[idx] = {
                                        ...newDetails[idx],
                                        allowlist: e.target.value,
                                      };
                                      setEditedQuiz({
                                        ...editedQuiz,
                                        askDetails: newDetails,
                                      });
                                    }}
                                    className='h-7 text-[10px] bg-black/40 border-white/10 font-mono'
                                  />
                                  <p className='text-[9px] text-pw-muted mt-[-2px]'>
                                    Comma-separated values required to take
                                    quiz.
                                  </p>
                                </div>

                                {/* Restricted / Prohibited Keywords */}
                                {/* <div className='space-y-1 pt-1 border-t border-white/5'>
                                  <label className='text-[10px] font-semibold text-white'>
                                    Restricted Keywords
                                  </label>
                                  <Input
                                    placeholder='spam, test, bot, admin'
                                    value={detail.restrictedKeywords || ''}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const newDetails = [
                                        ...(editedQuiz.askDetails || []),
                                      ];
                                      newDetails[idx] = {
                                        ...newDetails[idx],
                                        restrictedKeywords: e.target.value,
                                      };
                                      setEditedQuiz({
                                        ...editedQuiz,
                                        askDetails: newDetails,
                                      });
                                    }}
                                    className='h-7 text-[10px] bg-black/40 border-white/10 font-mono'
                                  />
                                  <p className='text-[9px] text-pw-muted mt-[-2px]'>
                                    Comma-separated keywords prohibited from submission.
                                  </p>
                                </div> */}

                                {/* Options list for Dropdown type */}
                                {detail.type === 'dropdown' && (
                                  <div className='space-y-1 pt-1 border-t border-white/5'>
                                    <label className='text-[10px] font-semibold text-white'>
                                      Options List
                                    </label>
                                    <Input
                                      placeholder='Option A, Option B, Option C'
                                      value={detail.options?.join(', ') || ''}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const newDetails = [
                                          ...(editedQuiz.askDetails || []),
                                        ];
                                        newDetails[idx] = {
                                          ...newDetails[idx],
                                          options: e.target.value.split(', '),
                                        };
                                        setEditedQuiz({
                                          ...editedQuiz,
                                          askDetails: newDetails,
                                        });
                                      }}
                                      className='h-7 text-[10px] bg-black/40 border-white/10'
                                    />
                                    <p className='text-[8px] text-pw-muted italic'>
                                      Comma-separated options.
                                    </p>
                                  </div>
                                )}

                                {/* Min/Max for input/number/tel */}
                                {(detail.type === 'input' ||
                                  detail.type === 'number' ||
                                  detail.type === 'tel') && (
                                  <div className='grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5'>
                                    <div>
                                      <label className='text-[9px] text-pw-muted'>
                                        Min length
                                      </label>
                                      <Input
                                        type='number'
                                        placeholder='Min'
                                        value={detail.minLength ?? ''}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const newDetails = [
                                            ...(editedQuiz.askDetails || []),
                                          ];
                                          newDetails[idx] = {
                                            ...newDetails[idx],
                                            minLength:
                                              e.target.value ?
                                                parseInt(e.target.value)
                                              : undefined,
                                          };
                                          setEditedQuiz({
                                            ...editedQuiz,
                                            askDetails: newDetails,
                                          });
                                        }}
                                        className='h-7 text-[10px] bg-black/40 border-white/10'
                                      />
                                    </div>
                                    <div>
                                      <label className='text-[9px] text-pw-muted'>
                                        Max length
                                      </label>
                                      <Input
                                        type='number'
                                        placeholder='Max'
                                        value={detail.maxLength ?? ''}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const newDetails = [
                                            ...(editedQuiz.askDetails || []),
                                          ];
                                          newDetails[idx] = {
                                            ...newDetails[idx],
                                            maxLength:
                                              e.target.value ?
                                                parseInt(e.target.value)
                                              : undefined,
                                          };
                                          setEditedQuiz({
                                            ...editedQuiz,
                                            askDetails: newDetails,
                                          });
                                        }}
                                        className='h-7 text-[10px] bg-black/40 border-white/10'
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className='pt-1.5 border-t border-white/5'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => {
                                      const newDetails = (
                                        editedQuiz.askDetails || []
                                      ).filter((_, i) => i !== idx);
                                      setEditedQuiz({
                                        ...editedQuiz,
                                        askDetails: newDetails,
                                      });
                                      toast.success('Detail removed');
                                    }}
                                    className='h-7 px-2 text-[10px] text-pw-danger hover:bg-pw-danger/10 hover:text-pw-danger w-full justify-start gap-1.5'>
                                    <Trash2 size={12} /> Delete detail
                                  </Button>
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Detail badges */}
                          <div
                            className={cn(
                              (
                                detail.allowlist ||
                                  detail.restrictedKeywords ||
                                  detail.type === 'dropdown' ||
                                  detail.minLength ||
                                  detail.maxLength
                              ) ?
                                'flex items-center text-[9px] text-pw-muted flex-wrap gap-2 px-1 '
                              : 'hidden p-0',
                            )}>
                            {detail.allowlist && (
                              <span className='text-pw-primary flex items-center gap-1 font-mono'>
                                <CheckCircle size={10} /> Allowlist Active
                              </span>
                            )}
                            {detail.restrictedKeywords && (
                              <span className='text-pw-danger flex items-center gap-1 font-mono'>
                                <CheckCircle
                                  size={10}
                                  className='rotate-45'
                                />{' '}
                                Restricted words
                              </span>
                            )}
                            {detail.type === 'dropdown' &&
                              detail.options &&
                              detail.options.length > 0 && (
                                <span>{detail.options.length} options</span>
                              )}
                            {(detail.minLength || detail.maxLength) && (
                              <span>
                                Length: {detail.minLength || 0}-
                                {detail.maxLength || '∞'}
                              </span>
                            )}
                          </div>
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
                      className='h-9 w-full border-dashed border-white/20 gap-2 text-xs opacity-70 hover:opacity-100 mt-1'>
                      <Plus size={14} /> Add detail
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
                          label='Show Category Tag'
                          description='Displays the category badge above question headers for quiz takers.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                category: {
                                  ...editedQuiz?.category,
                                  show: !editedQuiz?.category?.show,
                                },
                              })
                            }
                            className={cn(
                              'h-6 min-w-[80px] gap-2',
                              editedQuiz?.category?.show ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {editedQuiz.category?.show ?
                              <Check className='h-3 w-3' />
                            : <X className='h-3 w-3' />}
                            {editedQuiz.category?.show ? 'ON' : 'OFF'}
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
                                !editedQuiz.category?.inPerformance
                              ) {
                                toast.error(
                                  `To show category breakdown, go to 'Results & Review' and turn on (Show Performance Stats)`,
                                );
                                return null;
                              }

                              setEditedQuiz({
                                ...editedQuiz,
                                category: {
                                  ...editedQuiz?.category,
                                  inPerformance:
                                    !editedQuiz.category?.inPerformance,
                                },
                              });
                            }}
                            className={cn(
                              'h-6 min-w-[80px] gap-2',
                              (
                                editedQuiz.endScreen.showPerformance &&
                                  editedQuiz.category?.inPerformance
                              ) ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {(
                              editedQuiz.endScreen.showPerformance &&
                              editedQuiz.category?.inPerformance
                            ) ?
                              <Check className='h-3 w-3' />
                            : <X className='h-3 w-3' />}
                            {(
                              editedQuiz.endScreen.showPerformance &&
                              editedQuiz.category?.inPerformance
                            ) ?
                              'ON'
                            : 'OFF'}
                          </Button>
                        </QuizSettingItem>

                        <QuizSettingItem
                          label='Correct Option'
                          description='Display mark for correct options and their explanation either in the question or in the result section.'>
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button
                                variant='outline'
                                className='h-10 w-full justify-between bg-white/5 border-white/10 text-xs text-pw-text px-4 rounded-xl'>
                                {editedQuiz?.correctOption ? capFirst(editedQuiz?.correctOptionDes?.toString()?.replace('-', ' ') || '') : 'Disabled' }
                                <ChevronDown className='h-4 w-4 opacity-50' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='bg-pw-surface/70 bkblur border-white/10 w-56 rounded-2xl'>
                              {[
                                { title: 'In Question', id: 'in-question' },
                                { title: 'In Result', id: 'in-result' },
                                { title: 'Disable', id: 'disable' },
                              ].map(({ title, id }, i) => {
                               
                                return (
                                  <DropdownMenuItem
                                    key={`option-explanation-${id}` + i}
                                    disabled={
                                      editedQuiz.correctOptionDes === id
                                    }
                                    onClick={() => {
                                      if (id !== 'disable') {
                                        setEditedQuiz({
                                          ...editedQuiz,
                                          correctOption: true,
                                          correctOptionDes:
                                            id as typeof editedQuiz.correctOptionDes,
                                        });
                                      } else {
                                        setEditedQuiz({
                                          ...editedQuiz,
                                          correctOption: false,
                                          correctOptionDes: undefined,
                                        });
                                      }
                                    }}
                                    className={cn(
                                      'h-10 text-xs rounded-xl flex items-center justify-between cursor-pointer px-4',
                                      editedQuiz.correctOptionDes === id &&
                                        'opacity-40 grayscale pointer-events-none',
                                    )}>
                                    <p>
                                      {title}
                                    </p>
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                          description={`Auto-submits when time expires. ${
                            editedQuiz.timer?.timerUnit === 'seconds' ?
                              'Set in seconds (min 30s).'
                            : editedQuiz.timer?.timerUnit === 'hours' ?
                              'Set in hours. Pro plan required for hours.'
                            : 'Set in minutes.'
                          }`}>
                          <div className='flex gap-2 items-center flex-wrap'>
                            <Input
                              type='number'
                              value={
                                typeof editedQuiz.timer?.hasTimer === 'number' ?
                                  editedQuiz.timer?.hasTimer
                                : ''
                              }
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  timer: {
                                    ...editedQuiz?.timer,
                                    hasTimer:
                                      e.target.value ?
                                        parseInt(e.target.value)
                                      : false,
                                  },
                                })
                              }
                              placeholder={
                                editedQuiz.timer?.timerUnit === 'seconds' ?
                                  'Sec'
                                : editedQuiz.timer?.timerUnit === 'hours' ?
                                  'Hrs'
                                : 'Min'
                              }
                              className='h-8 w-16 bg-white/5 border-white/10 text-center text-xs'
                            />
                            {/* Unit selector */}
                            <div className='flex gap-1'>
                              {(['seconds', 'minutes', 'hours'] as const).map(
                                (unit, i) => {
                                  const needsPro = unit === 'hours';
                                  const isEligible =
                                    !needsPro ||
                                    tierAtLeast(premiumTier, 'pro');
                                  return (
                                    <button
                                      key={unit + i}
                                      type='button'
                                      disabled={!isEligible}
                                      onClick={() => {
                                        if (!isEligible) {
                                          toast.info(
                                            'Hours timer requires Pro plan.',
                                          );
                                          return;
                                        }
                                        setEditedQuiz({
                                          ...editedQuiz,
                                          timer: {
                                            ...editedQuiz?.timer,
                                            timerUnit: unit,
                                          },
                                        });
                                      }}
                                      className={cn(
                                        'h-8 px-2.5 rounded-lg text-[10px] font-bold border transition-all',
                                        (
                                          (editedQuiz.timer?.timerUnit ??
                                            'minutes') === unit
                                        ) ?
                                          'bg-pw-primary/10 border-pw-primary text-pw-primary'
                                        : 'bg-white/5 border-white/10 text-pw-muted hover:bg-white/10',
                                        !isEligible &&
                                          'opacity-40 cursor-not-allowed',
                                      )}>
                                      {unit === 'seconds' ?
                                        'sec'
                                      : unit === 'minutes' ?
                                        'min'
                                      : 'hr'}
                                      {needsPro && !isEligible && (
                                        <Lock className='inline ml-0.5 h-2.5 w-2.5' />
                                      )}
                                    </button>
                                  );
                                },
                              )}
                            </div>
                            {editedQuiz.timer?.hasTimer && (
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() =>
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    timer: {
                                      ...editedQuiz?.timer,
                                      hasTimer: false,
                                    },
                                  })
                                }
                                className='h-8 w-8 text-pw-muted opacity-50 hover:opacity-100'>
                                <X size={14} />
                              </Button>
                            )}
                          </div>
                        </QuizSettingItem>

                        {quiz.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id &&
                          <QuizSettingItem
                            label='Active Lifespan (Expiry)'
                            description={`Select how long this assessment remains active. ${premiumTier === 'free' ? 'Free tier max is 2 days.' : `You are in ${premiumTier} plan.`}`}>
                            <div className='flex flex-col gap-2 w-full'>
                              {editedQuiz.isExpiryLocked ?
                                <div className='flex items-center gap-2 p-2 rounded-xl bg-pw-warning/8 border border-pw-warning/30'>
                                  <Lock className='h-4 w-4 text-pw-warning shrink-0' />
                                  <div>
                                    <p className='text-xs font-bold text-pw-warning'>
                                      Expiry setter locked
                                    </p>
                                    <p className='text-[10px] text-pw-muted'>
                                      Maximum 3 expiry changes reached. Upgrade
                                      your plan to extend.
                                    </p>
                                  </div>
                                </div>
                                : <DropdownMenu>
                                  <DropdownMenuTrigger>
                                    <Button
                                      variant='outline'
                                      className='h-10 w-full justify-between bg-white/5 border-white/10 text-xs text-pw-text px-4 rounded-xl'>
                                      <span>
                                        {(() => {
                                          let currentDays = 2; // Default
                                          if(editedQuiz.expires_at) {
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
                                  <DropdownMenuContent className='bg-pw-surface/70 bkblur border-white/10 w-56 rounded-2xl'>
                                    {[
                                      {days: 1, tier: 'free'},
                                      {days: 2, tier: 'free'},
                                      {days: 3, tier: 'flexible'},
                                      {days: 5, tier: 'flexible'},
                                      {days: 7, tier: 'flexible'},
                                      {days: 14, tier: 'standard'},
                                      {days: 30, tier: 'pro'},
                                    ].map(({days, tier}, i) => {
                                      const tier4Flex =
                                        quizUnlocked ? 'flexible' : 'free';

                                      const tier2use =
                                        tier === 'flexible' ? tier4Flex : tier;

                                      const isEligible = tierAtLeast(
                                        premiumTier,
                                        tier2use as any,
                                      );
                                      return (
                                        <DropdownMenuItem
                                          key={`exp-select-${days}` + i}
                                          disabled={!isEligible}
                                          onClick={() => {
                                            if(isEligible) {
                                              const newExpiry = computeExpiry(
                                                premiumTier,
                                                days,
                                              );
                                              const oldExpiry = [
                                                ...(editedQuiz.expiryHistory ||
                                                  []),
                                              ];

                                              setEditedQuiz({
                                                ...editedQuiz,
                                                expires_at:
                                                  newExpiry.toISOString(),
                                                expiryHistory: [
                                                  ...oldExpiry,
                                                  newExpiry.toISOString(),
                                                ],
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
                              }

                              <p className='text-[10px] text-pw-muted pl-1'>
                                {!editedQuiz.isExpiryLocked &&
                                  (editedQuiz.expires_at ?
                                    <>
                                      Expires:{' '}
                                      <span className='text-pw-primary font-bold'>
                                        {new Date(
                                          editedQuiz.expires_at,
                                        ).toLocaleDateString()}
                                      </span>
                                      {(editedQuiz.expiryHistory?.length ?? 0) >
                                        0 && (
                                          <span className='ml-1 text-pw-warning'>
                                            {' '}
                                            ({editedQuiz.expiryHistory!.length}/3
                                            changes used
                                            {editedQuiz.expiryHistory!.length >= 2 ?
                                              ' - 1 change remaining!'
                                              : ''}
                                            )
                                          </span>
                                        )}
                                    </>
                                    : <>Default lifespan is 2 days</>)}
                                <span className='block mt-0.5 text-pw-error/70'>
                                  ⚠ Expired quizzes are auto-deleted after 48
                                  hours.
                                </span>
                              </p>
                            </div>
                          </QuizSettingItem>
                        }
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
                          premium={!quizUnlocked}
                          label='Allow Pass'
                          description={`Let takers skip questions without answering.`}>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                allowPass: !editedQuiz.allowPass,
                              })
                            }
                            className={cn(
                              'h-6 min-w-[100px] gap-2 font-black tracking-tighter',
                              editedQuiz.allowPass ?
                                'bg-pw-cyan/10 border-pw-cyan/80 text-pw-cyan'
                              : 'bg-white/5 border-white/10 text-pw-muted',
                            )}>
                            {editedQuiz.allowPass ? 'ALLOWED' : 'DISABLED'}
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
                        {editedQuiz.questions.some(
                          (q) =>
                            q.skipTo ||
                            q.skipToCat ||
                            q.options.some(
                              (o) =>
                                typeof o === 'object' &&
                                (o.skipTo || o.skipToCat),
                            ),
                        ) &&
                          editedQuiz.randomizeOptions && (
                            <div className='flex gap-2 items-center px-1'>
                              <AlertTriangle className='h-4 w-4 shrink-0' />
                              <span className='text-pw-warning text-[10px] mb-2'>
                                Branching Active: Question order randomization
                                is restricted to internal category shuffling to
                                maintain valid logical branching paths.
                              </span>
                            </div>
                          )}
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
                                category: {
                                  ...editedQuiz.category,
                                  inPerformance:
                                    editedQuiz.endScreen.showPerformance ?
                                      false
                                    : editedQuiz.category?.inPerformance,
                                },
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
                              placeholder='Enter custom completion message... Supports extended length text, instructions, and next steps.'
                              className='w-full h-36 bg-white/5 border border-white/10 rounded-xl p-3 text-xs resize-y focus:outline-none focus:border-pw-primary/30'
                            />
                            <p className='text-[10px] text-pw-muted/60 pl-1'>
                              Supports piping tags: @name, @score, @total,
                              @percentage. Supports long-form messages.
                            </p>
                          </div>
                        </div>

                        {/* Completion Icon */}
                        <QuizSettingItem
                          label='Completion Icon'
                          description='Icon shown on the end screen.'>
                          <div className='flex gap-1 flex-wrap'>
                            {(
                              ['check', 'diamond', 'badge', 'trophy'] as const
                            ).map((icon) => (
                              <button
                                key={icon}
                                type='button'
                                onClick={() =>
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    endScreen: {
                                      ...editedQuiz.endScreen,
                                      completionIcon: icon,
                                    },
                                  })
                                }
                                className={cn(
                                  'h-7 px-2.5 rounded-lg text-[10px] font-bold border capitalize transition-all',
                                  (
                                    (editedQuiz.endScreen.completionIcon ||
                                      'check') === icon
                                  ) ?
                                    'bg-pw-success/15 border-pw-success text-pw-success'
                                  : 'bg-white/5 border-white/10 text-pw-muted hover:border-white/30',
                                )}>
                                {icon}
                              </button>
                            ))}
                          </div>
                        </QuizSettingItem>

                        {/* Text Alignment */}
                        <QuizSettingItem
                          label='Text Alignment'
                          description='Alignment of end screen title and message.'>
                          <div className='flex gap-1'>
                            {(['left', 'center', 'right'] as const).map(
                              (align) => (
                                <button
                                  key={align}
                                  type='button'
                                  onClick={() =>
                                    setEditedQuiz({
                                      ...editedQuiz,
                                      endScreen: {
                                        ...editedQuiz.endScreen,
                                        textAlign: align,
                                      },
                                    })
                                  }
                                  className={cn(
                                    'h-7 px-3 rounded-lg text-[10px] font-bold border capitalize transition-all',
                                    (
                                      (editedQuiz.endScreen.textAlign ||
                                        'center') === align
                                    ) ?
                                      'bg-pw-primary/15 border-pw-primary text-pw-primary'
                                    : 'bg-white/5 border-white/10 text-pw-muted hover:border-white/30',
                                  )}>
                                  {align}
                                </button>
                              ),
                            )}
                          </div>
                        </QuizSettingItem>

                        {/* Confetti */}
                        <QuizSettingItem
                          label='Confetti on Completion'
                          description='Trigger a confetti burst when the taker finishes.'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                endScreen: {
                                  ...editedQuiz.endScreen,
                                  enableConfetti:
                                    !editedQuiz.endScreen.enableConfetti,
                                },
                              })
                            }
                            className={cn(
                              'h-6 min-w-[80px]',
                              editedQuiz.endScreen.enableConfetti ?
                                'bg-pw-warning/10 border-pw-warning text-pw-warning'
                              : 'bg-white/5 border-white/10',
                            )}>
                            {editedQuiz.endScreen.enableConfetti ?
                              '🎉 ON'
                            : 'OFF'}
                          </Button>
                        </QuizSettingItem>

                        {editedQuiz.endScreen.enableConfetti && (
                          <QuizSettingItem
                            label='Confetti Style'
                            description='Choose the visual style of the confetti burst.'>
                            <div className='flex gap-1 flex-wrap'>
                              {(
                                [
                                  'standard',
                                  'fireworks',
                                  'stars',
                                  'ribbons',
                                ] as const
                              ).map((style) => (
                                <button
                                  key={style}
                                  type='button'
                                  onClick={() =>
                                    setEditedQuiz({
                                      ...editedQuiz,
                                      endScreen: {
                                        ...editedQuiz.endScreen,
                                        confettiType: style,
                                      },
                                    })
                                  }
                                  className={cn(
                                    'h-7 px-2.5 rounded-lg text-[10px] font-bold border capitalize transition-all',
                                    (
                                      (editedQuiz.endScreen.confettiType ||
                                        'standard') === style
                                    ) ?
                                      'bg-pw-warning/15 border-pw-warning text-pw-warning'
                                    : 'bg-white/5 border-white/10 text-pw-muted hover:border-white/30',
                                  )}>
                                  {style}
                                </button>
                              ))}
                            </div>
                          </QuizSettingItem>
                        )}
                      </div>
                    </Wrapper>

                    <Wrapper
                      title='Disclaimer & Legal'
                      description='Customize assessment introduction notice and legal disclaimers'
                      icon={<AlertTriangle className='h-4 w-4' />}
                      premium={!quizUnlocked}
                      color='warning'>
                      <div className='flex flex-col gap-3 px-2'>
                        <div className='space-y-0.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase mb-1'>
                            Introduction Screen Notice
                          </label>
                          <textarea
                            value={editedQuiz.disclaimer || ''}
                            onChange={(e) =>
                              setEditedQuiz({
                                ...editedQuiz,
                                disclaimer: e.target.value,
                              })
                            }
                            placeholder='e.g. Notice: This assessment is for educational and evaluation purposes.'
                            className='w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-xs resize-none focus:outline-none focus:border-pw-primary/30'
                          />
                          <p className='text-[10px] text-pw-muted'>
                            This notice will be displayed to participants on the
                            assessment introduction screen.
                          </p>
                        </div>

                        {/* Custom Legal Disclaimer (Pro) */}
                        {premiumTier === 'pro' && (
                          <>
                            <div className='space-y-0.5 pt-2 border-t border-white/5'>
                              <label className='text-[10px] font-bold text-pw-muted uppercase mb-1'>
                                Custom Platform Disclaimer (Pro)
                              </label>
                              <textarea
                                value={editedQuiz.customDisclaimer || ''}
                                onChange={(e) =>
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    customDisclaimer: e.target.value,
                                  })
                                }
                                placeholder='e.g. Acme Corp Assessment Terms: Responses are recorded securely according to corporate policy.'
                                className='w-full h-16 bg-white/5 border border-white/10 rounded-xl p-3 text-xs resize-none focus:outline-none focus:border-pw-primary/30'
                              />
                              <p className='text-[10px] text-pw-muted'>
                                Custom disclaimer replacing or supplementing the
                                default platform footer. Supports @piping tags.
                              </p>
                            </div>

                            {/* Hide PingWorld Platform Disclaimer Toggle */}
                            <QuizSettingItem
                              label='Hide PingWorld Footer Notice'
                              description='Remove the default service provider disclaimer badge on intro and finish screens.'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    hidePingWorldDisclaimer:
                                      !editedQuiz.hidePingWorldDisclaimer,
                                  })
                                }
                                className={cn(
                                  'h-6 min-w-[80px] gap-2',
                                  editedQuiz.hidePingWorldDisclaimer ?
                                    'bg-pw-warning/10 border-pw-warning text-pw-warning'
                                  : 'bg-white/5 border-white/10',
                                )}>
                                {editedQuiz.hidePingWorldDisclaimer ?
                                  'HIDDEN'
                                : 'SHOWN'}
                              </Button>
                            </QuizSettingItem>
                          </>
                        )}
                      </div>
                    </Wrapper>

                    <Wrapper
                      title='Branding & Visual Effects'
                      description='Customize background image, logo, shade colors, opacity and blur'
                      icon={<Image className='h-4 w-4 text-pw-primary' />}
                      premium={!quizUnlocked}
                      color='primary'>
                      <div className='flex flex-col gap-3 pt-2'>
                        <div className='grid grid-cols-2 gap-2 px-1 pb-1'>
                          <div className='space-y-0.5'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase'>
                              Background Image
                            </label>
                            <Input
                              type='file'
                              accept='image/*'
                              id='brand-image-input'
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
                              className='hidden'
                            />
                            <div
                              onClick={() =>
                                document
                                  .getElementById('brand-image-input')
                                  ?.click()
                              }
                              className={cn(
                                'border border-pw-primary/60 rounded-xl h-24 items-center flex justify-center cursor-pointer flex-col',
                                !editedQuiz?.branding?.image &&
                                  'p-1 border-dashed border-pw-primary/60 hover:bg-pw-primary/5 gap-1',
                              )}>
                              {editedQuiz?.branding?.image ?
                                <img
                                  src={editedQuiz?.branding?.image || ''}
                                  className='max-w-full max-h-full rounded object-contain'
                                />
                              : <>
                                  <Upload className='text-pw-primary w-5 h-5' />
                                  <p className='text-[9px] text-pw-muted text-center'>
                                    Upload brand image
                                  </p>
                                </>
                              }
                            </div>
                          </div>

                          <div className='space-y-0.5'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase'>
                              Brand Icon / Logo
                            </label>
                            <Input
                              type='file'
                              id='brand-icon-input'
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
                              className='hidden'
                            />

                            <div
                              onClick={() =>
                                document
                                  .getElementById('brand-icon-input')
                                  ?.click()
                              }
                              className={cn(
                                'border border-pw-primary/60 rounded-xl h-24 items-center flex justify-center cursor-pointer flex-col',
                                !editedQuiz?.branding?.icon &&
                                  'p-1 border-dashed border-pw-primary/60 hover:bg-pw-primary/5 gap-1',
                              )}>
                              {editedQuiz?.branding?.icon ?
                                <img
                                  src={editedQuiz?.branding?.icon || ''}
                                  className='max-w-full max-h-full rounded object-contain'
                                />
                              : <>
                                  <Upload className='text-pw-primary w-5 h-5' />
                                  <p className='text-[9px] text-pw-muted text-center'>
                                    Upload brand icon
                                  </p>
                                </>
                              }
                            </div>
                          </div>
                        </div>

                        {/* Shade Color, Opacity & Blur Controls */}
                        <div className='space-y-3 pt-2 border-t border-white/5'>
                          <div className='flex items-center justify-between'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase'>
                              Branding Shade Accent Color
                            </label>
                            <input
                              type='color'
                              value={
                                editedQuiz.branding?.shadeColor || '#3B82F6'
                              }
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  branding: {
                                    ...(editedQuiz.branding || {}),
                                    shadeColor: e.target.value,
                                  },
                                })
                              }
                              className='w-7 h-7 rounded-lg bg-transparent border border-white/10 cursor-pointer'
                            />
                          </div>

                          <div className='grid grid-cols-2 gap-3'>
                            <div className='space-y-1'>
                              <div className='flex justify-between text-[10px] text-pw-muted font-bold'>
                                <span>Opacity</span>
                                <span>
                                  {Math.round(
                                    (editedQuiz.branding?.opacity ?? 0.15) *
                                      100,
                                  )}
                                  %
                                </span>
                              </div>
                              <input
                                type='range'
                                min='0'
                                max='1'
                                step='0.05'
                                value={editedQuiz.branding?.opacity ?? 0.15}
                                onChange={(e) =>
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    branding: {
                                      ...(editedQuiz.branding || {}),
                                      opacity: parseFloat(e.target.value),
                                    },
                                  })
                                }
                                className='w-full accent-pw-primary cursor-pointer'
                              />
                            </div>

                            <div className='space-y-1'>
                              <div className='flex justify-between text-[10px] text-pw-muted font-bold'>
                                <span>Blur Radius</span>
                                <span>{editedQuiz.branding?.blur ?? 2}px</span>
                              </div>
                              <input
                                type='range'
                                min='0'
                                max='20'
                                step='1'
                                value={editedQuiz.branding?.blur ?? 2}
                                onChange={(e) =>
                                  setEditedQuiz({
                                    ...editedQuiz,
                                    branding: {
                                      ...(editedQuiz.branding || {}),
                                      blur: parseInt(e.target.value, 10),
                                    },
                                  })
                                }
                                className='w-full accent-pw-primary cursor-pointer'
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Wrapper>
                  </>
                )}
              </div>
            : <div
                className='space-y-8'
                id='question-editor'>
                <div className='flex items-center justify-between flex-wrap'>
                  <h3 className='text-xl font-bold'>
                    {(() => {
                      const q = editedQuiz?.questions[currentStep];
                      if (!q) return `Question ${currentStep + 1}`;
                      const targetCat = q.category?.trim() || '';
                      const inStack = editedQuiz.questions.filter(
                        (item) => (item.category?.trim() || '') === targetCat,
                      );
                      const posInStack = inStack.findIndex(
                        (item) => item.id === q.id,
                      );
                      const stackPos =
                        posInStack !== -1 ? posInStack + 1 : currentStep + 1;
                      return q.category ?
                          `Question ${stackPos} (${q.category})`
                        : `Question ${stackPos}`;
                    })()}
                  </h3>
                  <div className='flex gap-2 flex-wrap'>
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

                    <div className='w-[1px] h-9 bg-white/5 mx-2' />

                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant='outline'
                          title='Change question type'
                          className='h-9 gap-2 text-xs bg-white/5 border-white/10 text-left flex justify-between items-center'>
                          {editedQuiz.questions[currentStep].type
                            .replace('_', ' ')
                            .toUpperCase()}{' '}
                          <ChevronDown className='h-3 w-3' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='bg-pw-surface/70 bkblur border-white/10 w-48'>
                        {(
                          [
                            'multiple_choice',
                            'true_false',
                            'dropdown',
                            'checkbox',
                            'input',
                            'upload',
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
                          variant='ghost'
                          title='Question Settings'
                          className='bg-transparent h-9 gap-2 text-xs sm:bg-white/5 sm:border sm:border-white/10'>
                          <MoreVertical className='h-3 w-3' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='bg-pw-surface/70 bkblur border-white/10 w-56 p-3 space-y-1'>
                        {/* Human-readable ID badge */}
                        <div className='px-2 py-1 mb-1.5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between'>
                          <span className='text-[9px] text-pw-muted font-mono uppercase'>
                            ID
                          </span>
                          <span className='text-[10px] text-pw-primary font-mono font-bold truncate max-w-[140px]'>
                            {editedQuiz.questions[currentStep].id}
                          </span>
                        </div>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(
                              currentStep,
                              'up',
                              editedQuiz.questions[currentStep].category,
                            );
                          }}
                          className='h-7 gap-1.5 px-2 text-xs'>
                          <ArrowUp className='h-3 w-3 text-pw-cyan transition-all' />{' '}
                          Move Up
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(
                              currentStep,
                              'down',
                              editedQuiz.questions[currentStep].category,
                            );
                          }}
                          className='h-7 gap-1.5 px-2 text-xs'>
                          <ArrowDown className='h-3 w-3 text-pw-cyan transition-all' />{' '}
                          Move Down
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className='bg-white/10 my-1' />

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQuestion(currentStep);
                          }}
                          className='h-7 gap-1.5 px-2 text-xs text-pw-danger hover:text-pw-danger'>
                          <Trash2 className='h-3 w-3 text-pw-danger' /> Delete
                          Question
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className='bg-white/10 my-1' />

                        <div className='w-full mt-2'>
                          <p className='uppercase text-xs font-bold mb-1 text-white'>
                            Assessory:
                          </p>

                          <DropdownMenu>
                            <DropdownMenuTrigger className='w-full'>
                              <Button
                                variant='outline'
                                title='Add accessory'
                                className='h-9 gap-2 text-[10px] bg-white/5 border-white/10 uppercase font-bold tracking-widest w-full text-left flex justify-between items-center'>
                                {editedQuiz.questions[currentStep].accessory ||
                                  'No Accessory'}{' '}
                                <ChevronDown className='h-3 w-3' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='bg-pw-surface/70 bkblur border-white/10 w-48'>
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

                          {editedQuiz.questions[currentStep].accessory ===
                            'note' && (
                            <Input
                              placeholder='Add your note/formula here...'
                              onKeyDown={(e) => e.stopPropagation()}
                              value={
                                editedQuiz.questions[currentStep]
                                  .accessoryNote || ''
                              }
                              onChange={(e) => {
                                const q = {
                                  ...editedQuiz.questions[currentStep],
                                  accessoryNote: e.target.value,
                                };
                                updateQuestion(currentStep, q);
                              }}
                              className='h-9 text-xs bg-white/5 border-white/10 min-w-[200px] mt-1'
                            />
                          )}
                        </div>

                        {/* Question Timer */}
                        <div className='w-full mt-2'>
                          <p className='uppercase text-sm font-bold mb-1 text-white'>
                            Timer:
                          </p>
                          <div className='flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 rounded-md h-9'>
                            <Clock className='h-3.5 w-3.5 text-pw-muted' />
                            <input
                              type='number'
                              placeholder='Timer (s)'
                              onKeyDown={(e) => e.stopPropagation()}
                              value={
                                editedQuiz.questions[currentStep].timer || ''
                              }
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
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Question Content based on Type */}
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                      Question Text
                    </label>

                    <div className='w-full bg-white/5 border border-white/10 rounded-xl p-2 sm:p-4 text-sm sm:pb-2'>
                      <div
                        className='flex items-center gap-1 border-b border-white/5 pb-2 mb-1'
                        aria-label='Question text formatting'>
                        <Button
                          type='button'
                          size='sm'
                          variant='ghost'
                          title='Bold selected text'
                          aria-label='Bold'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => formatQuestionText('b')}
                          className='h-7 w-7 p-0'>
                          <Bold size={14} />
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='ghost'
                          title='Italic selected text'
                          aria-label='Italic'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => formatQuestionText('i')}
                          className='h-7 w-7 p-0'>
                          <Italic size={14} />
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='ghost'
                          title='Underline selected text'
                          aria-label='Underline'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => formatQuestionText('u')}
                          className='h-7 w-7 p-0'>
                          <Underline size={14} />
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='ghost'
                          title='Highlight selected text'
                          aria-label='Highlight'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => formatQuestionText('mark')}
                          className='h-7 w-7 p-0'>
                          <Highlighter size={14} />
                        </Button>
                      </div>
                      <div className='relative'>
                        <textarea
                          id='question-text-input'
                          value={editedQuiz.questions[currentStep].text}
                          onChange={(e) =>
                            updateQuestion(currentStep, {
                              ...editedQuiz.questions[currentStep],
                              text: e.target.value,
                            })
                          }
                          placeholder='Enter your question (Use @ to mention parameters like @name or @email)'
                          className='w-full h-20 bg-transparent p-2 sm:p-0 text-sm no-outline resize-none transition-all'
                        />
                        {/* Mention Helper Badge List */}
                        {editedQuiz.askDetails &&
                          editedQuiz.askDetails.length > 0 && (
                            <div className='flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5'>
                              <span className='text-[10px] font-bold text-pw-muted uppercase'>
                                @ Details:
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
                                  className='px-2 py-0.5 rounded-xl bg-pw-primary/8 border border-pw-primary/20 text-pw-primary text-[10px] font-bold hover:bg-pw-primary/25 transition-all'>
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
                          <div className='flex items-center gap-1.5 flex-wrap'>
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
                          <p className='text-[9px] text-pw-muted/60 pl-1'>
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

                            <DropdownMenuContent className='bg-pw-surface border-white/10 w-56 max-h-[280px] '>
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
                                  ⛔ Finish {editedQuiz.type}
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
                                    Jump to Group (linear flow)
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
                      /* Enhanced Input question rules & branching builder */
                      <div className='space-y-4'>
                        <div className='bg-pw-primary/5 p-3 sm:p-4 rounded-2xl border border-pw-primary/10 flex flex-col gap-4 text-left'>
                          <div className='flex items-center gap-3 border-b border-white/5 pb-3'>
                            <Type className='h-6 w-6 text-pw-primary shrink-0' />
                            <div>
                              <p className='text-sm font-bold text-white'>
                                Input Question Matching & Branching
                              </p>
                              <p className='text-[10px] text-pw-muted'>
                                Match taker responses against keywords and
                                configure dynamic branching routes.
                              </p>
                            </div>
                          </div>

                          {/* Default Keyword & Case Sensitivity */}
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 items-end'>
                            <div className='space-y-1'>
                              <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                                Target Keyword (Correct Answer)
                              </label>
                              <Input
                                placeholder='Target Keyword (Optional)'
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
                                className='h-9 bg-white/5 border-white/10 text-xs focus:border-pw-primary'
                              />
                            </div>

                            <div className='flex items-center justify-between p-1 rounded-xl bg-white/5 border border-white/5 h-9'>
                              <span className='text-[10px] font-bold text-pw-muted uppercase'>
                                Case Sensitive Match
                              </span>
                              <Button
                                type='button'
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
                                  'h-6 px-2 text-[9px] font-bold gap-1',
                                  (
                                    editedQuiz.questions[currentStep]
                                      .caseSensitive
                                  ) ?
                                    'bg-pw-primary/20 border-pw-primary text-pw-primary'
                                  : 'bg-white/5 border-white/10 text-pw-muted',
                                )}>
                                {(
                                  editedQuiz.questions[currentStep]
                                    .caseSensitive
                                ) ?
                                  'ON'
                                : 'OFF'}
                              </Button>
                            </div>
                          </div>

                          {/* Input Branching Rules */}
                          <div className='space-y-2 pt-2 border-t border-white/10'>
                            <div className='flex items-center justify-between'>
                              <span
                                className='text-[10px] font-bold text-pw-primary uppercase tracking-wider flex gap-1 items-center'
                                onClick={() =>
                                  editedQuiz.questions[currentStep]
                                    .inputBranchRules &&
                                  setShowBranchRules(!showBranchRules)
                                }>
                                {editedQuiz?.questions[currentStep]
                                  ?.inputBranchRules && (
                                  <ChevronRight
                                    className={cn(
                                      'text-pw-primary h-3 w-3',
                                      showBranchRules && 'rotate-90',
                                    )}
                                  />
                                )}
                                Branching Rules (
                                {(
                                  editedQuiz.questions[currentStep]
                                    .inputBranchRules
                                ) ?
                                  `${
                                    editedQuiz.questions[currentStep]
                                      .inputBranchRules.length
                                  }`
                                : 'Optional'}
                                )
                              </span>
                              <Button
                                type='button'
                                size='sm'
                                onClick={() => {
                                  const curRules =
                                    editedQuiz.questions[currentStep]
                                      .inputBranchRules || [];
                                  const newRule: InputBranchRule = {
                                    keyword: '',
                                    caseSensitive: false,
                                  };
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    inputBranchRules: [...curRules, newRule],
                                  });
                                  setShowBranchRules(true);
                                }}
                                className='btn-ghost h-7 w-7 rounded-full text-[10px] gap-1 text-pw-primary'>
                                <Plus className='h-3 w-3' />
                              </Button>
                            </div>
                            {showBranchRules &&
                              (
                                editedQuiz.questions[currentStep]
                                  .inputBranchRules || []
                              ).map((rule, rIdx) => (
                                <div
                                  key={rIdx}
                                  className={cn(
                                    'py-2 space-y-2 text-xs',
                                    (
                                      editedQuiz?.questions[currentStep]
                                        ?.inputBranchRules &&
                                        rIdx ===
                                          editedQuiz?.questions[currentStep]
                                            ?.inputBranchRules.length -
                                            1
                                    ) ?
                                      'border-none'
                                    : 'border-b border-white/5',
                                  )}>
                                  <div className='flex items-center gap-2'>
                                    <Input
                                      placeholder='If input contains / matches keyword...'
                                      value={rule.keyword}
                                      onChange={(e) => {
                                        const curRules = [
                                          ...(editedQuiz.questions[currentStep]
                                            .inputBranchRules || []),
                                        ];
                                        curRules[rIdx] = {
                                          ...curRules[rIdx],
                                          keyword: e.target.value,
                                        };
                                        updateQuestion(currentStep, {
                                          ...editedQuiz.questions[currentStep],
                                          inputBranchRules: curRules,
                                        });
                                      }}
                                      className='h-8 bg-black/20 bkblur border-white/10 text-xs flex-1'
                                    />
                                    <Button
                                      type='button'
                                      size='sm'
                                      variant='ghost'
                                      onClick={() => {
                                        const curRules = [
                                          ...(editedQuiz.questions[currentStep]
                                            .inputBranchRules || []),
                                        ];
                                        curRules[rIdx] = {
                                          ...curRules[rIdx],
                                          caseSensitive:
                                            !curRules[rIdx].caseSensitive,
                                        };
                                        updateQuestion(currentStep, {
                                          ...editedQuiz.questions[currentStep],
                                          inputBranchRules: curRules,
                                        });
                                      }}
                                      className={cn(
                                        'h-8 px-2 text-[9px] font-bold border',
                                        rule.caseSensitive ?
                                          'border-pw-primary text-pw-primary'
                                        : 'border-white/10 text-pw-muted',
                                      )}>
                                      {rule.caseSensitive ?
                                        'Aa (Exact)'
                                      : 'aa (Any Case)'}
                                    </Button>
                                    <Button
                                      type='button'
                                      size='icon'
                                      variant='ghost'
                                      onClick={() => {
                                        const curRules = (
                                          editedQuiz.questions[currentStep]
                                            .inputBranchRules || []
                                        ).filter((_, i) => i !== rIdx);
                                        updateQuestion(currentStep, {
                                          ...editedQuiz.questions[currentStep],
                                          inputBranchRules: curRules,
                                        });
                                      }}
                                      className='h-8 w-8 text-pw-danger sm:text-pw-muted sm:hover:text-pw-danger'>
                                      <Trash2 className='h-3.5 w-3.5' />
                                    </Button>
                                  </div>

                                  <div className='flex items-center gap-2 text-[10px] text-pw-muted'>
                                    <span>Route to:</span>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant='outline'
                                          size='sm'
                                          className='h-6 text-[10px] bg-white/5 border-white/10 text-pw-primary font-bold'>
                                          {rule.skipToCat ?
                                            `Group: ${rule.skipToCat}`
                                          : rule.skipTo === 'end' ?
                                            '⛔ Finish'
                                          : rule.skipTo ?
                                            `Q${editedQuiz.questions.findIndex((q) => q.id === rule.skipTo) + 1}`
                                          : 'Next Question'}
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className='bg-[#0c0d1c] border-white/10 text-white w-52'>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const curRules = [
                                              ...(editedQuiz.questions[
                                                currentStep
                                              ].inputBranchRules || []),
                                            ];
                                            curRules[rIdx] = {
                                              ...curRules[rIdx],
                                              skipTo: undefined,
                                              skipToCat: undefined,
                                            };
                                            updateQuestion(currentStep, {
                                              ...editedQuiz.questions[
                                                currentStep
                                              ],
                                              inputBranchRules: curRules,
                                            });
                                          }}>
                                          Next Question (Default)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const curRules = [
                                              ...(editedQuiz.questions[
                                                currentStep
                                              ].inputBranchRules || []),
                                            ];
                                            curRules[rIdx] = {
                                              ...curRules[rIdx],
                                              skipTo: 'end',
                                              skipToCat: undefined,
                                            };
                                            updateQuestion(currentStep, {
                                              ...editedQuiz.questions[
                                                currentStep
                                              ],
                                              inputBranchRules: curRules,
                                            });
                                          }}>
                                          ⛔ Finish {editedQuiz.type}
                                        </DropdownMenuItem>
                                        {editedQuiz.questions.map(
                                          (qItem, qI) => (
                                            <DropdownMenuItem
                                              key={qItem.id}
                                              onClick={() => {
                                                const curRules = [
                                                  ...(editedQuiz.questions[
                                                    currentStep
                                                  ].inputBranchRules || []),
                                                ];
                                                curRules[rIdx] = {
                                                  ...curRules[rIdx],
                                                  skipTo: qItem.id,
                                                  skipToCat: undefined,
                                                };
                                                updateQuestion(currentStep, {
                                                  ...editedQuiz.questions[
                                                    currentStep
                                                  ],
                                                  inputBranchRules: curRules,
                                                });
                                              }}>
                                              Q{qI + 1}:{' '}
                                              {qItem.text.slice(0, 18)}
                                            </DropdownMenuItem>
                                          ),
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              ))}
                          </div>

                          <div className='space-y-2 mt-2 border-t border-white/5 pt-3'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>
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
                              className='w-full h-16 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-pw-primary focus:outline-none resize-none custom-scrollbar'
                            />
                          </div>
                        </div>
                      </div>
                    : editedQuiz.questions[currentStep].type === 'upload' ?
                      <div className='bg-pw-primary/5 p-4 rounded-2xl border border-pw-primary/10 space-y-4 text-left'>
                        <div className='flex items-center gap-3 border-b border-white/5 pb-3'>
                          <Upload className='h-6 w-6 text-pw-primary shrink-0' />
                          <div>
                            <p className='text-sm font-bold text-white'>
                              File Upload Configuration
                            </p>
                            <p className='text-[10px] text-pw-muted'>
                              Set accepted formats, size caps based on plan, and
                              custom taker instructions.
                            </p>
                          </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                              Accepted Formats
                            </label>
                            <select
                              value={
                                editedQuiz.questions[currentStep]
                                  ?.allowedTypes || 'Select Type'
                              }
                              className='w-full h-10 rounded-xl border border-white/10 px-3 text-xs text-pw-text focus:outline-none focus:border-pw-primary cursor-pointer'
                              onChange={(e) =>
                                updateQuestion(currentStep, {
                                  ...editedQuiz.questions[currentStep],
                                  allowedTypes: e.target.value,
                                })
                              }>
                              {[
                                { title: 'All', type: '.', hide: quizUnlocked },
                                { title: 'Pdf', type: '.pdf' },
                                { title: 'Docs', type: '.doc,.docx' },
                                { title: 'Text', type: '.txt' },
                                {
                                  title: 'Json',
                                  type: '.json, application/json',
                                },
                                {
                                  title: 'Zip',
                                  type: '.zip',
                                  hide: quizUnlocked,
                                },
                                { title: 'Image', type: 'image/*' },
                                {
                                  title: 'Video',
                                  type: 'video/*',
                                  hide: quizUnlocked,
                                },
                                {
                                  title: 'Audio',
                                  type: 'audio/*',
                                  hide: quizUnlocked,
                                },
                              ].map((a, i) => {
                                return (
                                  !a.hide && (
                                    <option
                                      value={a.type}
                                      key={a.type + a.title + i}
                                      className='bg-[#0A0C1B]'>
                                      {a.title.toUpperCase()}
                                    </option>
                                  )
                                );
                              })}
                            </select>
                          </div>

                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                              Max Size Cap (MB)
                            </label>
                            <Input
                              type='number'
                              placeholder='e.g. 10'
                              value={
                                editedQuiz.questions[currentStep].maxFileSize ||
                                (!quizUnlocked ? 5
                                : quizUnlocked && premiumTier !== 'pro' ? 15
                                : 50)
                              }
                              onChange={(e) => {
                                const maxAllowed =
                                  !quizUnlocked ? 5
                                  : quizUnlocked ? 15
                                  : 50;
                                const requested =
                                  parseFloat(e.target.value) || 5;
                                if (requested > maxAllowed) {
                                  toast.error(
                                    `Max file size for ${PREMIUM_TIERS[premiumTier].label} plan is ${maxAllowed}MB`,
                                  );
                                }
                                updateQuestion(currentStep, {
                                  ...editedQuiz.questions[currentStep],
                                  maxFileSize: Math.min(requested, maxAllowed),
                                });
                              }}
                              className='h-9 bg-white/5 border-white/10 text-xs'
                            />
                            <p className='text-[9px] text-pw-muted'>
                              Plan Limit:{' '}
                              {!quizUnlocked ?
                                '5MB (Free)'
                              : quizUnlocked ?
                                '15MB (Flex)'
                              : '50MB (Pro/Std)'}
                            </p>
                          </div>
                        </div>

                        <div className='space-y-1 pt-1'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                            Upload Instructions (Optional)
                          </label>
                          <textarea
                            value={
                              editedQuiz.questions[currentStep]
                                .uploadInstruction || ''
                            }
                            onChange={(e) =>
                              updateQuestion(currentStep, {
                                ...editedQuiz.questions[currentStep],
                                uploadInstruction: e.target.value,
                              })
                            }
                            placeholder='Instructions displayed to takers (e.g. "Upload your solution as a high resolution PDF")'
                            className='w-full h-16 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs resize-none'
                          />
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
                            // disabled
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
                                  'group flex flex-col gap-1 p-2 rounded-xl border transition-all',
                                  isCorrect ?
                                    'bg-pw-success/10 border-pw-success/50 shadow-md shadow-pw-success/5'
                                  : 'bg-white/5 border-white/5 hover:border-pw-primary/30',
                                )}>
                                <div className='flex items-center gap-2 flex-wrap'>
                                  <div className='flex items-center gap-3 flex-1'>
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
                                                editedQuiz.questions[
                                                  currentStep
                                                ].correctIndex
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
                                      className='bg-transparent border-none rounded-none p-0 h-auto text-sm focus-visible:ring-0 no-outline flex-1 min-w-5'
                                    />
                                  </div>

                                  <div className='flex items-center flex-wrap gap-0.5'>
                                    {/* Scalable Option Action Drawer / Menu (MoreVertical Scaffold) */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type='button'
                                          title='Option Controls'
                                          className='p-1 hover:bg-white/10 rounded-lg text-pw-muted hover:text-white transition-colors'>
                                          <MoreVertical className='h-4 w-4' />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className='w-56 bg-pw-surface/90 bkblur border border-white/10 p-2 shadow-2xl rounded-xl space-y-1 z-50'>
                                        <DropdownMenuItem
                                          className='h-8 text-xs cursor-pointer gap-2'
                                          onSelect={(e) => e.preventDefault()}>
                                          <label className='flex items-center gap-2 cursor-pointer w-full'>
                                            <Image className='h-3.5 w-3.5 text-pw-primary' />
                                            <span>
                                              {opt.uploadUrl ?
                                                'Change Image'
                                              : 'Add Option Image'}
                                            </span>
                                            <input
                                              type='file'
                                              accept='image/*'
                                              className='hidden'
                                              onChange={(e) => {
                                                const file =
                                                  e.target.files?.[0];
                                                if (file) {
                                                  const reader =
                                                    new FileReader();
                                                  reader.onload = (ev) => {
                                                    const newOpts = [
                                                      ...(editedQuiz.questions[
                                                        currentStep
                                                      ]
                                                        .options as QuizOption[]),
                                                    ];
                                                    newOpts[idx].uploadUrl = ev
                                                      .target?.result as string;
                                                    updateQuestion(
                                                      currentStep,
                                                      {
                                                        ...editedQuiz.questions[
                                                          currentStep
                                                        ],
                                                        options: newOpts,
                                                      },
                                                    );
                                                    toast.success(
                                                      'Option image uploaded!',
                                                    );
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                          </label>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                          onClick={() => {
                                            const newOpts = [
                                              ...(editedQuiz.questions[
                                                currentStep
                                              ].options as QuizOption[]),
                                            ];
                                            newOpts[idx].hidden =
                                              !newOpts[idx].hidden;
                                            updateQuestion(currentStep, {
                                              ...editedQuiz.questions[
                                                currentStep
                                              ],
                                              options: newOpts,
                                            });
                                            toast.success(
                                              newOpts[idx].hidden ?
                                                'Option hidden from takers'
                                              : 'Option visible to takers',
                                            );
                                          }}
                                          className='h-7 text-xs cursor-pointer gap-2'>
                                          {opt.hidden ?
                                            <>
                                              <Eye className='h-3.5 w-3.5 text-pw-primary' />{' '}
                                              Show to Takers
                                            </>
                                          : <>
                                              <EyeOff className='h-3.5 w-3.5 text-pw-muted' />{' '}
                                              Hide from Takers
                                            </>
                                          }
                                        </DropdownMenuItem>

                                        {/* Option Feedback Note / Explanation */}
                                        <div
                                          className='p-1.5 bg-black/20 rounded-lg border border-white/5 space-y-1'
                                          onClick={(e) => e.stopPropagation()}>
                                          <span className='text-[9px] font-bold text-pw-muted uppercase block'>
                                            Option Feedback Note
                                          </span>
                                          <Input
                                            type='text'
                                            placeholder='Explanation when selected...'
                                            value={opt.explanation || ''}
                                            onKeyDown={(e) =>
                                              e.stopPropagation()
                                            }
                                            onChange={(e) => {
                                              const newOpts = [
                                                ...(editedQuiz.questions[
                                                  currentStep
                                                ].options as QuizOption[]),
                                              ];
                                              newOpts[idx].explanation =
                                                e.target.value;
                                              updateQuestion(currentStep, {
                                                ...editedQuiz.questions[
                                                  currentStep
                                                ],
                                                options: newOpts,
                                              });
                                            }}
                                            className='h-6 text-[10px] bg-white/5 border-white/10'
                                          />
                                        </div>

                                        {/* Option Score Weight for Checkbox questions */}
                                        {isCheckbox && (
                                          <div
                                            className='p-1.5 bg-black/20 rounded-lg border border-white/5 space-y-1'
                                            onClick={(e) =>
                                              e.stopPropagation()
                                            }>
                                            <span className='text-[9px] font-bold text-pw-muted uppercase block'>
                                              Option Score Weight
                                            </span>
                                            <Input
                                              type='number'
                                              value={
                                                (opt as any).scoreWeight ?? 1
                                              }
                                              onChange={(e) => {
                                                const newOpts = [
                                                  ...(editedQuiz.questions[
                                                    currentStep
                                                  ].options as QuizOption[]),
                                                ];
                                                (
                                                  newOpts[idx] as any
                                                ).scoreWeight =
                                                  parseFloat(e.target.value) ||
                                                  0;
                                                updateQuestion(currentStep, {
                                                  ...editedQuiz.questions[
                                                    currentStep
                                                  ],
                                                  options: newOpts,
                                                });
                                              }}
                                              className='h-6 text-[10px] bg-white/5 border-white/10'
                                            />
                                          </div>
                                        )}

                                        <DropdownMenuSeparator className='bg-white/5' />

                                        {/* Move Up/Down controls */}
                                        <DropdownMenuItem
                                          disabled={idx === 0}
                                          onClick={() => {
                                            if (idx === 0) return;
                                            const newOpts = [
                                              ...(editedQuiz.questions[
                                                currentStep
                                              ].options as QuizOption[]),
                                            ];
                                            [newOpts[idx - 1], newOpts[idx]] = [
                                              newOpts[idx],
                                              newOpts[idx - 1],
                                            ];
                                            updateQuestion(currentStep, {
                                              ...editedQuiz.questions[
                                                currentStep
                                              ],
                                              options: newOpts,
                                            });
                                          }}
                                          className='h-7 text-xs cursor-pointer gap-2'>
                                          <ArrowUp className='h-3 w-3 text-pw-cyan' />{' '}
                                          Move Option Up
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                          disabled={
                                            idx ===
                                            (
                                              editedQuiz.questions[currentStep]
                                                .options as QuizOption[]
                                            ).length -
                                              1
                                          }
                                          onClick={() => {
                                            if (
                                              idx ===
                                              (
                                                editedQuiz.questions[
                                                  currentStep
                                                ].options as QuizOption[]
                                              ).length -
                                                1
                                            )
                                              return;
                                            const newOpts = [
                                              ...(editedQuiz.questions[
                                                currentStep
                                              ].options as QuizOption[]),
                                            ];
                                            [newOpts[idx + 1], newOpts[idx]] = [
                                              newOpts[idx],
                                              newOpts[idx + 1],
                                            ];
                                            updateQuestion(currentStep, {
                                              ...editedQuiz.questions[
                                                currentStep
                                              ],
                                              options: newOpts,
                                            });
                                          }}
                                          className='h-7 text-xs cursor-pointer gap-2'>
                                          <ArrowDown className='h-3 w-3 text-pw-cyan' />{' '}
                                          Move Option Down
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator className='bg-white/5' />

                                        <DropdownMenuItem
                                          onClick={() => {
                                            const newOpts = (
                                              editedQuiz.questions[currentStep]
                                                .options as QuizOption[]
                                            ).filter((_, i) => i !== idx);
                                            updateQuestion(currentStep, {
                                              ...editedQuiz.questions[
                                                currentStep
                                              ],
                                              options: newOpts,
                                            });
                                          }}
                                          className='h-7 text-xs text-pw-danger focus:bg-pw-danger/10 focus:text-pw-danger cursor-pointer gap-2'>
                                          <Trash2 className='h-3 w-3' /> Delete
                                          Option
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Option Image Preview Badge */}
                                    {opt.uploadUrl && (
                                      <div className='relative shrink-0 group/img mr-1'>
                                        <img
                                          src={opt.uploadUrl}
                                          alt='Option'
                                          className='h-8 w-8 object-cover rounded-md border border-white/10'
                                        />
                                        <button
                                          type='button'
                                          onClick={() => {
                                            const newOpts = [
                                              ...(editedQuiz.questions[
                                                currentStep
                                              ].options as QuizOption[]),
                                            ];
                                            delete newOpts[idx].uploadUrl;
                                            updateQuestion(currentStep, {
                                              ...editedQuiz.questions[
                                                currentStep
                                              ],
                                              options: newOpts,
                                            });
                                          }}
                                          className='absolute -top-1 -right-1 h-4 w-4 rounded-full bg-pw-danger text-white flex items-center justify-center text-[8px] font-bold opacity-0 group-hover/img:opacity-100 transition-opacity'>
                                          ✕
                                        </button>
                                      </div>
                                    )}

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
                                                  `Finish ${editedQuiz.type}`
                                                : `To Q${editedQuiz.questions.findIndex((q) => q.id === opt.skipTo) + 1}`
                                                }
                                              </>
                                            : <>
                                                <Share2 size={10} /> Branch
                                              </>
                                            }
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className='bg-pw-surface/70 bkblur border-white/10 w-56'>
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
                                              ⛔ Finish {editedQuiz.type}
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
                              !quizUnlocked
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

      <QuizLanguageModal
        open={showLanguageDocs}
        onOpenChange={setShowLanguageDocs}
      />
    </div>
  );
};

export default function QuizPage() {
  const { openFile } = useAppFileViewer();
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const { showAlert, showConfirm, showPrompt } = useAppModal();
  const [filenameInput, setFilenameInput] = useState('');
  const [filenameExtension, setFilenameExtension] = useState('');
  const [onConfirmFilename, setOnConfirmFilename] = useState<
    ((cleanName: string) => void) | null
  >(null);

  const { premiumTier, isFeatureUnlocked, user, username, isLoading } = useAppContext();
  const quizUnlocked = isFeatureUnlocked('quiz');

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

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Quiz | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<number | null>(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [isEmailingExport, setIsEmailingExport] = useState(false);

  useEffect(() => {
    const onSyncError = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; message?: string }>).detail;
      if (detail?.type === 'quiz') {
        toast.error(detail.message || 'Quiz media or cloud save failed. Your local copy is still available.');
      }
    };
    window.addEventListener('pw_sync_error', onSyncError);
    return () => window.removeEventListener('pw_sync_error', onSyncError);
  }, []);

  const emailResponseExport = async (quizId: string, format: 'csv' | 'json' = 'csv') => {
    if (isEmailingExport) return;
    setIsEmailingExport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again before emailing an export.');
      const response = await fetch('/api/quiz-export-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ quizId, format }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not email this export.');
      toast.success(`Export emailed to ${result.email}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not email this export.');
    } finally {
      setIsEmailingExport(false);
    }
  };

  const safeDecodeBase64 = (str: any): any => {
    return decodeStoredCorrectAnswer(str);
  };

  const resolveAnswerToText = (quiz: Quiz, questionId: string, val: any) => {
    const question = quiz.questions?.find((q) => q.id === questionId);
    if (!question) return String(val !== undefined && val !== null ? val : '');
    if (question.type === 'input')
      return String(val !== undefined && val !== null ? val : '');

    const options = question.options || [];
    const findText = (id: any) => {
      if (id === undefined || id === null) return '';
      const idStr = String(id);

      const foundById = options.find(
        (o) => o && o.id === idStr,
      );
      if (foundById) return foundById.text;

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

  const [lastViewedCounts, setLastViewedCounts] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('pw_last_viewed_counts') || '{}');
    } catch {
      return {};
    }
  });

  const resolveCorrectText = (quiz: Quiz, questionId: string) => {
    const question = quiz.questions?.find((q) => q.id === questionId);
    if (!question) return 'No correct answer';
    if (question.correctIndex === undefined || question.correctIndex === null || question.correctIndex === '') {
      return 'No correct answer';
    }
    const decodedVal = safeDecodeBase64(question.correctIndex);
    if (decodedVal === undefined || decodedVal === null || decodedVal === '') {
      return 'No correct answer';
    }
    const resolved = resolveAnswerToText(quiz, questionId, decodedVal);
    return resolved && resolved !== 'undefined' ? resolved : 'No correct answer';
  };


  const exportResponses = (quiz: Quiz, format: 'csv' | 'json' | 'txt') => {
    if (!quiz.responses || quiz.responses.length === 0) {
      toast.info('No responses to export yet.');
      return;
    }

    let content = '';
    let mimeType = '';
    if (format === 'csv') {
      content = exportResponsesToCSV(quiz, quiz.responses);
      mimeType = 'text/csv;charset=utf-8;';
    } else if (format === 'json') {
      content = exportResponsesToJSON(quiz, quiz.responses);
      mimeType = 'application/json;charset=utf-8;';
    } else {
      content = exportResponsesToText(quiz, quiz.responses);
      mimeType = 'text/plain;charset=utf-8;';
    }

    triggerExport(
      `${quiz.title.replace(/\s+/g, '_')}_responses`,
      format,
      (filename) => {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.${format}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Responses exported to ${format.toUpperCase()}!`);
      },
    );
  };

  const clearResponses = async (quizId: string) => {
    const confirmed = await showConfirm(
      'Are you sure you want to clear all responses? This cannot be undone.',
      { confirmText: 'Clear responses', type: 'danger' },
    );
    if (!confirmed) return;

    const data =
      quizzes.find((item) => item.id === quizId) ||
      (await HybridStorage.getQuiz(quizId));
    if (data) {
      const updated = { ...data, responses: [] };
      if (quizId === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
        localStorage.setItem(
          seedTemplateStorageKey(),
          JSON.stringify(updated),
        );
      } else {
        try {
          await HybridStorage.clearQuizResponses(quizId);
        } catch (error: any) {
          toast.error(error?.message || 'Could not clear assessment responses.');
          return;
        }
      }

      setResponseCounts((current) => ({ ...current, [quizId]: 0 }));
      setQuizzes((current) =>
        current.map((item) => (item.id === quizId ? updated : item)),
      );
      if (viewingResponses?.id === quizId) {
        setViewingResponses(updated);
      }
      toast.success('Responses cleared!');
    }
  };

  const loadQuizzes = async (silent = false) => {
    if (!silent) setIsLoadingQuizzes(true);
    try {
      const localSeedKey = seedTemplateStorageKey();
      const includeLocalSeed = (items: Quiz[]) => {
        try {
          const localSeed = JSON.parse(
            localStorage.getItem(localSeedKey) || 'null',
          ) as Quiz | null;
          if (localSeed && localSeed?.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
            return [
              localSeed,
              ...items.filter((item) => item.id !== localSeed.id),
            ];
          } else {
            localStorage.setItem(
              localSeedKey,
              JSON.stringify(DEFAULT_PINGWORLD_SHOWCASE_QUIZ),
            );

            includeLocalSeed(items);
          }
        } catch {
          console.warn('[Quiz] Ignoring an unreadable local showcase draft.');
        }
        return items;
      };
      const normalizeItems = (items: any[]) => items.map(normalizeQuizRecord);
      // 1. Serve local cache immediately
      const localData = await HybridStorage.getAll(
        'quiz',
        async (freshItems) => {
          // 2. Called in background when remote data arrives — silently refresh
          const remoteItems = normalizeItems(freshItems).filter(
            (item) => item.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id,
          );
          const processed = await processExpiryStatus(remoteItems);
          setQuizzes(includeLocalSeed(processed));
        },
      );
      const localQuizzes = normalizeItems(localData).filter(
        (item) => item.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id,
      );
      const processed = includeLocalSeed(
        await processExpiryStatus(localQuizzes),
      );

      // Auto-seed default showcase template on first time visiting the quiz section
      if (typeof window !== 'undefined') {
        const seeded = localStorage.getItem(localSeedKey);
        if (!seeded && processed.length === 0) {
          try {
            localStorage.setItem(
              localSeedKey,
              JSON.stringify(DEFAULT_PINGWORLD_SHOWCASE_QUIZ),
            );
            setQuizzes([DEFAULT_PINGWORLD_SHOWCASE_QUIZ]);
            return;
          } catch {
            // Continue if storage fails
          }
        }
      }

      setQuizzes(processed);
    } finally {
      if (!silent) setIsLoadingQuizzes(false);
    }
  };

  // Auto-tag expired quizzes & purge those expired for > 48h (Templates do not expire)
  const processExpiryStatus = async (items: Quiz[]): Promise<Quiz[]> => {
    const now = Date.now();
    const twoDaysMs = 48 * 60 * 60 * 1000;
    const toKeep: Quiz[] = [];
    for (const quiz of items) {
      if (isQuizTemplate(quiz)) {
        toKeep.push({ ...quiz, isTemplate: true } as any);
        continue;
      }
      if (quiz.expires_at) {
        const expiresAt = new Date(quiz.expires_at).getTime();
        const isExpired = expiresAt < now;
        const isPurgeEligible = now - expiresAt > twoDaysMs;
        if (isPurgeEligible) {
          // Auto-delete quizzes expired for more than 48 hours
          await HybridStorage.delete(quiz.id, 'quiz');
          continue; // Skip adding to toKeep
        }
        toKeep.push({ ...quiz, _isExpired: isExpired } as any);
      } else {
        toKeep.push(quiz);
      }
    }
    return toKeep;
  };

  // Real-time sync listener
  useEffect(() => {
    const handleSyncStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; is_synced: boolean }>;
      if (customEvent.detail?.id) {
        setQuizzes((prev) =>
          prev.map((q) =>
            q.id === customEvent.detail.id
              ? { ...q, is_synced: customEvent.detail.is_synced }
              : q,
          ),
        );
      }
    };
    window.addEventListener('pw_sync_status', handleSyncStatus);
    return () => window.removeEventListener('pw_sync_status', handleSyncStatus);
  }, []);

  // Load from hybrid storage (offline-first)
  useEffect(() => {
    if (!isLoading) {
      const isInitial = quizzes.length === 0;
      void loadQuizzes(!isInitial).catch((error) => {
        console.error('[Quiz] Local/remote assessment list failed to load.', error);
      });
    }
  }, [isLoading, user?.id]);

  // Managed by HybridStorage exclusively

  const handleStartNew = () => {
    const newQuiz: Quiz = {
      id: generateQuizId(),
      title: '',
      description: '',
      type: 'quiz',
      questions: [],
      endScreen: {
        title: 'Assessment Completed!',
        message:
          'You have completed this assessment. Thank you for using PingWorld.',
        completionIcon: 'check',
        showPerformance: true,
        textAlign: 'center',
      },
      createdAt: Date.now(),
      fromPremium: quizUnlocked,
      userId: user?.id || '',
    };
    setActiveQuiz(newQuiz);
    setIsCreating(true);
  };

  const handleSaveQuiz = async (quiz: Quiz, isImport?: boolean) => {
    const originalQuizId = quiz.id;
    const hasDatabaseUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(quiz.id);
    if (
      user?.id &&
      !hasDatabaseUuid &&
      quiz.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id
    ) {
      quiz = {
        ...quiz,
        id: generateQuizId(),
        customUrl: quiz.customUrl || (quiz.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id ? '' : quiz.id),
        isCustom: true,
        userId: user.id,
      };
    }
    if (!quiz.title) return toast.error('Quiz needs a title!');
    if (quiz?.questions?.length === 0)
      return toast.error('Quiz needs at least one question!');

    // Check if questions are valid
    const optionQuestionTypes: QuestionType[] = [
      'multiple_choice',
      'true_false',
      'dropdown',
      'checkbox',
    ];
    const invalid = quiz.questions.some((question) => {
      if (!question.text?.trim()) return true;
      if (!optionQuestionTypes.includes(question.type)) return false;
      return !question.options?.length ||
        question.options.some((option) => !option?.id?.trim() || !option?.text?.trim());
    });
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
    const expiryValidation = validateQuizExpiry(
      finalExpiry,
      premiumTier,
      quiz.createdAt || Date.now(),
    );

    if (!expiryValidation.isValid) {
      const proceed = await showConfirm(
        `${expiryValidation.message}\n\nWould you like to auto-align this assessment's expiry to your maximum allowed plan limit (${expiryValidation.remainingTimeFormatted}) and proceed with saving?`,
        {
          confirmText: 'Auto-Align & Save',
          cancelText: 'Adjust Date',
          type: 'warning',
        },
      );

      if (proceed) {
        finalExpiry = expiryValidation.suggestedExpiry!;
      }

      if (!proceed) {
        toast.info(
          'Assessment save cancelled. Please adjust the expiration date.',
        );
        return;
      }
    } else if (!finalExpiry) {
      finalExpiry = expiryValidation.suggestedExpiry;
    }

    // Track expiry history and enforce 3-change lock
    const prevExpiry = quizzes.find((q) => q.id === quiz.id)?.expires_at;
    let expiryHistory = quiz.expiryHistory ?? [];
    let isExpiryLocked = quiz.isExpiryLocked ?? false;
    if (prevExpiry && prevExpiry !== finalExpiry && !isExpiryLocked) {
      expiryHistory = [...expiryHistory, prevExpiry];
      if (expiryHistory.length >= 3) {
        isExpiryLocked = true;
        toast.warning('Expiry setter locked - maximum 3 changes reached.');
      }
    }

    const quizToSave = {
      ...quiz,
      questions: securedQuestions,
      expires_at: finalExpiry,
      expiryHistory,
      isExpiryLocked,
    };

    setIsSavingQuiz(true);
    try {
      const isLocalSeed = quizToSave.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id;
      const isSynced =
        isLocalSeed ? false : (
          (await HybridStorage.save(quizToSave.id, quizToSave, 'quiz'))
            .is_synced
        );
      if (isLocalSeed) {
        localStorage.setItem(
          seedTemplateStorageKey(),
          JSON.stringify(quizToSave),
        );
      }
      if (!isLocalSeed) {
        await HybridStorage.deleteQuizDraft(quizToSave.id);
        if (originalQuizId !== quizToSave.id) await HybridStorage.deleteQuizDraft(originalQuizId);
        if (originalQuizId !== quizToSave.id) await HybridStorage.delete(originalQuizId, 'quiz');
      
      }

      const retainedQuizzes = quizzes.filter((item) => item.id !== originalQuizId || originalQuizId === quizToSave.id);
      const existingIndex = retainedQuizzes.findIndex((q) => q.id === quizToSave.id);
      let newQuizzes;
      if (existingIndex > -1) {
        newQuizzes = [...retainedQuizzes];
        newQuizzes[existingIndex] = {
          ...quizToSave,
          is_synced: isSynced,
        } as any;
      } else {
        newQuizzes = [{ ...quizToSave, is_synced: isSynced } as any, ...retainedQuizzes];
      }

      setQuizzes(newQuizzes);
      setIsCreating(false);
      setActiveQuiz(null);
      !isImport && toast.success('Quiz saved successfully!');
    } catch (e) {
      toast.error(`Failed to save quiz. - ${e}`);
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const deleteQuiz = async (id: string) => {
    const check = await showConfirm(
      'Do you want to delete this assessment? This cannot be undone',
    );

    if (check) {
      if (id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
        localStorage.removeItem(seedTemplateStorageKey());
      } else {
        await HybridStorage.delete(id, 'quiz');
      }
      const newQuizzes = quizzes.filter((q) => q.id !== id);
      setQuizzes(newQuizzes);
      toast.success('Quiz deleted');
    }
  };

  const exportQuiz = async (quiz: Quiz) => {
    if(!quiz) return;

    const confirm = await showConfirm(
      `The images and responses in this ${quiz.type} would be trimmed off, make sure to have downloaded these data before exporting!`,
      {
        confirmText: 'Export',
        type: 'warning',
        cancelText: 'Cancel',
      },
    );

    if (confirm) {
      let trimmedQuiz = quiz;

      trimmedQuiz = {
        ...trimmedQuiz,
        branding: {
          ...trimmedQuiz?.branding,
          image: undefined,
          icon: undefined,
        },
        responses: undefined,
      };

      trimmedQuiz.questions.forEach((q) => {
        q.options
          .filter((opt) => typeof opt !== 'string')
          .forEach((o) => (o.uploadUrl = undefined));
      });

      triggerExport(
        trimmedQuiz.title.replace(/\s+/g, '-').toLowerCase(),
        'pwquiz',
        (filename) => {
          const payload = {
            __pwquiz: true,
            app: 'PingWorldQuizStudio',
            version: '1.0',
            ...trimmedQuiz,
          };
          const dataStr =
            'data:text/json;charset=utf-8,' +
            encodeURIComponent(JSON.stringify(payload, null, 2));
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute('href', dataStr);
          downloadAnchorNode.setAttribute('download', `${filename}.pwquiz`);
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          toast.success('Quiz exported as .pwquiz package!');
        },
      );
    }
  };

  const importQuiz = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const quiz = JSON.parse(event.target?.result as string);
        if (!quiz.title || !quiz?.questions)
          throw new Error('Invalid quiz file structure.');

        quiz.id = generateQuizId(); // New fresh ID for import

        // Check if imported quiz has expired
        if (quiz.expires_at) {
          const isExpired = new Date(quiz.expires_at).getTime() < Date.now();
          if (isExpired) {
            const freshExpiry = computeExpiry(premiumTier, 2).toISOString();
            quiz.expires_at = freshExpiry;
            toast.info(
              'Imported quiz was expired. Lifespan refreshed for your tier.',
            );
          }
        } else {
          quiz.expires_at = computeExpiry(premiumTier, 2).toISOString();
        }

        handleSaveQuiz(quiz, true).then(() => {
          toast.success(`Quiz "${quiz.title}" imported successfully!`);
        });
      } catch (err: any) {
        toast.error(err?.message || 'Invalid .pwquiz / .json format.');
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be re-imported if needed
    e.target.value = '';
  };

  const playQuiz = (id: string) => {
    window.open(`/quiz/${id}`, '_blank');
  };

  const formatDetailVars = (
    rawText: string,
    details: any,
    showPrev?: boolean,
    hideBold?: boolean,
  ) => {
    if (!rawText) return rawText;
    let formatted = resolvePipedText(rawText, { userData: details });

    Object.entries(details || {}).forEach(([key, val]) => {
      const cleanKey = key.trim().replace(/\s+/g, '');
      const boldVal = `${showPrev ? `@${cleanKey} (<strong class="text-pw-cyan font-bold">${val}</strong>)` : `<strong class="text-pw-cyan font-bold">${val}</strong>`}`;
      const normalVal = `${showPrev ? `@${cleanKey} (${val})` : `${val}`}`;
      const replText = `${hideBold ? normalVal : boldVal}`;
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

  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <div
      className={cn(
        'container mx-auto px-4 py-12 max-w-8xl min-h-screen pb-20 transition-all duration-500',
        quizUnlocked &&
          'bg-[radial-gradient(ellipse_80%_50%_at_20%_20%,rgba(255,179,71,0.06)_0%,transparent_60%)]',
      )}>
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
                  Quizzable{' '}
                  {quizUnlocked && (
                    <span className='ml-1 flex items-center gap-0.5 text-pw-warning'>
                      <Crown className='h-3 w-3' />
                      Premium
                    </span>
                  )}
                </div>
                <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
                  Quiz{' '}
                  <span
                    className={
                      quizUnlocked ? 'gradient-text-warm' : 'gradient-text'
                    }>
                    Builder.
                  </span>
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
                  <RefreshCw className={cn('h-4 w-4', isLoadingQuizzes && 'animate-spin')} />
                </Button>
                <div className='relative'>
                  <Button
                    variant='outline'
                    title='Import Quiz (.pwquiz or .json)'
                    className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
                    <Upload className='h-4 w-4' /> Import{' '}
                    <span className='hidden sm:inline-flex'> .pwquiz</span>
                    <input
                      type='file'
                      accept='.pwquiz,.json,application/json'
                      onChange={importQuiz}
                      className='absolute inset-0 opacity-0 cursor-pointer'
                    />
                  </Button>
                </div>
                <Button
                  title='Create New Quiz'
                  onClick={handleStartNew}
                  className='btn-primary gap-2 h-11 px-8'>
                  <Plus className='h-5 w-5' /> Create{' '}
                  <span className='hidden sm:inline-flex'> New Quiz</span>
                </Button>
              </div>
            </div>

            {isLoadingQuizzes ?
              <div
                className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                aria-busy='true'
                aria-label='Loading assessments'>
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className='h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.035]'
                  />
                ))}
              </div>
            : quizzes.length > 0 ?
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {quizzes.map((quiz, i) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}>
                    <Card className='card-glow h-full flex flex-col p-5 gap-2 group'>
                      <div className='flex justify-between items-start mb-4 flex-wrap gap-2'>
                        <div
                          className={cn(
                            'flex items-center gap-2 text-[10px] text-pw-muted font-mono uppercase tracking-widest flex-wrap',
                          )}>
                          {isQuizTemplate(quiz) && (
                            <span
                              className='bg-pw-primary/10 text-pw-primary border border-pw-primary/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider'
                              title='Template item - does not expire'>
                              Template
                            </span>
                          )}
                          {quiz.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id &&
                            ((quiz as any).is_synced ?
                            <span
                              className='text-pw-success flex items-center gap-1.5'
                              title='Synced'>
                              <CloudCheck className='h-3 w-3' />
                            </span>
                          : <span
                              className='text-pw-warning flex items-center gap-1.5'
                              title='Not synced'>
                              <Clock className='h-3 w-3' />
                            </span>)
                          }
                          {quiz?.questions?.length} Qts
                          {(() => {
                            const currentCount = responseCounts[quiz.id] ?? (Array.isArray(quiz.responses) ? quiz.responses.length : 0);
                            const lastViewed = lastViewedCounts[quiz.id] ?? currentCount;
                            const newResponses = Math.max(0, currentCount - lastViewed);
                            return (
                              <div className='flex items-center gap-1.5 flex-wrap'>
                                {currentCount > 0 && (
                                  <span
                                    className='text-pw-primary'
                                    title='Total responses available'>
                                    {currentCount} Ans
                                  </span>
                                )}
                                {newResponses > 0 && (
                                  <span
                                    className='bg-pw-success/20 text-pw-success border border-pw-success/30 px-1.5 py-0.5 rounded-full text-[9px] font-bold animate-pulse'
                                    title='New responses since last view'>
                                    +{newResponses} New
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          {quiz.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id && quiz?.expires_at &&
                            (() => {
                              const { label, urgent } = quizExpiryCountdown(
                                quiz?.expires_at || '',
                              );
                              return (
                                <span
                                  title='Quiz expiry'
                                  className={cn(
                                    'flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md border',
                                    label === 'Expired' ?
                                      'text-red-400 border-red-400/30 bg-red-400/10'
                                    : urgent ?
                                      'text-amber-400 border-amber-400/30 bg-amber-400/10'
                                    : 'text-pw-success border-pw-success/30 bg-pw-success/10',
                                  )}>
                                  <Clock className='h-2.5 w-2.5 mr-1' />
                                  {label}
                                </span>
                              );
                            })()}
                        </div>

                        <div className='flex flex-wrap gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity'>
                          <Button
                            variant='ghost'
                            title='View Feedback'
                            size='icon'
                            onClick={async () => {
                              setViewingResponses({
                                ...normalizeQuizRecord(quiz),
                                questions: quiz.questions,
                                responses: [],
                                responsesLoading: true,
                              } as any);
                              try {
                                const result =
                                  (
                                    quiz.id ===
                                    DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id
                                  ) ?
                                    {
                                      responses: quiz.responses || [],
                                      nextOffset: null,
                                    }
                                  : await HybridStorage.getQuizResponses(
                                      quiz.id,
                                    );
                                
                                    const respLen = result.responses?.length || 0;
                                    setResponseCounts((current) => ({
                                      ...current,
                                      [quiz.id]: respLen,
                                    }));
                                    setLastViewedCounts((current) => {
                                      const updated = { ...current, [quiz.id]: respLen };
                                      try { localStorage.setItem('pw_last_viewed_counts', JSON.stringify(updated)); } catch {}
                                      return updated;
                                    });

                                    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
                                    if (!online && isLoggedIn) {
                                      toast.info('Offline mode: Showing locally saved responses. Reconnect to sync latest.');
                                    } else if (!online && !isLoggedIn) {
                                      toast.info('Offline & signed out: Showing cached local responses.');
                                    } else if (online && !isLoggedIn) {
                                      toast.info('Signed out: Sign in to view cloud responses across devices.');
                                    } else if ((result as any).isCached || (result as any).isLocalOnly) {
                                      toast.info('Showing locally saved responses.');
                                    }
                                setViewingResponses({
                                  ...normalizeQuizRecord(quiz),
                                  questions: quiz.questions,
                                  responses: result.responses,
                                  responsesNextOffset: result.nextOffset,
                                  responsesLoading: false,
                                } as any);
                              } catch (error: any) {
                                setViewingResponses(null);
                                toast.error(
                                  error?.message ||
                                    'Could not load assessment responses.',
                                );
                              }
                            }}
                            className='h-8 w-8 text-pw-muted hover:text-pw-cyan'>
                            <MessageSquare className='h-4 w-4' />
                          </Button>
                          { quiz.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id && <Button
                            variant='ghost'
                            title='Download as JSON'
                            size='icon'
                            onClick={() => exportQuiz(quiz)}
                            className='h-8 w-8 text-pw-muted hover:text-pw-primary'>
                            <Download className='h-4 w-4' />
                          </Button>
                          }
                          <Button
                            variant='ghost'
                            size='icon'
                            title='Edit'
                            onClick={async () => {
                              const expired = await isExpired(quiz);
                              if (expired) {
                                toast.warning(
                                  `This ${quiz.type || 'assessment'} has expired, adjust expiry time.`,
                                );
                              }
                              const draft = await HybridStorage.getQuizDraft(
                                quiz.id,
                              );
                              setActiveQuiz(
                                draft ? { ...quiz, ...draft } : quiz,
                              );
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

                      <h3 className='text-xl font-bold font-display mt-1'>
                        {quiz.title}
                      </h3>
                      <p
                        className='text-sm text-pw-muted line-clamp-2 mb-5 py-0 my-0 flex-1 whitespace-pre-wrap'
                        dangerouslySetInnerHTML={{
                          __html:
                            quiz.description ?
                              resolvePipedText(quiz.description, {})
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                            : '<em style="opacity:0.5">No description provided.</em>',
                        }}
                      />
                      <div className='flex gap-3 flex-wrap'>
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
                            const route =
                              quiz.customUrl && username ?
                                `/u/${encodeURIComponent(username)}/q/${encodeURIComponent(quiz.customUrl)}`
                              : `/q/${encodeURIComponent(quiz.id)}`;
                            const url = `${window.location.origin}${route}`;
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
                <h3 className='text-xl lg:text-2xl font-bold font-display mb-2'>
                  Start your first quiz
                </h3>
                <p className='text-pw-muted max-w-sm mb-10 px-1 text-xs'>
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
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(0px)' }}
            className='min-w-full flex-1 flex flex-col p-0'>
            <QuizBuilder
              quiz={activeQuiz!}
              onSave={handleSaveQuiz}
              isSaving={isSavingQuiz}
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
              className='relative h-full w-full max-w-2xl bg-pw-surface/80 bkblur sm:border-l sm:border-white/10 p-3 sm:p-6 sm:shadow-2xl overflow-y-auto'>
              <div className='flex justify-between items-center mb-8 gap-3 flex-wrap pt-4'>
                <div className='mb-1'>
                  <h2 className='text-2xl font-bold'>
                    {(
                      viewingResponses.responses &&
                      viewingResponses.responses.length > 0
                    ) ?
                      `Feedback 
                    ${
                      viewingResponses.responses &&
                      `(${viewingResponses.responses?.length})`
                    }`
                    : 'No Feedback'}
                  </h2>
                  <p className='text-sm text-pw-muted'>
                    {viewingResponses.title}
                  </p>
                </div>

                <div className='flex items-center justify-between gap-2 flex-wrap'>
                  {viewingResponses.responses &&
                    viewingResponses.responses.length > 0 && (
                      <>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='outline'
                              title='Download Feedback'
                              size='sm'
                              className='bg-pw-success/10 border-pw-success/20 text-pw-success hover:bg-pw-success/20 h-9 gap-1.5'>
                              <Download size={16} />
                              Export Feedback
                              <ChevronDown size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className='bg-pw-surface/90 bkblur border-white/10'>
                            <DropdownMenuItem
                              onClick={() =>
                                exportResponses(viewingResponses, 'csv')
                              }
                              className='cursor-pointer text-xs'>
                              Export Spreadsheet (.csv)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                exportResponses(viewingResponses, 'json')
                              }
                              className='cursor-pointer text-xs'>
                              Export Structured Data (.json)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                exportResponses(viewingResponses, 'txt')
                              }
                              className='cursor-pointer text-xs'>
                              Export Formatted Report (.txt)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={
                            isEmailingExport ||
                            !user?.email_confirmed_at ||
                            premiumTier === 'free' ||
                            viewingResponses.id ===
                              DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id
                          }
                          title={
                            premiumTier === 'free' ?
                              'Email export is available to active paid subscribers'
                            : 'Email the full export to your verified account email'
                          }
                          onClick={() =>
                            void emailResponseExport(viewingResponses.id, 'csv')
                          }
                          className='h-9 gap-1.5 border-white/10 text-xs'>
                          <Mail size={15} />{' '}
                          {isEmailingExport ? 'Sending…' : 'Email CSV'}
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

              <div className='space-y-6 pb-20'>
                {/* Comprehensive Collapsible Admin Analytics Overview for Feedback Responses */}
                {viewingResponses.responses &&
                  viewingResponses.responses.length > 0 &&
                  (() => {
                    const responses = viewingResponses.responses;
                    const totalParticipants = responses.length;
                    let totalPass = 0;
                    let totalFail = 0;
                    let timeouts = 0;
                    let completions = 0;
                    let selfSubmits = 0;
                    let quits = 0;

                    const categoryStats: Record<
                      string,
                      { attempts: number; pass: number; fail: number }
                    > = {};
                    const questionStats: Record<
                      string,
                      {
                        text: string;
                        correct: number;
                        incorrect: number;
                        wrongChoices: Record<string, number>;
                      }
                    > = {};
                    const countriesCount: Record<string, number> = {};
                    const isProTier = quizUnlocked;

                    const getTakerIdentifier = (
                      resp: any,
                      fallbackIdx: number,
                    ) => {
                      const ud = resp.userData;
                      if (!ud) return `Taker #${fallbackIdx + 1}`;
                      if (typeof ud === 'object') {
                        return (
                          ud.name ||
                          ud.fullName ||
                          ud.pingAuthName ||
                          ud.pingAuthEmail ||
                          ud.email ||
                          ud.username ||
                          ud.phone ||
                          ud.userId ||
                          ud[0] ||
                          (Array.isArray(ud) ? ud[0] : null) ||
                          (Object.values(ud).length > 0 ?
                            String(Object.values(ud)[0])
                          : null) ||
                          `Taker #${fallbackIdx + 1}`
                        );
                      }
                      return String(ud) || `Taker #${fallbackIdx + 1}`;
                    };

                    let bestTaker = { name: 'None', score: -1 };
                    let worstTaker = { name: 'None', score: 999999 };

                    // Survey Question stats
                    const surveyStats: Record<
                      string,
                      { text: string; attempts: number; skipped: number }
                    > = {};
                    viewingResponses.questions.forEach((q) => {
                      surveyStats[q.id] = {
                        text: q.text,
                        attempts: 0,
                        skipped: 0,
                      };
                    });

                    responses.forEach((resp, rIdx) => {
                      const reason = resp.submissionReason || 'completion';
                      if (reason === 'timeout') timeouts++;
                      else if (reason === 'self_submit') selfSubmits++;
                      else if (reason === 'quit') quits++;
                      else completions++;

                      const geoKey =
                        isProTier ?
                          resp.country || resp.continent || 'Unknown'
                        : resp.continent || 'Global';
                      countriesCount[geoKey] =
                        (countriesCount[geoKey] || 0) + 1;

                      const takerName = getTakerIdentifier(resp, rIdx);

                      if (resp.score > bestTaker.score) {
                        bestTaker = { name: takerName, score: resp.score };
                      }
                      if (resp.score < worstTaker.score) {
                        worstTaker = { name: takerName, score: resp.score };
                      }

                      const passCutoff = Math.ceil(
                        (resp.totalQuestions ||
                          viewingResponses.questions.length) * 0.5,
                      );
                      if (resp.score >= passCutoff) totalPass++;
                      else totalFail++;

                      if (resp.categoryScores) {
                        Object.entries(resp.categoryScores).forEach(
                          ([cat, stat]) => {
                            if (!categoryStats[cat])
                              categoryStats[cat] = {
                                attempts: 0,
                                pass: 0,
                                fail: 0,
                              };
                            categoryStats[cat].attempts += stat.total;
                            categoryStats[cat].pass += stat.correct;
                            categoryStats[cat].fail +=
                              stat.total - stat.correct;
                          },
                        );
                      }

                      // Track question stats
                      const answeredQIds = new Set(
                        (resp.answers || []).map((a: any) => a.questionId),
                      );

                      viewingResponses.questions.forEach((q) => {
                        if (surveyStats[q.id]) {
                          if (answeredQIds.has(q.id)) {
                            surveyStats[q.id].attempts++;
                          } else {
                            surveyStats[q.id].skipped++;
                          }
                        }
                      });

                      resp.answers?.forEach((ans) => {
                        const qObj = viewingResponses.questions.find(
                          (q) => q.id === ans.questionId,
                        );
                        if (qObj) {
                          if (!questionStats[qObj.id]) {
                            questionStats[qObj.id] = {
                              text: qObj.text,
                              correct: 0,
                              incorrect: 0,
                              wrongChoices: {},
                            };
                          }
                          if (ans.correct) {
                            questionStats[qObj.id].correct++;
                          } else {
                            questionStats[qObj.id].incorrect++;
                            const choiceText =
                              resolveAnswerToText(
                                viewingResponses,
                                qObj.id,
                                ans.answer,
                              ) || 'Selected Incorrect Option';
                            questionStats[qObj.id].wrongChoices[choiceText] =
                              (questionStats[qObj.id].wrongChoices[
                                choiceText
                              ] || 0) + 1;
                          }
                        }
                      });
                    });

                    const passPct = Math.round(
                      (totalPass / totalParticipants) * 100,
                    );
                    const topFailedQuestion = Object.values(questionStats).sort(
                      (a, b) => b.incorrect - a.incorrect,
                    )[0];

                    const sortedSurveyByAttempts = Object.values(
                      surveyStats,
                    ).sort((a, b) => b.attempts - a.attempts);
                    const mostAttemptedSurveyQ = sortedSurveyByAttempts[0];
                    const mostSkippedSurveyQ = [...sortedSurveyByAttempts].sort(
                      (a, b) => b.skipped - a.skipped,
                    )[0];

                    const isQuizType = viewingResponses.type === 'quiz';

                    return (
                      <Card className='p-3 sm:p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl space-y-4 shadow-xl'>
                        <div className='flex items-center justify-between border-b border-white/5 p-1 pb-2'>
                          <span className='text-xs font-bold uppercase tracking-wider text-pw-primary flex items-center gap-2'>
                            <BarChart2 className='h-4 w-4' />{' '}
                            {isQuizType ?
                              'Quiz Analytics'
                            : 'Survey Response Analytics'}
                          </span>

                          <div className='flex items-center gap-2'>
                            <span className='text-[10px] font-mono text-pw-muted'>
                              {totalParticipants}{' '}
                              {isQuizType ? 'Takers' : 'Respondents'}
                            </span>
                            <ChevronDown
                              onClick={() => setShowAnalytics(!showAnalytics)}
                              className={cn(
                                'cursor-pointer w-4 h-4 text-pw-muted hover:text-white transition-transform',
                                showAnalytics && 'rotate-180',
                              )}
                            />
                          </div>
                        </div>

                        {showAnalytics && (
                          <div className='space-y-4 pt-1'>
                            {/* Quiz Type Specific Pass/Fail Analytics */}
                            {isQuizType ?
                              <>
                                <div className='space-y-1.5'>
                                  <div className='flex justify-between text-xs font-mono font-bold'>
                                    <span className='text-pw-success'>
                                      {totalPass} Passed ({passPct}%)
                                    </span>
                                    <span className='text-pw-danger'>
                                      {totalFail} Failed ({100 - passPct}%)
                                    </span>
                                  </div>
                                  <div className='w-full bg-white/10 h-2.5 rounded-full overflow-hidden flex'>
                                    <div
                                      style={{ width: `${passPct}%` }}
                                      className='bg-pw-success h-full transition-all duration-300'
                                    />
                                    <div
                                      style={{ width: `${100 - passPct}%` }}
                                      className='bg-pw-danger h-full transition-all duration-300'
                                    />
                                  </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-center'>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Full Finishes
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-cyan'>
                                      {completions}
                                    </span>
                                  </div>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Timeouts
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-warning'>
                                      {timeouts}
                                    </span>
                                  </div>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Self-Submits
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-primary'>
                                      {selfSubmits}
                                    </span>
                                  </div>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Quits
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-danger'>
                                      {quits}
                                    </span>
                                  </div>
                                </div>

                                {/* Participant Performance Leaders */}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                                  <div className='p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1'>
                                    <span className='text-[9px] text-pw-muted uppercase font-bold block'>
                                      Top Scoring Participant
                                    </span>
                                    <span className='font-bold text-pw-success block truncate'>
                                      {bestTaker.name} ({bestTaker.score} pts)
                                    </span>
                                  </div>
                                  <div className='p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1'>
                                    <span className='text-[9px] text-pw-muted uppercase font-bold block'>
                                      Lowest Scoring Participant
                                    </span>
                                    <span className='font-bold text-pw-danger block truncate'>
                                      {worstTaker.name} ({worstTaker.score} pts)
                                    </span>
                                  </div>
                                </div>

                                {/* Most Failed Question & Top Wrong Choice */}
                                {topFailedQuestion &&
                                  topFailedQuestion.incorrect > 0 && (
                                    <div className='p-3 rounded-xl bg-pw-danger/10 border border-pw-danger/20 text-xs space-y-1.5'>
                                      <span className='text-[9px] font-bold uppercase text-pw-danger block'>
                                        Most Missed Question
                                      </span>
                                      <p className='font-bold text-white line-clamp-1'>
                                        &quot;{topFailedQuestion.text}&quot;
                                      </p>
                                      <div className='flex items-center justify-between text-[10px] text-pw-muted font-mono flex-wrap gap-1'>
                                        <span>
                                          Missed {topFailedQuestion.incorrect}{' '}
                                          times out of{' '}
                                          {topFailedQuestion.correct +
                                            topFailedQuestion.incorrect}{' '}
                                          attempts
                                        </span>
                                        {Object.keys(
                                          topFailedQuestion.wrongChoices || {},
                                        ).length > 0 && (
                                          <span className='text-pw-danger font-bold'>
                                            Top Wrong Option:{' '}
                                            {
                                              Object.entries(
                                                topFailedQuestion.wrongChoices,
                                              ).sort(
                                                (a, b) =>
                                                  (b[1] as number) -
                                                  (a[1] as number),
                                              )[0][0]
                                            }
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Category Performance Analysis */}
                                {Object.keys(categoryStats).length > 0 && (
                                  <div className='space-y-2 pt-2 border-t border-white/5'>
                                    <span className='text-[10px] font-bold uppercase tracking-wider text-pw-muted block'>
                                      Category Performance Analysis
                                    </span>
                                    <div className='space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1'>
                                      {Object.entries(categoryStats).map(
                                        ([cat, stat]) => {
                                          const catPassPct =
                                            stat.attempts > 0 ?
                                              Math.round(
                                                (stat.pass / stat.attempts) *
                                                  100,
                                              )
                                            : 0;
                                          return (
                                            <div
                                              key={cat}
                                              className='p-2 bg-white/5 rounded-xl flex items-center justify-between text-xs'>
                                              <span className='font-bold text-white uppercase text-[10px]'>
                                                {cat}
                                              </span>
                                              <div className='flex items-center gap-3 font-mono text-[10px]'>
                                                <span>
                                                  {stat.pass} Pass / {stat.fail}{' '}
                                                  Fail
                                                </span>
                                                <span
                                                  className={cn(
                                                    'font-bold',
                                                    catPassPct >= 50 ?
                                                      'text-pw-success'
                                                    : 'text-pw-danger',
                                                  )}>
                                                  {catPassPct}%
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            : /* Survey Specific Response Distribution & Averages */
                              <div className='space-y-3'>
                                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-center'>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Completed
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-cyan'>
                                      {completions}
                                    </span>
                                  </div>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Self-Submits
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-primary'>
                                      {selfSubmits}
                                    </span>
                                  </div>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Timeouts
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-warning'>
                                      {timeouts}
                                    </span>
                                  </div>
                                  <div className='p-2.5 bg-white/5 rounded-xl border border-white/5'>
                                    <span className='text-[8px] font-bold uppercase text-pw-muted block'>
                                      Quits
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-danger'>
                                      {quits}
                                    </span>
                                  </div>
                                </div>

                                {/* Survey Most Attempted and Most Skipped Insights */}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                                  {mostAttemptedSurveyQ && (
                                    <div className='p-2.5 rounded-xl bg-pw-success/10 border border-pw-success/20 space-y-1'>
                                      <span className='text-[9px] text-pw-success uppercase font-bold block'>
                                        Most Attempted Question
                                      </span>
                                      <p className='font-bold text-white line-clamp-1'>
                                        &quot;{mostAttemptedSurveyQ.text}&quot;
                                      </p>
                                      <span className='text-[10px] font-mono text-pw-muted block'>
                                        {mostAttemptedSurveyQ.attempts} out of{' '}
                                        {totalParticipants} respondents (
                                        {Math.round(
                                          (mostAttemptedSurveyQ.attempts /
                                            totalParticipants) *
                                            100,
                                        )}
                                        %)
                                      </span>
                                    </div>
                                  )}
                                  {mostSkippedSurveyQ && (
                                    <div className='p-2.5 rounded-xl bg-pw-warning/10 border border-pw-warning/20 space-y-1'>
                                      <span className='text-[9px] text-pw-warning uppercase font-bold block'>
                                        Most Skipped Question
                                      </span>
                                      <p className='font-bold text-white line-clamp-1'>
                                        &quot;{mostSkippedSurveyQ.text}&quot;
                                      </p>
                                      <span className='text-[10px] font-mono text-pw-muted block'>
                                        {mostSkippedSurveyQ.skipped} skipped (
                                        {Math.round(
                                          (mostSkippedSurveyQ.skipped /
                                            totalParticipants) *
                                            100,
                                        )}
                                        %)
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className='space-y-2 pt-2 border-t border-white/5'>
                                  <span className='text-[10px] font-bold uppercase tracking-wider text-pw-muted block'>
                                    Survey Questions Overview (
                                    {viewingResponses.questions.length})
                                  </span>
                                  <div className='space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar'>
                                    {viewingResponses.questions.map(
                                      (quest, qIdx) => (
                                        <div
                                          key={quest.id}
                                          className='p-2 bg-white/5 rounded-xl text-xs flex items-center justify-between gap-2'>
                                          <div className='min-w-0 flex-1'>
                                            <p className='font-bold text-white truncate'>
                                              Q{qIdx + 1}: {quest.text}
                                            </p>
                                            <span className='text-[9px] text-pw-muted uppercase font-mono'>
                                              Type: {quest.type}
                                            </span>
                                          </div>
                                          {quest.category && (
                                            <span className='px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-pw-primary/10 text-pw-primary border border-pw-primary/20 shrink-0'>
                                              {quest.category}
                                            </span>
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            }

                            {/* Geographic Locations Breakdown Tags */}
                            {Object.keys(countriesCount).length > 0 && (
                              <div className='pt-2 border-t border-white/5 space-y-1.5'>
                                <div className='flex items-center justify-between'>
                                  <span className='text-[10px] font-bold uppercase tracking-wider text-pw-muted block'>
                                    Participant Locations (
                                    {Object.keys(countriesCount).length})
                                  </span>
                                  {!isProTier && (
                                    <span className='text-[9px] text-pw-warning font-bold'>
                                      Upgrade to Pro for Specific Country
                                      Breakdown
                                    </span>
                                  )}
                                </div>
                                <div className='flex items-center flex-wrap gap-1.5'>
                                  {Object.entries(countriesCount).map(
                                    ([loc, cnt], i) => (
                                      <span
                                        key={loc + i}
                                        className='px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 border border-white/10 text-pw-cyan font-bold'>
                                        📍 {loc} ({cnt})
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })()}

                {(viewingResponses as any).responsesLoading ? (
                  <div className='py-20 text-center flex flex-col items-center justify-center gap-3'>
                    <div className='animate-spin rounded-full h-8 w-8 border-2 border-pw-cyan border-t-transparent' />
                    <p className='text-xs font-semibold text-pw-muted'>Loading responses and media feedback...</p>
                  </div>
                ) : (!viewingResponses.responses || viewingResponses.responses.length === 0) ? (
                  <div className='py-20 text-center opacity-40'>
                    <MessageSquare
                      size={40}
                      className='mx-auto mb-4'
                    />
                    <p>No responses yet.</p>
                  </div>
                ) : [...(viewingResponses.responses || [])]
                    .sort((a, b) => new Date(b.timestamp || b.startedAt || 0).getTime() - new Date(a.timestamp || a.startedAt || 0).getTime())
                    .map((resp, idx) => (
                      <Card
                        key={idx}
                        className='p-3 bg-white/5 bkblur ring-0 gap-0 space-y-2 relative overflow-hidden'>
                        <div className='flex justify-between items-start px-2'>
                          <div>
                            <p className='font-bold text-pw-cyan truncate max-w-[200px]'>
                              {resp.userData.name ||
                                resp.userData.email ||
                                resp.userData.pingAuthName ||
                                resp.userData.pingAuthEmail ||
                                resp.userData[0] ||
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

                        <div className='flex flex-wrap gap-x-4 gap-y-1 py-2 border-y border-white/5 px-1 mb-1'>
                          {Object.entries(resp.userData).map(
                            ([key, val], i) => (
                              <div
                                key={key + i}
                                className='flex gap-1.5 text-[11px]'>
                                <span className='text-pw-muted font-bold uppercase'>
                                  {key}:
                                </span>
                                <span className='text-white'>{val}</span>
                              </div>
                            ),
                          )}
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
                              className='h-7 text-[10px] text-pw-cyan font-bold p-0 px-2 rounded-xl'
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
                                className='overflow-hidden bg-pw-surface/70 rounded-xl bkblur p-1 mt-2'>
                                {resp.answers.map((ans, i) => {
                                  const question =
                                    viewingResponses.questions.find(
                                      (q) => q.id === ans.questionId,
                                    );
                                  const resolvedAnswer = resolveAnswerToText(
                                    viewingResponses,
                                    ans.questionId,
                                    ans.answer,
                                  );
                                  const resolvedCorrect = resolveCorrectText(
                                    viewingResponses,
                                    ans.questionId,
                                  );

                                  return (
                                    <div
                                      key={i}
                                      className={cn(
                                        'p-1 py-2 space-y-0.5',
                                        i == resp.answers.length - 1 ?
                                          ''
                                        : 'border-b border-white/10',
                                      )}>
                                      <p className='text-[10px] font-bold text-pw-muted uppercase'>
                                        Question {i + 1}
                                      </p>
                                      <p
                                        className='text-xs font-medium leading-relaxed'
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            formatDetailVars(
                                              (question?.text as string) || '',
                                              resp.userData,
                                              true,
                                            ) || 'Question removed.',
                                        }}
                                      />

                                      <div className='flex items-start gap-2 pt-1 flex-wrap'>
                                        <p className='text-[10px] font-bold text-pw-cyan shrink-0'>
                                          ANSWER:
                                        </p>
                                        {ans.fileUrl ?
                                          <div className='flex items-center w-full justify-between bg-white/5 rounded-2xl border border-white/10 overflow-hidden'>
                                            {(() => {
                                              const previewUrl =
                                                unpackPingWorldMediaUrl(
                                                  String(ans.fileUrl),
                                                ).url || String(ans.fileUrl);
                                              const fileType =
                                                (
                                                  previewUrl.startsWith(
                                                    'data:image/',
                                                  )
                                                ) ?
                                                  'image'
                                                : (
                                                  previewUrl.startsWith(
                                                    'data:video/',
                                                  )
                                                ) ?
                                                  'video'
                                                : (
                                                  previewUrl.startsWith(
                                                    'data:audio/',
                                                  )
                                                ) ?
                                                  'audio'
                                                : 'documents';
                                              return fileType ?
                                                  <button
                                                    type='button'
                                                    onClick={() =>
                                                      openFile({
                                                        src: previewUrl,
                                                        name: String(
                                                          ans.fileName ||
                                                            'Response image',
                                                        ),
                                                      })
                                                    }
                                                    className='flex flex-col gap-1 w-full cursor-zoom-in'>
                                                    {fileType === 'image' ?
                                                      <img
                                                        src={previewUrl}
                                                        alt='Uploaded response preview'
                                                        className='max-h-48 max-w-full rounded-xl object-contain'
                                                      />
                                                    : fileType === 'video' ?
                                                      <video
                                                        src={previewUrl}
                                                        about='Iploaded response preview'
                                                        controls
                                                        playsInline
                                                        className='max-w-full rounded-xl object-contain'
                                                      />
                                                    : <div className='flex flex-1 gap-2 items-center bg-white/5 text-primary rounded-xl p-2 px-2.5 m-1'>
                                                        <File className='text-white text-sm' />{' '}
                                                        {ans.fileName}
                                                      </div>
                                                    }
                                                    <span className='text-[10px] text-pw-cyan p-1 text-center w-full'>
                                                      Click{' '}
                                                      {String(fileType) ||
                                                        'Response'}{' '}
                                                      to view full screen
                                                    </span>
                                                  </button>
                                                : null;
                                            })()}
                                          </div>
                                        : <p
                                            className={cn(
                                              'text-[11px] font-mono',
                                              ans.correct === undefined ?
                                                'text-white/80'
                                              : ans.correct ? 'text-pw-success'
                                              : 'text-pw-danger',
                                            )}
                                            dangerouslySetInnerHTML={{
                                              __html: formatDetailVars(
                                                resolvedAnswer,
                                                resp.userData,
                                                false,
                                                true,
                                              ),
                                            }}
                                          />
                                        }
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
                                              )}
                                              dangerouslySetInnerHTML={{
                                                __html: formatDetailVars(
                                                  resolvedCorrect,
                                                  resp.userData,
                                                  false,
                                                  true,
                                                ),
                                              }}
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
                {viewingResponses.responsesNextOffset !== null &&
                  viewingResponses.responsesNextOffset !== undefined && (
                    <div className='flex justify-center py-3'>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={viewingResponses.responsesLoadingMore}
                        onClick={async () => {
                          if (viewingResponses.responsesLoadingMore) return;
                          setViewingResponses((current) =>
                            current ?
                              { ...current, responsesLoadingMore: true }
                            : null,
                          );
                          try {
                            const page = await HybridStorage.getQuizResponses(
                              viewingResponses.id,
                              viewingResponses.responsesNextOffset || 0,
                            );
                            setViewingResponses((current) =>
                              current ?
                                {
                                  ...current,
                                  responses: [
                                    ...(current.responses || []),
                                    ...page.responses,
                                  ],
                                  responsesNextOffset: page.nextOffset,
                                  responsesLoadingMore: false,
                                }
                              : null,
                            );
                          } catch {
                            setViewingResponses((current) =>
                              current ?
                                { ...current, responsesLoadingMore: false }
                              : null,
                            );
                            toast.error('More responses could not be loaded.');
                          }
                        }}>
                        {viewingResponses.responsesLoadingMore ?
                          'Loading…'
                        : 'Load more responses'}
                      </Button>
                    </div>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Dialog
        open={isNameModalOpen}
        onOpenChange={setIsNameModalOpen}>
        <DialogContent className='max-w-md w-[95%] pt-5 bg-[#0c0d1c]/70 bkbklur border border-white/10 rounded-3xl shadow-2xl text-pw-text z-50 animate-fade-in'>
          <DialogHeader className='p-2'>
            <DialogTitle className='text-xl font-extrabold font-display'>
              Export Quiz
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
                className='bg-white/5 bkblur h-11 pl-2 text-sm border border-white/10 focus-visible:ring-0 w-full rounded-xl pr-15.5'
              />
              <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-pw-primary font-mono uppercase'>
                .{filenameExtension}
              </span>
            </div>
          </div>

          <DialogFooter className='flex flex-row flex-wrap gap-2 rounded-3xl'>
            <button
              onClick={() => setIsNameModalOpen(false)}
              className='flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-pw-muted hover:text-pw-text transition-all'>
              Cancel
            </button>
            <button
              onClick={handleConfirmFilename}
              className='flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold text-white transition-all'>
              Export
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
