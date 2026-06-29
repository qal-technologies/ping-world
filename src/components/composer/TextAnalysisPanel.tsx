'use client';

import { useMemo, useState } from 'react';
import {
  BarChart2,
  Eye,
  AlertTriangle,
  Clock,
  Smile,
  Meh,
  Frown,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { useComposer } from '@/lib/composer/useComposerStore';
import {
  analyzeText,
  checkGrammar,
  type GrammarIssue,
} from '@/lib/composer/ai-utils';
import { PREMIUM_FEATURES } from '@/lib/composer/constants';
import { PremiumGate } from './PremiumGate';
import {cn} from '@/lib/utils';

const grammarFeature = PREMIUM_FEATURES.find((f) => f.id === 'grammar_check')!;

function ScoreBar({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
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
  const { state, getContentForPlatform } = useComposer();
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[] | null>(
    null,
  );

  const activeContent = getContentForPlatform(state.activeEditorPlatform);

  const analysis = useMemo(() => analyzeText(activeContent), [activeContent]);

  const handleCheckGrammar = async () => {
    if (!activeContent.trim()) {
      setGrammarIssues([]);
      return;
    }
    setIsCheckingGrammar(true);
    setGrammarIssues(null);
    try {
      const issues = await checkGrammar(activeContent);
      setGrammarIssues(issues);
    } catch {
      setGrammarIssues([]);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

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
    analysis.fleschScore >= 70 ? '#22c985'
    : analysis.fleschScore >= 50 ? '#ffb347'
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
              analysis.readTimeSeconds < 60 ?
                `${analysis.readTimeSeconds}s`
              : `${Math.round(analysis.readTimeSeconds / 60)}m`,
            icon: <Clock className='h-3.5 w-3.5' />,
            color: 'text-pw-cyan',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className='p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2'>
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
            style={{ color: fleschColor }}>
            {analysis.fleschScore}/100 · {analysis.readabilityLabel}
          </span>
        </div>
        <ScoreBar
          value={analysis.fleschScore}
          color={fleschColor}
        />
        <p className='text-[10px] text-pw-muted'>
          Higher score = easier to read. Aim for 60+ for social media
          engagement.
        </p>
      </div>

      {/* Sentiment */}
      <div className='flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5'>
        <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
          Sentiment
        </span>
        <div
          className={cn(
            'flex items-center gap-1.5 text-sm font-semibold capitalize',
            sentimentColor,
          )}>
          {sentimentIcon}
          {analysis.sentiment}
        </div>
      </div>

      {/* Flagged words */}
      {analysis.flaggedWords.length > 0 && (
        <div className='p-2 rounded-xl bg-pw-danger/6 border border-pw-danger/15 space-y-1'>
          <div className='flex items-center gap-2 mb-2'>
            <AlertTriangle className='h-3.5 w-3.5 text-pw-danger shrink-0' />
            <span className='text-xs font-bold text-pw-danger'>
              {analysis.flaggedWords.length} flagged phrase
              {analysis.flaggedWords.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {analysis.flaggedWords.map((w) => (
              <span
                key={w}
                className='text-[10px] px-2 py-0.5 rounded-full bg-pw-danger/8 text-pw-danger border border-pw-danger/15'>
                {w}
              </span>
            ))}
          </div>
          <p className='text-[10px] text-pw-danger/80'>
            These phrases may trigger spam filters on some platforms.
          </p>
        </div>
      )}

      {/* Grammar Check — Premium */}
      <div className='space-y-2 w-full flex flex-col h-full'>
        <div className='flex items-center gap-2'>
          <Crown className='h-3 w-3 text-pw-warning' />
          <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted flex gap-1'>
            Grammar Check <CheckCircle2 className='h-3 w-3 text-pw-success' />
          </span>
        </div>

        <PremiumGate
          feature={grammarFeature}
          isPremium={state.isPremium}
          showPartial={false}>
          <div className='p-3 rounded-xl bg-white/[0.03] border border-white/5'>
            <button
              onClick={handleCheckGrammar}
              disabled={isCheckingGrammar}
              className='w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-pw-primary/10 text-pw-primary font-semibold text-xs hover:bg-pw-primary/20 transition-all border border-pw-primary/20 mb-3'>
              {isCheckingGrammar ? 'Checking...' : 'Run Grammar Check'}
            </button>

            {grammarIssues === null ?
              <p className='text-[10px] text-pw-muted text-center'>
                Click the button above to scan your text using LanguageTool API.
              </p>
            : grammarIssues.length === 0 ?
              <div className='flex items-center gap-2 p-2 rounded-lg bg-pw-success/10'>
                <CheckCircle2 className='h-4 w-4 text-pw-success' />
                <span className='text-xs text-pw-success font-semibold'>
                  No grammar issues found!
                </span>
              </div>
            : <div className='space-y-2'>
                <div className='text-[10px] font-bold text-pw-warning uppercase tracking-widest px-1'>
                  {grammarIssues.length} issue
                  {grammarIssues.length > 1 ? 's' : ''} found
                </div>
                <div className='max-h-32 overflow-y-auto hide-scrollbar space-y-1.5'>
                  {grammarIssues.map((m, i) => (
                    <div
                      key={i}
                      className='p-2 rounded-lg bg-white/5 border border-white/10'>
                      <p className='text-xs text-pw-text font-medium mb-1'>
                        {m.message}
                      </p>
                      <p className='text-[10px] text-pw-muted leading-relaxed relative bg-black/20 p-1.5 rounded'>
                        {m.context.slice(0, m.offset)}
                        <span className='text-pw-danger underline decoration-wavy underline-offset-2'>
                          {m.context.slice(m.offset, m.offset + m.length)}
                        </span>
                        {m.context.slice(m.offset + m.length)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            }
          </div>
        </PremiumGate>
      </div>
    </div>
  );
}
