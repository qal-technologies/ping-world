'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Save, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import {
  AI_CONTEXT_PRESETS,
  PREMIUM_FEATURES,
  PINGWORLD_ACCOUNTS,
  PLATFORMS,
} from '@/lib/composer/constants';
import { PremiumGate } from './PremiumGate';
import { toast } from 'sonner';
import type { GenerationContextPreset, Platform } from '@/lib/composer/types';

const customContextFeature = PREMIUM_FEATURES.find((f) => f.id === 'custom_ai_context')!;

const PRESET_ENTRIES = (
  Object.entries(AI_CONTEXT_PRESETS) as [GenerationContextPreset, { label: string; prompt: string }][]
).filter(([id]) => id !== 'custom');

export function AiContextPanel() {
  const { state, dispatch } = useComposer();
  const [saved, setSaved] = useState(false);

  const handlePresetSelect = (preset: GenerationContextPreset) => {
    dispatch({ type: 'SET_AI_CONTEXT', payload: { preset } });
  };

  const handleSave = () => {
    // Persist to localStorage
    if ( window && typeof window !== 'undefined') {
      localStorage.setItem(
        'composer_ai_context',
        JSON.stringify(state.aiContext),
      );
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success('AI context saved');
  };

  const togglePingWorldMention = () => {
    dispatch({
      type: 'SET_AI_CONTEXT',
      payload: { alwaysIncludePingWorld: !state.aiContext.alwaysIncludePingWorld },
    });
  };

  return (
    <div className='space-y-5'>
      {/* Preset selector */}
      <div className='space-y-2'>
        <label className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
          Generation Context Preset
        </label>
        <div className='grid grid-cols-2 gap-2'>
          {PRESET_ENTRIES.map(([id, preset]) => (
            <button
              key={id}
              onClick={() => handlePresetSelect(id)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                state.aiContext.preset === id
                  ? 'border-pw-primary/50 bg-pw-primary/10 text-pw-primary'
                  : 'border-white/10 bg-white/[0.02] text-pw-muted hover:border-white/20 hover:text-pw-text',
              )}
            >
              <p className='text-xs font-bold'>{preset.label}</p>
              <p className='text-[10px] mt-0.5 line-clamp-2 opacity-70'>
                {preset.prompt.slice(0, 45)}...
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt — Premium */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <Crown className='h-3 w-3 text-pw-warning' />
          <label className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
            Custom AI Instructions
          </label>
        </div>
        {state.isPremium ? (
          <textarea
            value={state.aiContext.customPrompt}
            onChange={(e) =>
              dispatch({
                type: 'SET_AI_CONTEXT',
                payload: { preset: 'custom', customPrompt: e.target.value },
              })
            }
            placeholder='Write custom instructions for the AI — e.g., tone, style, brand voice, things to avoid...'
            rows={4}
            className='w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-pw-text placeholder:text-pw-muted/40 focus:outline-none focus:border-pw-primary/40 no-outline resize-none custom-scrollbar'
          />
        ) : (
          <PremiumGate
            feature={customContextFeature}
            isPremium={false}
            showPartial={false}
            className='h-24'
          >
            <div />
          </PremiumGate>
        )}
      </div>

      {/* PingWorld Mention Toggle */}
      <div className='p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3'>
        <button
          onClick={togglePingWorldMention}
          className='flex items-center justify-between w-full'
        >
          <div className='flex items-center gap-2'>
            <Zap className='h-3.5 w-3.5 text-pw-primary' />
            <span className='text-xs font-semibold text-pw-text'>
              Always mention PingWorld
            </span>
          </div>
          <div
            className={cn(
              'h-5 w-9 rounded-full border-2 transition-all relative',
              state.aiContext.alwaysIncludePingWorld
                ? 'border-pw-primary bg-pw-primary/30'
                : 'border-white/20 bg-white/5',
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 h-3 w-3 rounded-full transition-all',
                state.aiContext.alwaysIncludePingWorld
                  ? 'left-4 bg-pw-primary'
                  : 'left-0.5 bg-white/40',
              )}
            />
          </div>
        </button>

        {/* Per-platform handles */}
        {state.aiContext.alwaysIncludePingWorld && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className='space-y-2 pt-2 border-t border-white/5'
          >
            <p className='text-[10px] text-pw-muted font-bold uppercase tracking-widest'>
              PingWorld Account Handles
            </p>
            {PLATFORMS.map((platform) => (
              <div key={platform.id} className='flex items-center gap-2'>
                <span
                  className='text-[10px] font-bold w-20 shrink-0'
                  style={{ color: platform.iconHex }}
                >
                  {platform.name.split(' ')[0]}
                </span>
                <input
                  type='text'
                  value={
                    state.aiContext.pingWorldPlatformHandle[platform.id] ??
                    PINGWORLD_ACCOUNTS[platform.id]
                  }
                  onChange={(e) => {
                    const handles = {
                      ...state.aiContext.pingWorldPlatformHandle,
                      [platform.id]: e.target.value,
                    };
                    dispatch({
                      type: 'SET_AI_CONTEXT',
                      payload: { pingWorldPlatformHandle: handles as Partial<Record<Platform, string>> },
                    });
                  }}
                  className='flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-pw-text focus:outline-none focus:border-pw-primary/40 no-outline'
                />
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all',
          saved
            ? 'bg-pw-success/10 border-pw-success/30 text-pw-success'
            : 'bg-white/5 border-white/10 text-pw-text hover:bg-white/10',
        )}
      >
        {saved ? (
          <Check className='h-4 w-4' />
        ) : (
          <Save className='h-4 w-4' />
        )}
        {saved ? 'Saved!' : 'Save AI Context'}
      </button>
    </div>
  );
}
