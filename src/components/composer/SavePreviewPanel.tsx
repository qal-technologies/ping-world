'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Eye,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Crown,
  Instagram,
  Facebook,
  Linkedin,
  ToggleLeft,
  ToggleRight,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { PREMIUM_FEATURES, getPlatform } from '@/lib/composer/constants';
import type { Platform } from '@/lib/composer/types';
import { PremiumGate } from './PremiumGate';
import { LivePreview } from './LivePreview';
import { toast } from 'sonner';
import { XIcon } from '@/components/ui/XIcon';

const cleanExportFeature = PREMIUM_FEATURES.find(
  (f) => f.id === 'clean_preview',
)!;

const PLATFORM_ICONS: Record<Platform, React.ElementType> = {
  x: XIcon,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

export function SavePreviewPanel() {
  const { state, dispatch } = useComposer();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);

  const [darkMode, setDarkMode] = useState(true);

  const [exportPlatform, setExportPlatform] = useState<Platform>(
    state.activeEditorPlatform
  );

  const handleOverride = () => {
    if(exportPlatform && !state.selectedPlatforms.includes(exportPlatform)) {
      setExportPlatform(state.selectedPlatforms[0])
    }
  }
  
  useEffect(() => {
    handleOverride();
  }, [exportPlatform, state.selectedPlatforms, state.activeEditorPlatform]);


  const capturePreview = async () => {
    if (!previewRef.current) return;
    setIsCapturing(true);
    try {
      const { captureElementToBlob } = await import('@/lib/composer/canvas-capture-utils');
      const blob = await captureElementToBlob(previewRef.current, {
        scale: 2,
        backgroundColor: darkMode ? '#02040f' : '#ffffff',
      });

      const downloadUrl = URL.createObjectURL(blob);
      setPreviewBlob(downloadUrl);
      setRawBlob(blob);
      toast.success('Preview captured successfully!');
      setIsCapturing(false);
    } catch (e) {
      console.error('Capture error:', e);
      toast.error('Failed to capture preview image.');
      setIsCapturing(false);
    }
  };

  const downloadPreview = async () => {
    if (!rawBlob) {
      toast.error('No preview captured yet. Click "Capture Preview Image" first.');
      return;
    }
    try {
      const { saveAs } = await import('file-saver');
      saveAs(rawBlob, `pingworld-post-preview-${Date.now()}.png`);
      toast.success('Preview image saved to your device!');
    } catch (e) {
      // Fallback link trigger
      try {
        const url = URL.createObjectURL(rawBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pingworld-post-preview-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.success('Preview saved to your device!');
      } catch (err) {
        toast.error('Failed to save preview image.');
      }
    }
  };

  const copyToClipboard = async () => {
    if (!rawBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': rawBlob }),
      ]);
      toast.success('Copied to clipboard!');
    } catch (e) {
      toast.error('Copy to clipboard not supported in this browser.');
    }
  };

  return (
    <div className='space-y-2'>
      {/* Export Platform Selector */}
      {state.selectedPlatforms.length > 1 && (
        <div className='flex gap-2 flex-wrap mb-2'>
          {state.selectedPlatforms.map((platform, idx) => {
            const Icon = PLATFORM_ICONS[platform];
            const pmeta = getPlatform(platform);
            const isSelected = exportPlatform === platform;
            return (
              <button
                key={platform + idx}
                onClick={() => setExportPlatform(platform)}
                className='flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105'
                style={
                  isSelected ?
                    {
                      borderColor: pmeta.iconHex,
                      color: '#fff',
                      backgroundColor: pmeta.iconHex,
                    }
                  : {
                      borderColor: `${pmeta.iconHex}40`,
                      color: pmeta.iconHex,
                      backgroundColor: `${pmeta.iconHex}10`,
                    }
                }>
                <Icon className='h-3 w-3' />
                {pmeta.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      )}

      <div className='flex items-center gap-2 justify-between w-full'>
        {/* Reactions toggle */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_REACTIONS' })}
          className='flex items-center gap-1.5 text-[10px] font-semibold text-pw-muted hover:text-pw-text transition-colors'>
          {state.showReactions ?
            <ToggleRight className='h-4 w-4 text-pw-primary' />
          : <ToggleLeft className='h-4 w-4' />}
          {state.showReactions ? 'Show Reactions' : 'Hide Reactions'}
        </button>

        {/* Theme selector header inside Live Preview */}
        <div className='flex items-center justify-between gap-1 pb-2'>
          <span className='text-[10px] font-bold uppercase tracking-wider text-pw-muted'>
            Theme
          </span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className='flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/10 bg-white/5 text-pw-text hover:bg-white/10 transition-colors'>
            {darkMode ?
              <>
                <Sun className='h-3.5 w-3.5 text-yellow-400' /> Light 
              </>
            : <>
                <Moon className='h-3.5 w-3.5 text-sky-400' /> Dark
              </>
            }
          </button>
        </div>
      </div>

      <div className='overflow-x-auto hide-scrollbar w-full flex justify-center items-center'>
        <div
          ref={previewRef}
          className='py-4 sm:p-4 bg-[#02040f] w-full max-w-[420px] items-center'>
          <LivePreview
            forExport
            dark={darkMode}
            platformOverride={exportPlatform}
          />

          {!state.isPremium && (
            <div className='mt-4 flex flex-col items-center opacity-50 w-full'>
              <div className='flex flex-col items-center'>
                <div className='flex items-center gap-1 w-full mb-[-3px] justify-center'>
                  <span
                    className='text-[10px] font-bold tracking-wider'
                    style={{
                      color: '#985cff',
                      fontFamily: 'Syne, sans-serif',
                    }}>
                    PingWorld Composer
                  </span>
                </div>

                <span className='text-[8px] min-w-full text-center opacity-25 tracking-wider pb-1'>
                  www.ping-world.site
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='flex flex-col items-center gap-1 px-3 sm:px-0'>
      {/* Capture button */}
      <button
        onClick={capturePreview}
        disabled={isCapturing}
        className='w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-primary text-sm font-semibold'>
        {isCapturing ?
          <Loader2 className='h-4 w-4 animate-spin' />
        : <Eye className='h-4 w-4' />}
        {isCapturing ? 'Capturing...' : 'Capture Preview'}
      </button>

      {/* Clean export (Premium) */}
      <PremiumGate
        feature={cleanExportFeature}
        isPremium={state.isPremium}
        showPartial={false}
        className='h-12 min-w-full'>
        <div className='px-3 py-2 flex items-center h-12 gap-2'>
          <Crown className='h-3.5 w-3.5 text-pw-warning' />
          <span className='text-xs text-pw-muted'>
            Export without watermark
          </span>
        </div>
      </PremiumGate>
      </div>
      
      {/* Preview modal */}
      <AnimatePresence>
        {previewBlob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div
              className='absolute inset-0 bg-black/80 backdrop-blur-md'
              onClick={() => setPreviewBlob(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className='relative z-10 max-w-lg w-full bg-pw-surface rounded-2xl border border-white/10 shadow-2xl overflow-hidden'>
              {/* Header */}
              <div className='flex items-center justify-between p-4 border-b border-white/5'>
                <div className='flex items-center gap-2'>
                  <ImageIcon className='h-4 w-4 text-pw-primary' />
                  <span className='font-bold text-sm'>Preview Export</span>
                </div>
                <button
                  onClick={() => setPreviewBlob(null)}
                  className='text-pw-muted hover:text-pw-text transition-colors'>
                  <X className='h-4 w-4' />
                </button>
              </div>

              {/* Preview image */}
              <div className='p-4'>
                <img
                  src={previewBlob}
                  alt='Post preview'
                  className='w-full rounded-xl border border-white/5'
                />
              </div>

              {/* Actions */}
              <div className='flex flex-wrap items-center justify-center gap-3 p-4 border-t border-white/5'>
                <button
                  onClick={downloadPreview}
                  className=' min-w-[150px] flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-sm font-semibold'>
                  <Download className='h-4 w-4' />
                  Download PNG
                </button>
                <button
                  onClick={copyToClipboard}
                  className=' min-w-[150px] flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all'>
                  <Check className='h-4 w-4' />
                  Copy Image
                </button>
              </div>

              {!state.isPremium && (
                <div className='px-4 pb-4'>
                  <p className='text-[10px] text-pw-muted text-center'>
                    Free exports include PingWorld watermark.{' '}
                    <a
                      href='/pricing'
                      className='text-pw-primary hover:underline'>
                      Upgrade
                    </a>{' '}
                    for clean exports.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
