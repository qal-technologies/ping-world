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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { Card } from '@/components/ui/card';

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
// jules edit: imported InstagramCanvasSettings styling configuration trigger
import { InstagramCanvasSettings } from './InstagramCanvasSettings';
import { toast } from 'sonner';

type ToolTab =
  | 'tags'
  | 'analysis'
  | 'ai'
  | 'translate'
  | 'ai_context'
  | 'media'
  | 'canvas'
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
  const { state, dispatch } = useComposer();
  const [activeTab, setActiveTab] = useState<ToolTab>('analysis');
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
              <button
                onClick={() =>
                  dispatch({ type: 'SET_PREMIUM', payload: !state.isPremium })
                }
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
              </button>
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
              <div className='h-12 bg-transparent w-full items-center justify-end flex'>
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

              {/* jules edit: Added Instagram Canvas configuration trigger for auto text-to-canvas rendering */}
              <InstagramCanvasSettings />

              <Card
                className={cn(
                  'overflow-hidden w-full p-0 bg-white/[0.02] bkblur rounded-[25px]',
                  isPremiumUI ?
                    'border-pw-warning/20 shadow-[0_0_30px_rgba(255,179,71,0.08)]'
                  : 'border-white/10',
                )}>
                <PlatformEditor
                  onOpenTag={() => setActiveTab('tags')}
                  onOpenMedia={() => setActiveTab('media')}
                />
              </Card>
            </div>
            {/* Tool Tabs */}
            <Card
              className={cn(
                'overflow-hidden p-0 bg-pw-surface/60',
                isPremiumUI ? 'border-pw-warning/20' : 'border-white/10',
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
                  className='p-4 pt-0'>
                  <ToolPanel activeTab={activeTab} />
                </motion.div>
              </AnimatePresence>
            </Card>
          </div>

          {/* ─── Right: Live Preview + Save ─── */}
          <div className='md:col-span-2 xl:col-span-4 space-y-4'>
            <Card
              className={cn(
                'overflow-hidden bg-pw-surface/40 p-0 hidden',
                isPremiumUI ? 'border-pw-warning/20' : 'border-white/10',
              )}>
              {/* Preview header */}
              <div className='flex items-center justify-between p-5 border-b border-white/5'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-pw-success animate-pulse' />
                  <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
                    Live Preview
                  </span>
                </div>
                <button
                  onClick={() => setRightCollapsed((v) => !v)}
                  className='text-pw-muted hover:text-pw-text transition-colors p-1'>
                  {rightCollapsed ?
                    <ChevronDown className='h-3.5 w-3.5' />
                  : <ChevronUp className='h-3.5 w-3.5' />}
                </button>
              </div>

              <AnimatePresence>
                {!rightCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className='overflow-hidden'>
                    <div className='p-3 lg:p-5 pt-0'>
                      <LivePreview />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Save preview */}
            <Card
              className={cn(
                'overflow-hidden bg-pw-surface/40 p-0',
                isPremiumUI ? 'border-pw-warning/20' : 'border-white/10',
              )}>
              <div className='p-5 border-b border-white/5'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
                  Live Preview
                </span>
              </div>
              <div className='p-3 lg:p-5 pt-0'>
                <SavePreviewPanel />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
