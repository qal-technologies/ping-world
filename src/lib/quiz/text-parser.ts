/**
 * Whitelisted HTML & Text Parsing Helper & Multi-Format Response Exporter
 * Retains exact line breaks (\n / CSS white-space: pre-wrap) and paragraph spacing.
 * Whitelists safe HTML tags (b, strong, i, em, code, pre, u, mark, a, sub, sup, br).
 * Strictly strips bare <p> and <span> tags while retaining their inner text.
 * Provides multi-format exports for Quiz Responses: CSV, JSON, and Formatted Text/Markdown.
 */

import { unpackPingWorldMediaUrl } from './quiz-piping';
import { tagTextExport } from '@/lib/pingworld-attribution';

const ALLOWED_TAGS_REGEX = /<\/?(b|strong|i|em|code|pre|u|mark|a|sub|sup|br)\b[^>]*>/gi;

/**
 * Strips unallowed HTML tags from text while preserving allowed formatting tags and line breaks.
 * Explicitly excludes <p> and <span> as requested.
 */
export function parseWhitelistedHtml(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // Protect allowed tags temporarily
  const tokens: string[] = [];
  sanitized = sanitized.replace(ALLOWED_TAGS_REGEX, (match) => {
    tokens.push(match);
    return `___PW_HTML_TOKEN_${tokens.length - 1}___`;
  });

  // Strip all other HTML tags (including bare p, span, script, iframe, etc.)
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');

  // Restore allowed tags
  sanitized = sanitized.replace(/___PW_HTML_TOKEN_(\d+)___/g, (_, idx) => tokens[parseInt(idx, 10)] || '');

  return sanitized;
}

/**
 * Cleans text for CSV exports: removes all HTML tags and eval code tokens while preserving exact plain-text parity.
 */
export function cleanTextForCSV(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/<[^>]*>?/gm, '') // Strip all HTML
    .replace(/@eval:\{[^}]*\}/gi, '') // Strip unparsed eval blocks
    .replace(/[\r\n]+/g, ' ') // Replace newlines with single space for clean CSV cells
    .trim();
}

/**
 * Resolves an answer value cleanly for export files, formatting attachments cleanly.
 */
export function formatAnswerForExport(
  answer: any,
  question?: any,
  exportType: 'csv' | 'json' | 'text' = 'csv',
): any {
  if (answer === undefined || answer === null) return '';

  // Check if answer is a tagged PingWorld media or Base64 DataURL
  if (typeof answer === 'string' && (answer.startsWith('pw_media_enc_v1::') || answer.startsWith('data:'))) {
    const unpacked = unpackPingWorldMediaUrl(answer);
    const fileName = unpacked.name || 'uploaded_attachment';
    const sizeKb = unpacked.size ? `${Math.round(unpacked.size / 1024)}KB` : '';
    const fileDesc = sizeKb ? `[Attachment: ${fileName} (${sizeKb})]` : `[Attachment: ${fileName}]`;

    if (exportType === 'json') {
      return {
        type: 'file_upload',
        fileName,
        fileSize: unpacked.size || 0,
        mimeType: unpacked.type || '',
        mediaUrl: unpacked.url,
      };
    }
    return fileDesc;
  }

  // If answer is an array
  if (Array.isArray(answer)) {
    if (question && question.options) {
      const resolved = answer.map((val) => {
        const found = question.options.find(
        (opt: any) => opt.id === val,
        );
        return cleanTextForCSV(found ? (found.text || String(found)) : String(val));
      });
      return exportType === 'json' ? resolved : resolved.join('; ');
    }
    return exportType === 'json' ? answer : answer.join('; ');
  }

  // If answer matches option ID
  if (question && question.options && typeof answer === 'string') {
    const found = question.options.find(
      (opt: any) => opt.id === answer,
    );
    if (found) {
      return cleanTextForCSV(found.text || String(found));
    }
  }

  return cleanTextForCSV(String(answer));
}

function responsePathQuestions(response: any, quiz: any) {
  const saved = response.pathQuestionSnapshots || response.userData?.pathQuestionSnapshots;
  if (Array.isArray(saved) && saved.length) return saved;
  const answerSnapshots = (response.answers || []).map((answer: any) => answer.questionSnapshot).filter(Boolean);
  if (answerSnapshots.length) return answerSnapshots;
  const ids = response.currentPathQuestionIds || response.userData?.currentPathQuestionIds;
  const questions = quiz.questions || [];
  return Array.isArray(ids) ? ids.map((id: string) => questions.find((question: any) => String(question.id) === String(id))).filter(Boolean) : questions;
}

/**
 * Exports quiz responses into standard RFC-4180 CSV with data parity.
 */
export function exportResponsesToCSV(quiz: any, responses: any[]): string {
  if (!responses || responses.length === 0) return '';

  const questionBySnapshot = new Map<string, any>();
  for (const question of quiz.questions || []) {
    questionBySnapshot.set(`${String(question.id)}\u0000${String(question.text ?? '')}`, question);
  }
  for (const response of responses) {
    for (const question of responsePathQuestions(response, quiz)) {
      questionBySnapshot.set(`${String(question.id)}\u0000${String(question.text ?? '')}`, question);
    }
  }
  const questions = [...questionBySnapshot.values()];
  const askDetails = quiz.askDetails || [];
  const isQuiz = quiz.type === 'quiz';
  const csvCell = (value: unknown) => {
    let text = String(value ?? '');
    // Neutralize spreadsheet formulas before applying RFC-4180 quoting.
    if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  // Headers
  const headers = [
    'Quiz ID',
    'Timestamp',
    ...(isQuiz ? ['Score', 'Total Questions', 'Attempted Questions', 'Score Possible', 'Percentage'] : ['Submission Status']),
    'Response Path JSON',
    ...askDetails.map((d: any) => cleanTextForCSV(d.title || d)),
    ...questions.map((q: any, idx: number) => `Q${idx + 1} [${q.id}]: ${cleanTextForCSV(q.text)}`),
  ];

  const rows = responses.map((r) => {
    const score = isQuiz ? (r.score ?? 0) : '';
    const total = r.totalQuestions ?? questions.length;
    const possible = r.scorePossible !== undefined ? Math.max(0, Number(r.scorePossible) || 0) : r.userData?.scorePossible !== undefined ? Math.max(0, Number(r.userData.scorePossible) || 0) : total;
    const pct = isQuiz ? (possible > 0 ? `${Math.round((Number(score) / possible) * 100)}%` : '0%') : '';

    const detailCols = askDetails.map((d: any) => {
      const key = (d.title || d).toLowerCase().replace(/\s+/g, '');
      const rawVal = r.userData ? (r.userData[key] || r.userData[d.title || d] || '') : '';
      return cleanTextForCSV(String(rawVal));
    });

    const responseQuestions = new Map(responsePathQuestions(r, quiz).map((q: any) => [`${String(q.id)}\u0000${String(q.text ?? '')}`, q]));
    const questionCols = questions.map((q: any) => {
      const questionInThisResponse = responseQuestions.get(`${String(q.id)}\u0000${String(q.text ?? '')}`);
      if (!questionInThisResponse) return '';
      const ansObj = (r.answers || []).find((a: any) => String(a.questionId) === String(q.id));
      if (ansObj?.questionSnapshot && String(ansObj.questionSnapshot.text ?? '') !== String(q.text ?? '')) return '';
      const val = ansObj ? formatAnswerForExport(ansObj.answer, q, 'csv') : '';
      const mediaUrl = typeof ansObj?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(ansObj.fileUrl).url || ansObj.fileUrl) : '';
      return `${String(val ?? '')}${mediaUrl ? ` [Media URL: ${mediaUrl}]` : ''}`;
    });

    return [
      quiz.id,
      r.timestamp || '',
      ...(isQuiz ? [score, total, r.answeredQuestions ?? r.userData?.answeredQuestions ?? (r.answers || []).filter((answer: any) => !answer.passed && answer.answer !== undefined && answer.answer !== '').length, possible, pct] : [r.submissionReason || 'completion']),
      JSON.stringify(responsePathQuestions(r, quiz).map((question: any) => {
        const answer = (r.answers || []).find((item: any) => String(item.questionId) === String(question.id));
        return { questionId: question.id, questionText: question.text, category: question.category || null, answer: answer ? formatAnswerForExport(answer.answer, question, 'json') : null, passed: Boolean(answer?.passed), isCorrect: answer?.correct ?? null, mediaUrl: typeof answer?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(answer.fileUrl).url || answer.fileUrl) : null };
      })),
      ...detailCols,
      ...questionCols,
    ].map(csvCell).join(',');
  });

  return tagTextExport([headers.map(csvCell).join(','), ...rows].join('\r\n'), 'csv');
}

/**
 * Exports quiz responses as structured JSON.
 */
export function exportResponsesToJSON(quiz: any, responses: any[]): string {
  const exportPayload = {
    quizId: quiz.id,
    quizTitle: cleanTextForCSV(quiz.title),
    assessmentType: quiz.type || 'quiz',
    exportedAt: new Date().toISOString(),
    totalResponses: responses.length,
    responses: responses.map((r, idx) => ({
      responseNumber: idx + 1,
      timestamp: r.timestamp,
      score: quiz.type === 'quiz' ? (r.score ?? 0) : null,
      responseId: r.id || null,
      totalQuestions: r.totalQuestions ?? quiz.questions?.length ?? 0,
      attemptedQuestions: r.answeredQuestions ?? r.userData?.answeredQuestions ?? (r.answers || []).filter((answer: any) => !answer.passed && answer.answer !== undefined && answer.answer !== '').length,
      scorePossible: r.scorePossible !== undefined ? Math.max(0, Number(r.scorePossible) || 0) : r.userData?.scorePossible !== undefined ? Math.max(0, Number(r.userData.scorePossible) || 0) : null,
      currentPathQuestionIds: r.currentPathQuestionIds || r.userData?.currentPathQuestionIds || (r.answers || []).map((answer: any) => answer.questionId),
      pathQuestions: responsePathQuestions(r, quiz).map((question: any) => {
        const ansObj = (r.answers || []).find((answer: any) => String(answer.questionId) === String(question.id));
        return {
          questionId: question.id,
          questionText: cleanTextForCSV(question.text),
          category: question.category || 'Independent',
          type: question.type || null,
          options: (question.options || []).map((option: any) => ({ id: option.id, text: cleanTextForCSV(option.text), explanation: option.explanation || null })),
          answer: ansObj ? formatAnswerForExport(ansObj.answer, question, 'json') : null,
          passed: Boolean(ansObj?.passed),
          isCorrect: ansObj?.correct ?? null,
          mediaUrl: typeof ansObj?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(ansObj.fileUrl).url || ansObj.fileUrl) : null,
        };
      }),
      percentage: quiz.type === 'quiz'
        ? (() => {
            const possible = r.scorePossible !== undefined ? Math.max(0, Number(r.scorePossible) || 0) : r.userData?.scorePossible !== undefined ? Math.max(0, Number(r.userData.scorePossible) || 0) : (r.totalQuestions || quiz.questions?.length || 0);
            return possible > 0 ? Math.round(((r.score ?? 0) / possible) * 100) : 0;
          })()
        : null,
      submissionReason: r.submissionReason || 'completion',
      country: r.country || null,
      continent: r.continent || null,
      userData: r.userData || {},
      categoryScores: quiz.type === 'quiz' ? (r.categoryScores || {}) : null,
      answers: (r.answers || []).map((ansObj: any) => {
        const q = ansObj.questionSnapshot || (quiz.questions || []).find((question: any) => question.id === ansObj.questionId) || {};
        return {
          questionId: ansObj.questionId,
          questionText: cleanTextForCSV(q.text),
          category: q.category || 'Independent',
          answer: ansObj ? formatAnswerForExport(ansObj.answer, q, 'json') : null,
          mediaUrl: typeof ansObj?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(ansObj.fileUrl).url || ansObj.fileUrl) : null,
          isCorrect: quiz.type === 'quiz' ? (ansObj?.correct ?? null) : null,
          passed: Boolean(ansObj?.passed),
          options: Array.isArray(q.options) ? q.options.map((option: any) => ({ id: option.id, text: cleanTextForCSV(option.text), explanation: option.explanation || null })) : [],
        };
      }),
    })),
  };

  return tagTextExport(JSON.stringify(exportPayload, null, 2), 'json');
}

/**
 * Exports quiz responses as clean Markdown / Plain Text.
 */
export function exportResponsesToText(quiz: any, responses: any[]): string {
  const lines: string[] = [];
  lines.push(`Assessment ID: ${quiz.id}`);
  lines.push(`# Responses for "${cleanTextForCSV(quiz.title)}"`);
  lines.push(`Exported on: ${new Date().toLocaleString()}`);
  lines.push(`Total Submissions: ${responses.length}`);
  lines.push('--------------------------------------------------\n');

  responses.forEach((r, idx) => {
    lines.push(`## Participant #${idx + 1}`);
    lines.push(`- Submission Date: ${r.timestamp || 'N/A'}`);
    if (quiz.type === 'quiz') {
      const possible = r.scorePossible ?? r.userData?.scorePossible ?? r.totalQuestions ?? 0;
      const attempted = r.answeredQuestions ?? r.userData?.answeredQuestions ?? (r.answers || []).filter((answer: any) => !answer.passed && answer.answer !== undefined && answer.answer !== '').length;
      lines.push(`- Score: ${r.score ?? 0} / ${possible} points`);
      lines.push(`- Questions: ${attempted} attempted / ${r.totalQuestions ?? 0} total`);
      lines.push(`- Submission reason: ${r.submissionReason || 'completion'}`);
    } else {
      lines.push(`- Submission: ${r.submissionReason || 'completion'}`);
    }
    if (r.userData && Object.keys(r.userData).length > 0) {
      lines.push('### Details:');
      Object.entries(r.userData).forEach(([k, v]) => {
        lines.push(`  * ${k}: ${v}`);
      });
    }

    lines.push('### Answers:');
    responsePathQuestions(r, quiz).forEach((q: any, qIdx: number) => {
      const ansObj = (r.answers || []).find((answer: any) => String(answer.questionId) === String(q.id));
      const formattedAns = ansObj ? (ansObj.passed ? '(Passed)' : formatAnswerForExport(ansObj.answer, q, 'text')) : '(Not answered)';
      const mediaUrl = typeof ansObj?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(ansObj.fileUrl).url || ansObj.fileUrl) : '';
      lines.push(`  ${qIdx + 1}. [${ansObj.questionId}] ${cleanTextForCSV(q.text)}`);
      lines.push(`     Answer: ${formattedAns}${mediaUrl ? `\n     Media URL: ${mediaUrl}` : ''}`);
      if (ansObj?.correct !== undefined) lines.push(`     Correct: ${ansObj.correct ? 'Yes' : 'No'}`);
    });
    lines.push('\n--------------------------------------------------\n');
  });

  return tagTextExport(lines.join('\n'), 'text');
}
