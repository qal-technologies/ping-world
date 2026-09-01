'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
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
  Search,
  SearchIcon,
  ChevronRight,
  Layout,
  Code2,
  BookCheck,
} from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { SEARCH_INDEX, SearchPageItem } from '@/lib/general/search-data';

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
    href: '/tools/pdf',
    label: 'PDF Toolkit',
    icon: BookCheck,
    description: 'Conversion, merging and book creation',
  },
  {
    href: '/image',
    label: 'Image Toolkit',
    icon: ImageIcon,
    description: 'Filters and image editing',
  },
  {
    href: '/editor',
    label: 'Text Editor',
    icon: Type,
    description: 'Rich text and post maker',
  },
];

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isLoggedIn } = useAppContext();

  // Search Bar States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [searchInput, openSearchInput] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery) return [];
    return SEARCH_INDEX.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(debouncedQuery);
      const matchDesc = item.description.toLowerCase().includes(debouncedQuery);
      const matchKeywords = item.keywords.some((k) =>
        k.toLowerCase().includes(debouncedQuery),
      );
      return matchTitle || matchDesc || matchKeywords;
    }).slice(0, 6);
  }, [debouncedQuery]);


  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/tools', label: 'Browse Tools', icon: Wrench },
    { href: '/api', label: 'Developer APIs', icon: Code },
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isLogged: isLoggedIn,
    },
  ];

  return (
    <header className='fixed top-0 left-0 right-0 z-50'>
      {/* Main Navbar Bar */}
      <nav className='mx-auto w-[100%] flex items-center justify-between px-6 py-5 nav-glass'>
        {/* Logo */}
        <Link
          href='/'

          className='flex items-center gap-1 group'>
          <Image
            width={40}
            height={40}
            src='/images/logo.png'
            alt='Ping World Logo'
            className='h-9 w-9 object-fit'
          />

          <span className='text-lg sm:text-xl font-bold font-display tracking-tight text-pw-text group-hover:text-pw-primary transition-colors duration-300 text-shadow-md'>
            Ping World
          </span>
        </Link>

        {/* Desktop Nav */}
        <div
          className='hidden items-center gap-2 lg:flex shrink-0'
          style={{ minWidth: '55%', width: 'auto', justifyContent: 'center' }}>
          {/* Tools Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger>
              <div
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all hover:bg-white/5 cursor-pointer',
                  toolLinks.some((l) => pathname === l.href) ?
                    'text-pw-primary bg-pw-primary/5'
                  : 'hover:text-pw-text text-pw-muted',
                )}>
                <Wrench className='h-3.5 w-3.5' />
                Tools
                <ChevronDown className='h-3 w-3 opacity-50' />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='start'
              className='w-64 p-2 bg-pw-surface border-white/10 glass shadow-2xl'>
              <div className='px-2 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
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
                      className='flex flex-col gap-0.5 p-1 transition-all cursor-pointer group'>
                      <div className='flex items-center gap-2 font-medium text-xs text-pw-text group-hover:text-pw-primary'>
                        <tool.icon className='h-3.5 w-3.5' />
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
            .filter((n) => n.isLogged === undefined || n.isLogged == true)
            .map((link) => {
              const isActive =
                pathname === link?.href ||
                pathname.startsWith(link?.href + '/');
              return (
                <Link
                  key={link?.href}
                  href={link?.href}
                  className={cn(
                    'relative px-3.5 py-1.5 lg:text-xs xl:text-sm font-semibold rounded-lg text-pw-text transition-colors duration-200 li-glass',
                    isActive ?
                      'text-pw-cyan bg-pw-cyan/5'
                    : 'hover:text-pw-cyan hover:bg-white/2',
                  )}>
                  {link?.label}
                </Link>
              );
            })}
        </div>

        {/* Right section */}
        <div className='flex items-center gap-3'>
          <button
            onClick={() => openSearchInput(!searchInput)}
            aria-label='Toggle Search'
            className={cn(
              'hidden sm:flex h-9 w-9 items-center justify-center rounded-lg hover:text-pw-text',
              searchInput ? 'p-1' : 'text-pw-muted',
            )}>
            {searchInput ? <X className='h-5 w-5 text-pw-danger rounded-full bg-pw-danger/10 bkblur' /> :
            <SearchIcon className='h-6 w-6' />}
          </button>

          {isLoggedIn ?
            pathname !== '/dashboard' ?
              <Link
                href={'/dashboard'}
                className={cn(
                  'hidden md:inline-flex btn-primary text-xs font-bold px-6 py-2 shadow-lg shadow-pw-primary/20',
                )}>
                Dashboard
              </Link>
            : <div className='hidden md:inline-flex btn-primary text-sm px-10 py-2 opacity-0'>
                Dashboard
              </div>

          : <Link
              href='/login'
              className='hidden md:inline-flex btn-primary text-xs font-bold px-6 py-2 shadow-lg shadow-pw-primary/20'>
              Sign In
            </Link>
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

      {/* Desktop Search Attachment Bar (Separated below header, aligned right) */}
      {searchInput && (
        <div className='hidden lg:flex justify-end px-2 pt-2 pointer-events-none'>
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            ref={searchContainerRef}
            className='relative pointer-events-auto w-90'>
            <div className='flex items-center gap-2 bg-[#0c0d1c]/40 border border-white/5 p-1 px-4 rounded-2xl shadow-xl focus-within:border-pw-primary/50 transition-all bkblur'>
              <Search className='h-4 w-4 text-pw-muted shrink-0' />
              {/* Add enter key handling to select first search result */}
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                autoFocus
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    const firstResult = searchResults[0];
                    setIsSearchOpen(false);
                    openSearchInput(false);
                    setSearchQuery('');
                    router.push(firstResult.href);
                  }
                }}
                placeholder='Search tools, pages...'
                className='bg-transparent border-none h-8 no-outline text-sm text-pw-text placeholder:text-pw-muted/60 focus:outline-none w-full'
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className='text-pw-muted hover:text-white'>
                  <X className='h-5 w-5' />
                </button>
              )}
            </div>

            {/* Absolute floating search results list */}
            {isSearchOpen && debouncedQuery && (
              <div className='absolute right-0 top-full mt-1 w-110 bg-[#0c0d1c]/60 bkblur border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50 max-h-[380px] overflow-y-auto custom-scrollbar p-1 gap-0.5'>
                {searchResults.length > 0 ?
                  <div className='space-y-1'>
                    {searchResults.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          setIsSearchOpen(false);
                          openSearchInput(false);
                          setSearchQuery('');
                        }}
                        className='p-1 px-1.5 rounded-xl hover:bg-white/2 border border-transparent hover:border-white/1 flex items-center gap-2 transition-all group block'>
                        
                        <div className='p-1 rounded-lg bg-pw-primary/10 text-pw-primary shrink-0 group-hover:scale-105 transition-transform flex align-center justify-center h-full'>
                          {item.category === 'Page' ?
                            <Layout className='h-5 w-5' />
                          : item.category === 'Tool' ?
                            <Wrench className='h-5 w-5' />
                          : item.category === 'Developer' ?
                            <Code2 className='h-5 w-5' />
                          : <Search className='h-5 w-5' />}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center justify-between gap-1'>
                            <span className='text-xs font-bold text-pw-text truncate'>
                              {item.title}
                            </span>
                            <span className='text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-pw-muted font-bold'>
                              {item.category}
                            </span>
                          </div>
                          <p className='text-[10px] text-pw-muted mt-0.5 line-clamp-1 leading-relaxed'>
                            {item.description}
                          </p>
                        </div>

                        <ChevronRight className='hidden group-hover:inline-flex h-3 w-3'/>
                      </Link>
                    ))}
                  </div>
                : <div className='py-6 text-center text-xs text-pw-muted'>
                    No tools or pages matched &quot;{debouncedQuery}&quot;
                  </div>
                }
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', overflowY: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className='lg:hidden border-t border-white/5 min-h-screen relative'
          style={{ backdropFilter: 'brightness(50%) blur(12px)' }}>
          <div className='flex flex-col gap-1 px-6 py-6'>
            <div
              ref={mobileSearchRef}
              className='relative w-full mb-4'>
              <div className='flex items-center gap-2 bg-[#0c0d1c]/50 bkblur border border-white/5 px-4 py-3 rounded-xl shadow-lg focus-within:border-pw-primary/80'>
                <Search className='h-4 w-4 text-pw-muted shrink-0' />
                {/* jules edit: Add enter key handling for mobile search */}
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      const firstResult = searchResults[0];
                      setMobileOpen(false);
                      setSearchQuery('');
                      router.push(firstResult.href);
                    }
                  }}
                  placeholder='Search tools, pages...'
                  className='bg-transparent border-none no-outline text-sm text-pw-text placeholder:text-pw-muted/60 focus:outline-none w-full'
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <X className='h-3.5 w-3.5 text-pw-muted' />
                  </button>
                )}
              </div>

              {/* Mobile search results dropdown */}
              {debouncedQuery && (
                <div className='absolute left-0 right-0 top-full mt-1 bg-pw-surface/90 bkblur border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-70 overflow-y-auto p-1.5 gap-1'>
                  {searchResults.length > 0 ?
                    searchResults.map((item) => (
                      <Link
                        title={item.description}
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          setMobileOpen(false);
                          setSearchQuery('');
                        }}
                        className='p-1 rounded-lg hover:bg-white/5 flex items-center justify-between text-xs text-pw-text'>
                        <div>
                          <span className='font-bold text-pw-primary block'>
                            {item.title}
                          </span>
                          <span className='text-[10px] text-pw-muted line-clamp-1'>
                            {item.description}
                          </span>
                        </div>
                        <ChevronRight className='h-3.5 w-3.5 text-pw-muted shrink-0' />
                      </Link>
                    ))
                  : <div className='p-3 text-center text-xs text-pw-muted'>
                      No results found
                    </div>
                  }
                </div>
              )}
            </div>

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
                      'flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                      isActive ?
                        'text-pw-cyan bg-pw-cyan/10 nav-glass bkblur'
                      : 'text-pw-muted hover:text-pw-text hover:bg-white/5',
                    )}>
                    {link && 'icon' in link && (
                      <link.icon className='h-4 w-4' />
                    )}
                    {link?.label}
                  </Link>
                );
              })}

            <div className='px-3 mt-5 text-[14px] font-bold uppercase tracking-widest text-pw-cyan'>
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
                    'flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    isActive ?
                      'text-pw-cyan bg-pw-cyan/10'
                    : 'text-pw-muted hover:text-pw-text hover:bg-white/5',
                  )}>
                  {'icon' in link && <link.icon className='h-4 w-4' />}
                  {link.label}
                </Link>
              );
            })}

            <div className='w-full pt-1 flex-1 flex items-center justify-center'>
              {isLoggedIn ?
                <Link
                  href='/dashboard'
                  onClick={() => setMobileOpen(false)}
                  className='btn-ghost text-sm text-center mt-4 h-12 flex-1'>
                  Dashboard
                </Link>
              : <Link
                  href='/login'
                  onClick={() => setMobileOpen(false)}
                  className='btn-primary text-sm text-center mt-4 h-12 flex-1'>
                  Sign In
                </Link>
              }
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
};
