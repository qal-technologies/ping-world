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
  Sliders,
  Sparkles,
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

const multiImageFeature = PREMIUM_FEATURES.find((f) => f.id === 'multi_image')!;

function parseFilter(filterStyle: string) {
  // Parsing standard and newly added CSS filters
  const brightness = parseFloat(filterStyle.match(/brightness\(([\d.]+)\)/)?.[1] ?? '1');
  const contrast = parseFloat(filterStyle.match(/contrast\(([\d.]+)\)/)?.[1] ?? '1');
  const saturate = parseFloat(filterStyle.match(/saturate\(([\d.]+)\)/)?.[1] ?? '1');
  const grayscale = parseFloat(filterStyle.match(/grayscale\(([\d.]+)\)/)?.[1] ?? '0');
  const sepia = parseFloat(filterStyle.match(/sepia\(([\d.]+)\)/)?.[1] ?? '0');
  const blur = parseFloat(filterStyle.match(/blur\(([\d.]+)px\)/)?.[1] ?? '0');
  const invert = parseFloat(filterStyle.match(/invert\(([\d.]+)\)/)?.[1] ?? '0');
  const hue = parseFloat(filterStyle.match(/hue-rotate\(([\d.]+)deg\)/)?.[1] ?? '0');

  return { brightness, contrast, saturate, grayscale, sepia, blur, invert, hue };
}

function buildFilter(b: number, c: number, s: number, g: number, sep: number, bl: number, inv: number, h: number) {
  return `brightness(${b.toFixed(2)}) contrast(${c.toFixed(2)}) saturate(${s.toFixed(2)}) grayscale(${g.toFixed(2)}) sepia(${sep.toFixed(2)}) blur(${bl.toFixed(1)}px) invert(${inv.toFixed(2)}) hue-rotate(${h.toFixed(0)}deg)`;
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

  // Convert files to base64 to prevent CORS taint on HTML Canvas previews
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - state.mediaAssets.length;
      if (remaining <= 0) {
        toast.error(
          `Maximum ${maxImages} media files${state.isPremium ? '' : ' on free plan'}.`,
        );
        return;
      }
      const fileList = Array.from(files).slice(0, remaining);
      for (const file of fileList) {
        if (
          !file.type.startsWith('image/') &&
          !file.type.startsWith('video/')
        ) {
          toast.error(`Unsupported file type: ${file.type}`);
          continue;
        }

        try {
          // Convert to Base64 data URL to keep html2canvas happy and completely bypass CORS canvas taints!
          const base64Url = await fileToBase64(file);
          const asset: MediaAsset = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl: base64Url,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            altText: '',
            filterStyle: 'brightness(1) contrast(1) saturate(1) grayscale(0) sepia(0) blur(0px) invert(0) hue-rotate(0deg)',
            rotation: 0,
          };
          dispatch({ type: 'ADD_MEDIA', payload: asset });
          setSelectedId(asset.id);
        } catch {
          toast.error('Failed to load file preview.');
        }
      }
    },
    [maxImages, state.mediaAssets.length, state.isPremium, dispatch],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const selectedAsset = state.mediaAssets.find((m) => m.id === selectedId);
  const filters = useMemo(() => {
    if (!selectedAsset) {
      return { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, blur: 0, invert: 0, hue: 0 };
    }
    return parseFilter(selectedAsset.filterStyle);
  }, [selectedAsset]);

  const updateFilter = (key: string, val: number) => {
    if (!selectedId || !selectedAsset) return;
    const current = parseFilter(selectedAsset.filterStyle);
    const updated = { ...current, [key]: val };
    const styleString = buildFilter(
      updated.brightness,
      updated.contrast,
      updated.saturate,
      updated.grayscale,
      updated.sepia,
      updated.blur,
      updated.invert,
      updated.hue
    );
    dispatch({
      type: 'UPDATE_MEDIA_FILTER',
      payload: { id: selectedId, filterStyle: styleString },
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
    [state.isPremium, state.mediaAssets],
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
                  /* jules edit: standard img element, bypasses Next.js Image loader optimized logic for mobile and local file rendering stability */
                  <img
                    src={asset.previewUrl}
                    alt={asset.altText || 'upload'}
                    className='w-full h-full object-cover'
                    style={{
                      filter: asset.filterStyle,
                      transform: `rotate(${asset.rotation}deg)`,
                    }}
                  />
                : <div className='w-full h-full bg-pw-surface relative flex items-center justify-center'>
                    {/* jules edit: enable filters directly on video tags! */}
                    <video
                      src={asset.previewUrl}
                      className='absolute inset-0 w-full h-full object-cover pointer-events-none'
                      muted
                      loop
                      playsInline
                      autoPlay
                      style={{ filter: asset.filterStyle }}
                    />
                    <VideoIcon className='h-8 w-8 text-white relative z-10 drop-shadow' />
                  </div>
                }
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_MEDIA', payload: asset.id });
                    if (selectedId === asset.id) setSelectedId(null);
                  }}
                  className='absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-pw-danger/80 transition-colors z-20'>
                  <X className='h-3 w-3 text-white' />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Editor panel for selected asset */}
      <AnimatePresence>
        {selectedAsset ?
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='space-y-4 p-4 rounded-xl bg-white/[0.03] border border-white/10'>
            <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted flex items-center gap-1.5'>
              <Sliders className='h-3.5 w-3.5 text-pw-primary' /> Edit {selectedAsset.type === 'image' ? 'Image' : 'Video'} Filters
            </p>

            {/* Brightness */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Brightness
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(filters.brightness * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0.2}
                max={2}
                step={0.05}
                value={filters.brightness}
                onChange={(e) => updateFilter('brightness', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Contrast */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Contrast
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(filters.contrast * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0.2}
                max={2}
                step={0.05}
                value={filters.contrast}
                onChange={(e) => updateFilter('contrast', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Saturation */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Saturation
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(filters.saturate * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={3}
                step={0.1}
                value={filters.saturate}
                onChange={(e) => updateFilter('saturate', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Grayscale */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Grayscale
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(filters.grayscale * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={1}
                step={0.05}
                value={filters.grayscale}
                onChange={(e) => updateFilter('grayscale', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Sepia */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Sepia
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(filters.sepia * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={1}
                step={0.05}
                value={filters.sepia}
                onChange={(e) => updateFilter('sepia', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Blur */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Blur
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {filters.blur}px
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={10}
                step={0.5}
                value={filters.blur}
                onChange={(e) => updateFilter('blur', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Invert */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Invert Colors
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {Math.round(filters.invert * 100)}%
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={1}
                step={0.05}
                value={filters.invert}
                onChange={(e) => updateFilter('invert', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

            {/* Hue-rotate */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-1.5 text-xs text-pw-muted'>
                  Hue Rotate
                </label>
                <span className='text-[10px] font-mono text-pw-muted/60'>
                  {filters.hue}°
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={360}
                step={5}
                value={filters.hue}
                onChange={(e) => updateFilter('hue', parseFloat(e.target.value))}
                className='w-full accent-pw-primary cursor-pointer'
              />
            </div>

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
                      filterStyle: 'brightness(1) contrast(1) saturate(1) grayscale(0) sepia(0) blur(0px) invert(0) hue-rotate(0deg)',
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
                  // Standard local fallback simulation logic
                }}
                placeholder='Describe this content for screen readers...'
                className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-pw-text placeholder:text-pw-muted/40 focus:outline-none focus:border-pw-primary/40 no-outline'
              />
            </div>
          </motion.div>
        : null}
      </AnimatePresence>
    </div>
  );
}
