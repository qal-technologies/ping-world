'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Languages,
  Loader2,
  X,
  Check,
  MousePointer2,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { translateText } from '@/lib/composer/ai-utils';
import {
  LANGUAGES,
  FREE_LIMITS,
  PREMIUM_FEATURES,
} from '@/lib/composer/constants';
import { PremiumGate, UsageCounter } from './PremiumGate';
import { toast } from 'sonner';

const translationFeature = PREMIUM_FEATURES.find(
  (f) => f.id === 'unlimited_translation',
)!;

export function TranslationPanel() {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const [selectedLang, setSelectedLang] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const [translationHistory, setTranslationHistory] = useState<string[]>([]);

  const activeContent = getContentForPlatform(state.activeEditorPlatform);

  // Monitor text selections in the document
  useEffect(() => {
    const handleSelectionChange = () => {
      const activeEl = document.activeElement as HTMLTextAreaElement;
      if (
        activeEl &&
        (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')
      ) {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        if (start !== end) {
          const selectedVal = activeEl.value.slice(start, end);
          setSelectedText(selectedVal);
          setSelectionRange({ start, end });
          return;
        }
      }
      setSelectedText('');
      setSelectionRange(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const atLimit =
    !state.isPremium &&
    state.usageCounters.translationsToday >= FREE_LIMITS.translationsPerDay;

  const selectedLanguage = LANGUAGES.find((l) => l.code === selectedLang);

  const handleTranslate = async (translateSelectionOnly: boolean) => {
    const textToTranslate =
      translateSelectionOnly ? selectedText : activeContent;

    if (!textToTranslate.trim()) {
      toast.error('Write or select some content first to translate.');
      return;
    }
    if (atLimit) {
      toast.error(
        'Daily translation limit reached. Upgrade to Premium for unlimited translations.',
      );
      return;
    }
    if (!state.isOnline) {
      toast.error('Translation requires an internet connection.');
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translateText(
        textToTranslate,
        selectedLang,
        selectedLanguage?.name ?? selectedLang,
      );
      dispatch({
        type: 'SET_TRANSLATION',
        payload: {
          originalText: textToTranslate,
          translatedText: result.data,
          translatedStatus: result.ok,
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

    // Push previous base content to history (keep max 2 items)
    setTranslationHistory((prev) => [activeContent, ...prev].slice(0, 2));

    if (selectionRange && selectedText) {
      // Inline replacement of selected text only
      const before = activeContent.slice(0, selectionRange.start);
      const after = activeContent.slice(selectionRange.end);
      const updatedText =
        before + state.translationResult.translatedText + after;

      if (
        state.activeEditorPlatform &&
        state.platformVariants.find(
          (v) => v.platform === state.activeEditorPlatform,
        )?.isOverridden
      ) {
        dispatch({
          type: 'SET_PLATFORM_VARIANT',
          payload: {
            platform: state.activeEditorPlatform,
            content: updatedText,
          },
        });
      } else {
        dispatch({ type: 'SET_BASE_CONTENT', payload: updatedText });
      }
      toast.success('Selection translation applied!');
    } else {
      // Full apply
      if (
        state.activeEditorPlatform &&
        state.platformVariants.find(
          (v) => v.platform === state.activeEditorPlatform,
        )?.isOverridden
      ) {
        dispatch({
          type: 'SET_PLATFORM_VARIANT',
          payload: {
            platform: state.activeEditorPlatform,
            content: state.translationResult.translatedText,
          },
        });
      } else {
        dispatch({
          type: 'SET_BASE_CONTENT',
          payload: state.translationResult.translatedText,
        });
      }
      toast.success('Translation applied!');
    }

    dispatch({ type: 'SET_TRANSLATION', payload: null });
  };

  const handleUndo = () => {
    if (translationHistory.length === 0) return;
    const [previous, ...rest] = translationHistory;
    if (
      state.activeEditorPlatform &&
      state.platformVariants.find(
        (v) => v.platform === state.activeEditorPlatform,
      )?.isOverridden
    ) {
      dispatch({
        type: 'SET_PLATFORM_VARIANT',
        payload: { platform: state.activeEditorPlatform, content: previous },
      });
    } else {
      dispatch({ type: 'SET_BASE_CONTENT', payload: previous });
    }
    setTranslationHistory(rest);
    toast.success('Translation undone!');
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
            className='w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-pw-text focus:outline-none focus:border-pw-primary/40 no-outline transition-all appearance-none'>
            {LANGUAGES.map((lang, idx) => (
              <option
                key={lang.code + idx}
                value={lang.code}
                className='bg-pw-surface'>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className='flex gap-2 flex-wrap items-center'>
        {selectedText ?
          <button
            onClick={() => handleTranslate(true)}
            disabled={isTranslating || !state.isOnline || atLimit}
            className={cn(
              'flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all',
              (!state.isOnline || atLimit) ?
                'bg-white/5 border border-white/10 text-pw-muted/50 cursor-not-allowed':'btn-primary',
            )}>
            {isTranslating ?
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            : <Languages className='h-3.5 w-3.5' />}
            Translate Section
          </button>
        : <button
            onClick={() => handleTranslate(false)}
            disabled={isTranslating || !state.isOnline || atLimit}
            className={cn(
              'flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all',
              (!state.isOnline || atLimit) ?
                'bg-white/5 border border-white/10 text-pw-muted/50 cursor-not-allowed':'btn-primary',
            )}>
            {isTranslating ?
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            : <Languages className='h-3.5 w-3.5' />}
            Translate All
          </button>
        }

        {/* Undo Action */}
        {translationHistory.length > 0 && (
          <button
            onClick={handleUndo}
            className='flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 text-pw-text hover:bg-white/10 transition-all'>
            <Undo2 className='h-3.5 w-3.5' />
            Undo
          </button>
        )}

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
          {selectedText ?
            <span className='text-pw-primary font-semibold'>
              Selection detected! Click &quot;Translate Section&quot; to
              translate only the highlighted text inline.
            </span>
          : 'Highlight a block of text in the editor above, and a "Translate Section" button will instantly appear to perform localized replacements.'
          }
        </span>
      </div>

      {/* Translation Result */}
      <AnimatePresence>
        {state.translationResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='space-y-3'>
            <div className='p-4 rounded-xl bg-pw-primary/5 border border-pw-primary/20 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-pw-primary'>
                  {state.translationResult.targetLanguage} Translation
                </span>
                <button
                  onClick={handleDismiss}
                  className='text-pw-muted hover:text-pw-text transition-colors'>
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>

              <p className='text-sm text-pw-text leading-relaxed whitespace-pre-wrap'>
                {state.translationResult.translatedText}
              </p>

              <div className='flex gap-2'>
                <button
                  disabled={
                    state.translationResult?.translatedStatus ? false : true
                  }
                  onClick={() => {
                    if (state.translationResult?.translatedStatus)
                      handleApply();
                    else return null;
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all',
                    state.translationResult.translatedStatus ?
                      'bg-pw-success/10 border border-pw-success/30 text-pw-success text-xs font-semibold hover:bg-pw-success/20'
                    : 'bg-pw-muted',
                  )}>
                  {state.translationResult?.translatedStatus && (
                    <Check className='h-3 w-3' />
                  )}
                  {state.translationResult?.translatedStatus ?
                    'Apply Translation'
                  : 'Error Occured'}
                </button>
                <button
                  onClick={handleDismiss}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-pw-muted text-xs font-semibold hover:text-pw-text transition-all'>
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
          showPartial={false}>
          <div className='p-3 h-14 flex items-center'>
            <span className='text-xs text-pw-muted'>
              Unlimited + per-platform variants
            </span>
          </div>
        </PremiumGate>
      )}
    </div>
  );
}
