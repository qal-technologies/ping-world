// ============================================================
// Tone Correction Engine — Professional-grade tone analysis
// 7 tone types with vocabulary transformation rules
// Formality scoring (0-100) + Sentiment scoring (-1 to 1)
// ============================================================

export type ToneType =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'persuasive'
  | 'empathetic'
  | 'confident'
  | 'academic';

export interface ToneAnalysisResult {
  formalityScore: number; // 0 (very casual) → 100 (very formal)
  sentimentScore: number; // -1.0 (negative) → 1.0 (positive)
  energyScore: number; // 0 (passive) → 1 (energetic/active)
  readabilityScore: number; // 0 (complex) → 100 (easy to read)
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  detectedTone: ToneType;
  detectedSentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  markers: {
    casualMarkers: string[];
    formalMarkers: string[];
    positiveWords: string[];
    negativeWords: string[];
  };
}

// ---- Marker lexicons ----
const CASUAL_MARKERS: Record<string, number> = {
  hey: 10,
  bro: 12,
  dude: 12,
  yo: 12,
  lol: 15,
  omg: 15,
  btw: 8,
  asap: 8,
  fyi: 6,
  gonna: 10,
  wanna: 10,
  gotta: 10,
  kinda: 8,
  sorta: 8,
  yeah: 10,
  nope: 8,
  yep: 8,
  cool: 8,
  awesome: 8,
  amazing: 8,
  guys: 8,
  folks: 6,
  kids: 6,
  super: 6,
  pretty: 5,
  literally: 6,
  totally: 6,
  basically: 5,
  honestly: 5,
  tbh: 10,
  imo: 10,
  imho: 10,
  welp: 12,
  yikes: 12,
  whoops: 10,
  oops: 10,
  dunno: 12,
  lemme: 12,
  gimme: 12,
  nah: 12,
  bleh: 15,
  meh: 12,
  whatevs: 15,
  prolly: 12,
  def: 8,
  legit: 8,
  low_key: 10,
};

const FORMAL_MARKERS: Record<string, number> = {
  furthermore: 15,
  accordingly: 15,
  consequently: 15,
  moreover: 12,
  nevertheless: 12,
  notwithstanding: 18,
  hereby: 15,
  herewith: 15,
  therein: 12,
  thereof: 12,
  pursuant: 18,
  sincerely: 12,
  regards: 10,
  kindly: 10,
  respectfully: 12,
  henceforth: 15,
  aforementioned: 18,
  subsequent: 12,
  pertaining: 12,
  regarding: 10,
  therefore: 10,
  however: 8,
  although: 8,
  whereas: 12,
  wherein: 12,
  explicitly: 10,
  implicitly: 10,
  respectively: 12,
  substantially: 12,
  considerably: 10,
  particularly: 8,
  specifically: 8,
  approximately: 8,
  presumably: 10,
  evidently: 10,
  apparently: 8,
};

const POSITIVE_词: Record<string, number> = {
  great: 2,
  excellent: 3,
  amazing: 3,
  wonderful: 3,
  fantastic: 3,
  perfect: 3,
  outstanding: 3,
  brilliant: 3,
  superb: 3,
  exceptional: 4,
  remarkable: 3,
  impressive: 3,
  pleased: 2,
  delighted: 3,
  thrilled: 3,
  grateful: 2,
  thankful: 2,
  appreciate: 2,
  love: 2,
  enjoy: 2,
  happy: 2,
  satisfied: 2,
  excited: 3,
  encouraged: 2,
  optimistic: 2,
  confident: 2,
  proud: 2,
  glad: 2,
  joyful: 2,
  success: 2,
  achieve: 2,
  accomplish: 2,
  improve: 2,
  grow: 2,
  progress: 2,
  benefit: 2,
  value: 2,
  quality: 2,
  efficient: 2,
  effective: 2,
  innovative: 2,
  reliable: 2,
  professional: 2,
  helpful: 2,
  useful: 2,
  clear: 1,
  simple: 1,
};

const NEGATIVE_WORDS: Record<string, number> = {
  bad: 2,
  terrible: 3,
  horrible: 3,
  awful: 4,
  dreadful: 4,
  poor: 2,
  worst: 4,
  fail: 3,
  failed: 3,
  failure: 3,
  error: 2,
  bug: 2,
  broken: 2,
  issue: 2,
  problem: 3,
  unfortunately: 3,
  regret: 3,
  sorry: 2,
  apologize: 3,
  concern: 2,
  complaint: 3,
  difficult: 2,
  hard: 1,
  challenging: 1,
  struggle: 2,
  frustrated: 3,
  annoyed: 2,
  disappointed: 3,
  upset: 3,
  angry: 3,
  wrong: 2,
  incorrect: 2,
  invalid: 2,
  missing: 1,
  lacking: 2,
  insufficient: 2,
  urgent: 2,
  critical: 3,
  severe: 3,
  dangerous: 3,
  harmful: 3,
  damage: 3,
  loss: 3,
  risk: 2,
  threat: 3,
  decline: 2,
  reject: 3,
  deny: 3,
  refuse: 2,
  cancel: 2,
  terminate: 3,
  abandon: 3,
};

const ACADEMIC_MARKERS = new Set([
  'hypothesis',
  'methodology',
  'empirical',
  'quantitative',
  'qualitative',
  'theoretical',
  'conceptual',
  'analytical',
  'systematic',
  'paradigm',
  'discourse',
  'framework',
  'epistemological',
  'ontological',
  'axiom',
  'postulate',
  'inference',
  'correlation',
  'causation',
  'variable',
  'coefficient',
  'significant',
  'dataset',
  'findings',
  'literature',
  'citation',
  'reference',
  'bibliography',
  'abstract',
  'conclusion',
  'introduction',
  'methodology',
  'results',
  'discussion',
  'analysis',
]);

const PERSUASIVE_MARKERS = new Set([
  'must',
  'should',
  'critical',
  'essential',
  'vital',
  'crucial',
  'urgent',
  'proven',
  'guaranteed',
  'best',
  'most',
  'only',
  'exclusive',
  'limited',
  'opportunity',
  'benefit',
  'advantage',
  'reward',
  'value',
  'maximize',
  'unlock',
  'discover',
  'transform',
  'imagine',
  'envision',
  'achieve',
  'powerful',
  'game-changing',
  'revolutionary',
  'breakthrough',
  'unprecedented',
]);

// ---- Transformation dictionaries per tone ----
const FORMAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bhey guys\b/gi, 'Dear Colleagues'],
  [/\bhey team\b/gi, 'Dear Team'],
  [/\bhey\b/gi, 'Greetings'],
  [/\bhi there\b/gi, 'Good day'],
  [/\bhi\b/gi, 'Good day'],
  [/\bbro\b/gi, 'colleague'],
  [/\bdude\b/gi, 'colleague'],
  [/\bgotta\b/gi, 'must'],
  [/\bwanna\b/gi, 'wish to'],
  [/\bgonna\b/gi, 'going to'],
  [/\basap\b/gi, 'at the earliest opportunity'],
  [/\bthanks\b/gi, 'Thank you'],
  [/\bawesome\b/gi, 'excellent'],
  [/\bcool\b/gi, 'suitable'],
  [/\bkinda\b/gi, 'somewhat'],
  [/\bsorta\b/gi, 'somewhat'],
  [/\btbtw\b/gi, 'furthermore'],
  [/\bbtw\b/gi, 'additionally'],
  [/\bfyi\b/gi, 'please note that'],
  [/\bokay\b/gi, 'acknowledged'],
  [/\bok\b/gi, 'acknowledged'],
  [/\bget\b/gi, 'obtain'],
  [/\buse\b/gi, 'utilize'],
  [/\bbig\b/gi, 'significant'],
  [/\blots of\b/gi, 'numerous'],
  [/\ba lot of\b/gi, 'a significant amount of'],
];

const CASUAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bDear Colleagues\b/gi, 'Hey team'],
  [/\bGreetings\b/gi, 'Hey'],
  [/\bGood day\b/gi, 'Hi'],
  [/\bcolleague\b/gi, 'bro'],
  [/\bat the earliest opportunity\b/gi, 'ASAP'],
  [/\bThank you\b/gi, 'Thanks'],
  [/\bexcellent\b/gi, 'awesome'],
  [/\backnowledged\b/gi, 'Got it'],
  [/\butilize\b/gi, 'use'],
  [/\bobtain\b/gi, 'get'],
  [/\bsignificant\b/gi, 'big'],
  [/\bnumerous\b/gi, 'lots of'],
  [/\bmust\b/gi, 'gotta'],
  [/\bwish to\b/gi, 'wanna'],
];

const PERSUASIVE_PREFIXES = [
  'Discover the proven path to success: ',
  "Here's your opportunity: ",
  'Take action now to unlock extraordinary results: ',
  "Don't miss out — ",
];

const PERSUASIVE_SUFFIXES = [
  ' Act now and transform your outcomes.',
  ' Your success starts here — seize it today.',
  ' Join thousands who have already benefited. Start immediately.',
  ' This is your moment to achieve outstanding results.',
];

const EMPATHETIC_PREFIXES = [
  'We hear you and completely understand: ',
  'We truly appreciate your perspective — ',
  'Thank you for sharing this with us. ',
  'We recognize how important this is to you. ',
];

const EMPATHETIC_SUFFIXES = [
  ' We are fully committed to supporting you through this.',
  ' Know that you are not alone — we are here for you every step of the way.',
  ' Your wellbeing is our highest priority.',
  ' Together, we will work through this.',
];

const CONFIDENT_PREFIXES = [
  'We guarantee exceptional results: ',
  'With complete certainty: ',
  'Rest assured — ',
  'We are fully committed: ',
];

const CONFIDENT_SUFFIXES = [
  ' Executed with absolute precision and authority.',
  ' This is the definitive solution.',
  ' Delivered with full confidence and accountability.',
  ' You can count on us to deliver, without exception.',
];

const ACADEMIC_TRANSFORMS: Array<[RegExp, string]> = [
  [/\bshow\b/gi, 'demonstrate'],
  [/\buse\b/gi, 'utilize'],
  [/\bget\b/gi, 'obtain'],
  [/\blook at\b/gi, 'examine'],
  [/\bfind out\b/gi, 'ascertain'],
  [/\bcheck\b/gi, 'evaluate'],
  [/\btry\b/gi, 'attempt'],
  [/\bsay\b/gi, 'assert'],
  [/\bthink\b/gi, 'hypothesize'],
  [/\bsee\b/gi, 'observe'],
  [/\bmake\b/gi, 'construct'],
  [/\bgive\b/gi, 'provide'],
  [/\btell\b/gi, 'communicate'],
  [/\bbig\b/gi, 'substantial'],
  [/\bsmall\b/gi, 'minimal'],
  [/\bgood\b/gi, 'favorable'],
  [/\bbad\b/gi, 'adverse'],
  [/\bfast\b/gi, 'expeditious'],
  [/\bslow\b/gi, 'gradual'],
  [/\bimportant\b/gi, 'significant'],
];

export class ToneCorrectionEngine {
  /** Full tone analysis: formality, sentiment, energy, readability, detected tone */
  public analyze(text: string): ToneAnalysisResult {
    try {
      if (!text || typeof text !== 'string') return this._emptyResult();

      const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

      let formality = 50;
      let sentimentRaw = 0;
      let energyRaw = 0;

      const usedCasual: string[] = [];
      const usedFormal: string[] = [];
      const usedPositive: string[] = [];
      const usedNegative: string[] = [];

      words.forEach((w) => {
        if (CASUAL_MARKERS[w] !== undefined) {
          formality -= CASUAL_MARKERS[w];
          usedCasual.push(w);
        }
        if (FORMAL_MARKERS[w] !== undefined) {
          formality += FORMAL_MARKERS[w];
          usedFormal.push(w);
        }
        if (POSITIVE_WORD[w] !== undefined) {
          sentimentRaw += POSITIVE_WORD[w];
          energyRaw += 0.1;
          usedPositive.push(w);
        }
        if (NEGATIVE_WORDS[w] !== undefined) {
          sentimentRaw -= NEGATIVE_WORDS[w];
          energyRaw -= 0.05;
          usedNegative.push(w);
        }
        if (ACADEMIC_MARKERS.has(w)) formality += 10;
        if (PERSUASIVE_MARKERS.has(w)) energyRaw += 0.15;
      });

      // Exclamation marks raise energy
      const exclamations = (text.match(/!/g) || []).length;
      energyRaw += exclamations * 0.15;

      // ALL CAPS words raise energy & reduce formality
      const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
      energyRaw += capsWords * 0.1;
      formality -= capsWords * 3;

      formality = Math.max(0, Math.min(100, Math.round(formality)));
      const energyScore = Math.max(
        0,
        Math.min(1, Number(energyRaw.toFixed(3))),
      );
      const sentimentScore = Math.max(
        -1,
        Math.min(
          1,
          Number((sentimentRaw / Math.max(words.length * 0.3, 1)).toFixed(3)),
        ),
      );

      // Readability: Flesch-Kincaid approximation
      const syllables = words.reduce(
        (acc, w) => acc + this._countSyllables(w),
        0,
      );
      const wc = words.length;
      const sc = Math.max(1, sentences.length);
      const fk =
        wc > 0 ? 206.835 - 1.015 * (wc / sc) - 84.6 * (syllables / wc) : 50;
      const readabilityScore = Math.max(0, Math.min(100, Math.round(fk)));

      // Detect primary tone
      let detectedTone: ToneType = 'casual';
      if (formality >= 80) detectedTone = 'academic';
      else if (formality >= 65) detectedTone = 'formal';
      else if (formality >= 50) detectedTone = 'professional';
      else if (formality >= 35 && sentimentScore > 0.2)
        detectedTone = 'empathetic';
      else if (energyScore > 0.4 && sentimentScore > 0)
        detectedTone = 'persuasive';
      else if (sentimentScore > 0.3 && energyScore > 0.3)
        detectedTone = 'confident';

      const detectedSentiment: 'positive' | 'neutral' | 'negative' =
        sentimentScore > 0.15 ? 'positive'
        : sentimentScore < -0.15 ? 'negative'
        : 'neutral';

      return {
        formalityScore: formality,
        sentimentScore,
        energyScore,
        readabilityScore,
        wordCount: wc,
        sentenceCount: sc,
        avgWordsPerSentence: sc > 0 ? Number((wc / sc).toFixed(1)) : 0,
        detectedTone,
        detectedSentiment,
        keywords: Array.from(new Set(words.filter((w) => w.length > 4))).slice(
          0,
          10,
        ),
        markers: {
          casualMarkers: [...new Set(usedCasual)],
          formalMarkers: [...new Set(usedFormal)],
          positiveWords: [...new Set(usedPositive)],
          negativeWords: [...new Set(usedNegative)],
        },
      };
    } catch {
      return this._emptyResult();
    }
  }

  /** Rewrite text into the specified target tone */
  public adjustTone(
    text: string,
    targetTone: ToneType = 'professional',
  ): string {
    if (!text) return text;
    let t = text.trim();

    switch (targetTone) {
      case 'formal':
        FORMAL_REPLACEMENTS.forEach(([rx, rep]) => {
          t = t.replace(rx, rep);
        });
        if (!/[.!?]$/.test(t)) t += '.';
        return t;

      case 'professional':
        FORMAL_REPLACEMENTS.slice(0, 12).forEach(([rx, rep]) => {
          t = t.replace(rx, rep);
        });
        t = t.replace(/\bawesome\b/gi, 'excellent');
        t = t.replace(/\blol\b/gi, '');
        if (!/[.!?]$/.test(t)) t += '.';
        return t;

      case 'casual':
        CASUAL_REPLACEMENTS.forEach(([rx, rep]) => {
          t = t.replace(rx, rep);
        });
        t = t.replace(/\.$/, '').trim();
        return t;

      case 'persuasive': {
        const prefix =
          PERSUASIVE_PREFIXES[
            Math.floor(text.length % PERSUASIVE_PREFIXES.length)
          ];
        const suffix =
          PERSUASIVE_SUFFIXES[
            Math.floor(text.length % PERSUASIVE_SUFFIXES.length)
          ];
        return `${prefix}${t} ${suffix}`;
      }

      case 'empathetic': {
        const prefix =
          EMPATHETIC_PREFIXES[
            Math.floor(text.length % EMPATHETIC_PREFIXES.length)
          ];
        const suffix =
          EMPATHETIC_SUFFIXES[
            Math.floor(text.length % EMPATHETIC_SUFFIXES.length)
          ];
        return `${prefix}${t}${suffix}`;
      }

      case 'confident': {
        const prefix =
          CONFIDENT_PREFIXES[
            Math.floor(text.length % CONFIDENT_PREFIXES.length)
          ];
        const suffix =
          CONFIDENT_SUFFIXES[
            Math.floor(text.length % CONFIDENT_SUFFIXES.length)
          ];
        return `${prefix}${t}${suffix}`;
      }

      case 'academic': {
        let a = t.charAt(0).toLowerCase() + t.slice(1);
        ACADEMIC_TRANSFORMS.forEach(([rx, rep]) => {
          a = a.replace(rx, rep);
        });
        return `This evidence demonstrates that ${a} Consequently, systematic evaluation substantiates the empirical validity of these findings.`;
      }

      default:
        return t;
    }
  }

  /** Generate rewrite variations across all 7 tones simultaneously */
  public suggestTones(text: string): Record<ToneType, string> {
    const tones: ToneType[] = [
      'formal',
      'casual',
      'professional',
      'persuasive',
      'empathetic',
      'confident',
      'academic',
    ];
    return tones.reduce(
      (acc, tone) => {
        acc[tone] = this.adjustTone(text, tone);
        return acc;
      },
      {} as Record<ToneType, string>,
    );
  }

  /** Get the detected primary tone of text without a full analysis */
  public getTone(text: string): ToneType {
    return this.analyze(text).detectedTone;
  }

  /** Get sentiment only */
  public getSentiment(text: string): {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  } {
    const { sentimentScore, detectedSentiment } = this.analyze(text);
    return { score: sentimentScore, label: detectedSentiment };
  }

  /** Formality score only (0-100) */
  public getFormalityScore(text: string): number {
    return this.analyze(text).formalityScore;
  }

  // ---- Helpers ----
  private _countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    const m = word.match(/[aeiouy]+/g);
    return m ? m.length : 1;
  }

  private _emptyResult(): ToneAnalysisResult {
    return {
      formalityScore: 50,
      sentimentScore: 0,
      energyScore: 0,
      readabilityScore: 50,
      wordCount: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      detectedTone: 'casual',
      detectedSentiment: 'neutral',
      keywords: [],
      markers: {
        casualMarkers: [],
        formalMarkers: [],
        positiveWords: [],
        negativeWords: [],
      },
    };
  }
}

// Fix typo in const name used in class
const POSITIVE_WORD = POSITIVE_词;
