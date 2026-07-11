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
  LucideHeart,
} from 'lucide-react';
import { useComposer } from '@/lib/composer/useComposerStore';
import { getPlatform } from '@/lib/composer/constants';
import type { Platform } from '@/lib/composer/types';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

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
}: {
  content: string;
  showReactions: boolean;
}) {
  const likes = randomEngagement(4700, 0.4);
  const retweets = randomEngagement(1200, 0.4);
  const replies = randomEngagement(340, 0.5);
  const views = randomEngagement(85000, 0.3);

  return (
    <div className='bg-[#000000] rounded-2xl p-4 font-[system-ui] text-sm leading-relaxed max-w-full'>
      {/* Header */}
      <div className='flex items-start gap-3 mb-3'>
        <div className='h-10 w-10 rounded-full bg-gradient-to-br from-pw-primary to-pw-secondary shrink-0' />
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1 flex-wrap'>
            <span className='font-bold text-white text-sm'>Display Name</span>
            <svg
              className='h-4 w-4 text-[#1d9bf0] shrink-0'
              viewBox='0 0 24 24'
              fill='currentColor'>
              <path d='M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.8c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.12 14.67 22.25 13.43 22.25 12z' />
            </svg>
            <span className='text-[#71767b] text-sm'>@username · 2m</span>
          </div>
        </div>
        <MoreHorizontal className='h-5 w-5 text-[#71767b] shrink-0' />
      </div>

      {/* Content */}
      <p className='text-[#e7e9ea] whitespace-pre-wrap text-[15px] leading-relaxed mb-3'>
        {content || (
          <span className='text-[#71767b] italic'>
            Preview your post here...
          </span>
        )}
      </p>

      {/* Engagement */}
      {showReactions && (
        <div className='flex items-center justify-between text-[#71767b] pt-2 border-t border-[#2f3336] mt-2'>
          {[
            { icon: <MessageCircle className='h-4 w-4' />, count: replies },
            { icon: <Repeat2 className='h-4 w-4' />, count: retweets },
            { icon: <Heart className='h-4 w-4' />, count: likes },
            { icon: <Eye className='h-4 w-4' />, count: views },
          ].map((item, i) => (
            <div
              key={i}
              className='flex items-center gap-1 hover:text-[#1d9bf0] transition-colors cursor-pointer'>
              {item.icon}
              <span className='text-xs'>{formatCount(item.count)}</span>
            </div>
          ))}
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
}: {
  content: string;
  showReactions: boolean;
}) {
  const likes = randomEngagement(18200, 0.3);
  const comments = randomEngagement(430, 0.4);

  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);

  const { state } = useComposer();
  const images = state.mediaAssets;
  const imageCount = useMemo(
    () => state.mediaAssets.length,
    [state.mediaAssets],
  );

  return (
    <div className='bg-white rounded-2xl overflow-hidden text-[#1c1c1e] font-[system-ui] max-w-full'>
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
          'bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] flex items-center justify-center border-y border-gray-100',
          imageCount === 0 && 'aspect-square',
        )}>
        {imageCount > 0 ?
          <Image
            src={images[index]?.previewUrl}
            alt={images[index]?.altText || 'upload'}
            className='w-full h-full object-cover'
            width={500}
            height={500}
            style={{
              filter: images[index]?.filterStyle,
              transform: `rotate(${images[index]?.rotation}deg)`,
            }}
          />
        : <Instagram className='h-12 w-12 text-gray-300' />}
      </div>

      {/* Image count */}
      {imageCount > 1 && (
        <div className='w-full p-1 items-center gap-2 flex justify-center'>
          {images.map((_, i) => (
            <div
              className={cn(
                'w-2 h-2 rounded-full cursor-pointer',
                index == i ? 'bg-red-500 w-4' : 'bg-gray-300',
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {showReactions && (
        <div className='flex items-center gap-3 px-3 pt-3'>
          {liked ?
            <LucideHeart className='h-5 w-5 text-gray-700 hover:text-[#E4405F] transition-colors cursor-pointer' />
          : <Heart
              className='h-5 w-5 text-gray-700 hover:text-[#E4405F] transition-colors cursor-pointer'
              onClick={() => setLiked(true)}
            />
          }
          <MessageCircle className='h-5 w-5 text-gray-700 cursor-pointer' />
          <Send className='h-5 w-5 text-gray-700 cursor-pointer' />
          <Bookmark className='h-5 w-5 text-gray-700 cursor-pointer ml-auto' />
        </div>
      )}

      {/* Likes + Caption */}
      <div className='px-3 pb-3 pt-2 space-y-1'>
        {showReactions && (
          <p className='font-semibold text-xs'>{formatCount(likes)} likes</p>
        )}
        <p className='text-xs leading-relaxed'>
          <span className='font-semibold mr-1.5'>username</span>
          {content || (
            <span className='text-gray-400 italic'>Caption preview...</span>
          )}
        </p>
        {showReactions && (
          <p className='text-gray-400 text-xs cursor-pointer'>
            View all {formatCount(comments)} comments
          </p>
        )}
        <p className='text-gray-300 text-[10px] uppercase tracking-wider'>
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
}: {
  content: string;
  showReactions: boolean;
}) {
  const likes = randomEngagement(8900, 0.4);
  const comments = randomEngagement(215, 0.5);
  const shares = randomEngagement(88, 0.6);

  return (
    <div className='bg-white rounded-2xl overflow-hidden text-[#1c1e21] font-[system-ui] max-w-full shadow-sm border border-gray-200'>
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
        {content || (
          <span className='text-[#90929A] italic'>Post preview...</span>
        )}
      </p>

      {/* Reactions */}
      {showReactions && (
        <>
          <div className='flex items-center justify-between px-3 py-2 text-[#65676B] text-xs border-t border-gray-100'>
            <div className='flex items-center gap-1'>
              <span className='text-base'>👍❤️😂</span>
              <span>{formatCount(likes)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span>{formatCount(comments)} comments</span>
              <span>{formatCount(shares)} shares</span>
            </div>
          </div>
          <div className='flex border-t border-gray-100'>
            {[
              { icon: <ThumbsUp className='h-4 w-4' />, label: 'Like' },
              { icon: <MessageSquare className='h-4 w-4' />, label: 'Comment' },
              { icon: <Share2 className='h-4 w-4' />, label: 'Share' },
            ].map((btn, i) => (
              <button
                key={i}
                className='flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[#65676B] text-xs font-semibold hover:bg-gray-50 transition-colors'>
                {btn.icon}
                {btn.label}
              </button>
            ))}
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
}: {
  content: string;
  showReactions: boolean;
}) {
  const likes = randomEngagement(2400, 0.4);
  const comments = randomEngagement(87, 0.5);

  return (
    <div className='bg-white rounded-2xl overflow-hidden text-[#000000] font-[system-ui] max-w-full shadow-sm border border-gray-200'>
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

      {/* Engagement */}
      {showReactions && (
        <>
          <div className='flex items-center justify-between px-4 py-2 text-[#666666] text-xs border-t border-gray-100'>
            <div className='flex items-center gap-1'>
              <span className='text-base'>👍❤️💡</span>
              <span>{formatCount(likes)}</span>
            </div>
            <span>{formatCount(comments)} comments</span>
          </div>
          <div className='grid grid-cols-4 border-t border-gray-100'>
            {[
              { icon: <ThumbsUp className='h-4 w-4' />, label: 'Like' },
              { icon: <MessageSquare className='h-4 w-4' />, label: 'Comment' },
              { icon: <Repeat2 className='h-4 w-4' />, label: 'Repost' },
              { icon: <Send className='h-4 w-4' />, label: 'Send' },
            ].map((btn, i) => (
              <button
                key={i}
                className='flex flex-col items-center gap-1 py-2.5 text-[#666666] text-[11px] font-semibold hover:bg-gray-50 transition-colors'>
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Live Preview ────────────────────────────────────────
const PLATFORM_PREVIEWS: Record<
  Platform,
  React.ComponentType<{ content: string; showReactions: boolean }>
> = {
  x: XPreview,
  instagram: InstagramPreview,
  facebook: FacebookPreview,
  linkedin: LinkedInPreview,
};

const PLATFORM_ICONS: Record<Platform, React.ElementType> = {
  x: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

export function LivePreview({
  forExport,
  platformOverride,
}: {
  forExport?: boolean;
  platformOverride?: Platform;
}) {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const activePlatform = platformOverride ?? state.activeEditorPlatform;

  const PreviewComponent = PLATFORM_PREVIEWS[activePlatform];
  const content = getContentForPlatform(activePlatform);
  const meta = getPlatform(activePlatform);

  return (
    <div className='space-y-4 '>
      {/* The Preview */}
      <motion.div
        key={activePlatform}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}>
        <PreviewComponent
          content={content}
          showReactions={state.showReactions}
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
                  }>
                  <p className='text-[9px] text-pw-muted mb-1.5 uppercase tracking-widest font-bold flex items-center gap-1'>
                    <Eye className='h-3 w-3' /> CLICK TO VIEW{' '}
                    {getPlatform(platform).name}
                  </p>
                  <div className='scale-95 origin-top-left pointer-events-none'>
                    <PC
                      content={getContentForPlatform(platform)}
                      showReactions={state.showReactions}
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
