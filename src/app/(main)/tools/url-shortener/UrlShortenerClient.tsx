'use client';

import {useState, useEffect} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link as LinkIcon,
  Scissors,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Zap,
  BarChart3,
  Calendar,
  MousePointer2,
  Trash2,
  Globe,
  Lock,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { HybridStorage } from '@/lib/storage-utils';
import { useAppContext } from '@/context/AppContext';
import { formatDate } from '@/lib/utils';

interface ClickLog {
  clicked_at: string;
  country: string;
  city: string;
  referrer: string;
  userAgent: string;
}

interface ShortLink {
  id: string;
  original_url: string;
  clicks: number;
  clicks_data?: ClickLog[];
  expires_at?: string;
  created_at: string;
}

export default function UrlShortenerPage() {
  const { user, isPremium, premiumTier } = useAppContext();
  const [url, setUrl] = useState('');
  const [customSuffix, setCustomSuffix] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const [isShortening, setIsShortening] = useState(false);
  const [result, setResult] = useState<ShortLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [linksList, setLinksList] = useState<ShortLink[]>([]);
  const [selectedLinkAnalytics, setSelectedLinkAnalytics] =
    useState<ShortLink | null>(null);

  // Load user's links via HybridStorage
  const fetchUserLinks = async () => {
    try {
      const initial = await HybridStorage.getAll('link', (fresh) => {
        setLinksList(fresh || []);
      });
      setLinksList(initial || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsShortening(true);

    const linkId =
      customSuffix.trim() ?
        customSuffix.trim().replace(/[^a-zA-Z0-9-_]/g, '')
      : Math.random().toString(36).substring(2, 8);

    // Validate custom suffix (premium only check)
    if (customSuffix.trim() && !isPremium) {
      setIsShortening(false);
      return toast.error(
        'Custom link aliases are exclusive to Premium users! Please upgrade to continue.',
      );
    }

    let expiresAt: string | null = null;
    if (expiryDays) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(expiryDays));
      expiresAt = date.toISOString();
    }

    const newLink: ShortLink = {
      id: linkId,
      original_url: targetUrl,
      clicks: 0,
      clicks_data: [],
      expires_at: expiresAt || undefined,
      created_at: new Date().toISOString(),
    };

    try {
      await HybridStorage.save(
        linkId,
        {
          id: linkId,
          creator_id: user?.id || 'anon',
          original_url: targetUrl,
          originalUrl: targetUrl,
          expires_at: expiresAt,
          clicks: 0,
          clicks_data: [],
          created_at: new Date().toISOString(),
        },
        'link',
      );

      setResult(newLink);
      fetchUserLinks();
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.info('Saved locally - will sync when back online');
      } else {
        toast.success('Link shortened successfully!');
      }
    } catch (err: any) {
      toast.error('Failed to shorten link: ' + (err.message || err));
    } finally {
      setIsShortening(false);
      setUrl('');
      setCustomSuffix('');
      setExpiryDays('');
    }
  };

  const copyToClipboard = (shortId: string) => {
    const domain =
      typeof window !== 'undefined' ? window.location.origin : 'pingworld.site';
    const shortUrl = `${domain}/s/${shortId}`;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success('Redirection link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      await HybridStorage.delete(id, 'link');
      toast.success('Short link removed.');
      if (selectedLinkAnalytics?.id === id) {
        setSelectedLinkAnalytics(null);
      }
      fetchUserLinks();
    } catch {
      toast.error('Failed to delete short link.');
    }
  };

  // Helper to format date nicely (dayName, day, month, year)
  const formatNiceDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-6xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col items-center text-center mb-12'>
        <div className='badge mb-4'>
          <LinkIcon className='h-3.5 w-3.5' />
          Link Workspace
        </div>
        <h1 className='text-4xl md:text-5xl font-extrabold font-display leading-[1.1] mb-4'>
          URL <span className='gradient-text'>Shortener & Analytics.</span>
        </h1>
        <p className='max-w-xl text-pw-muted text-sm leading-relaxed'>
          Transform long, complex URLs into neat redirection links. Monitor
          click performance, and analyze referrer networks.
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Creator Panel */}
        <div className='lg:col-span-5 space-y-6'>
          <Card className='card-glow p-6 space-y-4'>
            <h3 className='font-bold text-md border-b border-white/5 pb-2'>
              Create Branded Link
            </h3>
            <form
              onSubmit={handleShorten}
              className='space-y-4'>
              <div className='space-y-1.5'>
                <label className='text-xs font-bold text-pw-muted uppercase'>
                  Destination URL
                </label>
                <div className='relative'>
                  <LinkIcon className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pw-muted' />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder='https://your-long-website-link.com'
                    className='pl-10 h-11 bg-white/5 border-white/10 text-xs focus:border-pw-primary rounded-xl'
                    disabled={isShortening}
                    required
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <label className='text-xs font-bold text-pw-muted uppercase flex items-center gap-1'>
                    Custom Alias
                    {!isPremium && <Crown className='h-3 w-3 text-amber-500' />}
                  </label>
                  <Input
                    value={customSuffix}
                    onChange={(e) => setCustomSuffix(e.target.value)}
                    placeholder='e.g., promo'
                    className='h-11 bg-white/5 border-white/10 text-xs focus:border-pw-primary rounded-xl'
                    disabled={isShortening}
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-xs font-bold text-pw-muted uppercase'>
                    Expiry (Days)
                  </label>
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    className='w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-xs focus:outline-none focus:border-pw-primary text-pw-muted'>
                    <option
                      value=''
                      className='bg-[#0A0C1B]'>
                      Never Expire
                    </option>
                    <option
                      value='1'
                      className='bg-[#0A0C1B]'>
                      1 Day
                    </option>
                    <option
                      value='7'
                      className='bg-[#0A0C1B]'>
                      7 Days
                    </option>
                    <option
                      value='30'
                      className='bg-[#0A0C1B]'>
                      30 Days
                    </option>
                  </select>
                </div>
              </div>

              <Button
                type='submit'
                disabled={isShortening || !url}
                className='btn-primary h-11 w-full rounded-xl font-bold gap-2'>
                {isShortening ?
                  <div className='h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                : <>
                    <Scissors className='h-4 w-4' /> Shorten Link
                  </>
                }
              </Button>
            </form>
          </Card>

          {/* Quick Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}>
                <Card className='p-6 border-pw-primary/20 bg-pw-primary/5 space-y-4'>
                  <div>
                    <h4 className='text-xs font-bold text-pw-primary uppercase tracking-widest'>
                      Redirection URL
                    </h4>
                    <div className='flex items-center gap-2 mt-2 bg-black/40 p-3 rounded-xl border border-pw-primary/20'>
                      <span className='text-sm font-bold text-white truncate flex-1 font-mono'>
                        {typeof window !== 'undefined' ?
                          window.location.origin
                        : 'pingworld.site'}
                        /s/{result.id}
                      </span>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => copyToClipboard(result.id)}
                        className='h-8 w-8 text-pw-primary hover:bg-pw-primary/10'>
                        {copied ?
                          <Check className='h-4 w-4' />
                        : <Copy className='h-4 w-4' />}
                      </Button>
                    </div>
                  </div>

                  <div className='flex items-center justify-center p-3 bg-white rounded-xl shadow-inner max-w-fit mx-auto'>
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'pingworld.site'}/s/${result.id}`}
                      size={100}
                    />
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Links List & Analytics */}
        <div className='lg:col-span-7 space-y-6'>
          <Card className='card-glow p-6 space-y-4'>
            <div className='flex justify-between items-center border-b border-white/5 pb-2'>
              <h3 className='font-bold text-md'>Your Shortened Links</h3>
              <span className='text-xs font-mono text-pw-muted'>
                {linksList.length} total
              </span>
            </div>

            <div className='space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar'>
              {linksList.map((link) => (
                <div
                  key={link.id}
                  onClick={() => setSelectedLinkAnalytics(link)}
                  className={`p-3.5 rounded-xl border border-white/5 hover:border-pw-primary/20 cursor-pointer transition-all flex items-center justify-between ${
                    selectedLinkAnalytics?.id === link.id ?
                      'bg-pw-primary/5 border-pw-primary/30'
                    : 'bg-white/[0.01]'
                  }`}>
                  <div className='space-y-1 max-w-[80%]'>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold text-sm text-white font-mono'>
                        /s/{link.id}
                      </span>
                      <span
                        className='text-[10px] text-pw-muted truncate max-w-xs'
                        title={link.original_url}>
                        &rarr; {link.original_url}
                      </span>
                    </div>
                    <p className='text-[10px] text-pw-muted'>
                      Created: {formatNiceDate(link.created_at)}
                    </p>
                  </div>
                  <div className='flex items-center gap-2.5'>
                    <span className='text-xs font-mono font-bold text-pw-primary bg-pw-primary/10 px-2.5 py-1 rounded-lg'>
                      {link.clicks || 0} clicks
                    </span>
                    <Button
                      size='icon'
                      variant='ghost'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(link.id);
                      }}
                      className='h-8 w-8 text-pw-muted hover:text-pw-danger'>
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                </div>
              ))}

              {linksList.length === 0 && (
                <p className='text-center py-10 text-xs text-pw-muted'>
                  No shortened links created yet. Paste a link above to get
                  started!
                </p>
              )}
            </div>
          </Card>

          {/* Analytics Detail Drawer / Card */}
          {selectedLinkAnalytics && (
            <Card className='card-glow p-6 space-y-6'>
              <div className='flex justify-between items-start border-b border-white/5 pb-2'>
                <div>
                  <h4 className='font-bold text-sm text-pw-primary'>
                    Redirection Analytics: /s/{selectedLinkAnalytics.id}
                  </h4>
                  <p className='text-xs text-pw-muted mt-1 truncate max-w-lg'>
                    Target: {selectedLinkAnalytics.original_url}
                  </p>
                </div>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => copyToClipboard(selectedLinkAnalytics.id)}
                  className='h-8 text-[11px] gap-1'>
                  <Share2 className='h-3 w-3' /> Share
                </Button>
              </div>

              {/* Top stats summary */}
              <div className='grid grid-cols-3 gap-4'>
                <div className='bg-white/5 border border-white/5 p-4 rounded-xl text-center'>
                  <span className='text-pw-muted text-[10px] uppercase font-bold block mb-1'>
                    Total Clicks
                  </span>
                  <span className='text-lg font-bold font-mono text-pw-primary'>
                    {selectedLinkAnalytics.clicks || 0}
                  </span>
                </div>
                <div className='bg-white/5 border border-white/5 p-4 rounded-xl text-center relative overflow-hidden group'>
                  <span className='text-pw-muted text-[10px] uppercase font-bold block mb-1'>
                    Primary Region
                  </span>
                  {isPremium ?
                    <span className='text-sm font-bold truncate block'>
                      {selectedLinkAnalytics.clicks_data?.[0]?.country || 'N/A'}
                    </span>
                  : <div className='flex flex-col items-center justify-center gap-0.5 mt-0.5'>
                      <Crown className='h-3.5 w-3.5 text-amber-500' />
                      <span className='text-[9px] text-amber-500 font-bold'>
                        PRO
                      </span>
                    </div>
                  }
                </div>
                <div className='bg-white/5 border border-white/5 p-4 rounded-xl text-center relative overflow-hidden group'>
                  <span className='text-pw-muted text-[10px] uppercase font-bold block mb-1'>
                    Best Referrer
                  </span>
                  {isPremium ?
                    <span className='text-sm font-bold truncate block'>
                      {selectedLinkAnalytics.clicks_data?.[0]?.referrer ||
                        'N/A'}
                    </span>
                  : <div className='flex flex-col items-center justify-center gap-0.5 mt-0.5'>
                      <Crown className='h-3.5 w-3.5 text-amber-500' />
                      <span className='text-[9px] text-amber-500 font-bold'>
                        PRO
                      </span>
                    </div>
                  }
                </div>
              </div>

              {/* Detailed Click History Table (Premium Only) */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-bold text-pw-muted uppercase'>
                    Geographic Click Logs
                  </h4>
                  {!isPremium && (
                    <span className='badge-premium flex items-center gap-1 text-[9px]'>
                      <Crown className='h-2.5 w-2.5' /> Premium Only
                    </span>
                  )}
                </div>

                {isPremium ?
                  <div className='bg-black/30 border border-white/5 rounded-xl overflow-hidden text-xs max-h-52 overflow-y-auto custom-scrollbar'>
                    <table className='w-full text-left border-collapse'>
                      <thead>
                        <tr className='bg-white/5 text-pw-muted font-bold font-mono uppercase tracking-wider text-[10px] border-b border-white/5'>
                          <th className='p-2.5'>Time</th>
                          <th className='p-2.5'>Country</th>
                          <th className='p-2.5'>Referrer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          selectedLinkAnalytics.clicks_data &&
                          selectedLinkAnalytics.clicks_data.length > 0
                        ) ?
                          selectedLinkAnalytics.clicks_data.map(
                            (click, idx) => (
                              <tr
                                key={idx}
                                className='border-b border-white/5 last:border-0 hover:bg-white/[0.02]'>
                                <td className='p-2.5 font-mono text-[11px]'>
                                  {formatNiceDate(click.clicked_at)}
                                </td>
                                <td className='p-2.5 flex items-center gap-1.5'>
                                  <Globe className='h-3.5 w-3.5 text-pw-primary' />
                                  <span>
                                    {click.country} ({click.city})
                                  </span>
                                </td>
                                <td
                                  className='p-2.5 text-pw-muted truncate max-w-[120px]'
                                  title={click.referrer}>
                                  {click.referrer}
                                </td>
                              </tr>
                            ),
                          )
                        : <tr>
                            <td
                              colSpan={3}
                              className='p-8 text-center text-pw-muted text-xs'>
                              No clicks recorded yet.
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                : <div className='relative rounded-xl border border-white/5 bg-white/[0.01] p-6 text-center space-y-3 overflow-hidden'>
                    {/* Blurred mock logs backdrop */}
                    <div className='absolute inset-0 blur-[5px] opacity-20 pointer-events-none select-none flex flex-col justify-around p-4'>
                      <div className='h-4 bg-white/20 rounded w-full' />
                      <div className='h-4 bg-white/20 rounded w-[85%]' />
                      <div className='h-4 bg-white/20 rounded w-[90%]' />
                    </div>

                    <div className='relative z-10 space-y-2 flex flex-col items-center'>
                      <div className='h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-1'>
                        <Crown className='h-4.5 w-4.5 text-amber-500' />
                      </div>
                      <p className='text-xs font-bold text-white'>
                        Unlock Geographic & Referrer Logs
                      </p>
                      <p className='text-[10px] text-pw-muted max-w-sm mx-auto leading-relaxed'>
                        Standard, Pro, and Flexible plan accounts unlock
                        complete visitor details including precise geographical
                        locations, referrers, and device breakdowns.
                      </p>
                      <Button
                        onClick={() => (window.location.href = '/pricing')}
                        className='btn-premium h-8 text-[11px] px-4 rounded-full font-bold'>
                        Upgrade to Premium
                      </Button>
                    </div>
                  </div>
                }
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
