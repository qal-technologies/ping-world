'use client';

import { useEffect, useState, type MutableRefObject, type RefObject } from 'react';
import type { Question, Quiz, QuizOption } from '@/app/(main)/quiz';
import { Card } from '@/components/ui/card';
import { ThemedSlider } from '@/components/ui/themed-slider';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  HelpCircle,
  LoaderCircle,
  SkipForward,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import {
  decodeStoredCorrectAnswer,
  describeAcceptedFiles,
  keepAnswerRevision,
} from '../func';
import { toast } from 'sonner';
import { optimizeImageForStorage } from '@/lib/media-optimization';
import {
  packPingWorldMediaUrl,
  unpackPingWorldMediaUrl,
} from '@/lib/quiz/quiz-piping';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  FormulaSheet,
  Glossary,
  NoteSheet,
  PeriodicTable,
} from '../accessories';

/* ------------------------------------------------------------------ */
/*  Props accepted by QuestionSection (the exported component)        */
/* ------------------------------------------------------------------ */
interface QuestionSectionProps {
  quiz: Quiz;
  activeQuestions: Question[];
  scrollBranchQuestionIds: string[] | null;
  currentQuestion: number;

  /* answer / selection state */
  scrollAnswers: Record<string, any>;
  setScrollAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  selectedOption: string | null;
  setSelectedOption: React.Dispatch<React.SetStateAction<string | null>>;
  selectedOptions: string[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<string[]>>;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  userAnswers: any[];
  setUserAnswers: React.Dispatch<React.SetStateAction<any[]>>;
  shuffledOptions: Record<string, QuizOption[]>;

  /* derived / computed */
  q: Question | null;
  canAdvanceCurrentQuestion: boolean;
  showFeedback: boolean;
  questionTimeLeft: number | null;

  /* actions */
  handleNext: (isAutoSubmit?: any) => void;
  handlePass: () => void;
  GoBack: () => void;
  finalizeQuiz: (answers: any[], reason?: any) => void;
  computeIsCorrect: (qId: string, answer: any) => boolean | undefined;
  formatDetailVars: (raw: string, ctx?: Record<string, any>) => string;
  setCurrentQuestion: React.Dispatch<React.SetStateAction<number>>;

  /* submission flags */
  isSubmitting: boolean;

  /* refs shared with taker */
  firstQuestionRef: React.RefObject<any> | React.MutableRefObject<any>;
  bottomRef: React.RefObject<any> | React.MutableRefObject<any>;
  scrollShowBranchActive: React.RefObject<any> | React.MutableRefObject<any>;
  correctAnswersRef: React.RefObject<any> | React.MutableRefObject<any>;
  uploadPickerOpenRef: React.RefObject<any> | React.MutableRefObject<any>;
  pendingResponseFileReadsRef: React.RefObject<any> | React.MutableRefObject<any>;

  /* file viewer */
  openFile: (opts: any) => void;
}

/* ------------------------------------------------------------------ */
/*  Props accepted by renderQuestionCard (internal helper)            */
/* ------------------------------------------------------------------ */
interface RenderCardProps {
  quiz: Quiz;
  quest: Question;
  index: number;
  currentQuestion: number;

  scrollAnswers: Record<string, any>;
  setScrollAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  selectedOption: string | null;
  setSelectedOption: React.Dispatch<React.SetStateAction<string | null>>;
  selectedOptions: string[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<string[]>>;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  userAnswers: any[];
  setUserAnswers: React.Dispatch<React.SetStateAction<any[]>>;
  shuffledOptions: Record<string, QuizOption[]>;

  q: Question | null;
  showFeedback: boolean;
  activeQuestions: Question[];
  computeIsCorrect: (qId: string, answer: any) => boolean | undefined;
  formatDetailVars: (raw: string, ctx?: Record<string, any>) => string;

  firstQuestionRef: React.RefObject<any> | React.MutableRefObject<any>;
  correctAnswersRef: React.RefObject<any> | React.MutableRefObject<any>;
  uploadPickerOpenRef: React.RefObject<any> | React.MutableRefObject<any>;
  pendingResponseFileReadsRef: React.RefObject<any> | React.MutableRefObject<any>;
  openFile: (opts: any) => void;

  /* solely-owned by this card – initialized in QuestionSection */
  expandedQuestionExplanationIds: Record<string, boolean>;
  setExpandedQuestionExplanationIds: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setIsPreparingResponseFile: React.Dispatch<React.SetStateAction<boolean>>;
}

/* ================================================================== */
/*  renderQuestionCard                                                */
/* ================================================================== */
function renderQuestionCard({
  quiz,
  quest,
  index,
  currentQuestion,
  scrollAnswers,
  setScrollAnswers,
  selectedOption,
  setSelectedOption,
  selectedOptions,
  setSelectedOptions,
  content,
  setContent,
  userAnswers,
  setUserAnswers,
  shuffledOptions,
  q,
  showFeedback,
  activeQuestions,
  computeIsCorrect,
  formatDetailVars,
  firstQuestionRef,
  correctAnswersRef,
  uploadPickerOpenRef,
  pendingResponseFileReadsRef,
  openFile,
  expandedQuestionExplanationIds,
  setExpandedQuestionExplanationIds,
  setIsPreparingResponseFile,
}: RenderCardProps) {
  const isActive = index === currentQuestion;
  const isScrollLayout = !!(
    quiz?.quizScroll ||
    quiz?.quizLayout === 'scroll' ||
    quiz?.surveyType === 'form'
  );

  // Read selections dynamically from scrollAnswers inside scroll layouts
  const currentOptions = (shuffledOptions[quest.id] || quest.options).filter(
    (o: any) => !o?.hidden,
  );

  const savedAnswer = userAnswers.find((a) => a.questionId === quest.id);

  const activeSelected =
    isScrollLayout ?
      scrollAnswers[quest.id] ?? savedAnswer?.answer ?? null
    : (selectedOption ?? (savedAnswer?.answer !== undefined && savedAnswer?.answer !== null ? String(savedAnswer.answer) : null) ?? scrollAnswers[quest.id] ?? null);

  const activeChecked =
    isScrollLayout ?
      scrollAnswers[quest.id] ?? (Array.isArray(savedAnswer?.answer) ? savedAnswer.answer : [])
    : (selectedOptions.length > 0 ? selectedOptions
      : Array.isArray(savedAnswer?.answer) ? savedAnswer.answer
      : Array.isArray(scrollAnswers[quest.id]) ? scrollAnswers[quest.id]
      : []);

  const activeText =
    isScrollLayout ?
      scrollAnswers[quest.id] ?? savedAnswer?.answer ?? ''
    : content;

  const formattedQuestionText = formatDetailVars(quest.text);

  return (
    <motion.div
      initial={{ opacity: 0.1, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0.1, x: -5 }}
      className='w-[100%] p-0'
      key={quest.text + index + 'question-card'}>
      <Card
        id={`question-${quest.id}`}
        key={quest.id + 'key' + quest.category ? quest.category : 'general'}
        ref={
          (
            isScrollLayout ? index === currentQuestion : index === 0
          ) ?
            firstQuestionRef
          : undefined
        }
        className={cn(
          'quiz-taker-font p-0 bg-transparent sm:p-6 ring-0 flex flex-col w-full max-w-[600px] rounded-[0px] mb-8 transition-all duration-300 space-y-0 self-center',
          !isActive && !isScrollLayout && 'opacity-65 pointer-events-none',
          !isScrollLayout &&
            'sm:bkblur sm:glass sm:rounded-3xl sm:bg-pw-surface/40 sm:border-white/5 sm:shadow-2xl sm:ring-1 ',
        )}
        style={{ placeSelf: 'center' }}>
        {/* Show Question Category tag if enabled or set */}
        {quiz?.category?.show && quest.category && (
          <div>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pw-primary/10 border border-pw-primary/30 text-pw-primary text-[10px] font-bold bkblur uppercase tracking-wider'>
              <Folder className='h-3 w-3' /> {quest.category}
            </span>
          </div>
        )}

        <div className='flex items-start gap-3 mb-4'>
          {isScrollLayout ?
            <div className='flex items-baseline gap-2'>
              <span className='text-pw-primary font-black text-xl select-none shrink-0 quiz-taker-font '>
                {(() => {
                  const targetCat = quest.category?.trim() || '';
                  const inStack = activeQuestions.filter(
                    (item) => (item.category?.trim() || '') === targetCat,
                  );
                  const posInStack = inStack.findIndex(
                    (item) => item.id === quest.id,
                  );
                  return (
                      quiz?.quizLayout === 'scroll' ||
                        quiz?.surveyType === 'form'
                    ) ?
                      index + 1
                    : Math.max(0, posInStack) + 1;
                })()}
                .
              </span>
              <h2
                className='text-base font-bold text-white whitespace-pre-wrap'
                dangerouslySetInnerHTML={{ __html: formattedQuestionText }}
              />
            </div>
          : <div className='flex items-start gap-3'>
              <div
                className={cn(
                  'h-12 w-12 rounded-[18px] flex items-center justify-center shrink-0 border shadow-inner',
                  quiz?.type === 'quiz' ?
                    'bg-pw-primary/5 text-pw-primary border-pw-primary/10'
                  : 'bg-pw-cyan/5 text-pw-cyan border-pw-cyan/10',
                )}>
                {quiz?.type === 'quiz' ?
                  <Brain
                    className='text-pw-primary'
                    size={24}
                  />
                : <HelpCircle
                    className='text-pw-cyan'
                    size={24}
                  />
                }
              </div>

              <div>
                  <span className='text-[9px] font-black text-pw-muted uppercase block tracking-wider'>
                    {(() => {
                      const targetCat = quest.category?.trim() || '';
                      const inStack = activeQuestions.filter(
                        (item) => (item.category?.trim() || '') === targetCat,
                      );
                      const posInStack = inStack.findIndex(
                        (item) => item.id === quest.id,
                      );
                      const stackTotal =
                      inStack.length || activeQuestions.length;
                      return `Question ${Math.max(0, posInStack) + 1} of ${stackTotal}${quest.category ? ` · ${quest.category}` : ''}`;
                    })()}
                  </span>
                    {quest.imageUrl && (
                      <button
                        type='button'
                        aria-label='View question image'
                        onContextMenu={(event) => event.preventDefault()}
                        onClick={() =>
                          openFile({
                            src: quest.imageUrl!,
                            name: 'Question image',
                            mimeType: 'image/webp',
                            canDownload: false,
                          })
                        }
                        className=' mt-3 w-full max-w-[350px] mb-1 flex justify-center cursor-zoom-in select-none text-left'>
                        <Image
                          width={1200}
                          height={900}
                          unoptimized
                          draggable={false}
                          onContextMenu={(event) => event.preventDefault()}
                          src={quest.imageUrl}
                          alt='Image for this question'
                          className='mx-auto h-auto max-h-[42dvh] w-full max-w-full rounded-xl border border-white/5 object-contain pointer-events-none select-none'
                        />
                      </button>
                    )}
                  <h2
                    className='text-base font-bold text-white whitespace-pre-wrap'
                    dangerouslySetInnerHTML={{ __html: formattedQuestionText }}
                  />
                </div>
            </div>
          }
        </div>

        <div className='space-y-2'>
          {quest.type === 'input' ?
            <textarea
              key={quest.type + 'input' + quest.id}
              value={activeText}
              disabled={showFeedback}
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
                    updated[existingIdx] = keepAnswerRevision(
                      userAnswers[existingIdx],
                      {
                        questionId: quest.id,
                        answer: e.target.value,
                        correct,
                      },
                    );
                  } else {
                    updated = [
                      ...userAnswers,
                      {
                        questionId: quest.id,
                        answer: e.target.value,
                        correct,
                      },
                    ];
                  }
                  setUserAnswers(updated);
                } else {
                  setContent(e.target.value);
                }
              }}
              placeholder='Type your answer here...'
              className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-pw-primary resize-none bkblur'
            />
          : quest.type === 'range' ?
            (() => {
              const min =
                Number.isFinite(Number(quest.min)) ? Number(quest.min) : 0;
              const max =
                Number.isFinite(Number(quest.max)) && Number(quest.max) > min ?
                  Number(quest.max)
                : 100;
              const step =
                Number.isFinite(Number(quest.step)) && Number(quest.step) > 0 ?
                  Number(quest.step)
                : 1;

              const activeVal =
                isScrollLayout ?
                  (scrollAnswers[quest.id] ?? savedAnswer?.answer)
                : (
                  selectedOption !== null &&
                  selectedOption !== undefined &&
                  selectedOption !== ''
                ) ?
                  selectedOption
                : content !== '' ? content
                : (scrollAnswers[quest.id] ?? savedAnswer?.answer);

              const hasVal =
                activeVal !== undefined &&
                activeVal !== null &&
                activeVal !== '';
              const value = hasVal ? Number(activeVal) : min;

              const saveValue = (next: number) => {
                setScrollAnswers((previous) => ({
                  ...previous,
                  [quest.id]: next,
                }));
                setSelectedOption(String(next));
                setContent(String(next));
                setUserAnswers((previous) => {
                  const existing = previous.findIndex(
                    (answer) => answer.questionId === quest.id,
                  );
                  const answer = {
                    questionId: quest.id,
                    answer: next,
                    correct: computeIsCorrect(quest.id, next),
                  };
                  return existing < 0 ?
                      [...previous, answer]
                    : previous.map((item, index) =>
                        index === existing ? answer : item,
                      );
                });
              };

              return (
                <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-5 bkblur'>
                  <div className='mb-4 flex items-center justify-between'>
                    <span className='text-xs font-mono font-bold text-white/55'>
                      {min}
                    </span>
                    <span className='rounded-xl border border-pw-cyan/20 bg-pw-cyan/10 px-4 py-2 text-lg font-bold tabular-nums text-pw-cyan'>
                      {Number.isFinite(value) ? value : min}
                    </span>
                    <span className='text-xs font-mono font-bold text-white/55'>
                      {max}
                    </span>
                  </div>
                  <ThemedSlider
                    aria-label='Choose a value'
                    min={min}
                    max={max}
                    disabled={showFeedback}
                    step={step}
                    value={
                      Number.isFinite(value) ?
                        Math.min(max, Math.max(min, value))
                      : min
                    }
                    onChange={(event) => saveValue(Number(event.target.value))}
                    onPointerDown={(event) =>
                      saveValue(Number(event.currentTarget.value))
                    }
                    onPointerUp={(event) =>
                      saveValue(Number(event.currentTarget.value))
                    }
                    className='w-full cursor-pointer'
                    trackHeight={6}
                    activeHeight={9}
                    thumbShape='rounded'
                  />
                </div>
              );
            })()
          : quest.type === 'rating' ?
            (() => {
              const activeVal =
                isScrollLayout ?
                  (scrollAnswers[quest.id] ?? savedAnswer?.answer)
                : (
                  selectedOption !== null &&
                  selectedOption !== undefined &&
                  selectedOption !== ''
                ) ?
                  selectedOption
                : content !== '' ? content
                : (scrollAnswers[quest.id] ?? savedAnswer?.answer);
              const selectedRating = Number(activeVal || 0);

              const saveRating = (rating: number) => {
                setScrollAnswers((previous) => ({
                  ...previous,
                  [quest.id]: rating,
                }));
                setSelectedOption(String(rating));
                setContent(String(rating));
                setUserAnswers((previous) => {
                  const existing = previous.findIndex(
                    (answer) => answer.questionId === quest.id,
                  );
                  const answer = {
                    questionId: quest.id,
                    answer: rating,
                    correct: computeIsCorrect(quest.id, rating),
                  };
                  return existing < 0 ?
                      [...previous, answer]
                    : previous.map((item, index) =>
                        index === existing ? answer : item,
                      );
                });
              };

              return (
                <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center bkblur'>
                  <div
                    className='flex justify-center gap-3'
                    role='radiogroup'
                    aria-label='Rating from one to five'>
                    {[1, 2, 3, 4, 5].map((rating, i) => {
                      const isSelected = rating <= selectedRating;
                      return (
                        <button
                          key={rating + 'rating' + i}
                          type='button'
                          role='radio'
                          disabled={showFeedback}
                          aria-checked={selectedRating === rating}
                          aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                          onClick={() => saveRating(rating)}
                          className='rounded-xl p-2 transition-all duration-200 hover:scale-125 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pw-cyan'>
                          <Star
                            className={cn(
                              'h-9 w-9 transition-all duration-200 text-white/20',
                              isSelected ?
                                'scale-105 fill-pw-cyan'
                              : 'hover:text-white/60',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className='mt-3 text-xs font-bold text-pw-muted'>
                    {selectedRating ?
                      <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-pw-text'>
                        <span className='font-mono font-bold text-pw-cyan'>
                          {selectedRating}
                        </span>
                        <span>/ 5 Stars</span>
                      </span>
                    : <span className='text-pw-muted/70'>Select a rating</span>}
                  </p>
                </div>
              );
            })()
          : quest.type === 'upload' ?
            <div className='space-y-2 p-2 bg-white/5 border border-dashed bkblur border-white/20 rounded-3xl text-left'>
              {quest.uploadInstruction && (
                <p className='text-xs text-pw-cyan font-semibold mb-2 bg-pw-cyan/5 p-1.5 rounded-2xl border border-pw-cyan/10'>
                  {formatDetailVars(quest.uploadInstruction)}
                </p>
              )}
              <p className='text-[10px] text-pw-muted px-1 pt-0.5'>
                Expected file type:{' '}
                {describeAcceptedFiles(
                  quest.allowedTypes ||
                    'image/*,.pdf,.doc,.docx,.txt,.zip,.json,video/*,audio/*',
                )}
              </p>

              <div className='flex flex-col gap-1'>
                <input
                  disabled={showFeedback}
                  type='file'
                  onClick={() => {
                    uploadPickerOpenRef.current = true;
                  }}
                  accept={
                    quest?.allowedTypes ||
                    'image/*,.pdf,.doc,.docx,.txt,.zip,.json,/application/json,video/*,audio/*,'
                  }
                  onChange={(e) => {
                    uploadPickerOpenRef.current = false;
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Enforce max size limit (MB)
                    const maxMb = Math.max(
                      1,
                      Math.min(Number(quest.maxFileSize) || 5, 50),
                    );
                    const sizeInMb = file.size / (1024 * 1024);

                    if (sizeInMb > maxMb) {
                      toast.error(
                        `File size (${sizeInMb.toFixed(1)}MB) exceeds limit of ${maxMb}MB`,
                      );
                      return;
                    }
                    void (async () => {
                      pendingResponseFileReadsRef.current.add(quest.id);
                      setIsPreparingResponseFile(true);
                      try {
                        const optimizedFile =
                          await optimizeImageForStorage(file);
                        const reader = new FileReader();
                        reader.onerror = () => {
                          pendingResponseFileReadsRef.current.delete(quest.id);
                          setIsPreparingResponseFile(
                            pendingResponseFileReadsRef.current.size > 0,
                          );
                          toast.error(
                            'Could not read this file. Please try another one.',
                          );
                        };
                        reader.onload = () => {
                          const rawBase64 = reader.result as string;
                          const packedUrl = packPingWorldMediaUrl(rawBase64);
                          if (quiz?.quizScroll) {
                            setScrollAnswers((prev) => ({
                              ...prev,
                              [quest.id]: packedUrl,
                            }));
                          } else {
                            setContent(packedUrl);
                          }

                          const existingIdx = userAnswers.findIndex(
                            (a) => a.questionId === quest.id,
                          );
                          let updated;
                          const uploadRecord = {
                            questionId: quest.id,
                            answer: file.name,
                            fileName: file.name,
                            fileUrl: packedUrl,
                            fileType: optimizedFile.type || file.type,
                            correct: undefined,
                          };

                          if (existingIdx > -1) {
                            updated = [...userAnswers];
                            updated[existingIdx] = uploadRecord;
                          } else {
                            updated = [...userAnswers, uploadRecord];
                          }
                          setUserAnswers(updated);
                          const savedKb = Math.max(
                            1,
                            Math.round(optimizedFile.size / 1024),
                          );
                          toast.success(`Attached: ${file.name}`);
                          pendingResponseFileReadsRef.current.delete(quest.id);
                          setIsPreparingResponseFile(
                            pendingResponseFileReadsRef.current.size > 0,
                          );
                        };
                        reader.readAsDataURL(optimizedFile);
                      } catch {
                        pendingResponseFileReadsRef.current.delete(quest.id);
                        setIsPreparingResponseFile(
                          pendingResponseFileReadsRef.current.size > 0,
                        );
                        toast.error('Could not prepare this file for upload.');
                      }
                    })();
                  }}
                  className='text-xs text-pw-muted file:mr-3 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:text-xs file:font-bold file:bg-pw-primary/10 file:text-pw-primary hover:file:bg-pw-primary/20 file:cursor-pointer w-full'
                />

                {/* Allow taker to customize filename on save */}
                {(content || scrollAnswers[quest.id]) && (
                  <div className='mt-2 p-1 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between gap-2 flex-wrap'>
                    <div className='flex items-center text-xs text-pw-success font-bold font-mono ml-2'>
                      <span>✓ File Attached</span>
                    </div>
                    <div className='flex items-center h-7 w-[30%] max-w-45'>
                      <Input
                        placeholder='Rename file before saving...'
                        value={
                          userAnswers.find((a) => a.questionId === quest.id)
                            ?.answer || ''
                        }
                        onChange={(e) => {
                          const newName = e.target.value;
                          const updated = userAnswers.map((a) =>
                            a.questionId === quest.id ?
                              { ...a, answer: newName, fileName: newName }
                            : a,
                          );
                          setUserAnswers(updated);
                        }}
                        className='text-[10px] bg-white/5 border-white/10'
                      />
                    </div>
                  </div>
                )}
                {(() => {
                  const attached = userAnswers.find(
                    (answer) => answer.questionId === quest.id,
                  );
                  const attachedUrl =
                    attached?.fileUrl ?
                      unpackPingWorldMediaUrl(attached.fileUrl).url ||
                      attached.fileUrl
                    : '';
                  if (!attachedUrl) return null;
                  const isImage =
                    attachedUrl.startsWith('data:image/') ||
                    /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#]|$)/i.test(
                      attached?.fileName || '',
                    );
                  const mediaType = String(
                    attached?.fileType || '',
                  ).toLowerCase();
                  const isVideo =
                    mediaType.startsWith('video/') ||
                    attachedUrl.startsWith('data:video/') ||
                    /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(
                      attached?.fileName || '',
                    );
                  const isAudio =
                    mediaType.startsWith('audio/') ||
                    attachedUrl.startsWith('data:audio/') ||
                    /\.(mp3|wav|m4a|aac|ogg|flac)(?:[?#]|$)/i.test(
                      attached?.fileName || '',
                    );
                  return (
                    <div className='mt-1 space-y-1 rounded-xl border border-white/10 bg-white/5 p-2'>
                      {isImage && (
                        <button
                          type='button'
                          onClick={() =>
                            openFile({
                              src: attachedUrl,
                              name: attached?.fileName || 'Uploaded answer',
                              mimeType: attached?.fileType,
                              canEdit: (attached?.fileType || '').startsWith(
                                'image/',
                              ),
                              onEditSave: (editedFile: File) =>
                                new Promise<void>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onerror = () =>
                                    reject(
                                      new Error(
                                        'Could not read the edited image.',
                                      ),
                                    );
                                  reader.onload = () => {
                                    const packedUrl = packPingWorldMediaUrl(
                                      String(reader.result),
                                    );
                                    const updated = userAnswers.map((answer) =>
                                      answer.questionId === quest.id ?
                                        {
                                          ...answer,
                                          fileName: editedFile.name,
                                          fileType: editedFile.type,
                                          fileUrl: packedUrl,
                                        }
                                      : answer,
                                    );
                                    setUserAnswers(updated);
                                    if (quiz?.quizScroll)
                                      setScrollAnswers((previous) => ({
                                        ...previous,
                                        [quest.id]: packedUrl,
                                      }));
                                    else setContent(packedUrl);
                                    resolve();
                                  };
                                  reader.readAsDataURL(editedFile);
                                }),
                            })
                          }
                          className='block w-full cursor-zoom-in text-left'>
                          <Image
                            width={800}
                            height={600}
                            unoptimized
                            src={attachedUrl}
                            alt={
                              attached?.fileName || 'Uploaded answer preview'
                            }
                            className='h-auto max-h-56 w-auto max-w-full rounded-xl border border-white/10 object-contain'
                          />
                        </button>
                      )}
                      {isVideo && (
                        <video
                          src={attachedUrl}
                          controls
                          playsInline
                          preload='metadata'
                          className='mx-auto max-h-56 w-full max-w-xl rounded-xl bg-black object-contain'
                        />
                      )}
                      {isAudio && (
                        <audio
                          src={attachedUrl}
                          controls
                          preload='metadata'
                          className='w-full'
                        />
                      )}
                      {!isImage && !isVideo && !isAudio && (
                        <div className='flex items-center gap-2 rounded-lg bg-black/20 p-3 text-xs text-pw-text'>
                          <FileText className='h-5 w-5 shrink-0 text-pw-cyan' />
                          <div className='min-w-0'>
                            <p className='truncate font-semibold'>
                              {attached?.fileName || 'Attached file'}
                            </p>
                            <p className='text-[10px] text-pw-muted'>
                              {attached?.fileType || 'File ready to preview'}
                            </p>
                          </div>
                        </div>
                      )}
                      <button
                        type='button'
                        onClick={() =>
                          openFile({
                            src: attachedUrl,
                            name: attached?.fileName || 'Uploaded answer',
                            mimeType: attached?.fileType,
                          })
                        }
                        className='text-[10px] text-pw-cyan hover:underline'>
                        Preview uploaded file fullscreen
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          : <div className='grid gap-1.5'>
              {currentOptions.map((opt: any, oIdx) => {
                const optId = opt.id || String(oIdx);
                const optText = opt.text || String(opt);
                const rawOptUrl = opt?.uploadUrl;
                const optImage =
                  rawOptUrl ?
                    unpackPingWorldMediaUrl(rawOptUrl).url || undefined
                  : undefined;
                const formattedOptionText = formatDetailVars(optText);

                const isSelected =
                  quest.type === 'checkbox' ?
                    activeChecked.includes(optId)
                  : activeSelected === optId;

                const isFeedbackMode =
                  quiz?.type === 'quiz' &&
                  showFeedback &&
                  quiz?.correctOption &&
                  quiz?.correctOptionDes === 'in-question' &&
                  quest.id === q?.id;
                let feedbackClasses =
                  isSelected ?
                    'bg-pw-primary/10 border-pw-primary text-white font-bold'
                  : 'bg-white/5 border-white/10 text-white/90';

                if (isFeedbackMode) {
                  const decodedCorrect = decodeStoredCorrectAnswer(
                    correctAnswersRef.current[quest.id],
                  );
                  const hasCorrectIndex =
                    decodedCorrect !== null &&
                    decodedCorrect !== undefined &&
                    decodedCorrect !== '' &&
                    !(
                      Array.isArray(decodedCorrect) &&
                      decodedCorrect.length === 0
                    );
                  const isCorrectOpt =
                    hasCorrectIndex &&
                    (Array.isArray(decodedCorrect) ?
                      decodedCorrect.includes(optId)
                    : String(decodedCorrect) === optId ||
                      String(decodedCorrect) === String(oIdx));

                  if (isSelected && hasCorrectIndex) {
                    feedbackClasses =
                      isCorrectOpt ?
                        'bg-pw-success/15 border-pw-success/60 text-pw-success font-bold shadow-lg shadow-pw-success/10'
                      : 'bg-pw-danger/15 border-pw-danger text-pw-danger font-bold shadow-lg shadow-pw-danger/10';
                  } else if (isCorrectOpt) {
                    feedbackClasses =
                      'bg-pw-success/5 border-pw-success/40 text-pw-success/90 font-semibold';
                  }
                }

                return (
                  <button
                    key={optId + oIdx + 'option-key' + formattedOptionText}
                    disabled={isFeedbackMode}
                    onClick={() => {
                      if (isFeedbackMode) return;
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
                          updated[existingIdx] = keepAnswerRevision(
                            userAnswers[existingIdx],
                            {
                              questionId: quest.id,
                              answer: val,
                              correct,
                            },
                          );
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
                      'w-full min-h-0 p-3 text-left rounded-xl border transition-all text-xs flex items-center justify-between gap-3 backdrop-blur-lg',
                      feedbackClasses,
                    )}>
                    <div
                      className={cn(
                        'flex items-start sm:items-center gap-3 flex-1 min-w-0',
                        optImage ? 'flex-col sm:flex-row' : 'flex-row',
                      )}>
                      {optImage && (
                        <Image
                          width={800}
                          height={600}
                          unoptimized
                          src={optImage}
                          alt='Option attachment'
                          onClick={(e) => {
                            e.stopPropagation();
                            openFile({
                              src: optImage,
                              name: 'Option attachment',
                              kind: 'image',
                            });
                          }}
                          className='h-auto max-h-32 w-auto max-w-full rounded-lg border border-white/10 object-contain shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                        />
                      )}
                      <span
                        className='whitespace-pre-wrap'
                        dangerouslySetInnerHTML={{
                          __html: formattedOptionText,
                        }}
                      />
                    </div>

                    {quest.type === 'checkbox' ?
                      <span
                        aria-hidden='true'
                        className={cn(
                          'h-4 w-4 shrink-0 rounded-[5px] border flex items-center justify-center transition-colors',
                          isSelected ?
                            'bg-pw-primary/90 border-pw-primary text-white'
                          : 'border-white/40',
                        )}>
                        {isSelected && <Check className='h-3 w-3' />}
                      </span>
                    : <CheckCircle
                        className={cn(
                          'h-4 w-4 transition-all shrink-0',
                          isSelected ? 'w-4.5 h-4.5' : '',
                        )}
                      />
                    }
                  </button>
                );
              })}
            </div>
          }

          {/* Instant Option & Question Explanations when feedback mode is active */}
          {quiz?.type === 'quiz' &&
            showFeedback &&
            quiz?.correctOption &&
            quiz?.correctOptionDes === 'in-question' &&
            quest.id === q?.id &&
            (quest.correctExplanation ||
              quest.options?.some((o) => o?.explanation)) && (
              <div
                id='question-feedback-section'
                className='mt-3 space-y-2 text-xs'>
                {(() => {
                  const selOptObj: any = currentOptions.find(
                    (o: any, oI: number) =>
                      (o.id || String(oI)) === activeSelected,
                  );
                  const optExp = selOptObj?.explanation;
                  return optExp ?
                      <div className='p-2 rounded-xl bg-pw-cyan/5 border border-pw-cyan/15 text-pw-cyan/90 whitespace-pre-wrap flex items-start gap-1 flex-col'>
                        <span className='font-bold italic shrink-0 flex gap-1 items-center'>
                          Option Tip:
                        </span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: formatDetailVars(optExp),
                          }}
                        />
                      </div>
                    : null;
                })()}

                {((quest.correctExplanation &&
                  quiz?.correctOptionDes === 'in-question') ||
                  (() => {
                    const decoded = decodeStoredCorrectAnswer(
                      correctAnswersRef.current[quest.id],
                    );
                    const correctIds =
                      Array.isArray(decoded) ? decoded : [decoded];
                    return currentOptions.find((option: any, index: number) =>
                      correctIds.some(
                        (id) =>
                          String(id) === String(option?.id || index) ||
                          String(id) === String(index),
                      ),
                    )?.explanation;
                  })()) && (
                  <div className='p-2 rounded-xl bg-pw-surface/10 border border-pw-muted/20 text-white/90 whitespace-pre-wrap flex items-start gap-1 flex-col'>
                    <span className='font-bold italic shrink-0 flex items-center gap-1'>
                      <BookOpen className='w-4 h-4' /> Explanation:
                    </span>
                    <span
                      className={cn(
                        !expandedQuestionExplanationIds[quest.id] &&
                          'line-clamp-4',
                      )}
                      dangerouslySetInnerHTML={{
                        __html: formatDetailVars(
                          quest.correctExplanation ||
                            (() => {
                              const decoded = decodeStoredCorrectAnswer(
                                correctAnswersRef.current[quest.id],
                              );
                              const correctIds =
                                Array.isArray(decoded) ? decoded : [decoded];
                              return (
                                currentOptions.find(
                                  (option: any, index: number) =>
                                    correctIds.some(
                                      (id) =>
                                        String(id) ===
                                          String(option?.id || index) ||
                                        String(id) === String(index),
                                    ),
                                )?.explanation || ''
                              );
                            })(),
                        ),
                      }}
                    />
                    {(String(quest.correctExplanation || '').length > 180 ||
                      currentOptions.some(
                        (option: any) =>
                          String(option?.explanation || '').length > 180,
                      )) && (
                      <button
                        type='button'
                        aria-expanded={Boolean(
                          expandedQuestionExplanationIds[quest.id],
                        )}
                        onClick={() =>
                          setExpandedQuestionExplanationIds((current) => ({
                            ...current,
                            [quest.id]: !current[quest.id],
                          }))
                        }
                        className='text-[11px] font-semibold text-pw-cyan hover:underline'>
                        {expandedQuestionExplanationIds[quest.id] ?
                          'Read less'
                        : 'Read more'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      </Card>

      <div className='my-2 divider sm:hidden' />
    </motion.div>
  );
}

/* ================================================================== */
/*  QuestionSection  (exported default)                               */
/* ================================================================== */
export default function QuestionSection({
  quiz,
  activeQuestions,
  scrollBranchQuestionIds,
  currentQuestion,
  scrollAnswers,
  setScrollAnswers,
  selectedOption,
  setSelectedOption,
  selectedOptions,
  setSelectedOptions,
  content,
  setContent,
  userAnswers,
  setUserAnswers,
  shuffledOptions,
  q,
  canAdvanceCurrentQuestion,
  showFeedback,
  questionTimeLeft,
  handleNext,
  handlePass,
  GoBack,
  finalizeQuiz,
  computeIsCorrect,
  formatDetailVars,
  setCurrentQuestion,
  isSubmitting,
  firstQuestionRef,
  bottomRef,
  scrollShowBranchActive,
  correctAnswersRef,
  uploadPickerOpenRef,
  pendingResponseFileReadsRef,
  openFile,
}: QuestionSectionProps) {
  /* ---- States solely owned by this section ---- */
  const [showMobileAccessory, setShowMobileAccessory] = useState(false);
  const [expandedQuestionExplanationIds, setExpandedQuestionExplanationIds] =
    useState<Record<string, boolean>>({});
  const [isPreparingResponseFile, setIsPreparingResponseFile] = useState(false);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => {
        const feedbackEl = document.getElementById('question-feedback-section');
        if (feedbackEl) {
          feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, q?.id]);

  /* shared card props bundle to avoid repetition */
  const cardProps = {
    quiz,
    currentQuestion,
    scrollAnswers,
    setScrollAnswers,
    selectedOption,
    setSelectedOption,
    selectedOptions,
    setSelectedOptions,
    content,
    setContent,
    userAnswers,
    setUserAnswers,
    shuffledOptions,
    q,
    showFeedback,
    activeQuestions,
    computeIsCorrect,
    formatDetailVars,
    firstQuestionRef,
    correctAnswersRef,
    uploadPickerOpenRef,
    pendingResponseFileReadsRef,
    openFile,
    expandedQuestionExplanationIds,
    setExpandedQuestionExplanationIds,
    setIsPreparingResponseFile,
  };

  return (
    <AnimatePresence mode='wait'>
      {/* ===== SCROLL MODE: all answered + current question vertically ===== */}
      {(
        quiz?.quizScroll &&
        (quiz?.quizLayout === 'scroll_show' || !quiz?.quizLayout)
      ) ?
        <div className='flex h-fit max-h-[calc(100dvh-10rem)] min-h-0 flex-col items-center w-[100%] gap-0 overscroll-contain px-2 pb-2'>
          {(quiz?.quizLayout === 'scroll_show' ?
            activeQuestions.filter((question, idx) =>
              scrollShowBranchActive.current ?
                Boolean(scrollBranchQuestionIds?.includes(question.id))
              : idx <= currentQuestion,
            )
          : activeQuestions
          )
            .map((quest, idx) => ({ quest, idx }))
            .filter(
              ({ quest, idx }) =>
                idx === currentQuestion ||
                userAnswers.some((answer) => answer.questionId === quest.id),
            )
            .map(({ quest, idx }) => renderQuestionCard({ ...cardProps, quest, index: idx }))}
          <div ref={bottomRef} />

          <div className='flex items-center gap-3 mt-4'>
            {quiz?.allowPass && (
              <Button
                onClick={handlePass}
                variant='outline'
                className='h-10 px-6 rounded-xl font-bold gap-1.5 border-white/10 hover:border-pw-warning/40 text-pw-warning/80 hover:text-pw-warning hover:bg-pw-warning/10 transition-all'>
                Skip <SkipForward className='h-4 w-4' />
              </Button>
            )}
            <Button
              onClick={() => handleNext()}
              disabled={
                isSubmitting ||
                isPreparingResponseFile ||
                !canAdvanceCurrentQuestion
              }
              className='btn-primary h-10 px-10 rounded-xl font-bold gap-2'>
              {isSubmitting ?
                <>
                  <LoaderCircle className='h-4 w-4 animate-spin' /> Saving...
                </>
              : currentQuestion + 1 === activeQuestions.length ?
                quiz?.nextButtonText || `Finish ${quiz?.type || 'Assessment'}`
              : quiz?.nextButtonText || 'Next'}
              {!isSubmitting && <ChevronRight className='h-4 w-4' />}
            </Button>
          </div>
        </div>
      : quiz?.quizScroll && quiz?.quizLayout === 'scroll' ?
        <div className='flex flex-col items-center gap-0 w-[100%]'>
          {activeQuestions.map((quest, idx) =>
            renderQuestionCard({ ...cardProps, quest, index: idx }),
          )}
          <div ref={bottomRef} />

          <div className='flex items-center gap-3 mt-4'>
            <Button
              onClick={() => {
                const missing = activeQuestions.find((question) => {
                  const saved = userAnswers.find(
                    (answer) => answer.questionId === question.id,
                  );
                  const value = scrollAnswers[question.id] ?? saved?.answer;
                  if (question.type === 'upload') return !saved?.fileUrl;
                  if (question.type === 'checkbox')
                    return !Array.isArray(value) || value.length === 0;
                  if (question.type === 'input')
                    return !String(value ?? '').trim();
                  if (question.type === 'rating')
                    return (
                      !Number.isFinite(Number(value)) || Number(value) < 1
                    );
                  return (
                    value === null || value === undefined || value === ''
                  );
                });
                if (missing) {
                  toast.error(
                    `Please answer "${missing.text}" before finishing.`,
                  );
                  document
                    .getElementById(`question-${missing.id}`)
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  return;
                }
                void finalizeQuiz(userAnswers, 'self_submit');
              }}
              disabled={isSubmitting || isPreparingResponseFile}
              className='btn-primary h-10 px-10 rounded-2xl font-black gap-4 shadow-2xl shadow-pw-primary/30 transition-all hover:scale-[1.02] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none'>
              {isSubmitting ?
                <>
                  <LoaderCircle className='h-4 w-4 animate-spin' /> Saving...
                </>
              : quiz?.nextButtonText || `FINISH ${quiz?.type || 'Assessment'}`
              }
              {!isSubmitting && <CheckCircle2 className='h-5 w-5' />}
            </Button>
          </div>
        </div>
      : <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-[100%]'>
          <div
            className={cn(
              q?.accessory && q?.accessory !== 'none' ?
                'lg:col-span-8'
              : 'lg:col-span-12',
            )}>
            {!q ?
              <div className='flex flex-col items-center justify-center min-h-[40dvh] text-center p-6 bg-white/5 rounded-[3rem] border border-white/5'>
                <AlertTriangle className='h-12 w-12 text-pw-warning mb-4 opacity-50' />
                <h2 className='text-xl font-bold mb-2'>Question Not Found</h2>
                <p className='text-sm text-pw-muted max-w-xs'>
                  There was an issue loading this question. This can happen if
                  the quiz routing is invalid.
                </p>
                <Button
                  onClick={() => setCurrentQuestion(0)}
                  className='mt-6 btn-ghost'>
                  Return to Start
                </Button>
              </div>
            : <div className='flex flex-col items-center w-full justify-center gap-2'>
                <div className='flex items-center gap-2'>
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

                <div className='w-full flex flex-col items-center gap-1'>
                  {q?.accessory && q.accessory !== 'none' && (
                    <Button
                      type='button'
                      onClick={() => setShowMobileAccessory(true)}
                      className='lg:hidden w-full mb-2 rounded-xl border border-pw-primary/25 bg-pw-primary/10 text-pw-primary'>
                      Open {q.accessory.replaceAll('_', ' ')} tool
                    </Button>
                  )}
                  {renderQuestionCard({ ...cardProps, quest: q!, index: currentQuestion })}

                  <div className='flex justify-between w-full gap-4 flex-wrap mt-8'>
                    <AnimatePresence mode='sync'>
                      {quiz.canGoBack && currentQuestion > 0 && (
                        <Button
                          onClick={GoBack}
                          className='btn-ghost h-10 px-8 text-sm rounded-2xl gap-2 font-bold'>
                          <ChevronLeft className='h-4 w-4' />
                          {quiz?.prevButtonText || 'Previous'}
                        </Button>
                      )}

                      <div className='flex items-center gap-3 ml-auto'>
                        {quiz?.allowPass && (
                          <Button
                            onClick={handlePass}
                            variant='outline'
                            className='h-10 px-5 text-xs rounded-2xl gap-1.5 font-bold border-white/10 hover:border-pw-warning/40 text-pw-warning/80 hover:text-pw-warning hover:bg-pw-warning/10 transition-all'>
                            Skip <SkipForward className='h-3.5 w-3.5' />
                          </Button>
                        )}

                        <Button
                          onClick={handleNext}
                          disabled={
                            isSubmitting ||
                            isPreparingResponseFile ||
                            !canAdvanceCurrentQuestion
                          }
                          className='btn-primary h-10 px-8 rounded-2xl font-black gap-2 shadow-2xl shadow-pw-primary/30 transition-all hover:scale-[1.02] active:scale-[0.96]'>
                          {isSubmitting ?
                            <>
                              <LoaderCircle className='h-4 w-4 animate-spin' />{' '}
                              Saving...
                            </>
                          : currentQuestion + 1 === activeQuestions.length ?
                            quiz?.nextButtonText || 'FINISH'
                          : quiz?.nextButtonText || 'NEXT'}
                          {!isSubmitting && (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </Button>
                      </div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            }
          </div>

          {/* Assistant Sidebar */}
          <div className='hidden lg:block lg:col-span-4 space-y-6'>
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

          {showMobileAccessory && q?.accessory && q.accessory !== 'none' && (
            <div
              className='fixed inset-0 z-[95] flex flex-col bg-slate-950/95 text-pw-text backdrop-blur-2xl lg:hidden'
              role='dialog'
              aria-modal='true'
              aria-label={`${q.accessory} tool`}>
              <header className='flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4 py-3'>
                <h2 className='truncate font-bold capitalize'>
                  {q.accessory.replaceAll('_', ' ')}
                </h2>
                <Button
                  type='button'
                  onClick={() => setShowMobileAccessory(false)}
                  className='rounded-xl border border-white/10 bg-white/5 px-4'>
                  Close
                </Button>
              </header>
              <div className='min-h-0 flex-1 overflow-auto p-3 sm:p-5'>
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
              </div>
            </div>
          )}
        </div>
      }
    </AnimatePresence>
  );
}
