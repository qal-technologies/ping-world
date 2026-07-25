export interface AutoCorrectConfig {
  sensitivity?: 'low' | 'medium' | 'high';
  language?: string;
  customDictionary?: string[];
  maxSuggestions?: number;
}

export interface AutoCorrectResult {
  originalText: string;
  correctedText: string;
  corrections: Array<{
    word: string;
    suggestion: string;
    index: number;
    confidence: number;
    reason: string;
  }>;
  suggestions: string[];
}

const EXPANDED_DICTIONARY: Record<string, string> = {
  teh: 'the',
  taht: 'that',
  recieve: 'receive',
  seperate: 'separate',
  definately: 'definitely',
  untill: 'until',
  occurred: 'occurred',
  accross: 'across',
  thier: 'their',
  whith: 'with',
  beacuse: 'because',
  goverment: 'government',
  enviroment: 'environment',
  tommorow: 'tomorrow',
  referance: 'reference',
  performace: 'performance',
  usefull: 'useful',
  succefully: 'successfully',
  persond: 'person',
  prodctivity: 'productivity',
  devloper: 'developer',
  funciton: 'function',
  sysem: 'system',
  scracth: 'scratch',
  impolemented: 'implemented',
  parrmaters: 'parameters',
  customixation: 'customization',
  nethids: 'methods',
  prtopely: 'properly',
  nmeant: 'meant',
  thhta: 'that',
  actuall: 'actual',
  depedning: 'depending',
  parramaters: 'parameters',
  parm: 'param',
  speach: 'speech',
  beleive: 'believe',
  acchieve: 'achieve',
  accomodate: 'accommodate',
  adress: 'address',
  writting: 'writing',
  runing: 'running',
  codeing: 'coding',
  algoritm: 'algorithm',
  exampel: 'example',
  visualizer: 'visualizer',
  interactive: 'interactive',
  documentation: 'documentation',
};

const COMMON_ENGLISH_WORDS = [
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'i',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'up',
  'out',
  'if',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'when',
  'make',
  'can',
  'like',
  'time',
  'no',
  'just',
  'him',
  'know',
  'take',
  'people',
  'into',
  'year',
  'your',
  'good',
  'some',
  'could',
  'them',
  'see',
  'other',
  'than',
  'then',
  'now',
  'look',
  'only',
  'come',
  'its',
  'over',
  'think',
  'also',
  'back',
  'after',
  'use',
  'two',
  'how',
  'our',
  'work',
  'first',
  'well',
  'way',
  'even',
  'new',
  'want',
  'because',
  'any',
  'these',
  'give',
  'day',
  'most',
  'us',
  'developer',
  'function',
  'method',
  'system',
  'scratch',
  'implemented',
  'parameters',
  'customization',
  'productivity',
  'alert',
  'audio',
  'sound',
  'location',
  'color',
  'image',
  'visual',
  'representation',
  'interactive',
  'playground',
  'documentation',
  'text',
  'analysis',
  'output',
];

export class AutoCorrectEngine {
  private dictionary: Set<string>;
  private replacements: Map<string, string>;

  constructor(customWords: string[] = []) {
    this.dictionary = new Set([
      ...COMMON_ENGLISH_WORDS,
      ...customWords.map((w) => w.toLowerCase()),
    ]);
    this.replacements = new Map(Object.entries(EXPANDED_DICTIONARY));
  }

  public analyze(
    text: string,
    config: AutoCorrectConfig = {},
  ): AutoCorrectResult {
    try {
      if (!text || typeof text !== 'string') {
        return {
          originalText: text || '',
          correctedText: text || '',
          corrections: [],
          suggestions: [],
        };
      }

      const words = text.split(/(\s+|[^\w\s])/);
      const corrections: AutoCorrectResult['corrections'] = [];
      const suggestionsSet = new Set<string>();

      let charOffset = 0;
      const correctedWords = words.map((chunk) => {
        const lower = chunk.toLowerCase();

        if (/^\w+$/.test(chunk)) {
          // Direct dictionary replacement lookup
          if (this.replacements.has(lower)) {
            const suggestion = this.preserveCase(
              chunk,
              this.replacements.get(lower)!,
            );
            corrections.push({
              word: chunk,
              suggestion,
              index: charOffset,
              confidence: 0.98,
              reason: 'Common typo',
            });
            suggestionsSet.add(suggestion);
            charOffset += chunk.length;
            return suggestion;
          }

          // Soundex & Levenshtein fallback for words > 2 chars
          if (chunk.length > 2 && !this.dictionary.has(lower)) {
            const closest = this.findClosestWord(lower);
            if (closest && closest.distance <= 2) {
              const suggestion = this.preserveCase(chunk, closest.word);
              corrections.push({
                word: chunk,
                suggestion,
                index: charOffset,
                confidence: 0.85,
                reason: 'Phonetic match',
              });
              suggestionsSet.add(suggestion);
              charOffset += chunk.length;
              return suggestion;
            }
          }
        }

        charOffset += chunk.length;
        return chunk;
      });

      return {
        originalText: text,
        correctedText: correctedWords.join(''),
        corrections,
        suggestions: Array.from(suggestionsSet).slice(
          0,
          config.maxSuggestions || 8,
        ),
      };
    } catch (e) {
      return {
        originalText: text || '',
        correctedText: text || '',
        corrections: [],
        suggestions: [],
      };
    }
  }

  public correct(text: string, config: AutoCorrectConfig = {}): string {
    return this.analyze(text, config).correctedText;
  }

  public suggest(text: string, config: AutoCorrectConfig = {}): string[] {
    return this.analyze(text, config).suggestions;
  }

  public attachToLayout(selector = 'input[type="text"], textarea'): void {
    if (typeof window === 'undefined') return;
    try {
      const elements = document.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
      >(selector);
      elements.forEach((el) => {
        el.addEventListener('blur', () => {
          if (el.value) {
            el.value = this.correct(el.value);
          }
        });
      });
    } catch (e) {}
  }

  private preserveCase(original: string, target: string): string {
    if (original === original.toUpperCase()) return target.toUpperCase();
    if (original[0] === original[0].toUpperCase()) {
      return target.charAt(0).toUpperCase() + target.slice(1);
    }
    return target;
  }

  private findClosestWord(
    word: string,
  ): { word: string; distance: number } | null {
    let minDistance = Infinity;
    let closest: string | null = null;
    const wordSoundex = this.soundex(word);

    for (const dictWord of this.dictionary) {
      // Fast check if Soundex matches
      const isSoundexMatch = this.soundex(dictWord) === wordSoundex;
      const distance = this.levenshtein(word, dictWord);

      if (isSoundexMatch && distance <= 3) {
        return { word: dictWord, distance };
      }

      if (distance < minDistance) {
        minDistance = distance;
        closest = dictWord;
      }
    }

    return closest ? { word: closest, distance: minDistance } : null;
  }

  private soundex(word: string): string {
    const a = word.toLowerCase().split('');
    const firstLetter = a[0];

    const codes: Record<string, string> = {
      a: '',
      e: '',
      i: '',
      o: '',
      u: '',
      y: '',
      h: '',
      w: '',
      b: '1',
      f: '1',
      p: '1',
      v: '1',
      c: '2',
      g: '2',
      j: '2',
      k: '2',
      q: '2',
      s: '2',
      x: '2',
      z: '2',
      d: '3',
      t: '3',
      l: '4',
      m: '5',
      n: '5',
      r: '6',
    };

    const soundex = a
      .map((char) => codes[char] || '')
      .filter((char, index, array) =>
        index === 0 ? true : char !== array[index - 1],
      )
      .join('');

    return (firstLetter + soundex.slice(1) + '000').slice(0, 4).toUpperCase();
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
