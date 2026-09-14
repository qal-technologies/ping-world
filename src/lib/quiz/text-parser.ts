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
        dataUrl: unpacked.url,
      };
    }
    return fileDesc;
  }

  // If answer is an array
  if (Array.isArray(answer)) {
    if (question && question.options) {
      const resolved = answer.map((val) => {
        const found = question.options.find(
          (opt: any, oIdx: number) =>
            opt.id === val || String(oIdx) === String(val) || opt.text === val,
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
      (opt: any, oIdx: number) =>
        opt.id === answer || String(oIdx) === String(answer) || opt.text === answer,
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

  // Headers
  const headers = [
    'Timestamp',
    'Score',
    'Total Questions',
    'Percentage',
    ...askDetails.map((d: any) => cleanTextForCSV(d.title || d)),
    ...questions.map((q: any, idx: number) => `"${q.id || `Q${idx + 1}`}: ${cleanTextForCSV(q.text).replace(/"/g, '""')}"`),
  ];

  const rows = responses.map((r) => {
    const score = r.score ?? 0;
    const total = r.totalQuestions ?? questions.length;
    const pct = total > 0 ? `${Math.round((score / total) * 100)}%` : '0%';

    const detailCols = askDetails.map((d: any) => {
      const key = (d.title || d).toLowerCase().replace(/\s+/g, '');
      const rawVal = r.userData ? (r.userData[key] || r.userData[d.title || d] || '') : '';
      return `"${cleanTextForCSV(String(rawVal)).replace(/"/g, '""')}"`;
    });

    const questionCols = questions.map((q: any) => {
      const ansObj = (r.answers || []).find((a: any) => a.questionId === q.id);
      const val = ansObj ? formatAnswerForExport(ansObj.answer, q, 'csv') : '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });

    return [
      `"${r.timestamp || new Date().toISOString()}"`,
      score,
      total,
      `"${pct}"`,
      ...detailCols,
      ...questionCols,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Exports quiz responses as structured JSON.
 */
export function exportResponsesToJSON(quiz: any, responses: any[]): string {
  const exportPayload = {
    quizId: quiz.id,
    quizTitle: cleanTextForCSV(quiz.title),
    exportedAt: new Date().toISOString(),
    totalResponses: responses.length,
    responses: responses.map((r, idx) => ({
      responseNumber: idx + 1,
      timestamp: r.timestamp,
      score: r.score,
      totalQuestions: r.totalQuestions || quiz.questions?.length || 0,
      userData: r.userData || {},
      categoryScores: r.categoryScores || {},
      answers: (quiz.questions || []).map((q: any) => {
        const ansObj = (r.answers || []).find((a: any) => a.questionId === q.id);
        return {
          questionId: q.id,
          questionText: cleanTextForCSV(q.text),
          category: q.category || 'Independent',
          answer: ansObj ? formatAnswerForExport(ansObj.answer, q, 'json') : null,
          isCorrect: ansObj?.correct ?? null,
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
  lines.push(`# Responses for "${cleanTextForCSV(quiz.title)}"`);
  lines.push(`Exported on: ${new Date().toLocaleString()}`);
  lines.push(`Total Submissions: ${responses.length}`);
  lines.push('--------------------------------------------------\n');

  responses.forEach((r, idx) => {
    lines.push(`## Participant #${idx + 1}`);
    lines.push(`- Submission Date: ${r.timestamp || 'N/A'}`);
    lines.push(`- Score: ${r.score} / ${r.totalQuestions || quiz.questions?.length || 0}`);
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
      lines.push(`  ${qIdx + 1}. [${q.id}] ${cleanTextForCSV(q.text)}`);
      lines.push(`     Answer: ${formattedAns}`);
    });
    lines.push('\n--------------------------------------------------\n');
  });

  return lines.join('\n');
}
