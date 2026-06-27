'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Layout,
  Sparkles,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Download,
  Share2,
  RotateCcw,
  Plus,
  ImageIcon,
  Hash,
  Smile,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Types ---
type Platform = 'twitter' | 'instagram' | 'facebook' | 'linkedin';

interface PostTemplate {
  id: Platform;
  name: string;
  icon: React.ElementType;
  color: string;
  limit: number;
}

const TEMPLATES: PostTemplate[] = [
  {
    id: 'twitter',
    name: 'X / Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    limit: 280,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    limit: 2200,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    limit: 5000,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    limit: 3000,
  },
];

export default function ComposerPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('twitter');
  const [content, setContent] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const currentTemplate = TEMPLATES.find((t) => t.id === selectedPlatform)!;
  const progress = (content.length / currentTemplate.limit) * 100;
  const isOverLimit = content.length > currentTemplate.limit;

  const handleAiRefinement = async () => {
    if (!content) return toast.error('Write something first!');

    setIsAiProcessing(true);
    // Simulate AI call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setContent(content + '\n\n#creator #pingworld #productivity');
    setIsAiProcessing(false);
    toast.success('AI Refinement complete!');
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <PenTool className='h-3.5 w-3.5' />
            Post Composer
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Creator <span className='gradient-text'>Hub.</span>
          </h1>
          <p className='mt-2 text-pw-muted font-medium'>
            Craft the perfect post for any platform with AI-powered refinements.
          </p>
        </div>
        <div className='flex gap-3'>
          <Button
            title='Clear post texts'
            variant='outline'
            onClick={() => setContent('')}
            className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
            <RotateCcw className='h-4 w-4' /> Clear
          </Button>
          <Button
            onClick={handleAiRefinement}
            title={isAiProcessing ? 'AI Refining...' : 'Refine with AI'}
            disabled={isAiProcessing}
            className='btn-primary gap-2 h-11 px-8 relative overflow-hidden group'>
            <div className='absolute inset-0 bg-gradient-to-r from-pw-primary to-pw-secondary opacity-0 group-hover:opacity-20 transition-opacity' />
            <Sparkles
              className={cn('h-4 w-4', isAiProcessing && 'animate-pulse')}
            />
            {isAiProcessing ? 'AI Refining...' : 'Refine with AI'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Editor Side */}
        <div className='lg:col-span-7 space-y-6'>
          <Card className='card-glow p-1 bg-white/5 border-white/10 overflow-hidden'>
            {/* Template Selector */}
            <div className='flex border-b border-white/5'>
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedPlatform(t.id)}
                  className={cn(
                    'flex-1 py-4 flex flex-col items-center gap-2 transition-all relative overflow-hidden',
                    selectedPlatform === t.id ?
                      'text-white'
                    : 'text-pw-muted hover:text-pw-text bg-white/[0.02]',
                  )}>
                  <t.icon
                    className={cn(
                      'h-5 w-5',
                      selectedPlatform === t.id && 'animate-in zoom-in',
                    )}
                    style={{
                      color:
                        selectedPlatform === t.id ? t.color : 'currentColor',
                    }}
                  />
                  <span className='text-[10px] font-bold uppercase tracking-widest'>
                    {t.name.split(' ')[0]}
                  </span>
                  {selectedPlatform === t.id && (
                    <motion.div
                      layoutId='activePlatform'
                      className='absolute bottom-0 left-0 right-0 h-1 bg-pw-primary shadow-[0_0_10px_rgba(92,111,255,0.5)]'
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Main Textarea */}
            <div className='p-8 space-y-6'>
              <div className='relative'>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`What's on your mind for ${currentTemplate.name}?`}
                  className={cn(
                    'w-full h-80 bg-transparent text-xl font-medium placeholder:text-pw-muted/30 focus:outline-none resize-none custom-scrollbar leading-relaxed no-outline border-none',
                    isOverLimit ? 'text-pw-danger' : 'text-pw-text',
                  )}
                />
              </div>

              {/* Character Counter */}
              <div className='flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-white/5'>
                <div className='flex items-center gap-6'>
                  <button className='text-pw-muted hover:text-pw-primary transition-colors flex items-center gap-2'>
                    <ImageIcon className='h-5 w-5' />
                    <span className='text-xs font-bold uppercase tracking-wider'>
                      Media
                    </span>
                  </button>
                  <button className='text-pw-muted hover:text-pw-primary transition-colors flex items-center gap-2'>
                    <Hash className='h-5 w-5' />
                    <span className='text-xs font-bold uppercase tracking-wider'>
                      Tags
                    </span>
                  </button>
                  <button className='text-pw-muted hover:text-pw-primary transition-colors flex items-center gap-2'>
                    <Smile className='h-5 w-5' />
                    <span className='text-xs font-bold uppercase tracking-wider'>
                      Emoji
                    </span>
                  </button>
                </div>
                <div className='flex items-center gap-4'>
                  <div className='w-32 h-1.5 bg-white/5 rounded-full overflow-hidden'>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      className={cn(
                        'h-full transition-colors',
                        isOverLimit ? 'bg-pw-danger' : 'bg-pw-primary',
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-mono font-bold',
                      isOverLimit ? 'text-pw-danger' : 'text-pw-muted',
                    )}>
                    {content.length} / {currentTemplate.limit}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Preview Side */}
        <div className='lg:col-span-5 space-y-6'>
          <Card className='card-glow p-4 md:p-8 bg-pw-surface/50 flex flex-col items-center justify-center'>
            <label className='text-xs font-bold text-pw-muted uppercase tracking-widest pl-2'>
              Live Preview
            </label>
            <motion.div
              key={selectedPlatform}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className='w-full max-w-md bg-white text-slate-900 rounded-2xl p-6 shadow-2xl relative'>
              <div className='flex gap-4 mb-4'>
                <div className='h-12 w-12 rounded-full bg-slate-200 shrink-0' />
                <div className='flex-1 space-y-1'>
                  <div className='h-4 w-1/3 bg-slate-200 rounded' />
                  <div className='h-3 w-1/4 bg-slate-100 rounded' />
                </div>
                <currentTemplate.icon
                  className='h-5 w-5'
                  style={{ color: currentTemplate.color }}
                />
              </div>
              <div className='text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]'>
                {content || (
                  <span className='text-slate-400 italic'>
                    Preview your post here...
                  </span>
                )}
              </div>
              <div className='mt-6 pt-4 border-t border-slate-100 flex justify-between'>
                <div className='h-4 w-1/4 bg-slate-100 rounded' />
                <div className='h-4 w-1/4 bg-slate-100 rounded' />
              </div>
            </motion.div>
          </Card>

          <div className='space-y-4'>
            <h4 className='text-sm font-bold flex items-center gap-2 pl-2'>
              <Layout className='h-4 w-4 text-pw-secondary' /> Smart Suggestions
            </h4>
            <div className='grid grid-cols-1 gap-2'>
              <div className='p-4 rounded-xl bg-white/5 border border-white/5 hover:border-pw-primary/30 transition-all flex items-center justify-between cursor-pointer group'>
                <span className='text-xs font-medium'>
                  Add trending hashtags
                </span>
                <Plus className='h-4 w-4 text-pw-primary opacity-0 group-hover:opacity-100 transition-opacity' />
              </div>
              <div className='p-4 rounded-xl bg-white/5 border border-white/5 hover:border-pw-primary/30 transition-all flex items-center justify-between cursor-pointer group'>
                <span className='text-xs font-medium'>
                  Check readability score
                </span>
                <AlertCircle className='h-4 w-4 text-pw-muted opacity-0 group-hover:opacity-100 transition-opacity' />
              </div>
              <div className='p-4 rounded-xl bg-white/5 border border-white/5 hover:border-pw-primary/30 transition-all flex items-center justify-between cursor-pointer group'>
                <span className='text-xs font-medium'>
                  Schedule for peak engagement
                </span>
                <CheckCircle2 className='h-4 w-4 text-pw-success opacity-0 group-hover:opacity-100 transition-opacity' />
              </div>
            </div>
          </div>

          {/* <div className='flex gap-4'>
            <Button className='btn-primary flex-1 h-12 gap-2 shadow-pw-primary/10 shadow-lg'>
              <Download className='h-5 w-5' /> Download Pack
            </Button>
            <Button
              title='Share'
              variant='outline'
              className='h-12 w-12 border-white/10 hover:bg-white/5'>
              <Share2 className='h-5 w-5' />
            </Button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
