/**
 * PingWorld Quiz & Survey Dynamic Mention, Piping & Evaluation Engine (@eval)
 * Supports:
 *  - Quoted string literals ('text', "text") vs unquoted keywords/tokens
 *  - Media encryption envelope tagging: packPingWorldMediaUrl and unpackPingWorldMediaUrl
 *  - Escape characters (\) e.g., \@name or \@eval:{...}
 *  - Dynamic nested mentions: e.g. @cat_:(@Gender)_q1 -> @cat_male_q1 -> answer
 *  - Dynamic detail keys: e.g. @FullName, @Gender, @q1, @ans_{id}, @cat_{name}_q{n}
 *  - Logic evaluation expressions:
 *      @eval:{@FullName || "User"}
 *      @eval:{@Gender = 'male' @show:("man") : @show:("female")}
 *      @eval:{@q1 MATCH "JS" @show:("Passed") : @show:("Failed")}
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

/* ─────────────────────────── Media Tagging & Encryption ─────────────────────────── */

const PW_MEDIA_PREFIX = 'pw_media_enc_v1::';
const PW_MEDIA_SUFFIX = '::pw_tag_end';

/**
 * Encrypts / tags a Base64 text data URL with PingWorld verification tags and optional metadata.
 */
export function packPingWorldMediaUrl(
  rawUrl: string,
  meta?: { name?: string; size?: number; type?: string },
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  // If already packed, return as is
  if (rawUrl.startsWith(PW_MEDIA_PREFIX)) return rawUrl;

  const header = {
    t: Date.now(),
    n: meta?.name || 'attachment',
    s: meta?.size || 0,
    m: meta?.type || 'application/octet-stream',
  };

  const encodedHeader = btoa(JSON.stringify(header));
  return `${PW_MEDIA_PREFIX}${encodedHeader}::${rawUrl}${PW_MEDIA_SUFFIX}`;
}

/**
 * Decrypts / unpacks a PingWorld tagged media URL back to its pure data URL with metadata.
 */
export function unpackPingWorldMediaUrl(taggedUrl: string | null | undefined): {
  url: string;
  name?: string;
  size?: number;
  type?: string;
  isPingWorldTagged: boolean;
} {
  if (!taggedUrl || typeof taggedUrl !== 'string') {
    return { url: '', isPingWorldTagged: false };
  }

  if (taggedUrl.startsWith(PW_MEDIA_PREFIX) && taggedUrl.endsWith(PW_MEDIA_SUFFIX)) {
    try {
      const stripped = taggedUrl
        .slice(PW_MEDIA_PREFIX.length, -PW_MEDIA_SUFFIX.length);
      const firstCol = stripped.indexOf('::');
      if (firstCol !== -1) {
        const headerB64 = stripped.substring(0, firstCol);
        const dataUrl = stripped.substring(firstCol + 2);
        const meta = JSON.parse(atob(headerB64));
        return {
          url: dataUrl,
          name: meta.n,
          size: meta.s,
          type: meta.m,
          isPingWorldTagged: true,
        };
      }
    } catch {
      // Fallback if parsing fails
    }
  }

  return {
    url: taggedUrl,
    isPingWorldTagged: false,
  };
}

/* ─────────────────────────── Date & DOB Helpers ─────────────────────────── */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getOrdinalDay(day: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  return day + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Formats a date string (e.g. YYYY-MM-DD) into natural language words: "2nd of March, 2005"
 */
export function formatDobToWords(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  const parts = trimmed.split(/[-/T\s]/);
  let y = 0, m = 0, d = 0;

  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else if (parts[2].length === 4) {
      // DD/MM/YYYY or MM/DD/YYYY
      y = parseInt(parts[2], 10);
      m = parseInt(parts[0], 10) - 1;
      d = parseInt(parts[1], 10);
    }
  }

  if (!y || isNaN(y) || isNaN(m) || isNaN(d) || m < 0 || m > 11 || d < 1 || d > 31) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      y = parsed.getFullYear();
      m = parsed.getMonth();
      d = parsed.getDate();
    } else {
      return trimmed;
    }
  }

  return `${getOrdinalDay(d)} of ${MONTH_NAMES[m]}, ${y}`;
}

/**
 * Extracts a specific getter from a date string: age, month, year, day
 */
export function getDobGetter(dateStr: string | null | undefined, getter: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  let y = 0, m = 0, d = 0;

  const parts = trimmed.split(/[-/T\s]/);
  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else if (parts[2].length === 4) {
      y = parseInt(parts[2], 10);
      m = parseInt(parts[0], 10) - 1;
      d = parseInt(parts[1], 10);
    }
  }

  if (!y || isNaN(y)) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      y = parsed.getFullYear();
      m = parsed.getMonth();
      d = parsed.getDate();
    } else {
      return trimmed;
    }
  }

  const g = getter.toLowerCase().trim();
  if (g === 'age') {
    const today = new Date();
    let age = today.getFullYear() - y;
    const mDiff = today.getMonth() - m;
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
      age--;
    }
    return String(Math.max(0, age));
  }
  if (g === 'month') {
    return MONTH_NAMES[m] || '';
  }
  if (g === 'year') {
    return String(y);
  }
  if (g === 'day') {
    return getOrdinalDay(d);
  }

  return formatDobToWords(dateStr);
}

/* ─────────────────────────── Piping & Resolvers ─────────────────────────── */

export function resolvePipedText(
  rawText: string | null | undefined,
  context: PipingContext,
  _sanitizeHtml = true,
  fallback = '',
): string {
  if (!rawText || typeof rawText !== 'string') return fallback;

  let text = rawText;

  // Protect escaped syntax markers: prefix escape starting from @ (e.g. \@ or @\)
  const ESCAPE_TOKEN = '___PW_ESC_AT___';
  text = text.replace(/\\@/g, ESCAPE_TOKEN).replace(/@\\/g, ESCAPE_TOKEN);

  // Phase 1: Dynamic nested parentheses mentions e.g. @cat_:(@Gender)_q1 -> @cat_male_q1
  text = resolveNestedPiping(text, context);

  // Phase 2: Resolve standard piping tokens (@name, @q1, @cat_x_q1, @DetailName, @DOB:getters)
  text = resolveStandardTokens(text, context);

  // Phase 3: Evaluate @eval:{...} expressions
  text = resolveEvalExpressions(text, context);

  // Restore escaped @ symbols as literal @ without replacing with data
  text = text.replace(new RegExp(ESCAPE_TOKEN, 'g'), '@');

  return text;
}

/**
 * Resolves sub-piping within parentheses inside piping tokens like `@cat_:(@Gender)_q1`
 */
function resolveNestedPiping(text: string, context: PipingContext): string {
  return text.replace(/@cat_:\((@[a-zA-Z0-9_]+)\)(_[a-zA-Z0-9_]+)?/gi, (_match, innerToken, suffix = '') => {
    const resolvedInner = resolveStandardTokens(innerToken, context).toLowerCase().replace(/\s+/g, '_');
    const targetToken = `@cat_${resolvedInner}${suffix}`;
    return resolveStandardTokens(targetToken, context);
  });
}

/**
 * Strips quotes if present: 'hello' -> hello, "world" -> world
 */
function stripQuotes(str: string): string {
  const trimmed = str.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Evaluates an operand:
 * - If wrapped in single or double quotes, it's a literal text string.
 * - If not in quotes, it is treated as a token or keyword (e.g. @Gender, male, true).
 * - If not a recognized keyword or token, it is returned as plain text.
 */
function evaluateOperand(rawOperand: string, context: PipingContext): string {
  const trimmed = rawOperand.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return stripQuotes(trimmed);
  }

  // Token operand
  if (trimmed.startsWith('@')) {
    return resolveStandardTokens(trimmed, context);
  }

  return trimmed;
}

/**
 * Resolves @eval:{...} logical expressions.
 * Follows PingWorld syntax rules:
 * - Text enclosed in single/double quotes is treated as literal text.
 * - Anything outside quotes is treated as a token, keyword, or operator.
 * - Supports fallback coalesce: @eval:{@Token || 'Default'}
 * - Supports ternary @show pattern: @eval:{Condition @show:(TrueText) : @show:(FalseText)}
 * - Supports ternary JS pattern: @eval:{Condition ? 'TrueText' : 'FalseText'}
 * - Supports arithmetic expressions: @eval:{20 + 30 * 2}
 */
export function resolveEvalExpressions(text: string, context: PipingContext): string {
  return text.replace(/@eval:\{([^}]+)\}/gi, (_fullMatch, exprContent) => {
    try {
      const trimmed = exprContent.trim();

      // 1. Fallback / Coalesce pattern: @eval:{@Token || 'Default'}
      if (trimmed.includes('||') && !trimmed.includes('@show:') && !trimmed.includes('?')) {
        const parts = trimmed.split('||');
        for (const part of parts) {
          const evaluated = evaluateOperand(part.trim(), context);
          if (evaluated && evaluated !== '' && !evaluated.startsWith('@')) {
            return evaluated;
          }
        }
        return '';
      }

      // 2. Conditional @show pattern: @eval:{Condition @show:(...) : @show:(...)}
      const showMatch = trimmed.match(/^(.+?)\s+@show:\((.+?)\)(?:\s*:\s*@show:\((.+?)\))?$/i);
      if (showMatch) {
        const conditionPart = showMatch[1].trim();
        const trueResultRaw = showMatch[2].trim();
        const falseResultRaw = (showMatch[3] || '').trim();

        const conditionPassed = evaluateCondition(conditionPart, context);
        return conditionPassed
          ? evaluateOperand(trueResultRaw, context)
          : evaluateOperand(falseResultRaw, context);
      }

      // 3. Conditional ternary pattern: @eval:{Condition ? 'TrueVal' : 'FalseVal'}
      const ternaryMatch = trimmed.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
      if (ternaryMatch) {
        const conditionPart = ternaryMatch[1].trim();
        const trueVal = ternaryMatch[2].trim();
        const falseVal = ternaryMatch[3].trim();

        const conditionPassed = evaluateCondition(conditionPart, context);
        return conditionPassed
          ? evaluateOperand(trueVal, context)
          : evaluateOperand(falseVal, context);
      }

      // 4. Arithmetic evaluation if expression contains only digits and math operators
      const resolvedOperands = trimmed.replace(/@[a-zA-Z0-9_:]+/g, (tok: string) => {
        const val = evaluateOperand(tok, context);
        const num = parseFloat(val);
        return !isNaN(num) ? String(num) : `"${val}"`;
      });

      if (/^[\d\s+\-*/%().]+$/.test(resolvedOperands)) {
        try {
          const mathResult = Function(`'use strict'; return (${resolvedOperands})`)();
          if (typeof mathResult === 'number' && !isNaN(mathResult)) {
            return Number.isInteger(mathResult) ? String(mathResult) : String(Math.round(mathResult * 100) / 100);
          }
        } catch {
          // fallback
        }
      }

      // 5. Fallback: evaluate as simple operand
      return evaluateOperand(trimmed, context);
    } catch {
      return '';
    }
  });
}

/**
 * Standard token resolver
 */
export function resolveStandardTokens(text: string, context: PipingContext): string {
  let result = text;
  const user = context.userData || {};

  // 1. Participant Details from userData object or array
  const detailsMap: Record<string, string> = {};
  const rawDatesMap: Record<string, string> = {};

  const isDobKey = (k: string) => {
    const clean = k.toLowerCase().replace(/[\s_-]+/g, '');
    return clean === 'dob' || clean === 'dateofbirth' || clean === 'birthdate' || clean === 'birthday';
  };

  if (Array.isArray(user)) {
    detailsMap['name'] = user[0] ? String(user[0]) : '';
    detailsMap['email'] = user[1] ? String(user[1]) : '';
    detailsMap['fullname'] = detailsMap['name'];
  } else if (typeof user === 'object' && user !== null) {
    Object.entries(user).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        const valStr = String(v);
        const lowerKey = k.toLowerCase();
        const compactKey = lowerKey.replace(/\s+/g, '');
        
        if (isDobKey(k)) {
          // If detail is a DOB/birthday, store formatted words as default value
          const words = formatDobToWords(valStr);
          detailsMap[lowerKey] = words;
          detailsMap[compactKey] = words;
          rawDatesMap[lowerKey] = valStr;
          rawDatesMap[compactKey] = valStr;
        } else {
          detailsMap[lowerKey] = valStr;
          detailsMap[compactKey] = valStr;
        }
      }
    });
  }

  // Pre-fill defaults
  const nameVal = detailsMap['fullname'] || detailsMap['full name'] || detailsMap['name'] || detailsMap['username'] || 'Participant';
  const emailVal = detailsMap['email'] || 'your email';
  const phoneVal = detailsMap['phone'] || detailsMap['tel'] || 'phone';
  const usernameVal = detailsMap['username'] || nameVal;

  result = result.replace(/@name\b/gi, nameVal);
  result = result.replace(/@firstname\b/gi, nameVal.split(' ')[0] || nameVal);
  result = result.replace(/@fullname\b/gi, nameVal);
  result = result.replace(/@full\s+name\b/gi, nameVal);
  result = result.replace(/@email\b/gi, emailVal);
  result = result.replace(/@username\b/gi, usernameVal);
  result = result.replace(/@phone\b/gi, phoneVal);

  // 1b. Date of Birth / Date with getters: e.g. @DOB:age, @DOB:month, @DOB:year, @DOB:day, or @Date of Birth:age
  result = result.replace(/@([a-zA-Z0-9_\s]+):(age|month|year|day)\b/gi, (fullMatch, detailName, getter) => {
    const cleanName = detailName.toLowerCase().replace(/\s+/g, '');
    const dateVal =
      rawDatesMap[cleanName] ||
      rawDatesMap['dob'] ||
      rawDatesMap['dateofbirth'] ||
      rawDatesMap['birthdate'] ||
      rawDatesMap['birthday'] ||
      detailsMap[cleanName];
    if (dateVal) {
      return getDobGetter(dateVal, getter);
    }
    return fullMatch;
  });

  // 1c. Date of Birth in normal words: e.g. @DOB -> "2nd of March, 2005"
  result = result.replace(/@(dob|dateofbirth|birthdate|birthday|date\s+of\s+birth)\b/gi, (fullMatch, token) => {
    const cleanToken = token.toLowerCase().replace(/\s+/g, '');
    const dateVal =
      rawDatesMap[cleanToken] ||
      rawDatesMap['dob'] ||
      rawDatesMap['dateofbirth'] ||
      rawDatesMap['birthdate'] ||
      rawDatesMap['birthday'] ||
      detailsMap[cleanToken];
    if (dateVal) {
      return formatDobToWords(dateVal);
    }
    return fullMatch;
  });

  // Replace custom detail variables e.g. @FullName, @Gender, @Age
  Object.keys(detailsMap).forEach((key) => {
    const val = detailsMap[key];
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`@${escapedKey}\\b`, 'gi');
    result = result.replace(regex, val);
  });

  // 2. Score & Stats: @score, @total, @percentage
  const score = context.score ?? 0;
  const total = context.totalQuestions ?? (context.questions?.length || 0);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  result = result.replace(/@score\b/gi, String(score));
  result = result.replace(/@total\b/gi, String(total));
  result = result.replace(/@percentage\b/gi, `${pct}%`);

  // 3. Question Answers by Global Index: @q1, @q2, etc.
  const questions = context.questions || [];
  const answers = context.userAnswers || [];

  result = result.replace(/@q(\d+)\b/gi, (_match, p1) => {
    const qIndex = parseInt(p1, 10) - 1;
    // Check by matching ID first or index
    let q = questions.find((quest) => quest.id === `q${p1}`);
    if (!q && qIndex >= 0 && qIndex < questions.length) {
      q = questions[qIndex];
    }
    if (q) {
      const ansObj = answers.find((a) => a.questionId === q?.id);
      if (ansObj && ansObj.answer !== undefined && ansObj.answer !== null) {
        return formatAnswerValue(ansObj.answer, q);
      }
    }
    return `[Q${p1}]`;
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

  // 5. Question Answers by Category / Group Index: @cat_{catName}_q{n}
  result = result.replace(/@cat_([a-zA-Z0-9_]+)_q(\d+)\b/gi, (_match, catName, qNum) => {
    const cleanCat = catName.toLowerCase().replace(/_/g, ' ');
    // Match exact ID e.g. cat_math_q1
    const exactId = `cat_${catName.toLowerCase()}_q${qNum}`;
    let q = questions.find((quest) => quest.id?.toLowerCase() === exactId);

    if (!q) {
      const catQuestions = questions.filter(
        (quest) => quest.category && quest.category.toLowerCase().trim() === cleanCat,
      );
      const qIdx = parseInt(qNum, 10) - 1;
      if (qIdx >= 0 && qIdx < catQuestions.length) {
        q = catQuestions[qIdx];
      }
    }

    if (q) {
      const ansObj = answers.find((a) => a.questionId === q?.id);
      if (ansObj && ansObj.answer !== undefined && ansObj.answer !== null) {
        return formatAnswerValue(ansObj.answer, q);
      }
    }

    return `[${catName} Q${qNum}]`;
  });

  return result;
}


/**
 * Evaluates binary expressions with operators: =, !=, MATCH
 */
function evaluateCondition(condStr: string, context: PipingContext): boolean {
  // Operator: MATCH
  if (/\bMATCH\b/i.test(condStr)) {
    const parts = condStr.split(/\bMATCH\b/i);
    const left = stripQuotes(evaluateOperand(parts[0].trim(), context)).toLowerCase();
    const right = stripQuotes(evaluateOperand(parts[1].trim(), context)).toLowerCase();
    return left.includes(right);
  }

  // Operator: != or !==
  if (condStr.includes('!=') || condStr.includes('!==')) {
    const parts = condStr.includes('!==') ? condStr.split('!==') : condStr.split('!=');
    const left = stripQuotes(evaluateOperand(parts[0].trim(), context)).toLowerCase();
    const right = stripQuotes(evaluateOperand(parts[1].trim(), context)).toLowerCase();
    return left !== right;
  }

  // Operator: >=
  if (condStr.includes('>=')) {
    const parts = condStr.split('>=');
    const left = parseFloat(stripQuotes(evaluateOperand(parts[0].trim(), context)));
    const right = parseFloat(stripQuotes(evaluateOperand(parts[1].trim(), context)));
    if (!isNaN(left) && !isNaN(right)) return left >= right;
  }

  // Operator: <=
  if (condStr.includes('<=')) {
    const parts = condStr.split('<=');
    const left = parseFloat(stripQuotes(evaluateOperand(parts[0].trim(), context)));
    const right = parseFloat(stripQuotes(evaluateOperand(parts[1].trim(), context)));
    if (!isNaN(left) && !isNaN(right)) return left <= right;
  }

  // Operator: >
  if (condStr.includes('>')) {
    const parts = condStr.split('>');
    const left = parseFloat(stripQuotes(evaluateOperand(parts[0].trim(), context)));
    const right = parseFloat(stripQuotes(evaluateOperand(parts[1].trim(), context)));
    if (!isNaN(left) && !isNaN(right)) return left > right;
  }

  // Operator: <
  if (condStr.includes('<')) {
    const parts = condStr.split('<');
    const left = parseFloat(stripQuotes(evaluateOperand(parts[0].trim(), context)));
    const right = parseFloat(stripQuotes(evaluateOperand(parts[1].trim(), context)));
    if (!isNaN(left) && !isNaN(right)) return left < right;
  }

  // Operator: === or == or =
  if (condStr.includes('===') || condStr.includes('==') || condStr.includes('=')) {
    const sep = condStr.includes('===') ? '===' : condStr.includes('==') ? '==' : '=';
    const parts = condStr.split(sep);
    const left = stripQuotes(evaluateOperand(parts[0].trim(), context)).toLowerCase();
    const right = stripQuotes(evaluateOperand(parts[1].trim(), context)).toLowerCase();
    return left === right;
  }

  // Fallback truthiness
  const evaluatedStr = stripQuotes(evaluateOperand(condStr, context)).trim();
  return Boolean(evaluatedStr && evaluatedStr.toLowerCase() !== 'false' && evaluatedStr !== '0');
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

/**
 * Extracts and categorizes active PingKey tokens in a text for UI syntax indicators.
 */
export function detectPingKeys(text: string | null | undefined): Array<{
  token: string;
  type: 'eval' | 'mention' | 'question' | 'detail';
}> {
  if (!text || typeof text !== 'string') return [];

  // Strip escaped tokens (\@token or @\token) so they aren't marked as active pingkeys
  const unescapedText = text.replace(/\\@[a-zA-Z0-9_:{}\s-]+/g, '').replace(/@\\[a-zA-Z0-9_:{}\s-]+/g, '');

  const found: Array<{ token: string; type: 'eval' | 'mention' | 'question' | 'detail' }> = [];
  const seen = new Set<string>();

  // 1. Detect @eval:{...}
  const evalMatches = unescapedText.match(/@eval:\{[^}]+\}/gi);
  if (evalMatches) {
    evalMatches.forEach((m) => {
      if (!seen.has(m)) {
        seen.add(m);
        found.push({ token: m, type: 'eval' });
      }
    });
  }

  // 2. Detect @q[n] or @cat_[name]_q[n] or @ans_[id]
  const qMatches = unescapedText.match(/@(q\d+|cat_[a-zA-Z0-9_]+_q\d+|ans_[a-zA-Z0-9_-]+)\b/gi);
  if (qMatches) {
    qMatches.forEach((m) => {
      if (!seen.has(m)) {
        seen.add(m);
        found.push({ token: m, type: 'question' });
      }
    });
  }

  // 3. Detect participant detail tokens @name, @FullName, @Gender, @DOB, etc.
  const detailMatches = unescapedText.match(/@(name|firstname|fullname|gender|email|phone|username|score|total|percentage|dob|dateofbirth|birthdate|birthday)(:(age|month|year|day))?\b/gi);
  if (detailMatches) {
    detailMatches.forEach((m) => {
      if (!seen.has(m)) {
        seen.add(m);
        found.push({ token: m, type: 'detail' });
      }
    });
  }

  return found;
}
