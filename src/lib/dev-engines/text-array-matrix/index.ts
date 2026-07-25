export type MatrixOpType = 
  | 'sort'
  | 'randomize'
  | 'cut'
  | 'capEachSentence'
  | 'toLower'
  | 'toUpper'
  | 'min'
  | 'max'
  | 'sum'
  | 'avg'
  | 'unique'
  | 'reverse';

export type TargetType = 'number' | 'text' | 'float' | 'boolean' | 'json' | 'object' | 'array';

export interface MatrixParams {
  start?: number;
  end?: number;
  length?: number;
  order?: 'asc' | 'desc';
  delimiter?: string;
}

export interface TextAnalysisStats {
  wordCount: number;
  sentenceCount: number;
  characterCount: number;
  numberCount: number;
  numbersFound: number[];
  minNumber: number | null;
  maxNumber: number | null;
  sum: number;
  average: number;
}

export class TextArrayMatrixEngine {
  public matrixOp(data: any[] | string, op: MatrixOpType, params: MatrixParams = {}): any {
    try {
      const isString = typeof data === 'string';
      let items: any[] = isString 
        ? (params.delimiter ? (data as string).split(params.delimiter) : (data as string).split(/\s+/))
        : Array.isArray(data) ? [...data] : [data];

      switch (op) {
        case 'sort':
          items.sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) {
              return params.order === 'desc' ? numB - numA : numA - numB;
            }
            return params.order === 'desc' 
              ? String(b).localeCompare(String(a)) 
              : String(a).localeCompare(String(b));
          });
          break;

        case 'randomize':
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
          break;

        case 'cut':
          const start = params.start || 0;
          const end = params.end !== undefined ? params.end : (params.length ? start + params.length : items.length);
          items = items.slice(start, end);
          break;

        case 'capEachSentence':
          if (isString) {
            return (data as string).replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
          }
          items = items.map(item => typeof item === 'string' 
            ? item.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
            : item
          );
          break;

        case 'toLower':
          items = items.map(i => typeof i === 'string' ? i.toLowerCase() : i);
          break;

        case 'toUpper':
          items = items.map(i => typeof i === 'string' ? i.toUpperCase() : i);
          break;

        case 'min':
          const numsMin = items.map(Number).filter(n => !isNaN(n));
          return numsMin.length ? Math.min(...numsMin) : 0;

        case 'max':
          const numsMax = items.map(Number).filter(n => !isNaN(n));
          return numsMax.length ? Math.max(...numsMax) : 0;

        case 'sum':
          return items.map(Number).filter(n => !isNaN(n)).reduce((acc, curr) => acc + curr, 0);

        case 'avg':
          const numsAvg = items.map(Number).filter(n => !isNaN(n));
          return numsAvg.length ? numsAvg.reduce((acc, curr) => acc + curr, 0) / numsAvg.length : 0;

        case 'unique':
          items = Array.from(new Set(items));
          break;

        case 'reverse':
          items.reverse();
          break;
      }

      return isString ? items.join(params.delimiter !== undefined ? params.delimiter : ' ') : items;
    } catch (e) {
      return data;
    }
  }

  public convert(value: any, targetType: TargetType): any {
    try {
      switch (targetType) {
        case 'number':
          const n = parseInt(String(value), 10);
          return isNaN(n) ? 0 : n;

        case 'float':
          const f = parseFloat(String(value));
          return isNaN(f) ? 0.0 : f;

        case 'text':
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);

        case 'boolean':
          if (typeof value === 'string') {
            const l = value.toLowerCase().trim();
            if (l === 'true' || l === '1' || l === 'yes') return true;
            if (l === 'false' || l === '0' || l === 'no') return false;
          }
          return Boolean(value);

        case 'json':
          return JSON.stringify(value, null, 2);

        case 'object':
          if (typeof value === 'object' && value !== null) return value;
          return JSON.parse(String(value));

        case 'array':
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try { return JSON.parse(value); } catch { return value.split(','); }
          }
          return [value];

        default:
          return value;
      }
    } catch (e) {
      return value;
    }
  }

  public analyzeText(text: string): TextAnalysisStats {
    try {
      if (!text || typeof text !== 'string') {
        return {
          wordCount: 0,
          sentenceCount: 0,
          characterCount: 0,
          numberCount: 0,
          numbersFound: [],
          minNumber: null,
          maxNumber: null,
          sum: 0,
          average: 0,
        };
      }

      const words = text.trim().split(/\s+/).filter(Boolean);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      const numberMatches = text.match(/-?\d+(\.\d+)?/g) || [];
      const numbersFound = numberMatches.map(Number);
      
      const sum = numbersFound.reduce((acc, curr) => acc + curr, 0);
      const minNumber = numbersFound.length ? Math.min(...numbersFound) : null;
      const maxNumber = numbersFound.length ? Math.max(...numbersFound) : null;
      const average = numbersFound.length ? sum / numbersFound.length : 0;

      return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        characterCount: text.length,
        numberCount: numbersFound.length,
        numbersFound,
        minNumber,
        maxNumber,
        sum,
        average: Number(average.toFixed(2)),
      };
    } catch (e) {
      return {
        wordCount: 0, sentenceCount: 0, characterCount: 0, numberCount: 0,
        numbersFound: [], minNumber: null, maxNumber: null, sum: 0, average: 0,
      };
    }
  }
}
