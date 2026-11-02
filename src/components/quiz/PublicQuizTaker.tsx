'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  CheckCircle2,
  Brain,
  Clock,
  AlertTriangle,
  Info,
  LogOut,
  Flag,
  X,
  LoaderCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { HybridStorage } from '@/lib/storage-utils';
import { capFirst, cn } from '@/lib/utils';
import React from 'react';
import {
  quizHaptic,
  type Question,
  type Quiz,
  type QuizOption,
} from '@/app/(main)/quiz';
import { useParams, useRouter } from 'next/navigation';
import { usePageLayout } from '@/components/layout';
import { useAppContext } from '@/context/AppContext';
import { useAppModal } from '../ui/AppModalProvider';
import {
  resolvePipedText,
  evaluateQuizCondition,
  unpackPingWorldMediaUrl,
} from '@/lib/quiz/quiz-piping';
import { parseWhitelistedHtml } from '@/lib/quiz/text-parser';
import {
  playQuizStartTone,
  playQuizCompletionTone,
} from '@/lib/quiz/quiz-audio';
import { triggerConfetti } from '@/lib/confetti';
import { detectClientGeo } from '@/lib/countries/geo-detector';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';
import { DEFAULT_PINGWORLD_SHOWCASE_QUIZ } from '@/lib/quiz/default-quiz-template';
import Image from 'next/image';
import {
  calculateCategoryScores,
  calculateQuizPoints,
  decodeStoredCorrectAnswer,
  evaluateQuizAnswer,
  getAssessmentDeviceKey,
  getPrivateQuizAccessToken,
  isAnswerAttempted,
  keepAnswerRevision,
  normalizeOptionValue,
} from './func';
import {
  NoRetry,
  NotFound,
  Offline,
  UnderReview,
  ExpiredSection,
  Details,
  IntroSection,
  Private,
  Security,
  SubmittingPage,
  Finished,
  QuestionSection,
} from './sections';
import { toast } from 'sonner';

function Taker() {
  const { openFile, isFileOpen } = useAppFileViewer();
  const isFileOpenRef = useRef(isFileOpen);
  isFileOpenRef.current = isFileOpen;
  const router = useRouter();
  const { setHideNavbar, setHideFooter, setPaddingTop } = usePageLayout();
  setHideNavbar(true);
  setHideFooter(true);
  setPaddingTop('pt-0');

  const { isLoggedIn, username, user } = useAppContext();
  const { showConfirm } = useAppModal();

  const params = useParams();
  const routeParamId = (params?.id || params?.customQuizId) as string;

  const quizSetter = (params?.userId || params?.username || params?.setter) as
    | string
    | undefined;
  const isLocalPreview = routeParamId === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const initialDocumentTitleRef = useRef('');
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!initialDocumentTitleRef.current)
      initialDocumentTitleRef.current = document.title;
    if (quiz?.title) {
      const assessmentType = quiz.type ? ` · ${capFirst(quiz.type)}` : '';
      document.title = `${capFirst(quiz.title)}${assessmentType} | Ping World`;
    }
    return () => {
      if (!quiz) return;
      document.title = initialDocumentTitleRef.current || 'Ping World';
    };
  }, [quiz?.id, quiz?.title, quiz?.type]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [scorePossible, setScorePossible] = useState(0);
  const [showCompletionScrollUp, setShowCompletionScrollUp] = useState(false);
  const [serverCategoryScores, setServerCategoryScores] = useState<Record<
    string,
    { correct: number; total: number }
  > | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showResponseShare, setShowResponseShare] = useState(false);
  const [savedResponseId, setSavedResponseId] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const [started, setStart] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Record<string, QuizOption[]>
  >({});

  /* Ref for auto-scroll to the first question on scroll layout start */
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const firstQuestionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFinished) {
      setShowCompletionScrollUp(false);
      return;
    }
    const panel = document.getElementById('bottom-completion');
    const scoreElement = document.getElementById('total-score');
    if (!panel || !scoreElement) return;
    const update = () => {
      const scrollable = panel.scrollHeight > panel.clientHeight + 5;
      const scoreRect = scoreElement.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const scoreVisible =
        scoreRect.bottom > panelRect.top && scoreRect.top < panelRect.bottom;
      setShowCompletionScrollUp(
        scrollable && (!scoreVisible || panel.scrollTop > 5),
      );
    };
    const observer = new ResizeObserver(update);
    const mutations = new MutationObserver(update);
    observer.observe(panel);
    observer.observe(scoreElement);
    mutations.observe(panel, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    panel.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      mutations.disconnect();
      panel.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isFinished, score, scorePossible]);

  useEffect(() => {
    if (quiz?.quizScroll && started) {
      let secondFrame = 0;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          firstQuestionRef.current?.scrollIntoView({
            behavior: 'auto',
            block: 'start',
          });
        });
      });
      return () => {
        window.cancelAnimationFrame(firstFrame);
        window.cancelAnimationFrame(secondFrame);
      };
    }
  }, [started, quiz?.quizScroll]);

  useEffect(() => {
    if (!started || !quiz?.quizScroll || quiz.quizLayout !== 'scroll_show')
      return;
    const timer = window.setTimeout(
      () =>
        firstQuestionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      80,
    );
    return () => window.clearTimeout(timer);
  }, [currentQuestion, started, quiz?.quizScroll, quiz?.quizLayout]);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [hasAlreadyCompleted, setHasAlreadyCompleted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineUncached, setIsOfflineUncached] = useState(false);
  const [isQuizExpired, setIsQuizExpired] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleWindowFocus = () =>
      window.setTimeout(() => {
        uploadPickerOpenRef.current = false;
      }, 250);
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Working Offline: Responses will be saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    const onResponseSyncError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      toast.error(
        `${detail?.message || 'Response upload failed.'} Your response remains saved on this device.`,
      );
    };
    window.addEventListener('pw_quiz_response_sync_error', onResponseSyncError);
    return () =>
      window.removeEventListener(
        'pw_quiz_response_sync_error',
        onResponseSyncError,
      );
  }, []);

  const [showIntro, setShowIntro] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [detailsCollected, setDetailsCollected] = useState(false);
  const [userData, setUserData] = useState<Record<string, string>>({});

  const [expandedQuestionExplanationIds, setExpandedQuestionExplanationIds] =
    useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportedStatus, setReportedStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmittingScreen, setShowSubmittingScreen] = useState(false);
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const isSubmittingRef = React.useRef(false);
  isSubmittingRef.current = isSubmitting;
  const [isPreparingResponseFile, setIsPreparingResponseFile] = useState(false);
  const pendingResponseFileReadsRef = useRef(new Set<string>());
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const uploadPickerOpenRef = React.useRef(false);

  const [branchVisitCounts, setBranchVisitCounts] = useState<
    Record<string, number>
  >({});
  const [scrollBranchQuestionIds, setScrollBranchQuestionIds] = useState<
    string[] | null
  >(null);
  const [scrollBranchRootIndex, setScrollBranchRootIndex] = useState<
    number | null
  >(null);
  const scrollShowBranchActive = useRef(false);

  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  // userAnswers is the canonical answer store. Scroll layouts consume this
  // indexed projection instead of keeping a second mutable copy that could
  // drift from scoring, snapshots, or submission.
  const scrollAnswers = useMemo(
    () =>
      Object.fromEntries(
        userAnswers
          .filter((answer) => answer && typeof answer.questionId === 'string')
          .map((answer) => [
            answer.questionId,
            answer.fileUrl || answer.answer,
          ]),
      ),
    [userAnswers],
  );
  const setScrollAnswers = useCallback<
    React.Dispatch<React.SetStateAction<Record<string, any>>>
  >((action) => {
    setUserAnswers((previous) => {
      const current = Object.fromEntries(
        previous
          .filter((answer) => answer && typeof answer.questionId === 'string')
          .map((answer) => [
            answer.questionId,
            answer.fileUrl || answer.answer,
          ]),
      );
      const next = typeof action === 'function' ? action(current) : action;
      let updated = previous;
      for (const [questionId, answerValue] of Object.entries(next || {})) {
        if (Object.is(current[questionId], answerValue)) continue;
        const index = updated.findIndex(
          (answer) => answer.questionId === questionId,
        );
        const oldAnswer = index >= 0 ? updated[index] : null;
        let nextAnswer: any;
        if (oldAnswer) {
          const answerWithoutScore = { ...oldAnswer };
          delete answerWithoutScore.correct;
          delete answerWithoutScore.pointsEarned;
          delete answerWithoutScore.pointsPossible;
          nextAnswer = keepAnswerRevision(oldAnswer, {
            ...answerWithoutScore,
            questionId,
            answer: answerValue,
          });
        } else {
          nextAnswer = { questionId, answer: answerValue };
        }
        updated =
          index >= 0 ?
            updated.map((answer, answerIndex) =>
              answerIndex === index ? nextAnswer : answer,
            )
          : [...updated, nextAnswer];
      }
      return updated;
    });
  }, []);
  const latestUserAnswersRef = React.useRef<any[]>([]);
  latestUserAnswersRef.current = userAnswers;
  const [visitedQuestionIds, setVisitedQuestionIds] = useState<string[]>([]);
  const [branchHistory, setBranchHistory] = useState<
    Array<{
      fromQuestionId: string;
      targetQuestionId?: string;
      category?: string;
      questionIds: string[];
      at: string;
    }>
  >([]);
  const finalSubmissionSnapshotRef = useRef<{
    answers: any[];
    userData: Record<string, string>;
    questionIds: string[];
    reason: 'completion' | 'timeout' | 'self_submit' | 'violation';
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
  } | null>(null);
  const finalizationScreenTimerRef = useRef<number | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [quizTheme, setQuizTheme] = useState<'dark' | 'light'>('dark');
  const [cheatAttempts, setCheatAttempts] = useState(0);
  const lastSecuritySignalRef = useRef(0);
  const [showSecurityProtocol, setShowSecurityProtocol] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [quizUnavailable, setQuizUnavailable] = useState(false);
  const [isQuizUnderReview, setIsQuizUnderReview] = useState(false);
  const [privateAccessGranted, setPrivateAccessGranted] = useState(false);
  const pendingUnloadCb = React.useRef<(() => void) | null>(null);
  const correctAnswersRef = React.useRef<Record<string, any>>({});
  const activeAttemptRef = React.useRef<Record<string, any> | null>(null);
  const finalizingRef = React.useRef(false);
  const finalizeForNavigationRef = React.useRef<
    | ((answers: any[], reason: 'self_submit' | 'violation') => Promise<void>)
    | null
  >(null);
  const navigationPromptOpenRef = React.useRef(false);
  const restoredAttemptTimerRef = React.useRef(false);
  const restoredQuestionTimerRef = React.useRef(false);
  const lastAttemptSyncRef = React.useRef('');

  // Custom states for reporting quizzes
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMobileAccessory, setShowMobileAccessory] = useState(false);
  const [reportCategory, setReportCategory] = useState('Spam');
  const [dismissedQuizInfo, setDismissedQuizInfo] = useState(false);

  const createAttemptSnapshot = useCallback(
    (
      answersOverride?: any[],
      userDataOverride: Record<string, string> = userData,
    ) => {
      const answers: Record<string, any> = {};
      for (const answer of answersOverride || userAnswers) {
        if (answer?.questionId) answers[String(answer.questionId)] = answer;
      }
      const activeQuestion = activeQuestions[currentQuestion];
      // Scroll layouts already write every edit to userAnswers (the source of
      // truth). Only fold the transient single-question controls into the
      // snapshot here.
      if (activeQuestion && !quiz?.quizScroll) {
        let currentAnswer: any;
        if (activeQuestion.type === 'checkbox') {
          currentAnswer = selectedOptions;
        } else if (activeQuestion.type === 'input') {
          currentAnswer = content;
        } else if (
          activeQuestion.type === 'range' ||
          activeQuestion.type === 'rating'
        ) {
          currentAnswer = selectedOption;
        } else if (activeQuestion.type !== 'upload') {
          currentAnswer = selectedOption;
        }
        const hasAnswer =
          activeQuestion.type === 'rating' ? Number(currentAnswer) >= 1
          : Array.isArray(currentAnswer) ? currentAnswer.length > 0
          : currentAnswer && typeof currentAnswer === 'object' ? true
          : String(currentAnswer ?? '').trim().length > 0;
        if (hasAnswer) {
          answers[activeQuestion.id] = {
            ...(answers[activeQuestion.id] || {}),
            questionId: activeQuestion.id,
            answer: currentAnswer,
          };
        }
      }
      const previous = activeAttemptRef.current || {};
      return {
        ...previous,
        quizId: quiz?.id,
        attemptId: previous.attemptId || crypto.randomUUID(),
        attemptToken:
          previous.attemptToken ||
          Array.from(crypto.getRandomValues(new Uint8Array(48)), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join(''),
        deviceKey: previous.deviceKey || getAssessmentDeviceKey(),
        status: 'in_progress',
        startedAt: previous.startedAt || new Date().toISOString(),
        answers,
        questionOrder: activeQuestions.map((question) => question.id),
        userData: userDataOverride,
        currentQuestionIndex: currentQuestion,
        visitedQuestionIds: Array.from(
          new Set([
            ...(previous.visitedQuestionIds || []),
            ...(activeQuestions[currentQuestion]?.id ?
              [activeQuestions[currentQuestion].id]
            : []),
          ]),
        ),
        branchHistory,
        scrollAnswers,
        selectedOption,
        selectedOptions,
        content,
        timeLeft,
        questionTimeLeft,
        updatedAt: Date.now(),
      };
    },
    [
      activeQuestions,
      content,
      currentQuestion,
      questionTimeLeft,
      quiz,
      scrollAnswers,
      selectedOption,
      selectedOptions,
      timeLeft,
      userAnswers,
      visitedQuestionIds,
      branchHistory,
      userData,
    ],
  );

  const syncAttemptSnapshot = useCallback(
    async (snapshot: Record<string, any>, keepalive = false) => {
      if (!quiz || isLocalPreview) return false;
      if(
        finalSubmissionSnapshotRef.current &&
        !snapshot.finalSubmissionSnapshot
      )
        return false;
      if (
        snapshot.finalSubmissionSnapshot &&
        snapshot.attemptId &&
        snapshot.attemptToken
      ) {
        const check = await fetch('/api/quiz-responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId: quiz.id,
            response: {
              submissionId: snapshot.attemptId,
              attemptToken: snapshot.attemptToken,
              idempotencyCheck: true,
            },
          }),
          cache: 'no-store',
        }).catch(() => null);
        if (check?.ok) {
          const prior = await check.json().catch(() => null);
          if (prior?.success === true) {
            activeAttemptRef.current = { ...snapshot, status: 'submitted' };
            return prior;
          }
        }
      }
      let accessToken = '';
      try {
        const { data: authState } = await supabase.auth.getSession();
        accessToken = authState.session?.access_token || '';
      } catch {}
      let preparedSnapshot = snapshot;
      try {
        await HybridStorage.saveQuizAttemptDraft(quiz.id, snapshot);
      } catch {
        toast.error(
          'This device could not cache the assessment progress. Keep this tab open and retry.',
        );
        return false;
      }
      if (!navigator.onLine) {
        activeAttemptRef.current = snapshot;
        return false;
      }

      const hasPendingResponseMedia = Object.values(
        snapshot.answers || {},
      ).some((answer: any) => {
        if (typeof answer?.fileUrl !== 'string') return false;
        const source =
          unpackPingWorldMediaUrl(answer.fileUrl).url || answer.fileUrl;
        return source.startsWith('data:');
      });

      // Create the remote attempt before signing response-media uploads. The upload signer
      // verifies the attempt token and will correctly reject an attempt that does not exist yet.
      if (!preparedSnapshot.remoteStarted && hasPendingResponseMedia) {
        try {
          const startResponse = await fetch('/api/quiz-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'start',
              accessToken,
              quizId: quiz.id,
              attemptId: snapshot.attemptId,
              attemptToken: snapshot.attemptToken,
              questionOrder: snapshot.questionOrder,
              deviceKey: snapshot.deviceKey,
              privateQuizAccessToken: getPrivateQuizAccessToken(quiz.id),
              userData: snapshot.userData,
              currentQuestionIndex: snapshot.currentQuestionIndex,
              finalizing: Boolean(snapshot.finalSubmissionSnapshot),
              submissionReason: snapshot.finalSubmissionSnapshot?.reason,
              allowBackwardNavigation: quiz.canGoBack !== false,
            }),
            keepalive,
            signal: keepalive ? undefined : AbortSignal.timeout(5000),
          });
          if (!startResponse.ok) return false;
          const startResult = await startResponse.json();
          preparedSnapshot = {
            ...snapshot,
            status:
              snapshot.finalSubmissionSnapshot ? 'submitting' : snapshot.status,
            remoteStarted: true,
            serverStartedAt:
              startResult.startedAt ||
              snapshot.serverStartedAt ||
              snapshot.startedAt,
          };
          activeAttemptRef.current = preparedSnapshot;
          await HybridStorage.saveQuizAttemptDraft(quiz.id, preparedSnapshot);
        } catch {
          return false;
        }
      }

      if (
        finalSubmissionSnapshotRef.current &&
        !snapshot.finalSubmissionSnapshot
      )
        return false;
      if (navigator.onLine) {
        try {
          preparedSnapshot = await HybridStorage.prepareQuizAttemptSnapshot(
            quiz.id,
            snapshot,
          );
        } catch {
          /* Keep the full local draft and retry media sync on the next save. */
        }
      }
      activeAttemptRef.current = preparedSnapshot;
      try {
        await HybridStorage.saveQuizAttemptDraft(quiz.id, preparedSnapshot);
      } catch {
        toast.error(
          'This device could not cache the assessment progress. Keep this tab open and retry.',
        );
        return false;
      }
      if (!navigator.onLine) return false;
      const action = preparedSnapshot.remoteStarted ? 'save' : 'start';
      try {
        const response = await fetch('/api/quiz-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            accessToken,
            quizId: quiz.id,
            attemptId: preparedSnapshot.attemptId,
            attemptToken: preparedSnapshot.attemptToken,
            answers: preparedSnapshot.answers,
            questionOrder: preparedSnapshot.questionOrder,
            userData: preparedSnapshot.userData,
            currentQuestionIndex: preparedSnapshot.currentQuestionIndex,
            finalizing: Boolean(preparedSnapshot.finalSubmissionSnapshot),
            submissionReason: preparedSnapshot.finalSubmissionSnapshot?.reason,
            visitedQuestionIds: preparedSnapshot.visitedQuestionIds,
            branchHistory: preparedSnapshot.branchHistory,
            allowBackwardNavigation: quiz.canGoBack !== false,
            deviceKey: preparedSnapshot.deviceKey,
            privateQuizAccessToken: getPrivateQuizAccessToken(quiz.id),
          }),
          keepalive,
          signal: keepalive ? undefined : AbortSignal.timeout(5000),
        });
        if (response.status === 409) {
          activeAttemptRef.current = preparedSnapshot;
          return { success: true, alreadyClosed: true };
        }
        if (!response.ok) return false;
        const result = await response.json();
        const nextSnapshot = {
          ...preparedSnapshot,
          status:
            preparedSnapshot.finalSubmissionSnapshot ? 'submitting' : (
              preparedSnapshot.status
            ),
          remoteStarted: true,
          serverStartedAt:
            result.startedAt ||
            preparedSnapshot.serverStartedAt ||
            preparedSnapshot.startedAt,
        };
        activeAttemptRef.current = nextSnapshot;
        await HybridStorage.saveQuizAttemptDraft(quiz.id, nextSnapshot);
        lastAttemptSyncRef.current = JSON.stringify({
          answers: preparedSnapshot.answers,
          currentQuestionIndex: preparedSnapshot.currentQuestionIndex,
          visitedQuestionIds: preparedSnapshot.visitedQuestionIds,
          branchHistory: preparedSnapshot.branchHistory,
        });
        return result;
      } catch {
        return false;
      }
    },
    [isLocalPreview, quiz],
  );

  const startAssessment = useCallback(
    (initialUserData: Record<string, string> = userData) => {
      if (!quiz || isLocalPreview) {
        quizHaptic(18);
        playQuizStartTone();
        setStart(true);
        return;
      }
      let snapshot = createAttemptSnapshot([], initialUserData);
      if (activeAttemptRef.current?.status === 'in_progress') {
        snapshot = {
          ...activeAttemptRef.current,
          ...snapshot,
          attemptId: activeAttemptRef.current.attemptId,
          attemptToken: activeAttemptRef.current.attemptToken,
        };
      }
      activeAttemptRef.current = snapshot;
      setStart(true);
      quizHaptic(18);
      playQuizStartTone();
      void syncAttemptSnapshot(snapshot);
    },
    [
      createAttemptSnapshot,
      isLocalPreview,
      quiz,
      syncAttemptSnapshot,
      userData,
    ],
  );

  useEffect(() => {
    if (
      !started ||
      !quiz ||
      isLocalPreview ||
      isFinished ||
      isSubmitting ||
      submissionFailed ||
      finalSubmissionSnapshotRef.current ||
      finalizingRef.current
    )
      return;
    const snapshot = createAttemptSnapshot();
    activeAttemptRef.current = snapshot;
    void HybridStorage.saveQuizAttemptDraft(quiz.id, snapshot).catch(() => {
      toast.error('Assessment progress could not be cached on this device.');
    });
    const delay =
      activeQuestions[currentQuestion]?.type === 'input' ? 800 : 250;
    const fingerprintFor = (candidate: Record<string, any>) =>
      JSON.stringify({
        answers: candidate.answers,
        currentQuestionIndex: candidate.currentQuestionIndex,
        visitedQuestionIds: candidate.visitedQuestionIds,
        branchHistory: candidate.branchHistory,
      });
    const syncIfChanged = () => {
      const latest = createAttemptSnapshot();
      const fingerprint = fingerprintFor(latest);
      if (fingerprint !== lastAttemptSyncRef.current)
        void syncAttemptSnapshot(latest);
    };
    const timer = window.setTimeout(syncIfChanged, delay);
    const retryTimer = window.setInterval(syncIfChanged, 15_000);
    window.addEventListener('online', syncIfChanged);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(retryTimer);
      window.removeEventListener('online', syncIfChanged);
    };
  }, [
    activeQuestions,
    createAttemptSnapshot,
    currentQuestion,
    isFinished,
    isSubmitting,
    submissionFailed,
    isLocalPreview,
    quiz,
    scrollAnswers,
    selectedOption,
    selectedOptions,
    started,
    syncAttemptSnapshot,
    userAnswers,
    userData,
    content,
  ]);

  useEffect(() => {
    if (
      !started ||
      !quiz ||
      isLocalPreview ||
      isFinished ||
      isSubmitting ||
      submissionFailed ||
      finalSubmissionSnapshotRef.current ||
      finalizingRef.current
    )
      return;
    const flush = () => {
      if (finalizingRef.current) return;
      const snapshot = createAttemptSnapshot();
      void syncAttemptSnapshot(snapshot, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    createAttemptSnapshot,
    isFinished,
    isSubmitting,
    submissionFailed,
    isLocalPreview,
    quiz,
    started,
    syncAttemptSnapshot,
  ]);

  // 1. Initial Load
  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      try {
        let data: Quiz | null = null;
        let moderationPaused = false;
        if (isLocalPreview && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('pw_quiz_template_v1');
            const stored = raw ? (JSON.parse(raw) as Quiz | null) : null;
            if (stored?.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
              data = stored;
            }
          } catch {}

          data ||= DEFAULT_PINGWORLD_SHOWCASE_QUIZ;
        } else {
          if (!routeParamId) {
            data = null;
          } else if (
            routeParamId === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id ||
            routeParamId === 'template'
          ) {
            data = DEFAULT_PINGWORLD_SHOWCASE_QUIZ;
          } else {
            const publicUrl = new URL(
              `/api/quizzes/${encodeURIComponent(routeParamId)}`,
              window.location.origin,
            );
            if (params?.username && quizSetter)
              publicUrl.searchParams.set('owner', quizSetter);
            try {
              const token = getPrivateQuizAccessToken(routeParamId);
              const response = await fetch(publicUrl, {
                cache: 'no-store',
                headers: token ? { 'X-Quiz-Access-Token': token } : undefined,
              });
              const payload =
                response.ok || response.status === 423 ?
                  await response.json()
                : null;

              if (
                response.status === 423 &&
                payload?.code === 'PRIVATE_ACCESS_REQUIRED'
              ) {
                data = payload.quiz || null;
              } else if (response.status === 423) {
                moderationPaused = true;
                setIsQuizUnderReview(true);
              } else if (response.ok) {
                data = payload?.quiz || null;
              } else {
                data =
                  (await HybridStorage.getQuiz(
                    routeParamId,
                    undefined,
                    quizSetter,
                  )) || null;
              }
            } catch (e) {
              data =
                (await HybridStorage.getQuiz(
                  routeParamId,
                  undefined,
                  quizSetter,
                )) || null;
              console.error(e);
            }
          }
        }
        if (!data && routeParamId && !moderationPaused) {
          data = await HybridStorage.getQuiz(
            routeParamId,
            undefined,
            quizSetter,
          );
        }
        let target = data as Quiz | null;
        if (target) {
          target = {
            ...target,
            questions: Array.isArray(target.questions) ? target.questions : [],
          };
        }

        if (!target && typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOfflineUncached(true);
          setLoading(false);
          return;
        }
        if (!target) {
          setQuizUnavailable(true);
          setLoading(false);
          return;
        }

        if (target) {
          // Block expired quizzes from loading
          if (
            !isLocalPreview &&
            target.expires_at &&
            new Date(target.expires_at).getTime() < Date.now()
          ) {
            setIsQuizExpired(true);
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

          if (!isLocalPreview && target.isPrivate) {
            setPrivateAccessGranted(Boolean(target.accessGranted));
            if (!target.accessGranted) {
              try {
                const accessResponse = await fetch(
                  `/api/quizzes/${encodeURIComponent(target.id)}/access`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(session?.access_token ?
                        { Authorization: `Bearer ${session.access_token}` }
                      : {}),
                    },
                    body: JSON.stringify({
                      key: '',
                      accessToken: getPrivateQuizAccessToken(target.id),
                    }),
                    cache: 'no-store',
                    credentials: 'omit',
                  },
                );
                if (accessResponse.ok) {
                  const access = await accessResponse.json();
                  if (access.accessToken) {
                    sessionStorage.setItem(
                      `pw_private_quiz_access_v1_${target.id}`,
                      access.accessToken,
                    );
                    if (routeParamId)
                      sessionStorage.setItem(
                        `pw_private_quiz_access_v1_${routeParamId}`,
                        access.accessToken,
                      );
                  }
                  window.location.reload();
                }
              } catch {
                // The key form remains available if the allowlist check cannot run.
              }
            }
          } else {
            setPrivateAccessGranted(true);
          }

          if (!isLocalPreview && !target.askDetails && !session) {
            setAuthRequired(true);
          }

          const secureAnswers: Record<string, any> = {};
          const validQuestionData = target.questions.every(
            (question) =>
              Array.isArray(question.options) &&
              question.options.every(
                (option) =>
                  option &&
                  typeof option.id === 'string' &&
                  typeof option.text === 'string',
              ),
          );
          if (!validQuestionData) {
            throw new Error(
              'This assessment contains invalid question data. Ask its owner to review it.',
            );
          }
          const currentQuestions = target.questions.map((q) => {
            secureAnswers[q.id] = q.correctIndex;
            return {
              ...q,
              correctIndex: null,
            };
          });

          correctAnswersRef.current = secureAnswers;

          const finalQuiz = {
            ...target,
            questions: currentQuestions.map((q) => ({
              ...q,
              correctIndex: null,
            })),
          };
          setQuiz(finalQuiz);

          // Completion check
          const completionMarker =
            isLocalPreview ? null : (
              localStorage.getItem(`completed_quiz_${finalQuiz.id}`)
            );
          if (completionMarker && !finalQuiz.allowRetry) {
            setHasAlreadyCompleted(true);
          }

          /* Map questions by category and independence on load with strict category isolation */
          let questionsToUse = [...currentQuestions];
          if (finalQuiz.randomizeQuestions) {
            const uncategorized = currentQuestions.filter(
              (q) => !q.category || q.category.trim() === '',
            );
            const categoriesMap: Record<string, Question[]> = {};
            currentQuestions.forEach((q) => {
              if (q.category && q.category.trim() !== '') {
                const catKey = q.category.trim();
                if (!categoriesMap[catKey]) {
                  categoriesMap[catKey] = [];
                }
                categoriesMap[catKey].push(q);
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
            Object.entries(categoriesMap).forEach(([, questions]) => {
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
          let restoredDraft: Record<string, any> | null = null;
          if (!isLocalPreview) {
            try {
              const draft = await HybridStorage.getQuizAttemptDraft(
                finalQuiz.id,
              );
              if (
                (draft?.status === 'in_progress' ||
                  draft?.status === 'submitting') &&
                Array.isArray(draft.questionOrder)
              )
                restoredDraft = draft;
            } catch {
              /* Start a fresh attempt if local draft storage is unavailable. */
            }
          }
          if (restoredDraft) {
            const byId = new Map(
              questionsToUse.map((question) => [question.id, question]),
            );
            const restoredOrder = restoredDraft.questionOrder
              .map((id: string) => byId.get(id))
              .filter(Boolean) as Question[];
            if (restoredOrder.length === questionsToUse.length)
              questionsToUse = restoredOrder;
          }
          setActiveQuestions(questionsToUse);
          setCurrentQuestion(0);
          setVisitedQuestionIds(
            Array.isArray(restoredDraft?.visitedQuestionIds) ?
              [...new Set(restoredDraft.visitedQuestionIds.map(String))]
            : [],
          );
          setBranchHistory(
            Array.isArray(restoredDraft?.branchHistory) ?
              restoredDraft.branchHistory
            : [],
          );

          // Pre-shuffle options
          if (finalQuiz.randomizeOptions) {
            const shuffled: Record<string, QuizOption[]> = {};
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
          if (restoredDraft) {
            const savedAnswers =
              (
                restoredDraft.answers &&
                typeof restoredDraft.answers === 'object'
              ) ?
                restoredDraft.answers
              : {};
            setUserAnswers(Object.values(savedAnswers));
            setCurrentQuestion(
              Math.min(
                Math.max(0, Number(restoredDraft.currentQuestionIndex) || 0),
                Math.max(0, questionsToUse.length - 1),
              ),
            );
            setUserData(restoredDraft.userData || {});
            setSelectedOption(restoredDraft.selectedOption ?? null);
            setSelectedOptions(
              Array.isArray(restoredDraft.selectedOptions) ?
                restoredDraft.selectedOptions
              : [],
            );
            setContent(restoredDraft.content || '');
            setTimeLeft(
              typeof restoredDraft.timeLeft === 'number' ?
                restoredDraft.timeLeft
              : null,
            );
            setQuestionTimeLeft(
              typeof restoredDraft.questionTimeLeft === 'number' ?
                restoredDraft.questionTimeLeft
              : null,
            );
            activeAttemptRef.current = restoredDraft;
            restoredAttemptTimerRef.current = true;
            restoredQuestionTimerRef.current = true;
            setDetailsCollected(true);
            setShowDetails(false);
            setShowIntro(false);
            setStart(true);
            if (restoredDraft.finalSubmissionSnapshot) {
              finalSubmissionSnapshotRef.current =
                restoredDraft.finalSubmissionSnapshot;
              finalizingRef.current = false;
              setSubmissionFailed(true);
              setShowSubmittingScreen(true);
            }
            if (
              !restoredDraft.finalSubmissionSnapshot &&
              navigator.onLine &&
              restoredDraft.attemptToken
            ) {
              void fetch('/api/quiz-attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'start',
                  quizId: finalQuiz.id,
                  attemptId: restoredDraft.attemptId,
                  attemptToken: restoredDraft.attemptToken,
                  deviceKey: restoredDraft.deviceKey,
                  privateQuizAccessToken: getPrivateQuizAccessToken(
                    finalQuiz.id,
                  ),
                }),
              })
                .then(async (response) => {
                  if (!response.ok) return;
                  const remote = await response.json();
                  if (typeof remote.remainingSeconds === 'number')
                    setTimeLeft(remote.remainingSeconds);
                  const updated = {
                    ...restoredDraft,
                    remoteStarted: true,
                    serverStartedAt: remote.startedAt,
                  };
                  activeAttemptRef.current = updated;
                  await HybridStorage.saveQuizAttemptDraft(
                    finalQuiz.id,
                    updated,
                  );
                })
                .catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('[PublicQuizTaker] Error loading quiz:', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [routeParamId]);

  // 2. Timer Setup
  useEffect(() => {
    if (started && !isFinished && quiz?.timer?.hasTimer) {
      if (restoredAttemptTimerRef.current) {
        restoredAttemptTimerRef.current = false;
        return;
      }
      const totalQuestionTimers = activeQuestions.reduce(
        (sum, question) =>
          sum + (question.type === 'upload' ? 0 : question.timer || 0),
        0,
      );
      const timerValue =
        typeof quiz.timer.hasTimer === 'number' ? quiz.timer.hasTimer : 10;
      const timerUnit = (quiz as any).timerUnit ?? 'minutes';
      let generalTimerSeconds =
        timerUnit === 'seconds' ? timerValue
        : timerUnit === 'hours' ? timerValue * 3600
        : timerValue * 60; // default: minutes
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
        finalizeQuiz(userAnswers, 'timeout');
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished, userAnswers]);

  useEffect(() => {
    const activeQ = activeQuestions[currentQuestion];
    if (
      started &&
      activeQ &&
      activeQ.type !== 'upload' &&
      activeQ.timer &&
      !isFinished
    ) {
      if (restoredQuestionTimerRef.current)
        restoredQuestionTimerRef.current = false;
      else setQuestionTimeLeft(activeQ.timer);
    } else {
      setQuestionTimeLeft(null);
    }
  }, [started, currentQuestion, activeQuestions, isFinished]);

  const handleNext = (isAutoSubmit: any = false) => {
    const autoSubmit = isAutoSubmit === true;

    if (showFeedback && !autoSubmit) {
      setShowFeedback(false);
    }

    const currentQId = q?.id || '';
    const savedForCurrent = userAnswers.find(
      (answer) => answer.questionId === currentQId,
    );
    let currentSelectedOption =
      quiz?.quizScroll ? scrollAnswers[currentQId] : selectedOption;
    if (q?.type === 'range' || q?.type === 'rating') {
      currentSelectedOption =
        savedForCurrent?.answer ??
        scrollAnswers[currentQId] ??
        (content !== '' ? content : undefined) ??
        currentSelectedOption;
      if (
        q.type === 'range' &&
        (currentSelectedOption === undefined ||
          currentSelectedOption === null ||
          currentSelectedOption === '')
      ) {
        currentSelectedOption = Number(q.min ?? 0);
      }
    }

    if (!autoSubmit) {
      if (q?.type === 'checkbox') {
        const activeBoxAnswers =
          quiz?.quizScroll ? scrollAnswers[currentQId] || [] : selectedOptions;
        if (activeBoxAnswers.length === 0) {
          return toast.error('Please select at least one answer');
        }
      }
      if (q?.type === 'input') {
        const inputValue =
          quiz?.quizScroll ? scrollAnswers[currentQId] : content;
        if (!String(inputValue ?? '').trim())
          return toast.error('Please enter an answer before continuing.');
      }
      if (q?.type === 'upload' && !savedForCurrent?.fileUrl) {
        return toast.error(
          'Please upload the required file before continuing.',
        );
      }
      if (
        q?.type === 'rating' &&
        (!Number.isFinite(Number(currentSelectedOption)) ||
          Number(currentSelectedOption) < 1)
      ) {
        return toast.error('Please choose a rating before continuing.');
      }
      if (
        q?.type === 'range' &&
        (currentSelectedOption === undefined ||
          currentSelectedOption === null ||
          currentSelectedOption === '')
      ) {
        currentSelectedOption = Number(q.min ?? 0);
      }
      if (
        q &&
        ['multiple_choice', 'true_false', 'dropdown'].includes(q.type) &&
        (currentSelectedOption === undefined ||
          currentSelectedOption === null ||
          currentSelectedOption === '')
      ) {
        return toast.error('Please select an answer before continuing.');
      }
    }

    let correct: boolean | undefined;
    if (quiz?.type === 'quiz' && q) {
      // Upload type: answer was already stored directly in userAnswers on file pick
      if (q.type === 'upload') {
        const existingUpload = userAnswers.find((a) => a.questionId === q.id);
        if (existingUpload) {
          const uploadAnswer = keepAnswerRevision(existingUpload, {
            ...existingUpload,
            correct: computeIsCorrect(q.id, existingUpload.answer),
          });
          const updatedAnswers = [
            ...userAnswers.filter((a) => a.questionId !== q.id),
            uploadAnswer,
          ];
          setUserAnswers(updatedAnswers);
          setScore(updatedAnswers.filter((a) => a.correct === true).length);
          proceedToNext(updatedAnswers);
          return;
        } else {
          return toast.error('Please upload the required file');
        }
      }

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

      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);

      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = keepAnswerRevision(
          userAnswers[existingIdx],
          {
            questionId: qId,
            answer: activeAns,
            correct,
          },
        );
      } else {
        updatedAnswers = [
          ...userAnswers,
          { questionId: qId, answer: activeAns, correct },
        ];
      }

      setUserAnswers(updatedAnswers);
      setScore(updatedAnswers.filter((a) => a.correct).length);

      if (
        quiz?.type === 'quiz' &&
        quiz?.correctOption === true &&
        quiz?.correctOptionDes === 'in-question' &&
        quiz?.questions
          .filter((q) => q.id === qId)
          .some(
            (q) =>
              q.correctExplanation || q.options?.some((o) => o?.explanation),
          ) &&
        !showFeedback
      ) {
        setShowFeedback(true);
      } else {
        proceedToNext(updatedAnswers);
      }
    } else if (q) {
      // Upload type for surveys: answer was pre-stored on file pick
      if (q.type === 'upload') {
        const existingUpload = userAnswers.find((a) => a.questionId === q.id);
        if (!existingUpload) {
          if (quiz?.quizLayout === 'scroll_show') {
            return toast.error(
              'Please upload the required file before continuing.',
            );
          }
          // No file — record a skip and proceed
          const updatedWithSkip = [
            ...userAnswers,
            { questionId: q.id, answer: '' },
          ];
          setUserAnswers(updatedWithSkip);
          proceedToNext(updatedWithSkip);
        } else {
          proceedToNext(userAnswers);
        }
        return;
      }

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
    // Once finalization begins (including a failed save waiting for retry),
    // security events must not start another submission or alter its reason.
    if (
      !started ||
      !quiz?.enforceSecurity ||
      isFinished ||
      isSubmitting ||
      submissionFailed ||
      finalSubmissionSnapshotRef.current ||
      finalizingRef.current
    )
      return;

    const recordSecuritySignal = () => {
      const now = Date.now();
      if (now - lastSecuritySignalRef.current < 1500) return;
      lastSecuritySignalRef.current = now;
      if (uploadPickerOpenRef.current) return;
      const nextAttempts = cheatAttempts + 1;
      setCheatAttempts(nextAttempts);

      if (nextAttempts >= 2) {
        quizHaptic([120, 60, 180]);
        toast.error(
          `Multiple security violations detected. Auto-submitting ${capFirst(quiz?.type || 'Assessment')}`,
        );
        finalizeQuiz(userAnswers, 'violation');
      } else {
        quizHaptic([80, 45, 80]);
        toast.warning(
          `Security Violation (${nextAttempts}/2): Tab switching is strictly prohibited!`,
          { duration: 5000 },
        );
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') recordSecuritySignal();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', recordSecuritySignal);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', recordSecuritySignal);
    };
  }, [
    started,
    quiz,
    cheatAttempts,
    userAnswers,
    isFinished,
    isSubmitting,
    submissionFailed,
  ]);

  // Cybersecurity: lock highlighting, copy/paste, right-click context menus
  useEffect(() => {
    if (
      !started ||
      !quiz?.enforceSecurity ||
      isFinished ||
      isSubmitting ||
      submissionFailed ||
      finalSubmissionSnapshotRef.current ||
      finalizingRef.current
    )
      return;

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
      'securitypolicyviolation',
      'drop',
    ] as const;
    blockedEvents.forEach((evt) =>
      document.addEventListener(evt, preventDefault, true),
    );

    return () => {
      blockedEvents.forEach((evt) =>
        document.removeEventListener(evt, preventDefault, true),
      );
    };
  }, [
    started,
    quiz?.enforceSecurity,
    isFinished,
    isSubmitting,
    submissionFailed,
  ]);

  const q = useMemo(() => {
    if (!activeQuestions || activeQuestions.length === 0) return null;
    return activeQuestions[currentQuestion] || null;
  }, [activeQuestions, currentQuestion]);
  const currentSavedAnswer = userAnswers.find(
    (answer) => answer.questionId === q?.id,
  );
  const currentInputValue =
    q ?
      quiz?.quizScroll ? scrollAnswers[q.id]
      : content !== '' ? content
      : q.type === 'range' || q.type === 'rating' ?
        (selectedOption ?? currentSavedAnswer?.answer ?? scrollAnswers[q.id])
      : (currentSavedAnswer?.answer ?? scrollAnswers[q.id])
    : undefined;
  const currentChoiceValue =
    q ?
      quiz?.quizScroll ? scrollAnswers[q.id]
      : (
        selectedOption !== null &&
        selectedOption !== undefined &&
        selectedOption !== ''
      ) ?
        selectedOption
      : q.type === 'range' || q.type === 'rating' ?
        content !== '' ?
          content
        : (currentSavedAnswer?.answer ?? scrollAnswers[q.id])
      : (currentSavedAnswer?.answer ?? scrollAnswers[q.id])
    : undefined;
  const canAdvanceCurrentQuestion = Boolean(
    q &&
      (q.type === 'upload' ?
        Boolean(
          currentSavedAnswer?.fileUrl ||
            (quiz?.quizScroll && scrollAnswers[q.id]),
        )
      : q.type === 'input' ?
        (quiz?.quizScroll ?
          String(scrollAnswers[q.id] ?? '')
        : String(content ?? '')
        ).trim().length > 0
      : q.type === 'checkbox' ?
        (
          (quiz?.quizScroll ? scrollAnswers[q.id] : selectedOptions) ||
          (Array.isArray(currentSavedAnswer?.answer) ?
            currentSavedAnswer.answer
          : [])
        ).length > 0
      : q.type === 'range' ?
        (() => {
          const raw =
            quiz?.quizScroll ? scrollAnswers[q.id]
            : content !== '' ? content
            : (selectedOption ?? currentSavedAnswer?.answer);
          if (raw === undefined || raw === null || raw === '') return false;
          const num = Number(raw);
          return Number.isFinite(num) && num > 0;
        })()
      : q.type === 'rating' ?
        Number(
          quiz?.quizScroll ?
            scrollAnswers[q.id]
          : selectedOption || content || currentSavedAnswer?.answer,
        ) >= 1
      : (quiz?.quizScroll ?
          scrollAnswers[q.id]
        : (selectedOption ?? currentSavedAnswer?.answer)) !== undefined &&
        (quiz?.quizScroll ?
          scrollAnswers[q.id]
        : (selectedOption ?? currentSavedAnswer?.answer)) !== null &&
        (quiz?.quizScroll ?
          scrollAnswers[q.id]
        : (selectedOption ?? currentSavedAnswer?.answer)) !== ''),
  );

  const answeredCount = useMemo(() => {
    return new Set(
      userAnswers.filter(isAnswerAttempted).map((a) => a.questionId),
    ).size;
  }, [userAnswers]);
  const currentPathIds =
    quiz?.quizScroll && quiz.quizLayout !== 'scroll_show' ?
      activeQuestions.map((question) => question.id)
    : Array.from(
        new Set([
          ...visitedQuestionIds,
          ...(started && activeQuestions[currentQuestion]?.id ?
            [activeQuestions[currentQuestion].id]
          : []),
        ]),
      );
  const scorePathIds =
    quiz?.calculateAllBranches ?
      activeQuestions.map((question) => question.id)
    : currentPathIds;
  const weightedScore = useMemo(
    () =>
      calculateQuizPoints(
        activeQuestions,
        userAnswers,
        correctAnswersRef.current,
        scorePathIds,
      ),
    [activeQuestions, userAnswers, scorePathIds.join('|')],
  );
  const totalQuestions =
    quiz?.calculateAllBranches ? activeQuestions.length : currentPathIds.length;
  const touchedQuestions = new Set(
    userAnswers.map((answer) => String(answer.questionId)),
  ).size;
  const hasTimer = Boolean(quiz?.timer?.hasTimer);
  const quitThreshold = Math.ceil((quiz?.questions.length || 0) * 0.75);
  const canQuitAssessment = !hasTimer && touchedQuestions < quitThreshold;
  const detailContext = useCallback(
    (answers: any[] = userAnswers) => ({
      userData,
      userAnswers: answers,
      questions: activeQuestions,
      score: weightedScore.earned,
      scorePossible: weightedScore.possible,
      totalQuestions:
        quiz?.calculateAllBranches ?
          activeQuestions.length
        : Math.max(currentPathIds.length, answers.length),
    }),
    [
      userData,
      userAnswers,
      activeQuestions,
      weightedScore,
      quiz?.calculateAllBranches,
      currentQuestion,
      started,
      visitedQuestionIds,
    ],
  );

  const computedCategoryScores = useMemo(() => {
    if (!quiz || userAnswers.length === 0) return {};
    return calculateCategoryScores(quiz.questions, userAnswers);
  }, [quiz, userAnswers]);
  const categoryScores = serverCategoryScores || computedCategoryScores;

  const confirmLeaveQuiz = (onConfirm: () => void) => {
    pendingUnloadCb.current = onConfirm;
    toast(
      <div className='flex flex-col gap-3 py-1'>
        <p className='font-bold text-sm'>
          Leave {capFirst(quiz?.type) || 'Assessment'}?
        </p>
        <p className='text-xs text-pw-muted leading-relaxed'>
          Your unfinished attempt and uploaded files will be cleared. If retries
          are disabled, this assessment will remain marked as used on this
          device.
        </p>
        <div className='flex gap-2 pt-1'>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-danger/20 hover:bg-pw-danger hover:text-white border border-pw-danger/40 text-pw-danger text-xs font-bold'
            onClick={() => {
              toast.dismiss('quiz-leave-confirm');
              pendingUnloadCb.current?.();
              pendingUnloadCb.current = null;
            }}>
            Leave
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/20 hover:bg-pw-primary hover:text-white border border-pw-primary/40 text-pw-primary text-xs font-bold'
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

  const confirmSubmitQuiz = () => {
    toast(
      <div className='flex flex-col gap-3 py-1'>
        <p className='font-bold text-sm'>
          Submit {capFirst(quiz?.type) || 'Assessment'}?
        </p>
        <p className='text-xs text-pw-muted leading-relaxed'>
          Are you sure you want to finalize your answers and submit?
        </p>
        <div className='flex gap-2 pt-1'>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-success/20 border hover:bg-pw-success/90 hover:text-white border-pw-success/40 text-pw-success text-xs font-bold'
            onClick={() => {
              toast.dismiss('quiz-submit-confirm');
              finalizeQuiz(userAnswers, 'self_submit');
            }}>
            Submit
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/10 hover:bg-pw-primary/90 hover:text-white border border-pw-primary/20 text-pw-primary text-xs font-bold'
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

  /* Perfect input keyword matching and input branching evaluation */
  const computeIsCorrect = useCallback(
    (qId: string, answer: any) => {
      const question = activeQuestions.find((quest) => quest.id === qId);
      return evaluateQuizAnswer({
        question,
        answer,
        correctKey: correctAnswersRef.current[qId],
        isSurvey: quiz?.type === 'survey',
        context: {
          userData,
          userAnswers,
          questions: activeQuestions,
          score: weightedScore.earned,
          totalQuestions: userAnswers.length,
        },
      });
    },
    [activeQuestions, quiz?.type, userData, userAnswers, weightedScore.earned],
  );

  const handlePass = () => {
    if (!q) return;
    const passedRecord = {
      questionId: q.id,
      answer: '(Skipped)',
      passed: true,
    };
    const updated = [
      ...userAnswers.filter((a) => a.questionId !== q.id),
      passedRecord,
    ];
    setUserAnswers(updated);
    setScore(updated.filter((a) => a.correct).length);
    toast.info('Question skipped');
    proceedToNext(updated);
  };

  const finalizeQuiz = async (
    finalAnswers: any[],
    submissionReason:
      | 'completion'
      | 'timeout'
      | 'self_submit'
      | 'violation' = 'completion',
  ) => {
    const existingSnapshot = finalSubmissionSnapshotRef.current;
    if (finalizingRef.current && existingSnapshot) return;
    if (finalizingRef.current) return;
    if (pendingResponseFileReadsRef.current.size > 0) {
      toast.error(
        'Wait for the selected file to finish preparing before submitting.',
      );
      return;
    }
    const activeQuestion = activeQuestions[currentQuestion];
    if (
      !existingSnapshot &&
      activeQuestion &&
      activeQuestion.type !== 'upload'
    ) {
      const activeValue =
        activeQuestion.type === 'input' ?
          quiz?.quizScroll ?
            scrollAnswers[activeQuestion.id]
          : content
        : activeQuestion.type === 'checkbox' ?
          quiz?.quizScroll ?
            scrollAnswers[activeQuestion.id]
          : selectedOptions
        : quiz?.quizScroll ? scrollAnswers[activeQuestion.id]
        : selectedOption;
      const hasValue =
        Array.isArray(activeValue) ?
          activeValue.length > 0
        : String(activeValue ?? '').trim() !== '';
      if (hasValue) {
        const answerRecord = {
          questionId: activeQuestion.id,
          answer: activeValue,
          correct: computeIsCorrect(activeQuestion.id, activeValue),
        };
        finalAnswers = [
          ...finalAnswers.filter(
            (answer) => answer.questionId !== activeQuestion.id,
          ),
          answerRecord,
        ];
      }
    }
    finalizingRef.current = true;
    const frozenAnswers =
      existingSnapshot?.answers || structuredClone(finalAnswers);
    const frozenUserData =
      existingSnapshot?.userData ||
      structuredClone({
        ...userData,
        ...(isLoggedIn ?
          {
            pingAuthEmail: user?.email || '',
            pingAuthName:
              username ||
              user?.user_metadata?.username ||
              user?.email?.split('@')[0] ||
              '',
            pingAuthDisplayName:
              user?.user_metadata?.display_name ||
              user?.user_metadata?.full_name ||
              username ||
              '',
          }
        : {}),
      });
    const frozenQuestionIds =
      existingSnapshot?.questionIds ||
      Array.from(
        new Set([
          ...currentPathIds,
          ...(activeQuestions[currentQuestion]?.id ?
            [activeQuestions[currentQuestion].id]
          : []),
          ...finalAnswers
            .map((answer: any) => String(answer.questionId || ''))
            .filter(Boolean),
        ]),
      );
    const frozenReason = existingSnapshot?.reason || submissionReason;
    const frozenBranchHistory =
      existingSnapshot?.branchHistory || structuredClone(branchHistory);
    const frozenStartedAt =
      existingSnapshot?.startedAt ||
      activeAttemptRef.current?.serverStartedAt ||
      activeAttemptRef.current?.startedAt ||
      new Date().toISOString();
    const frozenPoints = calculateQuizPoints(
      activeQuestions,
      frozenAnswers,
      correctAnswersRef.current,
      quiz?.calculateAllBranches ?
        activeQuestions.map((question) => question.id)
      : frozenQuestionIds,
    );
    const frozenScore =
      existingSnapshot?.score ??
      (quiz?.type === 'quiz' ? frozenPoints.earned : 0);
    const frozenScorePossible =
      existingSnapshot?.scorePossible ?? frozenPoints.possible;
    const frozenTotalQuestions =
      existingSnapshot?.totalQuestions ??
      (quiz?.calculateAllBranches ?
        activeQuestions.length
      : frozenQuestionIds.length);
    finalSubmissionSnapshotRef.current = {
      answers: frozenAnswers,
      userData: frozenUserData,
      questionIds: frozenQuestionIds,
      reason: frozenReason,
      score: frozenScore,
      scorePossible: frozenScorePossible,
      totalQuestions: frozenTotalQuestions,
      branchHistory: frozenBranchHistory,
      startedAt: frozenStartedAt,
    };
    if (finalizationScreenTimerRef.current)
      window.clearTimeout(finalizationScreenTimerRef.current);
    setSubmissionError('');
    finalizationScreenTimerRef.current = window.setTimeout(
      () => setShowSubmittingScreen(true),
      1400,
    );
    setSubmissionFailed(false);
    setIsSubmitting(true);
    if (!isLocalPreview && quiz) {
      const currentAttempt = activeAttemptRef.current;
      if (currentAttempt?.attemptId) {
        const retainedSnapshot = {
          ...currentAttempt,
          status: 'submitting',
          answers: Object.fromEntries(
            frozenAnswers.map((answer: any) => [
              String(answer.questionId),
              answer,
            ]),
          ),
          userData: frozenUserData,
          visitedQuestionIds: frozenQuestionIds,
          branchHistory: frozenBranchHistory,
          finalSubmissionSnapshot: finalSubmissionSnapshotRef.current,
        };
        activeAttemptRef.current = retainedSnapshot;
        try {
          await HybridStorage.saveQuizAttemptDraft(quiz.id, retainedSnapshot);
        } catch (error) {
          console.error(
            '[PublicQuizTaker] Could not persist final submission snapshot locally:',
            error,
          );
        }
      }
    }
    let submissionSucceeded = false;

    if (quiz) {
      try {
        if (!isLocalPreview && !navigator.onLine)
          throw new Error(
            'You are offline. Your answers are locked. Reconnect, then retry the save.',
          );
        let answersToSubmit = frozenAnswers;
        const finalScore = frozenScore;

        // Detect taker's accurate country & continent via geo-detector
        const clientGeo = await detectClientGeo();

        // Sanitize & trim all participant details to preserve exact values
        const sanitizedUserData: Record<string, string> = {};
        const authData =
          isLoggedIn ?
            {
              pingAuthEmail: user?.email || '',
              pingAuthName:
                username ||
                user?.user_metadata?.username ||
                user?.email?.split('@')[0] ||
                '',
              pingAuthDisplayName:
                user?.user_metadata?.display_name ||
                user?.user_metadata?.full_name ||
                username ||
                '',
            }
          : {};

        Object.entries({ ...frozenUserData, ...authData }).forEach(([k, v]) => {
          const cleanKey = k.trim();
          if (cleanKey) {
            sanitizedUserData[cleanKey] = String(v ?? '').trim();
          }
        });

        if (!isLocalPreview) {
          const attempt = activeAttemptRef.current;
          if (attempt?.attemptId && attempt?.attemptToken) {
            const finalSnapshot =
              await HybridStorage.prepareQuizAttemptSnapshot(quiz.id, {
                ...createAttemptSnapshot(frozenAnswers, frozenUserData),
                visitedQuestionIds: frozenQuestionIds,
                branchHistory: frozenBranchHistory,
                finalSubmissionSnapshot: finalSubmissionSnapshotRef.current,
                status: 'submitting',
              });
            const attemptSaved = await syncAttemptSnapshot(finalSnapshot);
            if (!attemptSaved)
              throw new Error(
                'Your answers or uploaded files could not be saved to the server. Please retry while online.',
              );
            const persistedAnswers = activeAttemptRef.current?.answers;
            if (persistedAnswers && typeof persistedAnswers === 'object')
              answersToSubmit = Object.values(persistedAnswers);
          }
          const responseSaved = await HybridStorage.saveResponse(
            quiz.id,
            {
              userData: sanitizedUserData,
              answers: answersToSubmit,
              score: finalScore,
              assessmentType: quiz.type,
              submissionReason: frozenReason,
              categoryScores: quiz.type === 'quiz' ? categoryScores : undefined,
              totalQuestions: frozenTotalQuestions,
              scorePossible: frozenScorePossible,
              answeredQuestions: frozenAnswers.filter(isAnswerAttempted).length,
              country: clientGeo.country,
              continent: clientGeo.continent,
              timezone: clientGeo.timezone,
              submissionId: attempt?.attemptId,
              visitedQuestionIds: frozenQuestionIds,
              branchHistory: frozenBranchHistory,
              startedAt: frozenStartedAt,
              attemptId: attempt?.attemptId,
              attemptToken: attempt?.attemptToken,
            },
            { requireRemote: true },
          );
          if (
            !responseSaved ||
            typeof responseSaved !== 'object' ||
            responseSaved.success !== true ||
            'queued' in responseSaved
          )
            throw new Error(
              'The server did not confirm saving your assessment. Please retry submission.',
            );
          submissionSucceeded = true;
          if (typeof responseSaved.responseId === 'string')
            setSavedResponseId(responseSaved.responseId);
          if (!quiz.allowRetry) {
            try {
              localStorage.setItem(`completed_quiz_${quiz.id}`, 'true');
            } catch {}
          }
          if (
            responseSaved &&
            typeof responseSaved === 'object' &&
            'score' in responseSaved &&
            typeof responseSaved.score === 'number'
          ) {
            setScore(responseSaved.score);
            if (responseSaved.categoryScores)
              setServerCategoryScores(responseSaved.categoryScores);
            if (typeof responseSaved.scorePossible === 'number')
              setScorePossible(responseSaved.scorePossible);
            if (attempt?.attemptId)
              await HybridStorage.deleteQuizAttemptDraft(quiz.id);
          }
        } else {
          // Template / Preview response saving LOCALLY only
          const templateResp = {
            id: `template_resp_${Date.now()}`,
            timestamp: new Date().toISOString(),
            score: finalScore,
            totalQuestions: frozenTotalQuestions,
            answeredQuestions: frozenAnswers.filter(isAnswerAttempted).length,
            userData: sanitizedUserData,
            answers: answersToSubmit,
            country: clientGeo.country,
            continent: clientGeo.continent,
            timezone: clientGeo.timezone,
            assessmentType: quiz.type,
            submissionReason: frozenReason,
            branchHistory: frozenBranchHistory,
            startedAt: frozenStartedAt,
            categoryScores: quiz.type === 'quiz' ? categoryScores : undefined,
          };
          setScore(finalScore);
          setScorePossible(frozenScorePossible);
          await HybridStorage.saveTemplatePreviewResponse(
            quiz.id,
            templateResp,
          );
          toast.success(
            'Preview assessment completed! Response saved locally for test review.',
          );
          submissionSucceeded = true;
        }
      } catch (e) {
        console.error('Failed to save response:', e);
        setSubmissionFailed(true);
        setSubmissionError(
          e instanceof Error ?
            e.message
          : 'Your answers could not be saved. Please retry.',
        );
        toast.error(
          e instanceof Error ?
            e.message
          : 'Your answers could not be saved. Please retry.',
        );
      }
    }
    if (finalizationScreenTimerRef.current)
      window.clearTimeout(finalizationScreenTimerRef.current);
    setIsSubmitting(false);
    finalizingRef.current = false;
    if (submissionSucceeded) {
      quizHaptic([35, 45, 130]);
      playQuizCompletionTone();
      if (quiz?.endScreen?.enableConfetti)
        triggerConfetti(quiz.endScreen?.confettiType || 'standard');
      setIsFinished(true);
    } else {
      setShowSubmittingScreen(true);
    }
  };

  finalizeForNavigationRef.current = (answers, reason) =>
    finalizeQuiz(answers, reason);

  useEffect(() => {
    if (!started || isFinished || !quiz) return;
    const assessmentUrl = window.location.href;
    const marker = `pw-active-assessment-${quiz.id}-${Date.now()}`;
    const installGuard = () => {
      window.history.pushState(
        { ...(window.history.state || {}), activeAssessment: marker },
        '',
        assessmentUrl,
      );
    };
    installGuard();
    const onPopState = () => {
      // If the back event was triggered by closing or navigating within the file viewer, ignore it
      if (
        isFileOpenRef.current ||
        (typeof window !== 'undefined' &&
          ((window as any).__pwFileViewerClosing ||
            (window as any).__pwFileViewerOpen ||
            window.history.state?.appFileViewer))
      ) {
        return;
      }
      // Restore the active assessment URL before asking, so Back and Forward
      // cannot leave an in-progress attempt behind.
      installGuard();
      // Finalization freezes answers and must finish or be retried before the
      // page can be left, including when the assessment itself is untimed.
      if (isSubmittingRef.current) return;
      if (navigationPromptOpenRef.current) return;
      navigationPromptOpenRef.current = true;
      void showConfirm(
        quiz.enforceSecurity ?
          'Leaving now will submit this assessment and mark the response as a security violation. Do you want to submit?'
        : 'Your assessment is still active. Submit your response before leaving this page?',
        {
          title: 'Leave assessment?',
          confirmText: 'Submit assessment',
          cancelText: 'Stay here',
          type: 'warning',
        },
      ).then((shouldSubmit) => {
        navigationPromptOpenRef.current = false;
        if (shouldSubmit) {
          void finalizeForNavigationRef.current?.(
            latestUserAnswersRef.current,
            quiz.enforceSecurity ? 'violation' : 'self_submit',
          );
        }
      });
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        !isSubmittingRef.current &&
        !quiz.timer?.hasTimer &&
        !quiz.enforceSecurity
      )
        return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (window.history.state?.activeAssessment === marker)
        window.history.back();
    };
  }, [
    started,
    isFinished,
    quiz?.id,
    quiz?.enforceSecurity,
    quiz?.timer?.hasTimer,
    showConfirm,
  ]);

  // Strict category branching isolation & 3x loop-protected routing engine
  const proceedToNext = (
    latestAnswers?: any[],
    chosenOptionVal?: string | null,
  ) => {
    if (!(quiz?.quizLayout === 'scroll' || quiz?.surveyType === 'form'))
      quizHaptic(14);
    setShowFeedback(false);
    const answersToSave = latestAnswers || userAnswers;

    const q = activeQuestions[currentQuestion];
    if (q)
      setVisitedQuestionIds((previous) =>
        Array.from(new Set([...previous, q.id])),
      );
    const addPathQuestions = (ids: string[]) =>
      setVisitedQuestionIds((previous) =>
        Array.from(new Set([...previous, ...(q ? [q.id] : []), ...ids])),
      );
    const recordBranch = (
      targetQuestionId: string | undefined,
      category: string | undefined,
      questionIds: string[],
    ) => {
      if (!q) return;
      const ids = Array.from(new Set(questionIds.map(String)));
      setBranchHistory((previous) =>
        [
          ...previous,
          {
            fromQuestionId: q.id,
            targetQuestionId,
            category,
            questionIds: ids,
            at: new Date().toISOString(),
          },
        ].slice(-200),
      );
    };
    let nextIdx = currentQuestion + 1;
    const isScrollLayout = !!(
      quiz?.quizLayout === 'scroll' || quiz?.surveyType === 'form'
    );
    const isScrollShow = quiz?.quizLayout === 'scroll_show';

    let didBranch = false;
    let skipQuestionFallback = false;
    if (q && (!isScrollLayout || isScrollShow)) {
      let branchTarget: string | undefined = undefined;
      let branchCat: string | undefined = undefined;

      // 1. Input Question Branching
      if (q.type === 'input') {
        const savedInput = answersToSave.find(
          (answer) => answer.questionId === q.id,
        )?.answer;
        const userText = String(
          formatDetailVars(savedInput ?? content ?? ''),
        ).trim();
        if (q.inputBranchRules && q.inputBranchRules.length > 0) {
          const matchedRule = q.inputBranchRules.find((rule) => {
            if (!rule.keyword) return false;
            const kw = resolvePipedText(
              rule.keyword,
              {
                userData,
                userAnswers: answersToSave,
                questions: activeQuestions,
                score: weightedScore.earned,
                totalQuestions: answersToSave.length,
              },
              false,
              rule.keyword,
            ).trim();
            return rule.caseSensitive ?
                userText.includes(kw)
              : userText.toLowerCase().includes(kw.toLowerCase());
          });
          if (matchedRule) {
            if (matchedRule.skipTo) branchTarget = matchedRule.skipTo;
            if (matchedRule.skipToCat) branchCat = matchedRule.skipToCat;
          } else {
            // Else fallback rules
            if ((q as any).elseSkipTo) branchTarget = (q as any).elseSkipTo;
            if ((q as any).elseSkipToCat) branchCat = (q as any).elseSkipToCat;
          }
        }
      } else {
        // 2. Choice-level Branching
        const currentChoice =
          chosenOptionVal !== undefined ? chosenOptionVal
          : quiz?.quizScroll ? scrollAnswers[q.id]
          : selectedOption;

        if (currentChoice !== null && currentChoice !== undefined) {
          const currentOpts = shuffledOptions[q.id] || q.options || [];
          const foundOpt = currentOpts.find((opt: any, oIdx: number) => {
            if (opt && typeof opt === 'object') {
              return (
                opt.id === currentChoice ||
                String(oIdx) === String(currentChoice) ||
                opt.text === currentChoice
              );
            }
            return (
              String(oIdx) === String(currentChoice) ||
              String(opt) === String(currentChoice)
            );
          });

          if (foundOpt && typeof foundOpt === 'object') {
            const conditionPassed =
              !foundOpt.branchCondition ||
              evaluateQuizCondition(foundOpt.branchCondition, {
                userData,
                userAnswers: answersToSave,
                questions: activeQuestions,
                score: weightedScore.earned,
                totalQuestions: answersToSave.length,
              });
            if (foundOpt.branchCondition) skipQuestionFallback = true;
            if (conditionPassed) {
              if (foundOpt.skipTo) branchTarget = foundOpt.skipTo;
              if (foundOpt.skipToCat) branchCat = foundOpt.skipToCat;
            } else {
              if (foundOpt.elseSkipTo) branchTarget = foundOpt.elseSkipTo;
              if (foundOpt.elseSkipToCat) branchCat = foundOpt.elseSkipToCat;
            }
          }
        }
      }

      // 3. Question-level fallback routing
      if (!branchTarget && !branchCat && !skipQuestionFallback) {
        if (q.skipTo) branchTarget = q.skipTo;
        if (q.skipToCat) branchCat = q.skipToCat;
      }

      // Resolve piped targets at runtime. Invalid or empty targets deliberately
      // fall through to the ordinary in-group/next-question progression.
      const pipingContext = {
        userData,
        userAnswers: answersToSave,
        questions: activeQuestions,
        score: weightedScore.earned,
        totalQuestions: answersToSave.length,
      };
      if (branchTarget && branchTarget !== 'end') {
        branchTarget =
          resolvePipedText(branchTarget, pipingContext, false, '').trim() ||
          undefined;
        if (
          branchTarget &&
          !activeQuestions.some((question) => question.id === branchTarget)
        ) {
          branchTarget = undefined;
        }
      }
      if (branchCat) {
        branchCat =
          resolvePipedText(branchCat, pipingContext, false, '').trim() ||
          undefined;
        if (
          branchCat &&
          branchCat.toLowerCase() !== 'end' &&
          !activeQuestions.some(
            (question) =>
              question.category?.trim().toLowerCase() ===
              branchCat?.toLowerCase(),
          )
        ) {
          branchCat = undefined;
        }
      }

      // 4. Evaluate explicit routing target with 3x Loop Limiter Protection
      if (branchTarget === 'end' || branchCat?.toLowerCase() === 'end') {
        finalizeQuiz(answersToSave);
        return;
      } else if (branchTarget) {
        didBranch = true;
        const targetIdx = activeQuestions.findIndex(
          (quest) => quest.id === branchTarget,
        );
        if (targetIdx !== -1) {
          const target = activeQuestions[targetIdx];
          addPathQuestions(
            target.category?.trim() ?
              activeQuestions
                .filter(
                  (question) =>
                    question.category?.trim().toLowerCase() ===
                    target.category!.trim().toLowerCase(),
                )
                .map((question) => question.id)
            : [target.id],
          );
          recordBranch(
            target.id,
            target.category?.trim() || undefined,
            target.category?.trim() ?
              activeQuestions
                .filter(
                  (question) =>
                    question.category?.trim().toLowerCase() ===
                    target.category!.trim().toLowerCase(),
                )
                .map((question) => question.id)
            : [target.id],
          );
          const targetQId = activeQuestions[targetIdx]?.id;
          const visits = branchVisitCounts[targetQId] || 0;
          if (visits >= 3) {
            // Loop limit reached: break loop and continue sequentially
            nextIdx = currentQuestion + 1;
          } else {
            setBranchVisitCounts((prev) => ({
              ...prev,
              [targetQId]: visits + 1,
            }));
            nextIdx = targetIdx;
          }
        }
      } else if (branchCat) {
        didBranch = true;
        const cleanCat = branchCat.trim().toLowerCase();
        const categoryQuestionIds = activeQuestions
          .filter(
            (question) => question.category?.trim().toLowerCase() === cleanCat,
          )
          .map((question) => question.id);
        addPathQuestions(categoryQuestionIds);
        recordBranch(undefined, branchCat.trim(), categoryQuestionIds);
        const targetIdx = activeQuestions.findIndex(
          (quest) =>
            quest.category && quest.category.trim().toLowerCase() === cleanCat,
        );
        if (targetIdx !== -1) {
          const targetQId = activeQuestions[targetIdx]?.id;
          const visits = branchVisitCounts[targetQId] || 0;
          if (visits >= 3) {
            nextIdx = currentQuestion + 1;
          } else {
            setBranchVisitCounts((prev) => ({
              ...prev,
              [targetQId]: visits + 1,
            }));
            nextIdx = targetIdx;
          }
        }
      } else {
        // 5. Strict Sequential Category Isolation
        // If question belongs to a category, advance to next question IN THAT CATEGORY
        if (q.category && q.category.trim() !== '') {
          const curCatName = q.category.trim().toLowerCase();
          const sameCatQuestions = activeQuestions.filter(
            (quest) =>
              quest.category &&
              quest.category.trim().toLowerCase() === curCatName,
          );
          const currentCatPos = sameCatQuestions.findIndex(
            (quest) => quest.id === q.id,
          );

          if (
            currentCatPos !== -1 &&
            currentCatPos < sameCatQuestions.length - 1
          ) {
            // Next question in current category
            const nextCatQ = sameCatQuestions[currentCatPos + 1];
            nextIdx = activeQuestions.findIndex(
              (quest) => quest.id === nextCatQ.id,
            );
          } else {
            // Current category completed: fallback to index flow (next category or next standalone question)
            const remainingQuestions = activeQuestions.slice(
              currentQuestion + 1,
            );
            const nextUnrelated = remainingQuestions.find(
              (quest) =>
                !quest.category ||
                quest.category.trim().toLowerCase() !== curCatName,
            );
            if (nextUnrelated) {
              nextIdx = activeQuestions.findIndex(
                (quest) => quest.id === nextUnrelated.id,
              );
            } else {
              finalizeQuiz(answersToSave);
              return;
            }
          }
        }
      }
    }

    if (q && isScrollShow) {
      const nextQuestion = activeQuestions[nextIdx];
      if (nextQuestion) {
        if (didBranch) {
          scrollShowBranchActive.current = true;
          setScrollBranchRootIndex(nextIdx);
          setScrollBranchQuestionIds([nextQuestion.id]);
        } else {
          const root = scrollBranchRootIndex ?? 0;
          setScrollBranchQuestionIds(
            activeQuestions
              .slice(root, nextIdx + 1)
              .map((question) => question.id),
          );
        }
      }
    }

    const nextQ = activeQuestions[nextIdx];

    if (!nextQ) {
      finalizeQuiz(answersToSave);
      return;
    }

    if (quiz && nextIdx < activeQuestions.length) {
      setVisitedQuestionIds((previous) =>
        Array.from(new Set([...previous, ...(q ? [q.id] : []), nextQ.id])),
      );
      setNavigationHistory((prev) => [...prev, currentQuestion]);
      setCurrentQuestion(nextIdx);
      const existingNext = answersToSave.find((a) => a.questionId === nextQ.id);
      if (existingNext) {
        if (nextQ.type === 'checkbox') {
          setSelectedOptions(
            Array.isArray(existingNext.answer) ? existingNext.answer : [],
          );
          setSelectedOption(null);
          setContent('');
        } else if (nextQ.type === 'input') {
          setContent(String(existingNext.answer ?? ''));
          setSelectedOption(null);
          setSelectedOptions([]);
        } else {
          const val = String(existingNext.answer ?? '');
          setSelectedOption(val);
          setContent(val);
          setSelectedOptions([]);
        }
      } else {
        setSelectedOption(null);
        setSelectedOptions([]);
        setContent('');
      }
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
      const targetQ = activeQuestions[prevIdx];
      const existingPrev = userAnswers.find(
        (a) => a.questionId === targetQ?.id,
      );
      if (existingPrev && targetQ) {
        if (targetQ.type === 'checkbox') {
          setSelectedOptions(
            Array.isArray(existingPrev.answer) ? existingPrev.answer : [],
          );
          setSelectedOption(null);
          setContent('');
        } else if (targetQ.type === 'input') {
          setContent(String(existingPrev.answer ?? ''));
          setSelectedOption(null);
          setSelectedOptions([]);
        } else {
          const val = String(existingPrev.answer ?? '');
          setSelectedOption(val);
          setContent(val);
          setSelectedOptions([]);
        }
      } else {
        setSelectedOption(null);
        setSelectedOptions([]);
        setContent('');
      }
    }
  };

  // Dynamic variable mention & cross-question piping engine
  const formatDetailVars = (
    rawText: string,
    contextOverride?: Record<string, any>,
  ) => {
    if (!rawText) return rawText;

    // Resolve cross-question, category, taker mentions, date getters, and @eval logic directly
    const piped = resolvePipedText(
      rawText,
      contextOverride || {
        userData,
        userAnswers,
        questions: activeQuestions,
        score: weightedScore.earned,
        totalQuestions: userAnswers.length,
        scorePossible: weightedScore.possible,
      },
      false,
    );
    return parseWhitelistedHtml(piped);
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0.1, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0.1, x: -5 }}
        key='ping-world-accessment-loading-view'
        className='flex flex-col items-center justify-center min-h-[90dvh] text-center p-6 self-center'>
        <Puzzle className='h-12 w-12 text-pw-muted mb-4 opacity-70' />
        <h2 className='text-2xl font-bold mb-2 animate-pulse'>
          Loading Assessment...
        </h2>
      </motion.div>
    );
  }

  if (showSubmittingScreen && !isFinished) {
    return (
      <SubmittingPage
        finalizeQuizAction={finalizeQuiz}
        quiz={quiz}
        isSubmitting={isSubmitting}
        submissionFailed={submissionFailed}
        submissionError={submissionError}
        onStartFresh={async () => {
          if (!quiz) return;
          const attemptId = activeAttemptRef.current?.attemptId;
          if (attemptId) {
            await HybridStorage.deleteAttemptResponseDraft(
              quiz.id,
              attemptId,
            ).catch(() => {});
          }
          await HybridStorage.deleteQuizAttemptDraft(quiz.id);
          window.location.reload();
        }}
        submissionRef={finalSubmissionSnapshotRef}
        key={'ping-world-assessment-submission-page'}
      />
    );
  }

  if (isOfflineUncached) {
    return <Offline />;
  }

  if (isQuizUnderReview) {
    return <UnderReview />;
  }

  if (quizUnavailable) {
    return <NotFound />;
  }

  if (isQuizExpired) {
    return <ExpiredSection />;
  }

  if (hasAlreadyCompleted && quiz && !quiz.allowRetry && !isLocalPreview) {
    return <NoRetry />;
  }

  if (quiz?.isPrivate && !privateAccessGranted) {
    return (
      <Private
        quiz={quiz}
        routeParamId={routeParamId}
      />
    );
  }

  if (isFinished) {
    return (
      <Finished
        weightedScore={weightedScore}
        questions={activeQuestions}
        userData={userData}
        userAnswers={userAnswers}
        key={'ping-assessment-completion-page'}
        categoryScores={categoryScores}
        currentPathIds={currentPathIds}
        finalSubmissionSnapshotRef={finalSubmissionSnapshotRef}
        isLocalPreview={isLocalPreview}
        quiz={quiz}
        detailContextAction={detailContext}
        correctAnswersRef={correctAnswersRef}
        scorePossible={scorePossible}
        showCompletionScrollUp={showCompletionScrollUp}
        savedResponseId={savedResponseId}
        setShowResponseShareAction={setShowResponseShare}
        showResponseShare={showResponseShare}
        openFile={openFile}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0.1, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0.1, x: -5 }}
      key='ping-world-assessment-wrapper'
      onContextMenu={(e) => quiz?.enforceSecurity && e.preventDefault()}
      className={cn(
        'relative h-screen max-h-[100dvh] flex flex-col bg-pw-bg text-white overflow-x-hidden selection:bg-pw-primary/30 selection:text-white',
        quiz?.enforceSecurity && 'select-none',
      )}>
      {/* Sleek Glowing Background Objects */}
      <div
        className={cn(
          'absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-pw-primary/15 blur-[100px] pointer-events-none',
          !started && 'animate-float',
        )}
      />
      <div
        className={cn(
          'absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pw-cyan/10 blur-[120px] pointer-events-none',
          !started && 'animate-float',
        )}
      />

      {/* Persistent Fullscreen Branding Background & Shade */}

      {quiz?.fromPremium && (
        <>
          {quiz?.branding?.shadeColor && (
            <div
              className='fixed inset-0 min-h-screen max-h-[100dvh] w-screen z-0 pointer-events-none transition-all duration-500'
              style={{
                backgroundColor: quiz.branding.shadeColor,
                opacity: 0.35,
              }}
            />
          )}
          {quiz?.branding?.image && (
            <div
              className='fixed inset-0 min-h-screen w-screen max-h-[100dvh] z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-500'
              style={{
                backgroundImage: `url(${unpackPingWorldMediaUrl(quiz.branding.image).url || quiz.branding.image})`,
                opacity: quiz.branding.opacity ?? 0.25,
                filter: `blur(${quiz.branding.blur ?? 1}px) brightness(70%)`,
              }}
            />
          )}
          {(quiz?.branding?.image || quiz?.branding?.shadeColor) && (
            <div className='fixed inset-0 min-h-screen w-screen max-h-[100dvh] z-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60' />
          )}
        </>
      )}

      {/* Intro Gate */}
      {showIntro && !started && (
        <IntroSection
          formatDetailVarsAction={formatDetailVars}
          quiz={quiz}
          authRequired={authRequired}
          setDetailsCollected={setDetailsCollected}
          setShowDetails={setShowDetails}
          setShowIntro={setShowIntro}
          setShowSecurityProtocol={setShowSecurityProtocol}
          setShowReportModal={setShowReportModal}
          dismissedQuizInfo={dismissedQuizInfo}
          setDismissedQuizInfo={setDismissedQuizInfo}
          startAssessment={startAssessment}
        />
      )}

      {/* 2. Security Gate */}
      {!showIntro &&
        quiz?.enforceSecurity &&
        showSecurityProtocol &&
        !started &&
        !detailsCollected && (
          <Security
            quiz={quiz}
            setShowDetails={setShowDetails}
            setShowSecurityProtocol={setShowSecurityProtocol}
            startAssessment={startAssessment}
            key={'ping-world--assessment-security-section'}
          />
        )}

      {/* 3. Details Gate */}
      {showDetails &&
        !detailsCollected &&
        (quiz?.askDetails || []).length > 0 && (
          <Details
            quiz={quiz}
            setDetailsCollected={setDetailsCollected}
            setUserData={setUserData}
            userData={userData}
            startAssessment={startAssessment}
            key={'ping-world-assessment-detail-section'}
          />
        )}

      {/* 4. Active Assessment View */}
      {started && quiz && (
        <div
          key='ping-world-assessment-view'
          className={cn(
            'container relative z-10 p-0 mx-auto px-3 md:px-6 pt-6 md:pt-8 max-w-7xl flex flex-col h-screen max-h-[100dvh] pb-5 overflow-y-auto custom-scrollbar',
            quizTheme === 'dark' ? 'text-white' : 'text-black',
          )}>
          {!isOnline && (
            <motion.div
              className='p-3 bg-pw-warning/10 border border-pw-warning/20 text-pw-warning text-xs font-bold rounded-3xl flex items-center gap-2 mb-2 w-fit self-center'
              exit={{ opacity: 0, y: -5 }}>
              <AlertTriangle className='h-4.5 w-4.5 shrink-0 text-pw-warning ml-1' />
              <span>
                Offline Mode: Your responses will be saved securely on this
                device and uploaded once connection is restored.
              </span>

              <X
                className='h-4.5 w-4.5 shrink-0 text-pw-warning cursor-pointer'
                onClick={() => {
                  setIsOnline(!isOnline);
                }}
              />
            </motion.div>
          )}

          <div className='mb-6 flex flex-col gap-1 w-[100%] relative self-center max-w-4xl sticky top-0 z-30'>
            {/* Brand Icon */}
            {quiz?.fromPremium && quiz?.branding?.icon && (
              <div className='flex justify-center mb-4'>
                <Image
                  width={30}
                  height={30}
                  src={
                    unpackPingWorldMediaUrl(quiz.branding.icon).url ||
                    quiz.branding.icon
                  }
                  unoptimized
                  alt='Brand Logo'
                  className='h-15 w-auto rounded-xl object-contain drop-shadow-md'
                />
              </div>
            )}

            {/* Participant Info / Reminder Banner (Closable) */}
            {quiz?.fromPremium && quiz?.info && !dismissedQuizInfo && (
              <div className='flex items-start justify-between gap-3 p-3 bg-pw-primary/10 border border-pw-primary/20 rounded-2xl mb-3 text-xs text-pw-text/90 leading-relaxed shadow-lg'>
                <div className='flex items-start gap-2.5'>
                  <Info
                    size={15}
                    className='text-pw-primary shrink-0 mt-0.5'
                  />
                  <span
                    className='whitespace-pre-wrap'
                    dangerouslySetInnerHTML={{
                      __html: formatDetailVars(quiz.info || ''),
                    }}
                  />
                </div>
                <button
                  type='button'
                  onClick={() => setDismissedQuizInfo(true)}
                  aria-label='Dismiss assessment information'
                  className='text-pw-muted hover:text-white transition-colors shrink-0 p-0.5 rounded-lg hover:bg-white/10'>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Header Row */}
            <div className='sticky top-0 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-4xl border border-white/10 bg-pw-surface/50 p-2 pt-2.5 shadow-xl bkblur backdrop-blur-2xl self-center'>
              <div className='flex items-center pl-1.5'>
                <h1 className='text-lg md:text-xl font-bold font-display tracking-tight leading-none'>
                  <span
                    className='whitespace-pre-wrap line-clamp-2 truncate'
                    dangerouslySetInnerHTML={{
                      __html: formatDetailVars(quiz?.title || ''),
                    }}
                  />
                </h1>
              </div>

              <div className='flex items-center gap-2'>
                <AnimatePresence initial={false}>
                  {canQuitAssessment && (
                    <motion.div
                      key='ping-world-quit-assessment-button'
                      initial={{ opacity: 0, x: 12, width: 0 }}
                      animate={{ opacity: 1, x: 0, width: 'auto' }}
                      exit={{ opacity: 0, x: 12, width: 0 }}
                      className='overflow-hidden'>
                      <Button
                        variant='ghost'
                        title={`Quit ${capFirst(quiz.type)}`}
                        size='sm'
                        onClick={() =>
                          confirmLeaveQuiz(() => {
                            void (async () => {

                              try {
                                let done = false;
                                const attempt = activeAttemptRef.current;
                                if (
                                  attempt?.attemptId &&
                                  attempt?.attemptToken
                                ) {
                                  await HybridStorage.quitQuizAttempt(
                                    quiz.id,
                                    attempt.attemptId,
                                    attempt.attemptToken,
                                  ).then(data => {
                                    if(data.success) done = true;
                                  });
                                  if (!quiz.allowRetry)
                                    localStorage.setItem(
                                      `completed_quiz_${quiz.id}`,
                                      'true',
                                    );
                                  
                                  done = true;
                                } else if (attempt?.attemptId) {
                                  await HybridStorage.deleteQuizAttemptDraft(
                                    quiz.id,
                                  );
                                  done = true;
                                }
                                
                                if(done) router.push('/quiz');
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ?
                                    error.message
                                  : 'Could not clear this attempt. Please retry.',
                                );
                              }
                            })();
                          })
                        }
                        className='h-9 px-4 gap-1 rounded-full text-pw-danger hover:bg-pw-danger/10 hover:text-pw-danger transition-all active:scale-95 border border-pw-danger/10'>
                        <LogOut size={16} />
                        <span className='hidden sm:inline font-bold text-pw-danger'>
                          Quit
                        </span>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                    className='h-9 px-4 rounded-full gap-2 bg-pw-success/10 border border-pw-success/20 text-pw-success hover:bg-pw-success/20 font-black text-xs transition-all active:scale-95 shadow-lg shadow-pw-success/10 hidden md:flex ml-4'>
                    <CheckCircle2 size={16} />
                    <span className='font-bold'>SUBMIT</span>
                  </Button>
                )}
              </div>
            </div>

            <div className='relative flex flex-col gap-3 mb-2 pt-1 px-2'>
              {/* Only show progress bar if NO branching is detected */}
              {(() => {
                const hasBranching = activeQuestions.some(
                  (quest) =>
                    quest.skipTo ||
                    quest.skipToCat ||
                    (quest.inputBranchRules &&
                      quest.inputBranchRules.length > 0) ||
                    (quest.options as any[])?.some(
                      (opt: any) => opt?.skipTo || opt?.skipToCat,
                    ),
                );
                if (hasBranching) return null;

                return (
                  <div className='w-full min-w-full h-2 rounded-full overflow-hidden bg-pw-cyan/10 z-[100] backdrop-blur-sm mx-1'>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(answeredCount / Math.max(1, quiz?.calculateAllBranches ? activeQuestions.length : totalQuestions)) * 100}%`,
                      }}
                      className='h-full gradient-brand animate-shimmer rounded-full shadow-[0_0_15px_rgba(var(--pw-primary-rgb),0.5)] transition-all duration-500'
                    />
                  </div>
                );
              })()}

              <div
                className={cn(
                  'flex w-full gap-2 items-center flex-wrap',
                  quiz?.timer?.hasTimer && timeLeft !== null ?
                    'justify-between'
                  : 'justify-end',
                )}>
                <div className='flex items-center gap-2'>
                  {quiz?.timer?.hasTimer && timeLeft !== null && (
                    <div
                      title={`${capFirst(quiz?.type)} Timer`}
                      className={cn(
                        'flex items-center gap-1.5 p-1 pr-2 rounded-full text-[12px] font-mono lg:text-sm border transition-all bkblur text-shadow-md shadow-md',
                        timeLeft < 60 ?
                          'bg-pw-danger/10 border-pw-danger/50 text-pw-danger animate-pulse'
                        : 'bg-pw-cyan/10 border-pw-cyan/30 text-pw-cyan',
                      )}>
                      <Clock
                        size={16}
                        className={
                          timeLeft < 60 ? 'text-pw-danger' : 'text-pw-cyan'
                        }
                      />
                      {Math.floor(timeLeft / 60)}:
                      {String(timeLeft % 60).padStart(2, '0')}
                    </div>
                  )}

                  {/* Realtime Live Score Display */}
                  {(quiz?.showScore || quiz?.showRealtimeScore) &&
                    quiz?.type === 'quiz' && (
                      <div className='inline-flex items-center gap-1.5 p-1 pr-2 rounded-full bg-pw-primary/10 border border-pw-primary/30 text-pw-primary text-xs font-mono font-bold shadow-md bkblur text-shadow-md'>
                        <Brain className='w-3.5 h-3.5' /> {weightedScore.earned}{' '}
                        / {weightedScore.possible}
                      </div>
                    )}
                </div>

                {quiz?.allowEarlySubmit && (
                  <Button
                    title={`Submit ${capFirst(quiz.type)}`}
                    onClick={confirmSubmitQuiz}
                    className='h-10 max-w-[200px] w-1/3 px-4 rounded-xl gap-2 bg-pw-success/10 border border-pw-success/20 text-pw-success hover:bg-pw-success/20 font-black text-xs transition-all active:scale-95 shadow-lg shadow-pw-success/10 flex md:hidden bkblur'>
                    <CheckCircle2 size={18} />
                    <span className='font-bold'>SUBMIT</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <QuestionSection
            quiz={quiz}
            activeQuestions={activeQuestions}
            scrollBranchQuestionIds={scrollBranchQuestionIds}
            currentQuestion={currentQuestion}
            scrollAnswers={scrollAnswers}
            setScrollAnswers={setScrollAnswers}
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            content={content}
            setContent={setContent}
            userAnswers={userAnswers}
            setUserAnswers={setUserAnswers}
            shuffledOptions={shuffledOptions}
            q={q}
            canAdvanceCurrentQuestion={canAdvanceCurrentQuestion}
            showFeedback={showFeedback}
            questionTimeLeft={questionTimeLeft}
            handleNext={handleNext}
            handlePass={handlePass}
            GoBack={GoBack}
            finalizeQuiz={finalizeQuiz}
            computeIsCorrect={computeIsCorrect}
            formatDetailVars={formatDetailVars}
            setCurrentQuestion={setCurrentQuestion}
            isSubmitting={isSubmitting}
            firstQuestionRef={firstQuestionRef}
            bottomRef={bottomRef}
            scrollShowBranchActive={scrollShowBranchActive}
            correctAnswersRef={correctAnswersRef}
            uploadPickerOpenRef={uploadPickerOpenRef}
            pendingResponseFileReadsRef={pendingResponseFileReadsRef}
            openFile={openFile}
          />
        </div>
      )}
      {isSubmitting && !showSubmittingScreen && (
        <div
          className='fixed inset-0 z-[120] cursor-wait bg-slate-950/10 backdrop-blur-[2px] pointer-events-none'
          role='status'
          aria-label='Saving response; answers are locked'>
          <span className='sr-only'>Saving response. Answers are locked.</span>
        </div>
      )}

      {/* Report Takedown Modal */}
      {showReportModal && (
        <div className='fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4'>
          <div className='bg-pw-surface border border-white/10 rounded-3xl p-3 max-w-md w-full shadow-2xl space-y-4 text-pw-text'>
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
                    ].map((cat, idx) => (
                      <button
                        key={cat + idx + 'report-category'}
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
                    disabled={isSubmittingReport}
                    onClick={async () => {
                      if (!reportReason.trim()) {
                        toast.error('Please enter a reason');
                        return;
                      }
                      if (!quiz?.id) return;
                      setIsSubmittingReport(true);
                      try {
                        const response = await fetch(
                          `/api/quizzes/${encodeURIComponent(quiz.id)}/report`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              category: reportCategory,
                              reason: reportReason,
                            }),
                          },
                        );
                        const result = await response.json().catch(() => ({}));
                        if (!response.ok)
                          throw new Error(
                            result.error || 'Could not submit report.',
                          );
                        setReportedStatus(true);
                        toast.success(
                          result.message || 'Assessment report received.',
                        );
                        setTimeout(() => {
                          setShowReportModal(false);
                          setReportedStatus(false);
                          setReportReason('');
                          setReportCategory('');
                        }, 2500);
                      } catch (error) {
                        toast.error(
                          error instanceof Error ?
                            error.message
                          : 'Could not submit report.',
                        );
                      } finally {
                        setIsSubmittingReport(false);
                      }
                    }}
                    className='h-10 text-xs flex-1 bg-pw-danger hover:bg-pw-danger/80 text-white font-bold'>
                    {isSubmittingReport ?
                      <>
                        <LoaderCircle className='mr-2 h-4 w-4 animate-spin' />
                        Sending…
                      </>
                    : 'Submit Report'}
                  </Button>
                </div>
              </div>
            }
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function PublicQuizTaker() {
  return (
    <AnimatePresence mode='wait'>
      <Taker />
    </AnimatePresence>
  );
}
