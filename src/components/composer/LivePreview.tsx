'use client';

import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  ThumbsUp,
  MessageSquare,
  Send,
  MoreHorizontal,
  Globe,
  Eye,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Sun,
  Moon,
} from 'lucide-react';
import { useComposer } from '@/lib/composer/useComposerStore';
import { getPlatform } from '@/lib/composer/constants';
import type { Platform } from '@/lib/composer/types';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { splitTextIntoSlides } from '@/lib/composer/canvas-utils';

const INSTA_THEMES = [
  { label: 'Sunset Gradient', value: 'linear-gradient(135deg, #FFB347 0%, #FF5C7A 100%)', text: '#ffffff' },
  { label: 'Deep Blue', value: 'linear-gradient(135deg, #12152E 0%, #1A1F40 100%)', text: '#f8f9ff' },
  { label: 'Emerald Mint', value: 'linear-gradient(135deg, #22C985 0%, #22D4FD 100%)', text: '#111827' },
  { label: 'Minimal Light', value: '#ffffff', text: '#1f2937' },
  { label: 'Bold Dark', value: '#111827', text: '#f9fafb' },
];

function randomEngagement(base: number, variance = 0.3) {
  const v = base * variance;
  return Math.floor(base - v + Math.random() * v * 2);
}

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}` as string;
}

// ─── X / Twitter Preview ──────────────────────────────────────
function XPreview({
  content,
  showReactions,
  dark,
}: {
  content: string;
  showReactions: boolean;
  dark: boolean;
}) {
  const [likes, setLikes] = useState(() => randomEngagement(4700, 0.4));
  const [liked, setLiked] = useState(false);
  const [retweets, setRetweets] = useState(() => randomEngagement(1200, 0.4));
  const [retweeted, setRetweeted] = useState(false);
  const [replies, setReplies] = useState(() => randomEngagement(340, 0.5));
  const [replied, setReplied] = useState(false);
  const views = randomEngagement(85000, 0.3);

  const { state } = useComposer();
  const images = state.mediaAssets;

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
    } else {
      setLikes(likes + 1);
    }
    setLiked(!liked);
  };

  const handleRetweet = () => {
    if (retweeted) {
      setRetweets(retweets - 1);
    } else {
      setRetweets(retweets + 1);
    }
    setRetweeted(!retweeted);
  };

  const handleReply = () => {
    if (replied) {
      setReplies(replies - 1);
    } else {
      setReplies(replies + 1);
    }
    setReplied(!replied);
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-4 font-[system-ui] text-sm leading-relaxed max-w-full border transition-colors duration-300',
        dark ? 'bg-black text-[#e7e9ea] border-[#2f3336]' : 'bg-white text-[#0f1419] border-[#cfd9de]',
      )}
    >
      {/* Header */}
      <div className='flex items-start gap-3 mb-3'>
        <div className='h-10 w-10 rounded-full bg-gradient-to-br from-pw-primary to-pw-secondary shrink-0' />
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1 flex-wrap'>
            <span className={cn('font-bold text-sm', dark ? 'text-white' : 'text-black')}>Display Name</span>
            <svg
              className='h-4 w-4 text-[#1d9bf0] shrink-0'
              viewBox='0 0 24 24'
              fill='currentColor'
            >
              <path d='M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.8c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.12 14.67 22.25 13.43 22.25 12z' />
            </svg>
            <span className='text-[#71767b] text-sm'>@username · 2m</span>
          </div>
        </div>
        <MoreHorizontal className='h-5 w-5 text-[#71767b] shrink-0' />
      </div>

      {/* Content */}
      <p className='whitespace-pre-wrap text-[15px] leading-relaxed mb-3'>
        {content || <span className='text-[#71767b] italic'>Preview your post here...</span>}
      </p>

      {/* Collages / Layouts for X Uploaded Media */}
      {images.length > 0 && (
        <div
          className={cn(
            'grid gap-1 rounded-2xl overflow-hidden mb-3 border border-neutral-800',
            images.length === 1 && 'grid-cols-1',
            images.length === 2 && 'grid-cols-2',
            images.length >= 3 && 'grid-cols-2 grid-rows-2',
          )}
        >
          {images.slice(0, 4).map((img, idx) => (
            <img
              key={img.id}
              src={img.previewUrl}
              alt={img.altText || 'upload'}
              className='w-full h-full object-cover aspect-video'
              style={{
                filter: img.filterStyle,
                transform: `rotate(${img.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Engagement */}
      {showReactions && (
        <div className={cn('flex items-center justify-between pt-2 border-t mt-2', dark ? 'border-[#2f3336] text-[#71767b]' : 'border-[#eff3f4] text-[#536471]')}>
          <div
            onClick={handleReply}
            className={cn('flex items-center gap-1 hover:text-[#1d9bf0] transition-colors cursor-pointer', replied && 'text-[#1d9bf0]')}
          >
            <MessageCircle className='h-4 w-4' />
            <span className='text-xs'>{formatCount(replies)}</span>
          </div>

          <div
            onClick={handleRetweet}
            className={cn('flex items-center gap-1 hover:text-[#00ba7c] transition-colors cursor-pointer', retweeted && 'text-[#00ba7c]')}
          >
            <Repeat2 className='h-4 w-4' />
            <span className='text-xs'>{formatCount(retweets)}</span>
          </div>

          <div
            onClick={handleLike}
            className={cn('flex items-center gap-1 hover:text-[#f91880] transition-colors cursor-pointer', liked && 'text-[#f91880]')}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-[#f91880]')} />
            <span className='text-xs'>{formatCount(likes)}</span>
          </div>

          <div className='flex items-center gap-1 hover:text-[#1d9bf0] transition-colors cursor-pointer'>
            <Eye className='h-4 w-4' />
            <span className='text-xs'>{formatCount(views)}</span>
          </div>

          <div className='flex items-center gap-1 hover:text-[#1d9bf0] transition-colors cursor-pointer'>
            <Bookmark className='h-4 w-4' />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Instagram Preview ────────────────────────────────────────
function InstagramPreview({
  content,
  showReactions,
  dark,
}: {
  content: string;
  showReactions: boolean;
  dark: boolean;
}) {
  const [likes, setLikes] = useState(() => randomEngagement(18200, 0.3));
  const [liked, setLiked] = useState(false);
  const comments = randomEngagement(430, 0.4);

  const [index, setIndex] = useState(0);

  const { state } = useComposer();
  const images = state.mediaAssets;
  const imageCount = images.length;

  const slides = useMemo(() => {
    if (imageCount > 0) return [];
    return splitTextIntoSlides(content);
  }, [content, imageCount]);

  const activeTheme = INSTA_THEMES[state.instaCanvasThemeIdx ?? 0];
  const activeFont = state.instaCanvasFont ?? 'Syne';

  const totalSlidesOrImages = imageCount > 0 ? imageCount : slides.length;

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
    } else {
      setLikes(likes + 1);
    }
    setLiked(!liked);
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden font-[system-ui] max-w-full border transition-colors duration-300',
        dark ? 'bg-black text-[#f5f5f5] border-neutral-900' : 'bg-white text-[#1c1c1e] border-neutral-200',
      )}
    >
      {/* Header */}
      <div className='flex items-center gap-3 p-3 pb-2'>
        <div className='h-8 w-8 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] p-0.5 shrink-0'>
          <div className='h-full w-full rounded-full bg-gray-200' />
        </div>
        <div className='flex-1'>
          <p className='font-semibold text-xs'>username</p>
        </div>
        <MoreHorizontal className='h-5 w-5 text-gray-400' />
      </div>

      {/* Media area */}
      <div
        className={cn(
          'flex items-center justify-center border-y relative aspect-square',
          dark ? 'border-neutral-900 bg-neutral-950' : 'border-gray-100 bg-neutral-50',
        )}
      >
        {imageCount > 0 ? (
          <img
            src={images[index]?.previewUrl}
            alt={images[index]?.altText || 'upload'}
            className='w-full h-full object-cover'
            style={{
              filter: images[index]?.filterStyle,
              transform: `rotate(${images[index]?.rotation}deg)`,
            }}
          />
        ) : slides.length > 0 ? (
          <div
            className='w-full h-full flex flex-col items-center justify-center p-6 text-center text-sm font-bold leading-relaxed relative select-none'
            style={{
              background: activeTheme.value,
              color: activeTheme.text,
              fontFamily: activeFont,
              textShadow: activeTheme.value === '#ffffff' ? 'none' : '0 1px 6px rgba(0,0,0,0.3)',
            }}
          >
            <p className='whitespace-pre-wrap max-w-[85%]'>{slides[index]}</p>
            <span className='absolute bottom-2.5 right-3 text-[9px] opacity-60'>
              {index + 1}/{slides.length}
            </span>
            <span className='absolute bottom-2.5 left-3 text-[9px] opacity-40 font-mono tracking-widest uppercase'>
              pingworld slide
            </span>
          </div>
        ) : (
          <Instagram className='h-12 w-12 text-gray-300' />
        )}
      </div>

      {/* Slide Indicators */}
      {totalSlidesOrImages > 1 && (
        <div className='w-full p-2.5 items-center gap-1.5 flex justify-center'>
          {Array.from({ length: totalSlidesOrImages }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full cursor-pointer transition-all',
                index === i ? 'bg-sky-500 w-3' : 'bg-gray-300',
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {showReactions && (
        <div className='flex items-center gap-3.5 px-3 pt-3'>
          <Heart
            className={cn('h-5 w-5 cursor-pointer hover:text-[#E4405F] transition-colors', liked && 'text-[#E4405F] fill-[#E4405F]')}
            onClick={handleLike}
          />
          <MessageCircle className='h-5 w-5 cursor-pointer' />
          <Send className='h-5 w-5 cursor-pointer' />
          <Bookmark className='h-5 w-5 cursor-pointer ml-auto' />
        </div>
      )}

      {/* Likes + Caption */}
      <div className='px-3 pb-3 pt-2 space-y-1.5'>
        {showReactions && (
          <p className='font-semibold text-xs'>{formatCount(likes)} likes</p>
        )}
        <p className='text-xs leading-relaxed'>
          <span className='font-semibold mr-1.5'>username</span>
          {content || <span className='text-gray-400 italic'>Caption preview...</span>}
        </p>
        {showReactions && (
          <p className='text-gray-400 text-xs cursor-pointer'>
            View all {formatCount(comments)} comments
          </p>
        )}
        <p className='text-gray-400 text-[10px] uppercase tracking-wider'>
          2 minutes ago
        </p>
      </div>
    </div>
  );
}

// ─── Facebook Preview ─────────────────────────────────────────
function FacebookPreview({
  content,
  showReactions,
  dark,
}: {
  content: string;
  showReactions: boolean;
  dark: boolean;
}) {
  const [likes, setLikes] = useState(() => randomEngagement(8900, 0.4));
  const [liked, setLiked] = useState(false);
  const comments = randomEngagement(215, 0.5);
  const shares = randomEngagement(88, 0.6);

  const { state } = useComposer();
  const images = state.mediaAssets;

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
    } else {
      setLikes(likes + 1);
    }
    setLiked(!liked);
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden font-[system-ui] max-w-full border transition-colors duration-300',
        dark ? 'bg-[#242526] text-[#e4e6eb] border-neutral-800' : 'bg-white text-[#1c1e21] border-neutral-200 shadow-sm',
      )}
    >
      {/* Header */}
      <div className='flex items-center gap-3 p-3'>
        <div className='h-9 w-9 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0'>
          <span className='text-white font-bold text-sm'>U</span>
        </div>
        <div className='flex-1'>
          <p className='font-semibold text-sm'>User Name</p>
          <div className='flex items-center gap-1 text-[#65676B] text-xs'>
            <span>1 min ago</span>
            <span>·</span>
            <Globe className='h-3 w-3' />
          </div>
        </div>
        <MoreHorizontal className='h-5 w-5 text-[#65676B]' />
      </div>

      {/* Content */}
      <p className='px-3 pb-3 text-sm leading-relaxed whitespace-pre-wrap'>
        {content || <span className='text-[#90929A] italic'>Post preview...</span>}
      </p>

      {/* Collage for Facebook */}
      {images.length > 0 && (
        <div
          className={cn(
            'grid gap-0.5 overflow-hidden mb-3',
            images.length === 1 && 'grid-cols-1',
            images.length === 2 && 'grid-cols-2',
            images.length >= 3 && 'grid-cols-3',
          )}
        >
          {images.map((img) => (
            <img
              key={img.id}
              src={img.previewUrl}
              alt='Facebook post'
              className='w-full h-full object-cover max-h-48'
              style={{
                filter: img.filterStyle,
                transform: `rotate(${img.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Reactions */}
      {showReactions && (
        <>
          <div className={cn('flex items-center justify-between px-3 py-2 text-xs border-t', dark ? 'border-neutral-800 text-[#b0b3b8]' : 'border-gray-100 text-[#65676B]')}>
            <div className='flex items-center gap-1'>
              <span className='text-base'>👍❤️😂</span>
              <span>{formatCount(likes)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span>{formatCount(comments)} comments</span>
              <span>{formatCount(shares)} shares</span>
            </div>
          </div>
          <div className={cn('flex border-t', dark ? 'border-neutral-800' : 'border-gray-100')}>
            <button
              onClick={handleLike}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold hover:bg-white/5 transition-colors',
                liked ? 'text-[#1877F2]' : (dark ? 'text-[#b0b3b8]' : 'text-[#65676B]'),
              )}
            >
              <ThumbsUp className='h-4 w-4' />
              Like
            </button>
            <button className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold hover:bg-white/5 transition-colors', dark ? 'text-[#b0b3b8]' : 'text-[#65676B]')}>
              <MessageSquare className='h-4 w-4' />
              Comment
            </button>
            <button className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold hover:bg-white/5 transition-colors', dark ? 'text-[#b0b3b8]' : 'text-[#65676B]')}>
              <Share2 className='h-4 w-4' />
              Share
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── LinkedIn Preview ─────────────────────────────────────────
function LinkedInPreview({
  content,
  showReactions,
  dark,
}: {
  content: string;
  showReactions: boolean;
  dark: boolean;
}) {
  const [likes, setLikes] = useState(() => randomEngagement(2400, 0.4));
  const [liked, setLiked] = useState(false);
  const comments = randomEngagement(87, 0.5);

  const { state } = useComposer();
  const images = state.mediaAssets;

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
    } else {
      setLikes(likes + 1);
    }
    setLiked(!liked);
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden font-[system-ui] max-w-full border transition-colors duration-300',
        dark ? 'bg-[#1d2226] text-[#e0e0e0] border-neutral-800' : 'bg-white text-black border-neutral-200 shadow-sm',
      )}
    >
      {/* Header */}
      <div className='flex items-start gap-3 p-4 pb-3'>
        <div className='h-12 w-12 rounded-full bg-gradient-to-br from-[#0A66C2] to-[#00A0DC] flex items-center justify-center shrink-0'>
          <span className='text-white font-bold'>U</span>
        </div>
        <div className='flex-1'>
          <p className='font-semibold text-sm'>User Name</p>
          <p className='text-[#666666] text-xs'>Headline · 1st</p>
          <div className='flex items-center gap-1 text-[#666666] text-[11px] mt-0.5'>
            <span>1m</span>
            <span>·</span>
            <Globe className='h-3 w-3' />
          </div>
        </div>
        <MoreHorizontal className='h-5 w-5 text-[#666666]' />
      </div>

      {/* Content */}
      <p className='px-4 pb-3 text-sm leading-relaxed whitespace-pre-wrap'>
        {content || <span className='text-[#999] italic'>Post preview...</span>}
      </p>

      {/* Collage for LinkedIn */}
      {images.length > 0 && (
        <div
          className={cn(
            'grid gap-1 overflow-hidden mb-3',
            images.length === 1 && 'grid-cols-1',
            images.length >= 2 && 'grid-cols-2',
          )}
        >
          {images.map((img) => (
            <img
              key={img.id}
              src={img.previewUrl}
              alt='LinkedIn post'
              className='w-full h-full object-cover max-h-56'
              style={{
                filter: img.filterStyle,
                transform: `rotate(${img.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Engagement */}
      {showReactions && (
        <>
          <div className={cn('flex items-center justify-between px-4 py-2 text-xs border-t', dark ? 'border-neutral-800 text-[#b0b3b8]' : 'border-gray-100 text-[#666666]')}>
            <div className='flex items-center gap-1'>
              <span className='text-base'>👍❤️💡</span>
              <span>{formatCount(likes)}</span>
            </div>
            <span>{formatCount(comments)} comments</span>
          </div>
          <div className={cn('grid grid-cols-4 border-t', dark ? 'border-neutral-800' : 'border-gray-100')}>
            <button
              onClick={handleLike}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold hover:bg-white/5 transition-colors',
                liked ? 'text-[#0A66C2]' : (dark ? 'text-[#b0b3b8]' : 'text-[#666666]'),
              )}
            >
              <ThumbsUp className='h-4 w-4' />
              Like
            </button>
            <button className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold hover:bg-white/5 transition-colors', dark ? 'text-[#b0b3b8]' : 'text-[#666666]')}>
              <MessageSquare className='h-4 w-4' />
              Comment
            </button>
            <button className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold hover:bg-white/5 transition-colors', dark ? 'text-[#b0b3b8]' : 'text-[#666666]')}>
              <Repeat2 className='h-4 w-4' />
              Repost
            </button>
            <button className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold hover:bg-white/5 transition-colors', dark ? 'text-[#b0b3b8]' : 'text-[#666666]')}>
              <Send className='h-4 w-4' />
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Live Preview ────────────────────────────────────────
const PLATFORM_PREVIEWS: Record<
  Platform,
  React.ComponentType<{ content: string; showReactions: boolean; dark: boolean }>
> = {
  x: XPreview,
  instagram: InstagramPreview,
  facebook: FacebookPreview,
  linkedin: LinkedInPreview,
};

export function LivePreview({
  forExport,
  platformOverride,
  dark = true,
}: {
    forExport?: boolean;
    dark?: boolean;
  platformOverride?: Platform;
}) {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const activePlatform = platformOverride ?? state.activeEditorPlatform;

  const PreviewComponent = PLATFORM_PREVIEWS[activePlatform];
  const content = getContentForPlatform(activePlatform);

  return (
    <div className='space-y-4'>
    

      {/* The Preview */}
      <motion.div
        key={activePlatform}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <PreviewComponent
          content={content}
          showReactions={state.showReactions}
          dark={dark}
        />
      </motion.div>

      {/* All platforms preview (if multi-selected) */}
      {!forExport && state.selectedPlatforms.length > 1 && (
        <div className='space-y-3 pt-2'>
          <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
            Other Platforms
          </p>
          {state.selectedPlatforms
            .filter((p) => p !== activePlatform)
            .map((platform) => {
              const PC = PLATFORM_PREVIEWS[platform];
              return (
                <div
                  key={platform}
                  className='opacity-70 hover:opacity-100 transition-opacity cursor-pointer'
                  onClick={() =>
                    dispatch({
                      type: 'SET_ACTIVE_EDITOR_PLATFORM',
                      payload: platform,
                    })
                  }
                >
                  <p className='text-[9px] text-pw-muted mb-1.5 uppercase tracking-widest font-bold flex items-center gap-1'>
                    <Eye className='h-3 w-3' /> CLICK TO VIEW{' '}
                    {getPlatform(platform).name}
                  </p>
                  <div className='scale-95 origin-top-left pointer-events-none'>
                    <PC
                      content={getContentForPlatform(platform)}
                      showReactions={state.showReactions}
                      dark={dark}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
