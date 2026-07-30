'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Code,
  Terminal,
  Cpu,
  Copy,
  Check,
  Search,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Zap,
  Lock,
  FileText,
  Music,
  Globe,
  Image as ImageIcon,
  Mail,
  Bell,
  Palette,
  Key,
  RefreshCw,
  MapPin,
  ShieldCheck,
  Clock,
  Database,
  Type,
  Wand2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const DEV_TOOLS = [
  {
    id: 'autocorrect',
    name: 'AutoCorrect Engine',
    category: 'Text & NLP',
    icon: Type,
    description:
      'Text parsing, spell-checking, levendistance suggestion & layout input auto-fixer.',
    method: 'correct',
    color: '#ffe000',
  },
  {
    id: 'tone-correction',
    name: 'Tone Correction',
    category: 'Text & NLP',
    icon: Wand2,
    description:
      'Multi-tone analyzer & rewriter (formal, casual, professional, persuasive, empathetic).',
    method: 'adjustTone',
    color: '#ff00ef',
  },
  {
    id: 'text-array-matrix',
    name: 'Text & Array Matrix',
    category: 'Data & Math',
    icon: Cpu,
    description:
      'Sort, randomize, sentence case, math ops (min, max, sum, avg), and type conversion matrix.',
    method: 'matrixOp',
    color: '#0ef4ce',
  },
  {
    id: 'color-suggestion',
    name: 'Color Suggestion Engine',
    category: 'Design & Graphics',
    icon: Palette,
    description:
      'Detect format, suggest similar colors, match % comparison, shades, alpha & hue shift.',
    method: 'detect',
    color: '#ffad61ff',
  },
  {
    id: 'encryption',
    name: 'Encryption Engine',
    category: 'Security & Auth',
    icon: Lock,
    description:
      'AES-GCM / XOR salted encryption, decryption, salted hashing, and verification.',
    method: 'encrypt',
    color: '#8e61ffff',
  },
  {
    id: 'pdf-doc',
    name: 'PDF & Word Engine',
    category: 'Documents',
    icon: FileText,
    description:
      'Pure PDF 1.4 syntax generator & Word (.doc XML) builder/parser from scratch.',
    method: 'createPDF',
    color: '#ff61a8ff',
  },
  {
    id: 'audio-editing',
    name: 'Audio Editing API',
    category: 'Media & Sound',
    icon: Music,
    description:
      'Web Audio synthesizer, waveform tone generator, trim, volume gain, fade, and WAV export.',
    method: 'generateTone',
    color: '#a770ffff',
  },
  {
    id: 'country-data',
    name: 'Country Data Engine',
    category: 'Geo & Location',
    icon: Globe,
    description:
      'ISO codes, dial codes, flags, emoji rendering with fallback URL images, currencies.',
    method: 'getCountry',
    color: '#1afb0eff',
  },
  {
    id: 'image-editing',
    name: 'Image Editing API',
    category: 'Media & Sound',
    icon: ImageIcon,
    description:
      'Canvas pixel array ops: background removal, hue shift, color swap, saturation.',
    method: 'removeBackground',
    color: '#ff6161ff',
  },
  {
    id: 'email-engine',
    name: 'Email Template Engine',
    category: 'Utilities',
    icon: Mail,
    description:
      'Prebaked HTML email templates (OTP, professional, marketing, social) for Gmail/Outlook.',
    method: 'generateTemplate',
    color: '#ff2d55',
  },
  {
    id: 'alerting-toast',
    name: 'Alert & Toast Engine',
    category: 'Utilities',
    icon: Bell,
    description:
      'Audio-visual alert system with audio chime, haptic vibration API, screen flash, and accessibility.',
    method: 'trigger',
    color: '#ff9500',
  },
  {
    id: 'styling-engine',
    name: 'Styling Engine',
    category: 'Design & Graphics',
    icon: Zap,
    description:
      'Auto CSS decorator engine for liquid glass, glassmorphism, buttons, paddings, and script injection.',
    method: 'generateCSS',
    color: '#34c759',
  },
  {
    id: 'secure-state',
    name: 'Secure State Manager',
    category: 'Security & Auth',
    icon: Key,
    description:
      'Key-segregated encrypted state store, category isolation, one-time read/write for React/RN.',
    method: 'setSecretState',
    color: '#af52de',
  },
  {
    id: 'recaller',
    name: 'Recaller Fetch Engine',
    category: 'Networking',
    icon: RefreshCw,
    description:
      'High performance data fetcher with TTL cache, exponential retry, and request de-duplication.',
    method: 'fetchData',
    color: '#5ac8fa',
  },
  {
    id: 'location-engine',
    name: 'Location API Engine',
    category: 'Geo & Location',
    icon: MapPin,
    description:
      'Browser geolocation wrapper, lat/lng country mapping, Haversine distance, and accuracy check.',
    method: 'getCurrentLocation',
    color: '#ff3b30',
  },
  {
    id: 'password-utility',
    name: 'Password Utility',
    category: 'Security & Auth',
    icon: ShieldCheck,
    description:
      'Strength score (0-100), entropy bit evaluation, policy check, salted hash, and generator.',
    method: 'evaluate',
    color: '#32ade6',
  },
  {
    id: 'session-engine',
    name: 'Session Token Engine',
    category: 'Security & Auth',
    icon: Clock,
    description:
      'JWT-like HMAC session token creation, expiration verification, rotation, and comparison.',
    method: 'createSessionToken',
    color: '#007aff',
  },
  {
    id: 'db-validation',
    name: 'DB Validation Handler',
    category: 'Data & Math',
    icon: Database,
    description:
      'Type-safe schema validator, optional missing key null fallbacks, and required field enforcer.',
    method: 'validateAndSanitize',
    color: '#a2845e',
  },
];

const CATEGORIES = [
  'All',
  'Text & NLP',
  'Security & Auth',
  'Design & Graphics',
  'Data & Math',
  'Geo & Location',
  'Documents',
  'Media & Sound',
  'Networking',
  'Utilities',
];

export default function DeveloperHubPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTools = DEV_TOOLS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const copyFetchSnippet = (apiId: string, method: string) => {
    const code = `fetch('/api/call/${apiId}', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ method: '${method}', data: 'sample input' })\n}).then(res => res.json()).then(console.log);`;
    navigator.clipboard.writeText(code);
    setCopiedId(apiId);
    toast.success(`Copied fetch snippet for ${apiId}!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className='container mx-auto py-12 max-w-7xl px-4 min-h-screen'>
      {/* Header */}
      <div className='w-full flex flex-col md:flex-row items-center justify-between gap-6 mb-12'>
        <div>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pw-primary/10 border border-pw-primary/20 text-pw-primary text-xs font-mono mb-4'>
            <Terminal className='h-3.5 w-3.5' />
            Dev Tools
          </div>
          <h1 className='text-4xl md:text-6xl font-extrabold font-display leading-tight mb-4'>
            Developer <span className='gradient-text'>APIs & Tools</span>
          </h1>
          <p className='text-pw-muted max-w-2xl'>
            18 Class-based productivity engines built from scratch. Call
            directly via TypeScript classes or consume via Edge/Cron API
            endpoints.
          </p>
        </div>

        {/* Search */}
        <div className='w-full md:w-[360px] relative'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-pw-muted' />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search APIs...'
            className='card-glow pl-11 h-12 bg-pw-surface/50 border-white/10'
          />
        </div>
      </div>

      {/* Categories */}
      <div className='flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2'>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant='ghost'
            onClick={() => setActiveCategory(cat)}
            className={`h-9 rounded-full px-5 text-xs font-medium transition-all ${
              activeCategory === cat ?
                'bg-pw-primary text-black font-bold shadow-lg shadow-pw-primary/20'
              : 'bg-white/5 text-pw-muted hover:text-pw-text hover:bg-white/10'
            }`}>
            {cat}
          </Button>
        ))}
      </div>

      {/* Grid of APIs */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredTools.map((tool) => {
          const ToolIcon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}>
              <Card className='card-glow bkblur h-full flex flex-col p-6 group hover:border-pw-primary/40 transition-all'>
                <div className='flex justify-between items-start mb-4'>
                  <div className='w-12 h-12 rounded-xl flex items-center justify-center bg-pw-primary/10 border border-pw-primary/20 text-pw-primary group-hover:scale-110 transition-transform' style={{backgroundColor : `${tool?.color}15`, borderColor:tool?.color || 'cyan'}}>
                    <ToolIcon className='h-6 w-6' color={tool?.color || 'cyan'} />
                  </div>
                  <span className='text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-pw-muted'>
                    {tool.category}
                  </span>
                </div>

                <h3 className='text-xl font-bold font-display mb-2 group-hover:text-pw-primary transition-colors flex items-center justify-between'>
                  {tool.name}
                  <ChevronRight className='h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity' />
                </h3>
                <p className='text-pw-muted text-sm leading-relaxed flex-1 mb-6'>
                  {tool.description}
                </p>

                <div className='flex items-center gap-2 pt-4 border-t border-white/5'>
                  <Button
                    onClick={() => copyFetchSnippet(tool.id, tool.method)}
                    variant='outline'
                    className='flex-1 h-9 text-xs border-white/10 hover:bg-white/5 gap-1.5'>
                    {copiedId === tool.id ?
                      <Check className='h-3.5 w-3.5 text-emerald-400' />
                    : <Copy className='h-3.5 w-3.5' />}
                    Copy Fetch
                  </Button>
                  <Link href={`/api/${tool.id}`}>
                    <Button className='h-9 text-xs bg-pw-primary/10 hover:bg-pw-primary px-4 text-pw-primary hover:text-white font-semibold gap-1'>
                      Docs & Sandbox
                      <ExternalLink className='h-3 w-3' />
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
