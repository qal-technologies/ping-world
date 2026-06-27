'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Loader2, ArrowRight, X, Check, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { translateText } from '@/lib/composer/ai-utils';
import { LANGUAGES, FREE_LIMITS, PREMIUM_FEATURES } from '@/lib/composer/constants';
import { PremiumGate, UsageCounter } from './PremiumGate';
import { toast } from 'sonner';

const translationFeature = PREMIUM_FEATURES.find((f) => f.id === 'unlimited_translation')!;

export function TranslationPanel() {
  const { state, dispatch } = useComposer();
  const [selectedLang, setSelectedLang] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);

  const atLimit =
    !state.isPremium &&
    state.usageCounters.translationsToday >= FREE_LIMITS.translationsPerDay;

  const selectedLanguage = LANGUAGES.find((l) => l.code === selectedLang);

  const handleTranslate = async () => {
    if (!state.baseContent.trim()) {
      toast.error('Write some content first to translate.');
      return;
    }
    if (atLimit) {
      toast.error('Daily translation limit reached. Upgrade to Premium for unlimited translations.');
      return;
    }
    if (!state.isOnline) {
      toast.error('Translation requires an internet connection.');
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translateText(
        state.baseContent,
        selectedLang,
        selectedLanguage?.name ?? selectedLang,
      );
      dispatch({
        type: 'SET_TRANSLATION',
        payload: {
          originalText: state.baseContent,
          translatedText: result,
          targetLanguage: selectedLanguage?.name ?? selectedLang,
          targetLanguageCode: selectedLang,
        },
      });
      dispatch({ type: 'INCREMENT_USAGE', payload: 'translationsToday' });
    } catch {
      toast.error('Translation failed. Try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleApply = () => {
    if (!state.translationResult) return;
    dispatch({ type: 'SET_BASE_CONTENT', payload: state.translationResult.translatedText });
    dispatch({ type: 'SET_TRANSLATION', payload: null });
    toast.success('Translation applied!');
  };

  const handleDismiss = () => {
    dispatch({ type: 'SET_TRANSLATION', payload: null });
  };

  return (
    <div className='space-y-4'>
      {/* Language Selector */}
      <div className='space-y-1.5'>
        <label className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
          Translate To
        </label>
        <div className='relative'>
          <Languages className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pw-muted' />
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className='w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-pw-text focus:outline-none focus:border-pw-primary/40 no-outline transition-all appearance-none'
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className='bg-pw-surface'>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className='flex gap-2 flex-wrap items-center'>
        <button
          onClick={handleTranslate}
          disabled={isTranslating || !state.isOnline || atLimit}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            !state.isOnline || atLimit
              ? 'bg-white/5 border border-white/10 text-pw-muted/50 cursor-not-allowed'
              : 'btn-primary',
          )}
        >
          {isTranslating ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Languages className='h-3.5 w-3.5' />
          )}
          {isTranslating ? 'Translating...' : 'Translate All'}
        </button>

        {!state.isPremium && (
          <UsageCounter
            used={state.usageCounters.translationsToday}
            limit={FREE_LIMITS.translationsPerDay}
            label='today'
            isPremium={false}
          />
        )}
      </div>

      {/* Text Selection info */}
      <div className='flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-pw-muted'>
        <MousePointer2 className='h-3.5 w-3.5 mt-0.5 shrink-0' />
        <span>
          To translate a selection, highlight text in the editor, then use the Translate
          button above. The result will appear here for review before applying.
        </span>
      </div>

      {/* Translation Result */}
      <AnimatePresence>
        {state.translationResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='space-y-3'
          >
            <div className='p-4 rounded-xl bg-pw-primary/5 border border-pw-primary/20 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-pw-primary'>
                  {state.translationResult.targetLanguage} Translation
                </span>
                <button
                  onClick={handleDismiss}
                  className='text-pw-muted hover:text-pw-text transition-colors'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>

              <p className='text-sm text-pw-text leading-relaxed whitespace-pre-wrap'>
                {state.translationResult.translatedText}
              </p>

              <div className='flex gap-2'>
                <button
                  onClick={handleApply}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pw-success/10 border border-pw-success/30 text-pw-success text-xs font-semibold hover:bg-pw-success/20 transition-all'
                >
                  <Check className='h-3 w-3' />
                  Apply Translation
                </button>
                <button
                  onClick={handleDismiss}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-pw-muted text-xs font-semibold hover:text-pw-text transition-all'
                >
                  Discard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium note */}
      {!state.isPremium && (
        <PremiumGate
          feature={translationFeature}
          isPremium={false}
          showPartial={false}
        >
          <div className='p-3 h-14 flex items-center'>
            <span className='text-xs text-pw-muted'>Unlimited + per-platform variants</span>
          </div>
        </PremiumGate>
      )}
    </div>
  );
}
