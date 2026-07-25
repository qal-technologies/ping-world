'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  PenTool,
  MessageCircle,
  Type,
  ImageIcon,
  Link2,
  QrCode,
  Palette,
  Lock,
  FileText,
  Trophy,
  Compass,
  Calculator,
  FileCode,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Users,
  Eye,
  Sparkles,
  HelpCircle,
  Settings2,
  Globe,
} from 'lucide-react';
import { toolDocsDb, DocFeature } from '@/lib/general/docs-data';
import { tools } from '@/lib/general/data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Icon resolver helper
const iconMap: Record<string, any> = {
  quizzable: Brain,
  composer: PenTool,
  anonlink: MessageCircle,
  editor: Type,
  image: ImageIcon,
  shortener: Link2,
  'qr-code': QrCode,
  'color-palette': Palette,
  'password-gen': Lock,
  'word-counter': FileText,
  games: Trophy,
  'ip-locator': Compass,
  calculator: Calculator,
  notes: FileCode,
  encryption: Lock,
  'pdf-tools': FileText,
  countries: Globe,
};

const colorMap: Record<string, string> = {
  quizzable: '#18cb83',
  composer: '#0ebae1',
  anonlink: '#7b8afb',
  editor: '#f622fd',
  image: '#FFB347',
  shortener: '#fe7790',
  'qr-code': '#adff72',
  'color-palette': '#ea6b89',
  'password-gen': '#00ba7c',
  'word-counter': '#ff8c42',
  games: '#bc1888',
  'ip-locator': '#ff5c7a',
  calculator: '#1d9bf0',
  notes: '#22c985',
  encryption: '#985cff',
  'pdf-tools': '#ff3b30',
  countries: '#00fffb',
};

function isCompatible(feature: DocFeature, selectedVersion: string): boolean {
  const vToNum = (v: string) => (v === 'basic' ? 0 : parseFloat(v));
  const curNum = parseFloat(selectedVersion);
  const introNum = vToNum(feature.introduced);
  const endNum = feature.ended ? parseFloat(feature.ended) : Infinity;

  return curNum >= introNum && curNum < endNum;
}

export default function DocsClient({ id }: { id: string }) {
  const doc = toolDocsDb[id];

  // If doc not found, render a friendly fallback
  if (!doc) {
    return (
      <div className='container mx-auto px-6 py-24 flex flex-col items-center gap-1 text-center max-w-2xl'>
        <HelpCircle className='h-16 w-16 text-pw-muted/40 mx-auto mb-6 animate-pulse' />
        <h1 className='text-3xl font-extrabold font-display'>
          Documentation Not Found
        </h1>
        <p className='text-pw-muted mb-8 px-2'>
          The requested tool documentation could not be retrieved from the
          catalog database. Let's return to the homepage.
        </p>
        <Link href='/tools'>
          <Button className='btn-primary h-10 px-10 font-bold'>
            Browse Tools
          </Button>
        </Link>
      </div>
    );
  }

  // Handle selected version (defaulting to the latest version)
  const defaultVersion = doc.versions[doc.versions.length - 1] || '1.0';
  const [selectedVersion, setSelectedVersion] = useState(defaultVersion);

  const ToolIcon = iconMap[doc.id] || Settings2;
  const toolColor = colorMap[doc.id] || '#1d9bf0';

  // Filter features based on timeframe
  const activeFeatures = doc.features.filter((f) =>
    isCompatible(f, selectedVersion),
  );

  const matchedTool = tools.find(
    (t) =>
      t.id === doc.id ||
      t.href === '/' + doc.id ||
      t.href === '/tools/' + doc.id,
  );
  const launchHref = matchedTool?.href || `/tools/${doc.id}`;

  return (
    <div className='container mx-auto px-4 sm:px-6 py-12 max-w-7xl min-h-screen pb-32'>
      {/* Screen Reader Header skip instruction */}
      <span className='sr-only'>
        You are viewing documentation for {doc.title}
      </span>

      {/* Docs Header layout */}
      <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-6'>
        <div className='flex items-center gap-5'>
          <div
            className='w-18 h-18 rounded-2xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-2xl shrink-0'
            style={{ borderColor: `${toolColor}20` }}
            aria-hidden='true'>
            <ToolIcon
              className='h-10 w-10'
              style={{ color: toolColor }}
            />
          </div>
          <div>
            <div
              className='badge mb-1 inline-flex bkblur'
              style={{
                backgroundColor: `${toolColor}12`,
                color: toolColor,
                borderColor: `${toolColor}20`,
                fontSize: '10px',
              }}>
              {doc.category}
            </div>
            <h1 className='text-2xl md:text-5xl font-extrabold font-display flex flex-col leading-tight text-pw-text'>
              {doc.title}{' '}
              <span className='text-xs text-pw-muted font-normal uppercase'>
                Documentation
              </span>
            </h1>
          </div>
        </div>

        {/* Version dropdown */}
        <div className='flex flex-col items-start md:items-end gap-1.5 shrink-0 self-start md:self-center'>
          <label
            htmlFor='version-select'
            className='text-[10px] font-bold text-pw-muted uppercase tracking-wider'>
            Select Active Version
          </label>
          <select
            id='version-select'
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            aria-label='Filter features by tool release version'
            className='h-8 bg-white/5 border border-white/10 rounded-lg px-4 text-xs font-mono focus:border-pw-primary focus:outline-none cursor-pointer text-pw-text'>
            {doc.versions.map((v) => (
              <option
                key={v}
                value={v}
                className='bg-pw-surface text-pw-text'>
                Version {v} {v === defaultVersion ? '(Latest)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='mb-12 divider my-8' />

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-12'>
        {/* Core Doc details */}
        <div className='lg:col-span-8 space-y-12'>
          {/* Summary segment */}
          <section
            aria-label='Tool Summary'
            className='space-y-4'>
            <h2 className='text-xl font-bold font-display text-pw-text flex items-center gap-2'>
              <Sparkles
                className='h-5 w-5'
                style={{ color: toolColor }}
              />{' '}
              Concise Summary
            </h2>
            <Card className='p-4 sm:p-6 bg-white/[0.01] border-white/5 text-pw-muted leading-relaxed text-sm select-all'>
              {doc.summary}
            </Card>
          </section>

          {/* Demographic Metrics */}
          <section
            aria-label='Target Audience and Statistics'
            className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card className='p-4 sm:p-6 rounded-2xl border-white/5 bg-white/[0.01] flex items-start gap-4'>
              <div className='p-3 rounded-xl bg-pw-primary/10 text-pw-primary shrink-0'>
                <Users className='h-5 w-5' />
              </div>
              <div>
                <h3 className='text-xs font-bold uppercase tracking-wider'>
                  Target Audience
                </h3>
                <p className='text-sm text-pw-text/95 mt-1.5 leading-relaxed'>
                  {doc.audience}
                </p>
              </div>
            </Card>

            <Card className='p-4 sm:p-6 rounded-2xl border-white/5 bg-white/[0.01] flex items-start gap-4'>
              <div className='p-3 rounded-xl bg-pw-success/10 text-pw-success shrink-0'>
                <TrendingUp className='h-5 w-5' />
              </div>
              <div>
                <h3 className='text-xs font-bold uppercase tracking-wider'>
                  Volume Usage Metrics
                </h3>
                <p className='text-sm text-pw-text/95 mt-1.5 leading-relaxed'>
                  {doc.usageCount}
                </p>
              </div>
            </Card>
          </section>

          {/* Feature Breakdown */}
          <section
            aria-label='Feature Breakdown'
            className='space-y-4'>
            <h2 className='text-2xl font-bold font-display text-pw-text'>
              Gradual Feature Breakdown
            </h2>
            <div className='space-y-6'>
              {activeFeatures.map((f, i) => {
                const version = f.introduced;
                return (
                  <Card
                    key={i}
                    id={`feature-${i}`}
                    style={{ borderLeftColor: toolColor }}
                    className=' bg-transparent ring-0 sm:ring-1 sm:p-6 sm:bg-white/[0.01] sm:border sm:border-white/5 sm:border-l-2 transition-all sm:hover:bg-white/[0.02]/30'>
                    <div className='flex items-start gap-4'>
                      <div
                        style={{
                          backgroundColor: `${toolColor}15`,
                          color: toolColor,
                        }}
                        className='mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg shrink-0 font-bold text-xs font-monoSync'>
                        {i + 1}
                      </div>
                      <div className='space-y-2 flex-1'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <h3 className='font-bold text-base text-pw-text leading-snug'>
                            {f.title}
                          </h3>
                          {version !== '1.0' && version !== 'basic' && (
                            <span
                              className='text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-pw-muted uppercase font-bold'
                              title='Introduction version'>
                              v-{f.introduced}
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-pw-muted leading-relaxed select-text'>
                          {f.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {activeFeatures.length === 0 && (
                <p className='text-sm text-pw-muted italic'>
                  No compatible features discovered in selected version.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar link navigation / related tools */}
        <div className='lg:col-span-4 space-y-8 lg:sticky lg:top-24 self-start'>
          <Card className='glass p-5 space-y-2'>
            <h3 className='text-sm font-bold uppercase tracking-widest text-pw-muted flex items-center gap-2'>
              <Eye className='h-4 w-4 text-pw-secondary' /> Navigation
            </h3>
            <p className='text-xs text-pw-muted leading-relaxed'>
              Ready to take this tool for a spin? Launch the browser application
              instantly below:
            </p>
            <Link href={launchHref}>
              <Button className='w-full btn-primary h-11 gap-2 text-xs font-bold mt-2'>
                Use Tool <ArrowRight className='h-4 w-4' />
              </Button>
            </Link>
          </Card>

          {/* Table of Contents sidebar for active features */}
          {activeFeatures.length > 0 && (
            <Card className='p-5 bg-white/[0.01] border-white/5 space-y-4 hidden md:block'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
                Table of Contents
              </h3>
              <ul className='space-y-2.5 text-xs'>
                {activeFeatures.map((f, i) => (
                  <li key={i}>
                    <a
                      href={`#feature-${i}`}
                      className='text-pw-muted hover:text-pw-primary transition-colors flex items-center gap-2 font-medium'>
                      <span className='font-mono opacity-50'>{i + 1}.</span>
                      <span className='truncate'>{f.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className='divider my-15' />

          {/* Related Tools section */}
          <div className='space-y-4'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-pw-muted pl-1'>
              Related &amp; Similar Utilities
            </h3>
            <div className='space-y-3'>
              {doc.similarTools.map((sid) => {
                const simDoc = toolDocsDb[sid];
                if (!simDoc) return null;
                const SimIcon = iconMap[sid] || Brain;
                const simColor = colorMap[sid] || '#1d9bf0';

                return (
                  <Link
                    key={sid}
                    href={`/docs/${sid}`}>
                    <div className='p-2 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-pointer group mb-3'>
                      <div className='flex items-center gap-3'>
                        <div
                          className='w-10 h-10 rounded-xl flex items-center justify-center bg-pw-surface border border-white/5 shrink-0'
                          style={{ borderColor: `${simColor}10` }}>
                          <SimIcon
                            className='h-5 w-5'
                            style={{ color: simColor }}
                          />
                        </div>
                        <div>
                          <span className='text-xs font-bold block text-pw-text group-hover:text-pw-primary transition-colors'>
                            {simDoc.title}
                          </span>
                          <span className='text-[10px] text-pw-muted'>
                            {simDoc.category}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className='h-4 w-4 text-pw-muted group-hover:text-pw-primary transition-transform group-hover:translate-x-1 mr-2' />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
