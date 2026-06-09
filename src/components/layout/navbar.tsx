'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Zap,
  Wrench,
  PenTool,
  LayoutDashboard,
  Menu,
  X,
  Search,
  MessageSquare,
  Type,
  ImageIcon,
  Puzzle,
  ChevronDown,
  Home,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const toolLinks = [
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
    href: '/quiz',
    label: 'Quizzable',
    icon: Puzzle,
    description: 'Interactive quiz builder',
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

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tools', label: 'Browse Tools', icon: Wrench },
  { href: '/composer', label: 'Composer', icon: PenTool },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export const Navbar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className='fixed top-0 left-0 right-0 z-50 border-b border-white/5 h-[10vh] glass'>
      <nav className='mx-auto w-[100%] flex items-center justify-between px-6 py-4'>
        {/* Logo */}
        <Link
          href='/'
          className='flex items-center gap-2 group'>
          <div className='relative flex h-9 w-9 items-center justify-center rounded-lg gradient-brand'>
            <Zap className='h-5 w-5 text-white' />
          </div>
          <span className='text-lg font-bold font-display tracking-tight text-pw-text group-hover:text-pw-primary transition-colors duration-300'>
            Ping World
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className='hidden items-center gap-2 lg:flex'>
          {/* Tools Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger>
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-white/5',
                  toolLinks.some((l) => pathname === l.href) ?
                    'text-pw-primary bg-pw-primary/5'
                  : 'text-pw-muted hover:text-pw-text',
                )}>
                <Wrench className='h-4 w-4' />
                Tools
                <ChevronDown className='h-3 w-3 opacity-50' />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='start'
              className='w-64 p-2 bg-pw-surface border-white/10 glass shadow-2xl'>
              <div className='px-2 py-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
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
                        className={cn('text-[10px] text-pw-muted', active && 'text-white')
                        }>
                        {tool.description}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative px-5 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                  isActive ?
                    'text-pw-cyan bg-pw-cyan/5'
                  : 'text-pw-muted hover:text-pw-text hover:bg-white/5',
                )}>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right section */}
        <div className='flex items-center gap-3'>
          <Link
            href='/tools'
            className='hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-pw-muted hover:text-pw-text hover:bg-pw-primary/10 transition-colors duration-200'>
            <Search className='h-4 w-4' />
          </Link>
          <Link
            href='/login'
            className='hidden md:inline-flex btn-primary text-sm px-10 py-2 shadow-lg shadow-pw-primary/20'>
            Sign In
          </Link>
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
          animate={{ opacity: 1, height: 'auto', overflow:'hidden' }}
          exit={{ opacity: 0, height: 0 }}
          className='lg:hidden border-t border-white/5 glass'>
          <div className='flex flex-col gap-1 px-6 py-6 glass'>
            {[...navLinks].map((link) => {
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
            <Link
              href='/login'
              onClick={() => setMobileOpen(false)}
              className='btn-primary text-sm text-center mt-4 h-12'>
              Sign In
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
};
