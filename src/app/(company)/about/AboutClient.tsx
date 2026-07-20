'use client';
import Link from 'next/link';
import {
  Zap,
  Heart,
  Shield,
  Award,
  Users,
  Globe,
  ExternalLink,
  Sparkles,
  Lock,
  Layers,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePageLayout } from '@/components/layout';
import { COMPANY } from '@/lib/config/company';

export default function AboutPage() {
  const { setPaddingTop } = usePageLayout();
  setPaddingTop('pt-0');

  const devLink = COMPANY.developer.contact;
  const devName = COMPANY.developer.name;
  const devBrandName = COMPANY.developer.name;
  const parentName = COMPANY.parent.name;
  const parentBrandLink = COMPANY.parent.url;
  const devBrandLink = COMPANY.developer.contact;

  return (
    <div className='relative overflow-hidden pb-32 pt-20'>
      {/* Background orbs */}
      <div className='orb orb-primary w-[600px] h-[600px] -top-60 -right-60 opacity-15' />
      <div className='orb orb-secondary w-[400px] h-[400px] bottom-20 -left-20 opacity-10' />

      <div className='container relative mx-auto px-6 py-16 max-w-5xl'>
        {/* HERO */}
        <div className='text-center max-w-3xl mx-auto mb-20'>
          <div className='badge mb-6 inline-flex'>
            <Zap className='h-3.5 w-3.5' />
            Built for the World
          </div>
          <h1 className='text-4xl md:text-6xl font-extrabold font-display leading-tight mb-6'>
            Tools that respect your{' '}
            <span className='gradient-text'>privacy and your time.</span>
          </h1>
          <p className='text-pw-muted sm:text-lg leading-relaxed max-w-2xl mx-auto'>
            Ping World is a browser-native creator platform where powerful tools
            run locally on your device - with zero installs, zero logins
            required, and zero data collection beyond what you explicitly choose
            to sync.
          </p>
        </div>

        {/* PHILOSOPHY STATEMENT */}
        <div className='glass p-6 sm:p-8 md:p-12 mb-16 relative overflow-hidden rounded-3xl sm:rounded-4xl'>
          <div className='absolute -top-10 -right-10 w-48 h-48 bg-pw-cyan/20 rounded-full blur-3xl' />
          <div className='relative z-10 max-w-3xl'>
            <p className='text-xs font-bold uppercase text-pw-primary tracking-widest mb-4'>
              Our Philosophy
            </p>
            <h2 className='text-2xl md:text-3xl font-extrabold font-display mb-6 leading-tight'>
              Free where it matters.
              <br />
              <span className='gradient-text'>Premium where it counts.</span>
            </h2>
            <p className='text-pw-muted leading-relaxed mb-4'>
              Not everything should cost money. Quiz builders, encryption tools,
              PDF utilities, URL shorteners, QR generators - these are
              fundamental digital necessities, not luxury privileges. Ping World
              makes them free, gorgeous, and fast.
            </p>
            <p className='text-pw-muted leading-relaxed'>
              Where we offer premium capabilities - like expanded storage sync,
              public anonymous boards, or advanced analytics - we are honest
              about the cost and transparent about the reason. This is a
              platform built to last, not a product chasing your credit card.
            </p>
          </div>
        </div>

        {/* WHO WE ARE + TECH */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-16'>
          <Card className=' p-6 sm:p-8 border-white/5 bg-white/[0.02] space-y-4'>
            <div className='flex items-center gap-2 mb-2'>
              <Globe className='h-5 w-5 text-pw-primary' />
              <h2 className='text-xl font-bold font-display'>Who We Are</h2>
            </div>
            <p className='text-sm text-pw-muted leading-relaxed'>
              Ping World is operated as a premier product of{' '}
              <Link
                href={parentBrandLink}
                target='_blank'
                className='text-pw-primary font-bold inline-flex items-center gap-1 hover:underline'>
                {parentName} <ExternalLink className='h-3 w-3' />
              </Link>
              , a digital solutions group focused on privacy-first,
              high-efficiency web products.
            </p>
            <p className='text-sm text-pw-muted leading-relaxed'>
              Conceptualized and engineered primarily by{' '}
              <Link
                href={devLink}
                target='_blank'
                className='text-pw-text font-bold inline-flex items-center hover:underline'>
                {devName}
              </Link>{' '}
              and developed under the brand{' '}
              <Link
                href={devBrandLink}
                className='font-bold text-pw-primary inline-flex hover:underline'>
                {devBrandName}
              </Link>
              , Ping World brings together dozens of daily-use utilities into a
              unified, lightning-fast experience.
            </p>
          </Card>

          <Card className='p-6 sm:p-8 border-white/5 bg-white/[0.02] space-y-4'>
            <div className='flex items-center gap-2 mb-2'>
              <Layers className='h-5 w-5 text-pw-secondary' />
              <h2 className='text-xl font-bold font-display'>How It Works</h2>
            </div>
            <p className='text-sm text-pw-muted leading-relaxed'>
              Most tools on Ping World run entirely inside your browser using
              web-native APIs. Encryption, PDF generation, image processing,
              text editing - all client-side, nothing server-logged.
            </p>
            <p className='text-sm text-pw-muted leading-relaxed'>
              When you choose to sync data (quizzes, notes, links), we use
              Supabase with minimal, column-projected queries. We never read
              more than we store. Local storage is always the first cache layer.
            </p>
          </Card>
        </div>

        {/* CORE VALUES */}
        <div className='mb-16'>
          <h2 className='text-2xl sm:text-3xl font-bold font-display text-center mb-10'>
            Core Values
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {[
              {
                icon: Shield,
                title: 'Privacy by Default',
                desc: 'Client-side processing, local-first storage, zero telemetry beyond your consent. Your data stays yours.',
                color: 'text-pw-primary',
                bg: 'bg-pw-primary/10',
              },
              {
                icon: Award,
                title: 'Craft Over Compromise',
                desc: 'Free does not mean minimal. Every tool is designed with attention to detail, performance, and visual excellence.',
                color: 'text-pw-secondary',
                bg: 'bg-pw-secondary/10',
              },
              {
                icon: Heart,
                title: 'Built for Everyone',
                desc: 'From students to professionals, developers to non-technical users. Every tool is designed for real human needs.',
                color: 'text-pw-success',
                bg: 'bg-pw-success/10',
              },
              {
                icon: Lock,
                title: 'Honest Premium',
                desc: 'When features require infrastructure cost, we tell you upfront. No dark patterns, no surprise paywalls mid-flow.',
                color: 'text-amber-400',
                bg: 'bg-amber-400/10',
              },
              {
                icon: Sparkles,
                title: 'Continuously Growing',
                desc: 'New tools, new features, refinements based on real community feedback and shipped regularly, never abandoned.',
                color: 'text-purple-400',
                bg: 'bg-purple-400/10',
              },
              {
                icon: Users,
                title: 'Community Collaboration',
                desc: 'Feedback loops, feature requests, and user-driven roadmaps. You are the co-pilot, not just a user.',
                color: 'text-blue-400',
                bg: 'bg-blue-400/10',
              },
            ].map((v) => (
              <Card
                key={v.title}
                className='p-4 sm:p-6 border-white/5 bg-white/[0.01] bkblur flex flex-col items-start gap-4'>
                <div className={`p-2.5 rounded-xl ${v.bg}`}>
                  <v.icon className={`h-5 w-5 ${v.color}`} />
                </div>
                <div>
                  <h3 className='font-bold text-base text-pw-text mb-1'>
                    {v.title}
                  </h3>
                  <p className='text-xs text-pw-muted leading-relaxed'>
                    {v.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className='text-center sm:glass sm:p-10 mt-20 sm:mt-0 rounded-3xl sm:border-white/5'>
          <h3 className='text-2xl font-extrabold font-display mb-3'>
            Ready to explore?
          </h3>
          <p className='text-pw-muted text-sm mb-8 max-w-xl mx-auto'>
            Sixteen tools. Zero installs. No sign-up wall. Start building,
            creating, and encrypting in seconds.
          </p>
          <div className='flex flex-wrap gap-4 justify-center'>
            <Link
              href='/tools'
              className='btn-primary h-12 px-10 inline-flex items-center text-sm font-bold rounded-xl'>
              Browser All Tools
            </Link>
            {/* <Link
              href={parentBrandLink}
              target='_blank'
              className='h-12.5 px-8 inline-flex items-center text-sm font-bold rounded-xl border border-white/10 hover:bg-white/5 transition-colors gap-2'>
              Visit {parentName} <ExternalLink className='h-4 w-4' />
            </Link> */}
          </div>
        </div>
      </div>
    </div>
  );
}
