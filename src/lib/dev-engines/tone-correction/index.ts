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
  keywords: string[];
}

export class ToneCorrectionEngine {
  public analyze(text: string): ToneAnalysisResult {
    try {
      if (!text || typeof text !== 'string') {
        return {
          formalityScore: 50,
          sentimentScore: 0,
          wordCount: 0,
          sentenceCount: 0,
          detectedTone: 'casual',
          keywords: [],
        };
      }

      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

      let formality = 50;
      let sentiment = 0;

      // Casual markers
      const casualMarkers = [
        'hey',
        'bro',
        'cool',
        'awesome',
        'gotta',
        'wanna',
        'yeah',
        'lol',
        'asap',
        'guys',
        'gonna',
      ];
      // Formal markers
      const formalMarkers = [
        'furthermore',
        'accordingly',
        'consequently',
        'sincerely',
        'regarding',
        'herewith',
        'pursuant',
        'kindly',
      ];
      // Positive sentiment
      const positiveWords = [
        'great',
        'excellent',
        'happy',
        'awesome',
        'wonderful',
        'perfect',
        'thanks',
        'good',
        'best',
      ];
      // Negative sentiment
      const negativeWords = [
        'bad',
        'error',
        'bug',
        'failed',
        'issue',
        'problem',
        'terrible',
        'worst',
        'urgent',
      ];

      words.forEach((w) => {
        if (casualMarkers.includes(w)) formality -= 10;
        if (formalMarkers.includes(w)) formality += 12;
        if (positiveWords.includes(w)) sentiment += 0.2;
        if (negativeWords.includes(w)) sentiment -= 0.2;
      });

      formality = Math.max(0, Math.min(100, formality));
      sentiment = Math.max(-1, Math.min(1, Number(sentiment.toFixed(2))));

      let detectedTone: ToneType = 'casual';
      if (formality > 75) detectedTone = 'academic';
      else if (formality > 60) detectedTone = 'formal';
      else if (formality > 45) detectedTone = 'professional';

      return {
        formalityScore: formality,
        sentimentScore: sentiment,
        wordCount: words.length,
        sentenceCount: Math.max(1, sentences.length),
        detectedTone,
        keywords: Array.from(new Set(words)).slice(0, 6),
      };
    } catch (e) {
      return {
        formalityScore: 50,
        sentimentScore: 0,
        wordCount: 0,
        sentenceCount: 0,
        detectedTone: 'casual',
        keywords: [],
      };
    }
  }

  public adjustTone(
    text: string,
    targetTone: ToneType = 'professional',
  ): string {
    if (!text) return text;
    let t = text.trim();

    // Common replacements per tone
    switch (targetTone) {
      case 'formal':
      case 'professional':
        t = t
          .replace(/\bhey guys\b/gi, 'Dear Colleagues')
          .replace(/\bhey\b/gi, 'Greetings')
          .replace(/\bbro\b/gi, 'colleague')
          .replace(/\bgotta\b/gi, 'must')
          .replace(/\bwanna\b/gi, 'wish to')
          .replace(/\basap\b/gi, 'at your earliest convenience')
          .replace(/\bthanks\b/gi, 'Thank you')
          .replace(/\bawesome\b/gi, 'exemplary')
          .replace(/\bcool\b/gi, 'satisfactory');
        if (!t.endsWith('.')) t += '.';
        return t;

      case 'casual':
        t = t
          .replace(/\bGreetings\b/gi, 'Hey')
          .replace(/\bDear Colleagues\b/gi, 'Hey guys')
          .replace(/\bat your earliest convenience\b/gi, 'ASAP')
          .replace(/\bThank you\b/gi, 'Thanks')
          .replace(/\bmust\b/gi, 'gotta');
        return t;

      case 'persuasive':
        return `Unlock key benefits today: ${t} Take action now to maximize productivity!`;

      case 'empathetic':
        return `We completely understand your experience: ${t} We are here to support you every step of the way.`;

      case 'confident':
        return `We guarantee exceptional results: ${t} Executed with complete precision and authority.`;

      case 'academic':
        return `Systematic examination demonstrates that ${t.toLowerCase()} Consequently, empirical verification confirms operational efficiency.`;

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
