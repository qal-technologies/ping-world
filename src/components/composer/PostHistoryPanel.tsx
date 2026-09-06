'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Edit3, Trash2, LogIn, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { useComposer } from '@/lib/composer/useComposerStore';
import { supabase } from '@/lib/supabase';
import { HybridStorage } from '@/lib/storage-utils';
import { toast } from 'sonner';
import { PLATFORMS } from '@/lib/composer/constants';
import type { Platform } from '@/lib/composer/types';

interface HistoryItem {
  id: string;
  content: string;
  platforms: Platform[];
  created_at: string;
}

export function PostHistoryPanel() {
  const { user, isLoggedIn, dispatch, state } = useComposer();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // jules edit: Load history from HybridStorage as primary source
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const hybridList = await HybridStorage.getAll('composer_history');
      if (Array.isArray(hybridList) && hybridList.length > 0) {
        setHistory(hybridList as HistoryItem[]);
        setLoading(false);
        return;
      }

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('composer_history')
          .eq('id', user.id)
          .single();

        if (!error && profile?.composer_history && Array.isArray(profile.composer_history)) {
          setHistory(profile.composer_history);
        } else {
          setHistory([]);
        }
      } else {
        const cached = localStorage.getItem('pw_composer_history') || '[]';
        setHistory(JSON.parse(cached));
      }
    } catch (e) {
      console.error('Error fetching post history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleEdit = (item: HistoryItem) => {
    dispatch({ type: 'SET_BASE_CONTENT', payload: item.content });
    // Reset selected platforms to match history item
    item.platforms.forEach((p) => {
      if (!state.selectedPlatforms.includes(p)) {
        dispatch({ type: 'TOGGLE_PLATFORM', payload: p });
      }
    });
    toast.success('Post loaded into Editor for revising!');
  };

  const handleDelete = async (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);

    if (user) {
      await supabase
        .from('profiles')
        .update({ composer_history: updated })
        .eq('id', user.id);
    } else {
      localStorage.setItem('pw_composer_history', JSON.stringify(updated));
    }
    toast.success('Post removed from history');
  };

  if (!isLoggedIn) {
    return (
      <div className='p-4 rounded-2xl bg-pw-surface/40 border border-white/10 text-center space-y-3'>
        <div className='w-10 h-10 rounded-full bg-pw-primary/10 text-pw-primary flex items-center justify-center mx-auto'>
          <LogIn className='h-5 w-5' />
        </div>
        <div>
          <h4 className='text-sm font-bold text-pw-text'>Logged-In Feature Only</h4>
          <p className='text-xs text-pw-muted mt-1'>
            Sign in to view your post history, edit previously published posts, and sync drafts across devices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <History className='h-4 w-4 text-pw-primary' />
          <h3 className='text-sm font-bold text-pw-text'>Previously Made Posts</h3>
        </div>
        <div className='flex items-center gap-2'>
          <Link
            href='/composer/history'
            className='flex items-center gap-1 text-[11px] font-bold text-pw-primary hover:underline'
            title='View Dedicated Post History Page'>
            <span>Full Page</span>
            <ExternalLink className='h-3 w-3' />
          </Link>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className='p-1 text-pw-muted hover:text-pw-text transition-colors'
            title='Refresh history'>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <p className='text-xs text-pw-muted/60 italic text-center py-4'>
          No previous posts recorded yet. Create and publish a post to build history!
        </p>
      ) : (
        <div className='space-y-2.5 max-h-[320px] overflow-y-auto pr-1'>
          {history.map((item, idx) => (
            <div
              key={item.id + idx}
              className='p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all space-y-2 group'>
              <div className='flex items-center justify-between text-[10px] text-pw-muted'>
                <div className='flex items-center gap-1.5'>
                  <Clock className='h-3 w-3' />
                  <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className='flex items-center gap-1'>
                  {item.platforms.map((p, idx) => {
                    const meta = PLATFORMS.find((pl) => pl.id === p);
                    return (
                      <span
                        key={p + idx}
                        className='px-1.5 py-0.5 rounded text-[8px] font-bold uppercase'
                        style={{ backgroundColor: `${meta?.iconHex || '#888'}20`, color: meta?.iconHex || '#888' }}>
                        {p}
                      </span>
                    );
                  })}
                </div>
              </div>

              <p className='text-xs text-pw-text line-clamp-2 leading-relaxed'>
                {item.content}
              </p>

              <div className='flex items-center justify-end gap-2 pt-1 border-t border-white/5 opacity-80 group-hover:opacity-100 transition-opacity'>
                <button
                  onClick={() => handleEdit(item)}
                  className='flex items-center gap-1 px-2 py-1 rounded bg-pw-primary/10 text-pw-primary text-[10px] font-semibold hover:bg-pw-primary/20 transition-colors'>
                  <Edit3 className='h-3 w-3' /> Edit Post
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className='p-1 text-pw-muted hover:text-pw-danger transition-colors'
                  title='Delete post history item'>
                  <Trash2 className='h-3 w-3' />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
