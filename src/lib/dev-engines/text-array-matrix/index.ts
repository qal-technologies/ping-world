// ============================================================
// Text & Array Matrix Engine — Comprehensive data transforms
// Sort, randomize, cut, case, type convert, math operations
// Full text analytics: readability, word freq, unique counts
// ============================================================

export type MatrixOpType =
  | 'sort'
  | 'randomize'
  | 'cut'
  | 'capEachSentence'
  | 'capEachWord'
  | 'toLower'
  | 'toUpper'
  | 'trim'
  | 'unique'
  | 'reverse'
  | 'flatten'
  | 'compact'
  | 'chunk'
  | 'zip'
  | 'count'
  | 'wordCount'
  | 'charCount'
  | 'min'
  | 'max'
  | 'sum'
  | 'avg'
  | 'median'
  | 'range'
  | 'product'
  | 'mode'
  | 'round'
  | 'ceil'
  | 'floor'
  | 'abs'
  | 'clamp'
  | 'normalize'
  | 'countWords'
  | 'countSentences'
  | 'dedup'
  | 'compact';

export type ConvertType =
  | 'number'
  | 'integer'
  | 'float'
  | 'text'
  | 'boolean'
  | 'json'
  | 'object'
  | 'array'
  | 'date'
  | 'csv';

export interface MatrixParams {
  start?: number;
  end?: number;
  length?: number;
  order?: 'asc' | 'desc';
  delimiter?: string;
  chunkSize?: number;
  min?: number; // For clamp
  max?: number; // For clamp
  precision?: number;
}

export interface TextAnalysisStats {
  wordCount: number;
  uniqueWordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  characterCount: number;
  characterCountNoSpaces: number;
  averageWordLength: number;
  averageSentenceLength: number; // words per sentence
  longestWord: string;
  shortestWord: string;
  mostFrequentWord: string;
  wordFrequency: Record<string, number>;
  numberCount: number;
  numbersFound: number[];
  sum: number;
  average: number;
  median: number;
  min: number | null;
  max: number | null;
  standardDeviation: number;
  readabilityScore: number; // Flesch score 0-100
  readabilityLabel:
    | 'very_easy'
    | 'easy'
    | 'fairly_easy'
    | 'standard'
    | 'fairly_difficult'
    | 'difficult'
    | 'very_difficult';
}

export interface ArrayStats {
  count: number;
  min: number | null;
  max: number | null;
  sum: number;
  average: number;
  median: number;
  mode: number | null;
  range: number;
  standardDeviation: number;
  variance: number;
  uniqueCount: number;
}

export class TextArrayMatrixEngine {
  /** Core matrix operation on arrays or strings */
  public matrixOp(
    data: any[] | string,
    op: MatrixOpType,
    params: MatrixParams = {},
  ): any {
    try {
      const isString = typeof data === 'string';
      const delim = params.delimiter !== undefined ? params.delimiter : ' ';
      let items: any[] =
        isString ? (data as string).split(params.delimiter ?? /\s+/)
        : Array.isArray(data) ? [...data]
        : [data];

      switch (op) {
        case 'sort':
          items.sort((a, b) => {
            const na = Number(a),
              nb = Number(b);
            if (!isNaN(na) && !isNaN(nb))
              return params.order === 'desc' ? nb - na : na - nb;
            return params.order === 'desc' ?
                String(b).localeCompare(String(a))
              : String(a).localeCompare(String(b));
          });
          break;

        case 'randomize':
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
          break;

        case 'cut': {
          const s = params.start ?? 0;
          const e =
            params.end ?? (params.length ? s + params.length : items.length);
          items = items.slice(s, e);
          break;
        }

        case 'capEachSentence':
          if (isString)
            return (data as string).replace(
              /(^|\.\s+|!\s+|\?\s+)([a-z])/g,
              (_, p1, p2) => p1 + p2.toUpperCase(),
            );
          items = items.map((x) =>
            typeof x === 'string' ?
              x.replace(
                /(^|\.\s+|!\s+|\?\s+)([a-z])/g,
                (_, p1, p2) => p1 + p2.toUpperCase(),
              )
            : x,
          );
          break;

        case 'capEachWord':
          if (isString)
            return (data as string).replace(/\b\w/g, (c) => c.toUpperCase());
          items = items.map((x) =>
            typeof x === 'string' ?
              x.replace(/\b\w/g, (c) => c.toUpperCase())
            : x,
          );
          break;

        case 'toLower':
          items = items.map((x) =>
            typeof x === 'string' ? x.toLowerCase() : x,
          );
          break;
        case 'toUpper':
          items = items.map((x) =>
            typeof x === 'string' ? x.toUpperCase() : x,
          );
          break;
        case 'trim':
          items = items.map((x) => (typeof x === 'string' ? x.trim() : x));
          break;
        case 'unique':
        case 'dedup':
          items = Array.from(new Set(items.map((x) => JSON.stringify(x)))).map(
            (x) => JSON.parse(x),
          );
          break;
        case 'reverse':
          items.reverse();
          break;
        case 'flatten':
          items = items.flat(Infinity);
          break;
        case 'compact':
          items = items.filter((x) => x != null && x !== '' && x !== false);
          break;

        case 'chunk': {
          const sz = params.chunkSize ?? 2;
          const chunks: any[][] = [];
          for (let i = 0; i < items.length; i += sz)
            chunks.push(items.slice(i, i + sz));
          return chunks;
        }

        case 'count':
          return items.length;
        case 'wordCount':
          return isString ?
              ((data as string).match(/\b\w+\b/g)?.length ?? 0)
            : items.length;
        case 'charCount':
          return isString ? (data as string).length : items.join('').length;
        case 'countWords':
          return isString ?
              ((data as string).match(/\b\w+\b/g)?.length ?? 0)
            : items.join(' ').split(/\s+/).length;
        case 'countSentences':
          return isString ?
              (data as string).split(/[.!?]+/).filter((s) => s.trim()).length
            : items.length;

        // Math operations
        case 'min': {
          const n = items.map(Number).filter((x) => !isNaN(x));
          return n.length ? Math.min(...n) : null;
        }
        case 'max': {
          const n = items.map(Number).filter((x) => !isNaN(x));
          return n.length ? Math.max(...n) : null;
        }
        case 'sum':
          return items
            .map(Number)
            .filter((x) => !isNaN(x))
            .reduce((a, b) => a + b, 0);
        case 'avg': {
          const n = items.map(Number).filter((x) => !isNaN(x));
          return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0;
        }
        case 'product':
          return items
            .map(Number)
            .filter((x) => !isNaN(x))
            .reduce((a, b) => a * b, 1);
        case 'median': {
          const n = items
            .map(Number)
            .filter((x) => !isNaN(x))
            .sort((a, b) => a - b);
          return (
            n.length ?
              n.length % 2 ?
                n[Math.floor(n.length / 2)]
              : (n[n.length / 2 - 1] + n[n.length / 2]) / 2
            : 0
          );
        }
        case 'mode': {
          const n = items.map(Number).filter((x) => !isNaN(x));
          const freq: Record<number, number> = {};
          n.forEach((v) => (freq[v] = (freq[v] ?? 0) + 1));
          return n.length ?
              Number(
                Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0,
              )
            : 0;
        }
        case 'range': {
          const n = items.map(Number).filter((x) => !isNaN(x));
          return n.length ? Math.max(...n) - Math.min(...n) : 0;
        }
        case 'round':
          items = items.map((x) => {
            const n = Number(x);
            return isNaN(n) ? x : Number(n.toFixed(params.precision ?? 2));
          });
          break;
        case 'ceil':
          items = items.map((x) => {
            const n = Number(x);
            return isNaN(n) ? x : Math.ceil(n);
          });
          break;
        case 'floor':
          items = items.map((x) => {
            const n = Number(x);
            return isNaN(n) ? x : Math.floor(n);
          });
          break;
        case 'abs':
          items = items.map((x) => {
            const n = Number(x);
            return isNaN(n) ? x : Math.abs(n);
          });
          break;
        case 'clamp': {
          const lo = params.min ?? 0,
            hi = params.max ?? 100;
          items = items.map((x) => {
            const n = Number(x);
            return isNaN(n) ? x : Math.min(hi, Math.max(lo, n));
          });
          break;
        }
        case 'normalize': {
          const n = items.map(Number).filter((x) => !isNaN(x));
          const lo = Math.min(...n),
            hi = Math.max(...n),
            rn = hi - lo || 1;
          items = items.map((x) => {
            const v = Number(x);
            return isNaN(v) ? x : Number(((v - lo) / rn).toFixed(4));
          });
          break;
        }
      }

      if (isString && Array.isArray(items)) return items.join(delim);
      return items;
    } catch {
      return data;
    }
  }

  /** Convert a value to a specified type */
  public convert(value: any, targetType: ConvertType): any {
    try {
      switch (targetType) {
        case 'integer': {
          const n = parseInt(String(value), 10);
          return isNaN(n) ? 0 : n;
        }
        case 'number':
        case 'float': {
          const n = parseFloat(String(value));
          return isNaN(n) ? 0.0 : n;
        }
        case 'text':
          return typeof value === 'object' ?
              JSON.stringify(value)
            : String(value);
        case 'boolean': {
          if (typeof value === 'boolean') return value;
          const s = String(value).toLowerCase().trim();
          return s === 'true' || s === '1' || s === 'yes';
        }
        case 'json':
          return JSON.stringify(value, null, 2);
        case 'object': {
          if (typeof value === 'object' && !Array.isArray(value)) return value;
          try {
            return JSON.parse(String(value));
          } catch {
            return { value };
          }
        }
        case 'array': {
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try {
              const p = JSON.parse(value);
              return Array.isArray(p) ? p : [value];
            } catch {
              return value.split(',').map((s) => s.trim());
            }
          }
          return [value];
        }
        case 'date': {
          const d = new Date(value);
          return isNaN(d.getTime()) ? null : d.toISOString();
        }
        case 'csv': {
          if (Array.isArray(value)) return value.join(',');
          if (typeof value === 'object') return Object.values(value).join(',');
          return String(value);
        }
        default:
          return value;
      }
    } catch {
      return value;
    }
  }

  /** Full text analysis with stats, readability, word frequency */
  public analyzeText(text: string): TextAnalysisStats {
    try {
      if (!text || typeof text !== 'string') return this._emptyTextStats();

      const words = text.match(/\b\w+\b/g) ?? [];
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const paragraphs = text
        .split(/\n{2,}/)
        .filter((p) => p.trim().length > 0);
      const numbers = (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

      // Word frequency
      const freq: Record<string, number> = {};
      words.forEach((w) => {
        const l = w.toLowerCase();
        freq[l] = (freq[l] ?? 0) + 1;
      });
      const mostFrequent =
        Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

      // Word lengths
      const lens = words.map((w) => w.length);
      const longestWord = words.reduce(
        (a, b) => (a.length >= b.length ? a : b),
        '',
      );
      const shortestWord = words.reduce(
        (a, b) => (a.length <= b.length ? a : b),
        words[0] ?? '',
      );

      // Number stats
      const numsum = numbers.reduce((a, b) => a + b, 0);
      const numavg = numbers.length ? numsum / numbers.length : 0;
      const sorted = [...numbers].sort((a, b) => a - b);
      const nummed =
        numbers.length ?
          numbers.length % 2 ?
            sorted[Math.floor(numbers.length / 2)]
          : (sorted[numbers.length / 2 - 1] + sorted[numbers.length / 2]) / 2
        : 0;
      const numstd =
        numbers.length ?
          Math.sqrt(
            numbers.reduce((a, v) => a + (v - numavg) ** 2, 0) / numbers.length,
          )
        : 0;

      // Readability (Flesch-Kincaid)
      const syllables = words.reduce(
        (acc, w) => acc + this._countSyllables(w),
        0,
      );
      const wc = words.length;
      const sc = Math.max(1, sentences.length);
      const fk =
        wc > 0 ? 206.835 - 1.015 * (wc / sc) - 84.6 * (syllables / wc) : 50;
      const readability = Math.max(0, Math.min(100, Math.round(fk)));
      const readLabel =
        readability >= 90 ? 'very_easy'
        : readability >= 80 ? 'easy'
        : readability >= 70 ? 'fairly_easy'
        : readability >= 60 ? 'standard'
        : readability >= 50 ? 'fairly_difficult'
        : readability >= 30 ? 'difficult'
        : 'very_difficult';

      return {
        wordCount: wc,
        uniqueWordCount: Object.keys(freq).length,
        sentenceCount: sc,
        paragraphCount: Math.max(1, paragraphs.length),
        characterCount: text.length,
        characterCountNoSpaces: text.replace(/\s/g, '').length,
        averageWordLength:
          wc > 0 ?
            Number((lens.reduce((a, b) => a + b, 0) / wc).toFixed(2))
          : 0,
        averageSentenceLength: Number((wc / sc).toFixed(2)),
        longestWord,
        shortestWord,
        mostFrequentWord: mostFrequent,
        wordFrequency: freq,
        numberCount: numbers.length,
        numbersFound: numbers,
        sum: Number(numsum.toFixed(4)),
        average: Number(numavg.toFixed(4)),
        median: Number(nummed.toFixed(4)),
        min: numbers.length ? Math.min(...numbers) : null,
        max: numbers.length ? Math.max(...numbers) : null,
        standardDeviation: Number(numstd.toFixed(4)),
        readabilityScore: readability,
        readabilityLabel: readLabel as any,
      };
    } catch {
      return this._emptyTextStats();
    }
  }

  /** Statistical analysis of a numeric array */
  public analyzeArray(arr: number[]): ArrayStats {
    try {
      const nums = arr.filter((x) => !isNaN(Number(x))).map(Number);
      if (nums.length === 0)
        return {
          count: 0,
          min: null,
          max: null,
          sum: 0,
          average: 0,
          median: 0,
          mode: null,
          range: 0,
          standardDeviation: 0,
          variance: 0,
          uniqueCount: 0,
        };
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = sum / nums.length;
      const med =
        nums.length % 2 ?
          sorted[Math.floor(nums.length / 2)]
        : (sorted[nums.length / 2 - 1] + sorted[nums.length / 2]) / 2;
      const variance =
        nums.reduce((a, v) => a + (v - avg) ** 2, 0) / nums.length;
      const freq: Record<number, number> = {};
      nums.forEach((v) => {
        freq[v] = (freq[v] ?? 0) + 1;
      });
      const mode = Number(
        Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0],
      );
      const rng = Math.max(...nums) - Math.min(...nums);
      return {
        count: nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
        sum: Number(sum.toFixed(4)),
        average: Number(avg.toFixed(4)),
        median: Number(med.toFixed(4)),
        mode: isNaN(mode) ? null : mode,
        range: Number(rng.toFixed(4)),
        standardDeviation: Number(Math.sqrt(variance).toFixed(4)),
        variance: Number(variance.toFixed(4)),
        uniqueCount: new Set(nums).size,
      };
    } catch {
      return {
        count: 0,
        min: null,
        max: null,
        sum: 0,
        average: 0,
        median: 0,
        mode: null,
        range: 0,
        standardDeviation: 0,
        variance: 0,
        uniqueCount: 0,
      };
    }
  }

  /** Interpolate between two values (linear) */
  public lerp(a: number, b: number, t: number): number {
    return Number((a + (b - a) * Math.max(0, Math.min(1, t))).toFixed(4));
  }

  /** Map a number from one range to another */
  public mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
  ): number {
    return Number(
      (
        ((value - inMin) / (inMax - inMin)) * (outMax - outMin) +
        outMin
      ).toFixed(4),
    );
  }

  // ---- Helpers ----
  private _countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    const m = word.match(/[aeiouy]+/g);
    return m ? m.length : 1;
  }

  private _emptyTextStats(): TextAnalysisStats {
    return {
      wordCount: 0,
      uniqueWordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      characterCount: 0,
      characterCountNoSpaces: 0,
      averageWordLength: 0,
      averageSentenceLength: 0,
      longestWord: '',
      shortestWord: '',
      mostFrequentWord: '',
      wordFrequency: {},
      numberCount: 0,
      numbersFound: [],
      sum: 0,
      average: 0,
      median: 0,
      min: null,
      max: null,
      standardDeviation: 0,
      readabilityScore: 50,
      readabilityLabel: 'standard',
    };
  }
}
