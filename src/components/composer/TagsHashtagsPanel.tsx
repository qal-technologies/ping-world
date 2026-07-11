'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash,
  Sparkles,
  X,
  Lock,
  TrendingUp,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { generateHashtags } from '@/lib/composer/ai-utils';
import { FREE_LIMITS, PINGWORLD_HASHTAG, PREMIUM_FEATURES } from '@/lib/composer/constants';
import { PremiumGate, UsageCounter } from './PremiumGate';
import type { HashTag } from '@/lib/composer/types';
import { toast } from 'sonner';

const TRENDING_TAGS_MOCK = [
  '#AI', '#Startup', '#Innovation', '#Build', '#Tech',
  '#Growth', '#Creator', '#Productivity', '#Digital',
];

const premiumFeature = PREMIUM_FEATURES.find((f) => f.id === 'trending_tags')!;

export function TagsHashtagsPanel() {
  const { state, dispatch } = useComposer();
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!state.baseContent.trim()) {
      toast.error('Write some content first to generate tags.');
      return;
    }
    const reachedLimit =
      !state.isPremium && state.usageCounters.tagsGenerated >= FREE_LIMITS.maxTags;
    if (reachedLimit) {
      toast.error('You have reached your free hashtag generation limit. Upgrade to Premium for unlimited tags.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateHashtags(state.baseContent);
      const existingTags = new Set(state.tags.map((t) => t.tag.toLowerCase()));
      const newTags = result.filter(
        (t) => !existingTags.has(t.tag.toLowerCase()),
      );
      newTags.forEach((tag) => dispatch({ type: 'ADD_TAG', payload: tag }));
      dispatch({ type: 'INCREMENT_USAGE', payload: 'tagsGenerated' });
      toast.success(`Added ${newTags.length} AI tags`);
    } catch {
      toast.error('Could not generate tags. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddManual = () => {
    const raw = inputValue.trim();
    if (!raw) return;
    const tag = raw.startsWith('#') ? raw : `#${raw}`;
    dispatch({
      type: 'ADD_TAG',
      payload: { tag, isPingWorld: false, source: 'manual' },
    });
    setInputValue('');
  };

  const handleRemove = (tag: string) => {
    dispatch({ type: 'REMOVE_TAG', payload: tag });
  };

  const handleAddTrending = (tag: string) => {
    dispatch({
      type: 'ADD_TAG',
      payload: { tag, isPingWorld: false, source: 'trending' },
    });
  };

  return (
    <div className='space-y-4'>
      {/* AI Generate button */}
      <div className='flex flex-wrap items-center gap-2'>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !state.isOnline}
          className={cn(
            'flex items-center gap-2 text-xs font-semibold p-2 px-3 rounded-xl border transition-all',
            state.isOnline
              ? 'btn-primary'
              : 'border-white/10 text-pw-muted/50 cursor-not-allowed bg-white/5',
          )}
        >
          {isGenerating ? (
            <Loader2 className='h-3 w-3 animate-spin' />
          ) : (
            <Sparkles className='h-3 w-3' />
          )}
          {isGenerating ? 'Generating...' : 'Generate from content'}
        </button>

        {!state.isPremium && (
          <UsageCounter
            used={state.usageCounters.tagsGenerated}
            limit={FREE_LIMITS.maxTags}
            label='AI tags'
            isPremium={state.isPremium}
          />
        )}

        {!state.isOnline && (
          <p className='text-[10px] text-pw-warning min-w-full mt-[-5px] px-2'>
            AI requires internet connection
          </p>
        )}
      </div>

      {/* Current tags */}
      <div className='flex flex-wrap gap-2 min-h-[40px]'>
        <AnimatePresence>
          {state.tags.map((tag) => (
            <motion.div
              key={tag.tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold border transition-all',
                tag.isPingWorld
                  ? 'bg-pw-primary/10 border-pw-primary/40 text-pw-primary'
                  : tag.source === 'ai'
                    ? 'bg-pw-cyan/10 border-pw-cyan/30 text-pw-cyan'
                    : tag.source === 'trending'
                      ? 'bg-pw-warning/10 border-pw-warning/30 text-pw-warning'
                      : 'bg-white/5 border-white/10 text-pw-text',
              )}
            >
              {tag.isPingWorld && (
                <Lock className='h-2.5 w-2.5 shrink-0' />
              )}
              {tag.tag}
              {!tag.isPingWorld && (
                <button
                  onClick={() => handleRemove(tag.tag)}
                  className='opacity-60 hover:opacity-100 transition-opacity'
                >
                  <X className='h-3 w-3' />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Manual input */}
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <Hash className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pw-muted' />
          <input
            type='text'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
            placeholder='Add tag manually...'
            className='w-full bg-white/2 bkblur border border-white/5 rounded-xl pl-4 pr-3 py-2 text-sm text-pw-text placeholder:text-pw-muted/50 focus:outline-none focus:border-pw-primary/40 no-outline transition-all'
          />
        </div>
        <button
          onClick={handleAddManual}
          className='px-3 py-2 rounded-xl bg-pw-primary/10 border border-pw-primary/15 text-pw-primary hover:bg-pw-primary/20 transition-all'
        >
          <Plus className='h-4 w-4' />
        </button>
      </div>

      {/* Trending Tags (Premium) */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <TrendingUp className='h-3.5 w-3.5 text-pw-warning' />
          <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
            Trending
          </span>
        </div>
        {state.isPremium ? (
          <div className='flex flex-wrap gap-1.5'>
            {TRENDING_TAGS_MOCK.map((tag) => (
              <button
                key={tag}
                onClick={() => handleAddTrending(tag)}
                className='text-[11px] px-2.5 py-1 rounded-full bg-pw-warning/5 border border-pw-warning/20 text-pw-warning hover:bg-pw-warning/20 transition-all'
              >
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <PremiumGate
            feature={premiumFeature}
            isPremium={false}
            showPartial={true}
          >
            <div className='flex flex-wrap gap-1.5 pointer-events-none'>
              {TRENDING_TAGS_MOCK.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className='text-[11px] px-2.5 py-1 rounded-full bg-pw-warning/10 border border-pw-warning/20 text-pw-warning'
                >
                  {tag}
                </span>
              ))}
            </div>
          </PremiumGate>
        )}
      </div>
    </div>
  );
}
