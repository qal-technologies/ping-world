'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  Plus,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Settings2,
  Share2,
  X,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  Play,
  BarChart2,
  Crown,
  CloudCheck,
  EyeOff,
  File,
  Mail,
  LoaderCircle,
  Copy,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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
import { useAppContext } from '@/context/AppContext';
import { computeExpiry } from '@/lib/config/premium';
import { DEFAULT_PINGWORLD_SHOWCASE_QUIZ } from '@/lib/quiz/default-quiz-template';
import {
  exportResponsesToCSV,
  exportResponsesToJSON,
  exportResponsesToText,
} from '@/lib/quiz/text-parser';
import { validateQuizExpiry } from '@/lib/quiz/quiz-expiry';
import {
  resolvePipedText,
  unpackPingWorldMediaUrl,
} from '@/lib/quiz/quiz-piping';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';
import { exportQuizFeedbackPdf } from '@/lib/quiz/pdf-export';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';
import { type Quiz, type QuestionType, quizHaptic } from '.';
import { supabase } from '@/lib/supabase';
import { useInAppNotification } from '@/lib/notifications/useInAppNotification';
import NextImage from 'next/image';
import QuizBuilder from '@/components/quiz/Builder';
import { cn } from '@/lib/utils';

const seedTemplateStorageKey = () => `pw_quiz_template_v1`;

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
  if (quiz.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id || quiz.isTemplate)
    return false;
  if (quiz.expires_at) {
    const expiresAt = new Date(quiz.expires_at).getTime();
    const isExpired = expiresAt < now;
    return isExpired;
  } else {
    return false;
  }
};

const generateQuizId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const normalizeQuizRecord = (quiz: any): Quiz => ({
  ...quiz,
  id: String(quiz.id),
  title: quiz.title || 'Untitled assessment',
  description: quiz.description || '',
  type: quiz.type === 'survey' ? 'survey' : 'quiz',
  questions: Array.isArray(quiz.questions) ? quiz.questions : [],
  endScreen: quiz.endScreen || {
    title: 'Completed',
    message: 'Thank you for your response.',
  },
  createdAt:
    Number(quiz.createdAt) ||
    (quiz.created_at ? new Date(quiz.created_at).getTime() : Date.now()),
  customUrl: quiz.custom_id || quiz.customUrl || undefined,
});

// --- Components ---

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openFile } = useAppFileViewer();
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const { showAlert, showConfirm, showPrompt } = useAppModal();
  const notifyInApp = useInAppNotification();
  const [filenameInput, setFilenameInput] = useState('');
  const [filenameExtension, setFilenameExtension] = useState('');
  const [onConfirmFilename, setOnConfirmFilename] = useState<
    ((cleanName: string) => void) | null
  >(null);

  const { premiumTier, isFeatureUnlocked, user, username, isLoading } =
    useAppContext();
  const quizUnlocked = isFeatureUnlocked('quiz');
  const assessmentTier = quizUnlocked ? premiumTier : 'free';

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
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>(
    {},
  );
  const [newResponseCounts, setNewResponseCounts] = useState<
    Record<string, boolean>
  >({});
  const [isCreating, setIsCreating] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Quiz | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<number | null>(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [isEmailingExport, setIsEmailingExport] = useState(false);
  const [responseListSharing, setResponseListSharing] = useState(false);
  const responseCountQuizIds = useMemo(
    () => quizzes.map((quiz) => quiz.id).join(','),
    [quizzes],
  );

  const sortQuizCards = (items: Quiz[]) =>
    [...items].sort((left, right) => {
      const leftTemplate =
        left.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id || left.isTemplate;
      const rightTemplate =
        right.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id || right.isTemplate;
      if (leftTemplate !== rightTemplate) return leftTemplate ? 1 : -1;
      const createdTime = (quiz: Quiz) => {
        const value =
          quiz.createdAt || (quiz as Quiz & { created_at?: string }).created_at;
        if (typeof value === 'number') return value;
        const parsed = Date.parse(String(value || ''));
        return Number.isFinite(parsed) ? parsed : 0;
      };
      return createdTime(right) - createdTime(left);
    });

  const openFeedback = async (sourceQuiz: Quiz) => {
    const quiz = normalizeQuizRecord(sourceQuiz);
    if (quiz.isTemplate || quiz.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
      const responses = await HybridStorage.getTemplatePreviewResponse(quiz.id);
      setViewingResponses({
        ...quiz,
        responses: Array.isArray(responses) ? responses : [],
      });
      setIsLoadingFeedback(false);
      return;
    }
    setIsLoadingFeedback(true);
    setViewingResponses({ ...quiz, responses: [] });
    const cachedCount = responseCounts[quiz.id];
    if (typeof cachedCount === 'number') {
      setNewResponseCounts((current) => ({ ...current, [quiz.id]: false }));
      try {
        localStorage.setItem(
          `pw_quiz_response_seen_${user?.id || 'guest'}_${quiz.id}`,
          String(cachedCount),
        );
      } catch {}
    }
    try {
      const result = await HybridStorage.getQuizResponses(quiz.id, 0, quiz);
      setResponseCounts((current) => ({
        ...current,
        [quiz.id]: result.totalCount ?? result.responses.length,
      }));
      if (typeof result.totalCount === 'number') {
        setNewResponseCounts((current) => ({ ...current, [quiz.id]: false }));
        try {
          localStorage.setItem(
            `pw_quiz_response_seen_${user?.id || 'guest'}_${quiz.id}`,
            String(result.totalCount),
          );
        } catch {}
      }
      const resultState = result as typeof result;
      if (resultState.isCached || resultState.isLocalOnly) {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (offline) {
          toast.info(
            user?.id ?
              'You are signed in but offline. Showing saved assessment responses.'
            : 'You are offline and signed out. Showing only responses cached on this device.',
          );
        } else if (!user?.id) {
          toast.info('Sign in to load assessment responses from the cloud.');
        } else if (result.responses.length === 0 && (cachedCount || 0) > 0) {
          toast.info(
            'The server could not refresh responses. Showing the last saved copy.',
          );
        }
      }
      setViewingResponses({
        ...quiz,
        responsesPublicId:
          result.isLocalOnly ?
            (quiz as any).settings?.publicResponsesId || quiz.responsesPublicId
          : result.responsesPublicId || undefined,
        questions: quiz.questions,
        responses: result.responses,
        responsesTotalCount: result.totalCount ?? result.responses.length,
        responsesNextOffset: result.nextOffset,
      });
    } catch (error: unknown) {
      setViewingResponses(null);
      toast.error(
        error instanceof Error ?
          error.message
        : 'Could not load assessment responses.',
      );
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  useEffect(() => {
    const feedbackId = searchParams.get('feedback');
    if (!feedbackId || !quizzes.length) return;
    const matchingQuiz = quizzes.find((quiz) => quiz.id === feedbackId);
    if (!matchingQuiz) {
      toast.error('The requested feedback is not available.');
      router.replace('/quiz', { scroll: false });
      return;
    }
    router.replace('/quiz', { scroll: false });
    void Promise.resolve().then(() => openFeedback(matchingQuiz));
    // openFeedback uses the latest response counters and auth state when invoked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, quizzes]);

  useEffect(() => {
    if (!isCreating) return;
    const historyMarker = `pw-quiz-builder-${Date.now()}`;
    const builderUrl = window.location.href;
    window.history.pushState(
      { ...(window.history.state || {}), quizBuilder: historyMarker },
      '',
      builderUrl,
    );
    const onPopState = () => {
      // The builder is a full-screen layer on the same route. Consume the
      // history gesture here, restore the builder's route without retaining
      // its marker, then close it. Retaining the marker would make effect
      // cleanup call history.back() a second time and navigate away as well.
      window.history.pushState(
        { ...(window.history.state || {}), quizBuilderClosed: historyMarker },
        '',
        builderUrl,
      );
      setIsCreating(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      // Saving/cancelling from the builder must remove its same-route marker;
      // otherwise the next Back press appears to do nothing.
      if (window.history.state?.quizBuilder === historyMarker)
        window.history.back();
    };
  }, [isCreating]);

  // Keep the open feedback panel current while takers submit or continue an
  // attempt. The response endpoint is explicitly uncached; merge only changed
  // rows so the list does not jump or discard pages already loaded.
  useEffect(() => {
    if (!viewingResponses || viewingResponses.isTemplate || !user?.id) return;
    let stopped = false;
    let inFlight = false;
    const refresh = async () => {
      if (stopped || inFlight || !navigator.onLine) return;
      inFlight = true;
      try {
        const page = await HybridStorage.getQuizResponses(
          viewingResponses.id,
          0,
        );
        if (stopped || page.isCached || page.isLocalOnly) return;
        setViewingResponses((current) => {
          if (!current || current.id !== viewingResponses.id) return current;
          const fresh = new Map(
            (page.responses || []).map((response: any) => [
              String(response.id),
              response,
            ]),
          );
          const merged = [...(page.responses || [])];
          for (const response of current.responses || []) {
            // A live attempt that no longer appears in the fresh attempt set
            // was either submitted (the saved response has a new id) or
            // cleaned up. Keep older submitted rows, but drop stale attempts.
            if (
              !fresh.has(String(response.id)) &&
              response.status !== 'in_progress'
            )
              merged.push(response);
          }
          merged.sort(
            (left: any, right: any) =>
              new Date(
                left.startedAt || left.submittedAt || left.timestamp || 0,
              ).getTime() -
              new Date(
                right.startedAt || right.submittedAt || right.timestamp || 0,
              ).getTime(),
          );
          return {
            ...current,
            responses: merged,
            responsesTotalCount: page.totalCount ?? merged.length,
            responsesNextOffset: page.nextOffset,
          };
        });
      } catch (error) {
        console.warn('[Quiz feedback] Live response refresh failed:', error);
      } finally {
        inFlight = false;
      }
    };
    const onOnline = () => void refresh();
    window.addEventListener('online', onOnline);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [viewingResponses?.id, viewingResponses?.isTemplate, user?.id]);

  useEffect(() => {
    const onSyncError = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          type?: string;
          id?: string;
          title?: string;
          message?: string;
        }>
      ).detail;
      if (detail?.type === 'quiz') {
        toast.error(
          `${detail.title || `Assessment ${detail.id || ''}`}: ${detail.message || 'Cloud save failed. Your local copy is still available.'}`,
        );
      }
    };
    window.addEventListener('pw_sync_error', onSyncError);
    return () => window.removeEventListener('pw_sync_error', onSyncError);
  }, []);

  const refreshResponseCounts = useCallback(async () => {
    if (!quizzes.length) return;

    // 1. Immediately reflect any local responses in quiz cards without waiting for network
    setResponseCounts((current) => {
      let changed = false;
      const next = { ...current };
      for (const quiz of quizzes) {
        const localCount =
          Array.isArray(quiz.responses) ? quiz.responses.length : 0;
        if (typeof next[quiz.id] !== 'number' || localCount > next[quiz.id]) {
          next[quiz.id] = Math.max(next[quiz.id] ?? 0, localCount);
          changed = true;
        }
      }
      return changed ? next : current;
    });

    if (!user?.id) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch('/api/quiz-response-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token }),
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        counts?: Record<string, number>;
      };
      if (!payload.counts) return;
      setResponseCounts((current) => ({ ...current, ...payload.counts }));
      setNewResponseCounts((current) => {
        const next = { ...current };
        for (const [quizId, count] of Object.entries(payload.counts || {})) {
          const seenKey = `pw_quiz_response_seen_${user.id}_${quizId}`;
          const savedSeen = localStorage.getItem(seenKey);
          if (savedSeen === null) localStorage.setItem(seenKey, String(count));
          else next[quizId] = count > (Number(savedSeen) || 0);
        }
        return next;
      });
    } catch (error) {
      console.warn('[Quiz] Response count refresh failed.', error);
    }
  }, [user?.id, quizzes]);

  useEffect(() => {
    void refreshResponseCounts();

    const onVisibilityChange = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        void refreshResponseCounts();
      }
    };
    const onWindowFocus = () => {
      void refreshResponseCounts();
    };
    const onResponseUpdated = () => {
      void refreshResponseCounts();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('pw_responses_updated', onResponseUpdated);
    window.addEventListener('storage', onResponseUpdated);

    const interval = window.setInterval(() => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        typeof navigator !== 'undefined' &&
        navigator.onLine
      ) {
        void refreshResponseCounts();
      }
    }, 25_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('pw_responses_updated', onResponseUpdated);
      window.removeEventListener('storage', onResponseUpdated);
      window.clearInterval(interval);
    };
  }, [refreshResponseCounts]);

  useEffect(() => {
    const onSyncStatus = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          type?: string;
          id?: string;
          is_synced?: boolean;
        }>
      ).detail;
      if (detail?.type !== 'quiz' || !detail.id) return;
      setQuizzes((current) =>
        current.map((quiz) =>
          quiz.id === detail.id ?
            ({ ...quiz, is_synced: Boolean(detail.is_synced) } as Quiz)
          : quiz,
        ),
      );
    };
    window.addEventListener('pw_sync_status', onSyncStatus);
    return () => window.removeEventListener('pw_sync_status', onSyncStatus);
  }, []);

  const emailResponseExport = async (
    quizId: string,
    format: 'csv' | 'json' = 'csv',
  ) => {
    if (isEmailingExport) return;
    setIsEmailingExport(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error('Sign in again before emailing an export.');
      const response = await fetch('/api/quiz-export-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'omit',
        body: JSON.stringify({ quizId, format }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || 'Could not email this export.');
      toast.success(`Export emailed to ${result.email}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not email this export.',
      );
    } finally {
      setIsEmailingExport(false);
    }
  };

  const toggleResponseListPublic = async () => {
    if (!viewingResponses || responseListSharing) return;
    setResponseListSharing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error('Sign in again to manage response sharing.');
      const result = await fetch(
        `/api/quizzes/${encodeURIComponent(viewingResponses.id)}/responses/public`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'omit',
          body: JSON.stringify({
            enabled: !Boolean(
              viewingResponses.responsesPublicId ||
                (viewingResponses as any).settings?.publicResponsesId,
            ),
          }),
        },
      );
      const body = await result.json().catch(() => ({}));
      if (!result.ok)
        throw new Error(body.error || 'Could not update response sharing.');
      if (body.enabled && body.publicId) {
        setViewingResponses((current) =>
          current ? { ...current, responsesPublicId: body.publicId } : current,
        );
        const url = `${window.location.origin}/quiz/responses/${body.publicId}`;
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast.success(
          'Assessment responses are public and the link was copied.',
        );
      } else {
        setViewingResponses((current) =>
          current ? { ...current, responsesPublicId: undefined } : current,
        );
        toast.success(
          'Shared response page disabled. The previous link no longer works.',
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ?
          error.message
        : 'Could not update response sharing.',
      );
    } finally {
      setResponseListSharing(false);
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

      const foundById = options.find((o) => o && o.id === idStr);
      if (foundById) return foundById.text;

      // Some older/imported submissions store option positions instead of IDs.
      if (/^(0|[1-9]\d*)$/.test(idStr)) {
        const indexed = options[Number(idStr)];
        if (indexed && typeof indexed === 'object') return indexed.text;
      }

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

  const exportResponses = (quiz: Quiz, format: 'csv' | 'json' | 'txt') => {
    const responses = (quiz.responses || []).filter(
      (response) => response.status !== 'in_progress',
    );
    if (responses.length === 0) {
      toast.info('No responses to export yet.');
      return;
    }

    void showConfirm(
      'Images, videos, and other media are not embedded in feedback exports. Media URLs are retained where available, and participants can download the files separately.',
      { confirmText: 'Export without media', type: 'warning' },
    ).then((confirmed) => {
      if (confirmed) downloadExport();
    });

    const downloadExport = () => {
      let content = '';
      let mimeType = '';
      if (format === 'csv') {
        content = exportResponsesToCSV(quiz, responses);
        mimeType = 'text/csv;charset=utf-8;';
      } else if (format === 'json') {
        content = exportResponsesToJSON(quiz, responses);
        mimeType = 'application/json;charset=utf-8;';
      } else {
        content = exportResponsesToText(quiz, responses);
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
  };

  const exportResponsesPdf = (
    quiz: Quiz,
    sourceResponses: any[],
    takerNumber?: number,
  ) => {
    const responses =
      takerNumber === undefined ?
        sourceResponses.filter((response) => response.status !== 'in_progress')
      : sourceResponses;
    if (!responses.length) {
      toast.info('No submitted responses to export yet.');
      return;
    }
    void showConfirm(
      'The PDF embeds resized images when the source permits. Videos and documents remain downloadable links; images that cannot be fetched are listed as links.',
      { confirmText: 'Create PDF', type: 'info' },
    ).then((confirmed) => {
      if (!confirmed || !viewingResponses) return;
      triggerExport(
        `${quiz.title.replace(/\s+/g, '_')}${takerNumber ? `_taker_${takerNumber}` : '_feedback'}`,
        'pdf',
        (filename) => {
          void (async () => {
            setIsLoadingFeedback(true);
            try {
              let completeResponses = [...responses];
              if (
                takerNumber === undefined &&
                viewingResponses.id === quiz.id &&
                viewingResponses.responsesNextOffset != null
              ) {
                let nextOffset: number | null =
                  viewingResponses.responsesNextOffset;
                let pageCount = 0;
                while (nextOffset !== null && pageCount++ < 50) {
                  const page = await HybridStorage.getQuizResponses(
                    quiz.id,
                    nextOffset,
                  );
                  completeResponses.push(...page.responses);
                  nextOffset = page.nextOffset;
                }
                if (nextOffset !== null)
                  throw new Error(
                    'The assessment has more responses than can be included in one export.',
                  );
                const byId = new Map(
                  completeResponses.map((response, index) => [
                    String(response.id || `${response.timestamp}-${index}`),
                    response,
                  ]),
                );
                completeResponses = [...byId.values()];
              }
              await exportQuizFeedbackPdf(
                {
                  quiz,
                  responses: completeResponses,
                  setterUsername: username,
                  setterDisplayName:
                    user?.user_metadata?.display_name ||
                    user?.user_metadata?.full_name ||
                    username,
                  responseIndex: takerNumber === undefined ? undefined : 0,
                  takerNumber,
                },
                filename,
              );
              toast.success('Feedback PDF exported.');
            } catch (error) {
              console.error('[Quiz feedback PDF] Export failed:', error);
              toast.error(
                error instanceof Error ?
                  error.message
                : 'Could not create the feedback PDF. Please retry.',
              );
            } finally {
              setIsLoadingFeedback(false);
            }
          })();
        },
      );
    });
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
        try {
          await HybridStorage.clearTemplatePreviewResponses(quizId);
        } catch (error: any) {
          toast.error(error?.message || 'Could not clear preview responses.');
          return;
        }
        localStorage.setItem(seedTemplateStorageKey(), JSON.stringify(updated));
      } else {
        try {
          await HybridStorage.clearQuizResponses(quizId);
        } catch (error: any) {
          toast.error(
            error?.message || 'Could not clear assessment responses.',
          );
          return;
        }
      }
      await HybridStorage.clearQuizResponseCache(quizId);

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

  // Auto-tag expired quizzes & purge those expired for > 48h
  const processExpiryStatus = async (items: Quiz[]): Promise<Quiz[]> => {
    const now = Date.now();
    const twoDaysMs = 48 * 60 * 60 * 1000;
    const toKeep: Quiz[] = [];
    for (const quiz of items) {
      const isTemplate =
        quiz.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id ||
        Boolean(quiz.isTemplate);
      if (isTemplate) {
        toKeep.push(quiz);
        continue;
      }
      if (quiz.expires_at) {
        const expiresAt = new Date(quiz.expires_at).getTime();
        const isExpired = expiresAt < now;
        const isPurgeEligible = now - expiresAt > twoDaysMs;
        if (isPurgeEligible) {
          await HybridStorage.delete(quiz.id, 'quiz');
          continue;
        }
        toKeep.push({ ...quiz, _isExpired: isExpired } as any);
      } else {
        toKeep.push(quiz);
      }
    }
    return toKeep;
  };

  const loadQuizzes = async () => {
    setIsLoadingQuizzes(true);
    try {
      const localSeedKey = seedTemplateStorageKey();
      const includeLocalSeed = (items: Quiz[]) => {
        try {
          const localSeed = JSON.parse(
            localStorage.getItem(localSeedKey) || 'null',
          ) as Quiz | null;
          if (
            localSeed &&
            localSeed?.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id
          ) {
            return [
              localSeed,
              ...items.filter((item) => item.id !== localSeed.id),
            ];
          } else {
            localStorage.setItem(
              localSeedKey,
              JSON.stringify(DEFAULT_PINGWORLD_SHOWCASE_QUIZ),
            );
            return [
              DEFAULT_PINGWORLD_SHOWCASE_QUIZ,
              ...items.filter(
                (item) => item.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id,
              ),
            ];
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
          if (
            !freshItems ||
            (typeof navigator !== 'undefined' && !navigator.onLine)
          )
            return;
          // 2. Called in background when remote data arrives — silently refresh
          const remoteItems = normalizeItems(freshItems).filter(
            (item) => item.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id,
          );
          const processed = await processExpiryStatus(remoteItems);
          const incoming = sortQuizCards(includeLocalSeed(processed));
          setQuizzes((current) => {
            const currentById = new Map(current.map((item) => [item.id, item]));
            let changed = current.length !== incoming.length;
            const merged = incoming.map((item) => {
              const previous = currentById.get(item.id);
              if (
                !previous ||
                JSON.stringify(previous) !== JSON.stringify(item)
              )
                changed = true;
              return (
                  previous && JSON.stringify(previous) === JSON.stringify(item)
                ) ?
                  previous
                : item;
            });
            return changed ? merged : current;
          });
        },
      );

      const localQuizzes = normalizeItems(localData).filter(
        (item) => item.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id,
      );
      const processed = await processExpiryStatus(localQuizzes);

      // Auto-seed default showcase template on first time visiting the quiz section
      if (typeof window !== 'undefined') {
        const seeded = localStorage.getItem(localSeedKey);
        if (!seeded && processed.length === 0) {
          try {
            localStorage.setItem(
              localSeedKey,
              JSON.stringify(DEFAULT_PINGWORLD_SHOWCASE_QUIZ),
            );
            setQuizzes(sortQuizCards([DEFAULT_PINGWORLD_SHOWCASE_QUIZ]));
            return;
          } catch {
            // Continue if storage fails
          }
        }
      }

      setQuizzes(sortQuizCards(includeLocalSeed(processed)));
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  // Load from hybrid storage (offline-first)
  useEffect(() => {
    if (!isLoading) {
      setIsLoadingQuizzes(true);
      void loadQuizzes()
        .catch((error) => {
          console.error(
            '[Quiz] Local/remote assessment list failed to load.',
            error,
          );
          toast.error(
            'Assessments could not be loaded. Check your connection and retry.',
          );
        })
        .finally(() => setIsLoadingQuizzes(false));
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
    let removedTierFeatures = false;
    const originalQuizId = quiz.id;
    const hasDatabaseUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        quiz.id,
      );
    if (
      user?.id &&
      !hasDatabaseUuid &&
      quiz.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id
    ) {
      quiz = {
        ...quiz,
        id: generateQuizId(),
        customUrl:
          quiz.customUrl ||
          (quiz.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id ? '' : quiz.id),
        isCustom: true,
        userId: user.id,
      };
    }
    const maxFileSizeMb =
      !quizUnlocked ? 5
      : premiumTier === 'pro' ? 50
      : 15;
    const normalizedQuestions = (quiz.questions || []).map((question) => {
      const requestedSize = Number(question.maxFileSize);
      const allowedSize =
        Number.isFinite(requestedSize) && requestedSize > 0 ?
          Math.min(requestedSize, maxFileSizeMb)
        : maxFileSizeMb;
      const normalized = { ...question, maxFileSize: allowedSize };
      if (!quizUnlocked) {
        const rawAllowedTypes =
          typeof normalized.allowedTypes === 'string' ?
            normalized.allowedTypes
          : '';
        const allowedTypes = rawAllowedTypes
          .split(',')
          .map((type) => type.trim())
          .filter(
            (type) =>
              type &&
              type !== '.' &&
              !type.toLowerCase().endsWith('.zip') &&
              !type.toLowerCase().startsWith('video/') &&
              !type.toLowerCase().startsWith('audio/'),
          );
        const nextAllowedTypes =
          allowedTypes.length ?
            allowedTypes.join(',')
          : 'image/*,.pdf,.doc,.docx,.txt,.json,application/json';
        if (nextAllowedTypes !== rawAllowedTypes) removedTierFeatures = true;
        normalized.allowedTypes = nextAllowedTypes;
      }
      return normalized;
    });
    if (!quizUnlocked && (quiz.branding || quiz.allowPass))
      removedTierFeatures = true;
    if (
      premiumTier !== 'pro' &&
      (quiz.customUrl || quiz.isCustom || quiz.isPrivate)
    )
      removedTierFeatures = true;
    if (!quizUnlocked && quiz.info) removedTierFeatures = true;
    quiz = {
      ...quiz,
      fromPremium: quizUnlocked,
      ...(quizUnlocked ?
        {}
      : { branding: undefined, allowPass: false, info: undefined }),
      ...(premiumTier === 'pro' ?
        {}
      : {
          customUrl: undefined,
          isCustom: false,
          isPrivate: false,
          privateKey: undefined,
          privateKeyHash: undefined,
          allowedParticipantUsernames: undefined,
        }),
      questions: normalizedQuestions,
    };
    if (isImport && !quizUnlocked && quiz.questions.length > 10) {
      return toast.error(
        'This file has more than 10 questions. Reduce the question count or unlock the quiz plan before importing it.',
      );
    }
    if (!quiz.title) return toast.error('Quiz needs a title!');
    if (quiz?.questions?.length === 0)
      return toast.error('Quiz needs at least one question!');
    if (quiz.isPrivate && premiumTier !== 'pro') {
      quiz = {
        ...quiz,
        isPrivate: false,
        privateKey: undefined,
        privateKeyHash: undefined,
        allowedParticipantUsernames: undefined,
      };
      toast.info(
        'Private assessments require the Pro tier. This assessment will be saved as public.',
      );
    }
    let privateKeyHash = quiz.privateKeyHash;
    const privateKey = String(quiz.privateKey || '').trim();
    if (privateKey) {
      try {
        const digest = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(privateKey),
        );
        privateKeyHash = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
      } catch {
        return toast.error(
          'Private-key security is unavailable in this browser. Save using HTTPS or keep the assessment public.',
        );
      }
    }
    if (quiz.isPrivate && !privateKeyHash)
      return toast.error(
        'Create an access key before saving a private assessment.',
      );

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
      return (
        !question.options?.length ||
        question.options.some(
          (option) => !option?.id?.trim() || !option?.text?.trim(),
        )
      );
    });
    if (invalid && !isImport)
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
      assessmentTier,
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
      privateKey: undefined,
      privateKeyHash: quiz.isPrivate ? privateKeyHash : undefined,
      allowedParticipantUsernames:
        quiz.isPrivate ?
          [
            ...new Set(
              (quiz.allowedParticipantUsernames || [])
                .map((name) => name.trim().replace(/^@/, '').toLowerCase())
                .filter(Boolean),
            ),
          ]
        : undefined,
      questions: securedQuestions,
      expires_at: finalExpiry,
      expiryHistory,
      isExpiryLocked,
    };

    setIsSavingQuiz(true);
    try {
      await HybridStorage.setUserId(user?.id || null);
      const isLocalSeed = quizToSave.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id;
      const wasOnline = typeof navigator === 'undefined' || navigator.onLine;
      const isSynced =
        isLocalSeed ? false : (
          (
            await HybridStorage.save(quizToSave.id, quizToSave, 'quiz', {
              requireRemote: Boolean(user?.id && wasOnline),
            })
          ).is_synced
        );
      if (isLocalSeed) {
        localStorage.setItem(
          seedTemplateStorageKey(),
          JSON.stringify(quizToSave),
        );
      }
      if (!isLocalSeed) {
        await HybridStorage.deleteQuizDraft(quizToSave.id);
        if (originalQuizId !== quizToSave.id)
          await HybridStorage.deleteQuizDraft(originalQuizId);
        if (originalQuizId !== quizToSave.id)
          await HybridStorage.delete(originalQuizId, 'quiz');
      }

      const retainedQuizzes = quizzes.filter(
        (item) =>
          item.id !== originalQuizId || originalQuizId === quizToSave.id,
      );
      const existingIndex = retainedQuizzes.findIndex(
        (q) => q.id === quizToSave.id,
      );
      let newQuizzes;
      if (existingIndex > -1) {
        newQuizzes = [...retainedQuizzes];
        newQuizzes[existingIndex] = {
          ...quizToSave,
          is_synced: isSynced,
        } as any;
      } else {
        newQuizzes = [
          { ...quizToSave, is_synced: isSynced } as any,
          ...retainedQuizzes,
        ];
      }

      setQuizzes(sortQuizCards(newQuizzes));
      setIsCreating(false);
      setActiveQuiz(null);
      if (removedTierFeatures)
        toast.info(
          'Features outside your current assessment plan were removed or adjusted before saving.',
        );
      if (!isImport && user?.id && isSynced) {
        const sharePath =
          quizToSave.customUrl && username ?
            `/u/${encodeURIComponent(username)}/q/${encodeURIComponent(quizToSave.customUrl)}`
          : `/q/${encodeURIComponent(quizToSave.id)}`;
        void notifyInApp({
          resourceId: quizToSave.id,
          type: 'assessment_saved',
          title: 'Assessment saved',
          body: `“${quizToSave.title || 'Untitled assessment'}” is saved and ready to share.`,
          icon: 'clipboard-check',
          action: { label: 'Share assessment', href: sharePath },
        }).catch((error) =>
          console.warn('[Quiz] Saved notification could not be shown:', error),
        );
      } else if (!isImport) {
        toast.info(
          user?.id ?
            'Saved on this device. It will sync when your connection is restored.'
          : 'Assessment saved on this device. Sign in to sync it to your account.',
        );
      }
      isImport && toast.success(`Quiz "${quiz.title}" imported successfully!`);

      quizHaptic([35, 45, 100]);
    } catch (e) {
      const reason =
        e instanceof Error ? e.message
        : e && typeof e === 'object' && 'message' in e ?
          String(
            (e as { message?: unknown }).message ||
              'The database rejected this assessment.',
          )
        : String(e);
      toast.error(
        `Could not save “${quizToSave.title}” (${quizToSave.id}): ${reason}`,
      );
      quizHaptic(14);
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const deleteQuiz = async (id: string) => {
    const check = await showConfirm(
      'Delete this assessment? You will have 10 seconds to undo before it is permanently removed.',
      { confirmText: 'Delete', cancelText: 'Cancel', type: 'warning' },
    );

    if (!check) return;
    const quizToDelete = quizzes.find((item) => item.id === id);
    if (!quizToDelete) return;
    let finalized = false;
    let timeoutId: number | undefined;
    const restoreQuiz = () => {
      if (finalized) return;
      finalized = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setQuizzes((current) =>
        sortQuizCards([
          ...current.filter((item) => item.id !== id),
          quizToDelete,
        ]),
      );
      quizHaptic([18, 25, 18]);
      toast.success('Assessment deletion cancelled.');
    };
    const commitDelete = async () => {
      if (finalized) return;
      finalized = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      try {
        if (id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
          localStorage.removeItem(seedTemplateStorageKey());
        } else {
          await HybridStorage.delete(id, 'quiz');
        }
        quizHaptic([35, 45, 60]);
        if (user?.id) {
          void notifyInApp({
            resourceId: id,
            type: 'assessment_deleted',
            title: 'Assessment deleted',
            body: `“${quizToDelete.title || 'Untitled assessment'}” was deleted.`,
            icon: 'trash-2',
          }).catch((error) =>
            console.warn(
              '[Quiz] Deletion notification could not be shown:',
              error,
            ),
          );
        }
      } catch (error) {
        setQuizzes((current) =>
          sortQuizCards([
            ...current.filter((item) => item.id !== id),
            quizToDelete,
          ]),
        );
        toast.error(
          error instanceof Error ?
            error.message
          : 'Assessment could not be deleted.',
        );
      }
    };
    setQuizzes((current) => current.filter((item) => item.id !== id));
    timeoutId = window.setTimeout(() => void commitDelete(), 10_000);
    window.dispatchEvent(
      new CustomEvent('pw_in_app_notification', {
        detail: {
          id: `assessment-delete-${id}-${Date.now()}`,
          resourceId: '',
          title: 'Assessment scheduled for deletion',
          body: `“${quizToDelete.title || 'Untitled assessment'}” will be removed in 10 seconds.`,
          action: { label: 'Undo', href: '' },
          onAction: restoreQuiz,
          onDismiss: () => void commitDelete(),
          totalCount: 1,
          unreadCount: 1,
        },
      }),
    );
  };

  const exportQuiz = async (quiz: Quiz) => {
    if (!quiz) return;

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
        if (
          typeof quiz?.title !== 'string' ||
          !quiz.title.trim() ||
          !Array.isArray(quiz?.questions)
        )
          throw new Error('Invalid quiz file structure.');
        if (quiz.questions.length === 0 || quiz.questions.length > 200)
          throw new Error(
            'The import must contain between 1 and 200 questions.',
          );

        quiz.id = generateQuizId(); // New fresh ID for import

        // Check if imported quiz has expired
        if (quiz.expires_at) {
          const isExpired = new Date(quiz.expires_at).getTime() < Date.now();
          if (isExpired) {
            const freshExpiry = computeExpiry(assessmentTier, 2).toISOString();
            quiz.expires_at = freshExpiry;
            toast.info(
              'Imported quiz was expired. Lifespan refreshed for your tier.',
            );
          }
        } else {
          quiz.expires_at = computeExpiry(assessmentTier, 2).toISOString();
        }

        void handleSaveQuiz(quiz, true).catch((saveError: unknown) => {
          toast.error(
            saveError instanceof Error ?
              saveError.message
            : 'Could not import this assessment.',
          );
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
    const quiz = quizzes.find((item) => item.id === id);
    const url =
      quiz?.customUrl && username ?
        `/u/${encodeURIComponent(username)}/q/${encodeURIComponent(quiz.customUrl)}`
      : `/q/${encodeURIComponent(id)}`;
    window.open(url, '_blank');
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
        'w-full mx-auto px-4 py-12 max-w-8xl min-h-screen pb-20 transition-all duration-500',
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
                  disabled={isLoadingQuizzes}
                  title='Refresh Quiz'
                  onClick={loadQuizzes}
                  className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
                  <RefreshCw
                    className={cn(
                      'h-4 w-4',
                      isLoadingQuizzes && 'animate-spin',
                    )}
                  />
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
                {Array.from({ length: 2 }, (_, index) => (
                  <div
                    key={index}
                    className='h-50 animate-pulse rounded-2xl border border-white/5 bg-white/[0.035]'
                  />
                ))}
              </div>
            : quizzes.length > 0 ?
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                  {quizzes.map((quiz, i) => {
                    const isTemplate = Boolean((quiz as any).isTemplate) || Boolean((quiz as any).template) || quiz.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id;

                    return <motion.div
                      key={quiz.id}
                      initial={{opacity: 0, scale: 0.8}}
                      animate={{opacity: 1, scale: 1}}
                      transition={{delay: i * 0.05}}>
                      <Card className='card-glow h-full flex flex-col p-5 gap-2 group'>
                        <div className='flex justify-between items-start mb-4 flex-wrap gap-2'>
                          <div
                            className={cn(
                              'flex items-center gap-2 text-[10px] text-pw-muted font-mono uppercase tracking-widest flex-wrap',
                            )}>
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
                                </span>)}
                            {quiz?.questions?.length} Qts
                            {isTemplate && (
                                <span className='rounded-full border border-pw-cyan/30 bg-pw-cyan/10 px-2 py-0.5 text-[9px] font-bold text-pw-cyan'>
                                  TEMPLATE
                                </span>
                              )}
                            {Math.max(
                              responseCounts[quiz.id] ??
                              (Array.isArray(quiz.responses) ?
                                quiz.responses.length
                                : 0),
                              0,
                            ) >= 1 && (
                                <span
                                  className='text-pw-primary'
                                  title='Responses available in the latest loaded data or local cache'>
                                  {Math.max(
                                    responseCounts[quiz.id] ??
                                    (Array.isArray(quiz.responses) ?
                                      quiz.responses.length
                                      : 0),
                                    1,
                                  )}{' '}
                                  Ans{' '}
                                  {newResponseCounts[quiz.id] && (
                                    <span className='ml-1 rounded-full bg-pw-primary/15 px-1.5 py-0.5 text-[8px] text-pw-primary'>
                                      NEW
                                    </span>
                                  )}
                                </span>
                              )}
                            {!isTemplate &&
                              quiz?.expires_at &&
                              (() => {
                                const {label, urgent} = quizExpiryCountdown(
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
                                          'text-amber-400 border-amber-400/30 bg-amber-400/10 animate-pulse'
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
                              onClick={() => {
                                void openFeedback(quiz);
                              }}
                              className='h-8 w-8 text-pw-muted hover:text-pw-cyan'>
                              <MessageSquare className='h-4 w-4' />
                            </Button>
                            {quiz.id !== DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id && (
                              <Button
                                variant='ghost'
                                title='Download as JSON'
                                size='icon'
                                onClick={() => exportQuiz(quiz)}
                                className='h-8 w-8 text-pw-muted hover:text-pw-primary'>
                                <Download className='h-4 w-4' />
                              </Button>
                            )}
                            <Button
                              variant='ghost'
                              size='icon'
                              title='Edit'
                              onClick={async () => {
                                const expired = await isExpired(quiz);
                                if(expired) {
                                  toast.warning(
                                    `This ${quiz.type || 'assessment'} has expired, adjust expiry time.`,
                                  );
                                }
                                const draft = await HybridStorage.getQuizDraft(
                                  quiz.id,
                                );
                                setActiveQuiz(
                                  draft ? {...quiz, ...draft} : quiz,
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
                            disabled={!isTemplate && !(quiz as any).is_synced}
                            title={
                              !isTemplate && !(quiz as any).is_synced ?
                              `${(quiz as any).type || 'Assessment'} is not synchronized yet. ` :
                              'Start Assessment'
                            }
                            onClick={() => {
                              if(!isTemplate && !(quiz as any).is_synced) return;
                              playQuiz(quiz.id);
                            }}
                            className='btn-primary flex-1 h-10 gap-2 min-w-[120px] disabled:opacity-50'>
                            <Play className='h-4 w-4' /> Start
                          </Button>
                          <Button
                            disabled={!isTemplate && !(quiz as any).is_synced}
                            variant='outline'
                            title={
                              !isTemplate && !(quiz as any).is_synced ?
                               `${(quiz as any).type || 'Assessment'} is not synchronized yet. `
                                :'Share Link'
                            }
                            onClick={() => {
                              if(!isTemplate && !(quiz as any).is_synced) return;

                                const route =
                                  quiz.customUrl && username ?
                                    `/u/${encodeURIComponent(username)}/q/${encodeURIComponent(quiz.customUrl)}`
                                    : `/q/${encodeURIComponent(quiz.id)}`;
                                const url = `${window.location.origin}${route}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Short link copied to clipboard!');
                            }}
                            className='h-10 px-4 border-pw-primary/20 hover:bg-pw-primary/5 shrink-0 gap-2 disabled:opacity-50'>
                            <Share2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                })}
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
              openFile={openFile}
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
              className={cn(
                'relative h-full w-full bg-pw-surface/80 bkblur sm:border-l sm:border-white/10 p-3 sm:p-6 sm:shadow-2xl overflow-y-auto',
                showAnalytics ? 'max-w-none' : 'max-w-2xl',
              )}>
              {isLoadingFeedback && (
                <div
                  className='absolute inset-0 z-20 flex items-center justify-center bg-pw-surface/70 bkblur'
                  role='status'
                  aria-live='polite'>
                  <div className='flex flex-col items-center gap-3 px-10 py-10 text-sm text-pw-muted'>
                    <LoaderCircle className='h-7 w-7 animate-spin text-pw-primary' />
                    Loading responses and analytics...
                  </div>
                </div>
              )}
              <div className='flex justify-between items-center mb-8 gap-3 flex-wrap pt-4'>
                <div className='mb-1 px-2'>
                  <h2 className='text-2xl font-bold'>
                    {(
                      viewingResponses.responses &&
                      viewingResponses.responses.length > 0
                    ) ?
                      `Feedback
                    ${
                      viewingResponses.responses &&
                      `(${viewingResponses.responsesTotalCount ?? viewingResponses.responses?.length})`
                    }`
                    : 'No Feedback'}
                  </h2>
                  <p className='text-sm text-pw-muted'>
                    {viewingResponses.title}
                  </p>
                </div>

                <div className='flex items-center gap-2 flex-wrap px-2'>
                  {!viewingResponses.isTemplate &&
                    viewingResponses.id !==
                      DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id &&
                    (viewingResponses.responses || []).some(
                      (response: any) => response.status !== 'in_progress',
                    ) && (
                      <Button
                        variant='outline'
                        size='sm'
                        title={
                          viewingResponses.responsesPublicId ?
                            'Make assessment responses private'
                          : 'Make assessment responses public'
                        }
                        aria-label={
                          viewingResponses.responsesPublicId ?
                            'Make assessment responses private'
                          : 'Make assessment responses public'
                        }
                        disabled={responseListSharing}
                        onClick={() => void toggleResponseListPublic()}
                        className='h-9 gap-1.5 border-pw-primary/30 text-xs text-pw-primary'>
                        {responseListSharing ?
                          <LoaderCircle
                            size={14}
                            className='animate-spin'
                          />
                        : viewingResponses.responsesPublicId ?
                          <>
                            <EyeOff size={14} /> Private
                          </>
                        : <>
                            <Share2 size={14} /> Public
                          </>
                        }
                      </Button>
                    )}
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
                          <DropdownMenuContent className='bg-pw-surface/70 w-50 bkblur border-white/10'>
                            <DropdownMenuItem
                              onClick={() =>
                                exportResponses(viewingResponses, 'csv')
                              }
                              className='cursor-pointer text-xs'>
                              Export as Spreadsheet
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                exportResponses(viewingResponses, 'json')
                              }
                              className='cursor-pointer text-xs'>
                              Export as JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                exportResponses(viewingResponses, 'txt')
                              }
                              className='cursor-pointer text-xs'>
                              Export as TXT
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className='bg-white/10' />
                            <DropdownMenuItem
                              onClick={() =>
                                exportResponsesPdf(
                                  viewingResponses,
                                  viewingResponses.responses || [],
                                )
                              }
                              className='cursor-pointer text-xs font-semibold text-pw-success'>
                              Export as PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {user?.email_confirmed_at &&
                          premiumTier === 'free' &&
                          viewingResponses.id ===
                            DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id && (
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
                                void emailResponseExport(
                                  viewingResponses.id,
                                  'csv',
                                )
                              }
                              className='h-9 gap-1.5 border-white/10 text-xs'>
                              <Mail size={15} />{' '}
                              {isEmailingExport ? 'Sending…' : 'Email CSV'}
                            </Button>
                          )}
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
                    let violations = 0;
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
                      const takerLabel = `Taker #${Math.max(1, (viewingResponses.responsesTotalCount ?? responses.length) - fallbackIdx)}`;
                      const ud = resp.userData;
                      if (!ud) return takerLabel;
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
                          takerLabel
                        );
                      }
                      return String(ud) || takerLabel;
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
                      else if (reason === 'violation') violations++;
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

                      const passCutoff =
                        (resp.scorePossible ??
                          resp.totalQuestions ??
                          viewingResponses.questions.length) * 0.5;
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
                        if (typeof ans.correct !== 'boolean') return;
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
                                      {totalPass} Correct ({passPct}%)
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
                                <div className='grid grid-cols-2 sm:grid-cols-5 gap-2 text-center'>
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
                                      Violations
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-danger'>
                                      {violations}
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
                                <div className='grid grid-cols-2 sm:grid-cols-5 gap-2 text-center'>
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
                                      Violations
                                    </span>
                                    <span className='text-lg font-bold font-mono text-pw-danger'>
                                      {violations}
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
                : [...(viewingResponses.responses || [])].map((resp, idx) => (
                    <Card
                      key={idx}
                      className='p-2 sm:p-3 bg-white/5 bkblur ring-0 gap-0 space-y-2 relative overflow-hidden'>
                      <div className='flex justify-between items-start'>
                        <div>
                          <div className='mb-1 flex items-center gap-1.5'>
                            {resp.status === 'in_progress' ?
                              <span className='inline-flex items-center gap-1 text-[9px] font-bold uppercase text-pw-warning animate-pulse '>
                                <span className='h-1.5 w-1.5 rounded-full bg-pw-warning' />
                                Live
                              </span>
                            : <span className='inline-flex items-center gap-1 text-[9px] font-bold uppercase text-pw-success'>
                                <CheckCircle2 className='h-3 w-3' />
                                Submitted
                              </span>
                            }
                            {resp.submissionReason &&
                              resp.submissionReason !== 'completion' &&
                              resp.status !== 'in_progress' && (
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                    resp.submissionReason === 'violation' ?
                                      'bg-pw-danger/15 text-pw-danger'
                                    : 'bg-pw-warning/10 text-pw-warning',
                                  )}>
                                  {resp.submissionReason === 'timeout' ?
                                    'Timed out'
                                  : resp.submissionReason === 'violation' ?
                                    'Security violation'
                                  : 'Self-submitted'}
                                </span>
                              )}
                          </div>
                          <p className='font-bold text-pw-cyan truncate max-w-[200px]'>
                            {resp.status === 'in_progress' ?
                              'Live attempt'
                            : `Taker ${
                                (viewingResponses.responses || [])
                                  .slice(0, idx + 1)
                                  .filter(
                                    (item: any) =>
                                      item.status !== 'in_progress',
                                  ).length
                              }`
                            }
                          </p>
                          {resp.status !== 'in_progress' && (
                            <p className='mt-1 text-[10px] text-pw-muted italic'>
                              Submitted{' '}
                              {new Date(
                                resp.submittedAt || resp.timestamp,
                              ).toLocaleString()}
                            </p>
                          )}
                          <p className='text-[8px] font-medium text-pw-muted'>
                            {(
                              (resp.answeredQuestions ??
                                resp.answers.filter(
                                  (answer: any) =>
                                    !answer.passed &&
                                    (answer.fileUrl ||
                                      (answer.answer !== undefined &&
                                        answer.answer !== '' &&
                                        (!Array.isArray(answer.answer) ||
                                          answer.answer.length > 0))),
                                ).length) === resp.totalQuestions
                            ) ?
                              `Attempted all ${resp.totalQuestions} questions.`
                            : `Attempted 
                            ${
                              resp.answeredQuestions ??
                              resp.answers.filter(
                                (answer: any) =>
                                  !answer.passed &&
                                  (answer.fileUrl ||
                                    (answer.answer !== undefined &&
                                      answer.answer !== '' &&
                                      (!Array.isArray(answer.answer) ||
                                        answer.answer.length > 0))),
                              ).length
                            }{' '}
                          / {resp.totalQuestions} questions`
                            }
                          </p>
                        </div>

                        {resp.status !== 'in_progress' && (
                          <div className='flex items-center gap-1'>
                            <button
                              title={`Export taker ${Math.max(1, (viewingResponses.responses || []).slice(0, idx + 1).filter((item: any) => item.status !== 'in_progress').length)} as PDF`}
                              aria-label={`Export taker ${Math.max(1, (viewingResponses.responses || []).slice(0, idx + 1).filter((item: any) => item.status !== 'in_progress').length)} as PDF`}
                              className='h-8 w-8 rounded-xl border-none flex items-center justify-center bg-transparent p-1 text-[10px] text-pw-cyan hover:bg-white/6'
                              onClick={() =>
                                exportResponsesPdf(
                                  viewingResponses,
                                  [resp],
                                  Math.max(
                                    1,
                                    (viewingResponses.responses || [])
                                      .slice(0, idx + 1)
                                      .filter(
                                        (item: any) =>
                                          item.status !== 'in_progress',
                                      ).length,
                                  ),
                                )
                              }>
                              <Share2 className='h-3.5 w-3.5' />
                            </button>
                            {viewingResponses.responsesPublicId && (
                              <button
                                type='button'
                                title={`Copy taker ${Math.max(1, (viewingResponses.responses || []).slice(0, idx + 1).filter((item: any) => item.status !== 'in_progress').length)} response link`}
                                aria-label={`Copy taker ${Math.max(1, (viewingResponses.responses || []).slice(0, idx + 1).filter((item: any) => item.status !== 'in_progress').length)} response link`}
                                className='h-8 w-8 rounded-xl flex items-center justify-center bg-transparent p-1 text-pw-cyan hover:bg-white/6'
                                onClick={async () => {
                                  try {
                                    const publicId =
                                      viewingResponses.responsesPublicId;
                                    if (!publicId || !resp.id)
                                      throw new Error(
                                        'This response link is unavailable.',
                                      );
                                    const link = `${window.location.origin}/quiz/responses/${publicId}/taker?responseId=${encodeURIComponent(String(resp.id))}`;
                                    await navigator.clipboard.writeText(link);
                                    toast.success(
                                      `Taker ${Math.max(1, (viewingResponses.responses || []).slice(0, idx + 1).filter((item: any) => item.status !== 'in_progress').length)} response link copied.`,
                                    );
                                  } catch {
                                    toast.error(
                                      'Could not copy this response link.',
                                    );
                                  }
                                }}>
                                <Copy className='h-3.5 w-3.5' />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 py-2 border-y border-white/5 px-1 mb-1'>
                        {Object.entries(resp.userData).map(([key, val], i) => (
                          <div
                            key={key + i}
                            className='flex gap-1.5 text-[11px]'>
                            <span className='text-pw-muted font-bold uppercase'>
                              {key}:
                            </span>
                            <span className='text-white'>{val}</span>
                          </div>
                        ))}
                        <div
                          key={resp.id + 'score'}
                          className='flex gap-1.5 text-[11px]'>
                          <span className='text-pw-muted font-bold uppercase'>
                            Score:
                          </span>
                          <span className='text-white'>
                            {resp.score} out of{' '}
                            {resp.scorePossible ?? resp.totalQuestions}{' '}
                          </span>
                        </div>
                      </div>

                      {resp.isSignedUser &&
                        resp.signedUser &&
                        !Object.entries(resp.userData || {}).some(
                          ([key, value]) =>
                            ![
                              'categoryScores',
                              'submissionReason',
                              'assessmentType',
                              'isSignedUser',
                              'signedUser',
                              'currentPathQuestionIds',
                              'pathQuestionSnapshots',
                              'branchHistory',
                              'attemptTokenHash',
                              'deviceKeyHash',
                              'attemptId',
                              'attemptToken',
                              'deviceKey',
                              'startedAt',
                              'durationSeconds',
                              'responseMediaExternalized',
                            ].includes(key) &&
                            (typeof value === 'string' ||
                              typeof value === 'number' ||
                              typeof value === 'boolean') &&
                            String(value).trim().length > 0,
                        ) && (
                          <div className='grid grid-cols-1 gap-1 py-1 text-[10px] sm:grid-cols-2'>
                            <span className='font-bold uppercase tracking-wide text-pw-primary sm:col-span-2'>
                              Signed user
                            </span>
                            {resp.signedUser.displayName && (
                              <span>
                                <b className='text-pw-muted'>Display name: </b>
                                {resp.signedUser.displayName}
                              </span>
                            )}
                            {resp.signedUser.username && (
                              <span>
                                <b className='text-pw-muted'>Username: </b>@
                                {resp.signedUser.username}
                              </span>
                            )}
                            {resp.signedUser.email && (
                              <span className='break-all sm:col-span-2'>
                                <b className='text-pw-muted'>Email: </b>
                                {resp.signedUser.email}
                              </span>
                            )}
                          </div>
                        )}

                      {resp.status !== 'in_progress' && (
                        <div className='grid grid-cols-2 gap-2 text-[10px] py-2 mb-1 border-b border-white/5 sm:grid-cols-4'>
                          <span>
                            <b className='block text-pw-muted'>Started</b>
                            {resp.startedAt ?
                              new Date(resp.startedAt).toLocaleString()
                            : 'Unavailable'}
                          </span>

                          {resp.submittedAt && (
                            <span>
                              <b className='block text-pw-muted'>Submitted</b>
                              {new Date(
                                resp.submittedAt || resp.timestamp,
                              ).toLocaleString()}
                            </span>
                          )}

                          {resp.durationSeconds && (
                            <span>
                              <b className='block text-pw-muted'>Duration</b>
                              {typeof resp.durationSeconds === 'number' ?
                                `${Math.floor(resp.durationSeconds / 60)}m ${resp.durationSeconds % 60}s`
                              : 'Unavailable'}
                            </span>
                          )}
                          <span>
                            <b className='block text-pw-muted'>
                              Correct / incorrect
                            </b>
                            {
                              resp.answers.filter(
                                (answer: any) => answer.correct === true,
                              ).length
                            }{' '}
                            /{' '}
                            {
                              resp.answers.filter(
                                (answer: any) => answer.correct === false,
                              ).length
                            }
                          </span>

                          {resp.answers &&
                            resp.answers.filter((answer: any) => answer.passed)
                              .length > 0 && (
                              <span>
                                <b className='block text-pw-muted'>
                                  Skipped questions
                                </b>
                                {
                                  resp.answers.filter(
                                    (answer: any) => answer.passed,
                                  ).length
                                }
                              </span>
                            )}

                          {resp.totalQuestions -
                            new Set(
                              resp.answers.map(
                                (answer: any) => answer.questionId,
                              ),
                            ).size >
                            0 && (
                            <span>
                              <b className='block text-pw-muted'>Unanswered</b>
                              {Math.max(
                                0,
                                resp.totalQuestions -
                                  new Set(
                                    resp.answers.map(
                                      (answer: any) => answer.questionId,
                                    ),
                                  ).size,
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      {Array.isArray(resp.branchHistory) &&
                        resp.branchHistory.length > 0 && (
                          <div className='space-y-1 mt-1'>
                            <p className='text-[10px] font-bold uppercase tracking-wide text-pw-cyan'>
                              Branches followed
                            </p>
                            {resp.branchHistory.map((branch, branchIndex) => {
                              const branchAnswers = resp.answers.filter(
                                (answer: any) =>
                                  branch.questionIds.includes(
                                    String(answer.questionId),
                                  ),
                              );
                              const savedBranchQuestions =
                                resp.pathQuestionSnapshots ||
                                viewingResponses.questions ||
                                [];
                              const triggerIndex =
                                savedBranchQuestions.findIndex(
                                  (question: any) =>
                                    String(question.id) ===
                                    String(branch.fromQuestionId),
                                );
                              const triggerLabel =
                                triggerIndex >= 0 ?
                                  `Question ${triggerIndex + 1}`
                                : 'Question';
                              const branchQuestionNumbers = (
                                branch.questionIds || []
                              )
                                .map(
                                  (id: string) =>
                                    savedBranchQuestions.findIndex(
                                      (question: any) =>
                                        String(question.id) === String(id),
                                    ) + 1,
                                )
                                .filter((number: number) => number > 0);
                              return (
                                <div
                                  key={`${branch.fromQuestionId}-${branchIndex}`}
                                  className='grid grid-cols-2 gap-x-3 gap-y-0.5 border-b border-white/5 py-1 text-[10px] sm:grid-cols-4'>
                                  <span className='font-semibold'>
                                    {triggerLabel} →{' '}
                                    {branch.category ?
                                      `Group: ${branch.category}`
                                    : 'General flow'}
                                  </span>
                                  <span>
                                    Questions{' '}
                                    {branchQuestionNumbers.length ?
                                      branchQuestionNumbers.join(', ')
                                    : branch.questionIds.length}
                                  </span>
                                  <span>
                                    Attempted{' '}
                                    {
                                      branchAnswers.filter(
                                        (answer: any) =>
                                          !answer.passed &&
                                          answer.answer !== undefined &&
                                          answer.answer !== '',
                                      ).length
                                    }
                                  </span>
                                  <span>
                                    Failed{' '}
                                    {
                                      branchAnswers.filter(
                                        (answer: any) =>
                                          answer.correct === false,
                                      ).length
                                    }{' '}
                                    · Skipped{' '}
                                    {
                                      branchAnswers.filter(
                                        (answer: any) => answer.passed,
                                      ).length
                                    }
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      <div>
                        <div className='flex justify-between items-center pt-1'>
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
                            {expandedResponse === idx ? 'HIDE' : 'VIEW DETAILS'}
                          </Button>
                        </div>

                        <AnimatePresence>
                          {expandedResponse === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className='mt-2 grid grid-cols-1 gap-0 overflow-hidden rounded-xl bg-pw-surface/70 p-2 sm:p-4 bkblur xl:grid-cols-2'>
                              {resp.answers.map((ans, i) => {
                                const question =
                                  ans.questionSnapshot ||
                                  viewingResponses.questions.find(
                                    (q) => q.id === ans.questionId,
                                  );
                                const resolvedAnswer = resolveAnswerToText(
                                  ans.questionSnapshot ?
                                    {
                                      ...viewingResponses,
                                      questions: [ans.questionSnapshot],
                                    }
                                  : viewingResponses,
                                  ans.questionId,
                                  ans.answer,
                                );
                                const resolvedCorrect = resolveCorrectText(
                                  ans.questionSnapshot ?
                                    {
                                      ...viewingResponses,
                                      questions: [
                                        {
                                          ...ans.questionSnapshot,
                                          correctIndex:
                                            decodeStoredCorrectAnswer(
                                              ans.questionSnapshot.correctIndex,
                                            ),
                                        },
                                      ],
                                    }
                                  : viewingResponses,
                                  ans.questionId,
                                );

                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      'space-y-0.5 py-2 sm:py-3',
                                      i !== resp.answers.length &&
                                        'border-b border-white/5 ',
                                      i === 0 && 'pt-0',
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

                                    <div className='flex items-start gap-1 pt-1 flex-wrap'>
                                      <p className='text-[10px] font-bold text-white shrink-0'>
                                        ANSWER:
                                      </p>
                                      {ans.fileUrl ?
                                        <div className='flex items-center w-full justify-between overflow-hidden'>
                                          {(() => {
                                            const previewUrl =
                                              unpackPingWorldMediaUrl(
                                                String(ans.fileUrl),
                                              ).url || String(ans.fileUrl);
                                            const mime = String(
                                              ans.fileType || '',
                                            ).toLowerCase();
                                            const fileName = String(
                                              ans.fileName || '',
                                            );
                                            const detectedType =
                                              (
                                                mime.startsWith('image/') ||
                                                /^data:image\//i.test(
                                                  previewUrl,
                                                ) ||
                                                /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(
                                                  fileName,
                                                )
                                              ) ?
                                                'image'
                                              : (
                                                mime.startsWith('video/') ||
                                                /^data:video\//i.test(
                                                  previewUrl,
                                                ) ||
                                                /\.(mp4|webm|mov|m4v|ogv)$/i.test(
                                                  fileName,
                                                )
                                              ) ?
                                                'video'
                                              : (
                                                mime.startsWith('audio/') ||
                                                /^data:audio\//i.test(
                                                  previewUrl,
                                                ) ||
                                                /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(
                                                  fileName,
                                                )
                                              ) ?
                                                'audio'
                                              : 'document';
                                            const openAttachment = () =>
                                              openFile({
                                                src: previewUrl,
                                                name:
                                                  fileName ||
                                                  'Response attachment',
                                              });
                                            const openButton = (
                                              <button
                                                type='button'
                                                onClick={openAttachment}
                                                className='text-[10px] font-semibold text-pw-cyan hover:underline'>
                                                Open {detectedType} fullscreen
                                              </button>
                                            );
                                            if (detectedType === 'image')
                                              return (
                                                <button
                                                  type='button'
                                                  onClick={openAttachment}
                                                  className='flex w-full cursor-zoom-in flex-col items-center gap-1 p-2'>
                                                  <NextImage
                                                    src={previewUrl}
                                                    alt='Uploaded response preview'
                                                    width={320}
                                                    height={192}
                                                    unoptimized
                                                    className='max-h-48 max-w-full rounded-xl object-contain'
                                                  />
                                                  <span className='text-[10px] text-pw-cyan'>
                                                    Click image to view
                                                    fullscreen
                                                  </span>
                                                </button>
                                              );
                                            if (detectedType === 'video')
                                              return (
                                                <div className='flex w-full flex-col items-center gap-1 p-2'>
                                                  <video
                                                    src={previewUrl}
                                                    controls
                                                    playsInline
                                                    preload='metadata'
                                                    className='max-h-48 max-w-full rounded-xl object-contain'
                                                  />
                                                  {openButton}
                                                </div>
                                              );
                                            if (detectedType === 'audio')
                                              return (
                                                <div className='flex w-full flex-col items-center gap-2 p-2'>
                                                  <audio
                                                    src={previewUrl}
                                                    controls
                                                    preload='metadata'
                                                    className='w-full'
                                                  />
                                                  {openButton}
                                                </div>
                                              );
                                            return (
                                              <div className='flex w-full flex-wrap items-center justify-between gap-2 p-3'>
                                                <span className='flex min-w-0 items-center gap-2 truncate text-xs text-pw-text'>
                                                  <File className='h-4 w-4 shrink-0' />
                                                  {fileName ||
                                                    'Response attachment'}
                                                </span>
                                                {openButton}
                                              </div>
                                            );
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
                                      ans.correct === false &&
                                      Boolean(resolvedCorrect) && (
                                        <div className='flex items-start gap-1 pt-1 flex-wrap'>
                                          <p className='text-[10px] font-bold text-pw-success shrink-0'>
                                            CORRECT:
                                          </p>
                                          <p
                                            className={cn(
                                              'text-[11px] font-mono text-white/90',
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
                                  responsesTotalCount:
                                    page.totalCount ??
                                    current.responsesTotalCount,
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

export { seedTemplateStorageKey, generateQuizId, isExpired, computeExpiry };
