'use client';

// jules edit: Dedicated Post History Page with search, pagination, platform badges, re-post, and copy actions
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  Search,
  Copy,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Sparkles,
  Lock,
  Crown,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useComposer } from '@/lib/composer/useComposerStore';
import { Platform } from '@/lib/composer/types';

interface HistoryItem {
  id: string;
  createdAt: string;
  baseContent: string;
  platforms: Platform[];
  platformContents: Record<string, string>;
  hasMedia: boolean;
  status: 'published' | 'draft' | 'scheduled';
}

export default function DedicatedPostHistoryPage() {
  const { user, isPremium, refresh } = useAppContext();
  const { dispatch } = useComposer();
  const router = useRouter();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Gated limits: Free = 5, Pro = 50
  const historyLimit = isPremium ? 50 : 5;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('composer_history')
            .eq('id', user.id)
            .single();

          if (!error && data?.composer_history && Array.isArray(data.composer_history)) {
            setHistoryItems(data.composer_history.slice(0, historyLimit));
            setLoading(false);
            return;
          }
        }
        // LocalStorage fallback
        const cached = localStorage.getItem('pw_composer_history') || '[]';
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setHistoryItems(parsed.slice(0, historyLimit));
        }
      } catch (err) {
        console.error('Failed to load composer history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, historyLimit]);

  const filteredItems = historyItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.baseContent?.toLowerCase().includes(query) ||
      item.platforms?.some((p) => p.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleRepost = (item: HistoryItem) => {
    dispatch({ type: 'SET_BASE_CONTENT', payload: item.baseContent });
    if (item.platforms && item.platforms.length > 0) {
      item.platforms.forEach((p) => {
        dispatch({ type: 'TOGGLE_PLATFORM', payload: p });
      });
      dispatch({ type: 'SET_ACTIVE_EDITOR_PLATFORM', payload: item.platforms[0] });
    }
    toast.success('Post re-loaded into Composer workspace!');
    router.push('/composer');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Post content copied to clipboard!');
  };

  const handleDeleteItem = async (id: string) => {
    const updated = historyItems.filter((item) => item.id !== id);
    setHistoryItems(updated);

    if (user) {
      await supabase
        .from('profiles')
        .update({ composer_history: updated })
        .eq('id', user.id);
    }
    localStorage.setItem('pw_composer_history', JSON.stringify(updated));
    toast.success('Post removed from history.');
  };

  return (
    <div className='min-h-[calc(100vh-64px)] pb-24 pt-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-8'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <Link
              href='/composer'
              className='inline-flex items-center gap-1.5 text-xs text-pw-muted hover:text-white transition-colors'>
              <ArrowLeft className='h-3.5 w-3.5' /> Back to Composer
            </Link>
          </div>
          <h1 className='text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2'>
            <History className='h-7 w-7 text-pw-primary' /> Dedicated Post History
          </h1>
          <p className='text-xs text-pw-muted mt-1'>
            {isPremium ?
              `Showing up to ${historyLimit} history records for Pro Plan subscribers.`
            : `Free Tier displays up to ${historyLimit} recent posts. Upgrade to Pro for 50 history logs.`}
          </p>
        </div>

        <Link href='/composer'>
          <Button className='btn-primary h-10 px-5 text-xs font-bold gap-2 shadow-lg shadow-pw-primary/20'>
            <Sparkles className='h-4 w-4' /> Open Composer
          </Button>
        </Link>
      </div>

      {/* Search & Stats Bar */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0c0d1c] p-4 rounded-2xl border border-white/10'>
        <div className='relative w-full sm:w-80'>
          <Search className='absolute left-3 top-2.5 h-4 w-4 text-pw-muted' />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder='Search post history content...'
            className='pl-9 h-9 bg-white/5 border-white/10 text-xs text-white rounded-xl focus:border-pw-primary'
          />
        </div>

        <div className='flex items-center gap-3 text-xs text-pw-muted font-mono'>
          <span>
            Total Items: <strong className='text-white'>{filteredItems.length}</strong>
          </span>
          <span>•</span>
          <span>
            Limit: <strong className='text-pw-primary'>{historyLimit} max</strong>
          </span>
        </div>
      </div>

      {/* History Items Grid */}
      {loading ? (
        <div className='py-20 text-center text-pw-muted text-xs font-mono animate-pulse'>
          Loading post history...
        </div>
      ) : paginatedItems.length === 0 ? (
        <Card className='p-12 text-center bg-[#0c0d1c] border-white/10 rounded-2xl space-y-4'>
          <History className='h-12 w-12 text-pw-muted mx-auto' />
          <h3 className='text-base font-bold text-white'>No Post History Found</h3>
          <p className='text-xs text-pw-muted max-w-sm mx-auto'>
            {searchQuery ?
              'No posts matched your search criteria.'
            : 'Posts created or dispatched in the Composer will automatically record here in real-time.'}
          </p>
          <Link href='/composer'>
            <Button className='btn-primary h-9 px-4 text-xs font-bold mt-2'>
              Compose First Post
            </Button>
          </Link>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {paginatedItems.map((item) => (
            <Card
              key={item.id}
              className='p-5 bg-[#0c0d1c] border border-white/10 hover:border-pw-primary/40 rounded-2xl shadow-xl transition-all space-y-4 flex flex-col justify-between'>
              <div className='space-y-3'>
                {/* Header: Date + Platform Badges */}
                <div className='flex items-center justify-between gap-2 flex-wrap'>
                  <span className='text-[10px] text-pw-muted font-mono'>
                    {new Date(item.createdAt).toLocaleString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <div className='flex items-center gap-1.5 flex-wrap'>
                    {item.platforms?.map((p) => (
                      <span
                        key={p}
                        className='text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-pw-primary/10 text-pw-primary border border-pw-primary/20'>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Body Content */}
                <p className='text-xs sm:text-sm text-pw-text leading-relaxed whitespace-pre-wrap line-clamp-4 bg-white/[0.02] p-3 rounded-xl border border-white/5'>
                  {item.baseContent}
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex items-center justify-between pt-3 border-t border-white/5'>
                <div className='flex items-center gap-2'>
                  <Button
                    onClick={() => handleRepost(item)}
                    size='sm'
                    className='btn-primary h-8 px-3 text-[11px] font-bold gap-1.5'>
                    <RotateCcw className='h-3 w-3' /> Re-Post
                  </Button>
                  <Button
                    onClick={() => handleCopyText(item.baseContent)}
                    variant='outline'
                    size='sm'
                    className='h-8 px-3 border-white/10 hover:bg-white/5 text-[11px] font-semibold text-pw-muted hover:text-white gap-1.5'>
                    <Copy className='h-3 w-3' /> Copy
                  </Button>
                </div>

                <Button
                  onClick={() => handleDeleteItem(item.id)}
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-pw-muted hover:text-pw-danger'>
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between pt-4'>
          <span className='text-xs text-pw-muted font-mono'>
            Page {currentPage} of {totalPages}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              variant='outline'
              size='sm'
              className='h-8 px-3 border-white/10 text-xs text-pw-muted hover:text-white'>
              <ChevronLeft className='h-3.5 w-3.5 mr-1' /> Previous
            </Button>
            <Button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              variant='outline'
              size='sm'
              className='h-8 px-3 border-white/10 text-xs text-pw-muted hover:text-white'>
              Next <ChevronRight className='h-3.5 w-3.5 ml-1' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
