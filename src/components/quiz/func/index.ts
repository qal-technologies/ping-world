import type {Question} from "@/app/(main)/quiz";
import { decodeStoredCorrectAnswer as Decode } from '@/lib/quiz/quiz-evaluation';
import { resolvePipedText } from '@/lib/quiz/quiz-piping';

export function getAssessmentDeviceKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const keyName = 'pw_assessment_device_key_v1';
    const cookieName = 'pw_assessment_device_key_v1';
    const cookieKey = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    let key = cookieKey || localStorage.getItem(keyName);
    if (!key) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
    }
    localStorage.setItem(keyName, key);
    document.cookie = `${cookieName}=${key}; Path=/; Max-Age=31536000; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    return key;
  } catch {
    return '';
  }
}


export function getPrivateQuizAccessToken(quizId: string): string {
  try {
    return sessionStorage.getItem(`pw_private_quiz_access_v1_${quizId}`) || '';
  } catch {
    return '';
  }
}

export function normalizeOptionValue(question: Question, value: unknown): string {
  const raw =
    value && typeof value === 'object' && 'id' in (value as any) ?
      (value as any).id
    : value;
  const options = question.options || [];
  const byId = options.find(
    (option: any, index: number) => String(option?.id ?? index) === String(raw),
  );
  if (byId) return String((byId as any)?.id ?? raw);
  const index = Number(raw);
  return Number.isInteger(index) && options[index] ?
      String((options[index] as any)?.id ?? raw)
    : String(raw);
}

export function calculateQuizPoints(
  questions: Question[],
  answers: any[],
  correctKeys: Record<string, any>,
  pathIds: string[],
) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const answerIds = new Set(answers.map((answer) => String(answer.questionId)));
  let earned = 0;
  let possible = 0;
  const addPossibleForQuestion = (question: Question, answer?: any) => {
    const answered = isAnswerAttempted(answer);
    // Upload questions are completion checks for now: a supplied file is a
    // correct response worth one question point, independent of an answer key.
    if (question.type === 'upload') {
      possible += 1;
      if (answered && (answer?.fileUrl || answer?.answer)) {
        if (answer?.correct !== false) earned += 1;
      }
      return;
    }
    const decoded = decodeStoredCorrectAnswer(correctKeys[question.id]);
    const hasCorrectKey = !(
      decoded === null ||
      decoded === undefined ||
      decoded === '' ||
      (Array.isArray(decoded) && decoded.length === 0)
    );
    if (!hasCorrectKey) {
      // A skipped question is still a possible point in the reached path.
      // It earns only when a real answer was supplied; keyless answers receive
      // credit because there is no configured answer to compare against.
      possible += 1;
      if (answered) earned += 1;
      return;
    }
    const options = question.options || [];
    const normalizeId = (value: unknown) => {
      const byId = options.find(
        (option: any, index: number) =>
          String(option?.id ?? index) === String(value),
      );
      if (byId) return (byId as any)?.id ?? value;
      const index = Number(value);
      return Number.isInteger(index) && options[index] ?
          ((options[index] as any)?.id ?? value)
        : value;
    };
    const normalized =
      Array.isArray(decoded) ? decoded.map(normalizeId) : normalizeId(decoded);
    const ids = (Array.isArray(normalized) ? normalized : [normalized]).map(
      String,
    );
    const custom = options.some(
      (option: any) =>
        option?.scoreWeight !== undefined &&
        option?.scoreWeight !== null &&
        option?.scoreWeight !== '' &&
        Number.isFinite(Number(option.scoreWeight)) &&
        Number(option.scoreWeight) >= 0,
    );
    const weightFor = (id: unknown) => {
      const option = options.find(
        (item: any, index: number) =>
          String(item?.id ?? index) === String(id) ||
          String(index) === String(id),
      );
      const weight = Number(option?.scoreWeight);
      return Number.isFinite(weight) && weight >= 0 ? weight : 1;
    };
    if (question.type === 'input') {
      possible += 1;
      if (answered && answer?.correct === true) earned += 1;
      return;
    }
    if (question.type === 'checkbox' && !custom) {
      possible += 1;
      if (answered && answer?.correct === true) earned += 1;
      return;
    }
    if (question.type === 'checkbox') {
      possible += ids.reduce((sum, id) => sum + weightFor(id), 0);
      const selected = Array.isArray(answer?.answer) ? answer.answer : [];
      if (answered) earned += selected.reduce(
        (sum: number, id: unknown) =>
          ids.includes(String(id)) ? sum + weightFor(id) : sum,
        0,
      );
      return;
    }
    const points = custom ? weightFor(normalized) : 1;
    possible += points;
    if (answered && answer?.correct === true) earned += points;
  };
  for (const answer of answers) {
    const question = byId.get(String(answer.questionId));
    if (question) addPossibleForQuestion(question, answer);
  }
  for (const id of pathIds) {
    if (answerIds.has(String(id))) continue;
    const question = byId.get(String(id));
    if (question) addPossibleForQuestion(question);
  }
  return { earned, possible };
}

export function keepAnswerRevision(previous: any, next: any) {
  if (!previous) return next;
  const history =
    Array.isArray(previous.answerHistory) ? [...previous.answerHistory] : [];
  const priorValue = {
    answer: previous.answer,
    fileName: previous.fileName,
    fileUrl: previous.fileUrl,
    fileType: previous.fileType,
    correct: previous.correct,
    recordedAt:
      previous.updatedAt || previous.recordedAt || new Date().toISOString(),
  };
  const normalize = (value: any) => {
    if (Array.isArray(value))
      return JSON.stringify([...value].map(String).sort());
    if (value && typeof value === 'object')
      return JSON.stringify(value, Object.keys(value).sort());
    return String(value ?? '').trim();
  };
  const sameAnswer =
    normalize(previous.answer) === normalize(next.answer) &&
    String(previous.fileUrl || '') === String(next.fileUrl || '') &&
    String(previous.fileName || '') === String(next.fileName || '');
  if (!sameAnswer && (priorValue.answer !== undefined || priorValue.fileUrl)) {
    // Keep a bounded history. A question can be revisited often, and an upload
    // data URL in every revision would otherwise exceed attempt snapshot limits.
    if (
      typeof priorValue.fileUrl === 'string' &&
      priorValue.fileUrl.startsWith('data:')
    ) {
      priorValue.fileUrl = '';
      priorValue.fileName = priorValue.fileName || 'Previous uploaded file';
    }
    history.push(priorValue);
    if (history.length > 5) history.splice(0, history.length - 5);
  }
  return {
    ...next,
    ...(history.length ? { answerHistory: history } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export function isAnswerAttempted(answer: any): boolean {
  if (!answer || answer.passed) return false;
  if (answer.fileUrl) return true;
  const value = answer.answer;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return typeof value === 'number' || typeof value === 'boolean';
}

export function formatAnswerRevision(value: any, question: Question): string {
  if (value?.fileName) return String(value.fileName);
  const values = Array.isArray(value?.answer) ? value.answer : [value?.answer];
  const options = question.options || [];
  return values
    .map((item: any) => {
      const option = options.find(
        (candidate: any, index: number) =>
          String(candidate?.id ?? index) === String(item) ||
          String(index) === String(item),
      );
      return String(option?.text ?? item ?? 'No answer');
    })
    .filter(Boolean)
    .join(', ');
}

export function describeAcceptedFiles(accept = '') {
  const value = accept.toLowerCase();
  const labels = [
    value.includes('image') || /\.(png|jpe?g|gif|webp|svg|avif)/.test(value) ?
      'images'
    : '',
    value.includes('video') || /\.(mp4|mov|webm|mkv)/.test(value) ?
      'videos'
    : '',
    value.includes('audio') || /\.(mp3|wav|m4a|ogg|aac)/.test(value) ?
      'audio'
    : '',
    /\.(pdf|docx?|txt|rtf|odt)/.test(value) || value.includes('pdf') ?
      'documents'
    : '',
    /\.(zip|7z|rar)/.test(value) ? 'archives' : '',
  ].filter(Boolean);
  return labels.length ? labels.join(', ') : accept || 'supported files';
}

export function decodeStoredCorrectAnswer(value: unknown): unknown {
  return Decode(value);
}

export function calculateCategoryScores(
  questions: Question[],
  answers: any[],
): Record<string, { correct: number; total: number }> {
  if (!questions || !answers || answers.length === 0) return {};
  const catStats: Record<string, { correct: number; total: number }> = {};
  const qMap = new Map(questions.map((quest) => [quest.id, quest]));

  answers.forEach((ans) => {
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
}

export function evaluateQuizAnswer({
  question,
  answer,
  correctKey,
  isSurvey = false,
  context,
}: {
  question?: Question | null;
  answer: any;
  correctKey: any;
  isSurvey?: boolean;
  context?: {
    userData?: Record<string, string>;
    userAnswers?: any[];
    questions?: Question[];
    score?: number;
    totalQuestions?: number;
  };
}): boolean | undefined {
  if (isSurvey || !question) return false;
  if (question.type === 'upload') return true;

  const decodedCorrect = decodeStoredCorrectAnswer(correctKey);
  if (
    decodedCorrect === null ||
    decodedCorrect === undefined ||
    decodedCorrect === '' ||
    (Array.isArray(decodedCorrect) && decodedCorrect.length === 0)
  ) {
    // Questions without an answer key are informational/passable: an actual
    // submitted answer receives credit, while a passed item stays neutral.
    return (
        answer !== undefined &&
          answer !== null &&
          answer !== '' &&
          !(Array.isArray(answer) && answer.length === 0)
      ) ?
        true
      : undefined;
  }

  if (question.type === 'checkbox') {
    const correctIds = (
      Array.isArray(decodedCorrect) ? decodedCorrect : [decodedCorrect]
    ).map((value: unknown) => normalizeOptionValue(question, value));
    const selectedIds = (Array.isArray(answer) ? answer : []).map(
      (value: unknown) => normalizeOptionValue(question, value),
    );
    return (
      selectedIds.length === correctIds.length &&
      selectedIds.every((value) => correctIds.includes(value))
    );
  } else if (question.type === 'input') {
    const userAns = String(answer || '').trim();

    const targetAns = String(
      resolvePipedText(
        JSON.stringify(decodedCorrect),
        context || {},
        false,
        String(decodedCorrect),
      ).trim(),
    ).trim();
    return question.caseSensitive ?
        userAns === targetAns
      : userAns.toLowerCase() === targetAns.toLowerCase();
  } else if (question.type === 'true_false') {
    return (
      String(answer).toLowerCase() === String(decodedCorrect).toLowerCase()
    );
  }
  return (
    normalizeOptionValue(question, answer) ===
    normalizeOptionValue(question, decodedCorrect)
  );
}

export function hasActiveBranching(questions: Question[]): boolean {
  if (!Array.isArray(questions)) return false;
  return questions.some(
    (q) =>
      Boolean(q.skipTo) ||
      Boolean(q.skipToCat) ||
      (Array.isArray(q.inputBranchRules) && q.inputBranchRules.length > 0) ||
      (Array.isArray(q.options) &&
        q.options.some(
          (o: any) =>
            typeof o === 'object' && Boolean(o?.skipTo || o?.skipToCat),
        )),
  );
}

export function computeQuizExpiry(daysUntilExpiry: number): string {
  const capped = Math.min(Math.max(daysUntilExpiry, 1), 3);
  const d = new Date();
  d.setDate(d.getDate() + capped);
  return d.toISOString();
}

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

export const isExpired = async (quiz: {
  expires_at?: string;
}): Promise<boolean> => {
  const now = Date.now();
  if (quiz.expires_at) {
    const expiresAt = new Date(quiz.expires_at).getTime();
    return expiresAt < now;
  }
  return false;
};

export const generateQuizId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

export const seedTemplateStorageKey = (): string => `pw_quiz_template_v1`;