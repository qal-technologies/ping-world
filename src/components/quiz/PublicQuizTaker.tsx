'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  ChevronLeft,
  Brain,
  Clock,
  AlertTriangle,
  FileText,
  BookOpen,
  Star,
  StickyNote,
  ShieldCheck,
  MessageCircle,
  EyeOff,
  Lock,
  LogOut,
  HelpCircle,
  Folder,
  Flag,
  Diamond,
  Badge,
  Trophy,
  X,
  SkipForward,
  LoaderCircle,
  Atom,
  Search,
  Copy,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HybridStorage } from '@/lib/storage-utils';
import { optimizeImageForStorage } from '@/lib/media-optimization';
import { capFirst, cn } from '@/lib/utils';
import React from 'react';
import {
  quizHaptic,
  type Question,
  type Quiz,
  type QuizOption,
} from '@/app/(main)/quiz';
import { useParams } from 'next/navigation';
import { usePageLayout } from '@/components/layout';
import { useAppContext } from '@/context/AppContext';
import { useAppModal } from '../ui/AppModalProvider';

import {
  resolvePipedText,
  evaluateQuizCondition,
  packPingWorldMediaUrl,
  unpackPingWorldMediaUrl,
  formatDobToWords,
  getDobGetter,
} from '@/lib/quiz/quiz-piping';
import { parseWhitelistedHtml } from '@/lib/quiz/text-parser';
import {
  playQuizStartTone,
  playQuizCompletionTone,
} from '@/lib/quiz/quiz-audio';
import { triggerConfetti } from '@/lib/confetti';
import { detectClientGeo } from '@/lib/countries/geo-detector';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';
import { DEFAULT_PINGWORLD_SHOWCASE_QUIZ } from '@/lib/quiz/default-quiz-template';
import Image from 'next/image';

function getAssessmentDeviceKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const keyName = 'pw_assessment_device_key_v1';
    let key = localStorage.getItem(keyName);
    if (!key) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      localStorage.setItem(keyName, key);
    }
    return key;
  } catch {
    return '';
  }
}

function getPrivateQuizAccessToken(quizId: string): string {
  try {
    return sessionStorage.getItem(`pw_private_quiz_access_v1_${quizId}`) || '';
  } catch {
    return '';
  }
}

function describeAcceptedFiles(accept = '') {
  const value = accept.toLowerCase();
  const labels = [
    value.includes('image') || /\.(png|jpe?g|gif|webp|svg|avif)/.test(value) ?
      'images'
    : '',
    value.includes('video') || /\.(mp4|mov|webm|mkv)/.test(value) ?
      'videos'
    : '',
    value.includes('audio') || /\.(mp3|wav|m4a|ogg|aac)/.test(value) ?
      'audio'
    : '',
    /\.(pdf|docx?|txt|rtf|odt)/.test(value) || value.includes('pdf') ?
      'documents'
    : '',
    /\.(zip|7z|rar)/.test(value) ? 'archives' : '',
  ].filter(Boolean);
  return labels.length ? labels.join(', ') : accept || 'supported files';
}

const NoteSheet = ({ note }: { note: string }) => {
  const [personalNote, setPersonalNote] = useState('');
  return (
    <Card className='w-full max-w-2xl rounded-2xl border-white/10 bg-pw-surface p-4 shadow-2xl bkblur sm:p-6'>
      <div className='mb-4 flex items-center gap-2 text-pw-primary'>
        <StickyNote size={20} />
        <h3 className='text-xs font-bold uppercase tracking-widest'>
          Reference Notes
        </h3>
      </div>
      {note.trim() ?
        <div className='mb-4 max-h-[35vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/15 p-4 text-sm leading-relaxed text-pw-text'>
          {note}
        </div>
      : <p className='mb-4 rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-pw-muted'>
          No reference note was provided for this question.
        </p>
      }
      <label
        className='mb-2 block text-xs font-semibold text-pw-muted'
        htmlFor='quiz-personal-notes'>
        Your scratch notes (only kept while this question is open)
      </label>
      <textarea
        id='quiz-personal-notes'
        value={personalNote}
        onChange={(event) => setPersonalNote(event.target.value)}
        maxLength={5000}
        placeholder='Write working notes here…'
        className='min-h-32 w-full resize-y rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-pw-text outline-none focus:border-pw-primary/60'
      />
      <p className='mt-1 text-right text-[10px] text-pw-muted'>
        {personalNote.length}/5000
      </p>
    </Card>
  );
};

const PERIODIC_ELEMENTS =
  `Hydrogen|H,Helium|He,Lithium|Li,Beryllium|Be,Boron|B,Carbon|C,Nitrogen|N,Oxygen|O,Fluorine|F,Neon|Ne,Sodium|Na,Magnesium|Mg,Aluminium|Al,Silicon|Si,Phosphorus|P,Sulfur|S,Chlorine|Cl,Argon|Ar,Potassium|K,Calcium|Ca,Scandium|Sc,Titanium|Ti,Vanadium|V,Chromium|Cr,Manganese|Mn,Iron|Fe,Cobalt|Co,Nickel|Ni,Copper|Cu,Zinc|Zn,Gallium|Ga,Germanium|Ge,Arsenic|As,Selenium|Se,Bromine|Br,Krypton|Kr,Rubidium|Rb,Strontium|Sr,Yttrium|Y,Zirconium|Zr,Niobium|Nb,Molybdenum|Mo,Technetium|Tc,Ruthenium|Ru,Rhodium|Rh,Palladium|Pd,Silver|Ag,Cadmium|Cd,Indium|In,Tin|Sn,Antimony|Sb,Tellurium|Te,Iodine|I,Xenon|Xe,Caesium|Cs,Barium|Ba,Lanthanum|La,Cerium|Ce,Praseodymium|Pr,Neodymium|Nd,Promethium|Pm,Samarium|Sm,Europium|Eu,Gadolinium|Gd,Terbium|Tb,Dysprosium|Dy,Holmium|Ho,Erbium|Er,Thulium|Tm,Ytterbium|Yb,Lutetium|Lu,Hafnium|Hf,Tantalum|Ta,Tungsten|W,Rhenium|Re,Osmium|Os,Iridium|Ir,Platinum|Pt,Gold|Au,Mercury|Hg,Thallium|Tl,Lead|Pb,Bismuth|Bi,Polonium|Po,Astatine|At,Radon|Rn,Francium|Fr,Radium|Ra,Actinium|Ac,Thorium|Th,Protactinium|Pa,Uranium|U,Neptunium|Np,Plutonium|Pu,Americium|Am,Curium|Cm,Berkelium|Bk,Californium|Cf,Einsteinium|Es,Fermium|Fm,Mendelevium|Md,Nobelium|No,Lawrencium|Lr,Rutherfordium|Rf,Dubnium|Db,Seaborgium|Sg,Bohrium|Bh,Hassium|Hs,Meitnerium|Mt,Darmstadtium|Ds,Roentgenium|Rg,Copernicium|Cn,Nihonium|Nh,Flerovium|Fl,Moscovium|Mc,Livermorium|Lv,Tennessine|Ts,Oganesson|Og`
    .split(',')
    .map((entry, index) => {
      const [name, symbol] = entry.split('|');
      const atomicNumber = index + 1;
      let period = 1;
      let group = 1;
      if (atomicNumber === 2) {
        period = 1;
        group = 18;
      } else if (atomicNumber >= 3 && atomicNumber <= 4) {
        period = 2;
        group = atomicNumber - 2;
      } else if (atomicNumber >= 5 && atomicNumber <= 10) {
        period = 2;
        group = atomicNumber + 8;
      } else if (atomicNumber >= 11 && atomicNumber <= 12) {
        period = 3;
        group = atomicNumber - 10;
      } else if (atomicNumber >= 13 && atomicNumber <= 18) {
        period = 3;
        group = atomicNumber;
      } else if (atomicNumber >= 19 && atomicNumber <= 36) {
        period = 4;
        group = atomicNumber - 18;
      } else if (atomicNumber >= 37 && atomicNumber <= 54) {
        period = 5;
        group = atomicNumber - 36;
      } else if (atomicNumber >= 55 && atomicNumber <= 56) {
        period = 6;
        group = atomicNumber - 54;
      } else if (atomicNumber >= 57 && atomicNumber <= 71) {
        period = 8;
        group = atomicNumber - 54;
      } else if (atomicNumber >= 72 && atomicNumber <= 86) {
        period = 6;
        group = atomicNumber - 68;
      } else if (atomicNumber >= 87 && atomicNumber <= 88) {
        period = 7;
        group = atomicNumber - 86;
      } else if (atomicNumber >= 89 && atomicNumber <= 103) {
        period = 9;
        group = atomicNumber - 86;
      } else if (atomicNumber >= 104) {
        period = 7;
        group = atomicNumber - 100;
      }
      const category =
        [2, 10, 18, 36, 54, 86, 118].includes(atomicNumber) ? 'Noble gas'
        : [3, 11, 19, 37, 55, 87].includes(atomicNumber) ? 'Alkali metal'
        : [4, 12, 20, 38, 56, 88].includes(atomicNumber) ? 'Alkaline earth'
        : [9, 17, 35, 53, 85, 117].includes(atomicNumber) ? 'Halogen'
        : [1, 6, 7, 8, 15, 16, 34].includes(atomicNumber) ? 'Nonmetal'
        : atomicNumber >= 57 && atomicNumber <= 71 ? 'Lanthanide'
        : atomicNumber >= 89 && atomicNumber <= 103 ? 'Actinide'
        : (
          (atomicNumber >= 21 && atomicNumber <= 30) ||
          (atomicNumber >= 39 && atomicNumber <= 48) ||
          (atomicNumber >= 72 && atomicNumber <= 80) ||
          (atomicNumber >= 104 && atomicNumber <= 112)
        ) ?
          'Transition metal'
        : [5, 14, 32, 33, 51, 52].includes(atomicNumber) ? 'Metalloid'
        : 'Post-transition metal';
      return { atomicNumber, name, symbol, period, group, category };
    });

const PeriodicTable = () => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(PERIODIC_ELEMENTS[5]);
  const filtered =
    query.trim() ?
      PERIODIC_ELEMENTS.filter((element) =>
        `${element.atomicNumber} ${element.symbol} ${element.name} ${element.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : PERIODIC_ELEMENTS;
  const matches = new Set(filtered.map((element) => element.atomicNumber));
  const colors: Record<string, string> = {
    'Noble gas': 'text-sky-300 border-sky-400/30 bg-sky-400/10',
    'Alkali metal': 'text-rose-300 border-rose-400/30 bg-rose-400/10',
    'Alkaline earth': 'text-orange-300 border-orange-400/30 bg-orange-400/10',
    Halogen: 'text-violet-300 border-violet-400/30 bg-violet-400/10',
    Nonmetal: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
    Lanthanide: 'text-pink-300 border-pink-400/30 bg-pink-400/10',
    Actinide: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10',
    'Transition metal': 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10',
    Metalloid: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
    'Post-transition metal':
      'text-slate-300 border-slate-400/30 bg-slate-400/10',
  };
  return (
    <Card className='m-2 w-full max-w-6xl border-white/10 bg-pw-surface p-3 shadow-2xl bkblur sm:p-5'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2 text-pw-cyan'>
          <Atom size={20} />
          <h3 className='text-xs font-bold uppercase tracking-widest'>
            Periodic Table · 118 Elements
          </h3>
        </div>
        <div className='relative w-full max-w-xs'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pw-muted' />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Find name, symbol, or number'
            aria-label='Search periodic table'
            className='pl-9 bg-black/20'
          />
        </div>
      </div>
      <div className='overflow-x-auto pb-3 custom-scrollbar'>
        <div
          className='grid min-w-[760px] grid-cols-[repeat(18,minmax(34px,1fr))] gap-1'
          style={{ gridAutoRows: 'minmax(42px,auto)' }}>
          {PERIODIC_ELEMENTS.map((element) => (
            <button
              key={element.atomicNumber}
              type='button'
              onClick={() => setSelected(element)}
              title={`${element.name} · ${element.category}`}
              aria-label={`${element.name}, atomic number ${element.atomicNumber}`}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center rounded-md border p-0.5 text-center transition hover:z-10 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pw-primary',
                colors[element.category],
                !matches.has(element.atomicNumber) && 'opacity-20',
              )}
              style={{ gridColumn: element.group, gridRow: element.period }}>
              <span className='w-full text-left text-[8px] leading-none opacity-65'>
                {element.atomicNumber}
              </span>
              <strong className='text-xs leading-tight'>
                {element.symbol}
              </strong>
              <span className='hidden w-full truncate text-[7px] opacity-70 xl:block'>
                {element.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className='mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/15 p-3'>
        <div className='min-w-24 text-2xl font-black text-pw-cyan'>
          {selected.symbol}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-bold'>
            {selected.name}{' '}
            <span className='font-normal text-pw-muted'>
              #{selected.atomicNumber}
            </span>
          </p>
          <p className='text-xs text-pw-muted'>
            {selected.category} · Period{' '}
            {selected.period > 7 ?
              selected.period === 8 ?
                '6 (lanthanide)'
              : '7 (actinide)'
            : selected.period}{' '}
            · Group {selected.group}
          </p>
        </div>
        <p className='w-full text-[10px] text-pw-muted sm:w-auto'>
          Select an element for details · Search dims non-matching elements
        </p>
      </div>
    </Card>
  );
};

const FormulaSheet = ({
  config,
  customFormulas,
}: {
  config?: { categories?: string[] };
  customFormulas?: string;
}) => {
  const allFormulas = [
    {
      cat: 'Math',
      items: [
        { n: 'Area of Circle', f: 'πr²' },
        { n: 'Pythagoras', f: 'a² + b² = c²' },
        { n: 'Quadratic', f: '(-b ± √(b²-4ac)) / 2a' },
      ],
    },
    {
      cat: 'Physics',
      items: [
        { n: 'Force', f: 'F = ma' },
        { n: 'Energy', f: 'E = mc²' },
        { n: "Ohm's Law", f: 'V = IR' },
      ],
    },
    {
      cat: 'Chemistry',
      items: [
        { n: 'Ideal Gas Law', f: 'PV = nRT' },
        { n: 'Molarity', f: 'M = n/V' },
        { n: 'Density', f: 'ρ = m/v' },
      ],
    },
  ];

  const allowedCategories = config?.categories || [
    'Math',
    'Physics',
    'Chemistry',
  ];
  const formulas = allFormulas.filter((group) =>
    allowedCategories.includes(group.cat),
  );

  const parsedCustomFormulas = (customFormulas || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        return { n: parts[0].trim(), f: parts.slice(1).join('=').trim() };
      }
      return { n: 'Custom', f: line.trim() };
    });

  if (parsedCustomFormulas.length > 0) {
    formulas.push({ cat: 'Custom', items: parsedCustomFormulas });
  }

  return (
    <Card className='p-4 bg-pw-surface bkblur border-white/10 shadow-2xl m-2 max-w-sm max-h-[400px] overflow-y-auto custom-scrollbar'>
      <div className='flex items-center gap-2 mb-4 text-pw-primary'>
        <FileText size={18} />
        <h3 className='font-bold uppercase tracking-widest text-xs'>
          Formula Sheet
        </h3>
      </div>
      <div className='space-y-6'>
        {formulas.map((group, idx) => (
          <div
            key={group.cat + idx}
            className='space-y-2'>
            <h4 className='text-[8px] font-black text-pw-muted uppercase tracking-[0.3em] border-b border-white/5 pb-1'>
              {group.cat}
            </h4>
            <div className='space-y-2'>
              {group.items.map((item, idx) => (
                <div
                  key={item.n + item.f + idx}
                  className='flex justify-between items-center group'>
                  <span className='text-[10px] text-pw-text opacity-70 group-hover:opacity-100 transition-opacity'>
                    {item.n}
                  </span>
                  <button
                    type='button'
                    title={`Copy ${item.n}`}
                    onClick={() => {
                      void navigator.clipboard
                        ?.writeText(item.f)
                        .then(() => toast.success('Formula copied.'))
                        .catch(() => toast.error('Could not copy formula.'));
                    }}
                    className='flex items-center gap-1 rounded bg-pw-primary/5 px-2 py-1 font-mono text-[10px] text-pw-primary hover:bg-pw-primary/15'>
                    {item.f}
                    <Copy className='h-3 w-3' />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {formulas.length === 0 && (
          <p className='text-xs text-pw-muted italic text-center'>
            No formulas available.
          </p>
        )}
      </div>
    </Card>
  );
};

const Glossary = ({ terms = '' }: { terms?: string }) => {
  const [filter, setFilter] = useState('');
  const entries = terms
    .split(/\r?\n/)
    .map((line) => {
      const separator = line.search(/\s[=:—-]\s/);
      return separator < 0 ? null : (
          {
            word: line.slice(0, separator).trim(),
            definition: line.slice(separator + 3).trim(),
          }
        );
    })
    .filter((entry): entry is { word: string; definition: string } =>
      Boolean(entry?.word && entry.definition),
    );
  const builtIns = [
    {
      word: 'Hypothesis',
      definition: 'A proposed explanation that can be tested through evidence.',
    },
    {
      word: 'Variable',
      definition: 'A factor that can change or be changed in an investigation.',
    },
    { word: 'Velocity', definition: 'Speed in a specified direction.' },
    {
      word: 'Inference',
      definition: 'A conclusion drawn from observations and evidence.',
    },
    {
      word: 'Evidence',
      definition: 'Information used to support or challenge a claim.',
    },
  ];
  const visible = (entries.length ? entries : builtIns).filter((entry) =>
    `${entry.word} ${entry.definition}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );
  return (
    <Card className='m-2 w-full max-w-2xl border-white/10 bg-pw-surface p-4 shadow-2xl bkblur sm:p-6'>
      <div className='mb-4 flex items-center gap-2 text-pw-success'>
        <BookOpen size={20} />
        <h3 className='text-xs font-bold uppercase tracking-widest'>
          Glossary
        </h3>
      </div>
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder='Search terms…'
        aria-label='Search glossary'
        className='mb-4 bg-black/20'
      />
      <div className='max-h-[65vh] space-y-3 overflow-y-auto pr-2 custom-scrollbar'>
        {visible.map((entry) => (
          <article
            key={entry.word}
            className='rounded-xl border border-white/5 bg-white/[.03] p-3'>
            <h4 className='mb-1 font-bold text-pw-success'>{entry.word}</h4>
            <p className='text-sm leading-relaxed text-pw-muted'>
              {entry.definition}
            </p>
          </article>
        ))}
        {!visible.length && (
          <p className='py-8 text-center text-sm text-pw-muted'>
            No matching terms.
          </p>
        )}
      </div>
      {terms.trim() && (
        <p className='mt-3 text-[10px] text-pw-muted'>
          Custom terms supplied for this assessment.
        </p>
      )}
    </Card>
  );
};

type CalculatorAngleMode = 'DEG' | 'RAD';

function evaluateCalculatorExpression(
  expression: string,
  angleMode: CalculatorAngleMode,
): number {
  if (!expression.trim() || expression.length > 160)
    throw new Error('Enter an expression under 160 characters.');
  const tokens: string[] = [];
  const scanner = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([a-zA-Z]+)|([()+\-*/%^!,]))/gy;
  let scanIndex = 0;
  while (scanIndex < expression.length) {
    scanner.lastIndex = scanIndex;
    const match = scanner.exec(expression);
    if (!match) throw new Error('Unsupported character in expression.');
    tokens.push(match[1] || match[2]?.toLowerCase() || match[3]);
    scanIndex = scanner.lastIndex;
  }
  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const expect = (value: string) => {
    if (take() !== value) throw new Error(`Expected “${value}”.`);
  };
  const toRadians = (value: number) =>
    angleMode === 'DEG' ? (value * Math.PI) / 180 : value;
  const fromRadians = (value: number) =>
    angleMode === 'DEG' ? (value * 180) / Math.PI : value;
  const functions: Record<string, (args: number[]) => number> = {
    sin: ([x]) => Math.sin(toRadians(x)),
    cos: ([x]) => Math.cos(toRadians(x)),
    tan: ([x]) => Math.tan(toRadians(x)),
    asin: ([x]) => fromRadians(Math.asin(x)),
    acos: ([x]) => fromRadians(Math.acos(x)),
    atan: ([x]) => fromRadians(Math.atan(x)),
    sqrt: ([x]) => Math.sqrt(x),
    cbrt: ([x]) => Math.cbrt(x),
    abs: ([x]) => Math.abs(x),
    ln: ([x]) => Math.log(x),
    log: ([x]) => Math.log10(x),
    exp: ([x]) => Math.exp(x),
    floor: ([x]) => Math.floor(x),
    ceil: ([x]) => Math.ceil(x),
    round: ([x, digits = 0]) => {
      const scale = 10 ** Math.max(-10, Math.min(10, digits));
      return Math.round(x * scale) / scale;
    },
    min: (args) => Math.min(...args),
    max: (args) => Math.max(...args),
    pow: ([x, y]) => x ** y,
  };
  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const next = parseTerm();
      value = operator === '+' ? value + next : value - next;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const operator = take();
      const next = parseUnary();
      if ((operator === '/' || operator === '%') && next === 0)
        throw new Error('Cannot divide by zero.');
      value =
        operator === '*' ? value * next
        : operator === '/' ? value / next
        : value % next;
    }
    return value;
  };
  const parseUnary = (): number => {
    if (peek() === '+') {
      take();
      return parseUnary();
    }
    if (peek() === '-') {
      take();
      return -parseUnary();
    }
    return parsePower();
  };
  const parsePower = (): number => {
    const base = parsePostfix();
    if (peek() === '^') {
      take();
      return base ** parseUnary();
    }
    return base;
  };
  const parsePostfix = (): number => {
    let value = parsePrimary();
    while (peek() === '!') {
      take();
      if (!Number.isInteger(value) || value < 0 || value > 170)
        throw new Error('Factorial needs a whole number from 0 to 170.');
      let product = 1;
      for (let number = 2; number <= value; number++) product *= number;
      value = product;
    }
    return value;
  };
  const parsePrimary = (): number => {
    const token = take();
    if (token === '(') {
      const value = parseExpression();
      expect(')');
      return value;
    }
    if (token && /^\d+(?:\.\d*)?$|^\.\d+$/.test(token)) return Number(token);
    if (!token || !/^[a-z]+$/.test(token))
      throw new Error('Check the expression syntax.');
    if (token === 'pi') return Math.PI;
    if (token === 'e') return Math.E;
    if (!(token in functions) || peek() !== '(')
      throw new Error(`Unknown function or constant “${token}”.`);
    take();
    const args: number[] = [];
    if (peek() !== ')') {
      args.push(parseExpression());
      while (peek() === ',') {
        take();
        args.push(parseExpression());
      }
    }
    expect(')');
    if (
      token === 'min' || token === 'max' ? args.length < 1
      : token === 'pow' ? args.length !== 2
      : token === 'round' ? args.length < 1 || args.length > 2
      : args.length !== 1
    )
      throw new Error(`Wrong number of values for ${token}().`);
    return functions[token](args);
  };
  const value = parseExpression();
  if (cursor !== tokens.length) throw new Error('Check the expression syntax.');
  if (!Number.isFinite(value))
    throw new Error('The result is outside the supported range.');
  return value;
}

const CALCULATOR_KEYS = [
  'sin(',
  'cos(',
  'tan(',
  'asin(',
  'acos(',
  'atan(',
  'sqrt(',
  'cbrt(',
  'log(',
  'ln(',
  'abs(',
  'min(',
  'max(',
  'pow(',
  'π',
  'e',
  'x²',
  '^',
  '!',
  '(',
  ')',
  'C',
  'DEL',
  '÷',
  '×',
  '7',
  '8',
  '9',
  '−',
  '4',
  '5',
  '6',
  '+',
  '1',
  '2',
  '3',
  '%',
  '0',
  '.',
  'Ans',
  '=',
];

const Calculator = () => {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [angleMode, setAngleMode] = useState<CalculatorAngleMode>('DEG');
  const calculate = useCallback(
    (expression: string) => {
      try {
        const number = evaluateCalculatorExpression(
          expression
            .replaceAll('×', '*')
            .replaceAll('÷', '/')
            .replaceAll('−', '-')
            .replaceAll('π', 'pi'),
          angleMode,
        );
        const formatted = Number(number.toPrecision(12)).toString();
        setResult(formatted);
        setError('');
        return formatted;
      } catch (cause) {
        setResult(null);
        setError(
          cause instanceof Error ? cause.message : 'Invalid expression.',
        );
        return null;
      }
    },
    [angleMode],
  );
  const press = (key: string) => {
    if (key === 'C') {
      setVal('');
      setResult(null);
      setError('');
      return;
    }
    if (key === 'DEL') {
      setVal((current) => current.slice(0, -1));
      setResult(null);
      setError('');
      return;
    }
    if (key === '=') {
      calculate(val);
      return;
    }
    if (key === 'Ans') {
      setVal((current) => `${current}${result || ''}`);
      setResult(null);
      return;
    }
    if (key === 'x²') {
      setVal((current) => `${current}^2`);
      setResult(null);
      return;
    }
    const insertion = key === '×' || key === '÷' || key === '−' ? key : key;
    if (result && (/^\d$/.test(key) || key === '.' || key === 'π'))
      setVal(insertion);
    else setVal((current) => `${current}${insertion}`);
    setResult(null);
    setError('');
  };
  return (
    <Card className='m-2 w-full max-w-md rounded-2xl border-white/10 bg-pw-surface p-4 shadow-2xl ring-1 ring-white/10 bkblur sm:p-5'>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='text-xs font-bold uppercase tracking-widest text-pw-primary'>
          Scientific Calculator
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() =>
            setAngleMode((mode) => (mode === 'DEG' ? 'RAD' : 'DEG'))
          }
          className='h-8 min-w-14 text-[10px]'
          aria-label={`Angle mode ${angleMode}; click to change`}>
          {angleMode}
        </Button>
      </div>
      <div className='mb-3 rounded-xl border border-white/10 bg-black/40 p-3 text-right font-mono'>
        <Input
          value={val}
          onChange={(event) => {
            setVal(event.target.value);
            setResult(null);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              calculate(val);
            }
            if (event.key === 'Escape') press('C');
          }}
          aria-label='Calculator expression'
          placeholder='Try sin(30) + sqrt(16)'
          className='h-7 border-0 bg-transparent p-0 text-right text-xs shadow-none focus-visible:ring-0'
        />
        <div
          className='mt-2 min-h-8 break-all text-2xl font-bold text-pw-primary'
          aria-live='polite'>
          {result ?? (val || '0')}
        </div>
        <p
          className='min-h-4 text-left text-[10px] text-pw-danger'
          role='status'>
          {error}
        </p>
      </div>
      <div className='grid grid-cols-5 gap-1.5'>
        {CALCULATOR_KEYS.map((key) => {
          const isClear = key === 'C' || key === 'DEL';
          const isOperator = ['^', '!', '%', '+', '−', '×', '÷', '='].includes(
            key,
          );
          return (
            <Button
              key={key}
              type='button'
              variant={
                key === '=' ? 'default'
                : isClear ?
                  'destructive'
                : isOperator ?
                  'secondary'
                : 'outline'
              }
              onClick={() => press(key)}
              className={cn(
                'h-10 min-w-0 rounded-lg px-1 font-mono text-[10px] font-bold transition active:scale-95 sm:text-xs',
                key.endsWith('(') && 'text-pw-cyan',
                isOperator &&
                  key !== '=' &&
                  'border-pw-primary/20 bg-pw-primary/10 text-pw-primary',
                key === '=' && 'bg-pw-primary text-white',
              )}
              aria-label={
                key === 'DEL' ? 'Delete last character'
                : key === '=' ?
                  'Calculate'
                : key
              }>
              {key}
            </Button>
          );
        })}
      </div>
      <p className='mt-3 text-[10px] text-pw-muted'>
        Supports arithmetic, powers, factorials, constants, and scientific
        functions. Trigonometry uses {angleMode.toLowerCase()}.
      </p>
    </Card>
  );
};

function Taker() {
  const { openFile } = useAppFileViewer();
  const { setHideNavbar, setHideFooter, setPaddingTop } = usePageLayout();
  setHideNavbar(true);
  setHideFooter(true);
  setPaddingTop('pt-0');

  const { isLoggedIn, username, user } = useAppContext();
  const { showAlert } = useAppModal();

  const params = useParams();
  const routeParamId = (params?.id || params?.customQuizId) as string;

  const quizSetter = (params?.userId || params?.username || params?.setter) as
    | string
    | undefined;
  const isLocalPreview = routeParamId === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [serverCategoryScores, setServerCategoryScores] = useState<Record<
    string,
    { correct: number; total: number }
  > | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [started, setStart] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Record<string, QuizOption[]>
  >({});

  /* Ref for auto-scroll to the first question on scroll layout start */
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const firstQuestionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (quiz?.quizScroll && started) {
      let secondFrame = 0;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          firstQuestionRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
      });
      return () => {
        window.cancelAnimationFrame(firstFrame);
        window.cancelAnimationFrame(secondFrame);
      };
    }
  }, [started, quiz?.quizScroll]);

  useEffect(() => {
    if (!started || !quiz?.quizScroll || quiz.quizLayout !== 'scroll_show')
      return;
    const timer = window.setTimeout(
      () =>
        firstQuestionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      80,
    );
    return () => window.clearTimeout(timer);
  }, [currentQuestion, started, quiz?.quizScroll, quiz?.quizLayout]);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [hasAlreadyCompleted, setHasAlreadyCompleted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineUncached, setIsOfflineUncached] = useState(false);
  const [isQuizExpired, setIsQuizExpired] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleWindowFocus = () =>
      window.setTimeout(() => {
        uploadPickerOpenRef.current = false;
      }, 250);
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Working Offline: Responses will be saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    const onResponseSyncError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      toast.error(
        `${detail?.message || 'Response upload failed.'} Your response remains saved on this device.`,
      );
    };
    window.addEventListener('pw_quiz_response_sync_error', onResponseSyncError);
    return () =>
      window.removeEventListener(
        'pw_quiz_response_sync_error',
        onResponseSyncError,
      );
  }, []);

  const [showIntro, setShowIntro] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [detailsCollected, setDetailsCollected] = useState(false);
  const [userData, setUserData] = useState<Record<string, string>>({});
  const [isEndMsgExpanded, setIsEndMsgExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportedStatus, setReportedStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const [isPreparingResponseFile, setIsPreparingResponseFile] = useState(false);
  const pendingResponseFileReadsRef = useRef(new Set<string>());
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const uploadPickerOpenRef = React.useRef(false);

  const [scrollAnswers, setScrollAnswers] = useState<Record<string, any>>({});
  const [branchVisitCounts, setBranchVisitCounts] = useState<
    Record<string, number>
  >({});
  const [scrollBranchQuestionIds, setScrollBranchQuestionIds] = useState<string[] | null>(null);
  const [scrollBranchRootIndex, setScrollBranchRootIndex] = useState<number | null>(null);
  const scrollShowBranchActive = useRef(false);

  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [quizTheme, setQuizTheme] = useState<'dark' | 'light'>('dark');
  const [cheatAttempts, setCheatAttempts] = useState(0);
  const [showSecurityProtocol, setShowSecurityProtocol] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [quizUnavailable, setQuizUnavailable] = useState(false);
  const [isQuizUnderReview, setIsQuizUnderReview] = useState(false);
  const [privateAccessGranted, setPrivateAccessGranted] = useState(false);
  const [privateAccessKey, setPrivateAccessKey] = useState('');
  const [isCheckingPrivateAccess, setIsCheckingPrivateAccess] = useState(false);
  const pendingUnloadCb = React.useRef<(() => void) | null>(null);
  const correctAnswersRef = React.useRef<Record<string, any>>({});
  const activeAttemptRef = React.useRef<Record<string, any> | null>(null);
  const finalizingRef = React.useRef(false);
  const restoredAttemptTimerRef = React.useRef(false);
  const restoredQuestionTimerRef = React.useRef(false);
  const lastAttemptSyncRef = React.useRef('');

  // Custom states for reporting quizzes
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMobileAccessory, setShowMobileAccessory] = useState(false);
  const [reportCategory, setReportCategory] = useState('Spam');

  const createAttemptSnapshot = useCallback(
    (
      answersOverride?: any[],
      userDataOverride: Record<string, string> = userData,
    ) => {
      const answers: Record<string, any> = {};
      for (const answer of answersOverride || userAnswers) {
        if (answer?.questionId) answers[String(answer.questionId)] = answer;
      }
      for (const [questionId, answer] of Object.entries(scrollAnswers)) {
        if (
          answer !== '' &&
          answer !== null &&
          answer !== undefined &&
          (!Array.isArray(answer) || answer.length)
        ) {
          const question = activeQuestions.find((item) => item.id === questionId);
          answers[questionId] = {
            ...(answers[questionId] || {}),
            questionId,
            answer,
            ...(question ? { correct: (() => {
              const key = decodeStoredCorrectAnswer(correctAnswersRef.current[questionId]);
              if (key === null || key === undefined || key === '' || (Array.isArray(key) && key.length === 0)) return undefined;
              return question.type === 'checkbox'
                ? Array.isArray(answer) && answer.length === (Array.isArray(key) ? key.length : 1) && answer.every((value: unknown) => (Array.isArray(key) ? key : [key]).map(String).includes(String(value)))
                : String(answer ?? '') === String(key);
            })() } : {}),
          };
        }
      }
      const activeQuestion = activeQuestions[currentQuestion];
      if (activeQuestion) {
        let currentAnswer: any;
        if (activeQuestion.type === 'checkbox') {
          currentAnswer =
            quiz?.quizScroll ?
              scrollAnswers[activeQuestion.id]
            : selectedOptions;
        } else if (activeQuestion.type === 'input') {
          currentAnswer =
            quiz?.quizScroll ? scrollAnswers[activeQuestion.id] : content;
        } else if (
          activeQuestion.type === 'range' ||
          activeQuestion.type === 'rating'
        ) {
          currentAnswer = scrollAnswers[activeQuestion.id];
        } else if (activeQuestion.type !== 'upload') {
          currentAnswer = selectedOption;
        }
        const hasAnswer =
          activeQuestion.type === 'rating' ? Number(currentAnswer) >= 1
          : Array.isArray(currentAnswer) ? currentAnswer.length > 0
          : currentAnswer && typeof currentAnswer === 'object' ? true
          : String(currentAnswer ?? '').trim().length > 0;
        if (hasAnswer) {
          answers[activeQuestion.id] = {
            ...(answers[activeQuestion.id] || {}),
            questionId: activeQuestion.id,
            answer: currentAnswer,
          };
        }
      }
      const previous = activeAttemptRef.current || {};
      return {
        ...previous,
        quizId: quiz?.id,
        attemptId: previous.attemptId || crypto.randomUUID(),
        attemptToken:
          previous.attemptToken ||
          Array.from(crypto.getRandomValues(new Uint8Array(48)), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join(''),
        deviceKey: previous.deviceKey || getAssessmentDeviceKey(),
        status: 'in_progress',
        startedAt: previous.startedAt || new Date().toISOString(),
        answers,
        questionOrder: activeQuestions.map((question) => question.id),
        userData: userDataOverride,
        currentQuestionIndex: currentQuestion,
        scrollAnswers,
        selectedOption,
        selectedOptions,
        content,
        timeLeft,
        questionTimeLeft,
        updatedAt: Date.now(),
      };
    },
    [
      activeQuestions,
      content,
      currentQuestion,
      questionTimeLeft,
      quiz,
      scrollAnswers,
      selectedOption,
      selectedOptions,
      timeLeft,
      userAnswers,
      userData,
    ],
  );

  const syncAttemptSnapshot = useCallback(
    async (snapshot: Record<string, any>, keepalive = false) => {
      if (!quiz || isLocalPreview) return false;
      let preparedSnapshot = snapshot;
      try {
        await HybridStorage.saveQuizAttemptDraft(quiz.id, snapshot);
      } catch {
        toast.error(
          'This device could not cache the assessment progress. Keep this tab open and retry.',
        );
        return false;
      }
      if (!navigator.onLine) {
        activeAttemptRef.current = snapshot;
        return false;
      }

      const hasPendingResponseMedia = Object.values(
        snapshot.answers || {},
      ).some((answer: any) => {
        if (typeof answer?.fileUrl !== 'string') return false;
        const source =
          unpackPingWorldMediaUrl(answer.fileUrl).url || answer.fileUrl;
        return source.startsWith('data:');
      });

      // Create the remote attempt before signing response-media uploads. The upload signer
      // verifies the attempt token and will correctly reject an attempt that does not exist yet.
      if (!preparedSnapshot.remoteStarted && hasPendingResponseMedia) {
        try {
          const startResponse = await fetch('/api/quiz-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'start',
              quizId: quiz.id,
              attemptId: snapshot.attemptId,
              attemptToken: snapshot.attemptToken,
              questionOrder: snapshot.questionOrder,
              deviceKey: snapshot.deviceKey,
              privateQuizAccessToken: getPrivateQuizAccessToken(quiz.id),
              userData: snapshot.userData,
              currentQuestionIndex: snapshot.currentQuestionIndex,
              allowBackwardNavigation: quiz.canGoBack !== false,
            }),
            keepalive,
            signal: keepalive ? undefined : AbortSignal.timeout(5000),
          });
          if (!startResponse.ok) return false;
          const startResult = await startResponse.json();
          preparedSnapshot = {
            ...snapshot,
            remoteStarted: true,
            serverStartedAt:
              startResult.startedAt ||
              snapshot.serverStartedAt ||
              snapshot.startedAt,
          };
          activeAttemptRef.current = preparedSnapshot;
          await HybridStorage.saveQuizAttemptDraft(quiz.id, preparedSnapshot);
        } catch {
          return false;
        }
      }

      if (navigator.onLine) {
        try {
          preparedSnapshot = await HybridStorage.prepareQuizAttemptSnapshot(
            quiz.id,
            snapshot,
          );
        } catch {
          /* Keep the full local draft and retry media sync on the next save. */
        }
      }
      activeAttemptRef.current = preparedSnapshot;
      try {
        await HybridStorage.saveQuizAttemptDraft(quiz.id, preparedSnapshot);
      } catch {
        toast.error(
          'This device could not cache the assessment progress. Keep this tab open and retry.',
        );
        return false;
      }
      if (!navigator.onLine) return false;
      const action = preparedSnapshot.remoteStarted ? 'save' : 'start';
      try {
        const response = await fetch('/api/quiz-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            quizId: quiz.id,
            attemptId: preparedSnapshot.attemptId,
            attemptToken: preparedSnapshot.attemptToken,
            answers: preparedSnapshot.answers,
            questionOrder: preparedSnapshot.questionOrder,
            userData: preparedSnapshot.userData,
            currentQuestionIndex: preparedSnapshot.currentQuestionIndex,
            allowBackwardNavigation: quiz.canGoBack !== false,
            deviceKey: preparedSnapshot.deviceKey,
            privateQuizAccessToken: getPrivateQuizAccessToken(quiz.id),
          }),
          keepalive,
          signal: keepalive ? undefined : AbortSignal.timeout(5000),
        });
        if (!response.ok) return false;
        const result = await response.json();
        const nextSnapshot = {
          ...preparedSnapshot,
          remoteStarted: true,
          serverStartedAt:
            result.startedAt ||
            preparedSnapshot.serverStartedAt ||
            preparedSnapshot.startedAt,
        };
        activeAttemptRef.current = nextSnapshot;
        await HybridStorage.saveQuizAttemptDraft(quiz.id, nextSnapshot);
        lastAttemptSyncRef.current = JSON.stringify({
          answers: preparedSnapshot.answers,
          currentQuestionIndex: preparedSnapshot.currentQuestionIndex,
        });
        return result;
      } catch {
        return false;
      }
    },
    [isLocalPreview, quiz],
  );

  const startAssessment = useCallback(
    (initialUserData: Record<string, string> = userData) => {
      if (!quiz || isLocalPreview) {
        quizHaptic(18);
        playQuizStartTone();
        setStart(true);
        return;
      }
      let snapshot = createAttemptSnapshot([], initialUserData);
      if (activeAttemptRef.current?.status === 'in_progress') {
        snapshot = {
          ...activeAttemptRef.current,
          ...snapshot,
          attemptId: activeAttemptRef.current.attemptId,
          attemptToken: activeAttemptRef.current.attemptToken,
        };
      }
      activeAttemptRef.current = snapshot;
      setStart(true);
      quizHaptic(18);
      playQuizStartTone();
      void syncAttemptSnapshot(snapshot);
    },
    [
      createAttemptSnapshot,
      isLocalPreview,
      quiz,
      syncAttemptSnapshot,
      userData,
    ],
  );

  useEffect(() => {
    if (!started || !quiz || isLocalPreview || isFinished) return;
    const snapshot = createAttemptSnapshot();
    activeAttemptRef.current = snapshot;
    void HybridStorage.saveQuizAttemptDraft(quiz.id, snapshot).catch(() => {
      toast.error('Assessment progress could not be cached on this device.');
    });
    const delay =
      activeQuestions[currentQuestion]?.type === 'input' ? 800 : 250;
    const timer = window.setTimeout(() => {
      const fingerprint = JSON.stringify({
        answers: snapshot.answers,
        currentQuestionIndex: snapshot.currentQuestionIndex,
        userData: snapshot.userData,
      });
      if (fingerprint !== lastAttemptSyncRef.current)
        void syncAttemptSnapshot(snapshot);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    activeQuestions,
    createAttemptSnapshot,
    currentQuestion,
    isFinished,
    isLocalPreview,
    quiz,
    scrollAnswers,
    selectedOption,
    selectedOptions,
    started,
    syncAttemptSnapshot,
    userAnswers,
    userData,
    content,
  ]);

  useEffect(() => {
    if (!started || !quiz || isLocalPreview || isFinished) return;
    const flush = () => {
      const snapshot = createAttemptSnapshot();
      void syncAttemptSnapshot(snapshot, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    createAttemptSnapshot,
    isFinished,
    isLocalPreview,
    quiz,
    started,
    syncAttemptSnapshot,
  ]);

  // 1. Initial Load
  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      try {
        let data: Quiz | null = null;
        let moderationPaused = false;
        if (isLocalPreview && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('pw_quiz_template_v1');
            const stored = raw ? (JSON.parse(raw) as Quiz | null) : null;
            if (stored?.id === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id) {
              data = stored;
            }
          } catch {}

          data ||= DEFAULT_PINGWORLD_SHOWCASE_QUIZ;
        } else {
          if (!routeParamId) {
            data = null;
          } else if (
            routeParamId === DEFAULT_PINGWORLD_SHOWCASE_QUIZ.id ||
            routeParamId === 'template'
          ) {
            data = DEFAULT_PINGWORLD_SHOWCASE_QUIZ;
          } else {
            const publicUrl = new URL(
              `/api/quizzes/${encodeURIComponent(routeParamId)}`,
              window.location.origin,
            );
            if (params?.username && quizSetter)
              publicUrl.searchParams.set('owner', quizSetter);
            try {
              const token = getPrivateQuizAccessToken(routeParamId);
              const response = await fetch(publicUrl, {
                cache: 'no-store',
                headers: token ? { 'X-Quiz-Access-Token': token } : undefined,
              });
              const payload =
                response.ok || response.status === 423 ?
                  await response.json()
                : null;

              if (
                response.status === 423 &&
                payload?.code === 'PRIVATE_ACCESS_REQUIRED'
              ) {
                data = payload.quiz || null;
              } else if (response.status === 423) {
                moderationPaused = true;
                setIsQuizUnderReview(true);
              } else if (response.ok) {
                data = payload?.quiz || null;
              } else {
                data =
                  (await HybridStorage.getQuiz(
                    routeParamId,
                    undefined,
                    quizSetter,
                  )) || null;
              }
            } catch (e) {
              data =
                (await HybridStorage.getQuiz(
                  routeParamId,
                  undefined,
                  quizSetter,
                )) || null;
              console.error(e);
            }
          }
        }
        if (!data && routeParamId && !moderationPaused) {
          data = await HybridStorage.getQuiz(
            routeParamId,
            undefined,
            quizSetter,
          );
        }
        let target = data as Quiz | null;
        if (target) {
          target = {
            ...target,
            questions: Array.isArray(target.questions) ? target.questions : [],
          };
        }

        if (!target && typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOfflineUncached(true);
          setLoading(false);
          return;
        }
        if (!target) {
          setQuizUnavailable(true);
          setLoading(false);
          return;
        }

        if (target) {
          if (target?.title)
            document.title = `${capFirst(target.title)} | Ping World`;

          // Block expired quizzes from loading
          if (
            !isLocalPreview &&
            target.expires_at &&
            new Date(target.expires_at).getTime() < Date.now()
          ) {
            setIsQuizExpired(true);
            setQuiz(null);
            setLoading(false);
            return;
          }

          // Auth check if enabled
          let session = null;
          try {
            const { data } = await supabase.auth.getSession();
            session = data?.session;
          } catch (err) {
            console.warn('Supabase auth check failed', err);
          }

          if (!isLocalPreview && target.isPrivate) {
            setPrivateAccessGranted(Boolean(target.accessGranted));
            if (!target.accessGranted) {
              try {
                const accessResponse = await fetch(
                  `/api/quizzes/${encodeURIComponent(target.id)}/access`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(session?.access_token ?
                        { Authorization: `Bearer ${session.access_token}` }
                      : {}),
                    },
                    body: JSON.stringify({
                      key: '',
                      accessToken: getPrivateQuizAccessToken(target.id),
                    }),
                    cache: 'no-store',
                    credentials: 'omit',
                  },
                );
                if (accessResponse.ok) {
                  const access = await accessResponse.json();
                  if (access.accessToken) {
                    sessionStorage.setItem(
                      `pw_private_quiz_access_v1_${target.id}`,
                      access.accessToken,
                    );
                    if (routeParamId)
                      sessionStorage.setItem(
                        `pw_private_quiz_access_v1_${routeParamId}`,
                        access.accessToken,
                      );
                  }
                  window.location.reload();
                }
              } catch {
                // The key form remains available if the allowlist check cannot run.
              }
            }
          } else {
            setPrivateAccessGranted(true);
          }

          if (!isLocalPreview && !target.askDetails && !session) {
            setAuthRequired(true);
          }

          const secureAnswers: Record<string, any> = {};
          const validQuestionData = target.questions.every(
            (question) =>
              Array.isArray(question.options) &&
              question.options.every(
                (option) =>
                  option &&
                  typeof option.id === 'string' &&
                  typeof option.text === 'string',
              ),
          );
          if (!validQuestionData) {
            throw new Error(
              'This assessment contains invalid question data. Ask its owner to review it.',
            );
          }
          const currentQuestions = target.questions.map((q) => {
            secureAnswers[q.id] = q.correctIndex;
            return {
              ...q,
              correctIndex: null,
            };
          });

          correctAnswersRef.current = secureAnswers;

          const finalQuiz = {
            ...target,
            questions: currentQuestions.map((q) => ({
              ...q,
              correctIndex: null,
            })),
          };
          setQuiz(finalQuiz);

          // Completion check
          const completionMarker =
            isLocalPreview ? null : (
              localStorage.getItem(`completed_quiz_${finalQuiz.id}`)
            );
          if (completionMarker && !finalQuiz.allowRetry) {
            setHasAlreadyCompleted(true);
          }

          /* Map questions by category and independence on load with strict category isolation */
          let questionsToUse = [...currentQuestions];
          if (finalQuiz.randomizeQuestions) {
            const uncategorized = currentQuestions.filter(
              (q) => !q.category || q.category.trim() === '',
            );
            const categoriesMap: Record<string, Question[]> = {};
            currentQuestions.forEach((q) => {
              if (q.category && q.category.trim() !== '') {
                const catKey = q.category.trim();
                if (!categoriesMap[catKey]) {
                  categoriesMap[catKey] = [];
                }
                categoriesMap[catKey].push(q);
              }
            });

            const shuffledUncat = [...uncategorized];
            for (let i = shuffledUncat.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledUncat[i], shuffledUncat[j]] = [
                shuffledUncat[j],
                shuffledUncat[i],
              ];
            }

            const shuffledCategories: Question[] = [];
            Object.entries(categoriesMap).forEach(([, questions]) => {
              const shuffledCat = [...questions];
              for (let i = shuffledCat.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledCat[i], shuffledCat[j]] = [
                  shuffledCat[j],
                  shuffledCat[i],
                ];
              }
              shuffledCategories.push(...shuffledCat);
            });

            questionsToUse = [...shuffledUncat, ...shuffledCategories];
          }
          let restoredDraft: Record<string, any> | null = null;
          if (!isLocalPreview) {
            try {
              const draft = await HybridStorage.getQuizAttemptDraft(
                finalQuiz.id,
              );
              if (
                draft?.status === 'in_progress' &&
                Array.isArray(draft.questionOrder)
              )
                restoredDraft = draft;
            } catch {
              /* Start a fresh attempt if local draft storage is unavailable. */
            }
          }
          if (restoredDraft) {
            const byId = new Map(
              questionsToUse.map((question) => [question.id, question]),
            );
            const restoredOrder = restoredDraft.questionOrder
              .map((id: string) => byId.get(id))
              .filter(Boolean) as Question[];
            if (restoredOrder.length === questionsToUse.length)
              questionsToUse = restoredOrder;
          }
          setActiveQuestions(questionsToUse);
          setCurrentQuestion(0);

          // Pre-shuffle options
          if (finalQuiz.randomizeOptions) {
            const shuffled: Record<string, QuizOption[]> = {};
            questionsToUse.forEach((question) => {
              const opts = [...question.options];
              for (let i = opts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opts[i], opts[j]] = [opts[j], opts[i]];
              }
              shuffled[question.id] = opts;
            });
            setShuffledOptions(shuffled);
          }
          if (restoredDraft) {
            const savedAnswers =
              (
                restoredDraft.answers &&
                typeof restoredDraft.answers === 'object'
              ) ?
                restoredDraft.answers
              : {};
            setUserAnswers(Object.values(savedAnswers));
            setScrollAnswers(
              restoredDraft.scrollAnswers ||
                Object.fromEntries(
                  Object.entries(savedAnswers).map(
                    ([id, value]: [string, any]) => [id, value?.answer],
                  ),
                ),
            );
            setCurrentQuestion(
              Math.min(
                Math.max(0, Number(restoredDraft.currentQuestionIndex) || 0),
                Math.max(0, questionsToUse.length - 1),
              ),
            );
            setUserData(restoredDraft.userData || {});
            setSelectedOption(restoredDraft.selectedOption ?? null);
            setSelectedOptions(
              Array.isArray(restoredDraft.selectedOptions) ?
                restoredDraft.selectedOptions
              : [],
            );
            setContent(restoredDraft.content || '');
            setTimeLeft(
              typeof restoredDraft.timeLeft === 'number' ?
                restoredDraft.timeLeft
              : null,
            );
            setQuestionTimeLeft(
              typeof restoredDraft.questionTimeLeft === 'number' ?
                restoredDraft.questionTimeLeft
              : null,
            );
            activeAttemptRef.current = restoredDraft;
            restoredAttemptTimerRef.current = true;
            restoredQuestionTimerRef.current = true;
            setDetailsCollected(true);
            setShowDetails(false);
            setShowIntro(false);
            setStart(true);
            if (navigator.onLine && restoredDraft.attemptToken) {
              void fetch('/api/quiz-attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'start',
                  quizId: finalQuiz.id,
                  attemptId: restoredDraft.attemptId,
                  attemptToken: restoredDraft.attemptToken,
                  deviceKey: restoredDraft.deviceKey,
                  privateQuizAccessToken: getPrivateQuizAccessToken(
                    finalQuiz.id,
                  ),
                }),
              })
                .then(async (response) => {
                  if (!response.ok) return;
                  const remote = await response.json();
                  if (typeof remote.remainingSeconds === 'number')
                    setTimeLeft(remote.remainingSeconds);
                  const updated = {
                    ...restoredDraft,
                    remoteStarted: true,
                    serverStartedAt: remote.startedAt,
                  };
                  activeAttemptRef.current = updated;
                  await HybridStorage.saveQuizAttemptDraft(
                    finalQuiz.id,
                    updated,
                  );
                })
                .catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('[PublicQuizTaker] Error loading quiz:', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [routeParamId]);

  // 2. Timer Setup
  useEffect(() => {
    if (started && !isFinished && quiz?.timer?.hasTimer) {
      if (restoredAttemptTimerRef.current) {
        restoredAttemptTimerRef.current = false;
        return;
      }
      const totalQuestionTimers = activeQuestions.reduce(
        (sum, question) =>
          sum + (question.type === 'upload' ? 0 : question.timer || 0),
        0,
      );
      const timerValue =
        typeof quiz.timer.hasTimer === 'number' ? quiz.timer.hasTimer : 10;
      const timerUnit = (quiz as any).timerUnit ?? 'minutes';
      let generalTimerSeconds =
        timerUnit === 'seconds' ? timerValue
        : timerUnit === 'hours' ? timerValue * 3600
        : timerValue * 60; // default: minutes
      if (totalQuestionTimers > generalTimerSeconds) {
        const remainder = totalQuestionTimers - generalTimerSeconds;
        generalTimerSeconds += remainder;
      }
      if (generalTimerSeconds > 0) {
        setTimeLeft(generalTimerSeconds);
      }
    }
  }, [started, quiz, activeQuestions]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev > 1) return prev - 1;
        finalizeQuiz(userAnswers);
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished, userAnswers]);

  useEffect(() => {
    const activeQ = activeQuestions[currentQuestion];
    if (
      started &&
      activeQ &&
      activeQ.type !== 'upload' &&
      activeQ.timer &&
      !isFinished
    ) {
      if (restoredQuestionTimerRef.current)
        restoredQuestionTimerRef.current = false;
      else setQuestionTimeLeft(activeQ.timer);
    } else {
      setQuestionTimeLeft(null);
    }
  }, [started, currentQuestion, activeQuestions, isFinished]);

  const handleNext = (isAutoSubmit: any = false) => {
    const autoSubmit = isAutoSubmit === true;

    if (showFeedback && !autoSubmit) {
      setShowFeedback(false);
      return;
    }

    const currentQId = q?.id || '';
    const savedForCurrent = userAnswers.find(
      (answer) => answer.questionId === currentQId,
    );
    let currentSelectedOption =
      quiz?.quizScroll ? scrollAnswers[currentQId] : selectedOption;
    if (q?.type === 'range' || q?.type === 'rating') {
      currentSelectedOption =
        savedForCurrent?.answer ??
        scrollAnswers[currentQId] ??
        currentSelectedOption;
    }

    if (!autoSubmit) {
      if (q?.type === 'checkbox') {
        const activeBoxAnswers =
          quiz?.quizScroll ? scrollAnswers[currentQId] || [] : selectedOptions;
        if (activeBoxAnswers.length === 0) {
          return toast.error('Please select at least one answer');
        }
      }
      if (q?.type === 'input') {
        const inputValue =
          quiz?.quizScroll ? scrollAnswers[currentQId] : content;
        if (!String(inputValue ?? '').trim())
          return toast.error('Please enter an answer before continuing.');
      }
      if (q?.type === 'upload' && !savedForCurrent?.fileUrl) {
        return toast.error(
          'Please upload the required file before continuing.',
        );
      }
      if (
        q?.type === 'rating' &&
        (!Number.isFinite(Number(currentSelectedOption)) ||
          Number(currentSelectedOption) < 1)
      ) {
        return toast.error('Please choose a rating before continuing.');
      }
      if (
        q?.type === 'range' &&
        (currentSelectedOption === undefined ||
          currentSelectedOption === null ||
          currentSelectedOption === '')
      ) {
        return toast.error('Please set a value before continuing.');
      }
      if (
        q &&
        ['multiple_choice', 'true_false', 'dropdown'].includes(q.type) &&
        (currentSelectedOption === undefined ||
          currentSelectedOption === null ||
          currentSelectedOption === '')
      ) {
        return toast.error('Please select an answer before continuing.');
      }
    }

    let correct: boolean | undefined;
    if (quiz?.type === 'quiz' && q) {
      // Upload type: answer was already stored directly in userAnswers on file pick
      if (q.type === 'upload') {
        const existingUpload = userAnswers.find((a) => a.questionId === q.id);
        if (existingUpload) {
          const uploadAnswer = { ...existingUpload, correct: computeIsCorrect(q.id, existingUpload.answer) };
          const updatedAnswers = [...userAnswers.filter((a) => a.questionId !== q.id), uploadAnswer];
          setUserAnswers(updatedAnswers);
          setScore(updatedAnswers.filter((a) => a.correct === true).length);
          proceedToNext(updatedAnswers);
          return;
        } else {
          return toast.error('Please upload the required file');
        }
      }

      const activeAns =
        q.type === 'checkbox' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || []
          : selectedOptions
        : q.type === 'input' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || ''
          : content
        : currentSelectedOption;

      correct = computeIsCorrect(q.id, activeAns);

      if (correct) setScore((s) => s + 1);

      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);

      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = {
          questionId: qId,
          answer: activeAns,
          correct,
        };
      } else {
        updatedAnswers = [
          ...userAnswers,
          { questionId: qId, answer: activeAns, correct },
        ];
      }

      setUserAnswers(updatedAnswers);
      setScore(updatedAnswers.filter((a) => a.correct).length);

      if (quiz?.type === 'quiz' && quiz?.correctOption && quiz?.correctOptionDes === 'in-question') {
        setShowFeedback(true);
      } else {
        proceedToNext(updatedAnswers);
      }
    } else if (q) {
      // Upload type for surveys: answer was pre-stored on file pick
      if (q.type === 'upload') {
        const existingUpload = userAnswers.find((a) => a.questionId === q.id);
        if (!existingUpload) {
          if (quiz?.quizLayout === 'scroll_show') {
            return toast.error(
              'Please upload the required file before continuing.',
            );
          }
          // No file — record a skip and proceed
          const updatedWithSkip = [
            ...userAnswers,
            { questionId: q.id, answer: '' },
          ];
          setUserAnswers(updatedWithSkip);
          proceedToNext(updatedWithSkip);
        } else {
          proceedToNext(userAnswers);
        }
        return;
      }

      const activeAns =
        q.type === 'checkbox' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || []
          : selectedOptions
        : q.type === 'input' ?
          quiz?.quizScroll ?
            scrollAnswers[currentQId] || ''
          : content
        : currentSelectedOption;

      const qId = q.id;
      const existingIdx = userAnswers.findIndex((a) => a.questionId === qId);
      let updatedAnswers;
      if (existingIdx > -1) {
        updatedAnswers = [...userAnswers];
        updatedAnswers[existingIdx] = { questionId: qId, answer: activeAns };
      } else {
        updatedAnswers = [
          ...userAnswers,
          { questionId: qId, answer: activeAns },
        ];
      }
      setUserAnswers(updatedAnswers);
      proceedToNext(updatedAnswers);
    }
  };

  useEffect(() => {
    if (questionTimeLeft === null || questionTimeLeft <= 0 || isFinished) {
      if (questionTimeLeft === 0 && !isFinished) {
        handleNext(true);
      }
      return;
    }
    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev && prev > 1) return prev - 1;
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [questionTimeLeft, isFinished]);

  // Tab focus change monitoring cybersecurity shield
  useEffect(() => {
    if (!started || !quiz?.enforceSecurity || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (uploadPickerOpenRef.current) return;
        const nextAttempts = cheatAttempts + 1;
        setCheatAttempts(nextAttempts);

        if (nextAttempts >= 2) {
          quizHaptic([120, 60, 180]);
          toast.error(
            `Multiple security violations detected. Auto-submitting ${capFirst(quiz?.type || 'Assessment')}`,
          );
          finalizeQuiz(userAnswers);
        } else {
          quizHaptic([80, 45, 80]);
          toast.warning(
            `Security Violation (${nextAttempts}/2): Tab switching is strictly prohibited!`,
            { duration: 5000 },
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [started, quiz, cheatAttempts, userAnswers, isFinished]);

  // Cybersecurity: lock highlighting, copy/paste, right-click context menus
  useEffect(() => {
    if (!started || !quiz?.enforceSecurity || isFinished) return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
      toast.warning(
        'Security Mode: Clipboard actions & right-clicks are disabled.',
      );
    };

    const blockedEvents = [
      'copy',
      'cut',
      'paste',
      'contextmenu',
      'selectstart',
      'drag',
      'dragstart',
    ] as const;
    blockedEvents.forEach((evt) =>
      document.addEventListener(evt, preventDefault, true),
    );

    return () => {
      blockedEvents.forEach((evt) =>
        document.removeEventListener(evt, preventDefault, true),
      );
    };
  }, [started, quiz?.enforceSecurity, isFinished]);

  const q = useMemo(() => {
    if (!activeQuestions || activeQuestions.length === 0) return null;
    return activeQuestions[currentQuestion] || null;
  }, [activeQuestions, currentQuestion]);

  const answeredCount = useMemo(() => {
    return new Set(userAnswers.map((a) => a.questionId)).size;
  }, [userAnswers]);
  const weightedScore = useMemo(() => {
    const questionsById = new Map(activeQuestions.map((question) => [question.id, question]));
    let earned = 0;
    let possible = 0;
    for (const answer of userAnswers) {
      const question = questionsById.get(answer.questionId);
      if (!question) continue;
      const decoded = decodeStoredCorrectAnswer(correctAnswersRef.current[question.id]);
      if (decoded === null || decoded === undefined || decoded === '') continue;
      const ids = (Array.isArray(decoded) ? decoded : [decoded]).map(String);
      const weightFor = (id: unknown) => {
        const option = (question.options || []).find((item: any, index: number) => String(item?.id ?? index) === String(id) || String(index) === String(id));
        const value = Number(option?.scoreWeight);
        return Number.isFinite(value) && value >= 0 ? Math.round(value) : 1;
      };
      if (question.type === 'input' || question.type === 'upload') {
        possible += 1;
        if (answer.correct === true) earned += 1;
      } else if (question.type === 'checkbox') {
        possible += ids.reduce((sum, id) => sum + weightFor(id), 0);
        const selected = Array.isArray(answer.answer) ? answer.answer : [];
        earned += selected.reduce((sum: number, id: unknown) => ids.includes(String(id)) ? sum + weightFor(id) : sum, 0);
      } else {
        possible += weightFor(decoded);
        if (answer.correct === true) earned += weightFor(decoded);
      }
    }
    return { earned, possible };
  }, [activeQuestions, userAnswers]);
  const detailContext = useCallback((answers: any[] = userAnswers) => ({
    userData,
    userAnswers: answers,
    questions: activeQuestions,
    score: weightedScore.earned,
    scorePossible: weightedScore.possible,
    totalQuestions: answers.length,
  }), [userData, userAnswers, activeQuestions, weightedScore]);

  const computedCategoryScores = useMemo(() => {
    if (!quiz || userAnswers.length === 0) return {};
    const catStats: Record<string, { correct: number; total: number }> = {};
    const qMap = new Map(quiz.questions.map((quest) => [quest.id, quest]));

    userAnswers.forEach((ans) => {
      const question = qMap.get(ans.questionId);
      if (question && question.category && question.category.trim() !== '') {
        const cat = question.category.trim();
        if (!catStats[cat]) {
          catStats[cat] = { correct: 0, total: 0 };
        }
        catStats[cat].total += 1;
        if (ans.correct) {
          catStats[cat].correct += 1;
        }
      }
    });

    return catStats;
  }, [quiz, userAnswers]);
  const categoryScores = serverCategoryScores || computedCategoryScores;

  const confirmLeaveQuiz = (onConfirm: () => void) => {
    pendingUnloadCb.current = onConfirm;
    toast(
      <div className='flex flex-col gap-3 py-1'>
        <p className='font-bold text-sm'>Leave Assessment?</p>
        <p className='text-xs text-pw-muted leading-relaxed'>
          Your progress will be lost and you will need to start over.
        </p>
        <div className='flex gap-2 pt-1'>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-danger/20 border border-pw-danger/40 text-pw-danger text-xs font-bold'
            onClick={() => {
              toast.dismiss('quiz-leave-confirm');
              pendingUnloadCb.current?.();
              pendingUnloadCb.current = null;
            }}>
            Leave
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/20 border border-pw-primary/40 text-pw-primary text-xs font-bold'
            onClick={() => {
              toast.dismiss('quiz-leave-confirm');
              pendingUnloadCb.current = null;
            }}>
            Keep Going
          </button>
        </div>
      </div>,
      {
        id: 'quiz-leave-confirm',
        duration: Infinity,
      },
    );
  };

  const confirmSubmitQuiz = () => {
    toast(
      <div className='flex flex-col gap-3 py-1'>
        <p className='font-bold text-sm'>Submit Assessment?</p>
        <p className='text-xs text-pw-muted leading-relaxed'>
          Are you sure you want to finalize your answers and submit?
        </p>
        <div className='flex gap-2 pt-1'>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-success/20 border border-pw-success/40 text-pw-success text-xs font-bold'
            onClick={() => {
              toast.dismiss('quiz-submit-confirm');
              finalizeQuiz(userAnswers);
            }}>
            Submit
          </button>
          <button
            className='flex-1 h-9 rounded-xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary text-xs font-bold'
            onClick={() => toast.dismiss('quiz-submit-confirm')}>
            Cancel
          </button>
        </div>
      </div>,
      {
        id: 'quiz-submit-confirm',
        duration: Infinity,
        position: 'top-center',
      },
    );
  };

  /* Perfect input keyword matching and input branching evaluation */
  const computeIsCorrect = (qId: string, answer: any) => {
    if (quiz?.type === 'survey') return false;
    const secureAnswer = correctAnswersRef.current[qId];
    const question = activeQuestions.find((quest) => quest.id === qId);
    if (!question) return false;

    const decodedCorrect = decodeStoredCorrectAnswer(secureAnswer);
    if (
      decodedCorrect === null ||
      decodedCorrect === undefined ||
      decodedCorrect === '' ||
      (Array.isArray(decodedCorrect) && decodedCorrect.length === 0)
    )
      return undefined;

    if (question.type === 'checkbox') {
      const correctIds =
        Array.isArray(decodedCorrect) ? decodedCorrect : [decodedCorrect];
      return (
        Array.isArray(answer) &&
        answer.length === correctIds.length &&
        answer.every((val: any) => correctIds.includes(val))
      );
    } else if (question.type === 'input') {
      const userAns = String(answer || '').trim();

      const targetAns = String(
        resolvePipedText(
          JSON.stringify(decodedCorrect),
          {
            userData,
            userAnswers,
            questions: activeQuestions,
            score: weightedScore.earned,
            totalQuestions: userAnswers.length,
          },
          false,
          String(decodedCorrect),
        ).trim(),
      ).trim();
      return question.caseSensitive ?
          userAns === targetAns
        : userAns.toLowerCase() === targetAns.toLowerCase();
    } else if (question.type === 'true_false') {
      return (
        String(answer).toLowerCase() === String(decodedCorrect).toLowerCase()
      );
    }
    return String(answer) === String(decodedCorrect);
  };

  const handlePass = () => {
    if (!q) return;
    const passedRecord = {
      questionId: q.id,
      answer: '(Passed)',
      passed: true,
      correct: computeIsCorrect(q.id, undefined),
    };
    const updated = [
      ...userAnswers.filter((a) => a.questionId !== q.id),
      passedRecord,
    ];
    setUserAnswers(updated);
    setScore(updated.filter((a) => a.correct).length);
    toast.info('Question passed');
    proceedToNext(updated);
  };

  const finalizeQuiz = async (finalAnswers: any[]) => {
    if (finalizingRef.current) return;
    if (pendingResponseFileReadsRef.current.size > 0) {
      toast.error(
        'Wait for the selected file to finish preparing before submitting.',
      );
      return;
    }
    if (!isLocalPreview && !navigator.onLine) {
      setSubmissionFailed(true);
      toast.error(
        'You are offline. Check your internet connection and try submitting again.',
      );
      return;
    }
    finalizingRef.current = true;
    setSubmissionFailed(false);
    setIsSubmitting(true);
    let submissionSucceeded = false;

    if (quiz) {
      try {
        let answersToSubmit = finalAnswers;
        const finalScore =
          quiz.type === 'quiz' ?
            weightedScore.earned
          : 0;

        // Detect taker's accurate country & continent via geo-detector
        const clientGeo = detectClientGeo();

        // Sanitize & trim all participant details to preserve exact values
        const sanitizedUserData: Record<string, string> = {};
        const authData =
          isLoggedIn && !quiz.askDetails ?
            { pingAuthEmail: user?.email, pingAuthName: username }
          : {};

        Object.entries({ ...userData, ...authData }).forEach(([k, v]) => {
          const cleanKey = k.trim();
          if (cleanKey) {
            sanitizedUserData[cleanKey] = String(v ?? '').trim();
          }
        });

        if (!isLocalPreview) {
          const attempt = activeAttemptRef.current;
          if (attempt?.attemptId && attempt?.attemptToken) {
            const finalSnapshot =
              await HybridStorage.prepareQuizAttemptSnapshot(quiz.id, {
                ...createAttemptSnapshot(finalAnswers),
                status: 'in_progress',
              });
            const attemptSaved = await syncAttemptSnapshot(finalSnapshot);
            if (!attemptSaved)
              throw new Error(
                'Your answers or uploaded files could not be saved to the server. Please retry while online.',
              );
            const persistedAnswers = activeAttemptRef.current?.answers;
            if (persistedAnswers && typeof persistedAnswers === 'object')
              answersToSubmit = Object.values(persistedAnswers);
          }
          const responseSaved = await HybridStorage.saveResponse(
            quiz.id,
            {
              userData: sanitizedUserData,
              answers: answersToSubmit,
              score: finalScore,
              assessmentType: quiz.type,
              categoryScores: quiz.type === 'quiz' ? categoryScores : undefined,
              totalQuestions: finalAnswers.length,
              scorePossible: weightedScore.possible,
              answeredQuestions: finalAnswers.length,
              country: clientGeo.country,
              continent: clientGeo.continent,
              timezone: clientGeo.timezone,
              submissionId: attempt?.attemptId,
              attemptId: attempt?.attemptId,
              attemptToken: attempt?.attemptToken,
            },
            { requireRemote: true },
          );
          if (
            !responseSaved ||
            typeof responseSaved !== 'object' ||
            responseSaved.success !== true ||
            'queued' in responseSaved
          )
            throw new Error(
              'The server did not confirm saving your assessment. Please retry submission.',
            );
          submissionSucceeded = true;
          if (!quiz.allowRetry) {
            try {
              localStorage.setItem(`completed_quiz_${quiz.id}`, 'true');
            } catch {}
          }
          if (
            responseSaved &&
            typeof responseSaved === 'object' &&
            'score' in responseSaved &&
            typeof responseSaved.score === 'number'
          ) {
            setScore(responseSaved.score);
            if (responseSaved.categoryScores)
              setServerCategoryScores(responseSaved.categoryScores);
            if (attempt?.attemptId)
              await HybridStorage.deleteQuizAttemptDraft(quiz.id);
          }
        } else {
          // Template / Preview response saving LOCALLY only
          const templateResp = {
            id: `template_resp_${Date.now()}`,
            timestamp: new Date().toISOString(),
            score: finalScore,
            totalQuestions: finalAnswers.length,
            answeredQuestions: finalAnswers.length,
            userData: sanitizedUserData,
            answers: answersToSubmit,
            country: clientGeo.country,
            continent: clientGeo.continent,
            timezone: clientGeo.timezone,
            assessmentType: quiz.type,
            categoryScores: quiz.type === 'quiz' ? categoryScores : undefined,
          };
          await HybridStorage.saveTemplatePreviewResponse(
            quiz.id,
            templateResp,
          );
          toast.success(
            'Preview assessment completed! Response saved locally for test review.',
          );
          submissionSucceeded = true;
        }
      } catch (e) {
        console.error('Failed to save response:', e);
        setSubmissionFailed(true);
        toast.error(
          e instanceof Error ?
            e.message
          : 'Your answers could not be saved. Please retry.',
        );
      }
    }
    setIsSubmitting(false);
    finalizingRef.current = false;
    if (submissionSucceeded) {
      quizHaptic([35, 45, 130]);
      playQuizCompletionTone();
      if (quiz?.endScreen?.enableConfetti)
        triggerConfetti(quiz.endScreen?.confettiType || 'standard');
      setIsFinished(true);
    }
  };

  // Strict category branching isolation & 3x loop-protected routing engine
  const proceedToNext = (
    latestAnswers?: any[],
    chosenOptionVal?: string | null,
  ) => {
    if (!(quiz?.quizLayout === 'scroll' || quiz?.surveyType === 'form'))
      quizHaptic(14);
    setShowFeedback(false);
    const answersToSave = latestAnswers || userAnswers;

    const q = activeQuestions[currentQuestion];
    let nextIdx = currentQuestion + 1;
    const isScrollLayout = !!(quiz?.quizLayout === 'scroll' || quiz?.surveyType === 'form');
    const isScrollShow = quiz?.quizLayout === 'scroll_show';

    let didBranch = false;
    let skipQuestionFallback = false;
    if (q && (!isScrollLayout || isScrollShow)) {
      let branchTarget: string | undefined = undefined;
      let branchCat: string | undefined = undefined;

      // 1. Input Question Branching
      if (q.type === 'input') {
        const savedInput = answersToSave.find(
          (answer) => answer.questionId === q.id,
        )?.answer;
        const userText = String(
          formatDetailVars(savedInput ?? content ?? '', false, true),
        ).trim();
        if (q.inputBranchRules && q.inputBranchRules.length > 0) {
          const matchedRule = q.inputBranchRules.find((rule) => {
            if (!rule.keyword) return false;
            const kw = resolvePipedText(
              rule.keyword,
              {
                userData,
                userAnswers: answersToSave,
                questions: activeQuestions,
                score: weightedScore.earned,
                totalQuestions: answersToSave.length,
              },
              false,
              rule.keyword,
            ).trim();
            return rule.caseSensitive ?
                userText.includes(kw)
              : userText.toLowerCase().includes(kw.toLowerCase());
          });
          if (matchedRule) {
            if (matchedRule.skipTo) branchTarget = matchedRule.skipTo;
            if (matchedRule.skipToCat) branchCat = matchedRule.skipToCat;
          } else {
            // Else fallback rules
            if ((q as any).elseSkipTo) branchTarget = (q as any).elseSkipTo;
            if ((q as any).elseSkipToCat) branchCat = (q as any).elseSkipToCat;
          }
        }
      } else {
        // 2. Choice-level Branching
        const currentChoice =
          chosenOptionVal !== undefined ? chosenOptionVal
          : quiz?.quizScroll ? scrollAnswers[q.id]
          : selectedOption;

        if (currentChoice !== null && currentChoice !== undefined) {
          const currentOpts = shuffledOptions[q.id] || q.options || [];
          const foundOpt = currentOpts.find((opt: any, oIdx: number) => {
            if (opt && typeof opt === 'object') {
              return (
                opt.id === currentChoice ||
                String(oIdx) === String(currentChoice) ||
                opt.text === currentChoice
              );
            }
            return (
              String(oIdx) === String(currentChoice) ||
              String(opt) === String(currentChoice)
            );
          });

          if (foundOpt && typeof foundOpt === 'object') {
            const conditionPassed = !foundOpt.branchCondition || evaluateQuizCondition(foundOpt.branchCondition, {
              userData,
              userAnswers: answersToSave,
              questions: activeQuestions,
              score: weightedScore.earned,
              totalQuestions: answersToSave.length,
            });
            if (foundOpt.branchCondition) skipQuestionFallback = true;
            if (conditionPassed) {
              if (foundOpt.skipTo) branchTarget = foundOpt.skipTo;
              if (foundOpt.skipToCat) branchCat = foundOpt.skipToCat;
            } else {
              if (foundOpt.elseSkipTo) branchTarget = foundOpt.elseSkipTo;
              if (foundOpt.elseSkipToCat) branchCat = foundOpt.elseSkipToCat;
            }
          }
        }
      }

      // 3. Question-level fallback routing
      if (!branchTarget && !branchCat && !skipQuestionFallback) {
        if (q.skipTo) branchTarget = q.skipTo;
        if (q.skipToCat) branchCat = q.skipToCat;
      }

      // Resolve piped targets at runtime. Invalid or empty targets deliberately
      // fall through to the ordinary in-group/next-question progression.
      const pipingContext = {
        userData,
        userAnswers: answersToSave,
        questions: activeQuestions,
        score: weightedScore.earned,
        totalQuestions: answersToSave.length,
      };
      if (branchTarget && branchTarget !== 'end') {
        branchTarget =
          resolvePipedText(branchTarget, pipingContext, false, '').trim() ||
          undefined;
        if (
          branchTarget &&
          !activeQuestions.some((question) => question.id === branchTarget)
        ) {
          branchTarget = undefined;
        }
      }
      if (branchCat) {
        branchCat =
          resolvePipedText(branchCat, pipingContext, false, '').trim() ||
          undefined;
        if (
          branchCat &&
          branchCat.toLowerCase() !== 'end' &&
          !activeQuestions.some(
            (question) =>
              question.category?.trim().toLowerCase() ===
              branchCat?.toLowerCase(),
          )
        ) {
          branchCat = undefined;
        }
      }

      // 4. Evaluate explicit routing target with 3x Loop Limiter Protection
      if (branchTarget === 'end' || branchCat?.toLowerCase() === 'end') {
        finalizeQuiz(answersToSave);
        return;
      } else if (branchTarget) {
        didBranch = true;
        const targetIdx = activeQuestions.findIndex(
          (quest) => quest.id === branchTarget,
        );
        if (targetIdx !== -1) {
          const targetQId = activeQuestions[targetIdx]?.id;
          const visits = branchVisitCounts[targetQId] || 0;
          if (visits >= 3) {
            // Loop limit reached: break loop and continue sequentially
            nextIdx = currentQuestion + 1;
          } else {
            setBranchVisitCounts((prev) => ({
              ...prev,
              [targetQId]: visits + 1,
            }));
            nextIdx = targetIdx;
          }
        }
      } else if (branchCat) {
        didBranch = true;
        const cleanCat = branchCat.trim().toLowerCase();
        const targetIdx = activeQuestions.findIndex(
          (quest) =>
            quest.category && quest.category.trim().toLowerCase() === cleanCat,
        );
        if (targetIdx !== -1) {
          const targetQId = activeQuestions[targetIdx]?.id;
          const visits = branchVisitCounts[targetQId] || 0;
          if (visits >= 3) {
            nextIdx = currentQuestion + 1;
          } else {
            setBranchVisitCounts((prev) => ({
              ...prev,
              [targetQId]: visits + 1,
            }));
            nextIdx = targetIdx;
          }
        }
      } else {
        // 5. Strict Sequential Category Isolation
        // If question belongs to a category, advance to next question IN THAT CATEGORY
        if (q.category && q.category.trim() !== '') {
          const curCatName = q.category.trim().toLowerCase();
          const sameCatQuestions = activeQuestions.filter(
            (quest) =>
              quest.category &&
              quest.category.trim().toLowerCase() === curCatName,
          );
          const currentCatPos = sameCatQuestions.findIndex(
            (quest) => quest.id === q.id,
          );

          if (
            currentCatPos !== -1 &&
            currentCatPos < sameCatQuestions.length - 1
          ) {
            // Next question in current category
            const nextCatQ = sameCatQuestions[currentCatPos + 1];
            nextIdx = activeQuestions.findIndex(
              (quest) => quest.id === nextCatQ.id,
            );
          } else {
            // Current category completed: fallback to index flow (next category or next standalone question)
            const remainingQuestions = activeQuestions.slice(
              currentQuestion + 1,
            );
            const nextUnrelated = remainingQuestions.find(
              (quest) =>
                !quest.category ||
                quest.category.trim().toLowerCase() !== curCatName,
            );
            if (nextUnrelated) {
              nextIdx = activeQuestions.findIndex(
                (quest) => quest.id === nextUnrelated.id,
              );
            } else {
              finalizeQuiz(answersToSave);
              return;
            }
          }
        }
      }
    }

    if (q && isScrollShow) {
      const nextQuestion = activeQuestions[nextIdx];
      if (nextQuestion) {
        if (didBranch) {
          scrollShowBranchActive.current = true;
          setScrollBranchRootIndex(nextIdx);
          setScrollBranchQuestionIds([nextQuestion.id]);
        } else {
          const root = scrollBranchRootIndex ?? 0;
          setScrollBranchQuestionIds(activeQuestions.slice(root, nextIdx + 1).map((question) => question.id));
        }
      }
    }

    const nextQ = activeQuestions[nextIdx];

    if (!nextQ) {
      finalizeQuiz(answersToSave);
      return;
    }

    if (quiz && nextIdx < activeQuestions.length) {
      setNavigationHistory((prev) => [...prev, currentQuestion]);
      setCurrentQuestion(nextIdx);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    } else {
      finalizeQuiz(answersToSave);
    }
  };

  const GoBack = () => {
    setShowFeedback(false);
    if (!quiz?.canGoBack) return;
    if (navigationHistory.length > 0) {
      const prevHistory = [...navigationHistory];
      const prevIdx = prevHistory.pop()!;
      setNavigationHistory(prevHistory);
      setCurrentQuestion(prevIdx);
      setSelectedOption(null);
      setSelectedOptions([]);
      setContent('');
    }
  };

  // Dynamic variable mention & cross-question piping engine
  const formatDetailVars = (
    rawText: string,
    _showPrev?: boolean,
    _hideBold?: boolean,
    contextOverride?: Record<string, any>,
  ) => {
    if (!rawText) return rawText;

    // Resolve cross-question, category, taker mentions, date getters, and @eval logic directly
    const piped = resolvePipedText(
      rawText,
      contextOverride || {
        userData,
        userAnswers,
        questions: activeQuestions,
        score: weightedScore.earned,
        totalQuestions: userAnswers.length,
        scorePossible: weightedScore.possible,
      },
      false,
    );
    return parseWhitelistedHtml(piped);
  };

  const renderQuestionCard = (quest: Question, index: number) => {
    const isActive = index === currentQuestion;
    const isScrollLayout = !!(
      quiz?.quizScroll ||
      quiz?.quizLayout === 'scroll' ||
      quiz?.surveyType === 'form'
    );

    // Read selections dynamically from scrollAnswers inside scroll layouts
    const currentOptions = (shuffledOptions[quest.id] || quest.options).filter(
      (o: any) => !o?.hidden,
    );

    const activeSelected =
      isScrollLayout ? scrollAnswers[quest.id] || null : selectedOption;
    const activeChecked =
      isScrollLayout ? scrollAnswers[quest.id] || [] : selectedOptions;
    const activeText = isScrollLayout ? scrollAnswers[quest.id] || '' : content;

    const formattedQuestionText = formatDetailVars(quest.text);

    return (
      <motion.div
        initial={{ opacity: 0.1, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0.1, x: -5 }}
        className='w-full p-0'
        key={quest.text + index + 'question-card'}>
        <Card
          id={`question-${quest.id}`}
          key={quest.id}
          ref={
            (
              isScrollLayout ? index === currentQuestion : index === 0
            ) ?
              firstQuestionRef
            : undefined
          }
          className={cn(
            'quiz-taker-font p-0 bg-transparent sm:p-6 ring-0 flex flex-col w-full max-w-[600px] rounded-[0px] mb-8 transition-all duration-300 space-y-0 self-center',
            !isActive && !isScrollLayout && 'opacity-65 pointer-events-none',
            !isScrollLayout &&
              'sm:bkblur sm:glass sm:rounded-3xl sm:bg-pw-surface/40 sm:border-white/5 sm:shadow-2xl sm:ring-1 ',
          )}
          style={{ placeSelf: 'center' }}>
          {/* Show Question Category tag if enabled or set */}
          {quiz?.category?.show && quest.category && (
            <div>
              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pw-primary/10 border border-pw-primary/30 text-pw-primary text-[10px] font-bold bkblur uppercase tracking-wider'>
                <Folder className='h-3 w-3' /> {quest.category}
              </span>
            </div>
          )}

          <div className='flex items-start gap-3 mb-4'>
            {isScrollLayout ?
              <div className='flex items-baseline gap-2'>
                <span className='text-pw-primary font-black text-xl select-none shrink-0 quiz-taker-font '>
                  {(() => {
                    const targetCat = quest.category?.trim() || '';
                    const inStack = activeQuestions.filter(
                      (item) => (item.category?.trim() || '') === targetCat,
                    );
                    const posInStack = inStack.findIndex(
                      (item) => item.id === quest.id,
                    );
                    return quiz?.quizLayout === 'scroll' || quiz?.surveyType === 'form'
                      ? index + 1
                      : Math.max(0, posInStack) + 1;
                  })()}
                  .
                </span>
                <h2
                  className='text-base font-bold text-white whitespace-pre-wrap'
                  dangerouslySetInnerHTML={{ __html: formattedQuestionText }}
                />
              </div>
            : <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'h-12 w-12 rounded-[18px] flex items-center justify-center shrink-0 border shadow-inner',
                    quiz?.type === 'quiz' ?
                      'bg-pw-primary/5 text-pw-primary border-pw-primary/10'
                    : 'bg-pw-cyan/5 text-pw-cyan border-pw-cyan/10',
                  )}>
                  {quiz?.type === 'quiz' ?
                    <Brain
                      className='text-pw-primary'
                      size={24}
                    />
                  : <HelpCircle
                      className='text-pw-cyan'
                      size={24}
                    />
                  }
                </div>
                <div>
                  <span className='text-[9px] font-black text-pw-muted uppercase block tracking-wider'>
                    {(() => {
                      const targetCat = quest.category?.trim() || '';
                      const inStack = activeQuestions.filter(
                        (item) => (item.category?.trim() || '') === targetCat,
                      );
                      const posInStack = inStack.findIndex(
                        (item) => item.id === quest.id,
                      );
                      const stackTotal = inStack.length || activeQuestions.length;
                      return `Question ${Math.max(0, posInStack) + 1} of ${stackTotal}${quest.category ? ` · ${quest.category}` : ''}`;
                    })()}
                  </span>
                  <h2
                    className='text-base font-bold text-white whitespace-pre-wrap'
                    dangerouslySetInnerHTML={{ __html: formattedQuestionText }}
                  />
                </div>
              </div>
            }
          </div>

          <div className='space-y-2'>
            {quest.type === 'input' ?
              <textarea
                value={activeText}
                onChange={(e) => {
                  if (quiz?.quizScroll) {
                    setScrollAnswers((prev) => ({
                      ...prev,
                      [quest.id]: e.target.value,
                    }));
                    // Sync to answers
                    const correct = computeIsCorrect(quest.id, e.target.value);
                    const existingIdx = userAnswers.findIndex(
                      (a) => a.questionId === quest.id,
                    );
                    let updated;
                    if (existingIdx > -1) {
                      updated = [...userAnswers];
                      updated[existingIdx] = {
                        questionId: quest.id,
                        answer: e.target.value,
                        correct,
                      };
                    } else {
                      updated = [
                        ...userAnswers,
                        {
                          questionId: quest.id,
                          answer: e.target.value,
                          correct,
                        },
                      ];
                    }
                    setUserAnswers(updated);
                  } else {
                    setContent(e.target.value);
                  }
                }}
                placeholder='Type your answer here...'
                className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-pw-primary resize-none'
              />
            : quest.type === 'range' ?
              (() => {
                const min =
                  Number.isFinite(Number(quest.min)) ? Number(quest.min) : 0;
                const max =
                  (
                    Number.isFinite(Number(quest.max)) &&
                    Number(quest.max) > min
                  ) ?
                    Number(quest.max)
                  : 10;
                const step =
                  (
                    Number.isFinite(Number(quest.step)) &&
                    Number(quest.step) > 0
                  ) ?
                    Number(quest.step)
                  : 1;
                const value = Number(scrollAnswers[quest.id] ?? min);
                const saveValue = (next: number) => {
                  setScrollAnswers((previous) => ({
                    ...previous,
                    [quest.id]: next,
                  }));
                  setUserAnswers((previous) => {
                    const existing = previous.findIndex(
                      (answer) => answer.questionId === quest.id,
                    );
                    const answer = {
                      questionId: quest.id,
                      answer: next,
                      correct: computeIsCorrect(quest.id, next),
                    };
                    return existing < 0 ?
                        [...previous, answer]
                      : previous.map((item, index) =>
                          index === existing ? answer : item,
                        );
                  });
                };
                return (
                  <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-5 bkblur'>
                    <div className='mb-4 flex items-center justify-between'>
                      <span className='text-xs text-white/55'>{min}</span>
                      <span className='rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-lg font-bold tabular-nums text-cyan-200'>
                        {Number.isFinite(value) ? value : min}
                      </span>
                      <span className='text-xs text-white/55'>{max}</span>
                    </div>
                    <input
                      aria-label='Choose a value'
                      type='range'
                      min={min}
                      max={max}
                      step={step}
                      value={
                        Number.isFinite(value) ?
                          Math.min(max, Math.max(min, value))
                        : min
                      }
                      onBlur={(event) =>
                        saveValue(Number(event.currentTarget.value))
                      }
                      onChange={(event) =>
                        saveValue(Number(event.target.value))
                      }
                      className='h-2 w-full cursor-pointer accent-cyan-300'
                    />
                  </div>
                );
              })()
            : quest.type === 'rating' ?
              (() => {
                const selectedRating = Number(scrollAnswers[quest.id] || 0);
                const saveRating = (rating: number) => {
                  setScrollAnswers((previous) => ({
                    ...previous,
                    [quest.id]: rating,
                  }));
                  setUserAnswers((previous) => {
                    const existing = previous.findIndex(
                      (answer) => answer.questionId === quest.id,
                    );
                    const answer = {
                      questionId: quest.id,
                      answer: rating,
                      correct: computeIsCorrect(quest.id, rating),
                    };
                    return existing < 0 ?
                        [...previous, answer]
                      : previous.map((item, index) =>
                          index === existing ? answer : item,
                        );
                  });
                };
                return (
                  <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center'>
                    <div
                      className='flex justify-center gap-2'
                      role='radiogroup'
                      aria-label='Rating from one to five'>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type='button'
                          role='radio'
                          aria-checked={selectedRating === rating}
                          aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                          onClick={() => saveRating(rating)}
                          className='rounded-xl p-2 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300'>
                          <Star
                            className={cn(
                              'h-8 w-8 transition-colors',
                              rating <= selectedRating ?
                                'fill-amber-300 text-amber-300'
                              : 'text-white/30',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <p className='mt-3 text-xs text-white/55'>
                      {selectedRating ?
                        `${selectedRating} of 5`
                      : 'Select a rating'}
                    </p>
                  </div>
                );
              })()
            : quest.type === 'upload' ?
              <div className='space-y-2 p-2 bg-white/5 border border-dashed bkblur border-white/20 rounded-3xl text-left'>
                {quest.uploadInstruction && (
                  <p className='text-xs text-pw-cyan font-semibold mb-2 bg-pw-cyan/5 p-1.5 rounded-2xl border border-pw-cyan/10'>
                    ℹ {formatDetailVars(quest.uploadInstruction)}
                  </p>
                )}
                <p className='text-[10px] text-pw-muted px-1 pt-1.5'>
                  Expected file type:{' '}
                  {describeAcceptedFiles(
                    quest.allowedTypes ||
                      'image/*,.pdf,.doc,.docx,.txt,.zip,.json,video/*,audio/*',
                  )}
                </p>

                <div className='flex flex-col gap-1'>
                  <input
                    type='file'
                    onClick={() => {
                      uploadPickerOpenRef.current = true;
                    }}
                    accept={
                      quest?.allowedTypes ||
                      'image/*,.pdf,.doc,.docx,.txt,.zip,.json,/application/json,video/*,audio/*,'
                    }
                    onChange={(e) => {
                      uploadPickerOpenRef.current = false;
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Enforce max size limit (MB)
                      const maxMb =
                        quiz?.fromPremium ?
                          Math.min(Number(quest.maxFileSize) || 5, 50)
                        : 5;
                      const sizeInMb = file.size / (1024 * 1024);

                      if (sizeInMb > maxMb) {
                        toast.error(
                          `File size (${sizeInMb.toFixed(1)}MB) exceeds limit of ${maxMb}MB`,
                        );
                        return;
                      }

                      pendingResponseFileReadsRef.current.add(quest.id);
                      setIsPreparingResponseFile(true);
                      void (async () => {
                        try {
                          const optimizedFile =
                            await optimizeImageForStorage(file);
                          const reader = new FileReader();
                          reader.onerror = () => {
                            pendingResponseFileReadsRef.current.delete(
                              quest.id,
                            );
                            setIsPreparingResponseFile(
                              pendingResponseFileReadsRef.current.size > 0,
                            );
                            toast.error(
                              'Could not read this file. Please try another one.',
                            );
                          };
                          reader.onload = () => {
                            const rawBase64 = reader.result as string;
                            const packedUrl = packPingWorldMediaUrl(rawBase64);
                            if (quiz?.quizScroll) {
                              setScrollAnswers((prev) => ({
                                ...prev,
                                [quest.id]: packedUrl,
                              }));
                            } else {
                              setContent(packedUrl);
                            }

                            const existingIdx = userAnswers.findIndex(
                              (a) => a.questionId === quest.id,
                            );
                            let updated;
                            const uploadRecord = {
                              questionId: quest.id,
                              answer: file.name,
                              fileName: file.name,
                              fileUrl: packedUrl,
                              fileType: optimizedFile.type || file.type,
                              correct: undefined,
                            };

                            if (existingIdx > -1) {
                              updated = [...userAnswers];
                              updated[existingIdx] = uploadRecord;
                            } else {
                              updated = [...userAnswers, uploadRecord];
                            }
                            setUserAnswers(updated);
                            const savedKb = Math.max(
                              1,
                              Math.round(optimizedFile.size / 1024),
                            );
                            toast.success(`Attached: ${file.name}`);
                            pendingResponseFileReadsRef.current.delete(
                              quest.id,
                            );
                            setIsPreparingResponseFile(
                              pendingResponseFileReadsRef.current.size > 0,
                            );
                          };
                          reader.readAsDataURL(optimizedFile);
                        } catch {
                          pendingResponseFileReadsRef.current.delete(quest.id);
                          setIsPreparingResponseFile(
                            pendingResponseFileReadsRef.current.size > 0,
                          );
                          toast.error(
                            'Could not prepare this file for upload.',
                          );
                        }
                      })();
                    }}
                    className='text-xs text-pw-muted file:mr-3 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:text-xs file:font-bold file:bg-pw-primary/10 file:text-pw-primary hover:file:bg-pw-primary/20 file:cursor-pointer w-full'
                  />

                  {/* Allow taker to customize filename on save */}
                  {(content || scrollAnswers[quest.id]) && (
                    <div className='mt-2 p-1 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between gap-2 flex-wrap'>
                      <div className='flex items-center text-xs text-pw-success font-bold font-mono ml-2'>
                        <span>✓ File Attached</span>
                      </div>
                      <div className='flex items-center h-7 w-[30%] max-w-45'>
                        <Input
                          placeholder='Rename file before saving...'
                          value={
                            userAnswers.find((a) => a.questionId === quest.id)
                              ?.answer || ''
                          }
                          onChange={(e) => {
                            const newName = e.target.value;
                            const updated = userAnswers.map((a) =>
                              a.questionId === quest.id ?
                                { ...a, answer: newName, fileName: newName }
                              : a,
                            );
                            setUserAnswers(updated);
                          }}
                          className='text-[10px] bg-white/5 border-white/10'
                        />
                      </div>
                    </div>
                  )}
                  {(() => {
                    const attached = userAnswers.find(
                      (answer) => answer.questionId === quest.id,
                    );
                    const attachedUrl =
                      attached?.fileUrl ?
                        unpackPingWorldMediaUrl(attached.fileUrl).url ||
                        attached.fileUrl
                      : '';
                    if (!attachedUrl) return null;
                    const isImage =
                      attachedUrl.startsWith('data:image/') ||
                      /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#]|$)/i.test(
                        attached?.fileName || '',
                      );
                    return (
                      <div className='mt-2 space-y-1'>
                        {isImage && (
                          <button
                            type='button'
                            onClick={() =>
                              openFile({
                                src: attachedUrl,
                                name: attached?.fileName || 'Uploaded answer',
                                mimeType: attached?.fileType,
                                canEdit: (attached?.fileType || '').startsWith('image/'),
                                onEditSave: (editedFile) => new Promise<void>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onerror = () => reject(new Error('Could not read the edited image.'));
                                  reader.onload = () => {
                                    const packedUrl = packPingWorldMediaUrl(String(reader.result));
                                    const updated = userAnswers.map((answer) => answer.questionId === quest.id ? { ...answer, fileName: editedFile.name, fileType: editedFile.type, fileUrl: packedUrl } : answer);
                                    setUserAnswers(updated);
                                    if (quiz?.quizScroll) setScrollAnswers((previous) => ({ ...previous, [quest.id]: packedUrl }));
                                    else setContent(packedUrl);
                                    resolve();
                                  };
                                  reader.readAsDataURL(editedFile);
                                }),
                              })
                            }
                            className='block w-full cursor-zoom-in text-left'>
                            <Image
                              src={attachedUrl}
                              alt={
                                attached?.fileName || 'Uploaded answer preview'
                              }
                              className='max-h-48 max-w-full rounded-xl border border-white/10 object-contain'
                            />
                          </button>
                        )}
                        <button
                          type='button'
                          onClick={() =>
                            openFile({
                              src: attachedUrl,
                              name: attached?.fileName || 'Uploaded answer',
                              mimeType: attached?.fileType,
                            })
                          }
                          className='text-[10px] text-pw-cyan hover:underline'>
                          Preview uploaded file fullscreen
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            : <div className='grid gap-2.5'>
                {currentOptions.map((opt: any, oIdx) => {
                  const optId = opt.id || String(oIdx);
                  const optText = opt.text || String(opt);
                  const rawOptUrl = opt?.uploadUrl;
                  const optImage =
                    rawOptUrl ?
                      unpackPingWorldMediaUrl(rawOptUrl).url || undefined
                    : undefined;
                  const formattedOptionText = formatDetailVars(optText);

                  const isSelected =
                    quest.type === 'checkbox' ?
                      activeChecked.includes(optId)
                    : activeSelected === optId;

                  const isFeedbackMode =
                    quiz?.type === 'quiz' &&
                    showFeedback &&
                    quiz?.correctOption &&
                    quiz?.correctOptionDes === 'in-question' &&
                    quest.id === q?.id;
                  let feedbackClasses =
                    isSelected ?
                      'bg-pw-primary/12 border-pw-primary text-white font-bold'
                    : 'bg-white/5 border-white/10 text-white/90';

                  if (isFeedbackMode) {
                    const decodedCorrect = decodeStoredCorrectAnswer(
                      quest.correctIndex,
                    );
                    const hasCorrectIndex = decodedCorrect !== null && decodedCorrect !== undefined && decodedCorrect !== '' && !(Array.isArray(decodedCorrect) && decodedCorrect.length === 0);
                    const isCorrectOpt = hasCorrectIndex && (
                      Array.isArray(decodedCorrect) ?
                        decodedCorrect.includes(optId)
                      : String(decodedCorrect) === optId ||
                        String(decodedCorrect) === String(oIdx));

                    if (isSelected) {
                      feedbackClasses =
                        isCorrectOpt ?
                          'bg-pw-success/20 border-pw-success text-pw-success font-bold shadow-lg shadow-pw-success/10'
                        : 'bg-pw-danger/20 border-pw-danger text-pw-danger font-bold shadow-lg shadow-pw-danger/10';
                    } else if (isCorrectOpt) {
                      feedbackClasses =
                        'bg-pw-success/10 border-pw-success/50 text-pw-success/90 font-semibold';
                    }
                  }

                  return (
                    <button
                      key={optId + oIdx}
                      disabled={isFeedbackMode}
                      onClick={() => {
                        if (isFeedbackMode) return;
                        if (quiz?.quizScroll) {
                          let val;
                          if (quest.type === 'checkbox') {
                            val =
                              activeChecked.includes(optId) ?
                                activeChecked.filter((i: any) => i !== optId)
                              : [...activeChecked, optId];
                          } else {
                            val = optId;
                          }
                          setScrollAnswers((prev) => ({
                            ...prev,
                            [quest.id]: val,
                          }));

                          const correct = computeIsCorrect(quest.id, val);
                          const existingIdx = userAnswers.findIndex(
                            (a) => a.questionId === quest.id,
                          );
                          let updated;
                          if (existingIdx > -1) {
                            updated = [...userAnswers];
                            updated[existingIdx] = {
                              questionId: quest.id,
                              answer: val,
                              correct,
                            };
                          } else {
                            updated = [
                              ...userAnswers,
                              { questionId: quest.id, answer: val, correct },
                            ];
                          }
                          setUserAnswers(updated);
                        } else {
                          if (quest.type === 'checkbox') {
                            setSelectedOptions((p) =>
                              p.includes(optId) ?
                                p.filter((i) => i !== optId)
                              : [...p, optId],
                            );
                          } else {
                            setSelectedOption(optId);
                          }
                        }
                      }}
                      className={cn(
                        'w-full min-h-11 p-3 text-left rounded-xl border transition-all text-xs flex items-center justify-between gap-3 backdrop-blur-lg',
                        feedbackClasses,
                      )}>
                      <div
                        className={cn(
                          'flex items-start sm:items-center gap-3 flex-1 min-w-0',
                          optImage ? 'flex-col sm:flex-row' : 'flex-row',
                        )}>
                        {optImage && (
                          <Image
                            src={optImage}
                            alt='Option attachment'
                            onClick={(e) => {
                              e.stopPropagation();
                              openFile({
                                src: optImage,
                                name: 'Option attachment',
                                kind: 'image',
                              });
                            }}
                            className='h-16 w-16 object-cover rounded-lg border border-white/10 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                          />
                        )}
                        <span
                          className='whitespace-pre-wrap'
                          dangerouslySetInnerHTML={{
                            __html: formattedOptionText,
                          }}
                        />
                      </div>

                      <CheckCircle
                        className={cn(
                          'h-4 w-4 transition-all shrink-0',
                          isSelected ?
                            'text-pw-primary w-4.5 h-4.5'
                          : 'text-pw-muted',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            }

            {/* Instant Option & Question Explanations when feedback mode is active */}
            {quiz?.type === 'quiz' &&
              showFeedback &&
              quiz?.correctOption &&
              quiz?.correctOptionDes === 'in-question' &&
              quest.id === q?.id && (
                <div className='mt-3 space-y-2 text-xs'>
                  {(() => {
                    const selOptObj: any = currentOptions.find(
                      (o: any, oI: number) =>
                        (o.id || String(oI)) === activeSelected,
                    );
                    const optExp = selOptObj?.explanation;
                    return optExp ?
                        <div className='p-2.5 rounded-xl bg-pw-cyan/10 border border-pw-cyan/20 text-pw-cyan/90 italic whitespace-pre-wrap flex items-start gap-2'>
                          <span className='font-bold not-italic shrink-0'>
                            ℹ Option Note:
                          </span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: formatDetailVars(optExp),
                            }}
                          />
                        </div>
                      : null;
                  })()}

                  {(quest.correctExplanation || (() => {
                    const decoded = decodeStoredCorrectAnswer(quest.correctIndex);
                    const correctIds = Array.isArray(decoded) ? decoded : [decoded];
                    return currentOptions.find((option: any, index: number) => correctIds.some((id) => String(id) === String(option?.id || index) || String(id) === String(index)))?.explanation;
                  })()) && (
                    <div className='p-2 rounded-xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary/90 italic whitespace-pre-wrap flex items-start gap-2'>
                      <span className='font-bold not-italic shrink-0'>
                        💡 Explanation:
                      </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: formatDetailVars(quest.correctExplanation || (() => {
                            const decoded = decodeStoredCorrectAnswer(quest.correctIndex);
                            const correctIds = Array.isArray(decoded) ? decoded : [decoded];
                            return currentOptions.find((option: any, index: number) => correctIds.some((id) => String(id) === String(option?.id || index) || String(id) === String(index)))?.explanation || '';
                          })()),
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
          </div>
        </Card>

        <div className='my-2 divider sm:hidden' />
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0.1, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0.1, x: -5 }}
        key='loading-view'
        className='flex flex-col items-center justify-center min-h-[90vh] text-center p-6 self-center'>
        <Puzzle className='h-12 w-12 text-pw-muted mb-4 opacity-70' />
        <h2 className='text-2xl font-bold mb-2 animate-pulse'>
          Loading Assessment...
        </h2>
      </motion.div>
    );
  }

  if (isOfflineUncached) {
    return (
      <motion.div
        initial={{ opacity: 0.1, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0.1, scale: 0.9 }}
        key='not-cached-view'
        className='flex flex-col items-center justify-center min-h-[90vh] text-center p-4 py-6 self-center'>
        <AlertTriangle className='h-12 w-12 text-pw-warning mb-4 animate-pulse' />
        <h2 className='text-2xl font-bold mb-1'>
          Offline: Quiz Not Cached Yet
        </h2>
        <p className='text-sm text-pw-muted max-w-sm'>
          Please connect to the internet to load this assessment.
        </p>
      </motion.div>
    );
  }

  if (isQuizUnderReview) {
    return (
      <div className='flex min-h-[90vh] flex-col items-center justify-center gap-3 p-6 text-center'>
        <AlertTriangle className='h-12 w-12 text-pw-warning' />
        <h2 className='text-2xl font-bold'>Assessment paused for review</h2>
        <p className='max-w-md text-sm text-pw-muted'>
          This assessment is temporarily unavailable while reports are reviewed.
        </p>
        <Link href='/tools'>
          <Button className='btn-primary'>Go to tools</Button>
        </Link>
      </div>
    );
  }

  if (quizUnavailable) {
    return (
      <div className='flex min-h-[90vh] flex-col items-center justify-center gap-3 p-6 text-center'>
        <AlertTriangle className='h-12 w-12 text-pw-warning' />
        <h2 className='text-2xl font-bold'>Assessment unavailable</h2>
        <p className='max-w-md text-sm text-pw-muted'>
          This assessment may have expired, or the secure quiz service is not
          configured. Please check the link or try again later.
        </p>
        <Link href='/tools'>
          <Button className='btn-primary'>Go to tools</Button>
        </Link>
      </div>
    );
  }

  if (isQuizExpired) {
    return (
      <motion.div
        initial={{ opacity: 0.1, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key='expired-quiz-view'
        className='flex flex-col items-center justify-center min-h-[90vh] text-center p-6 self-center'>
        <div className='w-16 h-16 bg-pw-warning/10 rounded-full flex items-center justify-center border border-pw-warning/20 mb-4'>
          <Clock className='h-8 w-8 text-pw-warning' />
        </div>
        <h2 className='text-2xl font-bold mb-2'>Assessment Expired</h2>
        <p className='text-xs text-pw-muted max-w-sm mb-6'>
          This assessment has passed its active lifespan and is no longer
          accepting new submissions.
        </p>
        <Link href='/tools'>
          <Button className='btn-primary h-10 px-6 rounded-xl font-bold text-xs'>
            Explore PingWorld Tools
          </Button>
        </Link>
      </motion.div>
    );
  }

  if (hasAlreadyCompleted && quiz && !quiz.allowRetry && !isLocalPreview) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0C1B] p-6 text-center text-white'>
        <ShieldCheck className='h-12 w-12 text-pw-primary' />
        <h1 className='text-2xl font-bold'>
          This assessment was already completed on this device.
        </h1>
        <p className='max-w-md text-sm text-white/75 quiz-taker-font'>
          This assessment allows one submission per device. Contact its owner if
          you need access.
        </p>
        <Link href='/tools'>
          <Button className='btn-primary'>Close assessment</Button>
        </Link>
      </div>
    );
  }

  if (quiz?.isPrivate && !privateAccessGranted) {
    const verifyPrivateAccess = async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();
      if (isCheckingPrivateAccess) return;
      setIsCheckingPrivateAccess(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(
          `/api/quizzes/${encodeURIComponent(quiz.id)}/access`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionData.session?.access_token ?
                { Authorization: `Bearer ${sessionData.session.access_token}` }
              : {}),
            },
            body: JSON.stringify({ key: privateAccessKey }),
            cache: 'no-store',
            credentials: 'omit',
          },
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(result.error || 'Access could not be verified.');
        if (!result.accessToken)
          throw new Error('Could not start a secure assessment session.');
        sessionStorage.setItem(
          `pw_private_quiz_access_v1_${quiz.id}`,
          result.accessToken,
        );
        if (routeParamId)
          sessionStorage.setItem(
            `pw_private_quiz_access_v1_${routeParamId}`,
            result.accessToken,
          );
        setPrivateAccessKey('');
        quizHaptic(30);
        window.location.reload();
      } catch (error) {
        toast.error(
          error instanceof Error ?
            error.message
          : 'Access could not be verified.',
        );
      } finally {
        setIsCheckingPrivateAccess(false);
      }
    };
    return (
      <div className='flex min-h-screen items-center justify-center bg-[#0A0C1B] p-4 text-white'>
        <Card className='w-full max-w-md space-y-5 border-white/10 bg-pw-surface/90 p-6 shadow-2xl backdrop-blur-xl'>
          <div className='flex items-center gap-3'>
            <Lock className='text-pw-primary' />
            <div>
              <h1 className='text-xl font-bold'>Private assessment</h1>
              <p className='text-sm text-pw-muted'>
                Enter the access key to continue. Approved participants can
                continue without a key after signing in.
              </p>
            </div>
          </div>
          <form
            className='space-y-3'
            onSubmit={verifyPrivateAccess}>
            <Input
              autoComplete='off'
              value={privateAccessKey}
              onChange={(event) => setPrivateAccessKey(event.target.value)}
              placeholder='Assessment access key'
              aria-label='Assessment access key'
            />
            <Button
              className='btn-primary w-full'
              type='submit'
              disabled={isCheckingPrivateAccess || !privateAccessKey.trim()}>
              {isCheckingPrivateAccess ?
                <>
                  <LoaderCircle className='mr-2 h-4 w-4 animate-spin' />
                  Checking access…
                </>
              : 'Continue'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (isFinished) {
    const totalQuestions = userAnswers.length;
    const endTitle = formatDetailVars(
      quiz?.endScreen?.title || 'Assessment Completed!',
      false,
      false,
      detailContext(),
    );
    const endMsg = formatDetailVars(
      quiz?.endScreen?.message.trim() ||
        'Thank you for completing this assessment, @name! You scored @score out of @total (@percentage).',
      false,
      false,
      detailContext(),
    );

    return (
      <div
        key='completion-view'
        className='quiz-taker-font relative h-[100dvh] w-full bg-[#0A0C1B] text-white flex items-center justify-center p-5 overflow-hidden'>
        {quiz?.fromPremium && (
          <>
            {quiz?.branding?.shadeColor && (
              <div
                className='fixed inset-0 min-h-screen w-screen z-0 pointer-events-none transition-all duration-500'
                style={{
                  backgroundColor: quiz.branding.shadeColor,
                  opacity: 0.35,
                }}
              />
            )}
            {quiz?.branding?.image && (
              <div
                className='fixed inset-0 min-h-screen w-screen z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-500'
                style={{
                  backgroundImage: `url(${unpackPingWorldMediaUrl(quiz.branding.image).url || quiz.branding.image})`,
                  opacity: quiz.branding.opacity ?? 0.25,
                  filter: `blur(${quiz.branding.blur ?? 0}px) brightness(80%)`,
                }}
              />
            )}
            {(quiz?.branding?.image || quiz?.branding?.shadeColor) && (
              <div className='fixed inset-0 min-h-screen w-screen z-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60' />
            )}
          </>
        )}

        <div
          className={cn(
            'max-w-md w-full space-y-1 relative z-10 text-center max-h-screen overflow-hidden',
            quiz?.endScreen?.textAlign === 'center' && 'text-center',
            quiz?.endScreen?.textAlign === 'left' && 'text-left',
            quiz?.endScreen?.textAlign === 'right' && 'text-right',
          )}>
          <div className='flex flex-col item-center sticky top-1 z-50 space-y-2 bg-[#0A0C1B]/80 bkblur w-full h-fit p-2 pt-5'>
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center border mb-3',
                quiz?.endScreen?.textAlign === 'left' ? 'ml-0 mr-auto'
                : quiz?.endScreen?.textAlign === 'right' ? 'ml-auto mr-0'
                : 'mx-auto',
                quiz?.endScreen?.completionIcon === 'diamond' &&
                  'bg-pw-success/10 border-pw-success/20',
                quiz?.endScreen?.completionIcon === 'badge' &&
                  'bg-pw-primary/10 border-pw-primary/20',
                quiz?.endScreen?.completionIcon === 'trophy' &&
                  'bg-pw-warning/10 border-pw-warning/20',
              )}>
              {quiz?.endScreen?.completionIcon === 'diamond' ?
                <Diamond className='h-12 w-12 text-pw-success' />
              : quiz?.endScreen?.completionIcon === 'badge' ?
                <Badge className='h-12 w-12 text-pw-primary' />
              : quiz?.endScreen?.completionIcon === 'trophy' ?
                <Trophy className='h-12 w-12 text-pw-warning' />
              : <CheckCircle className='h-12 w-12 text-pw-success' />}
            </div>
            <h1
              className='text-lg font-extrabold font-display whitespace-pre-wrap'
              dangerouslySetInnerHTML={{ __html: endTitle }}
            />
            <div className='relative'>
              <p
                className={cn(
                  'text-white/90 text-sm mb-1 whitespace-pre-wrap transition-all',
                  !isEndMsgExpanded && endMsg.length > 80 ?
                    'line-clamp-3 max-h-24 overflow-hidden'
                  : 'max-h-96 overflow-y-auto pr-1',
                )}
                dangerouslySetInnerHTML={{ __html: endMsg }}
              />
              {endMsg.length > 80 && (
                <button
                  type='button'
                  onClick={() => setIsEndMsgExpanded(!isEndMsgExpanded)}
                  className='text-pw-cyan hover:underline text-[11px] font-semibold mt-1 inline-flex items-center gap-1 focus:outline-none'>
                  {isEndMsgExpanded ? 'Read less' : 'Read more...'}
                </button>
              )}
            </div>

            <div className='divider mt-3 sm:hidden' />
          </div>

          <div className='block space-y-2 w-full h-fit max-h-[48dvh] overflow-y-auto no-scrollbar relative'>
            {quiz?.type === 'quiz' && quiz?.endScreen.showPerformance && (
              <Card className='p-2 sm:p-6 bg-transparent ring-0 sm:bg-white/[0.02] sm:bkblur sm:backdrop-blur-lg sm:border sm:border-white/5 sm:rounded-2xl space-y-4 mt-4 text-left'>
                <div
                  className='text-center'
                  id='total-score'>
                  <span className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block mb-1'>
                    TOTAL OVERALL SCORE
                  </span>
                  <span className='text-3xl font-bold font-mono text-pw-primary'>
                    {score} / {totalQuestions}
                  </span>
                </div>

                {/* Independent Questions Score Breakdown */}
                {quiz?.category?.inPerformance &&
                  Object.keys(categoryScores).length > 0 && (
                    <>
                      {(() => {
                        const independentQs = activeQuestions.filter(
                          (quest) =>
                            !quest.category || quest.category.trim() === '',
                        );
                        if (independentQs.length === 0) return null;
                        const independentAns = userAnswers.filter((a) =>
                          independentQs.some((q) => q.id === a.questionId),
                        );
                        const indCorrect = independentAns.filter(
                          (a) => a.correct,
                        ).length;

                        return (
                          <div className='border-t border-white/5 pt-3 space-y-1.5'>
                            <div className='flex items-center justify-between text-xs p-2 bg-white/5 rounded-xl bkblur'>
                              <span className='font-bold text-white'>
                                Other Questions ({independentQs.length})
                              </span>
                              <span className='font-mono text-pw-cyan font-bold'>
                                {indCorrect} / {independentQs.length}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Group / Category Questions Score Breakdown */}

                      <div className='border-t border-white/5 pt-3 space-y-2'>
                        <span className='text-[10px] text-pw-primary uppercase font-bold tracking-widest block'>
                          Category Scores
                        </span>

                        {Object.entries(categoryScores).map(
                          ([cat, stats], idx) => (
                            <div
                              key={cat + idx}
                              className='flex items-center justify-between text-xs p-2 bg-white/5 rounded-xl bkblur'>
                              <span className='font-bold text-white'>
                                📁 {capFirst(cat)} ({stats.total})
                              </span>
                              <span className='font-mono text-pw-primary font-bold'>
                                {stats.correct} / {stats.total}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </>
                  )}
              </Card>
            )}

            {quiz?.correctOptionDes === 'in-result' &&
              activeQuestions.some(
                (q) =>
                  q.correctExplanation ||
                  (q.options as any[])?.some((o: any) => o.explanation),
              ) && userAnswers.length > 2 && !document.getElementById('total-score')?.checkVisibility() && (
              <Button className={'absolute bottom-1 right-1 w-11 h-11 p-1 flex items-center rounded-full shadow-md shadow-pw-primary/40 bg-pw-surface/80 bkblur hover:shadow-lg'} onClick={() => {
                document.getElementById('total-score')?.scrollIntoView();
              }}>
                <ChevronUp className='w-4 h-4 text-white'/>
              </Button>
              )}
            
            {quiz?.type === 'quiz' && (
              <div className='divider my-4 sm:hidden' />
            )}

            {/* Per-question explanation review */}
            {quiz?.type === 'quiz' &&
              quiz?.correctOption &&
              quiz?.correctOptionDes === 'in-result' &&
              activeQuestions.some(
                (q) =>
                  q.correctExplanation ||
                  (q.options as any[])?.some((o: any) => o.explanation),
              ) &&
              userAnswers.length > 0 && (
                <Card className='p-2 sm:p-5 bg-transparent ring-0 sm:bg-white/[0.02] sm:bkblur sm:border sm:border-white/5 sm:rounded-2xl space-y-3 mt-4 text-left h-fit'>
                  <span className='text-[10px] text-pw-muted uppercase font-bold tracking-widest block'>
                    Question Review & Explanations
                  </span>
                  {activeQuestions.map((q, qi) => {
                    const ans = userAnswers.find((a) => a.questionId === q.id);
                    const opts = (q.options as any[]) || [];
                    const userAnswerText =
                      ans ?
                        Array.isArray(ans.answer) ?
                          ans.answer
                            .map(
                              (id: string) =>
                                opts.find((o: any) => o.id === id)?.text || id,
                            )
                            .join(', ')
                        : opts.find((o: any) => o.id === ans.answer)?.text ||
                          String(ans.answer)
                      : '(No answer)';
                    const selOpt =
                      !Array.isArray(ans?.answer) ?
                        opts.find((o: any) => o.id === ans?.answer)
                      : null;

                    // Option image for selected answer
                    const rawSelOptImg =
                      selOpt?.uploadUrl ||
                      (typeof selOpt?.imageUrl === 'string' ?
                        selOpt.imageUrl
                      : selOpt?.imageUrl?.url);
                    const selOptImgUrl =
                      rawSelOptImg ?
                        unpackPingWorldMediaUrl(rawSelOptImg).url
                      : undefined;

                    // Question image if present
                    const rawQImg =
                      (q as any)?.uploadUrl ||
                      (typeof (q as any)?.imageUrl === 'string' ?
                        (q as any).imageUrl
                      : (q as any)?.imageUrl?.url) ||
                      (q as any)?.image;
                    const qImgUrl =
                      rawQImg ?
                        unpackPingWorldMediaUrl(rawQImg).url
                      : undefined;

                    // DecodedCorrectIndex:
                    const decodedIndex = decodeStoredCorrectAnswer(
                      q.correctIndex,
                    );
                    const hasCorrectIndex = decodedIndex !== null && decodedIndex !== undefined && decodedIndex !== '' && !(Array.isArray(decodedIndex) && decodedIndex.length === 0);
                    const correctOpt = hasCorrectIndex ? opts.find(
                      (o: any, oI: number) =>
                        o.id === decodedIndex ||
                        String(oI) === String(decodedIndex) ||
                        o.text === decodedIndex,
                    ) : undefined;

                    return (
                      <div
                        key={q.id}
                        className={cn(
                          'p-2 sm:p-3 rounded-xl border text-xs space-y-1.5 bkblur',
                          ans?.correct === true ?
                            'bg-pw-success/5 border-pw-success/20'
                          : ans?.correct === false ? 'bg-pw-danger/5 border-pw-danger/20' : 'bg-white/5 border-white/10',
                        )}>
                        <div
                          className={cn(
                            'flex items-start gap-2',
                            q.category?.trim() && 'flex-col',
                          )}>
                          <span
                            className={cn(
                              'font-bold shrink-0',
                              ans?.correct === true ? 'text-pw-success' : ans?.correct === false ? (
                                'text-pw-danger'
                              ) : 'text-pw-muted',
                            )}>
                            {ans?.correct === true ? '✓' : ans?.correct === false ? '✗' : '•'}{' '}
                        {`Q${qi + 1}${q.category ? ` (${q.category})` : ''}`}
                          </span>
                          <span
                            className='text-white/80 whitespace-pre-wrap'
                            dangerouslySetInnerHTML={{
                              __html: formatDetailVars(q.text),
                            }}
                          />
                        </div>

                        {/* Question image attachment if present */}
                        {qImgUrl && (
                          <div className='pl-3 my-1'>
                            <Image
                              src={qImgUrl}
                              alt='Question media'
                              onClick={() =>
                                openFile({
                                  src: qImgUrl,
                                  name: `Question attachment - Q${qi + 1}`,
                                })
                              }
                              className='max-h-24 rounded-lg object-contain border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity'
                            />
                          </div>
                        )}

                        <p className='text-pw-muted pl-4 whitespace-pre-wrap'>
                          Your answer:{' '}
                          <span
                            className='font-bold text-white'
                            dangerouslySetInnerHTML={{
                              __html: formatDetailVars(userAnswerText),
                            }}
                          />
                        </p>

                        {/* Selected option image display */}
                        {selOptImgUrl && (
                          <div className='pl-3 my-1 flex items-center gap-2'>
                            <span className='text-[10px] text-pw-muted'>
                              Selected Image:
                            </span>
                            <Image
                              src={selOptImgUrl}
                              alt='Selected option attachment'
                              onClick={() =>
                                openFile({
                                  src: selOptImgUrl,
                                  name: `Selected option image - Q${qi + 1}`,
                                })
                              }
                              className='h-12 w-12 rounded-lg object-cover border border-white/10 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                            />
                          </div>
                        )}

                        {/* Uploaded answer attachment preview */}
                        {ans?.fileUrl &&
                          (() => {
                            const unpacked =
                              unpackPingWorldMediaUrl(ans.fileUrl).url ||
                              ans.fileUrl;
                            const fileName =
                              ans.fileName || `Uploaded answer - Q${qi + 1}`;
                            const isImage =
                              ans.fileType?.startsWith('image/') ||
                              String(unpacked).startsWith('data:image/') ||
                              /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#]|$)/i.test(
                                fileName,
                              );
                            return (
                              <div className='pl-3 my-1 flex items-center gap-2'>
                                {isImage && (
                                  <Image
                                    src={unpacked}
                                    alt={fileName}
                                    onClick={() =>
                                      openFile({
                                        src: unpacked,
                                        name: fileName,
                                        mimeType: ans.fileType,
                                      })
                                    }
                                    className='max-h-28 rounded-lg object-contain border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity'
                                  />
                                )}
                                <button
                                  type='button'
                                  onClick={() =>
                                    openFile({
                                      src: unpacked,
                                      name: fileName,
                                      mimeType: ans.fileType,
                                    })
                                  }
                                  className='text-[10px] flex items-center gap-1 mb-1 text-pw-cyan hover:underline truncate'>
                                  <CheckCircle2 className='w-5 h-5' />
                                  Preview {fileName}
                                </button>
                              </div>
                            );
                          })()}

                        {/* Show correct answer if taker got it wrong and correct answer was set */}
                        {ans?.correct === false &&
                          decodedIndex !== null && decodedIndex !== undefined && decodedIndex !== '' &&
                          correctOpt &&
                          (
                            correctOpt?.uploadUrl ||
                            correctOpt?.imageUrl ||
                            correctOpt?.imageUrl?.url
                          )(() => {
                            const rawCorrectImg =
                              correctOpt?.uploadUrl ||
                              (typeof correctOpt?.imageUrl === 'string' ?
                                correctOpt?.imageUrl
                              : correctOpt?.imageUrl?.url);
                            const correctImgUrl =
                              rawCorrectImg ?
                                unpackPingWorldMediaUrl(rawCorrectImg).url
                              : undefined;
                            return (
                              <div className='pl-3 text-xs text-pw-success/90 font-medium space-y-1 pt-0.5'>
                                <p>
                                  Correct answer:{' '}
                                  <span
                                    className='font-bold text-pw-success'
                                    dangerouslySetInnerHTML={{
                                      __html: formatDetailVars(
                                        correctOpt?.text ||
                                          String(decodedIndex),
                                      ),
                                    }}
                                  />
                                </p>
                                {correctImgUrl && (
                                  <div className='flex items-center gap-2 mt-1'>
                                    <span className='text-[10px] text-pw-muted'>
                                      Correct Image:
                                    </span>
                                    <Image
                                      src={correctImgUrl}
                                      alt='Correct option attachment'
                                      onClick={() =>
                                        openFile({
                                          src: correctImgUrl,
                                          kind: 'image',
                                          name: `Correct Option Image - Q${qi + 1}`,
                                        })
                                      }
                                      className='h-12 w-12 rounded-lg object-cover border border-pw-success/30 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity'
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                        {(q.correctExplanation || (hasCorrectIndex ? correctOpt?.explanation : undefined)) && (
                          <p
                            className='pl-3 text-pw-cyan/90 mt-2 mb-1 whitespace-pre-wrap'
                            dangerouslySetInnerHTML={{
                              __html:
                                'Question Tip: ' +
                                formatDetailVars(q.correctExplanation || correctOpt?.explanation || ''),
                            }}
                          />
                        )}
                        {selOpt?.explanation &&
                          q.correctExplanation !== selOpt.explanation && (
                            <p
                              className='pl-3 border-t border-pw-cyan/40 pt-2 text-pw-cyan/90 italic whitespace-pre-wrap'
                              dangerouslySetInnerHTML={{
                                __html:
                                  'Option Tip: ' +
                                  formatDetailVars(selOpt.explanation),
                              }}
                            />
                          )}
                      </div>
                    );
                  })}
                </Card>
              )}
          </div>
          <div className='flex flex-col sm:flex-row flex-wrap gap-2 w-full mt-4 items-center justify-center'>
            {quiz?.allowRetry && (
              <Button
                variant={'outline'}
                onClick={() => {
                  window.location.reload();
                }}
                className='bg-transparent w-full max-w-[200px] px-4 h-9 border-pw-cyan border-2 flex items-center rounded-xl font-bold'>
                Retry {capFirst(quiz?.type || 'Assessment')}
              </Button>
            )}
            <Link
              href={isLoggedIn ? '/quiz' : '/tools'}
              className='w-full'>
              <Button className='gradient-dark w-full max-w-[300px] px-4 items-center text-center border-none flex h-10 rounded-xl font-bold'>
                Close Quiz
              </Button>
            </Link>
          </div>

          {/* PingWorld compliance disclaimer footer on completion screen */}
          <div className='text-[10px] text-pw-muted leading-tight max-w-sm mx-auto text-center font-body'>
            <div className='divider my-4' />

            <p>
              {(
                quiz?.fromPremium &&
                quiz?.hidePingWorldDisclaimer &&
                quiz?.disclaimer
              ) ?
                <span
                  className='whitespace-pre-wrap'
                  dangerouslySetInnerHTML={{
                    __html: formatDetailVars(quiz.disclaimer),
                  }}
                />
              : `PingWorld is a service provider hosting this ${quiz?.type ?? 'assessment'}. We are not responsible for any questions, responses, or outcomes generated in this ${quiz?.type ?? 'assessment'}.`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0.1, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0.1, x: -5 }}
      key='taker-wrapper'
      onContextMenu={(e) => quiz?.enforceSecurity && e.preventDefault()}
      className={cn(
        'relative min-h-screen flex flex-col bg-pw-bg text-white overflow-x-hidden selection:bg-pw-primary/30 selection:text-white',
        quiz?.enforceSecurity && 'select-none',
      )}>
      {/* Sleek Glowing Background Objects */}
      <div
        className={cn(
          'absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-pw-primary/15 blur-[100px] pointer-events-none',
          !started && 'animate-float',
        )}
      />
      <div
        className={cn(
          'absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pw-cyan/10 blur-[120px] pointer-events-none',
          !started && 'animate-float',
        )}
      />

      {/* Persistent Fullscreen Branding Background & Shade */}

      {quiz?.fromPremium && (
        <>
          {quiz?.branding?.shadeColor && (
            <div
              className='fixed inset-0 min-h-screen w-screen z-0 pointer-events-none transition-all duration-500'
              style={{
                backgroundColor: quiz.branding.shadeColor,
                opacity: 0.35,
              }}
            />
          )}
          {quiz?.branding?.image && (
            <div
              className='fixed inset-0 min-h-screen w-screen z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-500'
              style={{
                backgroundImage: `url(${unpackPingWorldMediaUrl(quiz.branding.image).url || quiz.branding.image})`,
                opacity: quiz.branding.opacity ?? 0.25,
                filter: `blur(${quiz.branding.blur ?? 0}px) brightness(80%)`,
              }}
            />
          )}
          {(quiz?.branding?.image || quiz?.branding?.shadeColor) && (
            <div className='fixed inset-0 min-h-screen w-screen z-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60' />
          )}
        </>
      )}

      {/* Intro Gate */}
      {showIntro && !started && (
        <div
          key='intro-view'
          className='container mx-auto px-6 py-20 max-w-2xl text-center flex-1 flex flex-col justify-center relative z-10'>
          <div className='relative z-10'>
            {/* Show clear foreground image/logo if configured */}
            {quiz?.fromPremium && quiz?.branding?.icon ?
              <Image
                src={quiz?.branding?.icon}
                alt='Intro Logo'
                className='h-20 w-20 object-contain rounded-2xl mb-4 mx-auto border-1 border-white/10 shadow-2xl bg-black/40 bkblur'
              />
            : <div className='flex justify-center mb-6 text-pw-primary'>
                {quiz?.type === 'quiz' ?
                  <Brain size={60} />
                : <MessageCircle size={60} />}
              </div>
            }
            <h1 className='text-2xl sm:text-4xl font-extrabold font-display mb-4 tracking-tight whitespace-pre-wrap'>
              <span
                dangerouslySetInnerHTML={{
                  __html: formatDetailVars(quiz?.title?.toUpperCase() || ''),
                }}
              />
            </h1>
            <p
              className='text-pw-muted leading-relaxed mb-10 max-h-[300px] text-xs overflow-auto px-2 whitespace-pre-wrap'
              dangerouslySetInnerHTML={{
                __html: formatDetailVars(quiz?.description || ''),
              }}
            />
          </div>

          <div className='max-w-sm mx-auto w-full relative z-10'>
            {authRequired ?
              <div
                key='auth-view'
                className='bg-pw-danger/5 p-2 py-3 rounded-2xl border border-pw-danger/20 space-y-6'>
                <Lock className='h-12 w-12 text-pw-danger mx-auto mt-10' />
                <h3 className='text-xl font-bold'>Authentication Required</h3>
                <p className='text-sm text-white/70 '>
                  You'll have to login or sign up for us to be able to track the
                  information and answers from the {quiz?.type}.
                </p>
                <Link
                  href='/login'
                  className='btn-primary h-10 flex items-center justify-center font-bold mt-2'>
                  Sign In
                </Link>
              </div>
            : <Button
                className='w-full btn-primary h-10 text-lg font-bold shadow-xl shadow-pw-primary/20 transition-all hover:scale-105 active:scale-95'
                onClick={() => {
                  if (quiz?.enforceSecurity!) {
                    setShowSecurityProtocol(true);
                  } else if (quiz?.askDetails && quiz?.askDetails.length > 0) {
                    setDetailsCollected(false);
                    setShowDetails(true);
                    setShowSecurityProtocol(false);
                  } else startAssessment();
                  setShowIntro(false);
                }}>
                CONTINUE
              </Button>
            }
          </div>

          {/* Terms disclaimer & Reporting Flow */}
          <div className='text-pw-muted leading-relaxed z-10 pb-4 fixed bottom-0 sm:bottom-1 w-[95%] self-center max-w-2xl'>
            <div className='divider mb-4 mt-10' />
            {quiz?.disclaimer ?
              <p className='mb-1 text-[10px] leading-relaxed text-pw-muted/90'>
                {formatDetailVars(quiz.disclaimer)}
              </p>
            : !quiz?.hidePingWorldDisclaimer ?
              <p className='mb-1 text-[10px] flex flex-col'>
                {quiz?.fromPremium && quiz?.customDisclaimer ?
                  <span
                    className='whitespace-pre-wrap'
                    dangerouslySetInnerHTML={{
                      __html: formatDetailVars(quiz.customDisclaimer),
                    }}
                  />
                : <>
                    PingWorld is only a service provider hosting this{' '}
                    {quiz?.type ?? 'assessment'}.
                    <span>
                      We are not responsible for any questions, responses, or
                      outcomes generated in this {quiz?.type ?? 'assessment'}.
                    </span>
                  </>
                }
              </p>
            : null}
            <button
              onClick={() => setShowReportModal(true)}
              className='text-pw-danger text-[10px] hover:underline transition-colors font-bold tracking-wide'>
              Report this {quiz?.type ?? 'assessment'} for investigation or
              takedown
            </button>
          </div>
        </div>
      )}

      {/* 2. Security Gate */}
      {!showIntro &&
        quiz?.enforceSecurity &&
        showSecurityProtocol &&
        !started &&
        !detailsCollected && (
          <div
            key='security-view'
            className='container relative z-10 mx-auto px-5 py-5 max-w-xl text-center flex-1 flex flex-col justify-center'>
            <div className='sm:bg-pw-primary/5 sm:p-6 sm:rounded-[2.5rem] sm:border sm:border-pw-primary/20 space-y-8 sm:glass sm:bkblur'>
              <div className='flex flex-col items-center gap-4 mt-2'>
                <ShieldCheck className='h-16 w-16 text-pw-primary animate-pulse' />
                <div className='text-center'>
                  <h3 className='text-xl sm:text-2xl font-bold'>
                    Security Protocol
                  </h3>
                  <p className='text-xs text-pw-muted uppercase font-bold tracking-[0.2em] mt-1'>
                    Active Monitoring Enabled
                  </p>
                </div>
              </div>

              <div className='divider' />

              <div className='space-y-6 text-left text-xs sm:text-sm leading-relaxed'>
                <div className='flex gap-4 p-2 px-4 lg:p-4 bg-white/5 rounded-2xl border border-white/5 items-center'>
                  <EyeOff className='h-6 w-6 text-pw-primary shrink-0' />
                  <p>
                    <span className='font-bold text-pw-text'>
                      Tab-Lock System:
                    </span>{' '}
                    Leaving this window or switching tabs will trigger a
                    violation. 3 violations result in immediate submission.
                  </p>
                </div>
                <div className='flex gap-4 p-2 px-4 lg:p-4 bg-white/5 rounded-2xl border border-white/5 items-center'>
                  <Lock className='h-6 w-6 text-pw-primary shrink-0' />
                  <p>
                    <span className='font-bold text-pw-text'>
                      Privacy Lockdown:
                    </span>{' '}
                    Context menus, text selection, and clipboard actions are
                    restricted for integrity.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowSecurityProtocol(false);

                  if (quiz?.askDetails && quiz?.askDetails.length > 0) {
                    setShowDetails(true);
                  } else startAssessment();
                }}
                className='w-full btn-primary h-12 text-lg font-bold shadow-2xl relative overflow-hidden group'>
                I UNDERSTAND & AGREE
              </Button>
            </div>
          </div>
        )}

      {/* 3. Details Gate */}
      {showDetails &&
        !detailsCollected &&
        (quiz?.askDetails || []).length > 0 && (
          <div
            key='details-view'
            className='container relative z-10 mx-auto px-5 py-10 max-w-lg flex-1 flex flex-col justify-center'>
            <div className='sm:bg-white/5 sm:p-6 sm:rounded-[2.5rem] sm:border sm:border-white/10 sm:shadow-2xl sm:glass sm:bkblur'>
              <h3 className='text-sm font-bold mb-8 mt-4 uppercase tracking-widest text-center'>
                ENTER YOUR DETAILS
              </h3>
              <div className='space-y-5'>
                {quiz?.askDetails?.map((detail, idx) => (
                  <div
                    key={(detail?.title as string) + idx}
                    className='space-y-1'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase ml-2'>
                      {detail.title || 'Enter Detail'}
                    </label>
                    {detail.type === 'sex' ?
                      <div className='flex gap-3'>
                        {['Male', 'Female'].map((s, idx) => (
                          <Button
                            key={s + 'detail-field' + idx}
                            variant='outline'
                            onClick={() =>
                              setUserData({ ...userData, [detail.title]: s })
                            }
                            className={cn(
                              'flex-1 h-11 rounded-2xl transition-all',
                              userData[detail.title] === s ?
                                'bg-pw-primary text-white border-pw-primary shadow-lg shadow-pw-primary/30'
                              : 'bg-black/20 hover:bg-black/40',
                            )}>
                            {s}
                          </Button>
                        ))}
                      </div>
                    : detail.type === 'dropdown' ?
                      <div
                        className='flex gap-2 w-full'
                        style={{
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                        <p className='title font-bold'>{detail.title}</p>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={'w-[40%] min-w-[100px] overflow-hidden'}>
                            <Button
                              variant='outline'
                              className='h-8 text-xs w-full flex justify-between rounded-xl bg-pw-surface/60 bkblur'>
                              {userData[detail.title] || 'Select'}
                              <ChevronDown size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className='w-56 bg-pw-surface/70 bkblur border-white/10 rounded-2xl'>
                            {detail.options?.map((opt, index) => (
                              <DropdownMenuItem
                                key={opt + index + 'dropdown-option'}
                                onClick={() =>
                                  setUserData({
                                    ...userData,
                                    [detail.title]: opt,
                                  })
                                }
                                className='h-8 rounded-xl focus:bg-pw-primary/10 cursor-pointer group justify-between gap-1 text-white/90 hover:text-white'>
                                <span className='line-clamp-1 truncate'>
                                  {capFirst(opt)}
                                </span>{' '}
                                <ChevronRight className='group-hover:scale-1.05' />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    : detail.type === 'dob' ?
                      <>
                        <input
                          type={'date'}
                          max={(() => {
                            const latest = new Date();
                            latest.setFullYear(
                              latest.getFullYear() -
                                Math.max(0, Number(detail.minAge) || 0),
                            );
                            return new Date(
                              latest.getTime() -
                                latest.getTimezoneOffset() * 60_000,
                            )
                              .toISOString()
                              .slice(0, 10);
                          })()}
                          className='w-full h-12 bg-black/20 border border-white/10 rounded-2xl px-5 text-sm focus:border-pw-primary outline-none transition-all focus:ring-1 focus:ring-pw-primary'
                          placeholder={`Enter ${detail.title}...`}
                          value={userData[detail.title] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const today = new Date(
                              Date.now() -
                                new Date().getTimezoneOffset() * 60_000,
                            )
                              .toISOString()
                              .slice(0, 10);
                            if (value > today) {
                              toast.error(
                                'Date of birth cannot be in the future.',
                              );
                              return;
                            }
                            if (
                              value &&
                              detail.minAge &&
                              Number(getDobGetter(value, 'age')) < detail.minAge
                            ) {
                              toast.error(
                                `You must be at least ${detail.minAge} years old.`,
                              );
                              return;
                            }
                            setUserData({ ...userData, [detail.title]: value });
                          }}
                        />
                        {userData[detail.title] && (
                          <p className='text-xs py-1 pl-1 text-pw-primary font-medium'>
                            {formatDobToWords(userData[detail.title])}{' '}
                            <span className='text-pw-muted'>
                              (age {getDobGetter(userData[detail.title], 'age')}
                              )
                            </span>
                          </p>
                        )}
                      </>
                    : <input
                        type={
                          detail.type === 'email' ? 'email'
                          : detail.type === 'tel' ?
                            'tel'
                          : detail.type === 'date' ?
                            'date'
                          : detail.type === 'number' ?
                            'number'
                          : 'text'
                        }
                        minLength={
                          (
                            detail.type === 'tel' ||
                            detail.type === 'number' ||
                            detail.type === 'input'
                          ) ?
                            detail.minLength
                          : undefined
                        }
                        maxLength={
                          (
                            detail.type === 'tel' ||
                            detail.type === 'number' ||
                            detail.type === 'input'
                          ) ?
                            detail.maxLength
                          : undefined
                        }
                        className='w-full h-12 bg-black/20 bkblur border border-white/10 rounded-2xl px-5 text-sm focus:border-pw-primary outline-none transition-all focus:ring-1 focus:ring-pw-primary'
                        placeholder={`Enter ${detail.title}...`}
                        value={userData[detail.title] || ''}
                        onChange={(e) =>
                          setUserData({
                            ...userData,
                            [detail.title]: e.target.value,
                          })
                        }
                      />
                    }
                    {(detail.minLength || detail.maxLength) && (
                      <div className='flex justify-between items-center text-[10px] px-1 text-pw-muted mt-1'>
                        <span>
                          {detail.minLength === detail.maxLength ?
                            `${detail.maxLength} chars expected`
                          : `
                          ${detail.minLength ? `Min: ${detail.minLength} chars` : ''}
                          ${detail.minLength && detail.maxLength ? ' • ' : ''}
                          ${detail.maxLength ? `Max: ${detail.maxLength} chars` : ''}
                          `
                          }
                        </span>
                        <span
                          className={cn(
                            'font-mono',
                            detail.minLength &&
                              (userData[detail.title]?.length || 0) <
                                detail.minLength &&
                              'text-pw-warning',
                            detail.maxLength &&
                              (userData[detail.title]?.length || 0) >
                                detail.maxLength &&
                              'text-pw-danger font-bold',
                          )}>
                          {(userData[detail.title] || '').length}
                          {detail.maxLength ? `/${detail.maxLength}` : ' chars'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  className='btn-primary h-12 w-full mt-6 text-lg font-bold shadow-xl shadow-pw-primary/20'
                  onClick={() => {
                    const complete = quiz?.askDetails?.every(
                      (d) =>
                        userData[d.title] &&
                        String(userData[d.title]).trim() !== '',
                    );
                    if (!complete)
                      return toast.error('Required detail fields are missing.');

                    let validationError = '';
                    let mismatch = false;
                    const cleanUserData: Record<string, any> = { ...userData };

                    for (const d of quiz?.askDetails || []) {
                      const rawEntered = userData[d.title];
                      const val =
                        typeof rawEntered === 'string' ?
                          rawEntered.trim()
                        : String(rawEntered || '').trim();
                      cleanUserData[d.title] = val;

                      // 1. Min length validation
                      if (
                        d.minLength !== undefined &&
                        d.minLength !== null &&
                        val.length < d.minLength
                      ) {
                        validationError = `${d.title || 'Field'} must be at least ${d.minLength} characters (currently ${val.length}).`;
                        break;
                      }

                      // 2. Max length validation
                      if (
                        d.maxLength !== undefined &&
                        d.maxLength !== null &&
                        val.length > d.maxLength
                      ) {
                        validationError = `${d.title || 'Field'} cannot exceed ${d.maxLength} characters.`;
                        break;
                      }

                      // 3. Restricted / Prohibited keywords validation
                      if (
                        (d as any).restrictedKeywords &&
                        String((d as any).restrictedKeywords).trim() !== ''
                      ) {
                        const rawRestricted = String(
                          (d as any).restrictedKeywords,
                        ).trim();
                        const restrictedList = rawRestricted
                          .split(',')
                          .map((k) => k.trim().toLowerCase())
                          .filter(Boolean);
                        const valLower = val.toLowerCase();

                        let matchedRestricted: string | null = null;
                        for (const rk of restrictedList) {
                          if (valLower.includes(rk)) {
                            matchedRestricted = rk;
                            break;
                          }
                        }

                        if (!matchedRestricted) {
                          try {
                            const regex = new RegExp(rawRestricted, 'i');
                            if (regex.test(val)) {
                              matchedRestricted = rawRestricted;
                            }
                          } catch {}
                        }

                        if (matchedRestricted) {
                          validationError = `Invalid input: "${d.title}" contains restricted keyword ("${matchedRestricted}").`;
                          break;
                        }
                      }

                      // 4. Administrative Allowlist validation
                      if (d.allowlist && d.allowlist.trim() !== '') {
                        const rawAllow = d.allowlist.trim();
                        const allowedItems = rawAllow
                          .split(',')
                          .map((item) => item.trim());

                        let matched = allowedItems.some(
                          (item) => item.toLowerCase() === val.toLowerCase(),
                        );

                        if (!matched) {
                          try {
                            const regex = new RegExp(rawAllow, 'i');
                            matched = regex.test(val);
                          } catch {}
                        }

                        if (!matched) {
                          mismatch = true;
                          showAlert(
                            quiz?.allowlistMessage ||
                              `Access Denied: The entered ${d.title} ("${val}") does not match the required administrative allowlist.`,
                          );
                          break;
                        }
                      }
                    }

                    if (validationError) {
                      toast.error(validationError);
                      return;
                    }

                    if (mismatch) return;

                    setUserData(cleanUserData);
                    setDetailsCollected(true);
                    startAssessment(cleanUserData);
                  }}>
                  START {quiz?.type?.toUpperCase() || 'ASSESSMENT'}
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* 4. Active Assessment View */}
      {started && quiz && (
        <div
          key='assessment-view'
          className={cn(
            'container relative z-10 p-0 mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-10 max-w-7xl flex flex-col max-h-screen overflow-y-auto',
            quizTheme === 'dark' ? 'text-white' : 'text-black',
          )}>
          {!isOnline && (
            <motion.div
              className='p-3 bg-pw-warning/10 border border-pw-warning/20 text-pw-warning text-xs font-bold rounded-3xl flex items-center gap-2 mb-2 w-fit self-center'
              exit={{ opacity: 0, y: -5 }}>
              <AlertTriangle className='h-4.5 w-4.5 shrink-0 text-pw-warning ml-1' />
              <span>
                Offline Mode: Your responses will be saved securely on this
                device and uploaded once connection is restored.
              </span>

              <X
                className='h-4.5 w-4.5 shrink-0 text-pw-warning cursor-pointer'
                onClick={() => {
                  setIsOnline(!isOnline);
                }}
              />
            </motion.div>
          )}
          <div className='mb-6 flex flex-col gap-2 w-full relative self-center max-w-4xl'>
            {/* Brand Icon */}
            {quiz?.fromPremium && quiz?.branding?.icon && (
              <div className='flex justify-center mb-4'>
                <Image
                  src={quiz?.branding?.icon}
                  alt='Brand Logo'
                  className='h-15 w-auto rounded-xl object-contain drop-shadow-md'
                />
              </div>
            )}

            {/* Disclaimer Banner */}
            {quiz?.fromPremium && quiz?.customDisclaimer && (
              <div className='flex items-start gap-3 p-3 bg-pw-warning/5 border border-pw-warning/20 rounded-2xl mb-3 text-xs text-pw-muted leading-relaxed'>
                <AlertTriangle
                  size={14}
                  className='text-pw-warning shrink-0 mt-0.5'
                />
                <span
                  className='whitespace-pre-wrap'
                  dangerouslySetInnerHTML={{
                    __html: formatDetailVars(quiz.customDisclaimer),
                  }}
                />
              </div>
            )}

            {/* Header Row */}
            <div className='sticky top-0 z-30 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 rounded-4xl border border-white/10 bg-pw-surface/90 p-2 shadow-xl backdrop-blur-2xl self-center'>
              <div className='flex items-center gap-4 pl-3'>
                <h1 className='text-lg md:text-xl font-bold font-display tracking-tight leading-none'>
                  <span
                    className='whitespace-pre-wrap truncate'
                    dangerouslySetInnerHTML={{
                      __html: formatDetailVars(quiz?.title || ''),
                    }}
                  />
                </h1>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  title={`Quit ${capFirst(quiz.type)}`}
                  size='sm'
                  onClick={() =>
                    confirmLeaveQuiz(() => (window.location.href = '/quiz'))
                  }
                  className='h-10 px-4 gap-2 rounded-full text-pw-danger hover:bg-pw-danger/10 hover:text-pw-danger transition-all active:scale-95 border border-pw-danger/10'>
                  <LogOut size={16} />
                  <span className='hidden sm:inline font-bold text-pw-danger'>
                    Quit
                  </span>
                </Button>

                {/* Report button */}
                <Button
                  variant='ghost'
                  size='icon'
                  title='Report this quiz'
                  onClick={() => setShowReportModal(true)}
                  className='h-9 w-9 rounded-full text-pw-muted hover:text-pw-danger hover:bg-pw-danger/10 transition-all border border-white/5'>
                  <Flag size={14} />
                </Button>

                {quiz?.allowEarlySubmit && (
                  <Button
                    title={`Submit ${capFirst(quiz.type)}`}
                    onClick={confirmSubmitQuiz}
                    className='h-10 px-4 rounded-full gap-2 bg-pw-success/10 border border-pw-success/20 text-pw-success hover:bg-pw-success/20 font-black text-xs transition-all active:scale-95 shadow-lg shadow-pw-success/10 hidden md:flex ml-4'>
                    <CheckCircle2 size={16} />
                    <span className='font-bold'>SUBMIT</span>
                  </Button>
                )}
              </div>
            </div>

            <div className='flex flex-col gap-3 mb-2 pt-1 px-2'>
              {/* Only show progress bar if NO branching is detected */}
              {(() => {
                const hasBranching = activeQuestions.some(
                  (quest) =>
                    quest.skipTo ||
                    quest.skipToCat ||
                    (quest.inputBranchRules &&
                      quest.inputBranchRules.length > 0) ||
                    (quest.options as any[])?.some(
                      (opt: any) => opt?.skipTo || opt?.skipToCat,
                    ),
                );
                if (hasBranching) return null;

                return (
                  <div className='w-full min-w-full h-2 rounded-full overflow-hidden bg-pw-cyan/10 z-[100] backdrop-blur-sm mx-1'>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(answeredCount / activeQuestions.length) * 100}%`,
                      }}
                      className='h-full gradient-brand animate-shimmer rounded-full shadow-[0_0_15px_rgba(var(--pw-primary-rgb),0.5)] transition-all duration-500'
                    />
                  </div>
                );
              })()}

              <div
                className={cn(
                  'flex w-full gap-2 items-center flex-wrap',
                  quiz?.timer?.hasTimer && timeLeft !== null ?
                    'justify-between'
                  : 'justify-end',
                )}>
                <div className='flex items-center gap-2'>
                  {quiz?.timer?.hasTimer && timeLeft !== null && (
                    <div
                      title={`${capFirst(quiz?.type)} Timer`}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-mono lg:text-sm border transition-all',
                        timeLeft < 60 ?
                          'bg-pw-danger/10 border-pw-danger/50 text-pw-danger animate-pulse'
                        : 'bg-white/5 border-white/10 text-pw-primary',
                      )}>
                      <Clock
                        size={16}
                        className={
                          timeLeft < 60 ? 'text-pw-danger' : 'text-pw-primary'
                        }
                      />
                      {Math.floor(timeLeft / 60)}:
                      {String(timeLeft % 60).padStart(2, '0')}
                    </div>
                  )}

                  {/* Realtime Live Score Display */}
                  {(quiz?.showScore || quiz?.showRealtimeScore) &&
                    quiz?.type === 'quiz' && (
                      <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pw-primary/15 border border-pw-primary/30 text-pw-primary text-xs font-mono font-bold shadow-md'>
                        <Brain className='w-3.5 h-3.5' /> {weightedScore.earned} /{' '}
                        {weightedScore.possible}
                      </div>
                    )}
                </div>

                {quiz?.allowEarlySubmit && (
                  <Button
                    title={`Submit ${capFirst(quiz.type)}`}
                    onClick={confirmSubmitQuiz}
                    className='h-10 max-w-[200px] w-1/3 px-4 rounded-xl gap-2 bg-pw-success/10 border border-pw-success/20 text-pw-success hover:bg-pw-success/20 font-black text-xs transition-all active:scale-95 shadow-lg shadow-pw-success/10 flex md:hidden'>
                    <CheckCircle2 size={18} />
                    <span className='font-bold'>SUBMIT</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence mode='wait'>
            {/* ===== SCROLL MODE: all answered + current question vertically ===== */}
            {(
              quiz?.quizScroll &&
              (quiz?.quizLayout === 'scroll_show' || !quiz?.quizLayout)
            ) ?
              <div className='flex max-h-[calc(100dvh-7rem)] min-h-0 flex-col items-center w-full gap-0 overflow-y-auto overscroll-contain px-2 pb-4 custom-scrollbar'>
                {(quiz?.quizLayout === 'scroll_show'
                  ? activeQuestions.filter((question, idx) => scrollShowBranchActive.current
                    ? Boolean(scrollBranchQuestionIds?.includes(question.id))
                    : idx <= currentQuestion)
                  : activeQuestions)
                  .map((quest, idx) => ({ quest, idx }))
                  .filter(
                    ({ quest, idx }) =>
                      idx === currentQuestion ||
                      userAnswers.some(
                        (answer) => answer.questionId === quest.id,
                      ),
                  )
                  .map(({ quest, idx }) => renderQuestionCard(quest, idx))}
                <div ref={bottomRef} />

                <div className='flex items-center gap-3 mt-4'>
                  {quiz?.allowPass && (
                    <Button
                      onClick={handlePass}
                      variant='outline'
                      className='h-11 px-6 rounded-xl font-bold gap-1.5 border-white/10 hover:border-pw-warning/40 text-pw-warning/80 hover:text-pw-warning hover:bg-pw-warning/10 transition-all'>
                      Skip <SkipForward className='h-4 w-4' />
                    </Button>
                  )}
                  <Button
                    onClick={() => handleNext()}
                    disabled={isSubmitting || isPreparingResponseFile}
                    className='btn-primary h-11 px-10 rounded-xl font-bold gap-2'>
                    {isSubmitting ?
                      <>
                        <LoaderCircle className='h-4 w-4 animate-spin' />{' '}
                        Saving...
                      </>
                    : currentQuestion + 1 === activeQuestions.length ?
                      quiz?.nextButtonText ||
                      `Finish ${quiz?.type || 'Assessment'}`
                    : quiz?.nextButtonText || 'Next'}
                    {!isSubmitting && <ChevronRight className='h-4 w-4' />}
                  </Button>
                </div>
              </div>
            : quiz?.quizScroll && quiz?.quizLayout === 'scroll' ?
              <div className='flex flex-col items-center w-full gap-0'>
                {activeQuestions.map((quest, idx) =>
                  renderQuestionCard(quest, idx),
                )}
                <div ref={bottomRef} />

                <div className='flex items-center gap-3 mt-4'>
                  <Button
                    onClick={() => {
                      const missing = activeQuestions.find((question) => {
                        const saved = userAnswers.find(
                          (answer) => answer.questionId === question.id,
                        );
                        const value =
                          scrollAnswers[question.id] ?? saved?.answer;
                        if (question.type === 'upload') return !saved?.fileUrl;
                        if (question.type === 'checkbox')
                          return !Array.isArray(value) || value.length === 0;
                        if (question.type === 'input')
                          return !String(value ?? '').trim();
                        if (question.type === 'rating')
                          return (
                            !Number.isFinite(Number(value)) || Number(value) < 1
                          );
                        return (
                          value === null || value === undefined || value === ''
                        );
                      });
                      if (missing) {
                        toast.error(
                          `Please answer “${missing.text}” before finishing.`,
                        );
                        document
                          .getElementById(`question-${missing.id}`)
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        return;
                      }
                      void finalizeQuiz(userAnswers);
                    }}
                    disabled={isSubmitting || isPreparingResponseFile}
                    className='btn-primary h-12 px-10 rounded-2xl font-black gap-4 shadow-2xl shadow-pw-primary/30 transition-all hover:scale-[1.02] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none'>
                    {isSubmitting ?
                      <>
                        <LoaderCircle className='h-4 w-4 animate-spin' />{' '}
                        Saving...
                      </>
                    : quiz?.nextButtonText ||
                      `FINISH ${quiz?.type || 'Assessment'}`
                    }
                    {!isSubmitting && <CheckCircle2 className='h-5 w-5' />}
                  </Button>
                </div>
              </div>
            : <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
                <div
                  className={cn(
                    q?.accessory && q?.accessory !== 'none' ?
                      'lg:col-span-8'
                    : 'lg:col-span-12',
                  )}>
                  {!q ?
                    <div className='flex flex-col items-center justify-center min-h-[40vh] text-center p-6 bg-white/5 rounded-[3rem] border border-white/5'>
                      <AlertTriangle className='h-12 w-12 text-pw-warning mb-4 opacity-50' />
                      <h2 className='text-xl font-bold mb-2'>
                        Question Not Found
                      </h2>
                      <p className='text-sm text-pw-muted max-w-xs'>
                        There was an issue loading this question. This can
                        happen if the quiz routing is invalid.
                      </p>
                      <Button
                        onClick={() => setCurrentQuestion(0)}
                        className='mt-6 btn-ghost'>
                        Return to Start
                      </Button>
                    </div>
                  : <div className='flex flex-col items-center w-full justify-center gap-2'>
                      <div className='flex items-center gap-2'>
                        {questionTimeLeft !== null && (
                          <div className='badge bg-pw-warning/10 text-pw-warning border-pw-warning/20 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1'>
                            <Clock
                              size={12}
                              className='animate-pulse'
                            />
                            <span>{questionTimeLeft}s</span>
                          </div>
                        )}
                      </div>

                      <div className='w-full flex flex-col items-center gap-1'>
                        {q?.accessory && q.accessory !== 'none' && (
                          <Button
                            type='button'
                            onClick={() => setShowMobileAccessory(true)}
                            className='lg:hidden w-full mb-2 rounded-xl border border-pw-primary/25 bg-pw-primary/10 text-pw-primary'>
                            Open {q.accessory.replaceAll('_', ' ')} tool
                          </Button>
                        )}
                        {renderQuestionCard(q!, currentQuestion)}

                        <div className='flex justify-between w-full gap-4 flex-wrap mt-8'>
                          <AnimatePresence mode='sync'>
                            {quiz.canGoBack && currentQuestion > 0 && (
                              <Button
                                onClick={GoBack}
                                className='btn-ghost h-10 px-8 text-sm rounded-2xl gap-2 font-bold'>
                                <ChevronLeft className='h-4 w-4' />
                                {quiz?.prevButtonText || 'Previous'}
                              </Button>
                            )}

                            <div className='flex items-center gap-3 ml-auto'>
                              {quiz?.allowPass && (
                                <Button
                                  onClick={handlePass}
                                  variant='outline'
                                  className='h-10 px-5 text-xs rounded-2xl gap-1.5 font-bold border-white/10 hover:border-pw-warning/40 text-pw-warning/80 hover:text-pw-warning hover:bg-pw-warning/10 transition-all'>
                                  Skip <SkipForward className='h-3.5 w-3.5' />
                                </Button>
                              )}

                              <Button
                                onClick={handleNext}
                                disabled={
                                  isSubmitting || isPreparingResponseFile
                                }
                                className='btn-primary h-10 px-8 rounded-2xl font-black gap-2 shadow-2xl shadow-pw-primary/30 transition-all hover:scale-[1.02] active:scale-[0.96]'>
                                {isSubmitting ?
                                  <>
                                    <LoaderCircle className='h-4 w-4 animate-spin' />{' '}
                                    Saving...
                                  </>
                                : (
                                  currentQuestion + 1 === activeQuestions.length
                                ) ?
                                  quiz?.nextButtonText || 'FINISH'
                                : quiz?.nextButtonText || 'NEXT'}
                                {!isSubmitting && (
                                  <ChevronRight className='h-4 w-4' />
                                )}
                              </Button>
                            </div>
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  }
                </div>

                {/* Assistant Sidebar */}
                <div className='hidden lg:block lg:col-span-4 space-y-6'>
                  {q?.accessory && q.accessory !== 'none' && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='sticky top-10'>
                      <div className='flex items-center gap-2 mb-4 px-4'>
                        <AlertTriangle
                          size={14}
                          className='text-pw-primary'
                        />
                        <h4 className='text-[10px] font-black text-pw-muted uppercase tracking-[0.3em]'>
                          TOOLS
                        </h4>
                      </div>
                      {q.accessory === 'calculator' && <Calculator />}
                      {q.accessory === 'note' && (
                        <NoteSheet note={q.accessoryNote || ''} />
                      )}
                      {q.accessory === 'periodic_table' && <PeriodicTable />}
                      {q.accessory === 'formula_sheet' && (
                        <FormulaSheet
                          config={q.accessoryConfig}
                          customFormulas={q.accessoryNote}
                        />
                      )}
                      {q.accessory === 'glossary' && <Glossary />}
                    </motion.div>
                  )}
                </div>

                {showMobileAccessory &&
                  q?.accessory &&
                  q.accessory !== 'none' && (
                    <div
                      className='fixed inset-0 z-[95] flex flex-col bg-slate-950/95 text-pw-text backdrop-blur-2xl lg:hidden'
                      role='dialog'
                      aria-modal='true'
                      aria-label={`${q.accessory} tool`}>
                      <header className='flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4 py-3'>
                        <h2 className='truncate font-bold capitalize'>
                          {q.accessory.replaceAll('_', ' ')}
                        </h2>
                        <Button
                          type='button'
                          onClick={() => setShowMobileAccessory(false)}
                          className='rounded-xl border border-white/10 bg-white/5 px-4'>
                          Close
                        </Button>
                      </header>
                      <div className='min-h-0 flex-1 overflow-auto p-3 sm:p-5'>
                        {q.accessory === 'calculator' && <Calculator />}
                        {q.accessory === 'note' && (
                          <NoteSheet note={q.accessoryNote || ''} />
                        )}
                        {q.accessory === 'periodic_table' && <PeriodicTable />}
                        {q.accessory === 'formula_sheet' && (
                          <FormulaSheet
                            config={q.accessoryConfig}
                            customFormulas={q.accessoryNote}
                          />
                        )}
                        {q.accessory === 'glossary' && <Glossary />}
                      </div>
                    </div>
                  )}
              </div>
            }
          </AnimatePresence>
        </div>
      )}

      {/* Report Takedown Modal */}
      {showReportModal && (
        <div className='fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4'>
          <div className='bg-pw-surface border border-white/10 rounded-3xl p-3 max-w-md w-full shadow-2xl space-y-4 text-pw-text'>
            <h3 className='text-xl font-bold font-display text-pw-danger text-left'>
              Report Assessment
            </h3>
            {reportedStatus ?
              <div className='p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl text-center'>
                Thank you! Your report has been securely registered and flagged
                for takedown review.
              </div>
            : <div className='space-y-3'>
                <p className='text-xs text-pw-muted text-left'>
                  Please provide a detailed reason for reporting this assessment
                  (e.g., copyright violation, offensive content, cheating,
                  academic fraud). Our safety team will investigate within 24
                  hours.
                </p>

                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                    Category
                  </label>
                  <div className='flex flex-wrap gap-2'>
                    {[
                      'Spam',
                      'Harassment',
                      'Cheating',
                      'Inappropriate Content',
                      'Copyright',
                      'Other',
                    ].map((cat, idx) => (
                      <button
                        key={cat + idx}
                        onClick={() => setReportCategory(cat)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                          reportCategory === cat ?
                            'bg-pw-danger/10 border-pw-danger text-pw-danger'
                          : 'bg-white/5 border-white/10 text-pw-muted hover:border-white/20',
                        )}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest'>
                    Additional Notes
                  </label>
                  <textarea
                    rows={4}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder='Describe your report reason here...'
                    className='w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-pw-text focus:outline-none focus:border-pw-danger'
                  />
                </div>

                <div className='flex gap-2'>
                  <Button
                    onClick={() => setShowReportModal(false)}
                    variant='outline'
                    className='h-10 text-xs flex-1 border-white/10'>
                    Cancel
                  </Button>
                  <Button
                    disabled={isSubmittingReport}
                    onClick={async () => {
                      if (!reportReason.trim()) {
                        toast.error('Please enter a reason');
                        return;
                      }
                      if (!quiz?.id) return;
                      setIsSubmittingReport(true);
                      try {
                        const response = await fetch(
                          `/api/quizzes/${encodeURIComponent(quiz.id)}/report`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              category: reportCategory,
                              reason: reportReason,
                            }),
                          },
                        );
                        const result = await response.json().catch(() => ({}));
                        if (!response.ok)
                          throw new Error(
                            result.error || 'Could not submit report.',
                          );
                        setReportedStatus(true);
                        toast.success(
                          result.message || 'Assessment report received.',
                        );
                        setTimeout(() => {
                          setShowReportModal(false);
                          setReportedStatus(false);
                          setReportReason('');
                          setReportCategory('');
                        }, 2500);
                      } catch (error) {
                        toast.error(
                          error instanceof Error ?
                            error.message
                          : 'Could not submit report.',
                        );
                      } finally {
                        setIsSubmittingReport(false);
                      }
                    }}
                    className='h-10 text-xs flex-1 bg-pw-danger hover:bg-pw-danger/80 text-white font-bold'>
                    {isSubmittingReport ?
                      <>
                        <LoaderCircle className='mr-2 h-4 w-4 animate-spin' />
                        Sending…
                      </>
                    : 'Submit Report'}
                  </Button>
                </div>
              </div>
            }
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function PublicQuizTaker() {
  return (
    <AnimatePresence mode='wait'>
      <Taker />
    </AnimatePresence>
  );
}
