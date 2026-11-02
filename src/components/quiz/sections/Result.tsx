'use client';

import {Card} from "@/components/ui/card";
import {resolvePipedText, unpackPingWorldMediaUrl} from "@/lib/quiz/quiz-piping";
import {parseWhitelistedHtml} from "@/lib/quiz/text-parser";
import {capFirst, cn} from "@/lib/utils";
import {Badge, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronUp, Copy, Diamond, FileText, Folder, LoaderCircle, RefreshCcw, Share2, Trophy, X} from "lucide-react";
import {decodeStoredCorrectAnswer, formatAnswerRevision} from "../func";
import Image from "next/image";
import {AnimatePresence, motion} from "framer-motion";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {toast} from "sonner";
import {exportQuizFeedbackPdf} from "@/lib/quiz/pdf-export";
import {useState} from 'react';
import type {Question, Quiz} from "@/app/(main)/quiz";
import React from 'react';
import { type AppFileDescriptor} from "@/components/shared/AppFileViewer";
import { useAppContext } from '@/context/AppContext';


export default function Finished ({userData, userAnswers, questions, weightedScore, finalSubmissionSnapshotRef, quiz, isLocalPreview, categoryScores, currentPathIds, correctAnswersRef, scorePossible, showCompletionScrollUp, detailContextAction, showResponseShare, setShowResponseShareAction, savedResponseId, openFile}: {
    userData: Record<string, string>; userAnswers: any[]; questions: Question[]; weightedScore: {
        earned: number;
        possible: number;
    }; finalSubmissionSnapshotRef: React.RefObject<{
        answers: any[];
        userData: Record<string, string>;
        questionIds: string[];
        reason: "completion" | "timeout" | "self_submit" | "violation";
        score: number;
        scorePossible: number;
        totalQuestions: number;
        branchHistory: Array<{
            fromQuestionId: string;
            targetQuestionId?: string;
            category?: string;
            questionIds: string[];
            at: string;
        }>;
        startedAt: string;
} | null>;
    scorePossible: number;
    quiz: Quiz | null; isLocalPreview: boolean;
    categoryScores: Record<string, {
        correct: number;
        total: number;
    }>;
    showCompletionScrollUp: boolean;
    detailContextAction: () => Record<string, any> | undefined; currentPathIds: string[];
    correctAnswersRef: React.RefObject<Record<string, any>>,
    showResponseShare: boolean; setShowResponseShareAction: (v: boolean) => void; savedResponseId: string;
    openFile: (file: AppFileDescriptor) => void;
}) {

    const [openCat, setOpenCat] = useState(false);
    const [openReview, setOpenReview] = useState(false);
    const [isEndMsgExpanded, setIsEndMsgExpanded] = useState(false);
    const [localScrollUp, setLocalScrollUp] = useState(false);
    const [isResponseActionBusy, setIsResponseActionBusy] = useState(false);
    const bottomCompletionRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = bottomCompletionRef.current || document.getElementById('bottom-completion');
        if (!el) return;
        const checkScroll = () => {
            const isScrollable = el.scrollHeight > el.clientHeight + 5;
            const isScrolledDown = el.scrollTop > 5;
            setLocalScrollUp(isScrollable && isScrolledDown);
        };
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
            ro.disconnect();
        };
    }, [openCat, openReview]);

    const { isLoading, isLoggedIn} = useAppContext();

    // Dynamic variable mention & cross-question piping engine
    const formatDetailVars = (
        rawText: string,
        contextOverride?: Record<string, any>,
    ) => {
        if(!rawText) return rawText;

        // Resolve cross-question, category, taker mentions, date getters, and @eval logic directly
        const piped = resolvePipedText(
            rawText,
            contextOverride || {
                userData,
                userAnswers,
                questions,
                score: weightedScore.earned,
                totalQuestions: userAnswers.length,
                scorePossible: weightedScore.possible,
            },
            false,
        );
        return parseWhitelistedHtml(piped);
    };

    const totalQuestions =
        finalSubmissionSnapshotRef.current?.totalQuestions ??
        (quiz?.calculateAllBranches ?
            questions.length
            : currentPathIds.length);
    const attemptedCount = userAnswers.filter(
        (answer: any) =>
        !answer.passed && (answer.fileUrl || answer.answer !== undefined && answer.answer !== '' && (!Array.isArray(answer.answer) || answer.answer.length > 0)),
    ).length;
    const endTitle = formatDetailVars(
        quiz?.endScreen?.title || 'Assessment Completed!',
        detailContextAction(),
    );
    const endMsg = formatDetailVars(
        quiz?.endScreen?.message.trim() ||
        'Thank you for completing this assessment, @name! You scored @score out of @total (@percentage).',
        detailContextAction(),
    );

    return (
        <div
            key='inner-completion-view'
            className='quiz-taker-font relative h-[100dvh] w-full bg-[#0A0C1B] text-white flex items-center justify-center p-5 overflow-hidden'>
            <div
                className={cn(
                    'w-55 sm:w-65 h-55 sm:h-65 rounded-full bg-pw-cyan/20 blur-3xl absolute top-[-60px] left-[-60px] z-1',
                )}
            />

            <div
                className={cn(
                    'w-55 sm:w-65 h-55 sm:h-65 rounded-full bg-pw-primary/20 blur-3xl absolute bottom-[-60px] right-[-60px] z-1',
                )}
            />

            {quiz?.fromPremium && (
                <>
                    {quiz?.branding?.shadeColor && (
                        <div
                            className='fixed inset-0 min-h-screen w-screen z-0 pointer-events-none transition-all duration-500'
                            style={{
                                backgroundColor: quiz.branding.shadeColor,
                                opacity: 0.35,
                            }}
                        />
                    )}
                    {quiz?.branding?.image && (
                        <div
                            className='fixed inset-0 min-h-screen w-screen z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-500'
                            style={{
                                backgroundImage: `url(${unpackPingWorldMediaUrl(quiz.branding.image).url || quiz.branding.image})`,
                                opacity: quiz.branding.opacity ?? 0.25,
                                filter: `blur(${quiz.branding.blur ?? 0}px) brightness(80%)`,
                            }}
                        />
                    )}
                    {(quiz?.branding?.image || quiz?.branding?.shadeColor) && (
                        <div className='fixed inset-0 min-h-screen w-screen z-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60' />
                    )}
                </>
            )}

            <div
                className={cn(
                    'max-w-xl w-full space-y-1 z-10 text-center max-h-screen overflow-hidden relative inline-grid pb-1',
                    quiz?.endScreen?.textAlign === 'center' && 'text-center',
                    quiz?.endScreen?.textAlign === 'left' && 'text-left',
                    quiz?.endScreen?.textAlign === 'right' && 'text-right',
                )}>
                <div className='flex flex-col item-center sticky top-1 z-50 space-y-2 w-full h-fit p-1 pt-6'>
                    <div
                        className={cn(
                            'w-20 h-20 rounded-full flex items-center justify-center border mb-3 animation-fade-in-up stagger-6 shadow-lg',
                            quiz?.endScreen?.textAlign === 'left' ? 'ml-0 mr-auto'
                                : quiz?.endScreen?.textAlign === 'right' ? 'ml-auto mr-0'
                                    : 'mx-auto',
                            quiz?.endScreen?.completionIcon === 'diamond' &&
                            'bg-pw-success/10 border-pw-success/20 shadow-pw-success/10',
                            quiz?.endScreen?.completionIcon === 'badge' &&
                            'bg-pw-primary/10 border-pw-primary/20 shadow-pw-primary/10',
                            quiz?.endScreen?.completionIcon === 'trophy' &&
                            'bg-pw-warning/10 border-pw-warning/20 shadow-pw-warning/10',
                        )}>
                        {quiz?.endScreen?.completionIcon === 'diamond' ?
                            <Diamond className='h-12 w-12 text-pw-success' />
                            : quiz?.endScreen?.completionIcon === 'badge' ?
                                <Badge className='h-12 w-12 text-pw-primary' />
                                : quiz?.endScreen?.completionIcon === 'trophy' ?
                                    <Trophy className='h-12 w-12 text-pw-warning' />
                                    : <CheckCircle className='h-12 w-12 text-pw-success' />}
                    </div>
                    <h1
                        className='text-xl font-extrabold font-display whitespace-pre-wrap'
                        dangerouslySetInnerHTML={{__html: endTitle}}
                    />
                    <div className='relative'>
                        <p
                            className={cn(
                                'text-white/90 text-sm mb-1 whitespace-pre-wrap transition-all',
                                !isEndMsgExpanded && endMsg.length > 80 ?
                                    'line-clamp-3 max-h-24 overflow-hidden'
                                    : 'max-h-96 overflow-y-auto pr-1',
                            )}
                            dangerouslySetInnerHTML={{__html: endMsg}}
                        />
                        {endMsg.length > 80 && (
                            <button
                                type='button'
                                onClick={() => setIsEndMsgExpanded(!isEndMsgExpanded)}
                                className='text-pw-cyan hover:underline text-[11px] font-semibold mt-1 inline-flex items-center gap-1 focus:outline-none'>
                                {isEndMsgExpanded ? 'Read less' : 'Read more...'}
                            </button>
                        )}
                    </div>

                    <div className='divider mt-2 sm:hidden' />
                </div>

                <div
                    ref={bottomCompletionRef}
                    className='block space-y-1 w-full h-fit max-h-[40vh] overflow-y-auto no-scrollbar custom-scrollbar mb-1 relative'
                    id='bottom-completion'>
                    {quiz?.type === 'quiz' && quiz?.endScreen.showPerformance && (
                        <Card className='p-2 sm:p-6 bg-transparent ring-0 sm:bg-white/[0.02] sm:bkblur sm:backdrop-blur-lg sm:border sm:border-white/5 sm:rounded-2xl space-y-2 mt-4 text-left'>
                            <div
                                className='text-center'
                                id='total-score'>
                                <span className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block mb-1'>
                                    TOTAL OVERALL SCORE
                                </span>
                                <span className='text-3xl font-bold font-mono text-pw-primary'>
                                    {weightedScore.earned} / {scorePossible || weightedScore.possible}
                                </span>
                                <span className='mt-1 block text-xs text-pw-muted tracking-wide'>
                                    Attempted {attemptedCount} of {totalQuestions} questions
                                </span>
                            </div>

                            {/* Independent Questions Score Breakdown */}
                            {quiz?.category?.inPerformance &&
                                Object.keys(categoryScores).length > 0 && (
                                    <>
                                        {(() => {
                                            const independentQs = questions.filter(
                                                (quest: any) =>
                                                    !quest.category || quest.category.trim() === '',
                                            );
                                            if(independentQs.length === 0) return null;
                                            const independentAns = userAnswers.filter((a) =>
                                                independentQs.some((q: any) => q.id === a.questionId),
                                            );
                                            const indCorrect = independentAns.filter(
                                                (a: any) => a.correct,
                                            ).length;

                                            return (
                                                <div className='space-y-1.5'>
                                                    <div className='divider mb-3 sm:hidden' />

                                                    <div className='flex items-center justify-between text-xs p-2 bg-white/5 rounded-xl bkblur'>
                                                        <span className='font-bold text-white'>
                                                            Other Questions ({independentQs.length})
                                                        </span>
                                                        <span className='font-mono text-pw-cyan font-bold'>
                                                            {indCorrect} / {independentQs.length}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Group / Category Questions Score Breakdown */}

                                        <div className='space-y-1.5'>
                                            <div className='divider mb-4 sm:hidden' />

                                            <p
                                                className='text-[10px] text-pw-primary uppercase font-bold tracking-widest flex items-center gap-1 justify-between mb-1'
                                                onClick={() => setOpenCat(!openCat)}>
                                                <span>Category Scores</span>{' '}
                                                <div className=' p-1 text-pw-primary bg-transparent cursor-pointer flex items-center gap-1'>
                                                    {Object.entries(categoryScores).length > 3 && (
                                                        <>
                                                            <span>
                                                                ({Object.entries(categoryScores).length})
                                                            </span>
                                                            {openCat ?
                                                                <ChevronDown className='w-4 h-4' />
                                                                : <ChevronLeft className='w-4 h-4' />}
                                                        </>
                                                    )}
                                                </div>
                                            </p>

                                            {Object.entries(categoryScores)
                                                .slice(0, !openCat ? 3 : undefined)
                                                .map(([cat, stats], idx) => (
                                                    <div
                                                        key={cat + idx + 'score-category'}
                                                        className='flex items-center justify-between flex-wrap text-xs p-2 bg-white/5 rounded-xl bkblur'>
                                                        <span className='font-bold text-white flex gap-1 items-center truncate'>
                                                            <Folder className='w-3 h-3 text-pw-primary' />{' '}
                                                            {capFirst(cat)} ({stats?.total})
                                                        </span>
                                                        <span className='font-mono text-pw-primary font-bold'>
                                                            {stats?.correct} / {stats?.total}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </>
                                )}
                        </Card>
                    )}

                    {/* Per-question explanation review */}
                    {quiz?.type === 'quiz' &&
                        quiz?.correctOption &&
                        quiz?.correctOptionDes === 'in-result' &&
                        questions.some(
                            (q) =>
                                q.correctExplanation ||
                                (q.options as any[])?.some((o: any) => o.explanation),
                        ) &&
                        userAnswers.length > 0 && (
                            <>
                                <div className='divider my-4 sm:hidden' />

                                <Card className='p-2 sm:p-5 bg-transparent ring-0 sm:bg-white/[0.02] sm:bkblur sm:border sm:border-white/5 sm:rounded-2xl space-y-3 mt-4 text-left h-fit'>
                                    <p className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block flex flex-wrap gap-1 justify-between items-center text-pw-cyan'>
                                        <span>Question Review & Explanations</span>{' '}
                                        <button
                                            className='px-1 bg-transparent text-xs border-none hover:underline cursor-pointer'
                                            onClick={() => setOpenReview(!openReview)}>
                                            {openReview ? 'Close' : 'View'}{' '}
                                        </button>
                                    </p>

                                    {openReview &&
                                        questions.map((q, qi) => {
                                            const ans = userAnswers.find(
                                                (a) => a.questionId === q.id,
                                            );
                                            const opts = (q.options as any[]) || [];
                                            const userAnswerText =
                                                ans ?
                                                    Array.isArray(ans.answer) ?
                                                        ans.answer
                                                            .map(
                                                                (id: string) =>
                                                                    opts.find((o: any) => o.id === id)?.text ||
                                                                    id,
                                                            )
                                                            .join(', ')
                                                        : opts.find((o: any) => o.id === ans.answer)
                                                            ?.text || String(ans.answer)
                                                    : '(No answer)';
                                            const selOpt =
                                                !Array.isArray(ans?.answer) ?
                                                    opts.find((o: any) => o.id === ans?.answer)
                                                    : null;

                                            // Option image for selected answer
                                            const rawSelOptImg =
                                                selOpt?.uploadUrl ||
                                                (typeof selOpt?.imageUrl === 'string' ?
                                                    selOpt.imageUrl
                                                    : selOpt?.imageUrl?.url);
                                            const selOptImgUrl =
                                                rawSelOptImg ?
                                                    unpackPingWorldMediaUrl(rawSelOptImg).url
                                                    : undefined;

                                            // Question image if present
                                            const rawQImg =
                                                (q as any)?.uploadUrl ||
                                                (typeof (q as any)?.imageUrl === 'string' ?
                                                    (q as any).imageUrl
                                                    : (q as any)?.imageUrl?.url) ||
                                                (q as any)?.image;
                                            const qImgUrl =
                                                rawQImg ?
                                                    unpackPingWorldMediaUrl(rawQImg).url
                                                    : undefined;

                                            // DecodedCorrectIndex:
                                            const decodedIndex = decodeStoredCorrectAnswer(
                                                correctAnswersRef.current[q.id],
                                            );
                                            const hasCorrectIndex =
                                                decodedIndex !== null &&
                                                decodedIndex !== undefined &&
                                                decodedIndex !== '' &&
                                                !(
                                                    Array.isArray(decodedIndex) &&
                                                    decodedIndex.length === 0
                                                );
                                            const correctOpt =
                                                hasCorrectIndex ?
                                                    opts.find(
                                                        (o: any, oI: number) =>
                                                            o.id === decodedIndex ||
                                                            String(oI) === String(decodedIndex) ||
                                                            o.text === decodedIndex,
                                                    )
                                                    : undefined;

                                            return (
                                                <div
                                                    key={q.id + 'questions-list' + qi}
                                                    className={cn(
                                                        'p-2.5 sm:p-3.5 rounded-xl border text-xs space-y-1.5 bkblur',
                                                        ans?.correct === true ?
                                                            'bg-pw-success/5 border-pw-success/20'
                                                            : ans?.correct === false ?
                                                                'bg-pw-danger/5 border-pw-danger/20'
                                                                : 'bg-white/5 border-white/10',
                                                    )}>
                                                    <div
                                                        className={cn(
                                                            'flex items-start gap-1',
                                                            q.category?.trim() && 'flex-col',
                                                        )}>
                                                        <span
                                                            className={cn(
                                                                'font-bold shrink-0',
                                                                ans?.correct === true ? 'text-pw-success'
                                                                    : ans?.correct === false ? 'text-pw-danger'
                                                                        : 'text-pw-muted',
                                                            )}>
                                                            {ans?.correct === true ?
                                                                '✓'
                                                                : ans?.correct === false ?
                                                                    '✗'
                                                                    : '•'}{' '}
                                                            {`Q${qi + 1}${q.category ? ` (${q.category})` : ''}`}
                                                        </span>
                                                        <span
                                                            className='text-white/80 whitespace-pre-wrap mb-1'
                                                            dangerouslySetInnerHTML={{
                                                                __html: formatDetailVars(q.text),
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Question image attachment if present */}
                                                    {qImgUrl && (
                                                        <div className='pl-3 my-1'>
                                                            <Image
                                                                width={1200}
                                                                height={800}
                                                                unoptimized
                                                                draggable={false}
                                                                src={qImgUrl}
                                                                alt='Question media'
                                                                onClick={() =>
                                                                    openFile({
                                                                        src: qImgUrl,
                                                                        name: `Question attachment - Q${qi + 1}`,
                                                                        canDownload: false,
                                                                    })
                                                                }
                                                                onContextMenu={(event) =>
                                                                    event.preventDefault()
                                                                }
                                                                className='max-h-24 rounded-lg object-contain border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity select-none'
                                                            />
                                                        </div>
                                                    )}
                                                    <div
                                                        className={cn(
                                                            'pl-3 border-l-2',
                                                            ans?.correct === true ? 'border-pw-success'
                                                                : ans?.correct === false ? 'border-pw-danger'
                                                                    : 'border-pw-muted',
                                                        )}>
                                                        <p className='text-pw-muted whitespace-pre-wrap'>
                                                            Your answer:{' '}
                                                            <span
                                                                className='font-bold text-white'
                                                                dangerouslySetInnerHTML={{
                                                                    __html: formatDetailVars(userAnswerText),
                                                                }}
                                                            />
                                                        </p>
                                                        {Array.isArray(ans?.answerHistory) &&
                                                            ans.answerHistory.length > 0 && (
                                                                <div className='mt-2 space-y-1 text-[11px] text-pw-muted'>
                                                                    {ans.answerHistory.map(
                                                                        (
                                                                            revision: any,
                                                                            revisionIndex: number,
                                                                        ) => (
                                                                            <p
                                                                                key={`${q.id}-revision-${revisionIndex}`}
                                                                                className='whitespace-pre-wrap'>
                                                                                ({revisionIndex + 1}){' '}
                                                                                {formatAnswerRevision(revision, q)}
                                                                            </p>
                                                                        ),
                                                                    )}
                                                                    <p className='whitespace-pre-wrap'>
                                                                        ({ans.answerHistory.length + 1}){' '}
                                                                        {formatAnswerRevision(ans, q)}
                                                                    </p>
                                                                </div>
                                                            )}

                                                        {/* Selected option image display */}
                                                        {selOptImgUrl && (
                                                            <div className='my-1 flex items-center gap-2 flex-wrap'>
                                                                <span className='text-[10px] text-pw-muted'>
                                                                    Selected Image:
                                                                </span>
                                                                <Image
                                                                    width={800}
                                                                    height={600}
                                                                    unoptimized
                                                                    src={selOptImgUrl}
                                                                    alt='Selected option attachment'
                                                                    onClick={() =>
                                                                        openFile({
                                                                            src: selOptImgUrl,
                                                                            name: `Selected option image - Q${qi + 1}`,
                                                                        })
                                                                    }
                                                                    className='h-12 w-12 rounded-lg object-cover border border-white/10 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Uploaded answer attachment preview */}
                                                        {ans?.fileUrl &&
                                                            (() => {
                                                                const unpacked =
                                                                    unpackPingWorldMediaUrl(ans.fileUrl).url ||
                                                                    ans.fileUrl;
                                                                const fileName =
                                                                    ans.fileName ||
                                                                    `Uploaded answer - Q${qi + 1}`;
                                                                const isImage =
                                                                    ans.fileType?.startsWith('image/') ||
                                                                    String(unpacked).startsWith(
                                                                        'data:image/',
                                                                    ) ||
                                                                    /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#]|$)/i.test(
                                                                        fileName,
                                                                    );
                                                                return (
                                                                    <div className='my-1 flex items-start gap-1 flex-col'>
                                                                        {isImage && (
                                                                            <Image
                                                                                width={800}
                                                                                height={600}
                                                                                unoptimized
                                                                                src={unpacked}
                                                                                alt={fileName}
                                                                                onClick={() =>
                                                                                    openFile({
                                                                                        src: unpacked,
                                                                                        name: fileName,
                                                                                        mimeType: ans.fileType,
                                                                                    })
                                                                                }
                                                                                className='h-auto max-h-28 w-auto max-w-full rounded-lg object-contain border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity'
                                                                            />
                                                                        )}
                                                                        <button
                                                                            type='button'
                                                                            onClick={() =>
                                                                                openFile({
                                                                                    src: unpacked,
                                                                                    name: fileName,
                                                                                    mimeType: ans.fileType,
                                                                                })
                                                                            }
                                                                            className='text-[10px] flex items-center gap-1 mb-1 text-pw-cyan hover:underline truncate'>
                                                                            <CheckCircle2 className='w-4 h-4' />
                                                                            Preview {fileName}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })()}

                                                        {/* Show correct answer if taker got it wrong and correct answer was set */}
                                                        {ans?.correct === false &&
                                                            decodedIndex !== null &&
                                                            decodedIndex !== undefined &&
                                                            decodedIndex !== '' &&
                                                            correctOpt &&
                                                            (correctOpt?.uploadUrl ||
                                                                correctOpt?.imageUrl ||
                                                                correctOpt?.imageUrl?.url) &&
                                                            (() => {
                                                                const rawCorrectImg =
                                                                    correctOpt?.uploadUrl ||
                                                                    (typeof correctOpt?.imageUrl === 'string' ?
                                                                        correctOpt?.imageUrl
                                                                        : correctOpt?.imageUrl?.url);
                                                                const correctImgUrl =
                                                                    rawCorrectImg ?
                                                                        unpackPingWorldMediaUrl(rawCorrectImg).url
                                                                        : undefined;
                                                                return (
                                                                    <div className='text-xs text-pw-success/90 font-medium space-y-1 pt-0.5'>
                                                                        <p>
                                                                            Correct answer:{' '}
                                                                            <span
                                                                                className='font-bold text-pw-success'
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: formatDetailVars(
                                                                                        correctOpt?.text ||
                                                                                        String(decodedIndex),
                                                                                    ),
                                                                                }}
                                                                            />
                                                                        </p>
                                                                        {correctImgUrl && (
                                                                            <div className='flex items-center gap-1 mt-1 flex-col'>
                                                                                <span className='text-[10px] text-pw-muted'>
                                                                                    Correct Image:
                                                                                </span>
                                                                                <Image
                                                                                    width={800}
                                                                                    height={600}
                                                                                    unoptimized
                                                                                    src={correctImgUrl}
                                                                                    alt='Correct option attachment'
                                                                                    onClick={() =>
                                                                                        openFile({
                                                                                            src: correctImgUrl,
                                                                                            kind: 'image',
                                                                                            name: `Correct Option Image - Q${qi + 1}`,
                                                                                        })
                                                                                    }
                                                                                    className='h-12 w-12 rounded-lg object-cover border border-pw-success/30 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}

                                                        {((q.correctExplanation &&
                                                            quiz?.correctOptionDes === 'in-result') ||
                                                            (hasCorrectIndex ?
                                                                correctOpt?.explanation
                                                                : undefined)) && (
                                                                <p
                                                                    className='text-pw-cyan/90 mt-2 mb-1 whitespace-pre-wrap'
                                                                    dangerouslySetInnerHTML={{
                                                                        __html:
                                                                            '<b>Question Tip:</b> ' +
                                                                            formatDetailVars(
                                                                                q.correctExplanation ||
                                                                                correctOpt?.explanation ||
                                                                                '',
                                                                            ),
                                                                    }}
                                                                />
                                                            )}
                                                        {selOpt?.explanation &&
                                                            q.correctExplanation !== selOpt.explanation && (
                                                                <>
                                                                    <div className='my-2 divider' />
                                                                    <p
                                                                        className='text-pw-cyan/90 whitespace-pre-wrap'
                                                                        dangerouslySetInnerHTML={{
                                                                            __html:
                                                                                '<b>Option Tip:</b> ' +
                                                                                formatDetailVars(selOpt.explanation),
                                                                        }}
                                                                    />
                                                                </>
                                                            )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </Card>
                            </>
                        )}

                    <AnimatePresence>
                        {(localScrollUp || showCompletionScrollUp) && (
                            <motion.div
                                initial={{opacity: 0, y: 12}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, y: 12}}
                                transition={{duration: 0.18}}
                                className='fixed bottom-[20vh] right-4 z-[80]'>
                                <Button
                                    aria-label='Scroll to score'
                                    className='w-11 h-11 p-1 flex items-center rounded-full shadow-md border-none shadow-pw-primary/60 bg-pw-surface/40 bkblur hover:shadow-lg hover:bg-pw-surface/80'
                                    onClick={() => {
                                        const el = bottomCompletionRef.current || document.getElementById('bottom-completion');
                                        if (el) {
                                            el.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                        document.getElementById('total-score')?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center',
                                        });
                                    }}>
                                    <ChevronUp className='w-4 h-4 text-white' />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className='w-full my-1 inline-grid'>
                    <div className='divider my-2 mb-3 hidden' />

                    <div className='flex flex-row gap-1 w-full self-center items-center justify-center'>
                        <Link
                            href={isLoggedIn ? '/quiz' : '/tools'}
                            className='w-full'>
                            <Button className='gradient-dark w-full px-4 max-w-xl hover:rounded-full items-center text-center border-none flex h-10 rounded-xl font-bold'>
                                Close Quiz
                            </Button>
                        </Link>

                        {quiz?.allowRetry && (
                            <Button
                                variant={'ghost'}
                                onClick={() => {
                                    window.location.reload();
                                }}
                                className='gradient-brand w-10 h-10 border-pw-cyan border-none flex items-center rounded-full font-bold'>
                                <RefreshCcw className='w-5 h-5' />
                            </Button>
                        )}
                    </div>

                    {!isLocalPreview && savedResponseId && quiz?.responsesPublicId &&  (
                        <div className='flex justify-center pt-3'>
                            <Button
                                type='button'
                                variant='outline'
                                className='border-white/15 bg-white/5 text-white hover:bg-white/10'
                                onClick={() => setShowResponseShareAction(true)}>
                                <Share2 className='mr-2 h-4 w-4' /> Share or export response
                            </Button>
                        </div>
                    )}
                </div>

                {/* PingWorld compliance disclaimer footer on completion screen */}
                <div className='text-[10px] text-pw-muted leading-tight max-w-lg mx-auto text-left font-body'>
                    <div className='divider my-3' />
                    <div className='flex gap-1 items-center justify-center'>
                        <Image
                            width={20}
                            height={20}
                            src='/images/logo.png'
                            alt='Ping World Logo'
                            className='h-5 w-5 object-fit'
                        />

                        <p>
                            PingWorld is a service provider hosting this{' '}
                            {quiz?.type ?? 'assessment'}. We are not responsible for any
                            questions, responses, or outcomes generated in this{' '}
                            {quiz?.type ?? 'assessment'}.
                        </p>
                    </div>
                </div>
            </div>

            {showResponseShare && quiz?.responsesPublicId &&  (
                <div
                    className='fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4'
                    role='dialog'
                    aria-modal='true'
                    aria-labelledby='response-share-title'
                    onMouseDown={(event) => {
                        if(event.target === event.currentTarget)
                            setShowResponseShareAction(false);
                    }}>
                    <Card className='w-full max-w-md space-y-2 border-white/10 bg-[#111426] p-5 text-left shadow-2xl'>
                        <div className='flex items-start justify-between gap-4 mb-2'>
                            <div>
                                <h2
                                    id='response-share-title'
                                    className='text-lg font-bold text-white'>
                                    Share your response
                                </h2>
                                <p className='text-sm text-pw-muted'>
                                    Share or export is available when the setter has made this response public.
                                </p>
                            </div>
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                aria-label='Close'
                                onClick={() => setShowResponseShareAction(false)}>
                                <X className='h-4 w-4' />
                            </Button>
                        </div>
                        {!quiz?.responsesPublicId && (
                            <p className='text-xs text-pw-muted mt-[-5px]'>
                                The setter has kept responses private, so links and exports are disabled.
                            </p>
                        )}

                        {quiz?.responsesPublicId &&
                            <>
                                <Button
                                    type='button'
                                    className='btn-primary w-full mt-1 mb-0'
                                    disabled={!quiz?.responsesPublicId || isResponseActionBusy}
                                    onClick={async () => {
                                        if(isResponseActionBusy) return;
                                        setIsResponseActionBusy(true);
                                        try {
                                            if(!quiz?.responsesPublicId)
                                                throw new Error(
                                                    'The setter has not enabled response sharing for this assessment.',
                                                );
                                            const url = `${window.location.origin}/quiz/responses/${quiz.responsesPublicId}/taker?responseId=${encodeURIComponent(savedResponseId)}`;
                                            await navigator.clipboard.writeText(url);
                                            toast.success('Response link copied.');
                                            setShowResponseShareAction(false);
                                        } catch(error) {
                                            toast.error(
                                                error instanceof Error ?
                                                    error.message
                                                    : 'Could not create a response link.',
                                            );
                                        } finally {
                                            setIsResponseActionBusy(false);
                                        }
                                    }}>
                                    {isResponseActionBusy ? <LoaderCircle className='mr-2 h-4 w-4 animate-spin' /> : <Copy className='mr-2 h-4 w-4' />}
                                    {isResponseActionBusy ? 'Working...' : 'Copy link'}
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    className='w-full border-white/15 bg-white/5 text-white hover:bg-white/10 my-0'
                                    disabled={!quiz?.responsesPublicId || isResponseActionBusy}
                                    onClick={async () => {
                                        if(isResponseActionBusy) return;
                                        setIsResponseActionBusy(true);
                                        try {
                                            const snapshot = finalSubmissionSnapshotRef.current;
                                            const questionsList = (snapshot?.questionIds || [])
                                                .map((id) =>
                                                    questions.find(
                                                        (question) => String(question.id) === String(id),
                                                    ),
                                                )
                                                .filter(Boolean);
                                            const responseAnswers = snapshot?.answers || [];
                                            const attemptedCount = new Set(
                                                responseAnswers
                                                    .filter(
                                                        (answer: any) =>
                                                            !answer.passed &&
                                                            (answer.fileUrl || answer.answer !== undefined && answer.answer !== '' && (!Array.isArray(answer.answer) || answer.answer.length > 0)),
                                                    )
                                                    .map((answer: any) => String(answer.questionId)),
                                            ).size;
                                            await exportQuizFeedbackPdf(
                                                {
                                                    quiz: {...quiz, questions},
                                                    responses: [
                                                        {
                                                            id: savedResponseId,
                                                            timestamp: new Date().toISOString(),
                                                            submittedAt: new Date().toISOString(),
                                                            startedAt: snapshot?.startedAt,
                                                            score: weightedScore?.earned,
                                                            scorePossible: weightedScore?.possible || scorePossible,
                                                            totalQuestions: snapshot?.totalQuestions,
                                                            answeredQuestions: attemptedCount,
                                                            userData,
                                                            answers: responseAnswers,
                                                            branchHistory: snapshot?.branchHistory || [],
                                                            submissionReason: snapshot?.reason,
                                                            pathQuestionSnapshots: questions,
                                                        },
                                                    ],
                                                    responseIndex: 0,
                                                    takerNumber: 1,
                                                },
                                                `${quiz?.title || 'assessment'}-response`,
                                            );
                                            setShowResponseShareAction(false);
                                        } catch(error) {
                                            toast.error(
                                                error instanceof Error ?
                                                    error.message
                                                    : 'Could not export this response.',
                                            );
                                        } finally {
                                            setIsResponseActionBusy(false);
                                        }
                                    }}>
                                    {isResponseActionBusy ? <LoaderCircle className='mr-2 h-4 w-4 animate-spin' /> : <FileText className='mr-2 h-4 w-4' />}
                                    {isResponseActionBusy ? 'Preparing PDF...' : 'Export PDF'}
                                </Button>
                            </>
                        }
                        <Button
                            type='button'
                            variant='ghost'
                            className='w-full text-pw-muted'
                            disabled={isResponseActionBusy}
                            onClick={() => setShowResponseShareAction(false)}>
                            Cancel
                        </Button>
                    </Card>
                </div>
            )}
        </div>
    );
}
