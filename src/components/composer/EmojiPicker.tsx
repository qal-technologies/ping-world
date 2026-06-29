'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Emoji Data ──────────────────────────────────────────────
// Organized by category. Extended set of Unicode emojis.
const EMOJI_DATA: Record<string, string[]> = {
  smileys: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
    '🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷',
    '🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','💫','🤯','😎','🤓','🧐','😕','😟',
    '🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖',
    '😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡',
  ],
  people: [
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
    '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🙏','✍️',
    '💅','🤳','💪','🦾','🦵','🦿','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀',
    '👁️','👅','👄','🫦','🧑','👦','👧','👨','👩','🧒','🧓','👴','👵','👶','🍼','🧑‍💻',
    '👨‍💼','👩‍💼','🧑‍🎨','🧑‍🍳','🧑‍🏫','🧑‍🏭','🧑‍🚀','🧑‍⚕️','💃','🕺','🫂','👫','👬','👭',
  ],
  nature: [
    '🌱','🌿','🍀','🍁','🍂','🍃','🌾','🌵','🌴','🌳','🌲','🎋','🎍','🪴','🌺','🌸',
    '🌼','🌻','🌹','🥀','🌷','💐','🍄','🌰','🐚','🪸','🌙','⭐','🌟','💫','✨','⚡',
    '☁️','⛅','🌈','🌊','🌋','🏔️','🌄','🌅','🌇','🌆','🦋','🐛','🐝','🐞','🦎','🐊',
    '🐢','🦕','🦖','🐍','🦎','🐸','🦗','🦟','🌺','🦜','🦚','🦉','🦉','🦅','🐦','🐧',
  ],
  food: [
    '🍕','🍔','🌮','🌯','🥗','🍜','🍣','🍱','🥟','🍤','🍙','🍛','🍲','🥘','🫕','🍝',
    '🍞','🥐','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍟','🍿',
    '🧂','🥑','🍆','🥦','🥬','🥒','🌽','🍅','🍓','🍑','🍒','🍇','🍉','🍊','🍋',
    '🍌','🍍','🥭','🍎','🍐','🍏','🍈','☕','🍵','🧃','🥤','🧋','🍺','🥂','🍷',
  ],
  travel: [
    '✈️','🚀','🛸','🛩️','🚁','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞',
    '🚋','🚌','🚍','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️','🚲',
    '🛴','🛹','🛼','🚏','🛣️','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏝️','🏜️','🏟️',
    '🏛️','🏗️','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','⛩️',
  ],
  objects: [
    '💡','🔦','🕯️','🪔','💻','🖥️','🖨️','⌨️','🖱️','📱','📲','📷','📸','📹','🎥','📽️',
    '📺','📻','🎙️','🎚️','🎛️','📡','🔋','🔌','💾','💿','📀','🧮','📠','📟','📞','☎️',
    '📺','⏰','⌚','⏱️','⏲️','🕰️','⌛','⏳','🔭','🔬','🩺','🩻','💊','🩹','🩺','🔑',
    '🗝️','🔐','🔒','🔓','🪤','🧰','🔧','🔨','⚒️','🛠️','⛏️','🪝','🧲','🪜','🧪','🧫',
  ],
  symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
    '💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈',
    '💯','🔞','🆒','🆓','🆕','🆙','🆗','🆘','🆚','⭕','🔴','🟠','🟡','🟢','🔵','🟣',
    '🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔲','🔳','▪️','▫️','◾','◽','◼️','◻️',
  ],
  flags: [
    '🏳️','🏴','🚩','🏁','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇳🇬',
    '🇿🇦','🇬🇭','🇰🇪','🇪🇹','🇸🇳','🇪🇺','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇵🇹','🇯🇵',
    '🇰🇷','🇨🇳','🇮🇳','🇧🇷','🇦🇷','🇲🇽','🇸🇦','🇦🇪','🇮🇷','🇮🇩','🇷🇺','🇵🇱',
  ],
};

const CATEGORY_ICONS: Record<string, string> = {
  smileys: '😊',
  people: '🧑',
  nature: '🌿',
  food: '🍕',
  travel: '✈️',
  objects: '💡',
  symbols: '❤️',
  flags: '🏳️',
};

const RECENT_KEY = 'composer_recent_emojis';
const MAX_RECENT = 24;

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
      } catch {
        return [];
      }
    }
    return [];
  });

  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      setRecentEmojis((prev) => {
        const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(
          0,
          MAX_RECENT,
        );
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        return next;
      });
    },
    [onSelect],
  );

  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_DATA)
        .flat()
        .filter((e) => e.includes(searchQuery))
    : EMOJI_DATA[activeCategory] ?? [];

  const displayEmojis =
    !searchQuery && activeCategory === 'recent' ? recentEmojis : filteredEmojis;

  const categories = [
    ...(recentEmojis.length > 0 ? [{ id: 'recent', icon: '🕐' }] : []),
    ...Object.keys(CATEGORY_ICONS).map((id) => ({
      id,
      icon: CATEGORY_ICONS[id],
    })),
  ];

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.15 }}
      className='absolute bottom-13.5 m-1 left-0 z-1000 w-full max-w-75 bg-pw-surface rounded-2xl border border-white/10 shadow-2xl overflow-hidden'
    >
      {/* Search */}
      <div className='p-3 border-b border-white/5'>
        <input
          type='text'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search emoji...'
          className='w-full bg-white/5 bkblur rounded-lg px-3 py-1.5 text-sm text-pw-text placeholder:text-pw-muted/50 focus:outline-none focus:border-pw-primary/50 no-outline'
        />
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div className='flex overflow-x-auto scrollable-row px-2 py-1.5 gap-0.5'>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'text-lg px-2 py-1 rounded-lg shrink-0 transition-all',
                activeCategory === cat.id
                  ? 'bg-pw-primary/20'
                  : 'hover:bg-white/5',
              )}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className='p-2 h-52 overflow-y-auto custom-scrollbar'>
        {displayEmojis.length === 0 ? (
          <div className='flex items-center justify-center h-full text-pw-muted text-sm'>
            No emojis found
          </div>
        ) : (
          <div className='grid grid-cols-8 gap-0.5'>
            {displayEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => handleSelect(emoji)}
                className='text-xl p-1 rounded-md hover:bg-white/10 transition-colors text-center leading-none'
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
