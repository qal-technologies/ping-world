/**
 * Whitelisted HTML & Text Parsing Helper & Multi-Format Response Exporter
 * Retains exact line breaks (\n / CSS white-space: pre-wrap) and paragraph spacing.
 * Whitelists safe HTML tags (b, strong, i, em, code, pre, u, mark, a, sub, sup, br).
 * Strictly strips bare <p> and <span> tags while retaining their inner text.
 * Provides multi-format exports for Quiz Responses: CSV, JSON, and Formatted Text/Markdown.
 */

import { unpackPingWorldMediaUrl } from './quiz-piping';

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

/**
 * Exports quiz responses into standard RFC-4180 CSV with data parity.
 */
export function exportResponsesToCSV(quiz: any, responses: any[]): string {
  if (!responses || responses.length === 0) return '';

  const questions = quiz.questions || [];
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
    ...(isQuiz ? ['Score', 'Total Questions', 'Percentage'] : ['Submission Status']),
    ...askDetails.map((d: any) => cleanTextForCSV(d.title || d)),
    ...questions.map((q: any, idx: number) => `Q${idx + 1}: ${cleanTextForCSV(q.text)}`),
  ];

  const rows = responses.map((r) => {
    const score = isQuiz ? (r.score ?? 0) : '';
    const total = r.totalQuestions ?? questions.length;
    const possible = r.userData?.scorePossible !== undefined ? Math.max(0, Number(r.userData.scorePossible) || 0) : total;
    const pct = isQuiz ? (possible > 0 ? `${Math.round((Number(score) / possible) * 100)}%` : '0%') : '';

    const detailCols = askDetails.map((d: any) => {
      const key = (d.title || d).toLowerCase().replace(/\s+/g, '');
      const rawVal = r.userData ? (r.userData[key] || r.userData[d.title || d] || '') : '';
      return cleanTextForCSV(String(rawVal));
    });

    const questionCols = questions.map((q: any) => {
      const ansObj = (r.answers || []).find((a: any) => a.questionId === q.id);
      const val = ansObj ? formatAnswerForExport(ansObj.answer, q, 'csv') : '';
      const mediaUrl = typeof ansObj?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(ansObj.fileUrl).url || ansObj.fileUrl) : '';
      return `${String(val ?? '')}${mediaUrl ? ` [Media URL: ${mediaUrl}]` : ''}`;
    });

    return [
      quiz.id,
      r.timestamp || '',
      ...(isQuiz ? [score, total, pct] : [r.submissionReason || 'completion']),
      ...detailCols,
      ...questionCols,
    ].map(csvCell).join(',');
  });

  return [headers.map(csvCell).join(','), ...rows].join('\r\n');
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
      totalQuestions: r.totalQuestions || quiz.questions?.length || 0,
      percentage: quiz.type === 'quiz'
        ? (() => {
            const possible = r.userData?.scorePossible !== undefined ? Math.max(0, Number(r.userData.scorePossible) || 0) : (r.totalQuestions || quiz.questions?.length || 0);
            return possible > 0 ? Math.round(((r.score ?? 0) / possible) * 100) : 0;
          })()
        : null,
      submissionReason: r.submissionReason || 'completion',
      country: r.country || null,
      continent: r.continent || null,
      userData: r.userData || {},
      categoryScores: quiz.type === 'quiz' ? (r.categoryScores || {}) : null,
      answers: (quiz.questions || []).map((q: any) => {
        const ansObj = (r.answers || []).find((a: any) => a.questionId === q.id);
        return {
          questionId: q.id,
          questionText: cleanTextForCSV(q.text),
          category: q.category || 'Independent',
          answer: ansObj ? formatAnswerForExport(ansObj.answer, q, 'json') : null,
          mediaUrl: typeof ansObj?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(ansObj.fileUrl).url || ansObj.fileUrl) : null,
          isCorrect: quiz.type === 'quiz' ? (ansObj?.correct ?? null) : null,
        };
      }),
    })),
  };

  return JSON.stringify(exportPayload, null, 2);
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
      lines.push(`- Score: ${r.score ?? 0} / ${r.totalQuestions || quiz.questions?.length || 0}`);
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
    (quiz.questions || []).forEach((q: any, qIdx: number) => {
      const ansObj = (r.answers || []).find((a: any) => a.questionId === q.id);
      const formattedAns = ansObj ? formatAnswerForExport(ansObj.answer, q, 'text') : '(No Answer)';
      const mediaUrl = typeof ansObj?.fileUrl === 'string' ? (unpackPingWorldMediaUrl(ansObj.fileUrl).url || ansObj.fileUrl) : '';
      lines.push(`  ${qIdx + 1}. [${q.id}] ${cleanTextForCSV(q.text)}`);
      lines.push(`     Answer: ${formattedAns}${mediaUrl ? `\n     Media URL: ${mediaUrl}` : ''}`);
    });
    lines.push('\n--------------------------------------------------\n');
  });

  return lines.join('\n');
}
