'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { COMPANY } from '@/lib/config/company';
import { tools } from '@/lib/general/data';
import { useAppContext } from '@/context/AppContext';
import Image from 'next/image';

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
  const { isLoggedIn } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const visibleTools = tools.slice(0, 6);
  const dropdownTools = tools.slice(6);
  const hasMoreTools = tools.length > 6;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/tools', label: 'All Tools' },
    { href: '/pricing', label: 'Pricing' },
    ...(isLoggedIn ?
      [{ href: '/dashboard', label: 'Dashboard' }]
    : [
        { href: '/login', label: 'Login' },
        { href: '/register', label: 'Sign Up' },
      ]),
  ];

  return (
    <footer className='border-t border-pw-primary/10 bg-pw-bg/80 backdrop-blur-sm'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12'>
        <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4'>
          {/* Brand column */}
          <div className='sm:col-span-2 md:col-span-1'>
            <Link
              href='/'
              className='flex items-center gap-2 mb-4'>
            
                        <Image
                          width={40}
                          height={40}
                          src='/images/logo.png'
                          alt='Ping World Logo'
                          className='h-15 w-15 object-fit'
                        />
              <span className='text-lg font-bold font-display text-pw-text'>
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
              Company
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h2 className='text-sm font-semibold text-pw-text mb-3'>
              Navigate
            </h2>
            <ul className='space-y-2'>
              {navLinks.map((link) => (
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

          {/* Tools */}
          <div>
            <h2 className='text-sm font-semibold text-pw-text mb-3'>Tools</h2>
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
                <li className='relative'>
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className='text-sm text-pw-primary hover:text-pw-primary/80 transition-colors font-semibold flex items-center gap-1 cursor-pointer'>
                    {isOpen ?
                      <>
                        View Less <ChevronUp className='h-3.5 w-3.5' />
                      </>
                    : <>
                        View More... <ChevronDown className='h-3.5 w-3.5' />
                      </>
                    }
                  </button>

                  {isOpen && (
                    <div className='absolute bottom-full left-0 mb-2 w-48 bg-[#12152E] border border-pw-primary/20 rounded-xl p-2 py-3 shadow-2xl z-50 flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar'>
                      {dropdownTools.map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          onClick={() => setIsOpen(false)}
                          className='text-xs text-pw-muted hover:text-pw-primary transition-colors px-3 py-1 rounded hover:bg-white/5'>
                          {tool.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              )}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h2 className='text-sm font-semibold text-pw-text mb-3'>Company</h2>
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

        <div className='flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-6'>
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
