/**
 * PingWorld Quiz & Survey Dynamic Mention, Piping & Evaluation Engine (@eval)
 * Supports:
 *  - Escape characters (\) e.g., \@name or \@eval:{...}
 *  - Dynamic nested mentions: e.g. @cat_:(@Gender)_q1 -> @cat_male_q1 -> "John"
 *  - Dynamic detail keys: e.g. @FullName, @Gender, @q1, @ans_{id}, @cat_{name}_q{n}
 *  - Logic evaluation expressions:
 *      @eval:{@FullName || User}
 *      @eval:{@Gender = male @show:(man) : @show:(female)}
 *      @eval:{@q1 MATCH JS @show:(Passed) : @show:(Failed)}
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

  let text = rawText;

  // Protect escaped syntax markers (e.g. \@ or \@eval)
  const ESCAPE_TOKEN = '___PW_ESC_AT___';
  text = text.replace(/\\@/g, ESCAPE_TOKEN);

  // Phase 1: Dynamic nested parentheses mentions e.g. @cat_:(@Gender)_q1 -> @cat_male_q1
  text = resolveNestedPiping(text, context);

  // Phase 2: Resolve standard piping tokens (@name, @q1, @cat_x_q1, @DetailName)
  text = resolveStandardTokens(text, context);

  // Phase 3: Evaluate @eval:{...} expressions
  text = resolveEvalExpressions(text, context);

  // Restore escaped @ symbols
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
 * Standard token resolver
 */
function resolveStandardTokens(text: string, context: PipingContext): string {
  let result = text;
  const user = context.userData || {};

  // 1. Participant Details from userData object or array
  const detailsMap: Record<string, string> = {};

  if (Array.isArray(user)) {
    detailsMap['name'] = user[0] ? String(user[0]) : '';
    detailsMap['email'] = user[1] ? String(user[1]) : '';
    detailsMap['fullname'] = detailsMap['name'];
  } else if (typeof user === 'object' && user !== null) {
    Object.entries(user).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        detailsMap[k.toLowerCase()] = String(v);
        detailsMap[k.toLowerCase().replace(/\s+/g, '')] = String(v);
      }
    });
  }

  // Pre-fill defaults
  const nameVal = detailsMap['fullname'] || detailsMap['name'] || detailsMap['username'] || 'Participant';
  const emailVal = detailsMap['email'] || 'your email';
  const phoneVal = detailsMap['phone'] || detailsMap['tel'] || 'phone';
  const usernameVal = detailsMap['username'] || nameVal;

  result = result.replace(/@name\b/gi, nameVal);
  result = result.replace(/@firstname\b/gi, nameVal.split(' ')[0] || nameVal);
  result = result.replace(/@email\b/gi, emailVal);
  result = result.replace(/@username\b/gi, usernameVal);
  result = result.replace(/@phone\b/gi, phoneVal);

  // Replace custom detail variables e.g. @FullName, @Gender, @Age
  Object.keys(detailsMap).forEach((key) => {
    const val = detailsMap[key];
    const regex = new RegExp(`@${key}\\b`, 'gi');
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
    if (qIndex >= 0 && qIndex < questions.length) {
      const q = questions[qIndex];
      const ansObj = answers.find((a) => a.questionId === q.id);
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

/**
 * Parser for @eval:{...} constructs
 *
 * Examples supported:
 *  - @eval:{@FullName || User}
 *  - @eval:{@Gender = male @show:(man) : @show:(female)}
 *  - @eval:{@Gender != male @show:(female) : @show:(male)}
 *  - @eval:{@q1 MATCH Javascript @show:(Pro) : @show:(Beginner)}
 */
function resolveEvalExpressions(text: string, context: PipingContext): string {
  // Regex to match @eval:{ ... }
  const evalRegex = /@eval:\{([^}]+)\}/gi;

  return text.replace(evalRegex, (_match, body: string) => {
    const trimmed = body.trim();

    // 1. Check for ternary show branches: condition @show:(trueResult) : @show:(falseResult)
    if (trimmed.includes('@show:')) {
      const parts = trimmed.split(':');
      const conditionAndTrueBranch = parts[0] ? parts[0].trim() : '';
      const falseBranch = parts[1] ? parts[1].trim() : '';

      const trueMatch = conditionAndTrueBranch.match(/(.+?)\s*@show:\((.*?)\)$/i);
      if (trueMatch) {
        const rawCondStr = trueMatch[1].trim();
        const trueResult = trueMatch[2];
        const falseResultMatch = falseBranch.match(/@show:\((.*?)\)/i);
        const falseResult = falseResultMatch ? falseResultMatch[1] : '';

        const isTrue = evaluateCondition(rawCondStr, context);
        return isTrue ? trueResult : falseResult;
      }
    }

    // 2. Check for fallback OR syntax e.g. {@FullName || User}
    if (trimmed.includes('||')) {
      const options = trimmed.split('||').map((s) => s.trim());
      for (const opt of options) {
        const resolved = resolveStandardTokens(opt, context);
        if (
          resolved &&
          !resolved.startsWith('[') &&
          resolved.toLowerCase() !== 'participant' &&
          resolved.toLowerCase() !== 'user'
        ) {
          return resolved;
        }
      }
      return options[options.length - 1] || '';
    }

    // Default: Return evaluated condition string or resolved text
    return resolveStandardTokens(trimmed, context);
  });
}

/**
 * Evaluates binary expressions with operators: =, !=, MATCH
 */
function evaluateCondition(condStr: string, context: PipingContext): boolean {
  // Operator: MATCH
  if (/\bMATCH\b/i.test(condStr)) {
    const parts = condStr.split(/\bMATCH\b/i);
    const left = resolveStandardTokens(parts[0].trim(), context).toLowerCase();
    const right = resolveStandardTokens(parts[1].trim(), context).toLowerCase();
    return left.includes(right);
  }

  // Operator: !=
  if (condStr.includes('!=')) {
    const parts = condStr.split('!=');
    const left = resolveStandardTokens(parts[0].trim(), context).toLowerCase();
    const right = resolveStandardTokens(parts[1].trim(), context).toLowerCase();
    return left !== right;
  }

  // Operator: =
  if (condStr.includes('=')) {
    const parts = condStr.split('=');
    const left = resolveStandardTokens(parts[0].trim(), context).toLowerCase();
    const right = resolveStandardTokens(parts[1].trim(), context).toLowerCase();
    return left === right;
  }

  // Fallback truthiness
  const evaluatedStr = resolveStandardTokens(condStr, context).trim();
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
