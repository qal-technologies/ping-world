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

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctIndex: any; // index, bool, or string
  accessory?: 'none' | 'calculator';
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'survey';
  questions: Question[];
  endScreen: {
    title: string;
    message: string;
  };
  createdAt: number;
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
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'multiple_choice',
      text: '',
      options: ['', ''],
      correctIndex: 0,
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
    const newQuestions = [...editedQuiz.questions];
    newQuestions[index] = updated;
    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
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
            onClick={() => onSave(editedQuiz)}
            className='btn-primary h-10 gap-2'>
            <Save className='h-4 w-4' /> Save Quiz
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
        {/* Navigation Sidebar */}
        <div className='lg:col-span-1 flex flex-col gap-4'>
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
          <Card className='card-glow p-8 min-h-[450px]'>
            {currentStep === -1 ?
              <div className='space-y-6 max-w-xl'>
                <h3 className='text-xl font-bold flex items-center gap-2'>
                  <Settings2 className='h-5 w-5 text-pw-primary' /> Quiz
                  Settings
                </h3>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                      Quiz Type
                    </label>
                    <div className='flex gap-2 p-1 bg-white/5 border border-white/5 rounded-lg'>
                      <Button
                        variant='ghost'
                        onClick={() =>
                          setEditedQuiz({ ...editedQuiz, type: 'quiz' })
                        }
                        className={cn(
                          'flex-1 h-9 text-xs',
                          editedQuiz.type === 'quiz' &&
                            'bg-pw-primary text-white shadow-lg',
                        )}>
                        Knowledge Quiz
                      </Button>
                      <Button
                        variant='ghost'
                        onClick={() =>
                          setEditedQuiz({ ...editedQuiz, type: 'survey' })
                        }
                        className={cn(
                          'flex-1 h-9 text-xs',
                          editedQuiz.type === 'survey' &&
                            'bg-pw-primary text-white shadow-lg',
                        )}>
                        Survey / Info
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
                      className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-4 text-sm focus:border-pw-primary focus:outline-none focus:ring-0 resize-none'
                    />
                  </div>

                  <div className='divider opacity-10' />

                  <h3 className='text-lg font-bold flex items-center gap-2 mt-8'>
                    <CheckCircle2 className='h-4 w-4 text-pw-success' /> End
                    Screen Settings
                  </h3>

                  <div className='space-y-4'>
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
                        className='w-full h-20 bg-white/5 border border-white/10 rounded-lg p-4 text-xs focus:border-pw-primary focus:outline-none focus:ring-0 resize-none'
                      />
                    </div>
                  </div>
                </div>
              </div>
            : <div className='space-y-8'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xl font-bold'>
                    Question {currentStep + 1}
                  </h3>
                  <div className='flex gap-2'>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant='outline'
                          className='h-9 gap-2 text-xs bg-white/5 border-white/10'>
                          {editedQuiz.questions[currentStep].type.replace(
                            '_',
                            ' ',
                          )}{' '}
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
                              // Reset options/correct for some types
                              if (type === 'true_false')
                                q.options = ['True', 'False'];
                              if (type === 'input') q.options = [];
                              updateQuestion(currentStep, q);
                            }}>
                            {type.replace('_', ' ')}
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

                      {editedQuiz.questions[currentStep].type === 'input' ? (
                        <div className="space-y-4">
                          <div className="bg-pw-primary/5 p-8 rounded-2xl border border-pw-primary/10 flex flex-col items-center text-center gap-4">
                             <Type className="h-8 w-8 text-pw-primary opacity-50" />
                             <div>
                               <p className="text-sm text-pw-primary font-bold">Text Input Mode</p>
                               <p className="text-[10px] text-pw-muted max-w-[250px] mt-1">Takers will type their answer. Perfect for open-ended feedback or exact keyword matching.</p>
                             </div>
                          </div>
                          
                          {editedQuiz.type === 'quiz' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-pw-muted uppercase tracking-widest pl-1">Correct Answer (Model)</label>
                              <Input
                                value={editedQuiz.questions[currentStep].correctIndex || ''}
                                onChange={(e) => updateQuestion(currentStep, { ...editedQuiz.questions[currentStep], correctIndex: e.target.value })}
                                placeholder="The answer to match..."
                                className="bg-white/5 border-white/10 h-12 focus:border-pw-primary"
                              />
                            </div>
                          )}
                        </div>
                      ) : editedQuiz.questions[currentStep].type === 'true_false' ? (
                        <div className="grid grid-cols-2 gap-4">
                          {['True', 'False'].map((val, idx) => (
                            <Button 
                              key={val}
                              variant={editedQuiz.questions[currentStep].correctIndex === idx ? 'default' : 'outline'}
                              onClick={() => updateQuestion(currentStep, { ...editedQuiz.questions[currentStep], correctIndex: idx })}
                              className={cn("h-16 text-lg font-bold border-white/5", editedQuiz.questions[currentStep].correctIndex === idx && "bg-pw-primary shadow-xl shadow-pw-primary/20")}
                            >
                              {val}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {editedQuiz.questions[currentStep].options.map((opt, idx) => (
                            <div key={idx} className='flex gap-3'>
                              <button
                                onClick={() =>
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    correctIndex: idx,
                                  })
                                }
                                className={cn(
                                  'w-10 h-10 rounded-lg border flex items-center justify-center transition-all shrink-0',
                                  editedQuiz.questions[currentStep].correctIndex === idx
                                    ? 'bg-pw-primary border-pw-primary text-white shadow-lg'
                                    : 'bg-white/5 border-white/10 text-pw-muted hover:border-white/20',
                                )}>
                                {editedQuiz.questions[currentStep].correctIndex === idx ?
                                  <Check className='h-4 w-4' />
                                : idx + 1}
                              </button>
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [...editedQuiz.questions[currentStep].options];
                                  newOptions[idx] = e.target.value;
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
                                  const newOptions = editedQuiz.questions[currentStep].options.filter((_, i) => i !== idx);
                                  updateQuestion(currentStep, {
                                    ...editedQuiz.questions[currentStep],
                                    options: newOptions,
                                  });
                                }}
                                className='h-10 w-10 text-pw-muted hover:text-pw-danger'>
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant='outline'
                            onClick={() => {
                              updateQuestion(currentStep, {
                                ...editedQuiz.questions[currentStep],
                                options: [...editedQuiz.questions[currentStep].options, ''],
                              });
                            }}
                            className='w-full border-dashed border-white/10 hover:bg-white/5 h-10 text-xs gap-2'>
                            <Plus className='h-3 w-3' /> Add Option
                          </Button>
                        </div>
                      )}
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

  // Load from hybrid storage
  useEffect(() => {
    const loadQuizzes = async () => {
      const data = await HybridStorage.getAll('quiz');
      setQuizzes(data);
    };
    loadQuizzes();
  }, []);

  const saveToLocal = (newQuizzes: Quiz[]) => {
    setQuizzes(newQuizzes);
    localStorage.setItem('pingworld-quizzes', JSON.stringify(newQuizzes));
  };

  const handleStartNew = () => {
    const newQuiz: Quiz = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      description: '',
      type: 'quiz',
      questions: [],
      endScreen: {
        title: 'Thank You!',
        message: 'You have completed the quiz.',
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

    try {
      const savedItem = await HybridStorage.save(quiz.id, quiz, 'quiz');

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
    <div className='container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20'>
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
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
                {quizzes.map((quiz, i) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}>
                    <Card className='card-glow h-full flex flex-col p-6 group'>
                      <div className='flex justify-between items-start mb-4'>
                        <div className='flex items-center gap-2 text-[10px] text-pw-muted font-mono uppercase tracking-widest'>
                          <FileJson className='h-3 w-3 text-pw-primary' />
                          {quiz?.questions?.length} Questions
                          {(quiz as any).is_synced ?
                            <span className='text-pw-success flex items-center gap-1'>
                              • Synced
                            </span>
                          : <span className='text-pw-warning flex items-center gap-1'>
                              • Draft
                            </span>
                          }
                        </div>
                        <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => exportQuiz(quiz)}
                            className='h-8 w-8 text-pw-muted hover:text-pw-primary'>
                            <Download className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => {
                              setActiveQuiz(quiz);
                              setIsCreating(true);
                            }}
                            className='h-8 w-8 text-pw-muted hover:text-pw-primary'>
                            <Settings2 className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
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
                      <div className='flex gap-3'>
                        <Button
                          onClick={() => playQuiz(quiz.id)}
                          className='btn-primary flex-1 h-10 gap-2'>
                          <Eye className='h-4 w-4' /> Play Quiz
                        </Button>
                        <Button
                          variant='outline'
                          className='h-10 px-4 border-pw-primary/20 hover:bg-pw-primary/5'>
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
            exit={{ opacity: 0, scale: 0.98 }}>
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
    </div>
  );
}
