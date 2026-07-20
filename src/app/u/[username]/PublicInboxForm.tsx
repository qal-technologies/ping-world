'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Lock,
  Shield,
  Globe,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { COMPANY } from '@/lib/config/company';
import { resolveTier, computeExpiry } from '@/lib/config/premium';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  subscription_tier?: string;
  custom_question?: string;
}

interface Props {
  profile: Profile | null;
  username: string;
}

const PRE_REPLIES = [
  '💜 I felt this deeply',
  '😭 Why did you wait this long?',
  '😂 I needed to hear this',
  '🤐 This stays between us',
  '🫣 I always knew...',
  "👀 Say more. I'm listening.",
  "🙈 I was hoping you'd say that",
  "🔥 You're brave for sending this",
  '💭 Thinking about this now...',
  '🤫 Your secret is safe with me',
];

function getCountryFromLocale(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).region;
    return region ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}

import { AlertTriangle } from 'lucide-react';

export default function PublicInboxForm({ profile, username }: Props) {
  const [message, setMessage] = useState('');
  const [selectedPreReply, setSelectedPreReply] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // jules edit: Offline detection and reactivity
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // jules edit: Safe query string lookup without Next.js build-time suspense bailouts
  const getParam = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get(key);
  };

  const customQuestionQuery = getParam('question');
  const activePromptQuestion = customQuestionQuery || profile?.custom_question;
  const activePromptText = activePromptQuestion ? `"${activePromptQuestion}"` : 'Your identity is completely hidden. Senders will only see your message, nothing else.';

  if (!profile) {
    return (
      <div className='min-h-[calc(100vh-64px)] flex items-center justify-center px-4'>
        <Card className='card-glow p-10 text-center max-w-md w-full'>
          <Shield className='h-12 w-12 text-pw-muted mx-auto mb-4' />
          <h1 className='text-xl font-bold mb-2'>User not found</h1>
          <p className='text-sm text-pw-muted mb-6'>
            The inbox link <strong>@{username}</strong> doesn&apos;t exist or
            has been removed.
          </p>
          <Link href='/'>
            <Button className='btn-primary'>Back to {COMPANY.name}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message before sending.');
      return;
    }
    if (message.trim().length < 3) {
      toast.error('Message is too short.');
      return;
    }
    if (message.trim().length > 1000) {
      toast.error('Message is too long (max 1000 characters).');
      return;
    }

    setIsSending(true);
    try {
      const senderCountry = getCountryFromLocale();
      const tier = resolveTier(profile.subscription_tier);
      const expiresAt = computeExpiry(tier, 7);

      const { error } = await supabase.from('messages').insert({
        recipient_id: profile.id,
        content: message.trim(),
        pre_reply: selectedPreReply || null,
        sender_country: senderCountry,
        is_seen: false,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      setSent(true);
      toast.success('Your anonymous message was delivered!');
    } catch (err) {
      console.error('[PublicInboxForm] send error:', err);
      toast.error('Failed to send your message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <div className='min-h-[calc(100vh-64px)] flex items-center justify-center px-4'>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='text-center max-w-md w-full'>
          <div className='w-20 h-20 rounded-full bg-pw-success/10 border border-pw-success/30 flex items-center justify-center mx-auto mb-6'>
            <CheckCircle2 className='h-10 w-10 text-pw-success' />
          </div>
          <h2 className='text-2xl font-bold mb-3'>Message Sent!</h2>
          <p className='text-sm text-pw-muted mb-8'>
            Your anonymous message was delivered to{' '}
            <strong>@{profile.username}</strong>. They have no idea who sent it.
          </p>
          <div className='flex gap-3 justify-center flex-wrap'>
            <Button
              onClick={() => {
                setSent(false);
                setMessage('');
                setSelectedPreReply('');
              }}
              className='btn-primary text-sm'>
              Send Another
            </Button>
            <Link href='/'>
              <Button
                variant='outline'
                className='text-sm border-white/10'>
                <ArrowLeft className='h-4 w-4 mr-2' /> Back to {COMPANY.name}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='relative min-h-[calc(100vh-64px)] pb-20'>
      <div className='orb orb-primary w-[400px] h-[400px] -top-40 -right-40 opacity-20' />
      <div className='orb orb-secondary w-[300px] h-[300px] bottom-0 -left-20 opacity-15' />

      <div className='container relative mx-auto px-4 sm:px-6 pt-10 sm:pt-14 max-w-xl'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center gap-1.5 badge border-pw-primary/20 bg-pw-primary/10 text-pw-primary mb-4'>
            <Lock className='h-3.5 w-3.5' />
            100% Anonymous
          </div>
          <h1 className='text-3xl sm:text-4xl font-extrabold font-display mb-3'>
            Message <span className='gradient-text'>@{profile.username}</span>
          </h1>
          <p className='text-sm text-pw-muted max-w-sm mx-auto leading-relaxed'>
            {activePromptText}
          </p>
        </div>

        {/* jules edit: Show offline message and disable submission if offline */}
        {!isOnline && (
          <div className='p-4 bg-pw-danger/10 border border-pw-danger/25 rounded-2xl flex items-center gap-3 text-xs text-pw-danger mb-8'>
            <AlertTriangle className='h-5 w-5 shrink-0 text-pw-danger animate-pulse' />
            <p>
              <strong>You are offline.</strong> Sending anonymous messages is temporarily disabled until your internet connection is restored.
            </p>
          </div>
        )}

        {/* Privacy row */}
        <div className='flex flex-wrap items-center justify-center gap-4 text-[11px] text-pw-muted font-mono mb-8'>
          <span className='flex items-center gap-1.5'>
            <Shield className='h-3.5 w-3.5 text-pw-success' /> No login needed
          </span>
          <span className='flex items-center gap-1.5'>
            <Globe className='h-3.5 w-3.5 text-pw-primary' /> No IP stored
          </span>
          <span className='flex items-center gap-1.5'>
            <Lock className='h-3.5 w-3.5 text-pw-warning' /> Expires
            automatically
          </span>
        </div>

        {/* Message card */}
        <Card className='card-glow p-6 sm:p-8 space-y-6'>
          {/* Textarea */}
          <div>
            <label className='text-xs font-bold uppercase tracking-widest text-pw-muted block mb-3'>
              Your anonymous message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={activePromptQuestion ? 'Enter your response...' : 'Say what you always wanted to say...'}
              rows={5}
              maxLength={1000}
              disabled={!isOnline}
              className='w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-pw-text placeholder:text-pw-muted resize-none focus:outline-none focus:border-pw-primary/50 transition-colors leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed'
            />
            <div className='flex justify-end mt-1'>
              <span
                className={`text-[10px] font-mono ${message.length > 900 ? 'text-pw-danger' : 'text-pw-muted'}`}>
                {message.length}/1000
              </span>
            </div>
          </div>

          {/* Pre-reply selector */}
          <div>
            <label className='text-xs font-bold uppercase tracking-widest text-pw-muted block mb-3'>
              Optional reaction (hint for their reply)
            </label>
            <div className='flex flex-wrap gap-2'>
              {PRE_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type='button'
                  onClick={() =>
                    setSelectedPreReply((prev) => (prev === reply ? '' : reply))
                  }
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    selectedPreReply === reply ?
                      'bg-pw-primary/15 border-pw-primary text-pw-primary'
                    : 'border-white/10 bg-white/5 text-pw-muted hover:border-pw-primary/30'
                  }`}>
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim() || !isOnline}
            className='btn-primary w-full h-12 text-sm font-bold gap-2 disabled:opacity-50 disabled:cursor-not-allowed'>
            {isSending ?
              <span className='flex items-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin' />
                Sending securely...
              </span>
            : <>
                <Send className='h-4 w-4' />
                Send Anonymous Message
              </>
            }
          </Button>

          <p className='text-center text-[10px] text-pw-muted'>
            Powered by{' '}
            <Link
              href='/'
              className='text-pw-primary hover:underline'>
              {COMPANY.name}
            </Link>{' '}
            AnonLink ·{' '}
            <Link
              href={COMPANY.legal.privacyUrl}
              className='hover:underline'>
              Privacy Policy
            </Link>
          </p>
        </Card>

        {/* Want your own? */}
        <div className='text-center mt-8'>
          <p className='text-xs text-pw-muted'>
            Want your own anonymous inbox?{' '}
            <Link
              href='/register'
              className='text-pw-primary hover:underline font-medium'>
              Create a free account →
            </Link>
          </p>
        </div>
      </div>

      <AnimatePresence />
    </div>
  );
}
