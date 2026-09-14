/**
 * AI Utility Functions for the Composer
 *
 * These functions check AI_CONFIG.useRealAi and either:
 *  - Call the real AI endpoint  (when GEMINI_API_KEY or OPENAI_API_KEY is set in .env.local)
 *  - Return plausible mock responses (default demo mode)
 *
 * Local text analysis features (readability, sentiment, spam check)
 * work entirely client-side with no API key needed.
 *
 * jules edit: Modified real calls to delegate to unified server-side route handler
 */

import { AI_CONFIG, FLAGGED_WORDS, PINGWORLD_HASHTAG } from './constants';
import type { TextAnalysis, AiStyle, HashTag } from './types';

export interface GrammarIssue {
  message: string;
  context: string;
  offset: number;
  length: number;
}

// ─── Local Text Analysis (No API needed) ─────────────────────

/**
 * Computes Flesch Reading Ease score and related metrics
 */
export function analyzeText(text: string): TextAnalysis {
  const rawText = text.trim();
  if (!rawText) {
    return {
      wordCount: 0,
      charCount: 0,
      sentenceCount: 0,
      readTimeSeconds: 0,
      fleschScore: 100,
      sentiment: 'neutral',
      flaggedWords: [],
      readabilityLabel: 'Empty',
    };
  }

  // Word count
  const words = rawText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const charCount = rawText.length;

  // Sentence count (end with . ! ?)
  const sentences = rawText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  // Syllable count (approximate)
  const syllableCount = words.reduce((acc, word) => {
    return acc + countSyllables(word);
  }, 0);

  // Flesch Reading Ease
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / Math.max(wordCount, 1);
  const fleschRaw =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschScore = Math.max(0, Math.min(100, Math.round(fleschRaw)));

  // Read time: avg reading speed ~200 wpm for social media
  const readTimeSeconds = Math.max(1, Math.round((wordCount / 200) * 60));

  // Sentiment: keyword-based heuristic
  const sentiment = computeSentiment(rawText);

  // Flagged words check
  const lowerText = rawText.toLowerCase();
  const flaggedWords = FLAGGED_WORDS.filter((fw) =>
    lowerText.includes(fw.toLowerCase()),
  );

  // Readability label
  let readabilityLabel = 'Very Easy';
  if (fleschScore < 30) readabilityLabel = 'Very Difficult';
  else if (fleschScore < 50) readabilityLabel = 'Difficult';
  else if (fleschScore < 60) readabilityLabel = 'Fairly Difficult';
  else if (fleschScore < 70) readabilityLabel = 'Standard';
  else if (fleschScore < 80) readabilityLabel = 'Fairly Easy';
  else if (fleschScore < 90) readabilityLabel = 'Easy';

  return {
    wordCount,
    charCount,
    sentenceCount,
    readTimeSeconds,
    fleschScore,
    sentiment,
    flaggedWords,
    readabilityLabel,
  };
}

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 1;
  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  const count = matches ? matches.length : 1;
  return Math.max(1, count);
}

function computeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positive = [
    'amazing',
    'awesome',
    'great',
    'excellent',
    'love',
    'happy',
    'best',
    'wonderful',
    'fantastic',
    'good',
    'excited',
    'thrilled',
    'top',
    'win',
    'success',
    'achieve',
    'proud',
    'celebrate',
    'brilliant',
    'superb',
    'perfect',
    'beautiful',
    'incredible',
    'outstanding',
    'growth',
    'masterpiece',
    'joy',
    'blessed',
    'grateful',
  ];
  const negative = [
    'bad',
    'hate',
    'terrible',
    'awful',
    'worst',
    'horrible',
    'sad',
    'disappointing',
    'disaster',
    'fail',
    'problem',
    'issue',
    'broken',
    'wrong',
    'angry',
    'frustrated',
    'annoyed',
    'poor',
    'weak',
    'failed',
    'pathetic',
    'worthless',
    'garbage',
    'rubbish',
    'trash',
    'sucks',
  ];
  const vulgarOrOffensive = [
    'fuck',
    'shit',
    'bitch',
    'asshole',
    'crap',
    'damn',
    'slut',
    'whore',
    'bastard',
    'cunt',
    'dick',
    'pussy',
    'faggot',
    'nigger',
    'retard',
  ];

  const lower = text.toLowerCase();

  // Instant trigger for highly offensive words -> negative sentiment
  // (Using word boundaries to prevent accidental substring matches)
  if (
    vulgarOrOffensive.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower))
  ) {
    return 'negative';
  }

  const pos = positive.filter((w) =>
    new RegExp(`\\b${w}\\b`, 'i').test(lower),
  ).length;
  const neg = negative.filter((w) =>
    new RegExp(`\\b${w}\\b`, 'i').test(lower),
  ).length;

  // A single explicitly negative word is strong enough to skew it neutral,
  // but if negativity significantly outweighs positivity, it's negative.
  if (pos > neg + 1) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

/**
 * Extract potential hashtags from text (words starting with # or key nouns)
 */
function extractKeyNouns(text: string): string[] {
  const existingTags = (text.match(/#\w+/g) || []).map((t) => t.toLowerCase());
  // Extract capitalized words as potential tags
  const capitalized = (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).map(
    (w) => `#${w.toLowerCase()}`,
  );
  return [...new Set([...existingTags, ...capitalized])].slice(0, 8);
}

/**
 * Check grammar using offline-first local linting rules + optional safe remote fallback.
 * Guaranteed to never throw unhandled fetch errors or crash hooks.
 */
export async function checkGrammar(text: string): Promise<GrammarIssue[]> {
  if (!text || text.trim().length === 0) return [];

  const issues: GrammarIssue[] = [];

  // Local Rule 1: Duplicate adjacent words (e.g. "the the", "and and")
  const dupRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
  let match: RegExpExecArray | null;
  while ((match = dupRegex.exec(text)) !== null) {
    issues.push({
      message: `Repeated word: "${match[1]}"`,
      context: text.slice(Math.max(0, match.index - 10), Math.min(text.length, match.index + match[0].length + 10)),
      offset: match.index,
      length: match[0].length,
    });
  }

  // Local Rule 2: Space before comma/period (e.g. "word , next")
  const spacePunctRegex = /\w+\s+([,.:;!?])/g;
  while ((match = spacePunctRegex.exec(text)) !== null) {
    issues.push({
      message: `Unusual space before punctuation "${match[1]}"`,
      context: text.slice(Math.max(0, match.index - 5), Math.min(text.length, match.index + match[0].length + 5)),
      offset: match.index,
      length: match[0].length,
    });
  }

  // Local Rule 3: Missing capitalization at sentence start
  const sentenceCapRegex = /(?:^|[.!?]\s+)([a-z])/g;
  while ((match = sentenceCapRegex.exec(text)) !== null) {
    const charIdx = match.index + match[0].length - 1;
    issues.push({
      message: `Sentence should start with an uppercase letter`,
      context: text.slice(Math.max(0, charIdx - 5), Math.min(text.length, charIdx + 10)),
      offset: charIdx,
      length: 1,
    });
  }

  // Local Rule 4: Common homophone checks
  const homophones = [
    { regex: /\b(its)\s+(a|an|the|very|not|so|going)\b/gi, msg: 'Did you mean "it\'s" (it is)?' },
    { regex: /\b(your)\s+(welcome|right|wrong|going|done)\b/gi, msg: 'Did you mean "you\'re" (you are)?' },
    { regex: /\b(there)\s+(car|house|dog|opinion|idea|turn)\b/gi, msg: 'Did you mean "their" (possessive)?' },
    { regex: /\b(their)\s+(is|are|was|were)\b/gi, msg: 'Did you mean "there"?' },
  ];

  for (const h of homophones) {
    while ((match = h.regex.exec(text)) !== null) {
      issues.push({
        message: h.msg,
        context: text.slice(Math.max(0, match.index - 5), Math.min(text.length, match.index + match[0].length + 5)),
        offset: match.index,
        length: match[0].length,
      });
    }
  }

  // If local issues found or user is offline, return local results immediately
  if (issues.length > 0 || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return issues.slice(0, 5);
  }

  // Optional background fetch with strict try/catch boundary
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'auto' }),
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.matches)) {
        const remoteIssues = data.matches.map((m: any) => ({
          message: m.message || 'Grammar suggestion',
          context: m.context?.text || '',
          offset: m.context?.offset ?? 0,
          length: m.context?.length ?? 0,
        }));
        return [...issues, ...remoteIssues].slice(0, 5);
      }
    }
  } catch {
    // Completely silent fallback
  }

  return issues.slice(0, 5);
}

// ─── AI Features (Mock + Real slot) ──────────────────────────

/**
 * Generate hashtags based on text content.
 * Works locally by extracting key terms; real AI upgrades quality.
 */
export async function generateHashtags(text: string): Promise<HashTag[]> {
  if (AI_CONFIG.useRealAi) {
    return callRealAiForHashtags(text);
  }

  // Local keyword extraction (no API)
  await simulateDelay(800);
  const local = extractKeyNouns(text);
  const mockTags = [
    ...local,
    '#creator',
    '#socialmedia',
    '#content',
    '#marketing',
    '#growth',
    '#trending',
  ]
    .filter((t) => t !== PINGWORLD_HASHTAG.toLowerCase())
    .slice(0, 7);

  return mockTags.map((tag) => ({
    tag: tag.startsWith('#') ? tag : `#${tag}`,
    isPingWorld: false,
    source: 'ai' as const,
  }));
}

export async function rephraseText(
  text: string,
  style: AiStyle,
  context: string,
): Promise<string> {
  if (AI_CONFIG.useRealAi) {
    return callRealAiForRephrase(text, style, context);
  }

  await simulateDelay(1500);

  // Style-based mock transformations
  const styleMap: Record<AiStyle, (t: string) => string> = {
    professional: (t) =>
      `${t.trim()}${t.endsWith('.') ? '' : '.'} Excited to share this with our community.`,
    casual: (t) => `ok real talk — ${t.trim()} 🔥`,
    viral: (t) =>
      `🚨 STOP SCROLLING. ${t.trim().toUpperCase()} — share this if you agree! 👇`,
    educational: (t) =>
      `📚 Did you know? ${t.trim()}\n\nHere's why this matters: understanding this can transform how you approach every interaction.`,
  };

  return styleMap[style]?.(text) ?? text;
}

export async function suggestFromTitle(
  title: string,
  style: AiStyle,
  context: string,
): Promise<string[]> {
  if (AI_CONFIG.useRealAi) {
    return callRealAiForSuggestions(title, style, context);
  }

  await simulateDelay(1200);

  const lowerTitle = title.toLowerCase();
  const suggestions = [
    `Just dropped: ${title}. Here's what you need to know and why it changes everything.`,
    `Been thinking a lot about "${title}" lately. Here are my honest thoughts 👇`,
    `The truth about ${title} that nobody talks about. Buckle up. 🧵`,
  ];

  // Contextual mock improvement
  if (lowerTitle.includes('tip') || lowerTitle.includes('how')) {
    suggestions.unshift(
      `5 things I learned from ${title} that made me completely rethink my approach.`,
    );
  }
  if (lowerTitle.includes('launch') || lowerTitle.includes('new')) {
    suggestions.unshift(
      `🚀 It's finally here. ${title} — this has been months in the making.`,
    );
  }

  return suggestions.slice(0, 3);
}

export type TransText = {
  ok: boolean,
  data: string,
};

export async function translateText (
  text: string,
  targetLanguageCode: string,
  targetLanguageName: string,
): Promise<TransText> {
  if(AI_CONFIG.useRealAi) {
    return callRealAiForTranslation(
      text,
      targetLanguageCode,
      targetLanguageName,
    );
  }

  // Attempt to use MyMemory free keyless API (5000 chars/day)
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguageCode}`,
    );
    if (!res.ok) throw new Error('Translator network issue');
    const data = await res.json();
    if(data.responseData?.translatedText) {
      return {ok: true, data: data.responseData.translatedText};
    }
  } catch(e) {
    console.warn('Keyless Translation failed, falling back to mock', e);
  }

  await simulateDelay(1000);

  return {ok: false, data:`${targetLanguageName} — Demo Translation]\nWe couldn't connect to the translation server. \n\nOriginal: ${text}`};
}

// ─── Delay Simulation ────────────────────────────────────────
function simulateDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Real AI Calls (Modified to route to server-side API) ───

async function callRealAiForHashtags(text: string): Promise<HashTag[]> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'hashtags', text }),
  });
  if (!response.ok) throw new Error('Real AI failed to generate hashtags');
  const data = await response.json();
  return data.tags ?? [];
}

async function callRealAiForRephrase(
  text: string,
  style: AiStyle,
  context: string,
): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rephrase', text, style, context }),
  });
  if (!response.ok) throw new Error('Real AI failed to rephrase text');
  const data = await response.json();
  return data.result ?? text;
}

async function callRealAiForSuggestions(
  title: string,
  style: AiStyle,
  context: string,
): Promise<string[]> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'suggest', title, style, context }),
  });
  if (!response.ok) throw new Error('Real AI failed to load suggestions');
  const data = await response.json();
  return data.suggestions ?? [];
}

async function callRealAiForTranslation(
  text: string,
  targetLanguageCode: string,
  targetLanguageName: string,
): Promise<TransText> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'translate', text, targetLanguageCode, targetLanguageName }),
  });
  if (!response.ok) throw new Error('Real AI translation failed');
  const data = await response.json();
  return {ok: data.translated ? true : false, data: data.translated ?? text};
}
