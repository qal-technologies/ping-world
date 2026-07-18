// jules edit: Extracted client-side User Landing implementation to support server-side SEO & metadata compilation
"use client";

import { motion } from 'framer-motion';
import {
  Puzzle,
  MessageSquare,
  Image as ImageIcon,
  Settings2,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

const FEATURE_LINKS = [
  {
    title: 'Quiz Engine',
    description: 'Build and manage your professional quizzes.',
    icon: Puzzle,
    href: '/quiz',
    color: 'text-pw-primary',
  },
  {
    title: 'AnonLink',
    description: 'View and share your anonymous message links.',
    icon: MessageSquare,
    href: '/message',
    color: 'text-pw-secondary',
  },
  {
    title: 'Image Toolkit',
    description: 'Enhance and process images in-browser.',
    icon: ImageIcon,
    href: '/image',
    color: 'text-pw-success',
  },
  {
    title: 'Account Settings',
    description: 'Manage your profile and synchronization.',
    icon: Settings2,
    href: '/settings',
    color: 'text-pw-muted',
  },
];

export default function UserDashboardPage() {
  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-[calc(100vh-64px)]'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <UserIcon className='h-3.5 w-3.5' />
            Dashboard
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Welcome Back, <span className='gradient-text'>World.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Manage your tools and track your digital footprint.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {FEATURE_LINKS.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}>
            <Link href={feature.href}>
              <Card className='card-glow p-8 h-full bg-pw-surface/50 border-white/5 hover:border-pw-primary/30 transition-all group'>
                <div className='flex items-start justify-between'>
                  <div
                    className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${feature.color}`}>
                    <feature.icon className='h-8 w-8' />
                  </div>
                  <div className='w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-pw-primary/10'>
                    <ChevronRight className='h-5 w-5 text-pw-primary' />
                  </div>
                </div>
                <h3 className='text-2xl font-bold mt-6 mb-2'>
                  {feature.title}
                </h3>
                <p className='text-pw-muted text-sm leading-relaxed'>
                  {feature.description}
                </p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
