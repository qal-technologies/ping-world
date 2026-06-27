import Link from 'next/link';
import { Instagram, Linkedin, Mail, Twitter, Youtube, Zap } from 'lucide-react';
import { capFirst } from '@/lib/utils';

const footerSections = [
  {
    title: 'Tools',
    links: [
      { href: '/message', label: 'Anonymous Messaging' },
      { href: '/editor', label: 'Text Editor' },
      { href: '/quiz', label: 'Quiz Builder' },
      { href: '/image', label: 'Image Toolkit' },
      { href: '/tools/url-shortener', label: 'URL Shortener' },
    ],
  },
  {
    title: 'Create',
    links: [
      { href: '/create/post', label: 'Post Composer' },
      { href: '/create/editor', label: 'AI Editor' },
      { href: '/create/mimic', label: 'Chat Mimic' },
      { href: '/create/templates', label: 'Templates' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

const socials = [
  {
    name: 'Youtube',
    link: 'www.youtube.com/ping-world',
    icon: Youtube,
  },
  {
    name: 'Email',
    link: 'mailto:ping.world@gmail.com',
    icon: Mail,
  },
  {
    name: 'X',
    link: 'www.x.com/ping-world',
    icon: Twitter,
  },
  {
    name: 'Instagram',
    link: 'www.instagram.com/ping-world',
    icon: Instagram,
  },
  {
    name: 'Linkedin',
    link: 'www.linkedin.com/ping-world',
    icon: Linkedin,
  },
];

export const Footer = () => {
  return (
    <footer className='border-t border-pw-primary/10 bg-pw-bg/80 backdrop-blur-sm'>
      <div className='mx-auto max-w-7xl px-6 py-12'>
        <div className='grid grid-cols-2 gap-8 md:grid-cols-4'>
          {/* Brand column */}
          <div className='col-span-2 md:col-span-1'>
            <Link
              href='/'
              className='flex items-center gap-2 mb-4'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg gradient-brand'>
                <Zap className='h-4 w-4 text-white' />
              </div>
              <span className='text-base font-bold font-display text-pw-text'>
                Ping World
              </span>
            </Link>
            <p className='text-sm text-pw-muted leading-relaxed max-w-xs'>
              Your world of tools. Free utilities and creator tools for
              everyone.
            </p>

            <p className='text-xs text-pw-muted mt-1'>
              A {'  '}
              <Link
                href='https://qhal-tech.com'
                target='_blank'
                className='font-bold text-pw-primary'>
                QAL TECH
              </Link>{' '}
              Company
            </p>
          </div>

          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className='text-sm font-semibold text-pw-text mb-3'>
                {section.title}
              </h3>
              <ul className='space-y-2'>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className='text-sm text-pw-muted hover:text-pw-primary transition-colors duration-200'>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className='divider mt-15 mb-5' />

        <div className='flex w-full items-center gap-2 p-2 justify-evenly flex-wrap'>
          {socials.map((s, i) => {
            return (
              <Link
                title={`Check out our ${capFirst(s.name)}`}
                href={s.link}
                key={s.link + s.name + '9hf8erh89her98hf'}
                className={'text-pw-muted hover:text-pw-cyan hover:scale-[1.1]'}>
                <s.icon className='w-5 h-5' />
              </Link>
            );
          })}
        </div>
        <div className='divider mt-5 mb-15' />

        <div className='flex flex-col items-center justify-between gap-2 md:gap-5 md:flex-row mt-4'>
          <p className='text-xs text-pw-muted'>
            &copy; {new Date().getFullYear()} Ping World. All rights reserved.
          </p>
          <p className='text-xs text-pw-muted'>
            Developed by{' '}
            <Link
              href='https://wa.me/2349016561308'
              target='_blank'
              className='gradient-text underline cursor-pointer'
              style={{ letterSpacing: 1 }}>
              Pascodez
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};
