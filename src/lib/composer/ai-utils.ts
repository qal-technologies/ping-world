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
 * Check grammar using free keyless LanguageTool API
 */
export async function checkGrammar(text: string): Promise<GrammarIssue[]> {
  if (!text || text.trim().length === 0) return [];
  try {
    const res = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        text,
        language: 'auto',
      }),
    });
    const data = await res.json();
    return data.matches.map((m: any) => ({
      message: m.message,
      context: m.context.text,
      offset: m.context.offset,
      length: m.context.length,
    }));
  } catch (e) {
    console.warn('Grammar check failed:', e);
    return []; // Return empty on fail so we don't break the UI
  }
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

export async function translateText(
  text: string,
  targetLanguageCode: string,
  targetLanguageName: string,
): Promise<string> {
  if (AI_CONFIG.useRealAi) {
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
    const data = await res.json();
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (e) {
    console.warn('Keyless Translation failed, falling back to mock', e);
  }

  await simulateDelay(1000);

  // Demo fallback
  return `[${targetLanguageName} — Demo Translation]\n\nWe couldn't connect to the free translation API. Original:\n\n${text}`;
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
  const data = await response.json();
  return data.suggestions ?? [];
}

async function callRealAiForTranslation(
  text: string,
  targetLanguageCode: string,
  targetLanguageName: string,
): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'translate', text, targetLanguageCode, targetLanguageName }),
  });
  const data = await response.json();
  return data.translated ?? text;
}
