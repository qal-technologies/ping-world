'use client';

import { useMemo } from 'react';
import {
  BarChart2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Smile,
  Meh,
  Frown,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { analyzeText } from '@/lib/composer/ai-utils';
import { PREMIUM_FEATURES } from '@/lib/composer/constants';
import { PremiumGate } from './PremiumGate';

const grammarFeature = PREMIUM_FEATURES.find((f) => f.id === 'grammar_check')!;

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className='h-1.5 bg-white/5 rounded-full overflow-hidden flex-1'>
      <div
        className='h-full rounded-full transition-all duration-700'
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function TextAnalysisPanel() {
  const { state } = useComposer();

  const analysis = useMemo(
    () => analyzeText(state.baseContent),
    [state.baseContent],
  );

  const sentimentIcon = {
    positive: <Smile className='h-3.5 w-3.5 text-pw-success' />,
    neutral: <Meh className='h-3.5 w-3.5 text-pw-muted' />,
    negative: <Frown className='h-3.5 w-3.5 text-pw-danger' />,
  }[analysis.sentiment];

  const sentimentColor = {
    positive: 'text-pw-success',
    neutral: 'text-pw-muted',
    negative: 'text-pw-danger',
  }[analysis.sentiment];

  const fleschColor =
    analysis.fleschScore >= 70
      ? '#22c985'
      : analysis.fleschScore >= 50
        ? '#ffb347'
        : '#ff5c7a';

  return (
    <div className='space-y-5'>
      {/* Quick Stats Grid */}
      <div className='grid grid-cols-2 gap-3'>
        {[
          {
            label: 'Words',
            value: analysis.wordCount,
            icon: <BarChart2 className='h-3.5 w-3.5' />,
            color: 'text-pw-primary',
          },
          {
            label: 'Characters',
            value: analysis.charCount,
            icon: <Eye className='h-3.5 w-3.5' />,
            color: 'text-pw-secondary',
          },
          {
            label: 'Sentences',
            value: analysis.sentenceCount,
            icon: <CheckCircle2 className='h-3.5 w-3.5' />,
            color: 'text-pw-success',
          },
          {
            label: 'Read Time',
            value:
              analysis.readTimeSeconds < 60
                ? `${analysis.readTimeSeconds}s`
                : `${Math.round(analysis.readTimeSeconds / 60)}m`,
            icon: <Clock className='h-3.5 w-3.5' />,
            color: 'text-pw-cyan',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className='p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2'
          >
            <span className={stat.color}>{stat.icon}</span>
            <div>
              <p className='text-sm font-bold text-pw-text'>{stat.value}</p>
              <p className='text-[10px] text-pw-muted'>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Readability Score */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
            Readability (Flesch)
          </span>
          <span
            className='text-xs font-bold'
            style={{ color: fleschColor }}
          >
            {analysis.fleschScore}/100 · {analysis.readabilityLabel}
          </span>
        </div>
        <ScoreBar value={analysis.fleschScore} color={fleschColor} />
        <p className='text-[10px] text-pw-muted'>
          Higher score = easier to read. Aim for 60+ for social media engagement.
        </p>
      </div>

      {/* Sentiment */}
      <div className='flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5'>
        <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
          Sentiment
        </span>
        <div className={cn('flex items-center gap-1.5 text-sm font-semibold capitalize', sentimentColor)}>
          {sentimentIcon}
          {analysis.sentiment}
        </div>
      </div>

      {/* Flagged words */}
      {analysis.flaggedWords.length > 0 && (
        <div className='p-3 rounded-xl bg-pw-danger/10 border border-pw-danger/20 space-y-1.5'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-3.5 w-3.5 text-pw-danger shrink-0' />
            <span className='text-xs font-bold text-pw-danger'>
              {analysis.flaggedWords.length} flagged phrase{analysis.flaggedWords.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {analysis.flaggedWords.map((w) => (
              <span
                key={w}
                className='text-[10px] px-2 py-0.5 rounded-full bg-pw-danger/20 text-pw-danger border border-pw-danger/20'
              >
                {w}
              </span>
            ))}
          </div>
          <p className='text-[10px] text-pw-danger/70'>
            These phrases may trigger spam filters on some platforms.
          </p>
        </div>
      )}

      {/* Grammar Check — Premium */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <Crown className='h-3 w-3 text-pw-warning' />
          <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
            Grammar Check
          </span>
        </div>
        <PremiumGate
          feature={grammarFeature}
          isPremium={state.isPremium}
          showPartial={true}
        >
          <div className='p-3 rounded-xl bg-pw-success/10 border border-pw-success/20'>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-pw-success' />
              <span className='text-xs text-pw-success font-semibold'>
                No grammar issues found
              </span>
            </div>
            <p className='text-[10px] text-pw-muted mt-1'>
              AI grammar check runs in real-time as you type (Premium).
            </p>
          </div>
        </PremiumGate>
      </div>
    </div>
  );
}
