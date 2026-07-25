'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Eye,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Crown,
  Twitter,
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

const cleanExportFeature = PREMIUM_FEATURES.find(
  (f) => f.id === 'clean_preview',
)!;

const PLATFORM_ICONS: Record<Platform, React.ElementType> = {
  x: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

export function SavePreviewPanel() {
  const { state, dispatch, getContentForPlatform } = useComposer();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState(true);

  const [exportPlatform, setExportPlatform] = useState<Platform>(
    state.selectedPlatforms[0] ?? 'x',
  );

  const capturePreview = async () => {
    if (!previewRef.current) return;
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        scale: 1.5,
        backgroundColor: '#02040f',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const ctx = canvas.getContext('2d');
      if (ctx && !state.isPremium) {
        // Add watermark for free users
        ctx.font = 'bold 16px Syne, sans-serif';
        ctx.fillStyle = 'rgba(152, 92, 255, 0.8)';
        ctx.fillText('Made with PingWorld', 12, canvas.height - 12);

        // PingWorld logo badge
        ctx.fillStyle = 'rgba(92, 111, 255, 0.5)';
        ctx.fillRect(canvas.width - 130, canvas.height - 28, 128, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Space Grotesk, sans-serif';
        ctx.fillText('pingwrld.com', canvas.width - 118, canvas.height - 12);
      }

      // jules edit: Native HTML5 canvas toBlob is extremely robust and does not suffer from data URL lengths
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to capture preview blob.');
          setIsCapturing(false);
          return;
        }
        const downloadUrl = URL.createObjectURL(blob);
        setPreviewBlob(downloadUrl);
        toast.success('Preview captured!');
        setIsCapturing(false);
      }, 'image/png');
    } catch {
      toast.error('Failed to capture preview.');
      setIsCapturing(false);
    }
  };

  // jules edit: Safe cross-platform file saving using file-saver with a true binary Blob
  const downloadPreview = async () => {
    if (!previewBlob) return;
    try {
      const res = await fetch(previewBlob);
      const blob = await res.blob();
      const { saveAs } = await import('file-saver');
      saveAs(blob, `pingworld-post-preview-${Date.now()}.png`);
      toast.success('Preview saved!');
    } catch {
      toast.error('Failed to save preview blob.');
    }
  };

  const copyToClipboard = async () => {
    if (!previewBlob) return;
    try {
      const res = await fetch(previewBlob);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Copy to clipboard not supported in this browser.');
    }
  };

  return (
    <div className='space-y-4'>
      {/* Export Platform Selector */}
      {state.selectedPlatforms.length > 1 && (
        <div className='flex gap-2 flex-wrap mb-2'>
          {state.selectedPlatforms.map((platform) => {
            const Icon = PLATFORM_ICONS[platform];
            const pmeta = getPlatform(platform);
            const isSelected = exportPlatform === platform;
            return (
              <button
                key={platform}
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
