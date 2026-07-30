// jules edit: Rule-based local parts-of-speech (POS) and sentiment analyzer for Tone Correction without external APIs.

export type ToneType =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'persuasive'
  | 'empathetic'
  | 'confident'
  | 'academic';

export interface ToneAnalysisResult {
  formalityScore: number; // 0 (casual) to 100 (formal)
  sentimentScore: number; // -1.0 (negative) to 1.0 (positive)
  wordCount: number;
  sentenceCount: number;
  detectedTone: ToneType;
  partsOfSpeech: {
    nouns: string[];
    verbs: string[];
    adjectives: string[];
    adverbs: string[];
    pronouns: string[];
  };
  keyPhrases: string[];
}

// Built-in rule lists for local POS tagging
const PRONOUNS = new Set(['i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves']);
const VERBS = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'gotta', 'wanna', 'gonna', 'fix', 'run', 'code', 'write', 'build', 'create', 'suggest', 'compare', 'analyze', 'edit', 'convert', 'save', 'load', 'execute', 'call', 'endpoint', 'route', 'test', 'check', 'validate', 'vibrate', 'flash', 'scroll', 'survey', 'question']);
const ADJECTIVES = new Set(['cool', 'awesome', 'great', 'excellent', 'happy', 'wonderful', 'perfect', 'good', 'best', 'bad', 'terrible', 'worst', 'urgent', 'responsive', 'liquid', 'premium', 'secure', 'safe', 'fast', 'swift', 'accurate', 'flexible', 'modular', 'reusable', 'comprehensive', 'beautiful', 'clean', 'smart', 'dumb']);
const ADVERBS = new Set(['asap', 'easily', 'properly', 'swiftly', 'accurately', 'securely', 'safely', 'perfectly', 'completely', 'extremely', 'very', 'highly', 'successfully', 'constantly', 'sincerely', 'furthermore', 'accordingly', 'consequently', 'herewith']);

// Vocabulary replacements mapping casual terms to formal/professional/academic terms
const FORMAL_REPLACEMENTS: Record<string, string> = {
  hey: 'Greetings',
  hi: 'Hello',
  bro: 'colleague',
  dude: 'associate',
  guys: 'team members',
  cool: 'exemplary',
  awesome: 'satisfactory',
  gotta: 'must',
  wanna: 'wish to',
  gonna: 'intend to',
  asap: 'at your earliest convenience',
  thanks: 'Thank you',
  sorry: 'We sincerely apologize',
  bad: 'suboptimal',
  fix: 'rectify',
  check: 'verify',
  help: 'assistance',
  tell: 'inform',
  about: 'regarding',
  butt: 'alternative',
  dumb: 'unintelligent',
  smart: 'proficient',
};

export class ToneCorrectionEngine {
  private localTagger(words: string[]): ToneAnalysisResult['partsOfSpeech'] {
    const nouns: string[] = [];
    const verbs: string[] = [];
    const adjectives: string[] = [];
    const adverbs: string[] = [];
    const pronouns: string[] = [];

    words.forEach(w => {
      const lower = w.toLowerCase().replace(/[^\w]/g, '');
      if (!lower) return;

      if (PRONOUNS.has(lower)) {
        pronouns.push(lower);
      } else if (VERBS.has(lower) || lower.endsWith('ed') || lower.endsWith('ing')) {
        verbs.push(lower);
      } else if (ADJECTIVES.has(lower) || lower.endsWith('ful') || lower.endsWith('able') || lower.endsWith('ive')) {
        adjectives.push(lower);
      } else if (ADVERBS.has(lower) || lower.endsWith('ly')) {
        adverbs.push(lower);
      } else {
        // Fallback categorization as nouns
        if (lower.length > 2) {
          nouns.push(lower);
        }
      }
    });

    return {
      nouns: Array.from(new Set(nouns)).slice(0, 8),
      verbs: Array.from(new Set(verbs)).slice(0, 8),
      adjectives: Array.from(new Set(adjectives)).slice(0, 8),
      adverbs: Array.from(new Set(adverbs)).slice(0, 8),
      pronouns: Array.from(new Set(pronouns)).slice(0, 8),
    };
  }

  public analyze(text: string): ToneAnalysisResult {
    try {
      if (!text || typeof text !== 'string') {
        return {
          formalityScore: 50,
          sentimentScore: 0,
          wordCount: 0,
          sentenceCount: 0,
          detectedTone: 'casual',
          partsOfSpeech: { nouns: [], verbs: [], adjectives: [], adverbs: [], pronouns: [] },
          keyPhrases: [],
        };
      }

      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

      let formality = 50;
      let sentiment = 0;

      // Casual markers
      const casualMarkers = ['hey', 'hi', 'bro', 'dude', 'cool', 'awesome', 'gotta', 'wanna', 'gonna', 'lol', 'asap', 'guys', 'yeah', 'okay', 'kid', 'whatever'];
      // Formal markers
      const formalMarkers = ['furthermore', 'accordingly', 'consequently', 'sincerely', 'regarding', 'herewith', 'pursuant', 'kindly', 'therefore', 'moreover', 'subsequent', 'ascertain'];
      // Positive sentiment
      const positiveWords = ['great', 'excellent', 'happy', 'awesome', 'wonderful', 'perfect', 'thanks', 'good', 'best', 'love', 'outstanding', 'efficient', 'superb'];
      // Negative sentiment
      const negativeWords = ['bad', 'error', 'bug', 'failed', 'issue', 'problem', 'terrible', 'worst', 'urgent', 'dumb', 'break', 'breakage', 'unpleasant', 'annoying'];

      words.forEach((w) => {
        if (casualMarkers.includes(w)) formality -= 12;
        if (formalMarkers.includes(w)) formality += 15;
        if (positiveWords.includes(w)) sentiment += 0.25;
        if (negativeWords.includes(w)) sentiment -= 0.25;
      });

      // Bound results
      formality = Math.max(0, Math.min(100, formality));
      sentiment = Math.max(-1.0, Math.min(1.0, Number(sentiment.toFixed(2))));

      let detectedTone: ToneType = 'casual';
      if (formality > 80) detectedTone = 'academic';
      else if (formality > 65) detectedTone = 'formal';
      else if (formality > 50) detectedTone = 'professional';
      else if (sentiment > 0.4 && formality < 40) detectedTone = 'empathetic';
      else if (sentiment < -0.2 && formality > 50) detectedTone = 'confident';
      else if (sentiment > 0.2 && formality >= 45) detectedTone = 'persuasive';

      const partsOfSpeech = this.localTagger(words);

      return {
        formalityScore: formality,
        sentimentScore: sentiment,
        wordCount: words.length,
        sentenceCount: Math.max(1, sentences.length),
        detectedTone,
        partsOfSpeech,
        keyPhrases: Array.from(new Set(words.filter(w => w.length > 4))).slice(0, 5),
      };
    } catch (e) {
      return {
        formalityScore: 50,
        sentimentScore: 0,
        wordCount: 0,
        sentenceCount: 0,
        detectedTone: 'casual',
        partsOfSpeech: { nouns: [], verbs: [], adjectives: [], adverbs: [], pronouns: [] },
        keyPhrases: [],
      };
    }
  }

  public adjustTone(
    text: string,
    targetTone: ToneType = 'professional',
  ): string {
    if (!text) return text;
    let t = text.trim();

    // Map through our FORMAL_REPLACEMENTS to rewrite text rules
    if (targetTone === 'formal' || targetTone === 'professional' || targetTone === 'academic') {
      for (const [casual, formal] of Object.entries(FORMAL_REPLACEMENTS)) {
        const regex = new RegExp(`\\b${casual}\\b`, 'gi');
        t = t.replace(regex, (match) => {
          // Keep upper case
          if (match[0] === match[0].toUpperCase()) {
            return formal[0].toUpperCase() + formal.slice(1);
          }
          return formal;
        });
      }
    }

    switch (targetTone) {
      case 'formal':
        if (!t.endsWith('.')) t += '.';
        return `It is formally requested that: ${t}`;

      case 'professional':
        if (!t.endsWith('.')) t += '.';
        return `Please be advised: ${t} We appreciate your partnership.`;

      case 'academic':
        if (!t.endsWith('.')) t += '.';
        return `Empirical investigation demonstrates: ${t.toLowerCase()} Consequently, this thesis is fully validated.`;

      case 'casual':
        // Strip out some formal phrases if present
        t = t
          .replace(/\bGreetings\b/gi, 'Hey')
          .replace(/\bDear Colleagues\b/gi, 'Hey guys')
          .replace(/\bPlease be advised\b/gi, 'Just so you know')
          .replace(/\bThank you\b/gi, 'Thanks');
        return `Hey! ${t} Talk soon!`;

      case 'persuasive':
        return `Maximize your absolute potential: ${t} Don't wait—secure your premium access today to elevate your workflow!`;

      case 'empathetic':
        return `We completely understand your feelings and stand with you: ${t} Rest assured, our dedicated team is here to support you.`;

      case 'confident':
        return `We guarantee absolute top-tier success: ${t} Our precision-built framework leaves absolutely zero room for errors.`;

      default:
        return t;
    }
  }

  public suggestTones(text: string): Record<ToneType, string> {
    return {
      formal: this.adjustTone(text, 'formal'),
      casual: this.adjustTone(text, 'casual'),
      professional: this.adjustTone(text, 'professional'),
      persuasive: this.adjustTone(text, 'persuasive'),
      empathetic: this.adjustTone(text, 'empathetic'),
      confident: this.adjustTone(text, 'confident'),
      academic: this.adjustTone(text, 'academic'),
    };
  }
}
