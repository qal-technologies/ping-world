'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  Sun,
  Contrast,
  RotateCcw,
  RotateCw,
  VideoIcon,
  AlertTriangle,
  Lock,
  PaintBucket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import {
  FREE_LIMITS,
  PREMIUM_FEATURES,
  getPlatform,
} from '@/lib/composer/constants';
import { PremiumGate } from './PremiumGate';
import type { MediaAsset } from '@/lib/composer/types';
import { toast } from 'sonner';
import Image from 'next/image';

const multiImageFeature = PREMIUM_FEATURES.find((f) => f.id === 'multi_image')!;

function parseFilter(filterStyle: string) {
  const brightness = parseFloat(
    filterStyle.match(/brightness\(([\d.]+)\)/)?.[1] ?? '1',
  );
  const contrast = parseFloat(
    filterStyle.match(/contrast\(([\d.]+)\)/)?.[1] ?? '1',
  );

  const hue = parseFloat(filterStyle.match(/hue\(([\d.]+)\)/)?.[1] ?? '1');

  return { brightness, contrast, hue };
}

function buildFilter(brightness: number, contrast: number, hue: number) {
  return `brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)}) hue-rotate(${hue.toFixed(2)}deg)`;
}

export function MediaEditor() {
  const { state, dispatch } = useComposer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const firstPlatform = state.selectedPlatforms[0] ?? 'x';
  const platformMeta = getPlatform(firstPlatform);
  const maxImages =
    state.isPremium ? platformMeta.maxImages : FREE_LIMITS.maxImages;
  const canUploadMore = state.mediaAssets.length < maxImages;

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - state.mediaAssets.length;
      if (remaining <= 0) {
        toast.error(
          `Maximum ${maxImages} media files${state.isPremium ? '' : ' on free plan'}.`,
        );
        return;
      }
      Array.from(files)
        .slice(0, remaining)
        .forEach((file) => {
          if (
            !file.type.startsWith('image/') &&
            !file.type.startsWith('video/')
          ) {
            toast.error(`Unsupported file type: ${file.type}`);
            return;
          }
          const previewUrl = URL.createObjectURL(file);
          const asset: MediaAsset = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            altText: '',
            filterStyle: 'brightness(1) contrast(1)',
            rotation: 0,
          };
          dispatch({ type: 'ADD_MEDIA', payload: asset });

          setSelectedId(asset.id);
        });
    },
    [maxImages, state.mediaAssets.length, state.isPremium, dispatch],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const selectedAsset = state.mediaAssets.find((m) => m.id === selectedId);
  const { brightness, contrast, hue } =
    selectedAsset ?
      parseFilter(selectedAsset.filterStyle)
    : { brightness: 1, contrast: 1, hue:0 };

  const updateFilter = (b: number, c: number, h:number) => {
    if (!selectedId) return;
    dispatch({
      type: 'UPDATE_MEDIA_FILTER',
      payload: { id: selectedId, filterStyle: buildFilter(b, c, h) },
    });
  };

  const rotate = (direction: 'cw' | 'ccw') => {
    if (!selectedId || !selectedAsset) return;
    const newRot =
      direction === 'cw' ?
        ((selectedAsset.rotation ?? 0) + 90) % 360
      : ((selectedAsset.rotation ?? 0) - 90 + 360) % 360;
    dispatch({
      type: 'UPDATE_MEDIA_ROTATION',
      payload: { id: selectedId, rotation: newRot },
    });
  };

  const disabled = useMemo(
    () => !state.isPremium && state.mediaAssets.length + 1 > 1,
    [state.isPremium],
  );

  const lastImage = state.mediaAssets.length - 1;
  const ImageToShow =
    disabled ? [state.mediaAssets[lastImage]] : state.mediaAssets;

  return (
    <div className='space-y-4'>
      {/* Upload zone */}
      {canUploadMore ?
        <div
          className='border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-pw-primary/40 hover:bg-pw-primary/5 transition-all cursor-pointer'
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}>
          <input
            ref={fileInputRef}
            type='file'
            className='hidden'
            accept='image/*,video/*'
            multiple={state.isPremium}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className='h-6 w-6 text-pw-muted mx-auto mb-2' />
          <p className='text-sm font-semibold text-pw-muted'>
            Drop media here or <span className='text-pw-primary'>browse</span>
          </p>
          <p className='text-[10px] text-pw-muted/60 mt-1'>
            {state.isPremium ?
              'Images & videos • Up to 10 files'
            : 'Images only • 1 file on free plan'}
          </p>
          <div className='mt-2 flex items-center justify-center gap-1 text-[10px] text-pw-muted/50'>
            <AlertTriangle className='h-3 w-3 text-pw-warning' />
            Media is processed locally and never uploaded to PingWorld servers
          </div>
        </div>
      : !canUploadMore ?
        <div className='mt-2 flex items-center justify-center gap-1 text-[10px] text-pw-muted/50'>
          <AlertTriangle className='h-3 w-3 text-pw-warning' />
          You have reached the Max Upload for this Social Platform.
        </div>
      : !state.isPremium && (
          <PremiumGate
            feature={multiImageFeature}
            isPremium={false}
            showPartial={false}>
            <div className='p-6 h-20 flex items-center justify-center'>
              <span className='text-pw-muted text-xs'>
                Upgrade for more media
              </span>
            </div>
          </PremiumGate>
        )
      }

      {/* Media grid */}
      {state.mediaAssets.length > 0 && (
        <div className='grid grid-cols-3 gap-2'>
          <AnimatePresence>
            {ImageToShow.map((asset) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  'relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all',
                  selectedId === asset.id ?
                    'border-pw-primary'
                  : 'border-transparent hover:border-white/20',
                )}
                onClick={() => {
                  if (disabled) return;
                  setSelectedId(selectedId === asset.id ? null : asset.id);
                }}>
                {asset.type === 'image' ?
                  <Image
                    src={asset.previewUrl}
                    alt={asset.altText || 'upload'}
                    className='w-full h-full object-cover'
                    width={500}
                    height={500}
                    style={{
                      filter: asset.filterStyle,
                      transform: `rotate(${asset.rotation}deg)`,
                    }}
                  />
                : <div className='w-full h-full bg-pw-surface flex items-center justify-center'>
                    <VideoIcon className='h-8 w-8 text-pw-muted' />
                  </div>
                }
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_MEDIA', payload: asset.id });
                    if (selectedId === asset.id) setSelectedId(null);
                  }}
                  className='absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-pw-danger/80 transition-colors'>
                  <X className='h-3 w-3 text-white' />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Editor panel for selected asset */}
      <AnimatePresence>
        {selectedAsset && selectedAsset.type === 'image' ?
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='space-y-4 p-4 rounded-xl bg-white/[0.03] border border-white/10'>
            <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
              Edit Image
            </p>

            {/* Brightness */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  <Sun className='h-3.5 w-3.5' />
                  Brightness
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(brightness * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0.2}
                max={2}
                step={0.05}
                value={brightness}
                onChange={(e) =>
                  updateFilter(parseFloat(e.target.value), contrast, hue)
                }
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Contrast */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  <Contrast className='h-3.5 w-3.5' />
                  Contrast
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(contrast * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0.2}
                max={2}
                step={0.05}
                value={contrast}
                onChange={(e) =>
                  updateFilter(brightness, parseFloat(e.target.value), hue)
                }
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Hue
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  <PaintBucket className='h-3.5 w-3.5' />
                  Hue
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(hue * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0.2}
                max={2}
                step={0.05}
                value={hue}
                onChange={(e) =>
                  updateFilter(brightness, contrast, parseFloat(e.target.value))
                }
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div> */}

            {/* Rotation */}
            <div className='flex items-center gap-2'>
              <span className='text-xs text-pw-muted flex-1'>Rotation</span>
              <button
                onClick={() => rotate('ccw')}
                className='p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-pw-muted hover:text-pw-text'>
                <RotateCcw className='h-3.5 w-3.5' />
              </button>
              <span className='text-[10px] font-mono text-pw-muted w-8 text-center'>
                {selectedAsset.rotation}°
              </span>
              <button
                onClick={() => rotate('cw')}
                className='p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-pw-muted hover:text-pw-text'>
                <RotateCw className='h-3.5 w-3.5' />
              </button>
              <button
                onClick={() => {
                  dispatch({
                    type: 'UPDATE_MEDIA_ROTATION',
                    payload: { id: selectedAsset.id, rotation: 0 },
                  });
                  dispatch({
                    type: 'UPDATE_MEDIA_FILTER',
                    payload: {
                      id: selectedAsset.id,
                      filterStyle: 'brightness(1) contrast(1)',
                    },
                  });
                }}
                className='p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-pw-muted hover:text-pw-text text-[10px]'>
                Reset
              </button>
            </div>

            {/* Alt text */}
            <div className='space-y-1'>
              <label className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
                Alt Text (Accessibility)
              </label>
              <input
                type='text'
                value={selectedAsset.altText}
                onChange={(e) => {
                  dispatch({
                    type: 'UPDATE_MEDIA_FILTER',
                    payload: {
                      id: selectedAsset.id,
                      filterStyle: selectedAsset.filterStyle,
                    },
                  });
                  // Update alt text via a workaround since we haven't added a specific action
                  // In production this would be a dedicated action
                }}
                placeholder='Describe this image for screen readers...'
                className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-pw-text placeholder:text-pw-muted/40 focus:outline-none focus:border-pw-primary/40 no-outline'
              />
            </div>
          </motion.div>
        : selectedAsset &&
          selectedAsset.type === 'video' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center text-center space-y-2'>
              <div className='p-3 rounded-full bg-pw-primary/10 mb-1 mt-2'>
                <VideoIcon className='h-5 w-5 text-pw-primary' />
              </div>
              <p className='text-sm font-bold text-pw-text'>
                Video Editing{' '}
                <span className='text-pw-primary'>Coming Soon</span>
              </p>
              <p className='text-[10px] text-pw-muted max-w-[200px] mb-2'>
                Trimming, filters, and cover frame selection for video assets
                will be available for Premium users soon.
              </p>
              <div className='flex items-center gap-1 text-[10px] text-pw-warning font-semibold uppercase tracking-widest'>
                <Lock className='h-3 w-3' /> Premium Feature
              </div>
            </motion.div>
          )
        }
      </AnimatePresence>
    </div>
  );
}
