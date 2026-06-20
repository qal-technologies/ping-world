'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  Plus,
  Save,
  Trash2,
  Eye,
  Download,
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Share2,
  FileJson,
  X,
  Pencil,
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
  BadgeQuestionMark,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HybridStorage } from '@/lib/storage-utils';

// --- Types ---
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'dropdown'
  | 'checkbox'
  | 'input';

export interface QuizOption {
  id: string; // questionId-index or uuid
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: (string | QuizOption)[];
  correctExplanation?: string;
  correctIndex: any; // index, bool, string (optionId), or Array<string> (optionIds)
  accessory?: 'none' | 'calculator';
}

interface Details {
  title: string;
  type:
    | 'name'
    | 'sex'
    | 'input'
    | 'number'
    | 'tel'
    | 'email'
    | 'dropdown'
    | 'others';
  //necessary for dropdown
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
  questions: Question[];
  canGoBack?: boolean;
  showScore?: boolean;
  askDetails?: Details[];
  //default time is 10mins
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
  const [editedQuiz, setEditedQuiz] = useState<Quiz>(quiz);
  const [currentStep, setCurrentStep] = useState<number>(-1); // -1 for settings

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

  const addQuestion = () => {
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
    };
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
    <div className='flex flex-col w-full gap-8'>
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
            onClick={() => onSave(editedQuiz)}
            className='btn-primary h-10 gap-2'>
            <Save className='h-4 w-4' /> Save Quiz
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-5 gap-8'>
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

          <div className='flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar'>
            {editedQuiz.questions.map((q, i) => (
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
          </div>

          <Button
            onClick={addQuestion}
            variant='outline'
            className='w-full border-dashed border-white/20 hover:border-pw-primary/50 hover:bg-pw-primary/5 gap-2 h-12'>
            <Plus className='h-4 w-4' /> Add Question
          </Button>
        </div>

        {/* Editor Area */}
        <div className='lg:col-span-3'>
          <Card className='card-glow p-4 pt-6 lg:pt-9 lg:p-8 min-h-[450px]'>
            {currentStep === -1 ?
              <div className='space-y-6'>
                <h3 className='text-xl font-bold flex items-center gap-2 mt-1'>
                  <Settings2 className='h-5 w-5 text-pw-primary' /> Quiz
                  Settings
                </h3>
                <div className='space-y-4 w-full'>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                      Quiz Type
                    </label>
                    <div className='flex gap-2 p-0.5 bg-white/5 border border-white/5 rounded-2xl'>
                      <Button
                        variant='ghost'
                        onClick={() =>
                          setEditedQuiz({ ...editedQuiz, type: 'quiz' })
                        }
                        className={cn(
                          'flex-1 h-8 text-xs rounded-2xl',
                          editedQuiz.type === 'quiz' &&
                            'bg-pw-primary text-white shadow-lg',
                        )}>
                        Quiz
                      </Button>
                      <Button
                        variant='ghost'
                        onClick={() =>
                          setEditedQuiz({ ...editedQuiz, type: 'survey' })
                        }
                        className={cn(
                          'flex-1 h-8 text-xs rounded-2xl',
                          editedQuiz.type === 'survey' &&
                            'bg-pw-primary text-white shadow-lg',
                        )}>
                        Survey
                      </Button>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                      Quiz Title
                    </label>
                    <Input
                      value={editedQuiz.title}
                      onChange={(e) =>
                        setEditedQuiz({ ...editedQuiz, title: e.target.value })
                      }
                      placeholder='e.g., General Knowledge Blast'
                      className='bg-white/5 border-white/10 h-11 focus:border-pw-primary'
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                      Description
                    </label>
                    <textarea
                      value={editedQuiz.description}
                      onChange={(e) =>
                        setEditedQuiz({
                          ...editedQuiz,
                          description: e.target.value,
                        })
                      }
                      placeholder='What is this quiz about?'
                      className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-2 text-sm focus:border-pw-primary focus:outline-none focus:ring-0 resize-none'
                    />
                  </div>

                  <div className='divider opacity-80' />
                  {editedQuiz.type === 'quiz' && (
                    <>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                            Show Score
                          </label>
                          <div className='flex items-center gap-2'>
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
                                'w-full h-10 gap-2',
                                editedQuiz.showScore ?
                                  'bg-pw-primary/10 border-pw-primary text-pw-primary'
                                : 'bg-white/5 border-white/10',
                              )}>
                              {editedQuiz.showScore ?
                                <Check className='h-4 w-4' />
                              : <X className='h-4 w-4' />}
                              {editedQuiz.showScore ? 'Visible' : 'Hidden'}
                            </Button>
                          </div>
                        </div>

                        <div className='space-y-2'>
                          <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                            Can Go Back
                          </label>
                          <div className='flex items-center gap-2'>
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
                                'w-full h-10 gap-2',
                                editedQuiz.canGoBack ?
                                  'bg-pw-primary/10 border-pw-primary text-pw-primary'
                                : 'bg-white/5 border-white/10',
                              )}>
                              {editedQuiz.canGoBack ?
                                <Check className='h-4 w-4' />
                              : <X className='h-4 w-4' />}
                              {editedQuiz.canGoBack ? 'Enabled' : 'Disabled'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                            Timer (Minutes)
                          </label>
                          <div className='flex items-center gap-3'>
                            <Input
                              type='number'
                              min={0}
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
                              placeholder='10 (opt)'
                              className='bg-white/5 border-white/10 h-10 focus:border-pw-primary'
                            />
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  hasTimer: !editedQuiz.hasTimer,
                                })
                              }
                              className={cn(
                                'h-10 px-4 uppercase',
                                editedQuiz.hasTimer ? 'text-pw-primary' : (
                                  'text-pw-muted'
                                ),
                              )}>
                              <Clock className='h-4 w-4 mr-2' />{' '}
                              {editedQuiz.hasTimer ? 'On' : 'Off'}
                            </Button>
                          </div>
                        </div>

                        <div className='space-y-2'>
                          <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                            Allow Retry
                          </label>
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
                              'w-full h-10 gap-2 font-bold transition-all',
                              editedQuiz.allowRetry ?
                                'bg-pw-success/10 border-pw-success text-pw-success'
                              : 'bg-pw-danger/10 border-pw-danger text-pw-danger',
                            )}>
                            <ShieldCheck className='h-4 w-4' />
                            {editedQuiz.allowRetry ? 'ALLOWED' : 'RESTRICTED'}
                          </Button>
                        </div>
                        <div className='col-span-2 space-y-2'>
                          <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                            Security (Anti-Cheat)
                          </label>
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
                              'w-full h-10 gap-2 font-bold transition-all',
                              editedQuiz.enforceSecurity ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10',
                            )}>
                            <ShieldCheck className='h-4 w-4' />
                            {editedQuiz.enforceSecurity ?
                              'STRICT MODE'
                            : 'STANDARD MODE'}
                          </Button>
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-4 pb-2'>
                        <div className='space-y-2'>
                          <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                            Random Options
                          </label>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                randomizeOptions: !editedQuiz.randomizeOptions,
                              })
                            }
                            className={cn(
                              'w-full h-10 gap-2 font-bold transition-all',
                              editedQuiz.randomizeOptions ?
                                'bg-pw-cyan/10 border-pw-cyan text-pw-cyan'
                              : 'bg-white/5 border-white/10',
                            )}>
                            <RefreshCw
                              className={cn(
                                'h-4 w-4',
                                editedQuiz.randomizeOptions &&
                                  'animate-spin-slow',
                              )}
                            />
                            {editedQuiz.randomizeOptions ? 'ON' : 'OFF'}
                          </Button>
                        </div>

                        <div className='space-y-2'>
                          <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                            Random Questions
                          </label>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setEditedQuiz({
                                ...editedQuiz,
                                randomizeQuestions:
                                  !editedQuiz.randomizeQuestions,
                              })
                            }
                            className={cn(
                              'w-full h-10 gap-2 font-bold transition-all',
                              editedQuiz.randomizeQuestions ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10',
                            )}>
                            <BadgeQuestionMark
                              className={cn(
                                'h-4 w-4',
                                editedQuiz.randomizeQuestions &&
                                  'animate-pulse',
                              )}
                            />
                            {editedQuiz.randomizeQuestions ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                      </div>

                      <div className='divider opacity-80' />
                    </>
                  )}

                  <div className='space-y-4'>
                    <div className='flex justify-between items-center'>
                      <h3 className='text-lg font-bold flex items-center gap-2'>
                        <Type className='h-4 w-4 text-pw-cyan' /> Ask Details
                      </h3>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          const newDetails: Details[] = [
                            ...(editedQuiz.askDetails || []),
                            { title: 'New Field', type: 'input' },
                          ];
                          setEditedQuiz({
                            ...editedQuiz,
                            askDetails: newDetails,
                          });
                        }}
                        className='h-8 text-[10px] gap-2 border-white/10'>
                        <Plus className='h-3 w-3' /> Add Detail
                      </Button>
                    </div>

                    <div className='space-y-2'>
                      {(editedQuiz.askDetails || []).map((detail, idx) => (
                        <>
                          <div
                            key={idx}
                            className='flex gap-2 items-center bg-white/5 p-1 rounded-xl border border-white/5'>
                            <Input
                              value={detail.title}
                              minLength={1}
                              //for number input
                              min={0}
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
                              className='bg-transparent border-none h-8 text-xs focus-visible:ring-0'
                              placeholder='Field Label'
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-6 text-[10px] uppercase font-bold tracking-tighter bg-white/5'>
                                  {detail.type}
                                  <ChevronDown size={18} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className='bg-pw-surface border-white/10 min-w-[100px]'>
                                {[
                                  'name',
                                  'sex',
                                  'input',
                                  'number',
                                  'tel',
                                  'email',
                                  'dropdown',
                                  'others',
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
                                    }}>
                                    {t.toUpperCase()}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-pw-danger/50 hover:text-pw-danger'
                              onClick={() => {
                                const newDetails = (
                                  editedQuiz.askDetails || []
                                ).filter((_, i) => i !== idx);
                                setEditedQuiz({
                                  ...editedQuiz,
                                  askDetails: newDetails,
                                });
                              }}>
                              <Trash2 className='h-3.5 w-3.5' />
                            </Button>
                          </div>
                          {editedQuiz?.askDetails &&
                            editedQuiz?.askDetails[idx].type === 'dropdown' && (
                              <>
                                <Input
                                  placeholder='Add dropdown options here'
                                  className='h-9 text-xs focus-visible:ring-0'
                                  value={editedQuiz?.askDetails[
                                    idx
                                  ].options?.join(',')}
                                  onChange={(e) => {
                                    const newDetails = [
                                      ...(editedQuiz.askDetails || []),
                                    ];
                                    newDetails[idx].options =
                                      e.target.value.split(',');
                                    setEditedQuiz({
                                      ...editedQuiz,
                                      askDetails: newDetails,
                                    });
                                  }}
                                />
                                <p className='text-xs opacity-60 mb-6 px-2'>
                                  Seperate each option with a comma
                                </p>
                              </>
                            )}
                        </>
                      ))}
                      {(editedQuiz.askDetails?.length || 0) === 0 && (
                        <p className='text-[10px] text-pw-muted italic'>
                          No user details requested. Quiz will start
                          immediately.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='divider opacity-80 mt-2' />
                  {editedQuiz.type === 'quiz' && (
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                          Instant Feedback
                        </label>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setEditedQuiz({
                              ...editedQuiz,
                              correctOption: !editedQuiz.correctOption,
                            })
                          }
                          className={cn(
                            'w-full h-10 gap-2',
                            editedQuiz.correctOption ?
                              'bg-pw-primary/10 border-pw-primary text-pw-primary'
                            : 'bg-white/5 border-white/10',
                          )}>
                          {editedQuiz.correctOption ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                      <div className='space-y-2'>
                        <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                          Show Explanations
                        </label>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setEditedQuiz({
                              ...editedQuiz,
                              correctOptionDes: !editedQuiz.correctOptionDes,
                            })
                          }
                          className={cn(
                            'w-full h-10 gap-2',
                            editedQuiz.correctOptionDes ?
                              'bg-pw-primary/10 border-pw-primary text-pw-primary'
                            : 'bg-white/5 border-white/10',
                          )}>
                          {editedQuiz.correctOptionDes ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <h3 className='text-lg font-bold flex items-center gap-2 mt-8'>
                    <CheckCircle2 className='h-4 w-4 text-pw-success' /> End
                    Screen Settings
                  </h3>

                  <div className='space-y-4'>
                    {editedQuiz.type === 'quiz' && (
                      <div className='flex items-center justify-between p-2 pl-2 rounded-2xl bg-white/5 border border-white/5'>
                        <span className='text-xs font-bold text-pw-muted uppercase'>
                          Show Performance Stats
                        </span>
                        <Button
                          variant='ghost'
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
                            'h-8 px-4',
                            editedQuiz.endScreen.showPerformance ?
                              'text-pw-success'
                            : 'text-pw-muted',
                          )}>
                          {editedQuiz.endScreen.showPerformance ? 'ON' : 'OFF'}
                        </Button>
                      </div>
                    )}

                    <div className='space-y-2'>
                      <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                        Finish Title
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
                        placeholder='e.g., Congratulations!'
                        className='bg-white/5 border-white/10 h-10 focus:border-pw-primary'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                        Finish Message
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
                        placeholder='e.g., You nailed it! Feel free to share your score.'
                        className='w-full h-20 bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:border-pw-primary focus:outline-none focus:ring-0 resize-none'
                      />
                    </div>
                  </div>
                </div>
              </div>
            : <div className='space-y-8'>
                <div className='flex items-center justify-between flex-wrap'>
                  <h3 className='text-xl font-bold'>
                    Question {currentStep + 1}
                  </h3>
                  <div className='flex gap-2 flex-wrap'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => moveQuestion(currentStep, 'up')}
                      disabled={currentStep === 0}
                      className='h-9 w-9 text-pw-muted hover:text-pw-primary'>
                      <ArrowUp className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
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
                          ] as QuestionType[]
                        ).map((type) => (
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
                                  { id: 'true', text: 'true' },
                                  { id: 'false', text: 'False' },
                                ];
                                q.correctIndex = 'true';
                              } else if (type === 'input') {
                                q.options = [];
                                q.correctIndex = '';
                              } else if (type === 'checkbox') {
                                q.correctIndex = [];
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
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant={
                        (
                          editedQuiz.questions[currentStep].accessory ===
                          'calculator'
                        ) ?
                          'default'
                        : 'outline'
                      }
                      size='sm'
                      onClick={() => {
                        const q = {
                          ...editedQuiz.questions[currentStep],
                          accessory:
                            (
                              editedQuiz.questions[currentStep].accessory ===
                              'calculator'
                            ) ?
                              'none'
                            : 'calculator',
                        } as Question;
                        updateQuestion(currentStep, q);
                      }}
                      className='h-9 px-3 gap-2 text-[10px] uppercase font-bold tracking-widest border-white/10'>
                      Calc
                    </Button>

                    <div className='w-[1px] h-9 bg-white/5 mx-2' />

                    <div className='gap-2 flex'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() =>
                          setCurrentStep(Math.max(0, currentStep - 1))
                        }
                        disabled={currentStep === 0}>
                        <ChevronLeft className='h-5 w-5' />
                      </Button>

                      <Button
                        variant='ghost'
                        size='icon'
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
                    <textarea
                      value={editedQuiz.questions[currentStep].text}
                      onChange={(e) =>
                        updateQuestion(currentStep, {
                          ...editedQuiz.questions[currentStep],
                          text: e.target.value,
                        })
                      }
                      placeholder='Enter your question'
                      className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-pw-primary focus:outline-none resize-none transition-all'
                    />
                  </div>

                  <div className='space-y-3'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                      Answers & Logic
                    </label>

                    {editedQuiz.questions[currentStep].type === 'input' ?
                      <div className='space-y-4'>
                        <div className='bg-pw-primary/5 p-4 rounded-2xl border border-pw-primary/10 flex flex-col items-center text-center gap-4'>
                          <Type className='h-8 w-8 text-pw-primary opacity-50' />
                          <div>
                            <p className='text-sm font-bold'>Input Question</p>
                            <p className='text-[10px] text-pw-muted max-w-[200px]'>
                              Takers will type their answer. Leave the "Keyword"
                              field empty to accept any text as correct.
                            </p>
                          </div>
                          <Input
                            value={
                              editedQuiz.questions[currentStep].correctIndex ||
                              ''
                            }
                            onChange={(e) =>
                              updateQuestion(currentStep, {
                                ...editedQuiz.questions[currentStep],
                                correctIndex: e.target.value,
                              })
                            }
                            placeholder='Keyword (Optional)'
                            className='bg-white/5 border-white/10 h-10 text-center focus:border-pw-primary'
                          />
                        </div>

                        {editedQuiz.type === 'quiz' && (
                          <div className='space-y-2 mt-4'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest pl-1'>
                              Explanation (Optional)
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
                              className='w-full h-20 bg-white/5 border border-white/10 rounded-xl p-4 text-xs focus:border-pw-primary focus:outline-none resize-none'
                            />
                          </div>
                        )}
                      </div>
                    : editedQuiz.questions[currentStep].type === 'true_false' ?
                      <div className='space-y-4'>
                        <div className='grid grid-cols-2 gap-4'>
                          {['True', 'False'].map((val) => (
                            <Button
                              key={val}
                              variant={
                                (
                                  String(
                                    editedQuiz.questions[currentStep]
                                      .correctIndex,
                                  ).toLowerCase() === val.toLowerCase()
                                ) ?
                                  'default'
                                : 'outline'
                              }
                              onClick={() =>
                                updateQuestion(currentStep, {
                                  ...editedQuiz.questions[currentStep],
                                  correctIndex: val.toLowerCase(),
                                })
                              }
                              className={cn(
                                'h-12 text-lg font-bold border-white/5',
                                String(
                                  editedQuiz.questions[currentStep]
                                    .correctIndex,
                                ).toLowerCase() === val.toLowerCase() &&
                                  'bg-pw-primary shadow-xl shadow-pw-primary/20',
                              )}>
                              {val}
                            </Button>
                          ))}
                        </div>
                        {editedQuiz.type === 'quiz' && (
                          <div className='space-y-2'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest pl-1'>
                              Explanation (Optional)
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
                              placeholder='Explain why this answer is correct...'
                              className='w-full h-20 bg-white/5 border border-white/10 rounded-xl p-4 text-xs focus:border-pw-primary focus:outline-none resize-none'
                            />
                          </div>
                        )}
                      </div>
                    : <div className='space-y-3'>
                        {editedQuiz.questions[currentStep].options.map(
                          (opt, idx) => {
                            const q = editedQuiz.questions[currentStep];
                            const optObj =
                              typeof opt === 'string' ?
                                { id: `${q.id}-opt-${idx}`, text: opt }
                              : opt;
                            const isCorrect =
                              q.type === 'checkbox' ?
                                Array.isArray(q.correctIndex) &&
                                q.correctIndex.includes(optObj.id)
                              : q.correctIndex === optObj.id;

                            return (
                              <div
                                key={optObj.id || idx}
                                className='flex gap-3'>
                                <button
                                  onClick={() => {
                                    if (q.type === 'checkbox') {
                                      const current =
                                        Array.isArray(q.correctIndex) ?
                                          q.correctIndex
                                        : [];
                                      const next =
                                        current.includes(optObj.id) ?
                                          current.filter(
                                            (id) => id !== optObj.id,
                                          )
                                        : [...current, optObj.id];
                                      updateQuestion(currentStep, {
                                        ...q,
                                        correctIndex: next,
                                      });
                                    } else {
                                      updateQuestion(currentStep, {
                                        ...q,
                                        correctIndex: optObj.id,
                                      });
                                    }
                                  }}
                                  className={cn(
                                    'w-10 h-10 rounded-lg border flex items-center justify-center transition-all shrink-0',
                                    isCorrect ?
                                      'bg-pw-primary border-pw-primary text-white shadow-lg'
                                    : 'bg-white/5 border-white/10 text-pw-muted hover:border-white/20',
                                  )}>
                                  {isCorrect ?
                                    <Check className='h-4 w-4' />
                                  : idx + 1}
                                </button>
                                <Input
                                  value={optObj.text}
                                  onChange={(e) => {
                                    const newOptions = [
                                      ...editedQuiz.questions[currentStep]
                                        .options,
                                    ];
                                    newOptions[idx] = {
                                      ...optObj,
                                      text: e.target.value,
                                    };
                                    updateQuestion(currentStep, {
                                      ...editedQuiz.questions[currentStep],
                                      options: newOptions,
                                    });
                                  }}
                                  placeholder={`Option ${idx + 1}`}
                                  className='bg-white/5 border-white/10 h-10 focus:border-pw-primary'
                                />
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => {
                                    const newOptions = editedQuiz.questions[
                                      currentStep
                                    ].options.filter((_, i) => i !== idx);
                                    updateQuestion(currentStep, {
                                      ...editedQuiz.questions[currentStep],
                                      options: newOptions,
                                    });
                                  }}
                                  className='h-10 w-10 text-pw-muted hover:text-pw-danger'>
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </div>
                            );
                          },
                        )}
                        <Button
                          variant='outline'
                          onClick={() => {
                            const q = editedQuiz.questions[currentStep];
                            if (q.options.length >= 5) {
                              toast.info('Maximum of 5 options per question');
                              return;
                            } else {
                              const newOptId = `${q.id}-opt-${q.options.length}-${Math.random().toString(36).substr(2, 4)}`;
                              updateQuestion(currentStep, {
                                ...q,
                                options: [
                                  ...q.options,
                                  { id: newOptId, text: '' },
                                ],
                              });
                            }
                          }}
                          className='w-full border-dashed border-white/10 hover:bg-white/5 h-10 text-xs gap-2'>
                          <Plus className='h-3 w-3' /> Add Option
                        </Button>

                        {editedQuiz.type === 'quiz' && (
                          <div className='space-y-2 mt-2'>
                            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest pl-1'>
                              Explanation (Optional)
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
                              placeholder='Explain why the correct answer is right...'
                              className='w-full h-20 bg-white/5 border border-white/10 rounded-xl p-4 text-xs focus:border-pw-primary focus:outline-none resize-none'
                            />
                          </div>
                        )}
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
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Quiz | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<number | null>(null);

  // Unified answer resolution logic
  const resolveAnswerToText = (quiz: Quiz, questionId: string, val: any) => {
    const question = quiz.questions?.find((q) => q.id === questionId);
    if (!question) return String(val);
    if (question.type === 'input') return String(val);

    const options = question.options || [];
    const findText = (idOrIdx: any) => {
      const found = options.find(
        (o) => typeof o !== 'string' && o.id === String(idOrIdx),
      );
      if (found && typeof found !== 'string') return found.text;

      // Fallback for legacy numeric indices
      if (typeof idOrIdx === 'number' && typeof options[idOrIdx] === 'string') {
        return options[idOrIdx];
      }
      if (typeof idOrIdx === 'number' && typeof options[idOrIdx] === 'object') {
        return (options[idOrIdx] as any).text;
      }
      return String(idOrIdx);
    };

    if (Array.isArray(val)) {
      return val.map((v) => findText(v)).join(', ');
    }
    return findText(val);
  };

  const resolveCorrectText = (quiz: Quiz, questionId: string) => {
    const question = quiz.questions?.find((q) => q.id === questionId);
    if (!question) return '';
    try {
      let decodedStr = atob(String(question.correctIndex));
      let decodedVal = decodedStr;
      try {
        decodedVal = JSON.parse(decodedStr);
      } catch (_) {}
      return resolveAnswerToText(quiz, questionId, decodedVal);
    } catch (_) {
      return resolveAnswerToText(quiz, questionId, question.correctIndex);
    }
  };

  const exportResponsesAsCSV = (quiz: Quiz) => {
    if (!quiz.responses || quiz.responses.length === 0) return;

    // Header
    const headers = [
      'Timestamp',
      'Score',
      'Total',
      ...Object.keys(quiz.responses[0].userData),
      ...quiz.questions.map((_, i) => `Q${i + 1}`),
    ];

    // Rows
    const rows = quiz.responses.map((resp) => [
      new Date(resp.timestamp).toLocaleString(),
      resp.score,
      resp.totalQuestions,
      ...Object.values(resp.userData),
      ...resp.answers.map(
        (a) =>
          `"${resolveAnswerToText(quiz, a.questionId, a.answer).replace(/"/g, '""')}"`,
      ),
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${quiz.title}_responses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Responses exported to CSV!');
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

  // Load from hybrid storage (offline-first)
  useEffect(() => {
    const loadQuizzes = async () => {
      // 1. Serve local cache immediately
      const localData = await HybridStorage.getAll('quiz', (freshItems) => {
        // 2. Called in background when remote data arrives — silently refresh
        setQuizzes(freshItems);
      });
      setQuizzes(localData);
    };
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

    const quizToSave = { ...quiz, questions: securedQuestions };

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
    await HybridStorage.delete(id, 'quiz');
    const newQuizzes = quizzes.filter((q) => q.id !== id);
    setQuizzes(newQuizzes);
    toast.success('Quiz deleted');
  };

  const exportQuiz = (quiz: Quiz) => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(quiz));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute(
      'download',
      `${quiz.title.replace(/\s+/g, '-').toLowerCase()}.json`,
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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

  return (
    <div className='container mx-auto px-6 py-12 max-w-8xl min-h-[calc(100vh-64px)] pb-20'>
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
                <div className='relative'>
                  <Button
                    variant='outline'
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
                  onClick={handleStartNew}
                  className='btn-primary gap-2 h-11 px-8'>
                  <Plus className='h-5 w-5' /> Create New Quiz
                </Button>
              </div>
            </div>

            {quizzes.length > 0 ?
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
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
                        </div>

                        <div className='flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
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
            className='w-full'>
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
                                'Anonymous'}
                            </p>
                            <p className='text-[10px] text-pw-muted italic'>
                              {new Date(resp.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className='bg-pw-primary/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-pw-primary border border-pw-primary/20 shrink-0'>
                            {resp.score} / {resp.totalQuestions}
                          </div>
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

                                  return (
                                    <div
                                      key={i}
                                      className='p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-0.5'>
                                      <p className='text-[10px] font-bold text-pw-muted uppercase'>
                                        Question {i + 1}
                                      </p>
                                      <p className='text-xs font-medium leading-relaxed'>
                                        {question?.text || 'Question removed.'}
                                      </p>
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
                                          )}>
                                          {resolveAnswerToText(
                                            viewingResponses,
                                            ans.questionId,
                                            ans.answer,
                                          )}
                                        </p>
                                      </div>
                                      {!ans.correct && (
                                        <div className='flex items-start gap-2 pt-1'>
                                          <p className='text-[10px] font-bold text-pw-cyan shrink-0'>
                                            CORRECT:
                                          </p>
                                          <p
                                            className={cn(
                                              'text-[11px] font-mono text-white/80',
                                            )}>
                                            {resolveCorrectText(
                                              viewingResponses,
                                              ans.questionId,
                                            )}
                                          </p>
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
    </div>
  );
}
