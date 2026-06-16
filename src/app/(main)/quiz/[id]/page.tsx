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
        ].map((btn) => {
          if (btn === '=') {
            return (
              <Button
                key={btn}
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
                key={btn}
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
                size='sm'
                className='h-8 text-[10px]'
                onClick={() => setVal('')}>
                {btn}
              </Button>
            );
          }
          return (
            <Button
              key={btn}
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

  const [started, setStart] = useState(false);

  const [isLoading, setLoading] = useState(true);
  const [detailsCollected, setDetailsCollected] = useState(false);
  const [userData, setUserData] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);

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
        setIsFinished(true); // Auto-finish
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      const data = await HybridStorage.getAll('quiz');
      const target = (data.find((q: any) => String(q.id) === String(quizId)) ||
        null) as Quiz | null;

      if (target) {
        // Migration: Ensure options have IDs
        const migratedQuestions = target.questions.map((q) => {
          if (q.options.length > 0 && typeof q.options[0] === 'string') {
            const optionsWithIds = q.options.map((opt, idx) => ({
              id: `${q.id}-opt-${idx}`,
              text: opt as string,
            }));

            // If correctIndex was a number, migrate it to the new ID
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

        // Pre-shuffle if needed
        if (finalQuiz.randomizeOptions) {
          const shuffled: Record<string, (string | QuizOption)[]> = {};
          finalQuiz.questions.forEach((question) => {
            const opts = [...question.options];
            for (let i = opts.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [opts[i], opts[j]] = [opts[j], opts[i]];
            }
            shuffled[question.id] = opts;
          });
          setShuffledOptions(shuffled);
        }
      } else if (quizId === 'demo') {
        setQuiz({
          title: 'Demo Quiz',
          type: 'quiz',
          createdAt: Date.now(),
          description: 'This is a description',
          id: 'tttvvrb34cr',
          correctOption: true,
          questions: [
            {
              id: 'demo-q1',
              type: 'multiple_choice',
              text: 'Welcome to Ping World! Is this tool free?',
              options: [
                { id: 'demo-opt-0', text: 'Yes, absolutely' },
                { id: 'demo-opt-1', text: 'No' },
                { id: 'demo-opt-2', text: 'Maybe' },
                { id: 'demo-opt-3', text: "I don't know" },
              ],
              correctIndex: 'demo-opt-0',
            },
          ],
          endScreen: {
            title: 'Demo Finished!',
            message: 'Thanks for trying the demo.',
          },
        });
      }

      setLoading(false);
    };
    loadQuiz();
  }, []);

  const q = quiz?.questions[currentQuestion] as Question;

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
        const correctIds =
          Array.isArray(q.correctIndex) ? q.correctIndex : [q.correctIndex];
        correct =
          selectedOptions.length === correctIds.length &&
          selectedOptions.every((val) => correctIds.includes(val));
      } else if (q.type === 'input') {
        correct =
          content.toLowerCase().trim() ===
          String(q.correctIndex || '')
            .toLowerCase()
            .trim();
      } else if (q.type === 'true_false') {
        correct =
          String(selectedOption).toLowerCase() ===
          String(q.correctIndex).toLowerCase();
      } else {
        correct = selectedOption === q.correctIndex;
      }

      if (correct) setScore((s) => s + 1);
      setIsCorrect(correct);

      // Store answer
      const answer =
        q.type === 'checkbox' ? selectedOptions
        : q.type === 'input' ? content
        : selectedOption;

      const qId = q.id;
      const updatedAnswers = [
        ...userAnswers,
        { questionId: qId, answer, correct },
      ];
      setUserAnswers(updatedAnswers);

      if (quiz?.correctOption) {
        setShowFeedback(true);
        // Delay for feedback if enabled
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
      // Store neutral answer for surveys
      const answer =
        q.type === 'checkbox' ? selectedOptions
        : q.type === 'input' ? content
        : selectedOption;
      const qId = q.id;
      const updatedAnswers = [...userAnswers, { questionId: qId, answer }];
      setUserAnswers(updatedAnswers);
      proceedToNext(updatedAnswers);
    }
  };

  const proceedToNext = (latestAnswers?: any[]) => {
    setShowFeedback(false);
    const answersToSave = latestAnswers || userAnswers;

    if (quiz && currentQuestion + 1 < quiz.questions.length) {
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
      try {
        await HybridStorage.saveResponse(quiz.id, {
          userData,
          answers: finalAnswers,
          score,
          totalQuestions: quiz.questions.length,
        });
      } catch (e) {
        console.error('Failed to save response:', e);
      }
    }
  };

  const GoBack = () => {
    setShowFeedback(false);
    if (!quiz?.canGoBack) return; // Strict check
    if (quiz && currentQuestion > 0) {
      setCurrentQuestion((c) => c - 1);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    }
  };

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-6'>
        <Puzzle className='h-12 w-12 text-pw-muted mb-4 opacity-20' />
        <h2 className='text-2xl font-bold mb-2'>Loading...</h2>

        <div className='loader spinner'></div>

        <h4 className='text-sm mt-8'>
          Please wait while we fetch your program.
        </h4>
      </div>
    );
  }

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
                <div className='w-full h-3 bg-pw-surface rounded-full overflow-hidden border border-white/5 mb-4'>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(score / quiz.questions.length) * 100}%`,
                    }}
                    className='h-full gradient-brand rounded-full'
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
    <div className='relative min-h-screen flex overflow-hidden bg-pw-bg'>
      {/* Planetary Background */}
      <div className='globe-div fixed inset-0'>
        <div className='globe opacity-10' />
      </div>

      {/* Background orbs */}
      <div className='orb orb-accent w-[500px] h-[500px] -top-40 -left-40 opacity-40 blur-xl float' />
      <div className='orb orb-primary w-[400px] h-[400px] -bottom-20 -right-20 opacity-30 blur-all float' />

      {quiz.description && !started && (
        <div
          className='container relative z-10 mx-auto px-4 md:px-6 py-10 md:py-10 max-w-5xl flex flex-col gap-3 align-center justify-center min-h-[40vh]'
          style={{ justifySelf: 'center', alignSelf: 'center' }}>
          <div
            className='flex gap-2 text-center w-full'
            style={{ justifyContent: 'center', alignItems: 'center' }}>
            {quiz.type === 'quiz' ?
              <Brain size={45} />
            : <MessageCircle size={45} />}

            <h1 className='font-bold text-[1.5rem]'>
              {quiz.title.toUpperCase()}
            </h1>
          </div>

          <p className='text-center w-full h-full overflow-auto max-h-[300px] text-[14px] opacity-80'>
            {quiz.description}
          </p>

          <div className='divider my-2 opacity-60'></div>

          {quiz.askDetails && quiz.askDetails.length > 0 && !detailsCollected ?
            <div className='w-full max-w-md bkblur mx-auto mt-8 bg-white/5 p-6 rounded-3xl border border-white/10'>
              <h3 className='text-sm font-bold mb-4 uppercase tracking-widest text-pw-cyan'>
                Enter your details
              </h3>
              <div className='space-y-4'>
                {quiz.askDetails.map((detail, idx) => (
                  <div
                    key={idx}
                    className='space-y-1'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase ml-1'>
                      {detail.title}
                    </label>
                    {detail.type === 'sex' ?
                      <div className='flex gap-2'>
                        {['Male', 'Female'].map((s) => (
                          <Button
                            key={s}
                            variant='outline'
                            onClick={() =>
                              setUserData({ ...userData, [detail.title]: s })
                            }
                            className={cn(
                              'flex-1 h-10 text-xs',
                              userData[detail.title] === s ?
                                'bg-pw-primary/10 border-pw-primary text-pw-primary'
                              : 'bg-black/20',
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
                              className='h-10 text-xs w-full flex justify-between'>
                              {userData[detail.title] || 'Select'}
                              <ChevronDown className='h-2 w-2' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className='w-full rounded-xl'>
                            {detail.options?.map((option) => (
                              <DropdownMenuItem
                                key={option}
                                onClick={() =>
                                  setUserData({
                                    ...userData,
                                    [detail.title]: option,
                                  })
                                }>
                                {option}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    : <input
                        type={
                          detail.type === 'number' ? 'number'
                          : detail.type === 'tel' ?
                            'tel'
                          : detail.type === 'email' ?
                            'email'
                          : 'text'
                        }
                        className='w-full h-10 bg-black/20 border border-white/10 rounded-xl px-4 text-sm focus:border-pw-primary outline-none'
                        placeholder={`Enter ${detail.title.toLowerCase()}`}
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
                  className={'btn-primary h-11 w-full mt-4'}
                  onClick={() => {
                    const complete = quiz.askDetails?.every(
                      (d) => userData[d.title],
                    );
                    if (!complete)
                      return toast.error('Please fill in all details');
                    setDetailsCollected(true);
                    setStart(true);
                  }}>
                  START {quiz.type.toUpperCase()}
                </Button>
              </div>
            </div>
          : <div className='w-full justify-center mt-4 flex'>
              <Button
                className={'btn-primary h-11 w-50'}
                onClick={() => setStart(true)}>
                START {quiz.type.toUpperCase()}
              </Button>
            </div>
          }
        </div>
      )}
      {started && (
        <div className='container relative z-10 mx-auto px-4 md:px-6 py-10 md:py-10 max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12'>
          <div className='lg:col-span-8'>
            <div className='mb-12'>
              <div className='flex justify-between items-end mb-6'>
                <div>
                  <div className='badge mb-4'>
                    Question {currentQuestion + 1} / {quiz.questions.length}
                  </div>
                  <h1 className='text-3xl font-bold font-display'>
                    {quiz.title}
                  </h1>
                </div>
                <div className='flex flex-col items-end gap-2'>
                  {quiz.hasTimer && timeLeft !== null && (
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm border',
                        timeLeft < 60 ?
                          'bg-pw-danger/10 border-pw-danger text-pw-danger animate-pulse'
                        : 'bg-white/5 border-white/10',
                      )}>
                      <Clock className='h-4 w-4' />
                      {formatTime(timeLeft)}
                    </div>
                  )}
                  {quiz.type === 'quiz' && quiz.showScore && (
                    <div className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                      Score: {score}
                    </div>
                  )}
                </div>
              </div>
              <div className='w-full h-1.5 bg-white/5 rounded-full overflow-hidden'>
                <motion.div
                  className='h-full gradient-brand rounded-full'
                  animate={{
                    width: `${(currentQuestion / quiz.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <Card className='glass bkblur rounded-3xl card p-4 mb-8 bg-pw-surface border-white/10'>
              <div className='flex flex-col gap-2'>
                <div className='flex justify-between items-start'>
                  <h2 className='text-lg md:text-2xl pt-1 font-bold leading-relaxed flex-1'>
                    {q?.text}
                  </h2>
                  {quiz.correctOption && showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'ml-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shrink-0',
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
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='p-3 rounded-xl bg-pw-primary/5 border border-pw-primary/10 text-xs text-pw-text leading-relaxed'>
                      <div className='font-bold text-pw-primary uppercase text-[10px] mb-1 tracking-widest'>
                        Explanation
                      </div>
                      {q.correctExplanation}
                    </motion.div>
                  )}
              </div>

              <AnimatePresence mode='sync'>
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}>
                  {q?.type === 'dropdown' ?
                    <div className='flex justify-center py-8'>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <div
                            className='h-12 px-8 gap-4 min-w-[200px] bg-white/5 text-lg flex rounded-xl'
                            style={{
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                            }}>
                            {selectedOption !== null ?
                              (
                                q.options.find(
                                  (o) =>
                                    (typeof o === 'string' ? o : o.id) ===
                                    selectedOption,
                                ) as any
                              )?.text || selectedOption
                            : 'Select an answer...'}
                            <ChevronDown className='h-5 w-5 text-pw-muted' />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-pw-surface border-white/10 w-72 p-2'>
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
                                  key={optId}
                                  onClick={() => setSelectedOption(optId)}
                                  className='h-12 text-base gap-3 focus:bg-pw-primary/10 rounded-lg cursor-pointer'>
                                  {selectedOption === optId && (
                                    <Check className='h-4 w-4 text-pw-primary' />
                                  )}
                                  {optText}
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
                      className='w-full h-20 bg-white/5 border border-white/10 rounded-xl p-2 text-lg focus:border-pw-primary focus:outline-none resize-none transition-all'
                    />
                  : <div
                      className={cn(
                        'grid gap-3',
                        q?.type === 'multiple_choice' ?
                          'grid-cols-1'
                        : 'grid-cols-2',
                      )}>
                      {(shuffledOptions[q.id] || q?.options)?.map((opt, idx) => {
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
                            key={optId}
                            onClick={() => {
                              if (q?.type === 'checkbox') {
                                setSelectedOptions((prev) =>
                                  prev.includes(optId) ?
                                    prev.filter((id) => id !== optId)
                                  : [...prev, optId],
                                );
                              } else {
                                setSelectedOption(optId);
                              }
                            }}
                            className={cn(
                              'w-full p-2 px-4 md:p-3 text-left rounded-xl border transition-all duration-200 flex items-center justify-between group',
                              isSelected ?
                                'bg-pw-primary/10 border-pw-primary text-pw-text shadow-lg shadow-pw-primary/10'
                              : 'bg-white/5 border-white/5 text-pw-muted hover:border-white/10 hover:bg-white/10',
                            )}>
                            <span className='font-medium text-sm md:text-base'>
                              {optText}
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
                  className='btn-primary h-10 w-[25vmin] text-lg gap-2 ml-auto'>
                  {currentQuestion + 1 === quiz.questions.length ?
                    'Finish'
                  : 'Next'}
                  <ChevronRight className='h-5 w-5' />
                </Button>
              </AnimatePresence>
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
          </div>
        </div>
      )}
    </div>
  );
}
