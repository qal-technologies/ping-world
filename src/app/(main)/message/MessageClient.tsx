'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Globe,
  Clock,
  Unlock,
  Lock,
  Trash2,
  Copy,
  Check,
  Settings2,
  Sparkles,
  Inbox,
  CornerDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { HybridStorage } from '@/lib/storage-utils';
import { supabase } from '@/lib/supabase';

interface MessageRow {
  id: string;
  content: string;
  isSeen: boolean;
  timestamp: string;
  expires_at?: string;
  sender_country?: string;
  sender_timezone?: string;
  pre_reply?: string;
}

import { useAppContext } from '@/context/AppContext';

export default function MessageLandingPage() {
  const { premiumTier, isOnline, user, isFeatureUnlocked } = useAppContext();
  // jules edit: Secure tool-specific flexible plan gating for Anonymous Link Messages
  const isPremium = isFeatureUnlocked('anonlink');
  const [activeTab, setActiveTab] = useState<'inbox' | 'settings'>('inbox');
  const [username, setUsername] = useState('creator');
  const [linkId, setLinkId] = useState('');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [isPublicInbox, setIsPublicInbox] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  // const [selectedReplies, setSelectedReplies] = useState<string[]>([
  //   '💜 I felt this deeply',
  //   '😭 Why did you wait this long?',
  //   '😂 I needed to hear this',
  //   '🤐 This stays between us',
  //   '🫣 I always knew...',
  //   "👀 Say more. I'm listening.",
  // ]);
  const [messageTitle, setMessageTitle] = useState('');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [copiedLink, setCopiedLink] = useState<'inbox' | 'public' | null>(null);

  const [loading, setLoading] = useState(false);

  // Load username & messages
  useEffect(() => {
    const fetchUserAndMessages = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let userId = '';
        if (user) {
          userId = user.id;

          const { data: profile } = await supabase
            .from('profiles')
            .select(
              'username, display_name, is_public_inbox, custom_question, custom_link_id, message_expiry_days',
            )
            .eq('id', user.id)
            .single();

          if (profile) {
            setUsername(profile.username || 'creator');
            setIsPublicInbox(!!profile.is_public_inbox);
            setMessageTitle(profile.custom_question || '');
            setLinkId(profile.custom_link_id || '');
            if (profile.message_expiry_days) {
              setExpiryDays(profile.message_expiry_days);
            }
          } else {
            const name =
              user.user_metadata.username ||
              user.user_metadata.full_name ||
              'creator';
            setUsername(name);
          }
        }

        if (!userId) return;

        const formatMsgs = (list: any[]): MessageRow[] =>
          (list || []).map((m: any) => ({
            id: m.id,
            content: m.content || '',
            isSeen: !!(m.is_seen || m.isSeen),
            timestamp: m.created_at || m.timestamp || new Date().toISOString(),
            expires_at: m.expires_at,
            sender_country: m.sender_country || 'Unknown',
            sender_timezone: m.sender_timezone || 'Local',
            pre_reply: m.pre_reply,
          }));

        // Fetch messages via HybridStorage (instant local + background sync)
        const initial = await HybridStorage.getAll('message', (fresh) => {
          setMessages(formatMsgs(fresh));
        });
        setMessages(formatMsgs(initial));
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndMessages();
  }, []);

  const handleCopy = (type: 'inbox' | 'public') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path =
      type === 'inbox' ? `/u/${username}` : `/u/${username}/messages`;
    navigator.clipboard.writeText(`${origin}${path}`);
    setCopiedLink(type);
    toast.success(
      `${type === 'inbox' ? 'Inbox input' : 'Public board'} link copied!`,
    );
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const saveInboxSettings = async () => {
    if (!username) {
      toast.error('You must be logged in to configure your inbox.');
      return;
    }

    setSavingSettings(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Update profiles table with verified columns
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          custom_question: messageTitle.trim() || null,
          message_expiry_days: expiryDays,
          is_public_inbox: isPublicInbox,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Persist custom link ID into user auth metadata & local storage
      await supabase.auth.updateUser({
        data: { custom_link_id: linkId.trim() || null },
      });
      localStorage.setItem('pw_anon_custom_link_id', linkId.trim());

      toast.success('Inbox configurations saved successfully!');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save configurations: ' + (err.message || err));
    } finally {
      setSavingSettings(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const target = messages.find((m) => m.id === id);
      if (target) {
        await HybridStorage.save(
          id,
          { ...target, isSeen: true, is_seen: true },
          'message',
        );
      }
      setMessages(
        messages.map((m) => (m.id === id ? { ...m, isSeen: true } : m)),
      );
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await HybridStorage.delete(id, 'message');
      setMessages(messages.filter((m) => m.id !== id));
      toast.success('Secret message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handleStaticTogglePremium = () => {
    if (!isPremium) {
      toast.info(
        '⭐ Premium Upgrade Required: Public boards require a paid subscription (Flexible, Standard, or Pro).',
      );
      return;
    }

    setIsPublicInbox((prev) => !prev);
  };

  return (
    <div className='relative overflow-hidden min-h-[calc(100vh-64px)] pb-20'>
      {/* Background decoration */}
      <div className='orb orb-primary w-[500px] h-[500px] -top-40 -right-40 opacity-20' />
      <div className='orb orb-secondary w-[400px] h-[400px] bottom-0 -left-20 opacity-15' />

      <div className='container relative mx-auto px-6 sm:px-8 pt-12 max-w-7xl'>
        {/* Header Section */}
        <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 flex-wrap'>
          <div>
            <div className='badge border-pw-primary/20 bg-pw-primary/10 text-pw-primary mb-3'>
              <MessageCircle className='h-3.5 w-3.5' />
              Engagement
            </div>
            <h1 className='text-3xl sm:text-4xl font-extrabold font-display leading-[1.1]'>
              Private <span className='gradient-text'>messaging.</span>
            </h1>
            <p className='mt-2 text-sm text-pw-muted'>
              Configure and receive anonymous messages, with expiry timeframe,
              customize link id, custom questions and monitor incoming anonymous
              messages in real-time.
            </p>
          </div>

          <div
            className='flex bg-white/5 rounded-2xl border border-white/5 bkblur-sm'
            style={{ maxWidth: 'max-content', minWidth: 'max-content' }}>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all ${activeTab === 'inbox' ? 'bg-pw-primary text-white' : 'text-pw-muted hover:text-pw-text'}`}>
              <Inbox className='h-5 w-5' /> Message Board
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-pw-primary text-white' : 'text-pw-muted hover:text-pw-text'}`}>
              <Settings2 className='h-5 w-5' /> Link Config
            </button>
          </div>
        </div>

        <div className='divider mb-8' />

        {/* Tab Content */}
        <AnimatePresence mode='wait'>
          {activeTab === 'inbox' ?
            <motion.div
              key='inbox-tab'
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
              {/* Message Cards */}
              <div className='lg:col-span-8 space-y-6'>
                {loading ?
                  <div className='space-y-4'>
                    {[1, 2, 3].map((n) => (
                      <Card
                        key={n}
                        className='p-6 bg-pw-surface/40 border-white/5 animate-pulse relative overflow-hidden'>
                        <div className='flex items-center justify-between gap-4 border-b border-white/5 pb-3 mb-4'>
                          <div className='h-4 bg-white/5 rounded w-1/4' />
                          <div className='h-4 bg-white/5 rounded w-1/6' />
                        </div>
                        <div className='h-6 bg-white/5 rounded w-3/4 mb-3' />
                        <div className='h-4 bg-white/5 rounded w-1/2' />
                      </Card>
                    ))}
                  </div>
                : messages.length === 0 ?
                  <Card className='card-glow p-12 text-center flex flex-col items-center justify-center min-h-[300px]'>
                    <div className='w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6'>
                      <Inbox className='h-8 w-8 text-pw-muted animate-pulse' />
                    </div>
                    <h3 className='text-lg font-bold'>Your inbox is empty</h3>
                    <p className='text-xs text-pw-muted mt-2 max-w-sm'>
                      Share your secure anonymous link with your audience to
                      start receiving submissions.
                    </p>
                    <Button
                      onClick={() => setActiveTab('settings')}
                      className='btn-primary mt-6 text-xs h-10 px-6 font-bold'>
                      Set Up Links
                    </Button>
                  </Card>
                : <div className='space-y-4'>
                    {messages.map((msg) => (
                      <Card
                        key={msg.id}
                        className='p-6 bg-pw-surface/40 hover:bg-pw-surface/75 border-white/5 transition-all relative overflow-hidden group'>
                        {/* Meta Row */}
                        <div className='flex items-center justify-between gap-4 text-[10px] text-pw-muted font-mono mb-4 border-b border-white/5 pb-3'>
                          <div className='flex flex-wrap items-center gap-3'>
                            <span className='flex items-center gap-1.5 font-bold text-pw-primary border border-pw-primary/20 bg-pw-primary/10 rounded px-2 py-1'>
                              {msg.sender_country &&
                                msg.sender_country !== 'Unknown' ? (
                                  <img
                                    src={`https://flagcdn.com/w20/${msg.sender_country.toLowerCase()}.png`}
                                    alt={msg.sender_country}
                                    className="w-4 h-3 object-cover rounded-sm border border-white/10 shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : null}
                              {msg.sender_country || 'Unknown'}
                            </span>
                            <span className='flex items-center gap-1'>
                              <Clock className='h-3 w-3' />{' '}
                              {msg.sender_timezone}
                            </span>
                            {msg.expires_at && (
                              <span className='hidden sm:inline-flex items-center gap-1 text-pw-warning'>
                                Expires:{' '}
                                {new Date(msg.expires_at).toLocaleDateString()}
                              </span>
                            )}
                            {!msg.isSeen && (
                              <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white bg-pw-secondary/80 font-bold'>
                                NEW
                              </span>
                            )}
                          </div>

                          <div className='flex items-center gap-2'>
                            {!msg.isSeen && (
                              <button
                                onClick={() => markAsRead(msg.id)}
                                className='text-pw-success hover:text-pw-success/80 opacity-0 group-hover:opacity-100 transition-opacity p-1 flex items-center gap-1'
                                title='Mark as read'>
                                <Check className='h-3 w-3' />
                                <span className='font-bold uppercase text-[9px]'>
                                  Mark Read
                                </span>
                              </button>
                            )}
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className='text-pw-danger hover:text-pw-danger/80 opacity-0 group-hover:opacity-100 transition-opacity p-1'
                              title='Delete secret message'>
                              <Trash2 className='h-4 w-4' />
                            </button>
                          </div>
                        </div>

                        {/* Content text */}
                        <p className='text-white text-base leading-relaxed break-words font-medium pr-6'>
                          &quot;{msg.content}&quot;
                        </p>

                        {/* Pre-reply tags if available */}
                        {msg.pre_reply && (
                          <div className='mt-4 flex items-center gap-2 text-xs text-pw-success font-bold font-mono'>
                            <CornerDownRight className='h-3 w-3 text-pw-success' />
                            <span>Quick Replied: {msg.pre_reply}</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                }
              </div>

              {/* Sidebar stats/links preview */}
              <div className='lg:col-span-4 flex flex-col gap-6'>
                <Card className='bg-transparent ring-0 sm:ring-1 sm:p-6 space-y-4 sm:bkblur'>
                  <h4 className='text-xs font-bold uppercase tracking-widest text-pw-muted flex items-center gap-2'>
                    <Sparkles className='h-4 w-4 text-pw-primary' /> Active
                    Statistics
                  </h4>
                  <div className='grid grid-cols-2 gap-4 pt-2'>
                    <div className='p-4 bg-white/5 border border-white/5 rounded-xl'>
                      <span className='text-2xl font-bold font-mono'>
                        {messages.length}
                      </span>
                      <p className='text-[10px] text-pw-muted uppercase font-bold mt-1'>
                        Received
                      </p>
                    </div>
                    <div className='p-4 bg-white/5 border border-white/5 rounded-xl'>
                      <span className='text-2xl font-bold font-mono'>
                        {messages.filter((m) => !m.isSeen).length}
                      </span>
                      <p className='text-[10px] text-pw-muted uppercase font-bold mt-1'>
                        Unread
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className='bg-transparent ring-0 sm:ring-1 sm:p-6 space-y-4 sm:bkblur'>
                  <h4 className='text-xs font-bold uppercase tracking-widest text-pw-muted'>
                    Interactive Links
                  </h4>
                  <div className='space-y-3'>
                    <div className='p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between'>
                      <div className='truncate'>
                        <span className='text-[10px] block font-bold text-pw-muted uppercase'>
                          Send Message Link
                        </span>
                        <span className='text-xs font-medium text-pw-primary truncate'>
                          /u/{username}
                        </span>
                      </div>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleCopy('inbox')}
                        className='h-8 w-8 text-pw-muted hover:text-pw-primary'>
                        {copiedLink === 'inbox' ?
                          <Check className='h-4 w-4 text-pw-success' />
                        : <Copy className='h-4 w-4' />}
                      </Button>
                    </div>

                    <div className='p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between'>
                      <div className='truncate'>
                        <span className='text-[10px] block font-bold text-pw-muted uppercase flex items-center gap-1.5'>
                          Public Board Link
                          <span className='text-[8px] bg-amber-500/20 text-amber-500 font-bold border border-amber-500/20 rounded px-1 scale-90'>
                            PRO
                          </span>
                        </span>
                        <span className='text-xs font-medium text-pw-secondary truncate'>
                          /u/{username}/messages
                        </span>
                      </div>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleCopy('public')}
                        className='h-8 w-8 text-pw-muted hover:text-pw-secondary'>
                        {copiedLink === 'public' ?
                          <Check className='h-4 w-4 text-pw-success' />
                        : <Copy className='h-4 w-4' />}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          : <motion.div
              key='settings-tab'
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
              {/* Main settings options */}
              <div className='lg:col-span-8 space-y-6'>
                <Card className='bg-transparent ring-0 sm:ring-1 sm:glass p-1 sm:p-8 space-y-6'>
                  <div>
                    <h3 className='text-lg font-bold mb-1'>
                      Message Lifespan & Expiry
                    </h3>
                    <p className='text-xs text-pw-muted'>
                      Messages automatically disappear from the database after
                      this period.
                    </p>
                  </div>

                  <div className='grid grid-cols-2 md:grid-cols-3 sm:grid-cols-5 gap-3'>
                    {[
                      { l: '24 Hours', v: 1 },
                      { l: '3 Days', v: 3 },
                      { l: '7 Days', v: 7 },
                    ].map((item) => (
                      <button
                        key={item.v}
                        onClick={() => {
                          setExpiryDays(item.v);
                          toast.success(`Expiry length selection updated to ${item.l}!`);
                        }}
                        className={`h-11 px-3 text-xs font-bold rounded-lg border transition-all ${expiryDays === item.v ? 'bg-pw-primary/10 border-pw-primary text-pw-primary' : 'border-white/10 hover:bg-white/5 text-pw-muted'}`}>
                        {item.l}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Pre-reply customization */}
                <Card className='bg-card/20 ring-0 sm:ring-1 sm:bg-card/70 sm:bkblur sm:p-6 sm:p-8 space-y-6 mt-10 sm:mt-0'>
                  <div>
                    <h3 className='text-lg font-bold mb-1'>
                      Inbox Personalization Configurations
                    </h3>
                    <p className='text-xs text-pw-muted'>
                      Customize your anonymous inbox fields, custom questions, and customized URL structures.
                    </p>
                  </div>

                  <div className='flex flex-col gap-1'>
                    <label
                      className='min-w-full font-bold text-pw-text'
                      htmlFor='link-id'>
                      Add Link Id <span className='text-xs'>(optional)</span>
                    </label>
                    <div className='flex gap-2'>
                      <Input
                        id='link-id'
                        value={linkId}
                        onChange={(e) =>
                          setLinkId(e.target.value.toLowerCase())
                        }
                        placeholder='link-id'
                        className='bg-white/5 border-white/10 h-10 text-xs'
                      />
                    </div>
                    <span className='text-[10px] text-pw-muted'>
                      All in small case and no special characters apart from
                      (-){' '}
                    </span>
                  </div>

                  <div className='flex flex-col gap-1'>
                    <label
                      className='min-w-full font-bold text-pw-text'
                      htmlFor='message-title'>
                      Add custom Question{' '}
                      <span className='text-xs'>(optional)</span>
                    </label>
                    <div className='flex gap-2'>
                      <Input
                        id='message-title'
                        value={messageTitle}
                        onChange={(e) => setMessageTitle(e.target.value)}
                        placeholder='Say something...'
                        className='bg-white/5 border-white/10 h-10 text-xs'
                        onKeyDown={(e) => e.key === 'Enter' && saveInboxSettings()}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={saveInboxSettings}
                      disabled={savingSettings}
                      className="btn-primary h-11 px-8 text-xs font-bold gap-2">
                      {savingSettings ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Saving configurations...
                        </>
                      ) : (
                        'Save Inbox Settings'
                      )}
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Sidebar premium control */}
              <div className='lg:col-span-4 flex flex-col gap-6'>
                <Card className='card-glow p-6 space-y-6'>
                  <div className='flex justify-between items-start'>
                    <div>
                      <h4 className='text-sm font-bold uppercase tracking-wider'>
                        Public Board
                      </h4>
                      <p className='text-[11px] text-pw-muted mt-1'>
                        Allows anyone to view a directory page of all messages
                        sent to you.
                      </p>
                    </div>
                    <span className='text-[8px] bg-amber-500/20 text-amber-500 font-bold border border-amber-500/20 rounded px-1.5 py-0.5'>
                      PRO
                    </span>
                  </div>

                  <div className='pt-2 border-t border-white/5 flex items-center justify-between'>
                    <span className='text-xs font-bold text-pw-muted flex items-center gap-1.5 font-mono'>
                      {isPublicInbox ?
                        <Unlock className='h-4 w-4 text-amber-500' />
                      : <Lock className='h-4 w-4' />}
                      {isPublicInbox ?
                        'GUEST READ ALLOWED'
                      : 'LOCKED (PRIVATE)'}
                    </span>
                    <button
                      onClick={handleStaticTogglePremium}
                      className={`w-12 h-6 px-1 rounded-full flex items-center transition-all ${isPublicInbox ? 'bg-amber-500 justify-end' : 'bg-white/10 justify-start'}`}>
                      <span className='w-4 h-4 rounded-full bg-white shadow' />
                    </button>
                  </div>
                </Card>
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </div>
    </div>
  );
}
