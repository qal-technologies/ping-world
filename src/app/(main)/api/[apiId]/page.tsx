'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  Terminal,
  Play,
  Copy,
  Check,
  ArrowLeft,
  Code,
  Zap,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  BookOpen,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import AudioVisualizer from '@/components/dev-engines/AudioVisualizer';
import AlertToastRenderer from '@/components/dev-engines/AlertToastRenderer';
import EmailPreviewer from '@/components/dev-engines/EmailPreviewer';
import ImageEditStudio from '@/components/dev-engines/ImageEditStudio';
import StylingPreviewer from '@/components/dev-engines/StylingPreviewer';
import ColorDevTool from '@/components/dev-engines/ColorDevTool';

export interface MethodDoc {
  name: string;
  description: string;
  parameters: string;
  returns: string;
  sampleInput: any;
  sampleParams?: any;
  allowedOptions?: string[];
  guideArticle: string;
}

export interface ApiFullMeta {
  name: string;
  description: string;
  methods: MethodDoc[];
}

const ENGINE_METADATA: Record<string, ApiFullMeta> = {
  autocorrect: {
    name: 'AutoCorrect Engine',
    description:
      'Industry-standard typo correction engine with Soundex phonetic matching, Levenshtein edit distance, POS grammar rules, and layout input focus integration.',
    methods: [
      {
        name: 'analyze',
        description:
          'Parses text, computes Soundex phonetic match & Levenshtein distance, returning detailed typo corrections and confidence metrics.',
        parameters: 'text: string, config?: AutoCorrectConfig',
        returns: 'AutoCorrectResult',
        sampleInput: 'Taht devloper funciton is very usefull.',
        allowedOptions: [
          'sensitivity: "low" | "medium" | "high"',
          'language: "en"',
          'maxSuggestions: number',
        ],
        guideArticle:
          'The analyze method breaks input text into tokens, preserves punctuation, and queries an expanded English dictionary. If a direct match is missing, it evaluates Soundex phonetic similarity before applying weighted Levenshtein edit distance scoring.',
      },
      {
        name: 'correct',
        description:
          'Returns auto-corrected text string directly with case preservation.',
        parameters: 'text: string, config?: AutoCorrectConfig',
        returns: 'string',
        sampleInput: 'recieve taht reference tommorow',
        allowedOptions: ['sensitivity: "medium"', 'maxSuggestions: 5'],
        guideArticle:
          'The correct method returns the sanitized string with corrected word tokens, retaining initial uppercase formatting where present.',
      },
      {
        name: 'suggest',
        description: 'Returns top word suggestions for misspelled terms.',
        parameters: 'text: string, config?: AutoCorrectConfig',
        returns: 'string[]',
        sampleInput: 'prodctivity',
        allowedOptions: ['maxSuggestions: 8'],
        guideArticle:
          'Returns an array of candidate word corrections ranked by phonetic similarity and edit distance.',
      },
      {
        name: 'attachToLayout',
        description:
          'Attaches focus/blur event listeners to DOM text inputs to automatically fix typos on blur.',
        parameters: 'selector?: string',
        returns: 'void',
        sampleInput: 'input[type="text"], textarea',
        allowedOptions: ['selector: "input[type=\'text\']"'],
        guideArticle:
          'Utility method for client-side DOM integration. Attaches event listeners to input elements that correct misspelled values automatically on blur.',
      },
    ],
  },
  'color-suggestion': {
    name: 'Color Suggestion Engine',
    description:
      'Format detection (HEX/RGB/HSL), 140+ CSS named colors mapping, nearest named color finder, match % comparison, contrast ratio, and shade generator.',
    methods: [
      {
        name: 'detect',
        description:
          'Parses HEX/RGB/HSL or color name, returns nearest CSS color name, HSL, RGB, and luminance.',
        parameters: 'colorStr: string',
        returns: 'ColorFormatDetails',
        sampleInput: '#00f0ff',
        allowedOptions: ['Format: HEX | RGB | HSL | CSS Named Color'],
        guideArticle:
          'Parses any standard color string, normalizes short hex codes (e.g. #0f0 -> #00ff00), and calculates relative luminance for contrast math.',
      },
      {
        name: 'findNearestNamedColor',
        description:
          'Finds exact or closest CSS web color name for any RGB/Hex value.',
        parameters: 'rgb: { r: number, g: number, b: number }',
        returns: '{ name: string, hex: string, distance: number }',
        sampleInput: { r: 0, g: 240, b: 255 },
        allowedOptions: ['r: 0..255', 'g: 0..255', 'b: 0..255'],
        guideArticle:
          'Performs 3D Euclidean distance calculations across 140+ standard CSS web color names to find the closest human-readable color match.',
      },
      {
        name: 'compare',
        description:
          'Compares two colors for similarity %, contrast ratio, and WCAG AA/AAA accessibility compliance.',
        parameters: 'colorA: string, colorB: string',
        returns: 'ColorMatchResult',
        sampleInput: '#00f0ff',
        sampleParams: '#111625',
        allowedOptions: ['colorA: HEX/RGB/HSL', 'colorB: HEX/RGB/HSL'],
        guideArticle:
          'Evaluates color contrast ratios according to WCAG 2.1 specifications (4.5:1 for AA compliance, 7:1 for AAA compliance).',
      },
      {
        name: 'suggestShades',
        description: 'Generates array of monochromatic color shades.',
        parameters: 'colorStr: string, count?: number',
        returns: 'string[]',
        sampleInput: '#00f0ff',
        sampleParams: 6,
        allowedOptions: ['count: 2..10'],
        guideArticle:
          'Generates evenly spaced monochromatic lightness shades in HSL space for UI design systems.',
      },
    ],
  },
  'country-data': {
    name: 'Country Data Engine',
    description:
      'Multi-alias resolution (ISO 2, ISO 3, numeric code, dial code, country name) returning flag emoji, currencies, and dial codes.',
    methods: [
      {
        name: 'getCountry',
        description:
          'Looks up country by ISO 2/3 code, dial code, numeric code, or common aliases (e.g. ng, ngn, 234 -> Nigeria).',
        parameters: 'query: string',
        returns: 'CountryData | null',
        sampleInput: 'ng',
        allowedOptions: ['Query: "NG", "NGA", "234", "+234", "NGN", "Nigeria"'],
        guideArticle:
          'Searches multi-alias array. Enables developers to pass shorthand codes like "ng" or "+234" to obtain full country metadata.',
      },
      {
        name: 'searchCountries',
        description:
          'Searches countries by partial name, currency, or dial code keyword.',
        parameters: 'keyword: string',
        returns: 'CountryData[]',
        sampleInput: '+234',
        allowedOptions: ['Keyword: partial string or phone prefix'],
        guideArticle:
          'Filters global country repository by matching partial country names, currency symbols, or international dialing prefixes.',
      },
      {
        name: 'getAllCountries',
        description: 'Returns full array of global country records.',
        parameters: 'none',
        returns: 'CountryData[]',
        sampleInput: '',
        guideArticle:
          'Returns complete catalog of supported countries with flags, currencies, and ISO codes.',
      },
    ],
  },
  'tone-correction': {
    name: 'Tone Correction Engine',
    description:
      'Formality score (0-100), sentiment score (-1.0 to 1.0), and text rewriting across 7 tones.',
    methods: [
      {
        name: 'analyze',
        description:
          'Measures formality score, sentiment score, word counts, and detected tone.',
        parameters: 'text: string',
        returns: 'ToneAnalysisResult',
        sampleInput: 'Hey bro, we gotta fix this bug ASAP!',
        guideArticle:
          'Parses casual vs formal vocabulary markers to return formality and sentiment metrics.',
      },
      {
        name: 'adjustTone',
        description:
          'Rewrites text into target tone (formal, casual, professional, persuasive, empathetic, confident, academic).',
        parameters: 'text: string, targetTone: ToneType',
        returns: 'string',
        sampleInput: 'Hey guys, check out this awesome tool!',
        sampleParams: 'professional',
        allowedOptions: [
          'targetTone: "formal" | "casual" | "professional" | "persuasive" | "empathetic" | "confident" | "academic"',
        ],
        guideArticle:
          'Applies vocabulary transformation rules to rephrase input text into chosen tone.',
      },
      {
        name: 'suggestTones',
        description:
          'Generates text variations across all 7 supported tones simultaneously.',
        parameters: 'text: string',
        returns: 'Record<ToneType, string>',
        sampleInput: 'Please send over the report by end of day.',
        guideArticle:
          'Generates a dictionary containing rewrites across all 7 tone types.',
      },
    ],
  },
  'audio-editing': {
    name: 'Audio Editing API',
    description:
      'Web Audio synthesizer, waveform tone generator (sine, square, sawtooth, triangle), volume gain adjustment, and WAV export.',
    methods: [
      {
        name: 'generateTone',
        description:
          'Plays audio tone at specified frequency, duration, waveform, and volume.',
        parameters:
          'frequencyHz: number, durationSec?: number, waveType?: string, volume?: number',
        returns: 'ToneResult',
        sampleInput: 440,
        sampleParams: 1.5,
        allowedOptions: [
          'waveType: "sine" | "square" | "sawtooth" | "triangle"',
          'frequencyHz: 20..20000',
          'volume: 0.0..1.0',
        ],
        guideArticle:
          'Uses HTML5 Web Audio OscillatorNode and GainNode to synthesize audio in real time.',
      },
      {
        name: 'exportWAV',
        description:
          'Exports generated tone as downloadable WAV audio PCM binary blob.',
        parameters:
          'frequencyHz: number, durationSec?: number, waveType?: string',
        returns: 'Blob',
        sampleInput: 440,
        sampleParams: 2.0,
        allowedOptions: [
          'waveType: "sine" | "square" | "sawtooth" | "triangle"',
        ],
        guideArticle:
          'Constructs a 44-byte RIFF/WAVE header and encodes Float32 audio samples to 16-bit PCM binary data.',
      },
    ],
  },
  'email-engine': {
    name: 'Email Template Engine',
    description:
      'Responsive HTML email template builder (OTP, professional, marketing, social, information) with custom primary color and element controls.',
    methods: [
      {
        name: 'generateTemplate',
        description: 'Generates clean, responsive HTML email body string.',
        parameters: 'type: EmailTemplateType, params: EmailTemplateParams',
        returns: 'string',
        sampleInput: 'professional',
        sampleParams: {
          title: 'Security Alert',
          body: 'Your account was accessed from a new device.',
          ctaText: 'Review Activity',
          ctaUrl: 'https://pingworld.dev',
          primaryColor: '#00f0ff',
        },
        allowedOptions: [
          'type: "professional" | "otp" | "marketing" | "social" | "information"',
        ],
        guideArticle:
          'Produces responsive HTML tables compatible with Gmail, Outlook, Apple Mail, and mobile email clients.',
      },
    ],
  },
  'alerting-toast': {
    name: 'Alert & Toast Engine',
    description:
      'Audio-visual alert system with Web Audio chime sound, haptic vibration API, screen flash, and accessibility.',
    methods: [
      {
        name: 'trigger',
        description:
          'Triggers audio-visual toast notification with chime sound and screen flash.',
        parameters: 'config: AlertConfig',
        returns: 'AlertResult',
        sampleInput: {
          title: 'System Success',
          message: 'Operation completed successfully.',
          type: 'success',
          sound: 'chime',
          flashScreen: true,
        },
        allowedOptions: [
          'type: "info" | "success" | "warning" | "error"',
          'sound: "chime" | "beep" | "alarm"',
        ],
        guideArticle:
          'Executes browser DOM toast renderers while simultaneously triggering Web Audio synthesis and Navigator vibration API.',
      },
    ],
  },
  'styling-engine': {
    name: 'Styling Engine',
    description:
      'Auto CSS decorator engine for liquid glass, glassmorphism, buttons, paddings, and DOM script injection.',
    methods: [
      {
        name: 'generateCSS',
        description:
          'Generates global CSS stylesheet string for buttons, glass, and layout utilities.',
        parameters: 'config?: StylingConfig',
        returns: 'string',
        sampleInput: { primaryColor: '#00f0ff', theme: 'cyber' },
        allowedOptions: ['theme: "cyber" | "glass" | "dark" | "light"'],
        guideArticle:
          'Generates responsive CSS tokens, glassmorphism backdrop filters, and utility classes.',
      },
      {
        name: 'injectToDOM',
        description: 'Injects stylesheet element directly into document head.',
        parameters: 'config?: StylingConfig',
        returns: 'HTMLStyleElement | void',
        sampleInput: { primaryColor: '#00f0ff', theme: 'cyber' },
        guideArticle:
          'Injects style element with id "pingworld_styling_engine" into document head.',
      },
    ],
  },
  'db-validation': {
    name: 'DB Validation Handler',
    description:
      'Type-safe schema validator supporting intuitive `?` optional key syntax (e.g. `age?: "number"` or `"bio?": "string"`) and automatic null fallbacks.',
    methods: [
      {
        name: 'validateAndSanitize',
        description:
          'Validates object against concise `?` schema, coercing types and assigning null fallbacks for optional missing keys.',
        parameters: 'data: object, schema: ConciseDbSchema',
        returns: 'DbValidationResult',
        sampleInput: { name: 'John Doe', age: '28' },
        sampleParams: { name: 'string', 'age?': 'number', 'bio?': 'string' },
        allowedOptions: [
          'types: "string" | "number" | "boolean" | "date" | "json" | "array" | "object"',
          'suffix "?": marks field optional',
        ],
        guideArticle:
          'Normalizes schema key definitions. If key ends with "?", the handler automatically permits missing values and populates null defaults.',
      },
    ],
  },
};

export default function ApiDocsPlaygroundPage({
  params,
}: {
  params: Promise<{ apiId: string }>;
}) {
  const { apiId } = use(params);
  const meta = ENGINE_METADATA[apiId] || {
    name: `${apiId.toUpperCase()} API`,
    description: 'Developer productivity engine tool.',
    methods: [
      {
        name: 'execute',
        description: 'Primary engine action method.',
        parameters: 'data: any',
        returns: 'any',
        sampleInput: 'Sample Input',
        guideArticle: 'Primary execution routine for developer tool engine.',
      },
    ],
  };

  const [selectedMethodName, setSelectedMethodName] = useState(
    meta.methods[0]?.name || 'execute',
  );
  const activeMethod =
    meta.methods.find((m) => m.name === selectedMethodName) || meta.methods[0];

  const [dataInput, setDataInput] = useState(
    typeof activeMethod.sampleInput === 'object' ?
      JSON.stringify(activeMethod.sampleInput, null, 2)
    : String(activeMethod.sampleInput || ''),
  );
  const [paramInput, setParamInput] = useState(
    typeof activeMethod.sampleParams === 'object' ?
      JSON.stringify(activeMethod.sampleParams, null, 2)
    : String(activeMethod.sampleParams || ''),
  );

  const [outputMode, setOutputMode] = useState<'json' | 'text'>('json');
  const [loading, setLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleMethodChange = (name: string) => {
    setSelectedMethodName(name);
    const m = meta.methods.find((x) => x.name === name);
    if (m) {
      setDataInput(
        typeof m.sampleInput === 'object' ?
          JSON.stringify(m.sampleInput, null, 2)
        : String(m.sampleInput || ''),
      );
      setParamInput(
        typeof m.sampleParams === 'object' ?
          JSON.stringify(m.sampleParams, null, 2)
        : String(m.sampleParams || ''),
      );
    }
  };

  const handleRunApi = async () => {
    setLoading(true);
    try {
      let parsedData = dataInput;
      try {
        parsedData = JSON.parse(dataInput);
      } catch {}

      let parsedParam = paramInput;
      try {
        parsedParam = JSON.parse(paramInput);
      } catch {}

      const res = await fetch(`/api/call/${apiId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethodName,
          data: parsedData,
          params: parsedParam,
        }),
      });

      const json = await res.json();
      setResponseOutput(json);
      if (json.success)
        toast.success(`API Execution Completed in ${json.executionTimeMs}ms`);
      else toast.error(json.error || 'API Execution Error');
    } catch (err) {
      setResponseOutput({ success: false, error: (err as Error).message });
      toast.error('Network or Execution Error');
    } finally {
      setLoading(false);
    }
  };

  const tsCode = `import { ${meta.name.replace(/\s+/g, '')} } from '@/lib/dev-engines/${apiId}';\n\nconst engine = new ${meta.name.replace(/\s+/g, '')}();\nconst result = await engine.${selectedMethodName}(${dataInput || '...'});\nconsole.log(result);`;

  const copySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Snippet copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className='container mx-auto py-12 max-w-7xl px-4 min-h-screen'>
      {/* Back link */}
      <Link
        href='/api'
        className='inline-flex items-center gap-2 text-pw-muted hover:text-pw-primary transition-colors text-sm mb-6 font-mono'>
        <ArrowLeft className='h-4 w-4' />
        Back to Developer APIs Hub
      </Link>

      {/* Header */}
      <div className='mb-10'>
        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pw-primary/10 border border-pw-primary/20 text-pw-primary text-xs font-mono mb-3'>
          <Zap className='h-3.5 w-3.5' />
          Endpoint: /api/call/{apiId}
        </div>
        <h1 className='text-3xl md:text-5xl font-extrabold font-display mb-3'>
          {meta.name}
        </h1>
        <p className='text-pw-muted text-base max-w-3xl leading-relaxed'>
          {meta.description}
        </p>
      </div>

      {/* EMBED VISUAL DEV TOOLS */}
      <div className='mb-10 space-y-6'>
        {apiId === 'audio-editing' && <AudioVisualizer />}
        {apiId === 'alerting-toast' && <AlertToastRenderer />}
        {apiId === 'email-engine' && <EmailPreviewer />}
        {apiId === 'image-editing' && <ImageEditStudio />}
        {apiId === 'styling-engine' && <StylingPreviewer />}
        {apiId === 'color-suggestion' && <ColorDevTool />}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Left: Interactive Runner */}
        <Card className='card-glow bkblur p-6 flex flex-col gap-6'>
          <div className='flex justify-between items-center border-b border-white/5 pb-4'>
            <h3 className='text-lg font-bold font-display flex items-center gap-2'>
              <Play className='h-4 w-4 text-pw-primary' />
              Interactive Method Playground
            </h3>
            <span className='text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold'>
              Edge Serverless Ready
            </span>
          </div>

          <div>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted mb-2 block'>
              Select Engine Method
            </label>
            <select
              value={selectedMethodName}
              onChange={(e) => handleMethodChange(e.target.value)}
              className='w-full h-11 rounded-xl bg-pw-surface/50 border border-white/10 px-4 font-mono text-sm text-pw-text focus:outline-none focus:border-pw-primary cursor-pointer'>
              {meta.methods.map((m) => (
                <option
                  key={m.name}
                  value={m.name}
                  className='bg-pw-surface text-pw-text'>
                  {m.name} ({m.parameters})
                </option>
              ))}
            </select>
          </div>

          {/* Allowed Options List */}
          {activeMethod.allowedOptions && (
            <div className='p-3 rounded-xl bg-pw-primary/5 border border-pw-primary/20'>
              <span className='text-[10px] font-bold font-mono text-pw-primary uppercase block mb-1.5 flex items-center gap-1'>
                <Sliders className='h-3 w-3' />
                Permitted Parameter Options & Value Enums:
              </span>
              <ul className='list-disc list-inside text-xs font-mono text-pw-muted space-y-1'>
                {activeMethod.allowedOptions.map((opt, idx) => (
                  <li key={idx}>
                    <span className='text-pw-text'>{opt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted mb-2 block'>
              Primary Input Data
            </label>
            <textarea
              rows={4}
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              className='w-full rounded-xl bg-pw-surface/50 border border-white/10 p-3 font-mono text-xs text-pw-text focus:outline-none focus:border-pw-primary'
            />
          </div>

          <div>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted mb-2 block'>
              Secondary Options / Params
            </label>
            <textarea
              rows={2}
              value={paramInput}
              onChange={(e) => setParamInput(e.target.value)}
              placeholder='Options or secondary parameters'
              className='w-full rounded-xl bg-pw-surface/50 border border-white/10 p-3 font-mono text-xs text-pw-text focus:outline-none focus:border-pw-primary'
            />
          </div>

          <Button
            onClick={handleRunApi}
            disabled={loading}
            className='w-full h-12 btn-primary font-bold text-sm shadow-lg shadow-pw-primary/20 gap-2'>
            {loading ?
              <RefreshCw className='h-4 w-4 animate-spin' />
            : <Play className='h-4 w-4 fill-current' />}
            Execute {selectedMethodName}() Method
          </Button>

          {/* Response Console */}
          {responseOutput && (
            <div className='mt-4 border-t border-white/5 pt-4'>
              <div className='flex justify-between items-center mb-3'>
                <span className='text-xs font-bold font-mono text-pw-muted flex items-center gap-1.5'>
                  {responseOutput.success ?
                    <CheckCircle2 className='h-3.5 w-3.5 text-emerald-400' />
                  : <AlertTriangle className='h-3.5 w-3.5 text-rose-400' />}
                  Execution Output
                </span>
                <div className='flex items-center gap-2'>
                  <div className='flex rounded-lg bg-white/5 p-1 border border-white/10'>
                    <button
                      onClick={() => setOutputMode('json')}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono ${outputMode === 'json' ? 'bg-pw-primary text-black font-bold' : 'text-pw-muted'}`}>
                      JSON
                    </button>
                    <button
                      onClick={() => setOutputMode('text')}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono ${outputMode === 'text' ? 'bg-pw-primary text-black font-bold' : 'text-pw-muted'}`}>
                      Plain Text
                    </button>
                  </div>
                  {responseOutput.executionTimeMs !== undefined && (
                    <span className='text-[10px] font-mono text-pw-muted'>
                      {responseOutput.executionTimeMs} ms
                    </span>
                  )}
                </div>
              </div>

              {outputMode === 'json' ?
                <pre className='p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[320px]'>
                  {JSON.stringify(responseOutput, null, 2)}
                </pre>
              : <div className='p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-pw-text overflow-x-auto max-h-[320px] whitespace-pre-wrap leading-relaxed'>
                  {typeof responseOutput.data === 'object' ?
                    JSON.stringify(responseOutput.data, null, 2)
                  : String(responseOutput.data || responseOutput.error || '')}
                </div>
              }
            </div>
          )}
        </Card>

        {/* Right: Detailed Blog-Style Documentation */}
        <div className='flex flex-col gap-6'>
          <Card className='card-glow bkblur p-6'>
            <h3 className='text-lg font-bold font-display flex items-center gap-2 mb-4 border-b border-white/5 pb-3'>
              <BookOpen className='h-5 w-5 text-pw-primary' />
              Detailed Developer Guide & API Reference
            </h3>
            <div className='space-y-6 max-h-[520px] overflow-y-auto pr-2'>
              {meta.methods.map((m) => (
                <div
                  key={m.name}
                  onClick={() => handleMethodChange(m.name)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    selectedMethodName === m.name ?
                      'bg-pw-primary/10 border-pw-primary/50 shadow-lg'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='font-mono font-bold text-base text-pw-primary'>
                      {m.name}()
                    </span>
                    <span className='text-[10px] font-mono text-pw-muted bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full'>
                      Returns: {m.returns}
                    </span>
                  </div>
                  <p className='text-xs text-pw-muted mb-3 leading-relaxed'>
                    {m.description}
                  </p>

                  {/* Blog Article Guide */}
                  <div className='p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-pw-text leading-relaxed mb-3'>
                    <span className='text-[10px] font-bold uppercase text-pw-muted block mb-1 font-mono'>
                      // Developer Deep-Dive:
                    </span>
                    {m.guideArticle}
                  </div>

                  <div className='text-[11px] font-mono text-pw-muted bg-black/60 p-2.5 rounded-lg border border-white/5'>
                    Signature:{' '}
                    <span className='text-pw-text font-bold'>
                      {m.name}({m.parameters})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className='card-glow bkblur p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-sm font-bold font-display flex items-center gap-2'>
                <Code className='h-4 w-4 text-pw-primary' />
                TypeScript Integration Snippet
              </h3>
              <Button
                onClick={() => copySnippet(tsCode)}
                variant='ghost'
                size='sm'
                className='h-8 text-xs border border-white/10 gap-1'>
                {copiedCode ?
                  <Check className='h-3.5 w-3.5 text-emerald-400' />
                : <Copy className='h-3.5 w-3.5' />}
                Copy TS Code
              </Button>
            </div>
            <pre className='p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-pw-muted overflow-x-auto'>
              {tsCode}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
