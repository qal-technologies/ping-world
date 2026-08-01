'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Zap,
  Wrench,
  LayoutDashboard,
  Menu,
  X,
  MessageSquare,
  Type,
  ImageIcon,
  ChevronDown,
  Home,
  Pencil,
  Brain,
  Code,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import {useAppContext} from '@/context/AppContext';

const toolLinks = [
  {
    href: '/quiz',
    label: 'Quizzable',
    icon: Brain,
    description: 'Interactive quiz builder',
  },
  {
    href: '/composer',
    label: 'Composer',
    description: 'Compose posts and captions',
    icon: Pencil,
  },
  {
    href: '/message',
    label: 'AnonLink',
    icon: MessageSquare,
    description: 'Anonymous messaging system',
  },
  {
    href: '/editor',
    label: 'Text Editor',
    icon: Type,
    description: 'Rich text and post maker',
  },
  {
    href: '/image',
    label: 'Image Toolkit',
    icon: ImageIcon,
    description: 'Filters and processing',
  },
  {
    href: '/tools/url-shortener',
    label: 'URL Shortener',
    icon: Zap,
    description: 'Clean links with QR codes',
  },
];


export const Navbar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<any | null>();
  const {isLoggedIn } = useAppContext();
  
  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/tools', label: 'Browse Tools', icon: Wrench },
    { href: '/api', label: 'Developer APIs', icon: Code },
    { href: '/quiz', label: 'Quiz', icon: Brain },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, isLogged: isLoggedIn },
  ];

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
      }
    };
    checkUser();
  }, []);

  return (
    <header className='fixed top-0 left-0 right-0 z-50 border-bb border-cyan/5 h-[11vh] mb-50'>
      <nav className='mx-auto w-[100%] flex items-center justify-between px-6 py-4 nav-glass'>
        {/* Logo */}
        <Link
          href='/'
          className='flex items-center gap-1 group'>
          <Image
            width={40}
            height={40}
            src='/images/logo.png'
            alt='Ping World Logo'
            className='h-15 w-15 object-fit'
          />

          <span className='text-lg font-bold font-display tracking-tight text-pw-text group-hover:text-pw-primary transition-colors duration-300'>
            Ping World
          </span>
        </Link>

        {/* Desktop Nav */}
        <div
          className='hidden items-center gap-2 lg:flex shrink-0'
          style={{ minWidth: '60%', width: 'auto', justifyContent: 'center' }}>
          {/* Tools Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger>
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-white/5',
                  toolLinks.some((l) => pathname === l.href) ?
                    'text-pw-primary bg-pw-primary/5'
                  : 'hover:text-pw-text',
                )}>
                <Wrench className='h-4 w-4' />
                Tools
                <ChevronDown className='h-3 w-3 opacity-50' />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='start'
              className='w-64 p-2 bg-pw-surface border-white/10 glass shadow-2xl'>
              <div className='px-2 py-2 mb-1 text-[10px] font-bold uppercase tracking-widest text'>
                Utility Suite
              </div>
              {toolLinks.map((tool) => {
                const active =
                  pathname === tool.href ||
                  pathname.startsWith(tool.href + '/');

                return (
                  <DropdownMenuItem
                    key={tool.href}
                    href={tool.href}>
                    <Link
                      href={tool.href}
                      className='flex flex-col gap-0.2 p-1 transition-all cursor-pointer group'>
                      <div className='flex items-center gap-2 font-medium text-pw-text group-hover:text-pw-primary'>
                        <tool.icon className='h-4 w-4' />
                        {tool.label}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] text-pw-muted',
                          active && 'text-white',
                        )}>
                        {tool.description}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {navLinks
            .filter((n) => (n.isLogged === undefined || n.isLogged == true))
            .map((link) => {
              const isActive =
                pathname === link?.href ||
                pathname.startsWith(link?.href + '/');
              return (
                <Link
                  key={link?.href}
                  href={link?.href}
                  className={cn(
                    'relative px-5 py-2 text-sm font-medium rounded-lg transition-colors duration-200 li-glass',
                    isActive ?
                      'text-pw-cyan bg-pw-cyan/5'
                    : 'text-pw-mutded hover:text-pw-text hover:bg-white/5',
                  )}>
                  {link?.label}
                </Link>
              );
            })}
        </div>

        {/* Right section */}
        <div className='flex items-center gap-3'>
          {isLoggedIn && pathname !== '/dashboard' ?
            <Link
              href='/dashboard'
              className='hidden md:inline-flex btn-primary text-sm px-10 py-2 shadow-lg shadow-pw-primary/20'>
              Dashboard
            </Link>
          : !session && (
              <Link
                href='/login'
                target='_blank'
                className='hidden md:inline-flex btn-primary text-sm px-10 py-2 shadow-lg shadow-pw-primary/20'>
                Sign In
              </Link>
            )
          }
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label='Toggle menu'
            className='flex h-9 w-9 items-center justify-center rounded-lg text-pw-muted hover:text-pw-text lg:hidden'>
            {mobileOpen ?
              <X className='h-5 w-5' />
            : <Menu className='h-5 w-5' />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', overflow: 'hidden' }}
          exit={{ opacity: 0, height: 0 }}
          className='lg:hidden border-t border-white/5 nav-glass'
          style={{ backdropFilter: 'brightness(50%) blur(12px)' }}>
          <div className='flex flex-col gap-1 px-6 py-6'>
            {[...navLinks]
              .filter((n) => n.isLogged !== true)
              .map((link) => {
                const isActive =
                  pathname === link?.href ||
                  pathname.startsWith(link?.href + '/');
                return (
                  <Link
                    key={link?.href}
                    href={link?.href as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                      isActive ?
                        'text-pw-cyan bg-pw-cyan/10'
                      : 'text-pw-muted hover:text-pw-text hover:bg-white/5',
                    )}>
                    {link && 'icon' in link && (
                      <link.icon className='h-4 w-4' />
                    )}
                    {link?.label}
                  </Link>
                );
              })}

            <div className='px-3 py-1 mt-6 text-[14px] font-bold uppercase tracking-widest text-pw-cyan'>
              UTILITY
            </div>
            {[...toolLinks].map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive ?
                      'text-pw-cyan bg-pw-cyan/10'
                    : 'text-pw-muted hover:text-pw-text hover:bg-white/5',
                  )}>
                  {'icon' in link && <link.icon className='h-4 w-4' />}
                  {link.label}
                </Link>
              );
            })}

            {isLoggedIn && pathname !== '/dashboard' ?
              <Link
                href='/dashboard'
                onClick={() => setMobileOpen(false)}
                target='_blank'
                className='btn-ghost text-sm text-center mt-4 h-12'>
                Dashboard
              </Link>
            : !session && (
                <Link
                  href='/login'
                  onClick={() => setMobileOpen(false)}
                  target='_blank'
                  className='btn-primary text-sm text-center mt-4 h-12'>
                  Sign In
                </Link>
              )
            }
          </div>
        </motion.div>
      )}
    </header>
  );
};
