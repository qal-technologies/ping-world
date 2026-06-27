'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Smile,
  Hash,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Lock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { getPlatform, PLATFORMS, FREE_LIMITS } from '@/lib/composer/constants';
import type { Platform } from '@/lib/composer/types';
import { EmojiPicker } from './EmojiPicker';
import { AnimatePresence as AP } from 'framer-motion';

const PLATFORM_ICONS: Record<Platform, React.ElementType> = {
  x: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

interface PlatformEditorProps {
  onOpenTag: () => void;
  onOpenMedia: () => void;
}

export function PlatformEditor({ onOpenTag, onOpenMedia }: PlatformEditorProps) {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const [activePlatformTab, setActivePlatformTab] = useState<Platform>(
    state.selectedPlatforms[0] ?? 'x',
  );
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSinglePlatform = state.selectedPlatforms.length === 1;
  const activeMeta = getPlatform(activePlatformTab);

  const getVariant = (platform: Platform) =>
    state.platformVariants.find((v) => v.platform === platform);

  const isOverridden = (platform: Platform) =>
    getVariant(platform)?.isOverridden ?? false;

  const handleBaseChange = (val: string) => {
    dispatch({ type: 'SET_BASE_CONTENT', payload: val });
  };

  const handleVariantChange = (platform: Platform, val: string) => {
    dispatch({ type: 'SET_PLATFORM_VARIANT', payload: { platform, content: val } });
  };

  const toggleOverride = (platform: Platform) => {
    dispatch({ type: 'TOGGLE_PLATFORM_OVERRIDE', payload: platform });
  };

  const insertEmojiAtCursor = useCallback(
    (emoji: string) => {
      const ta = textareaRef.current;
      if (!ta) {
        // append to base
        dispatch({ type: 'SET_BASE_CONTENT', payload: state.baseContent + emoji });
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const current =
        activePlatformTab && isOverridden(activePlatformTab)
          ? getContentForPlatform(activePlatformTab)
          : state.baseContent;
      const newVal = current.slice(0, start) + emoji + current.slice(end);
      if (activePlatformTab && isOverridden(activePlatformTab)) {
        dispatch({
          type: 'SET_PLATFORM_VARIANT',
          payload: { platform: activePlatformTab, content: newVal },
        });
      } else {
        dispatch({ type: 'SET_BASE_CONTENT', payload: newVal });
      }
      setShowEmoji(false);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    },
    [activePlatformTab, state.baseContent, getContentForPlatform, dispatch, isOverridden],
  );

  // Platform selection pills
  const isPlatformLocked = (platform: Platform) => {
    if (state.isPremium) return false;
    const idx = PLATFORMS.findIndex((p) => p.id === platform);
    return idx >= FREE_LIMITS.maxPlatforms;
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border transition-all duration-500',
        isSinglePlatform
          ? 'border-0 shadow-lg'
          : 'border-white/10 bg-white/[0.02]',
      )}
      style={
        isSinglePlatform
          ? {
              border: `1px solid ${activeMeta.iconHex}30`,
              boxShadow: `0 0 30px ${activeMeta.iconHex}18`,
            }
          : {}
      }
    >
      {/* Platform Selector Row */}
      <div
        className={cn(
          'flex border-b',
          isSinglePlatform ? '' : 'border-white/5',
        )}
        style={
          isSinglePlatform
            ? { borderColor: `${activeMeta.iconHex}20` }
            : {}
        }
      >
        {PLATFORMS.map((platform, idx) => {
          const isSelected = state.selectedPlatforms.includes(platform.id);
          const isActive = activePlatformTab === platform.id && isSelected;
          const locked = isPlatformLocked(platform.id);
          const Icon = PLATFORM_ICONS[platform.id];

          return (
            <div key={platform.id} className='relative flex-1'>
              <button
                onClick={() => {
                  if (locked) return;
                  if (isSelected) {
                    setActivePlatformTab(platform.id);
                  } else {
                    dispatch({ type: 'TOGGLE_PLATFORM', payload: platform.id });
                    setActivePlatformTab(platform.id);
                  }
                }}
                className={cn(
                  'w-full py-3 flex flex-col items-center gap-1.5 transition-all relative overflow-hidden',
                  locked && 'opacity-40 cursor-not-allowed',
                  isActive
                    ? 'text-white'
                    : isSelected
                      ? 'text-pw-muted/70'
                      : 'text-pw-muted/40 hover:text-pw-muted',
                )}
              >
                {/* Checkbox-style indicator */}
                <div
                  className={cn(
                    'absolute top-1.5 right-1.5 h-3 w-3 rounded-full border flex items-center justify-center',
                    isSelected
                      ? 'border-transparent'
                      : 'border-white/20 bg-transparent',
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: platform.iconHex }
                      : {}
                  }
                >
                  {isSelected && (
                    <svg className='h-2 w-2 text-white' viewBox='0 0 8 8' fill='none'>
                      <path
                        d='M1.5 4L3 5.5L6.5 2'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                      />
                    </svg>
                  )}
                </div>

                {locked && (
                  <Lock className='absolute top-1.5 left-1.5 h-2.5 w-2.5 text-pw-warning' />
                )}

                <Icon
                  className='h-4 w-4'
                  style={{
                    color: isActive ? platform.iconHex : 'currentColor',
                  }}
                />
                <span className='text-[9px] font-bold uppercase tracking-widest hidden sm:block'>
                  {platform.name.split(' ')[0]}
                </span>

                {/* Active underline */}
                {isActive && (
                  <motion.div
                    layoutId='editorActivePlatform'
                    className='absolute bottom-0 left-0 right-0 h-0.5'
                    style={{ backgroundColor: platform.iconHex }}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor area */}
      <AnimatePresence mode='wait'>
        {state.selectedPlatforms.map((platform) => {
          if (platform !== activePlatformTab) return null;
          const meta = getPlatform(platform);
          const overridden = isOverridden(platform);
          const content = overridden
            ? (getVariant(platform)?.content ?? '')
            : state.baseContent;
          const limit = meta.charLimit;
          const progress = (content.length / limit) * 100;
          const isOver = content.length > limit;

          return (
            <motion.div
              key={platform}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'p-6 space-y-4',
                isSinglePlatform ? '' : '',
              )}
              style={
                isSinglePlatform
                  ? { backgroundColor: `${meta.brandColor}06` }
                  : {}
              }
            >
              {/* Override toggle */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
                    {meta.name} Post
                  </span>
                  {state.selectedPlatforms.length > 1 && (
                    <span
                      className='text-[9px] px-1.5 py-0.5 rounded-full font-mono border'
                      style={{
                        color: meta.iconHex,
                        borderColor: `${meta.iconHex}40`,
                        backgroundColor: `${meta.iconHex}10`,
                      }}
                    >
                      {content.length}/{limit}
                    </span>
                  )}
                </div>
                {state.selectedPlatforms.length > 1 && (
                  <button
                    onClick={() => toggleOverride(platform)}
                    className='flex items-center gap-1.5 text-[10px] font-semibold text-pw-muted hover:text-pw-primary transition-colors'
                  >
                    {overridden ? (
                      <ToggleRight className='h-4 w-4 text-pw-primary' />
                    ) : (
                      <ToggleLeft className='h-4 w-4' />
                    )}
                    {overridden ? 'Custom text' : 'Synced to base'}
                  </button>
                )}
              </div>

              {/* Textarea */}
              <div className='relative'>
                <textarea
                  ref={platform === activePlatformTab ? textareaRef : undefined}
                  value={content}
                  onChange={(e) =>
                    overridden
                      ? handleVariantChange(platform, e.target.value)
                      : handleBaseChange(e.target.value)
                  }
                  placeholder={`Write your ${meta.name} post here...`}
                  rows={8}
                  className={cn(
                    'w-full bg-transparent text-base font-medium placeholder:text-pw-muted/30 focus:outline-none resize-none custom-scrollbar leading-relaxed no-outline border-none p-0',
                    isOver ? 'text-pw-danger' : 'text-pw-text',
                  )}
                />

                {/* Emoji Picker Popover */}
                <AP>
                  {showEmoji && (
                    <EmojiPicker
                      onSelect={insertEmojiAtCursor}
                      onClose={() => setShowEmoji(false)}
                    />
                  )}
                </AP>
              </div>

              {/* Bottom toolbar */}
              <div className='flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-white/5'>
                <div className='flex items-center gap-4'>
                  <button
                    onClick={onOpenMedia}
                    className='text-pw-muted hover:text-pw-primary transition-colors flex items-center gap-1.5 text-xs font-semibold'
                  >
                    <ImageIcon className='h-4 w-4' />
                    <span className='hidden sm:inline'>Media</span>
                  </button>
                  <button
                    onClick={onOpenTag}
                    className='text-pw-muted hover:text-pw-primary transition-colors flex items-center gap-1.5 text-xs font-semibold'
                  >
                    <Hash className='h-4 w-4' />
                    <span className='hidden sm:inline'>Tags</span>
                    {state.tags.length > 0 && (
                      <span className='text-[9px] bg-pw-primary/20 text-pw-primary rounded-full px-1.5'>
                        {state.tags.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowEmoji((v) => !v)}
                    className='text-pw-muted hover:text-pw-primary transition-colors flex items-center gap-1.5 text-xs font-semibold'
                  >
                    <Smile className='h-4 w-4' />
                    <span className='hidden sm:inline'>Emoji</span>
                  </button>
                </div>

                {/* Character counter */}
                <div className='flex items-center gap-3'>
                  <div
                    className='relative h-6 w-6'
                    title={`${content.length}/${limit} characters`}
                  >
                    <svg className='h-6 w-6 -rotate-90' viewBox='0 0 24 24'>
                      <circle
                        cx='12'
                        cy='12'
                        r='9'
                        fill='none'
                        className='stroke-white/10'
                        strokeWidth='2.5'
                      />
                      <circle
                        cx='12'
                        cy='12'
                        r='9'
                        fill='none'
                        stroke={isOver ? '#ff5c7a' : meta.iconHex}
                        strokeWidth='2.5'
                        strokeDasharray={`${2 * Math.PI * 9}`}
                        strokeDashoffset={`${2 * Math.PI * 9 * (1 - Math.min(progress, 100) / 100)}`}
                        strokeLinecap='round'
                        className='transition-all duration-300'
                      />
                    </svg>
                    {isOver && (
                      <AlertCircle className='absolute inset-0 m-auto h-3 w-3 text-pw-danger' />
                    )}
                    {!isOver && progress > 90 && (
                      <span className='absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-pw-warning'>
                        {limit - content.length}
                      </span>
                    )}
                  </div>
                  {isOver && (
                    <span className='text-xs font-mono text-pw-danger'>
                      -{content.length - limit}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
