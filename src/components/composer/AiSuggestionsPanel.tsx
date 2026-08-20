'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, Check, Wand2, Briefcase, TrendingUp, GraduationCap, SmileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { suggestFromTitle, rephraseText } from '@/lib/composer/ai-utils';
import { FREE_LIMITS, PREMIUM_FEATURES, AI_CONTEXT_PRESETS } from '@/lib/composer/constants';
import { PremiumGate, UsageCounter } from './PremiumGate';
import { toast } from 'sonner';
import type { AiStyle } from '@/lib/composer/types';

const unlimitedFeature = PREMIUM_FEATURES.find((f) => f.id === 'unlimited_ai')!;

const STYLE_OPTIONS: { id: AiStyle; label: string; emoji: any }[] = [
  { id: 'professional', label: 'Professional', emoji: Briefcase },
  { id: 'casual', label: 'Casual', emoji: SmileIcon },
  { id: 'viral', label: 'Viral', emoji: TrendingUp },
  { id: 'educational', label: 'Educational', emoji: GraduationCap },
];

export function AiSuggestionsPanel() {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const [selectedStyle, setSelectedStyle] = useState<AiStyle>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [insertedIndex, setInsertedIndex] = useState<number | null>(null);

  const activePlatform = state.activeEditorPlatform;

  // Determine if active platform override text is turned on
  const isOverridden = state.platformVariants.find(v => v.platform === activePlatform)?.isOverridden ?? false;

  // Focused-platform context content fetching
  const activeContent = isOverridden ? getContentForPlatform(activePlatform) : state.baseContent;

  const atSuggestLimit =
    !state.isPremium &&
    state.usageCounters.aiSuggestionsToday >= FREE_LIMITS.aiSuggestionsPerDay;

  const atRephraseLimit =
    !state.isPremium &&
    state.usageCounters.aiRephrasesToday >= FREE_LIMITS.aiRephrasesPerDay;

  const getContext = () => {
    const preset = AI_CONTEXT_PRESETS[state.aiContext.preset];
    return state.aiContext.preset === 'custom'
      ? state.aiContext.customPrompt
      : preset.prompt;
  };

  const handleGenerate = async () => {
    if (!state.postTitle.trim()) {
      toast.error('Enter a post title / topic first.');
      return;
    }
    if (atSuggestLimit) {
      toast.error('Daily limit reached. Upgrade to Premium for unlimited suggestions.');
      return;
    }
    if (!state.isOnline) {
      toast.error('AI suggestions require an internet connection.');
      return;
    }
    setIsGenerating(true);
    try {
      const suggestions = await suggestFromTitle(
        state.postTitle,
        selectedStyle,
        getContext(),
      );
      dispatch({
        type: 'SET_AI_SUGGESTIONS',
        payload: suggestions.map((text, i) => ({
          id: `${Date.now()}-${i}`,
          text,
          style: selectedStyle,
        })),
      });
      dispatch({ type: 'INCREMENT_USAGE', payload: 'aiSuggestionsToday' });
    } catch {
      toast.error('Could not generate suggestions. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRephrase = async () => {
    if (!activeContent.trim()) {
      toast.error('Write some content first.');
      return;
    }
    if (atRephraseLimit) {
      toast.error('Daily rephrase limit reached. Upgrade to Premium.');
      return;
    }
    if (!state.isOnline) {
      toast.error('AI rephrase requires an internet connection.');
      return;
    }
    setIsRephrasing(true);
    try {
      const rephrased = await rephraseText(
        activeContent,
        selectedStyle,
        getContext(),
      );

      // Apply changes exclusively to the active platform if overridden, otherwise fallback to base content syncing
      if (isOverridden) {
        dispatch({
          type: 'SET_PLATFORM_VARIANT',
          payload: { platform: activePlatform, content: rephrased },
        });
      } else {
        dispatch({ type: 'SET_BASE_CONTENT', payload: rephrased });
      }

      dispatch({ type: 'INCREMENT_USAGE', payload: 'aiRephrasesToday' });
      toast.success(`Active content rephrased for ${isOverridden ? activePlatform.toUpperCase() : 'all platforms'}!`);
    } catch {
      toast.error('Rephrase failed. Try again.');
    } finally {
      setIsRephrasing(false);
    }
  };

  const handleInsert = (text: string, index: number) => {
    // Insert directly into focus platform overridden state or base content
    if (isOverridden) {
      dispatch({
        type: 'SET_PLATFORM_VARIANT',
        payload: { platform: activePlatform, content: text },
      });
    } else {
      dispatch({ type: 'SET_BASE_CONTENT', payload: text });
    }

    setInsertedIndex(index);
    setTimeout(() => setInsertedIndex(null), 2000);
    toast.success('Suggestion inserted!');
  };

  return (
    <div className='space-y-5'>
      {/* Platform override warning info */}
      {isOverridden && (
        <div className='p-2.5 rounded-xl bg-pw-primary/10 border border-pw-primary/30 text-[11px] text-pw-text leading-snug'>
          ✨ <span className='font-bold uppercase'>{activePlatform}</span> has custom text active. AI suggestions and rephrases will apply only to this platform.
        </div>
      )}

      {/* Post Topic Input */}
      <div className='space-y-1.5'>
        <label className='text-[10px] font-bold uppercase pl-1 tracking-widest text-pw-muted mb-1'>
          Post Topic / Title
        </label>
        <input
          type='text'
          value={state.postTitle}
          onChange={(e) =>
            dispatch({ type: 'SET_POST_TITLE', payload: e.target.value })
          }
          placeholder='e.g. My new product launch, Tips for web design...'
          className='w-full bg-white/2 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-pw-text placeholder:text-pw-muted/40 focus:outline-none focus:border-pw-primary/40 no-outline transition-all'
        />
      </div>

      {/* Style Selection */}
      <div className='space-y-2'>
        <label className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
          Writing Style
        </label>
        <div className='flex gap-2 flex-wrap'>
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                selectedStyle === style.id
                  ? 'bg-pw-primary/5 border-pw-primary/40 text-pw-primary'
                  : 'bg-white/2 border-white/10 text-pw-muted hover:border-white/20 hover:text-pw-text',
              )}
            >
              <span><style.emoji className='h-3.5 w-3.5' /></span>
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className='flex gap-2 flex-wrap'>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !state.isOnline || atSuggestLimit}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            !state.isOnline || atSuggestLimit
              ? 'bg-white/5 border border-white/10 text-pw-muted/50 cursor-not-allowed'
              : 'btn-primary',
          )}
        >
          {isGenerating ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Sparkles className='h-3.5 w-3.5' />
          )}
          {isGenerating ? 'Generating...' : 'Generate Suggestions'}
        </button>

        <button
          onClick={handleRephrase}
          disabled={isRephrasing || !state.isOnline || atRephraseLimit}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all',
            !state.isOnline || atRephraseLimit
              ? 'border-white/5 text-pw-muted/50 cursor-not-allowed bg-white/5'
              : 'border-pw-secondary/30 bg-pw-secondary/5 text-pw-secondary hover:bg-pw-secondary hover:text-white',
          )}
        >
          {isRephrasing ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Wand2 className='h-3.5 w-3.5' />
          )}
          Rephrase Post
        </button>
      </div>

      {/* Usage counters */}
      {!state.isPremium && (
        <div className='flex gap-2 flex-wrap'>
          <UsageCounter
            used={state.usageCounters.aiSuggestionsToday}
            limit={FREE_LIMITS.aiSuggestionsPerDay}
            label='suggestions today'
            isPremium={false}
          />
          <UsageCounter
            used={state.usageCounters.aiRephrasesToday}
            limit={FREE_LIMITS.aiRephrasesPerDay}
            label='rephrase today'
            isPremium={false}
          />
        </div>
      )}

      {/* Suggestions list */}
      <AnimatePresence>
        {state.aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className='space-y-2'
          >
            <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
              Suggestions
            </p>
            {state.aiSuggestions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className='p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pw-primary/30 transition-all group'
              >
                <p className='text-xs text-pw-text leading-relaxed mb-2'>
                  {s.text}
                </p>
                <div className='flex items-center justify-between'>
                  <span className='text-[10px] text-pw-muted capitalize'>
                    {s.style} style
                  </span>
                  <button
                    onClick={() => handleInsert(s.text, i)}
                    className={cn(
                      'flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all',
                      insertedIndex === i
                        ? 'bg-pw-success/20 text-pw-success border border-pw-success/30'
                        : 'bg-pw-primary/10 text-pw-primary border border-pw-primary/20 hover:bg-pw-primary/20',
                    )}
                  >
                    {insertedIndex === i ? (
                      <Check className='h-3 w-3' />
                    ) : (
                      <ArrowRight className='h-3 w-3' />
                    )}
                    {insertedIndex === i ? 'Inserted!' : 'Use This'}
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Premium unlock for unlimited */}
            {!state.isPremium && (
              <PremiumGate
                feature={unlimitedFeature}
                isPremium={false}
                showPartial={false}
                className='mt-2'
              >
                <div className='p-3 h-10' />
              </PremiumGate>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
