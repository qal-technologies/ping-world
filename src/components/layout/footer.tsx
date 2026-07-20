'use client';

import Link from 'next/link';
import { Instagram, Linkedin, Mail, Twitter, Youtube, Zap } from 'lucide-react';
import { COMPANY } from '@/lib/config/company';
import { tools } from '@/lib/general/data';

const TOOL_FOOTER_LIMIT = 6;

const companyLinks = [
  { href: '/about', label: 'About' },
  { href: COMPANY.legal.privacyUrl, label: 'Privacy' },
  { href: COMPANY.legal.termsUrl, label: 'Terms' },
  { href: '/#recommendations', label: 'Share Feedback' },
];

const SOCIALS = [
  { name: 'Youtube', link: COMPANY.socials.youtube, icon: Youtube },
  { name: 'Email', link: COMPANY.socials.email, icon: Mail },
  { name: 'X / Twitter', link: COMPANY.socials.x, icon: Twitter },
  { name: 'Instagram', link: COMPANY.socials.instagram, icon: Instagram },
  { name: 'LinkedIn', link: COMPANY.socials.linkedin, icon: Linkedin },
];

export const Footer = () => {
  const visibleTools = tools.slice(0, TOOL_FOOTER_LIMIT);
  const hasMoreTools = tools.length > TOOL_FOOTER_LIMIT;

  return (
    <footer className='border-t border-pw-primary/10 bg-pw-bg/80 backdrop-blur-sm'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12'>
        <div className='grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-5'>
          {/* Brand column */}
          <div className='col-span-2 md:col-span-2'>
            <Link
              href='/'
              className='flex items-center gap-2 mb-4'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg gradient-brand'>
                <Zap className='h-4 w-4 text-white' />
              </div>
              <span className='text-base font-bold font-display text-pw-text'>
                {COMPANY.name}
              </span>
            </Link>
            <p className='text-sm text-pw-muted leading-relaxed max-w-xs'>
              {COMPANY.description}
            </p>
            <p className='text-xs text-pw-muted mt-3'>
              A{' '}
              <Link
                href={COMPANY.parent.url}
                target='_blank'
                className='font-bold text-pw-primary'>
                {COMPANY.parent.name}
              </Link>{' '}
              Company &nbsp;·&nbsp; v{COMPANY.version}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className='text-sm font-semibold text-pw-text mb-3'>
              Navigate
            </h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/'
                  className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href='/tools'
                  className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                  All Tools
                </Link>
              </li>
              <li>
                <Link
                  href='/quiz'
                  className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                  Quiz Builder
                </Link>
              </li>
              <li>
                <Link
                  href='/message'
                  className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                  Anonymous Inbox
                </Link>
              </li>
              <li>
                <Link
                  href='/pricing'
                  className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href='/dashboard'
                  className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3 className='text-sm font-semibold text-pw-text mb-3'>Tools</h3>
            <ul className='space-y-2'>
              {visibleTools.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                    {tool.title}
                  </Link>
                </li>
              ))}
              {hasMoreTools && (
                <li>
                  <Link
                    href='/tools'
                    className='text-sm text-pw-primary hover:underline font-medium'>
                    See all tools →
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className='text-sm font-semibold text-pw-text mb-3'>Company</h3>
            <ul className='space-y-2'>
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-pw-muted hover:text-pw-primary transition-colors'>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className='divider my-8' />

        <div className='flex flex-wrap items-center justify-center gap-5 mb-6'>
          {SOCIALS.map((s) => (
            <Link
              key={s.name}
              title={`${COMPANY.name} on ${s.name}`}
              href={s.link}
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`Follow ${COMPANY.name} on ${s.name}`}
              className='text-pw-muted hover:text-pw-primary hover:scale-110 transition-all'>
              <s.icon className='w-5 h-5' />
            </Link>
          ))}
        </div>
        <div className='divider mt-5 mb-15' />

        <div className='flex flex-col items-center justify-between gap-2 md:flex-row'>
          <p className='text-xs text-pw-muted'>
            &copy; {COMPANY.legal.year} {COMPANY.name}. All rights reserved.
          </p>
          <p className='text-xs text-pw-muted'>
            Developed by{' '}
            <Link
              href={COMPANY.developer.contact}
              target='_blank'
              rel='noopener noreferrer'
              className='gradient-text underline cursor-pointer font-medium'
              style={{ letterSpacing: 0.5 }}>
              {COMPANY.developer.name}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};
