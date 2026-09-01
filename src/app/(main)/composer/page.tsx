'use client';

import { useState, useEffect } from 'react';
import { ComposerLayout } from '@/components/composer/ComposerLayout';
import { ComposerProvider, useComposer } from '@/lib/composer/useComposerStore';
import { HybridStorage } from '@/lib/storage-utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  PenTool,
  History,
  Plus,
  FileText,
  ArrowLeft,
  Clock,
  Trash2,
  Pen,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function ComposerPageClient() {
  const [posts, setPosts] = useState<any[]>([]);
  const [viewState, setViewState] = useState<'landing' | 'editor'>('landing');
  const { state,dispatch } = useComposer();
  const isPremiumUI = state.isPremium;

  const loadPosts = async () => {
    try {
      const historyItems = await HybridStorage.getAll('composer_history');
      if (Array.isArray(historyItems)) {
        setPosts(historyItems);
      }
    } catch (e) {
      console.error('Failed to load composer history:', e);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDeletePost = async (id: string) => {
    await HybridStorage.delete(id, 'composer_history');
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

    const handleOpenPostInEditor = (post: any) => {
    dispatch({ type: 'SET_BASE_CONTENT', payload: post.content || post.baseContent || '' });
    if (Array.isArray(post.platforms) && post.platforms.length > 0) {
      post.platforms.forEach((p: any) => {
        if (!state.selectedPlatforms.includes(p)) {
          dispatch({ type: 'TOGGLE_PLATFORM', payload: p });
        }
      });
      dispatch({ type: 'SET_ACTIVE_EDITOR_PLATFORM', payload: post.platforms[0] });
    }
    setViewState('editor');
  };

  const handleStartNewPost = () => {
    dispatch({ type: 'SET_BASE_CONTENT', payload: '' });
    setViewState('editor');
  };

  const handleBackToList = () => {
    dispatch({ type: 'SET_BASE_CONTENT', payload: '' });
    loadPosts();
    setViewState('landing');
  };

  const renderPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    switch (p) {
      case 'x':
      case 'twitter':
        return (
          <span key={p} title='X (Twitter)' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white text-[10px] font-bold'>
            𝕏
          </span>
        );
      case 'instagram':
        return (
          <span key={p} title='Instagram' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white text-[9px] font-bold'>
            📷
          </span>
        );
      case 'facebook':
        return (
          <span key={p} title='Facebook' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1877F2] text-white text-[10px] font-bold'>
            f
          </span>
        );
      case 'linkedin':
        return (
          <span key={p} title='LinkedIn' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0A66C2] text-white text-[9px] font-bold'>
            in
          </span>
        );
      case 'youtube':
        return (
          <span key={p} title='YouTube' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FF0000] text-white text-[9px] font-bold'>
            ▶
          </span>
        );
      case 'tiktok':
        return (
          <span key={p} title='TikTok' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-black border border-white/20 text-[#25F4EE] text-[9px] font-bold'>
            ♪
          </span>
        );
      case 'threads':
        return (
          <span key={p} title='Threads' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 text-white text-[10px] font-bold'>
            @
          </span>
        );
      case 'pinterest':
        return (
          <span key={p} title='Pinterest' className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E60023] text-white text-[9px] font-bold'>
            P
          </span>
        );
      default:
        return (
          <span key={p} className='px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-white/5 text-pw-primary border border-white/5'>
            {p}
          </span>
        );
    }
  };

  if (viewState === 'editor') {
    return (
      <div className='relative space-y-2'>
        <div className='container mx-auto p-4 max-w-[1400px] flex items-center justify-between'>
          <Button
            variant='outline'
            onClick={handleBackToList}
            className='h-9 border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-xs font-bold gap-2 text-pw-muted hover:text-white'>
            <ArrowLeft className='h-4 w-4' /> Back to Posts
          </Button>
        </div>
        <ComposerLayout />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'container mx-auto px-4 md:px-6 pt-12 pb-24 max-w-5xl space-y-8 min-h-[calc(100vh-64px)]',
        isPremiumUI &&
          'bg-[radial-gradient(ellipse_80%_50%_at_20%_20%,rgba(255,179,71,0.06)_0%,transparent_60%)]',
      )}>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6'>
        <div>
          <div className='badge mb-3'>
            <PenTool className='h-3.5 w-3.5' /> Social Media Hub
          </div>
          <h1 className='text-3xl sm:text-4xl font-extrabold font-display leading-[1.1] text-white'>
            Social Post{' '}
            <span
              className={cn(
                isPremiumUI ? 'gradient-text-warm' : 'gradient-text',
              )}>
              Composer.
            </span>
          </h1>
          <p className='mt-2 text-pw-muted text-xs sm:text-sm max-w-lg'>
            Craft, schedule, and publish posts to X, Instagram, Facebook, and
            LinkedIn with live AI assistance.
          </p>
        </div>

        <div className='flex items-center gap-3 flex-wrap'>
          {posts.length > 0 && (
          <Link href='/composer/history'>
            <Button
              variant='outline'
              className='h-11 px-5 border-white/10 hover:bg-white/5 text-xs font-bold gap-2 text-pw-primary'>
              <History className='h-4 w-4' /> Full History
            </Button>
          </Link>
          )}

          <Button
            onClick={handleStartNewPost}
            className='btn-primary h-11 px-6 text-sm font-bold gap-2 shadow-xl shadow-pw-primary/20'>
            <Plus className='h-5 w-5' /> Start New Post
          </Button>
        </div>
      </div>

      <div className='divider' />

      {/* Landing View: Empty State vs Recent Posts List */}
      {posts.length === 0 ?
        <div className='p-12 pb-10 text-center bg-[#0c0d1c]/50 bkblur border border-dashed border-white/20 rounded-3xl space-y-6 max-w-2xl mx-auto shadow-2xl'>
          <div className='w-16 h-16 rounded-2xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary flex items-center justify-center mx-auto shadow-inner'>
            <PenTool className='h-8 w-8' />
          </div>
          <div className='space-y-2'>
            <h3 className='text-xl font-bold font-display text-white'>
              No Posts Created Yet
            </h3>
            <p className='text-xs text-pw-muted sm:max-w-md mx-auto leading-relaxed mx-1'>
              You haven&apos;t created or scheduled any social posts yet. Click
              the button below to open the rich multi-platform editor and start
              publishing!
            </p>
          </div>
          <div className='flex items-center justify-center gap-3 flex-wrap'>
            <Button
              onClick={handleStartNewPost}
              className='btn-primary h-11 px-8 text-xs font-bold gap-2'>
              <Pen className='h-4 w-4' /> Start Posting Now
            </Button>
            <Link href='/composer/history'>
              <Button
                variant='outline'
                className='h-11 px-6 border-white/10 hover:bg-white/5 text-xs font-bold gap-2 text-pw-primary'>
                <History className='h-4 w-4' /> View History
              </Button>
            </Link>
          </div>
        </div>
      : <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-bold text-white flex items-center gap-2'>
              <FileText className='h-4 w-4 text-pw-primary' /> Recent Posts (
              {posts.length})
            </h3>
            <Button
              onClick={handleStartNewPost}
              variant='ghost'
              className='h-8 text-xs font-bold text-pw-primary hover:text-white gap-1'>
              <Plus className='h-3.5 w-3.5' /> New Post
            </Button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {posts.map((post) => (
              <Card
                key={post.id}
                className='p-5 bg-[#0c0d1c]/70 bkblur border border-white/5 hover:border-pw-primary/30 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 transition-all group'>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-[10px] font-mono text-pw-muted'>
                    <span className='flex items-center gap-1'>
                      <Clock className='h-3 w-3 text-pw-primary' />
                      {new Date(
                        post.created_at || post.timestamp || Date.now(),
                      ).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div className='flex items-center gap-1.5'>
                      {Array.isArray(post.platforms) &&
                        post.platforms.map((p: string) => renderPlatformIcon(p))}
                    </div>
                  </div>

                  <p className='text-xs text-pw-text leading-relaxed line-clamp-3'>
                    {post.content}
                  </p>
                </div>

                <div className='flex items-center justify-between pt-3 border-t border-white/5'>
                  <Button
                    onClick={() => handleOpenPostInEditor(post)}
                    size='sm'
                    className='btn-primary h-8 px-4 text-xs font-bold'>
                    Open in Editor
                  </Button>
                  <Button
                    onClick={() => handleDeletePost(post.id)}
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 text-pw-muted hover:text-pw-danger'>
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      }
    </div>
  );
}

export default function ComposerPage() {
  return (
    <ComposerProvider>
      <ComposerPageClient />
    </ComposerProvider>
  );
}
