'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import {
  MessageCircle,
  Type,
  Brain,
  Image as ImageIcon,
  Link2,
  QrCode,
  Palette,
  PenTool,
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tools = [
  {
    icon: MessageCircle,
    title: 'Anonymous Messaging',
    description: 'Get anonymous messages from anyone with a shareable link.',
    href: '/message',
    color: '#5C6FFF',
  },
  {
    icon: Type,
    title: 'Text Editor',
    description: 'Rich text editor with post card canvas and export options.',
    href: '/editor',
    color: '#22D4FD',
  },
  {
    icon: Brain,
    title: 'Quiz Builder',
    description: 'Create interactive quizzes with multiple question types.',
    href: '/quiz',
    color: '#22C985',
  },
  {
    icon: ImageIcon,
    title: 'Image Toolkit',
    description: 'Edit, convert, compress, and remove backgrounds from images.',
    href: '/image',
    color: '#FFB347',
  },
  {
    icon: Link2,
    title: 'URL Shortener',
    description: 'Shorten URLs with click tracking and custom aliases.',
    href: '/tools/url-shortener',
    color: '#FF5C7A',
  },
  {
    icon: QrCode,
    title: 'QR Code Generator',
    description: 'Generate customizable QR codes for any content.',
    href: '/tools/qr-code',
    color: '#5C6FFF',
  },
  {
    icon: Palette,
    title: 'Color Palette',
    description: 'Generate, extract, and explore beautiful color palettes.',
    href: '/tools/colors',
    color: '#22D4FD',
  },
  {
    icon: PenTool,
    title: 'Creator Hub',
    description: 'Compose posts, AI editing, chat mimic, and templates.',
    href: '/create',
    color: '#22C985',
  },
];

const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const HeroSection = () => {
  return (
    <section className='relative overflow-hidden min-h-[92vh] lg:h-[80vh]'>
      {/** Black hole effect */}
      <div className='globe-div'>
        <div className='globe' />
      </div>

      {/* Decorative Beauty Objects */}
      <div className='beauty-obj w-32 h-32 top-[10%] left-[15%] opacity-10' />
      <div
        className='beauty-obj w-48 h-48 bottom-[20%] right-[10%] opacity-5 float'
        style={{ animationDelay: '-3s' }}
      />
      <div
        className='beauty-obj w-20 h-20 top-[40%] right-[25%] opacity-10'
        style={{ animationDelay: '-7s' }}
      />

      {/* Background orbs */}
      <div className='orb orb-accent w-[500px] h-[500px] -top-40 -left-40 opacity-40 blur-all' />
      <div className='orb orb-secondary w-[400px] h-[400px] -bottom-20 -right-20 opacity-30 blur-all' />

      <div className='relative mx-auto max-w-7xl px-6 py-24 md:py-36 lg:py-44'>
        <motion.div
          initial='hidden'
          animate='visible'
          variants={stagger}
          className='flex flex-col items-center text-center'>
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            className='badge mb-6'>
            <Sparkles className='h-3 w-3' />
            Free &amp; open tools for everyone
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className='text-4xl md:text-6xl lg:hidden font-extrabold font-display tracking-tight leading-[1.05] max-w-4xl'>
            Your world of <span className='gradient-text'>tools.</span>
          </motion.h1>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className='hidden lg:text-8xl lg:inline-flex font-extrabold font-display tracking-tight leading-[1.05] max-w-4xl'>
            Ping <span className='gradient-text'>World</span>
          </motion.h1>

          <motion.h4
            variants={fadeUp}
            className='hidden text-2xl lg:block font-display tracking-tight leading-[1.05] max-w-2xl'>
            Your world of <span className='gradient-text'>tools.</span>
          </motion.h4>
          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className='mt-6 mx-4 text-md md:text-lg text-pw-muted max-w-2xl leading-relaxed'>
            Anonymous messaging, quiz builder, image toolkit, URL shortener,
            creator hub - all free, all in one place.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            className='mt-30 lg:mt-20 flex flex-col gap-4 sm:flex-row'>
            <Link
              href='/tools'
              className='btn-primary text-base px-10 py-3 w-[300px]'>
              Explore Tools
            </Link>
            <Link
              href='/register'
              className='btn-ghost text-base px-10 py-3'>
              Get Started Free
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            className='mt-20 lg:mt-10 grid grid-cols-3 gap-15 md:gap-20 lg:gap-30'>
            {[
              { value: '15+', label: 'Free Tools' },
              { value: '∞', label: 'No Limits' },
              { value: '0', label: 'Cost' },
            ].map((stat) => (
              <div
                key={stat.label}
                className='text-center'>
                <div className='text-2xl md:text-3xl font-bold font-display gradient-text'>
                  {stat.value}
                </div>
                <div className='text-xs md:text-sm text-pw-muted mt-1'>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export const ToolsGrid = () => {
  return (
    <section className='relative py-32 md:py-48 px-6 overflow-hidden'>
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pw-primary/5 rounded-full blur-[150px] -z-10' />

      <div className='mx-auto max-w-7xl'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='text-center mb-24'>
          <div className='badge mb-4 mx-auto uppercase tracking-[0.2em] px-6'>
            Interactive Suite
          </div>
          <h2 className='text-4xl md:text-6xl font-extrabold font-display leading-[1.1]'>
            Powerful tools for <br />
            <span className='gradient-text'>curious creators.</span>
          </h2>
          <p className='mt-6 text-pw-muted text-lg max-w-2xl mx-auto leading-relaxed font-medium'>
            Take a test drive of our core utility suite. Built with speed,
            privacy, and user experience at the forefront.
          </p>
        </motion.div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {[
            {
              title: 'AnonLink',
              desc: 'Personalized anonymous inboxes. Share your link, gather secrets, and reply with privacy.',
              icon: MessageCircle,
              href: '/message',
              color: '#5C6FFF',
              tag: 'Popular',
            },
            {
              title: 'Quizzable',
              desc: 'Create logic-based quizzes for your audience. Export to JSON or share as an interactive page.',
              icon: Brain,
              href: '/quiz',
              color: '#22C985',
              tag: 'Powerful',
            },
            {
              title: 'Image Toolkit',
              desc: 'Zero-latency image filtering. Smooth out your shots with premium presets directly in-browser.',
              icon: ImageIcon,
              href: '/image',
              color: '#FFB347',
              tag: 'New',
            },
            {
              title: 'Post Composer',
              desc: 'The ultimate social canvas. Design beautiful post cards and export them for X, Instagram, and Facebook.',
              icon: Type,
              href: '/editor',
              color: '#22D4FD',
              tag: 'Creative',
            },
            {
              title: 'URL Matrix',
              desc: 'More than a shortener. Generate QR codes and track link health with advanced local analytics.',
              icon: Zap,
              href: '/tools/url-shortener',
              color: '#F65164',
              tag: 'Essential',
            },
            {
              title: 'Chat Mimic',
              desc: 'Create realistic chat story narratives. High-fidelity iOS/Android message previews with image export.',
              icon: PenTool,
              href: '/editor',
              color: '#a855f7',
              tag: 'Narrative',
            },
          ].map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}>
              <Link href={tool.href}>
                <Card className='card-glow p-8 h-full flex flex-col group hover:border-pw-primary/50 transition-all cursor-pointer relative overflow-hidden'>
                  <div className='absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity'>
                    <tool.icon
                      className='h-24 w-24'
                      style={{ color: tool.color }}
                    />
                  </div>

                  <div className='mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-pw-surface border border-white/5 shadow-2xl group-hover:scale-110 group-hover:shadow-pw-primary/10 transition-all duration-500'>
                    <tool.icon
                      className='h-8 w-8'
                      style={{ color: tool.color }}
                    />
                  </div>

                  <div className='flex items-center gap-3'>
                    <h3 className='text-2xl font-bold font-display group-hover:text-pw-primary transition-colors'>
                      {tool.title}
                    </h3>
                    <span className='text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-pw-muted'>
                      {tool.tag}
                    </span>
                  </div>

                  <p className='text-pw-muted leading-relaxed flex-1 text-sm font-medium'>
                    {tool.desc}
                  </p>

                  <div className='mt-6 pt-6 border-t border-white/5 flex items-center justify-between group-hover:border-pw-primary/20 transition-all'>
                    <div className='flex items-center gap-2 text-sm font-bold text-pw-text group-hover:text-pw-cyan transition-colors'>
                      Demo Tool{' '}
                      <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-2' />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const CTASection = () => {
  return (
    <section className='relative py-20 md:py-28'>
      <div className='mx-auto max-w-3xl px-6 text-center'>
        <motion.div
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          variants={stagger}>
          <motion.div
            variants={fadeUp}
            className='card-glow p-10 md:p-14 relative overflow-hidden'>
            <div className='orb orb-primary w-[300px] h-[300px] -top-24 -right-24 opacity-25' />
            <div className='orb orb-secondary w-[200px] h-[200px] -bottom-16 -left-16 opacity-20' />
            <div className='relative z-10'>
              <Globe className='h-10 w-10 text-pw-primary mx-auto mb-5 animate-float' />
              <h2 className='text-2xl md:text-3xl font-extrabold font-display'>
                Ready to explore your world of tools?
              </h2>
              <p className='mt-4 text-pw-muted max-w-md mx-auto'>
                Sign up for free and unlock your dashboard, saved quizzes,
                message inbox, and more.
              </p>
              <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center'>
                <Link
                  href='/register'
                  className='btn-primary text-base px-8 py-3'>
                  Create Free Account
                </Link>
                <Link
                  href='/tools'
                  className='btn-ghost text-base px-8 py-3'>
                  Browse Tools
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
