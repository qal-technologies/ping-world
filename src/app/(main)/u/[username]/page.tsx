'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MessageSquare,
  ShieldCheck,
  User,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { toast } from 'sonner';
import { HybridStorage } from '@/lib/storage-utils';

export default function PublicUserMessagePage({
  params,
}: {
  params: { username: string };
}) {
  const [content, setContent] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!content.trim()) {
      toast.error('Please write something first.');
      return;
    }

    setIsLoading(true);
    // Mimic API delay
    await new Promise((r) => setTimeout(r, 1500));

    // Save to hybrid storage (synchronizes to Supabase if logged in, falls back to local)
    await HybridStorage.save(
      `msg-${Math.random().toString(36).substr(2, 9)}`,
      {
        content,
        isSeen: false,
        timestamp: new Date().toISOString(),
      },
      'message',
    );

    setIsLoading(false);
    setIsSent(true);
    toast.success('Message delivered anonymously!');
  };

  if (isSent) {
    return (
      <div className='container mx-auto px-6 py-32 max-w-2xl text-center'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}>
          <div className='w-20 h-20 bg-pw-success/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-pw-success/20'>
            <CheckCircle2 className='h-10 w-10 text-pw-success' />
          </div>
          <h1 className='text-4xl font-extrabold font-display mb-4'>
            Delivered!
          </h1>
          <p className='text-pw-muted text-lg mb-12'>
            Your anonymous message was sent to{' '}
            <span className='text-pw-text font-bold'>@{params.username}</span>.
            They will never know it was you.
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button
              onClick={() => setIsSent(false)}
              variant='outline'
              className='h-12 border-white/10'>
              Send Another
            </Button>
            <Link
              href='/'
              className='btn-primary h-12 flex items-center px-8'>
              Create Your Own Link
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='relative min-h-screen overflow-hidden bg-pw-bg'>
      {/* Planetary Background */}
      <div className='globe-div fixed inset-0'>
        <div className='globe opacity-30' />
      </div>

      <div className='container relative z-10 mx-auto px-6 py-20 max-w-3xl'>
        <Link
          href='/message'
          className='inline-flex items-center gap-2 text-pw-muted hover:text-pw-primary mb-12 transition-colors'>
          <ArrowLeft className='h-4 w-4' /> Back to AnonLink
        </Link>

        <div className='flex flex-col items-center mb-12 text-center'>
          <div className='relative mb-6'>
            <div className='w-24 h-24 rounded-[30%] gradient-brand flex items-center justify-center shadow-2xl shadow-pw-primary/20'>
              <User className='h-12 w-12 text-white' />
            </div>
            <div className='absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-pw-surface border-4 border-pw-background flex items-center justify-center'>
              <Lock className='h-4 w-4 text-pw-primary' />
            </div>
          </div>
          <h1 className='text-3xl font-extrabold font-display'>
            Send @{params.username} a secret
          </h1>
          <p className='text-pw-muted mt-2'>
            Honest feedback, secret crush, or just a friendly hello. It&apos;s
            100% anonymous.
          </p>
        </div>

        <Card className='card-glow p-8 md:p-10 bg-pw-surface border-white/10'>
          <div className='flex items-center gap-2 text-xs font-bold text-pw-muted uppercase mb-6 tracking-widest'>
            <ShieldCheck className='h-4 w-4 text-pw-success' /> End-to-End
            Anonymous
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='Type your anonymous message here...'
            className='w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-6 text-lg focus:border-pw-primary focus:outline-none resize-none transition-all placeholder:text-white/10'
          />

          <div className='mt-8 flex flex-col md:flex-row items-center justify-between gap-6'>
            <div className='flex items-center gap-2 text-xs text-pw-muted font-medium'>
              <div className='w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse' />
              Always free, always private.
            </div>
            <Button
              onClick={sendMessage}
              disabled={isLoading}
              className='btn-primary h-14 px-12 text-lg w-full md:w-auto shadow-xl shadow-pw-primary/10'>
              {isLoading ? 'Sending...' : 'Send Securely'}
              <Send className='h-5 w-5 ml-2' />
            </Button>
          </div>
        </Card>

        <p className='text-center text-[10px] text-pw-muted uppercase tracking-[0.2em] mt-16 opacity-30'>
          Built by Ping World — Empowering Anonymous Expression
        </p>
      </div>
    </div>
  );
}
