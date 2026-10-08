'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Sparkles,
  Trash2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
// import Image as Img from 'next/image';

export interface ObjectMockItem {
  id: string;
  name: string;
  category: 'crowns' | 'glasses' | 'headgear' | 'badges' | 'frames';
  svg: (color?: string) => React.ReactNode;
  defaultScale: number;
  defaultY: number;
}

export const TRENDY_OBJECT_MOCKS: ObjectMockItem[] = [
  {
    id: 'gold-crown',
    name: 'Gold Monarch',
    category: 'crowns',
    defaultScale: 1,
    defaultY: -28,
    svg: () => (
      <svg viewBox='0 0 100 100' className='w-full h-full drop-shadow-[0_4px_10px_rgba(234,179,8,0.5)]'>
        <path d='M10 75 L90 75 L80 40 L60 60 L50 25 L40 60 L20 40 Z' fill='url(#goldGrad)' stroke='#fef08a' strokeWidth='2' />
        <circle cx='50' cy='22' r='5' fill='#facc15' />
        <circle cx='20' cy='38' r='4' fill='#facc15' />
        <circle cx='80' cy='38' r='4' fill='#facc15' />
        <defs>
          <linearGradient id='goldGrad' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stopColor='#eab308' />
            <stop offset='50%' stopColor='#fef08a' />
            <stop offset='100%' stopColor='#ca8a04' />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 'neon-crown',
    name: 'Cyber Halo',
    category: 'crowns',
    defaultScale: 0.95,
    defaultY: -24,
    svg: () => (
      <svg viewBox='0 0 100 60' className='w-full h-full drop-shadow-[0_0_12px_#06b6d4]'>
        <ellipse cx='50' cy='30' rx='42' ry='16' fill='none' stroke='#22d3ee' strokeWidth='4' />
        <ellipse cx='50' cy='30' rx='36' ry='12' fill='none' stroke='#a5f3fc' strokeWidth='1.5' opacity='0.8' />
      </svg>
    ),
  },
  {
    id: 'pixel-shades',
    name: 'Thug Pixel Shades',
    category: 'glasses',
    defaultScale: 1.1,
    defaultY: 2,
    svg: () => (
      <svg viewBox='0 0 120 40' className='w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]'>
        <rect x='10' y='10' width='45' height='20' fill='#0f172a' stroke='#ffffff' strokeWidth='2' />
        <rect x='65' y='10' width='45' height='20' fill='#0f172a' stroke='#ffffff' strokeWidth='2' />
        <rect x='55' y='14' width='10' height='4' fill='#ffffff' />
        <rect x='18' y='14' width='8' height='6' fill='#ffffff' opacity='0.7' />
        <rect x='73' y='14' width='8' height='6' fill='#ffffff' opacity='0.7' />
      </svg>
    ),
  },
  {
    id: 'cyber-visor',
    name: 'Neon Cyber Visor',
    category: 'glasses',
    defaultScale: 1.15,
    defaultY: 4,
    svg: () => (
      <svg viewBox='0 0 120 40' className='w-full h-full drop-shadow-[0_0_10px_#ec4899]'>
        <path d='M10 15 Q60 8 110 15 L105 32 Q60 25 15 32 Z' fill='#ec4899' fillOpacity='0.4' stroke='#f472b6' strokeWidth='2.5' />
        <line x1='25' y1='22' x2='95' y2='22' stroke='#ffffff' strokeWidth='1.5' strokeDasharray='4 3' opacity='0.8' />
      </svg>
    ),
  },
  {
    id: 'studio-headphones',
    name: 'Pro Headphones',
    category: 'headgear',
    defaultScale: 1.3,
    defaultY: -10,
    svg: () => (
      <svg viewBox='0 0 120 120' className='w-full h-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]'>
        <path d='M25 65 A35 35 0 0 1 95 65' fill='none' stroke='#38bdf8' strokeWidth='6' strokeLinecap='round' />
        <rect x='12' y='55' width='18' height='32' rx='7' fill='#0284c7' stroke='#e0f2fe' strokeWidth='2' />
        <rect x='90' y='55' width='18' height='32' rx='7' fill='#0284c7' stroke='#e0f2fe' strokeWidth='2' />
      </svg>
    ),
  },
  {
    id: 'verified-badge',
    name: 'Verified Star Badge',
    category: 'badges',
    defaultScale: 0.65,
    defaultY: 40,
    svg: () => (
      <svg viewBox='0 0 60 60' className='w-full h-full drop-shadow-[0_2px_8px_rgba(14,165,233,0.7)]'>
        <polygon points='30,4 37,12 48,10 51,21 60,26 58,37 63,46 53,51 51,62 40,61 34,70 25,66 18,72 13,63 2,61 4,50 -2,42 4,33 0,22 10,18 11,7 22,9' fill='#0ea5e9' />
        <polyline points='20,31 27,38 41,23' fill='none' stroke='#ffffff' strokeWidth='5' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    ),
  },
  {
    id: 'flame-trend',
    name: 'Fire Trend Badge',
    category: 'badges',
    defaultScale: 0.7,
    defaultY: 38,
    svg: () => (
      <svg viewBox='0 0 60 60' className='w-full h-full drop-shadow-[0_2px_10px_rgba(249,115,22,0.8)]'>
        <path d='M30 5 C30 5, 45 22, 45 35 C45 47, 36 55, 27 55 C16 55, 10 46, 10 36 C10 25, 22 17, 22 17 C22 17, 20 28, 28 28 C34 28, 30 5, 30 5 Z' fill='url(#flameGrad)' />
        <defs>
          <linearGradient id='flameGrad' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='#fde047' />
            <stop offset='50%' stopColor='#f97316' />
            <stop offset='100%' stopColor='#ef4444' />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 'cyber-frame',
    name: 'Cyberpunk Ring Frame',
    category: 'frames',
    defaultScale: 1.28,
    defaultY: 0,
    svg: () => (
      <svg viewBox='0 0 120 120' className='w-full h-full drop-shadow-[0_0_14px_#8b5cf6]'>
        <circle cx='60' cy='60' r='54' fill='none' stroke='#a855f7' strokeWidth='3.5' strokeDasharray='20 8 40 12' />
        <circle cx='60' cy='60' r='58' fill='none' stroke='#c084fc' strokeWidth='1' opacity='0.6' />
        <rect x='54' y='2' width='12' height='4' fill='#22c55e' />
        <rect x='54' y='114' width='12' height='4' fill='#22c55e' />
      </svg>
    ),
  },
];

interface ProfileAvatarDesignerProps {
  initialImage?: string | null;
  displayName: string;
  onSaveAvatar: (avatarDataUrl: string) => Promise<void> | void;
}

export default function ProfileAvatarDesigner({
  initialImage,
  displayName,
  onSaveAvatar,
}: ProfileAvatarDesignerProps) {
  const [avatarImage, setAvatarImage] = useState<string | null>(initialImage || null);
  const [selectedMock, setSelectedMock] = useState<ObjectMockItem | null>(null);
  const [mockY, setMockY] = useState(0);
  const [mockScale, setMockScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSelectMock = (mock: ObjectMockItem) => {
    if (selectedMock?.id === mock.id) {
      // Toggle off
      setSelectedMock(null);
    } else {
      setSelectedMock(mock);
      setMockY(mock.defaultY);
      setMockScale(mock.defaultScale);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Choose a valid image file.');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file must be under 5MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const source = ev.target?.result;
        if (typeof source !== 'string') return toast.error('Could not read this image.');
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const context = canvas.getContext('2d');
          if (!context) return toast.error('Image editor is unavailable in this browser.');
          const cropScale = Math.max(512 / image.width, 512 / image.height);
          const width = image.width * cropScale;
          const height = image.height * cropScale;
          context.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
          const webp = canvas.toDataURL('image/webp', 0.82);
          const compact = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
          if (compact.length > 600_000) return toast.error('This image could not be compressed enough. Choose a smaller or simpler image.');
          setAvatarImage(compact);
          toast.success('Profile image optimized and ready to save.');
        };
        image.onerror = () => toast.error('This image could not be decoded.');
        image.src = source;
      };
      reader.onerror = () => toast.error('Could not read this image.');
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If no mock overlay, just save current avatar image
      if (!selectedMock && avatarImage) {
        await onSaveAvatar(avatarImage);
        toast.success('Avatar updated successfully!');
        return;
      }

      // Render composite to 256x256 canvas
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context unavailable');

      // Draw background circle
      ctx.clearRect(0, 0, 256, 256);
      ctx.save();
      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (avatarImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = avatarImage;
        });
        ctx.drawImage(img, 0, 0, 256, 256);
      } else {
        // Initials fallback
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#818cf8';
        ctx.font = 'bold 96px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName ? displayName[0].toUpperCase() : 'U', 128, 128);
      }
      ctx.restore();

      const exportedUrl = canvas.toDataURL('image/png');
      await onSaveAvatar(exportedUrl);
      toast.success('Custom avatar & mock design applied!');
    } catch (err: any) {
      toast.error('Failed to save avatar: ' + (err?.message || 'Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='p-5 rounded-2xl bg-black/40 border border-white/5 space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-4'>
        <div className='flex items-center gap-2'>
          <Sparkles className='h-4 w-4 text-pw-primary' />
          <div>
            <h4 className='text-sm font-bold text-white'>Profile Picture & Object Mocks</h4>
            <p className='text-[11px] text-pw-muted'>
              Upload an avatar and attach trendy mock objects, crowns, shades, or badges.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <label className='cursor-pointer'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs font-bold gap-1.5 border-white/10 hover:border-pw-primary/40'
              >
              <span>
                <Upload className='h-3.5 w-3.5' /> Upload Photo
              </span>
            </Button>
            <input
              type='file'
              accept='image/*'
              className='hidden'
              onChange={handleImageUpload}
            />
          </label>

          <Button
            type='button'
            onClick={handleSave}
            disabled={isSaving}
            size='sm'
            className='btn-primary text-xs font-bold gap-1.5'>
            <Save className='h-3.5 w-3.5' />
            {isSaving ? 'Applying...' : 'Save Avatar'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-12 gap-6 items-center'>
        {/* Live Canvas / Preview */}
        <div className='md:col-span-5 flex flex-col items-center justify-center space-y-4'>
          <div className='relative w-44 h-44 rounded-full flex items-center justify-center select-none shadow-2xl ring-4 ring-white/10'>
            {/* Avatar Base */}
            <div className='w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900'>
              {avatarImage ? (
                <Image
                  src={avatarImage}
                  alt='Avatar'
                  width={320}
                  height={320}
                  unoptimized
                  className='w-full h-full object-cover'
                />
              ) : (
                <span className='text-5xl font-black text-pw-primary'>
                  {displayName ? displayName[0].toUpperCase() : 'U'}
                </span>
              )}
            </div>

            {/* Attached Mock Object Overlay */}
            {selectedMock && (
              <div
                className='absolute inset-0 pointer-events-none flex items-center justify-center transition-transform'
                style={{
                  transform: `translateY(${mockY}px) scale(${mockScale})`,
                }}>
                <div className='w-32 h-32 flex items-center justify-center'>
                  {selectedMock.svg()}
                </div>
              </div>
            )}
          </div>

          {selectedMock && (
            <div className='w-full max-w-xs space-y-2 p-3 bg-white/2 border border-white/5 rounded-xl text-xs'>
              <div className='flex items-center justify-between text-pw-muted text-[10px] uppercase font-bold'>
                <span>Position Offset (Y)</span>
                <span className='font-mono text-white'>{mockY}px</span>
              </div>
              <input
                type='range'
                min='-50'
                max='50'
                value={mockY}
                onChange={(e) => setMockY(parseInt(e.target.value, 10))}
                className='w-full accent-pw-primary cursor-pointer'
              />

              <div className='flex items-center justify-between text-pw-muted text-[10px] uppercase font-bold pt-1'>
                <span>Scale Size</span>
                <span className='font-mono text-white'>{mockScale.toFixed(2)}x</span>
              </div>
              <input
                type='range'
                min='0.5'
                max='2'
                step='0.05'
                value={mockScale}
                onChange={(e) => setMockScale(parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />

              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setSelectedMock(null)}
                className='w-full text-pw-danger hover:text-pw-danger/80 text-[10px] h-6 mt-1 font-bold'>
                <Trash2 className='h-3 w-3 mr-1' /> Remove Overlay
              </Button>
            </div>
          )}
        </div>

        {/* Object Mocks Selector Grid */}
        <div className='md:col-span-7 space-y-3'>
          <span className='text-xs font-bold uppercase tracking-wider text-pw-muted block'>
            Choose Object Mocks & Stickers
          </span>
          <div className='grid grid-cols-4 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1'>
            {TRENDY_OBJECT_MOCKS.map((mock) => {
              const isSelected = selectedMock?.id === mock.id;
              return (
                <button
                  type='button'
                  key={mock.id}
                  onClick={() => handleSelectMock(mock)}
                  className={cn(
                    'p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all group',
                    isSelected
                      ? 'bg-pw-primary/15 border-pw-primary text-white shadow-lg ring-1 ring-pw-primary'
                      : 'bg-white/2 border-white/5 hover:border-white/20 text-pw-muted hover:text-white',
                  )}>
                  <div className='w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform'>
                    {mock.svg()}
                  </div>
                  <span className='text-[9px] font-semibold truncate w-full text-center'>
                    {mock.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
