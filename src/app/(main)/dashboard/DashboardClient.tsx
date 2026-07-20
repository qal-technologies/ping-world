"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Puzzle,
  MessageSquare,
  Zap,
  Layers,
  ArrowUpRight,
  Copy,
  Settings2,
  BarChart3,
  User,
  Plus,
  ChevronRight,
  BellDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { HybridStorage } from '@/lib/storage-utils';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { PREMIUM_TIERS } from '@/lib/config/premium';
import { SITE } from '@/lib/config/site';

export default function GeneralDashboard() {
  const { premiumTier } = useAppContext();
  const tierConfig = PREMIUM_TIERS[premiumTier];
  const [stats, setStats] = useState({
    quizzes: 0,
    messages: 0,
    links: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [username, setUsername] = useState('User');

  useEffect(() => {
    const loadStats = async () => {
      const q = await HybridStorage.getAll('quiz');
      const m = await HybridStorage.getAll('message');
      const l = await HybridStorage.getAll('link');

      setStats({
        quizzes: q.length,
        messages: m.length,
        links: l.length,
      });

      // Combine for activity feed
      const combined = [
        ...q.map((i) => ({ ...i, label: 'Quiz created' })),
        ...m.map((i) => ({ ...i, label: 'Message received' })),
      ]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 5);

      setRecentActivity(combined);
    };
    loadStats();
  }, []);

  useEffect(() => {
    const getUsername = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const username =
        user?.user_metadata.username ||
        user?.user_metadata.full_name ||
        'creator';
      setUsername(username);
    };
    getUsername();
  }, []);

  return (
    <div className='container mx-auto px-6 py-12 max-w-7xl pb-32'>
      <div className='flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12'>
        <div>
          <h1 className='text-4xl font-extrabold font-display leading-tight'>
            Welcome back, <span className='gradient-text'>@{username}</span>
          </h1>
          <p className='text-pw-muted mt-2'>
            Manage your creative ecosystem and track your tool performance.
          </p>
        </div>
        <div className='flex gap-3'>
          <Link href='/settings'>
            <Button
              variant='outline'
              className='border-white/10 hover:bg-white/5 h-11 px-6'>
              <Settings2 className='h-4 w-4 mr-2' /> Settings
            </Button>
          </Link>
          <Link href='/tools'>
            <Button className='btn-primary h-11 px-8'>
              <Plus className='h-4 w-4 mr-2' /> Launch Tool
            </Button>
          </Link>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-12'>
        {[
          {
            label: 'Total Quizzes',
            value: stats.quizzes,
            icon: Puzzle,
            color: '#22C985',
            href: '/quiz',
          },
          {
            label: 'Inbox Messages',
            value: stats.messages,
            icon: MessageSquare,
            color: '#5C6FFF',
            href: '/message',
          },
          {
            label: 'URL Shortener',
            value: stats.links,
            icon: Zap,
            color: '#F65164',
            href: '/tools/url-shortener',
          },
        ].map((stat) => (
          <Link
            href={stat.href}
            key={stat.label}>
            <Card className='card-glow p-8 group cursor-pointer hover:border-pw-primary/30 transition-all'>
              <div className='flex justify-between items-start'>
                <div className='p-3 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform'>
                  <stat.icon
                    className='h-6 w-6'
                    style={{ color: stat.color }}
                  />
                </div>
                <ArrowUpRight className='h-4 w-4 text-pw-muted opacity-0 group-hover:opacity-100 transition-opacity' />
              </div>
              <div className='mt-6'>
                <div className='text-3xl font-bold font-display'>
                  {stat.value}
                </div>
                <div className='text-sm text-pw-muted mt-1'>{stat.label}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Recent Activity */}
        <div className='lg:col-span-8 space-y-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-xl font-bold flex items-center gap-2'>
              <BarChart3 className='h-5 w-5 text-pw-primary' /> Recent Activity
            </h3>
            <Button
              variant='link'
              className='text-pw-primary text-xs'>
              View All
            </Button>
          </div>

          <div className='space-y-4'>
            {recentActivity.length > 0 ?
              recentActivity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}>
                  <Card className='p-5 flex items-center justify-between bg-pw-surface/50 border-white/5 hover:bg-white/[0.03] transition-colors'>
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 rounded-full bg-pw-primary/10 flex items-center justify-center'>
                        {item.type === 'quiz' ?
                          <Puzzle className='h-5 w-5 text-pw-primary' />
                        : <MessageSquare className='h-5 w-5 text-pw-primary' />}
                      </div>
                      <div>
                        <div className='text-sm font-bold'>
                          {item.content?.title || item.label}
                        </div>
                        <div className='text-xs text-pw-muted uppercase font-mono mt-0.5'>
                          {new Date(item.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-pw-muted'>
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  </Card>
                </motion.div>
              ))
            : <div className='py-12 text-center border-2 border-dashed border-white/5 rounded-2xl'>
                <p className='text-pw-muted italic'>
                  No recent activity detected.
                </p>
              </div>
            }
          </div>
        </div>

        {/* Sidebar Mini Profile */}
        <div className='lg:col-span-4 space-y-6'>
          <Card className='card-glow p-8'>
            <div className='flex flex-col items-center text-center mb-8'>
              <div className='w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center mb-4 shadow-xl'>
                <User className='h-10 w-10 text-white' />
              </div>
              <h4 className='text-xl font-bold font-display'>
                Creator Profile
              </h4>
              <p
                className='text-xs text-pw-muted mt-1 uppercase tracking-widest font-bold'
                style={{ color: tierConfig.color }}>
                {tierConfig.badge} - {tierConfig.label}
              </p>
            </div>

            <div className='space-y-4 mb-8'>
              <div className='p-3 bg-white/5 border border-white/10 rounded-xl'>
                <label className='text-[10px] font-bold text-pw-muted uppercase mb-1 block'>
                  Public Inbox Link
                </label>
                <div className='flex items-center justify-between'>
                  <span className='text-xs truncate text-pw-primary font-medium'>
                    {SITE.domain.replace('https://', '')}/u/{username}
                  </span>
                  <Copy
                    className='h-3 w-3 text-pw-muted hover:text-pw-primary cursor-pointer'
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${SITE.domain.replace('https://', '')}/u/${username}`,
                      );
                      toast.success('Link copied!');
                    }}
                  />
                </div>
              </div>

              {stats.messages > 0 && (
                <Link href='/message'>
                  <div className='p-3 bg-pw-primary/10 border border-pw-primary/20 rounded-xl flex items-center justify-between hover:bg-pw-primary/20 transition-colors cursor-pointer'>
                    <div className='flex items-center gap-2'>
                      <BellDot className='h-4 w-4 text-pw-primary' />
                      <span className='text-xs font-bold text-pw-primary'>
                        Unread Messages
                      </span>
                    </div>
                    <span className='w-5 h-5 rounded-full bg-pw-primary text-white text-[10px] font-bold grid place-items-center'>
                      {stats.messages}
                    </span>
                  </div>
                </Link>
              )}
            </div>

            <Button className='w-full btn-primary h-11 gap-2'>
              <ArrowUpRight className='h-4 w-4' /> Share All Assets
            </Button>
          </Card>

          <Card className='p-6 bg-gradient-to-br from-pw-primary/10 via-pw-surface/50 to-pw-secondary/10 border border-pw-primary/20 hover:border-pw-primary/40 transition-all rounded-2xl relative overflow-hidden group shadow-xl'>
            <div className='absolute -top-10 -right-10 w-28 h-28 bg-pw-primary/10 rounded-full blur-2xl group-hover:scale-110 transition-transform' />
            <h4 className='text-sm font-bold mb-2 text-white flex items-center gap-2'>
              <Layers className='h-4 w-4 text-pw-primary' /> Pricing & Payments
            </h4>
            <p className='text-[11px] text-pw-muted leading-relaxed mb-4'>
              Current Plan: <span className='text-pw-primary font-bold uppercase tracking-wider'>{tierConfig.label}</span>
              <br />
              Unlock extended assessment lifespan up to 30 days, custom link routing, public message boards, and pro-level tools with flexible, standard or pro premium billing plans.
            </p>
            <div className="flex gap-2">
              <Link href='/pricing' className="w-full">
                <Button className='w-full btn-primary h-10 text-xs font-bold gap-1.5 cursor-pointer'>
                  Upgrade Plan <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
