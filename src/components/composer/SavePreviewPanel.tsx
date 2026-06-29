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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { PREMIUM_FEATURES } from '@/lib/composer/constants';
import { PremiumGate } from './PremiumGate';
import { LivePreview } from './LivePreview';
import { toast } from 'sonner';

const cleanExportFeature = PREMIUM_FEATURES.find((f) => f.id === 'clean_preview')!;

export function SavePreviewPanel() {
  const { state } = useComposer();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);

  const capturePreview = async () => {
    if (!previewRef.current) return;
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: '#02040f',
        logging: false,
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

      setPreviewBlob(canvas.toDataURL('image/png'));
      toast.success('Preview captured!');
    } catch {
      toast.error('Failed to capture preview.');
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadPreview = () => {
    if (!previewBlob) return;
    const link = document.createElement('a');
    link.href = previewBlob;
    link.download = `pingworld-post-preview-${Date.now()}.png`;
    link.click();
    toast.success('Preview saved!');
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
      {/* Hidden capture target */}
      <div className=''>
        <div ref={previewRef} className='p-6 bg-[#02040f] w-[400px] items-center'>
          <div className='mb-4 flex items-center gap-2'>
            <div className='w-2 h-2 rounded-full bg-pw-primary' />
            <span
              className='text-xs font-bold'
              style={{ color: '#985cff', fontFamily: 'Syne, sans-serif' }}
            >
              PingWorld Composer
            </span>
          </div>
          <LivePreview forExport />
        </div>
      </div>

      {/* Capture button */}
      <button
        onClick={capturePreview}
        disabled={isCapturing}
        className='w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-primary text-sm font-semibold'
      >
        {isCapturing ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <Eye className='h-4 w-4' />
        )}
        {isCapturing ? 'Capturing...' : 'Capture Preview'}
      </button>

      {/* Clean export (Premium) */}
      <PremiumGate
        feature={cleanExportFeature}
        isPremium={state.isPremium}
        showPartial={false}
        className='h-12'
      >
        <div className='px-3 py-2 flex items-center h-12 gap-2'>
          <Crown className='h-3.5 w-3.5 text-pw-warning' />
          <span className='text-xs text-pw-muted'>Export without watermark</span>
        </div>
      </PremiumGate>

      {/* Preview modal */}
      <AnimatePresence>
        {previewBlob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center p-4'
          >
            <div
              className='absolute inset-0 bg-black/80 backdrop-blur-md'
              onClick={() => setPreviewBlob(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className='relative z-10 max-w-lg w-full bg-pw-surface rounded-2xl border border-white/10 shadow-2xl overflow-hidden'
            >
              {/* Header */}
              <div className='flex items-center justify-between p-4 border-b border-white/5'>
                <div className='flex items-center gap-2'>
                  <ImageIcon className='h-4 w-4 text-pw-primary' />
                  <span className='font-bold text-sm'>Preview Export</span>
                </div>
                <button
                  onClick={() => setPreviewBlob(null)}
                  className='text-pw-muted hover:text-pw-text transition-colors'
                >
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
              <div className='flex gap-3 p-4 border-t border-white/5'>
                <button
                  onClick={downloadPreview}
                  className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-sm font-semibold'
                >
                  <Download className='h-4 w-4' />
                  Download PNG
                </button>
                <button
                  onClick={copyToClipboard}
                  className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all'
                >
                  <Check className='h-4 w-4' />
                  Copy Image
                </button>
              </div>

              {!state.isPremium && (
                <div className='px-4 pb-4'>
                  <p className='text-[10px] text-pw-muted text-center'>
                    Free exports include PingWorld watermark.{' '}
                    <a href='/pricing' className='text-pw-primary hover:underline'>
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
