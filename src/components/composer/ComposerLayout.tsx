'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Hash,
  Sparkles,
  BarChart2,
  Languages,
  Brain,
  ImageIcon,
  Layers,
  Crown,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Wifi,
  Star,
  CheckCircle,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { Card } from '@/components/ui/card';
import { sanitizeInput } from '@/lib/general/sanitize';
import { supabase } from '@/lib/supabase';
import { HybridStorage } from '@/lib/storage-utils';

// ─── Sub-components ───────────────────────────────────────────
import { AccountConnector } from './AccountConnector';
import { PrivacyPermissionModal } from './PrivacyPermissionModal';
import { PlatformEditor } from './PlatformEditor';
import { TagsHashtagsPanel } from './TagsHashtagsPanel';
import { TextAnalysisPanel } from './TextAnalysisPanel';
import { AiSuggestionsPanel } from './AiSuggestionsPanel';
import { AiContextPanel } from './AiContextPanel';
import { TranslationPanel } from './TranslationPanel';
import { MediaEditor } from './MediaEditor';
import { CanvasBuilder } from './CanvasBuilder';
import { LivePreview } from './LivePreview';
import { SavePreviewPanel } from './SavePreviewPanel';
import { InstagramCanvasSettings } from './InstagramCanvasSettings';
import { PostHistoryPanel } from './PostHistoryPanel';
import { toast } from 'sonner';
import Link from 'next/link';

type ToolTab =
  | 'tags'
  | 'analysis'
  | 'ai'
  | 'translate'
  | 'ai_context'
  | 'media'
  | 'canvas'
  | 'history'
  | 'save';

interface TabDef {
  id: ToolTab;
  label: string;
  icon: React.ElementType;
  onlineOnly?: boolean;
  premiumOnly?: boolean;
}

const TOOL_TABS: TabDef[] = [
  { id: 'analysis', label: 'Analysis', icon: BarChart2 },
  { id: 'history', label: 'History', icon: History },
  { id: 'tags', label: 'Tags', icon: Hash },
  { id: 'ai', label: 'AI Write', icon: Sparkles, onlineOnly: true },
  { id: 'translate', label: 'Translate', icon: Languages, onlineOnly: true },
  { id: 'ai_context', label: 'AI Context', icon: Brain },
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'canvas', label: 'Canvas', icon: Layers },
];

function ToolPanel({ activeTab }: { activeTab: ToolTab }) {
  switch (activeTab) {
    case 'analysis':
      return <TextAnalysisPanel />;
    case 'history':
      return <PostHistoryPanel />;
    case 'tags':
      return <TagsHashtagsPanel />;
    case 'ai':
      return <AiSuggestionsPanel />;
    case 'translate':
      return <TranslationPanel />;
    case 'ai_context':
      return <AiContextPanel />;
    case 'media':
      return <MediaEditor />;
    case 'canvas':
      return <CanvasBuilder />;
    default:
      return null;
  }
}

export function ComposerLayout() {
  const { state, dispatch, user, premiumTier } = useComposer();
  const [activeTab, setActiveTab] = useState<ToolTab>('analysis');
  const [isPosting, setIsPosting] = useState(false);
  // jules edit: Scheduled post states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');

  const handleSchedulePost = async () => {
    if (!scheduledDate) {
      return toast.error('Please pick a valid schedule date!');
    }
    const targetIso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    setIsPosting(true);
    const toastId = toast.loading('Scheduling post...');

    try {
      const sanitizedBody = sanitizeInput(state.baseContent);
      const scheduledLog = {
        id: `post-sched-${Date.now()}`,
        content: sanitizedBody,
        platforms: state.selectedPlatforms,
        created_at: new Date().toISOString(),
        scheduled_for: targetIso,
        status: 'scheduled',
      };

      await HybridStorage.save(scheduledLog.id, scheduledLog, 'composer_history');
      setShowScheduleModal(false);
      toast.dismiss(toastId);
      toast.success(`🎉 Post scheduled for ${new Date(targetIso).toLocaleString()}!`);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error('Failed to schedule post.');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostToSocials = async () => {
    if (!state.isOnline) {
      return toast.warning('You are currently offline. Posting to social networks requires an active internet connection.');
    }

    if (!state.baseContent.trim()) {
      return toast.error('Please write some content before attempting to post!');
    }

    if (!state.selectedPlatforms || state.selectedPlatforms.length === 0) {
      return toast.error('Please select at least one social media platform.');
    }

    setIsPosting(true);
    const toastId = toast.loading('Connecting and dispatching to selected social API gateways...');

    try {
      // 1. Dispatch to social publishing API
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: state.baseContent,
          platforms: state.selectedPlatforms,
          hashtags: state.tags?.map((t) => t.tag) || [],
          mediaUrls: state.mediaAssets?.map((f) => f.previewUrl).filter(Boolean) || [],
          canvasBlobBase64: state.canvasBackground || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.dismiss(toastId);
        const errorMsg =
          data.results?.find((r: any) => r.error)?.error ||
          data.error ||
          'Failed to publish to social media.';
        return toast.error(errorMsg);
      }

      // 2. Save composed history log to HybridStorage & Supabase/localStorage
      // jules edit: Always persist composed post to HybridStorage and local history
      const sanitizedBody = sanitizeInput(state.baseContent);
      const newLog = {
        id: `post-${Date.now()}`,
        content: sanitizedBody,
        platforms: state.selectedPlatforms,
        created_at: new Date().toISOString(),
      };

      await HybridStorage.save(newLog.id, newLog, 'composer_history');

      if (user) {
        const maxHistory = premiumTier === 'free' || premiumTier === 'flexible' ? 5 : 50;

        const { data: profile } = await supabase
          .from('profiles')
          .select('composer_history')
          .eq('id', user.id)
          .single();

        let history = Array.isArray(profile?.composer_history) ? profile.composer_history : [];
        history.unshift(newLog);
        if (history.length > maxHistory) history = history.slice(0, maxHistory);

        await supabase
          .from('profiles')
          .update({ composer_history: history })
          .eq('id', user.id);
      } else {
        const cached = localStorage.getItem('pw_composer_history') || '[]';
        const list = JSON.parse(cached);
        list.unshift(newLog);
        localStorage.setItem('pw_composer_history', JSON.stringify(list.slice(0, 10)));
      }

      toast.dismiss(toastId);
      if (data.sandbox) {
        toast.info(
          '🎉 Post verified & simulated in Sandbox mode! (Add social API keys in .env for live posting)',
          { duration: 6000 }
        );
      } else {
        toast.success('🎉 Successfully published to all selected social platforms!');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Failed to post: ' + (err?.message || 'Please try again.'));
    } finally {
      setIsPosting(false);
    }
  };
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const isPremiumUI = state.isPremium;

  return (
    <div
      className={cn(
        'min-h-screen transition-all duration-500',
        isPremiumUI &&
          'bg-[radial-gradient(ellipse_80%_50%_at_20%_20%,rgba(255,179,71,0.06)_0%,transparent_60%)]',
      )}>
      {/* Privacy Modal (global) */}
      <PrivacyPermissionModal />

      {/* Page header */}
      <div className='container mx-auto px-4 md:px-6 pt-10 pb-6 max-w-[1400px]'>
        <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6'>
          <div>
            <div className='badge mb-3'>
              <PenTool className='h-3.5 w-3.5' />
              Composer
              {isPremiumUI && (
                <span className='ml-1 flex items-center gap-0.5 text-pw-warning'>
                  <Crown className='h-3 w-3' />
                  Premium
                </span>
              )}
            </div>
            <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
              Creator{' '}
              <span
                className={cn(
                  'gradient-text',
                  isPremiumUI && 'gradient-text-warm',
                )}>
                Hub.
              </span>
            </h1>
            <p className='mt-2 text-pw-muted font-medium text-sm'>
              Craft, polish, and publish to all platforms - powered by AI.
            </p>
          </div>

          {/* Account connector + status */}
          <div className='flex flex-col items-start md:items-end gap-2 mt-1'>
            <AccountConnector />

            <div className='flex flex-wrap gap-2 mt-1 lg:mt-3'>
              {/* Online/Offline indicator */}
              <div
                className={cn(
                  'flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border',
                  state.isOnline ?
                    'text-pw-success border-pw-success/30 bg-pw-success/10'
                  : 'text-pw-danger border-pw-danger/30 bg-pw-danger/10',
                )}>
                {state.isOnline ?
                  <Wifi className='h-3 w-3' />
                : <WifiOff className='h-3 w-3' />}
                {state.isOnline ?
                  'Online'
                : 'Offline - AI features unavailable'}
              </div>

              {/* DEV: premium toggle (remove in production, wire to Supabase) */}
              <Link
                href='/pricing'
                target={'_blank'}
                title={state.isPremium ? 'View Plan' : 'Upgrade Plan'}
                className={cn(
                  'text-[10px] font-mono px-3 py-0.5 rounded-full border transition-all flex items-center gap-1',
                  state.isPremium ?
                    'text-pw-warning border-pw-warning/40 bg-pw-warning/10'
                  : 'text-pw-muted border-white/5 bg-white/2',
                )}>
                {state.isPremium ?
                  <Crown className='h-3 w-3' />
                : <Star className='h-3 w-3' />}
                {state.isPremium ? 'Premium' : 'Free Tier'}
              </Link>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div
          className='grid grid-cols-1 md:grid-cols-5
         xl:grid-cols-12 gap-6 mt-10 lg:mt-12'>
          {/* ─── Left: Editor + Tools ─── */}
          <div className='md:col-span-3 xl:col-span-8 space-y-4'>
            {/* Platform Editor */}
            <div className='flex items-center flex-col w-full gap-2'>
              {/* Add Network / Add Social button */}

              <AnimatePresence mode='popLayout'>
                <div className='h-12 bg-transparent w-full items-center justify-end flex gap-2'>
                  {/* Schedule Post Button for Premium Users */}
                  {state.isPremium && (
                    <button
                      title='Schedule Post'
                      onClick={() => setShowScheduleModal(true)}
                      className='h-10 px-4 rounded-full border border-pw-warning/30 bg-pw-warning/10 text-pw-warning text-xs font-bold flex items-center gap-1.5 hover:bg-pw-warning/20 transition-all'>
                      <Crown className='h-3.5 w-3.5' /> Schedule
                    </button>
                  )}

                  <button
                    title='Post to social platforms'
                    onClick={handlePostToSocials}
                    disabled={isPosting}
                    className='btn-primary h-10 rounded-full flex items-center justify-between gap-3 cursor-pointer'
                    style={{ borderRadius: '200px' }}>
                    <CheckCircle className='w-4 h-4' />
                    {isPosting ? 'Posting...' : 'Post'}
                  </button>
                  <button
                    title='Add New Social Platform'
                    onClick={() =>
                      toast.error(
                        'Additional premium social networks coming soon!',
                      )
                    }
                    className='w-10 h-10 bg-pw-primary/5 rounded-full flex flex-col items-center justify-center gap-1.5 text-pw-muted/80 hover:text-pw-primary transition-colors hover:bg-pw-primary/10 sm:bg-transparent'>
                    <div className='h-5 w-5 rounded-full border border-current flex items-center justify-center'>
                      <span className='font-bold text-lg'>+</span>
                    </div>
                    <span className='text-[8px] font-bold uppercase tracking-widest hidden sm:block'>
                      Add
                    </span>
                  </button>
                </div>

                <InstagramCanvasSettings />
              </AnimatePresence>

              {/* Schedule Post Dialog Modal */}
              {showScheduleModal && (
                <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4'>
                  <div className='bg-[#0c0d1c] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-white'>
                    <div className='flex items-center gap-2 text-pw-warning'>
                      <Crown className='h-5 w-5' />
                      <h3 className='text-lg font-bold font-display'>Schedule Post</h3>
                    </div>
                    <p className='text-xs text-pw-muted'>
                      Pick a date & time to automatically queue this post.
                    </p>

                    <div className='space-y-3'>
                      <div className='space-y-1'>
                        <label className='text-[10px] font-bold text-pw-muted uppercase'>Date</label>
                        <input
                          type='date'
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className='w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white'
                        />
                      </div>

                      <div className='space-y-1'>
                        <label className='text-[10px] font-bold text-pw-muted uppercase'>Time</label>
                        <input
                          type='time'
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className='w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white'
                        />
                      </div>
                    </div>

                    <div className='flex gap-2 pt-2'>
                      <button
                        onClick={() => setShowScheduleModal(false)}
                        className='flex-1 h-9 rounded-xl border border-white/10 text-xs font-bold text-pw-muted hover:text-white'>
                        Cancel
                      </button>
                      <button
                        onClick={handleSchedulePost}
                        className='flex-1 h-9 rounded-xl btn-primary text-xs font-bold'>
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <Card
                className={cn(
                  'overflow-hidden bg-transparent ring-0 sm:ring-1 w-full p-0 sm:bg-white/[0.02] sm:bkblur sm:rounded-[25px]',
                  isPremiumUI ?
                    'sm:border-pw-warning/20 sm:shadow-[0_0_30px_rgba(255,179,71,0.08)]'
                  : 'sm:border-white/10',
                )}>
                <PlatformEditor
                  onOpenTag={() => setActiveTab('tags')}
                  onOpenMedia={() => setActiveTab('media')}
                />
              </Card>
            </div>

            <div className='divider h-1 my-10 sm:hidden' />
            {/* Tool Tabs */}
            <Card
              className={cn(
                'overflow-hidden ring-0 sm:ring-1 p-0 bg-transparent sm:bg-pw-surface/60',
                isPremiumUI ? 'sm:border-pw-warning/20' : 'sm:border-white/10',
              )}>
              {/* Tab bar */}
              <div className='flex overflow-x-auto scrollable-row pt-3 px-1'>
                {TOOL_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isDisabled = tab.onlineOnly && !state.isOnline;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      title={
                        tab.onlineOnly && !state.isOnline ?
                          "You're offline"
                        : tab.label
                      }
                      onClick={() =>
                        isDisabled ?
                          toast.error(
                            "You're offline - Turn on your internet connection to use this feature",
                          )
                        : setActiveTab(tab.id)
                      }
                      className={cn(
                        'flex items-center gap-1.5 xs:px-2 px-3 lg:px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 shrink-0 transition-all',
                        isActive ?
                          isPremiumUI ? 'border-pw-warning text-pw-warning'
                          : 'border-pw-primary text-pw-primary'
                        : isDisabled ?
                          'border-transparent text-pw-muted/30 cursor-not-allowed'
                        : 'border-transparent text-pw-muted hover:text-pw-text hover:border-white/20',
                      )}>
                      <Icon className='h-3.5 w-3.5' />
                      {tab.label}
                      {tab.onlineOnly && !state.isOnline && (
                        <WifiOff className='h-2.5 w-2.5 text-pw-danger' />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <AnimatePresence mode='wait'>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className='sm:p-4 pt-0'>
                  <ToolPanel activeTab={activeTab} />
                </motion.div>
              </AnimatePresence>
            </Card>
          </div>

          <div className='divider h-1 my-10 sm:hidden' />

          {/* ─── Right: Live Preview + Save ─── */}
          <div className='md:col-span-2 xl:col-span-4 space-y-4'>
            {/* Save preview */}
            <Card
              className={cn(
                'overflow-hidden bg-transparent sm:bg-pw-surface/40 p-0 ring-0 sm:ring-1',
                isPremiumUI ? 'sm:border-pw-warning/20' : 'sm:border-white/10',
              )}>
              <div className='pb-5 sm:p-5 border-b border-white/5'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
                  Live Preview
                </span>
              </div>
              <div className='sm:p-2 lg:p-4 pt-0'>
                <SavePreviewPanel />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
