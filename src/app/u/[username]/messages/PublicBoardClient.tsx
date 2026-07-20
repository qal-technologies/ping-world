'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Lock,
  Globe,
  Clock,
  Sparkles,
  Inbox,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { COMPANY } from '@/lib/config/company';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface MessageRow {
  id: string;
  content: string;
  pre_reply?: string;
  sender_country?: string;
  created_at: string;
}

interface Props {
  profile: Profile | null;
  username: string;
}

export default function PublicBoardClient({ profile, username }: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const fetchPublicData = async () => {
      try {
        // Fetch recipient's profile settings (checking if they allowed public boards)
        // Since we check user metadata or user profiles table, let's fetch:
        const { data: userProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('is_public_inbox, tier')
          .eq('id', profile.id)
          .single();

        if (profileErr) throw profileErr;

        // Public inbox is only allowed for paid tiers (flexible, standard, pro)
        const isPaidTier =
          userProfile?.tier === 'flexible' ||
          userProfile?.tier === 'standard' ||
          userProfile?.tier === 'pro';

        const checkPublic = !!userProfile?.is_public_inbox && isPaidTier;
        setIsPublic(checkPublic);

        if (checkPublic) {
          // Fetch messages where recipient matches and expires_at is not passed
          const nowStr = new Date().toISOString();
          const { data: msgs, error: msgsErr } = await supabase
            .from('messages')
            .select('id, content, pre_reply, sender_country, created_at')
            .eq('recipient_id', profile.id)
            .gt('expires_at', nowStr)
            .order('created_at', { ascending: false });

          if (msgsErr) throw msgsErr;
          setMessages(msgs || []);
        }
      } catch (err) {
        console.error('[PublicBoardClient] error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [profile]);

  if (!profile) {
    return (
      <div className='min-h-[calc(100vh-64px)] flex items-center justify-center px-4'>
        <Card className='card-glow p-10 text-center max-w-md w-full'>
          <Inbox className='h-12 w-12 text-pw-muted mx-auto mb-4' />
          <h1 className='text-xl font-bold mb-2'>Board not found</h1>
          <p className='text-sm text-pw-muted mb-6'>
            The user board <strong>@{username}</strong> doesn&apos;t exist.
          </p>
          <Link href='/'>
            <Button className='btn-primary'>Back to {COMPANY.name}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4 px-4'>
        <div className='h-8 w-8 rounded-full border-2 border-pw-primary border-t-transparent animate-spin' />
        <p className='text-xs text-pw-muted font-mono'>Decrypting public messages...</p>
      </div>
    );
  }

  if (!isPublic) {
    return (
      <div className='min-h-[calc(100vh-64px)] flex items-center justify-center px-4'>
        <Card className='card-glow p-8 text-center max-w-md w-full relative overflow-hidden'>
          <div className='absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl' />
          <Lock className='h-12 w-12 text-amber-500 mx-auto mb-4 animate-pulse' />
          <h1 className='text-xl font-bold mb-2'>Board is Private</h1>
          <p className='text-xs text-pw-muted mb-6 leading-relaxed'>
            @{profile.username} has not allowed public guest reading, or this feature requires a paid subscription tier.
          </p>
          <div className='flex gap-3 justify-center'>
            <Link href={`/u/${profile.username}`}>
              <Button className='btn-primary text-xs h-10'>Send Anon Message</Button>
            </Link>
            <Link href='/'>
              <Button variant='outline' className='text-xs h-10 border-white/10'>
                Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className='relative min-h-[calc(100vh-64px)] pb-20'>
      <div className='orb orb-primary w-[500px] h-[500px] -top-30 -right-30 opacity-15' />
      <div className='orb orb-secondary w-[300px] h-[300px] bottom-0 -left-20 opacity-10' />

      <div className='container relative mx-auto px-4 sm:px-6 pt-10 sm:pt-14 max-w-3xl'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-6'>
          <Link href={`/u/${profile.username}`}>
            <Button variant='ghost' size='icon' className='h-9 w-9 text-pw-muted hover:text-pw-text bg-white/5 border border-white/5'>
              <ArrowLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div className='inline-flex items-center gap-1.5 badge border-pw-primary/20 bg-pw-primary/10 text-pw-primary'>
            <Sparkles className='h-3.5 w-3.5' /> Public Board
          </div>
        </div>

        <div className='mb-10'>
          <h1 className='text-3xl sm:text-4xl font-extrabold font-display leading-tight mb-2'>
            Messages for <span className='gradient-text'>@{profile.username}</span>
          </h1>
          <p className='text-xs text-pw-muted'>
            Open anonymous inbox logs shared publicly by @{profile.username}.
          </p>
        </div>

        <div className='divider mb-8' />

        {/* Message feed */}
        {messages.length === 0 ? (
          <Card className='card-glow p-12 text-center flex flex-col items-center justify-center min-h-[250px]'>
            <div className='w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4'>
              <MessageSquare className='h-6 w-6 text-pw-muted' />
            </div>
            <h3 className='text-base font-bold'>No public messages yet</h3>
            <p className='text-xs text-pw-muted mt-2 max-w-xs'>
              Guest messages will show up here as they are received.
            </p>
            <Link href={`/u/${profile.username}`}>
              <Button className='btn-primary mt-6 text-xs h-10 px-6 font-bold'>
                Be the First to Send
              </Button>
            </Link>
          </Card>
        ) : (
          <div className='space-y-4'>
            {messages.map((msg) => (
              <Card
                key={msg.id}
                className='p-5 sm:p-6 bg-pw-surface/40 hover:bg-pw-surface/60 border-white/5 transition-all relative overflow-hidden group'>
                {/* Meta row */}
                <div className='flex items-center justify-between text-[10px] text-pw-muted font-mono mb-3.5 border-b border-white/5 pb-2.5'>
                  <div className='flex items-center gap-3'>
                    {msg.sender_country && (
                      <span className='flex items-center gap-1 text-pw-primary border border-pw-primary/10 bg-pw-primary/5 rounded px-1.5 py-0.5 font-bold uppercase'>
                        <Globe className='h-3 w-3' /> {msg.sender_country}
                      </span>
                    )}
                    <span className='flex items-center gap-1'>
                      <Calendar className='h-3 w-3' />{' '}
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <p className='text-white text-base leading-relaxed break-words font-medium'>
                  &quot;{msg.content}&quot;
                </p>

                {/* Quick pre-reply if present */}
                {msg.pre_reply && (
                  <div className='mt-3 flex items-center gap-1.5 text-xs text-pw-success font-bold font-mono'>
                    <Clock className='h-3.5 w-3.5' />
                    <span>Reaction Hint: {msg.pre_reply}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
