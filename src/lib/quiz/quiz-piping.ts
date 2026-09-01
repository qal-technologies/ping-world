/**
 * PingWorld Quiz & Survey Dynamic Mention / Piping Engine
 * Supports @q1, @q2, @ans_{id}, @cat_{name}_q{n}, @name, @email, @score, etc.
 */

export interface PipingContext {
  userData?: Record<string, any> | any[];
  userAnswers?: Array<{
    questionId: string;
    answer: any;
    correct?: boolean;
  }>;
  questions?: any[];
  score?: number;
  totalQuestions?: number;
}

export function resolvePipedText(
  rawText: string | null | undefined,
  context: PipingContext,
  sanitizeHtml = true,
  fallback = '',
): string {
  if (!rawText || typeof rawText !== 'string') return fallback;

  let result = rawText;

  // 1. Taker Details: @name, @email, @username, @phone, @firstname
  const user = context.userData || {};
  let nameVal = '';
  let emailVal = '';
  let userDetailFirst = '';

  if (Array.isArray(user)) {
    userDetailFirst = user[0] ? String(user[0]) : '';
    nameVal = userDetailFirst;
    emailVal = user[1] ? String(user[1]) : '';
  } else if (typeof user === 'object') {
    nameVal =
      user.name ||
      user.fullName ||
      user.pingAuthName ||
      user.username ||
      user[0] ||
      '';
    emailVal = user.email || user.pingAuthEmail || user[1] || '';
    if (!nameVal && !emailVal) {
      const firstVal = Object.values(user)[0];
      if (firstVal && typeof firstVal === 'string') userDetailFirst = firstVal;
    }
  }

  result = result.replace(/@name\b/gi, nameVal || userDetailFirst || 'Participant');
  result = result.replace(/@firstname\b/gi, (nameVal || userDetailFirst || 'Participant').split(' ')[0]);
  result = result.replace(/@email\b/gi, emailVal || 'your email');
  result = result.replace(/@username\b/gi, (!Array.isArray(user) ? (user as Record<string, any>).username : undefined) || nameVal || 'user');
  result = result.replace(/@phone\b/gi, (!Array.isArray(user) ? (user as Record<string, any>).phone : undefined) || 'phone');

  // 2. Score & Stats: @score, @total, @percentage
  const score = context.score ?? 0;
  const total = context.totalQuestions ?? (context.questions?.length || 0);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  result = result.replace(/@score\b/gi, String(score));
  result = result.replace(/@total\b/gi, String(total));
  result = result.replace(/@percentage\b/gi, `${pct}%`);

  // 3. Question Answers by Global Index: @q1, @q2, @q3, etc.
  const questions = context.questions || [];
  const answers = context.userAnswers || [];

  // Match @q1, @q2, etc.
  result = result.replace(/@q(\d+)\b/gi, (_match, p1) => {
    const qIndex = parseInt(p1, 10) - 1;
    if (qIndex >= 0 && qIndex < questions.length) {
      const q = questions[qIndex];
      const ansObj = answers.find((a) => a.questionId === q.id);
      if (ansObj && ansObj.answer !== undefined && ansObj.answer !== null) {
        return formatAnswerValue(ansObj.answer, q);
      }
    }
    return `[Question ${p1}]`;
  });

  // 4. Question Answers by Question ID: @ans_{questionId}
  result = result.replace(/@ans_([a-zA-Z0-9_-]+)\b/gi, (_match, qId) => {
    const ansObj = answers.find((a) => a.questionId === qId);
    const q = questions.find((quest) => quest.id === qId);
    if (ansObj && ansObj.answer !== undefined && ansObj.answer !== null) {
      return formatAnswerValue(ansObj.answer, q);
    }
    return `[Answer]`;
  });

  // 5. Question Answers by Category / Group Index: @cat_{catName}_q{n} or @group{gIdx}_q{n}
  result = result.replace(/@cat_([a-zA-Z0-9_]+)_q(\d+)\b/gi, (_match, catName, qNum) => {
    const cleanCat = catName.toLowerCase().replace(/_/g, ' ');
    const catQuestions = questions.filter(
      (q) => q.category && q.category.toLowerCase().trim() === cleanCat,
    );
    const qIdx = parseInt(qNum, 10) - 1;
    if (qIdx >= 0 && qIdx < catQuestions.length) {
      const q = catQuestions[qIdx];
      const ansObj = answers.find((a) => a.questionId === q.id);
      if (ansObj && ansObj.answer !== undefined && ansObj.answer !== null) {
        return formatAnswerValue(ansObj.answer, q);
      }
    }
    return `[${catName} Q${qNum}]`;
  });

  return result;
}

function formatAnswerValue(answer: any, question?: any): string {
  if (Array.isArray(answer)) {
    if (question && question.options) {
      const resolved = answer.map((val) => {
        const found = question.options.find(
          (opt: any, oIdx: number) =>
            opt.id === val || String(oIdx) === String(val) || opt.text === val,
        );
        return found ? (found.text || String(found)) : String(val);
      });
      return resolved.join(', ');
    }
    return answer.join(', ');
  }

  if (question && question.options && typeof answer === 'string') {
    const found = question.options.find(
      (opt: any, oIdx: number) =>
        opt.id === answer || String(oIdx) === String(answer) || opt.text === answer,
    );
    if (found) {
      return found.text || String(found);
    }
  }

  return String(answer);
}
