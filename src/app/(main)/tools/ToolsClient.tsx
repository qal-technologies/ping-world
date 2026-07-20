'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutGrid,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Filter,
  X,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { tools } from '@/lib/general/data';
import FeedbackWidget from '@/components/shared/FeedbackWidget';

export default function ToolsHubPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewCat, setViewCat] = useState(false);
  const [large, setLarge] = useState(false);
  const [wrappedCategories, setWrappedCategories] = useState<
    Record<string, boolean>
  >({});

  const [modalCategory, setModalCategory] = useState<string | null>(null);

  const TOOLS = tools;

  const matchesSearchText = (t: (typeof tools)[0], query: string) => {
    return (
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase()) ||
      t.tag.toLowerCase().includes(query.toLowerCase())
    );
  };

  useEffect(() => {
    const checkSize = () => {
      setLarge(window.innerWidth >= 768);
    };
    checkSize();
    window.addEventListener('resize', checkSize);

    return () => {
      window.removeEventListener('resize', checkSize);
    };
  }, []);

  const groupedTools: Record<string, typeof tools> = {};
  if (!search.trim()) {
    TOOLS.forEach((t) => {
      const cat = t.category;
      if (!groupedTools[cat]) groupedTools[cat] = [];
      groupedTools[cat].push(t);
    });
  }
  // Matching tools list (for flat search display)
  const filteredTools = TOOLS.filter((t) => {
    const matchesSearch = matchesSearchText(t, search);
    const matchesCategory =
      activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    'All',
    ...Array.from(new Set(TOOLS.map((t) => t.category))),
  ];

  return (
    <div className='container mx-auto py-12 max-w-7xl px-4 min-h-screen'>
      <div className='w-full flex flex-col md:flex-row items-center justify-between gap-6 mb-16'>
        <div className='max-w-2xl text-center md:text-left mb-2'>
          <div className='badge mb-4 inline-flex'>
            <Sparkles className='h-3.5 w-3.5' />
            Tool Space
          </div>
          <h1 className='text-4xl md:text-6xl font-extrabold font-display leading-tight mb-4'>
            Discover your <span className='gradient-text'>World.</span>
          </h1>
          <p className='text-pw-muted text-lg'>
            Access all the designed tools for quiz, social management, text
            editing, image editing and many more...
          </p>
        </div>

        <div className='w-full md:w-[400px] flex flex-wrap gap-2 items-center flex-1 px-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-4 top-5 -translate-y-1/2 h-5 w-5 text-pw-muted transition-colors' />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) setActiveCategory('All');
              }}
              placeholder='Search tools...'
              className='card-glow pl-12 h-11 bg-transparent border-none focus-visible:ring-0'
            />
          </div>
          <div
            className='p-2 card-glow rounded-xl w-11 h-11 flex-col flex items-center cursor-pointer opacity-90'
            onClick={() => setViewCat(!viewCat)}>
            {viewCat ?
              <X className='w-6 h-6 text-red-500' />
            : <Filter className='w-6 h-6' />}
          </div>

          {viewCat && (
            <div className='flex flex-wrap gap-2 min-w-full'>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant='ghost'
                  onClick={() => {
                    setActiveCategory(cat);
                    setSearch('');
                  }}
                  className={cn(
                    'h-8 rounded-full px-6 transition-all cursor-pointer text-[12px]',
                    activeCategory === cat ?
                      'bg-pw-primary text-white shadow-lg shadow-pw-primary/20'
                    : 'bg-white/5 text-pw-muted hover:text-pw-text hover:bg-white/10',
                  )}
                  style={{ letterSpacing: '0.5px' }}>
                  {cat.toUpperCase()}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RENDER GRID */}
      {
        search.trim() ?
          // FLAT LIST FOR ACTIVE SEARCH
          <div className='space-y-6'>
            <h3 className='text-lg font-bold text-pw-muted'>
              Search Results ({filteredTools.length})
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6'>
              <AnimatePresence mode='popLayout'>
                {filteredTools.map((tool) => (
                  <motion.div
                    key={tool.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}>
                    <Link href={tool.href}>
                      <Card className='card-glow bkblur h-full flex flex-col p-5 group hover:border-pw-primary/30 transition-all cursor-pointer'>
                        <div className='flex justify-between items-start mb-6'>
                          <div className='w-14 h-14 rounded-2xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-xl group-hover:scale-110 group-hover:shadow-pw-primary/5 transition-all duration-500'>
                            <tool.icon
                              className='h-7 w-7'
                              style={{ color: tool.color }}
                            />
                          </div>
                          <div className='h-6 px-3 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest flex items-center text-pw-muted'>
                            {tool.category}
                          </div>
                        </div>

                        <h3 className='text-2xl font-bold font-display mb-3 flex items-center gap-2 group-hover:text-pw-primary transition-colors'>
                          {tool.title}
                          <ArrowRight className='h-5 w-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all' />
                        </h3>
                        <p className='text-pw-muted text-sm leading-relaxed flex-1'>
                          {tool.description}
                        </p>

                        <div className='min-w-full flex items-end mt-4 '>
                          <Link
                            title={`Read about ${tool.title.toUpperCase()}, it's features and how to use it.`}
                            href={`/docs/${tool.id}`}
                            className='text-pw-muted text-xs underline cursor-pointer hover:text-pw-primary hover:font-bold'
                            style={{ letterSpacing: '0.5px' }}>
                            View Docs
                          </Link>
                        </div>

                        <div className='pt-5 border-t border-white/5 flex items-center justify-between group-hover:border-pw-primary/10 transition-colors'>
                          <span className='text-[10px] font-bold text-pw-muted tracking-widest font-mono'>
                            v-{tool.version.v.toString()} ({tool.version.s})
                          </span>
                          <ChevronRight className='h-4 w-4 text-pw-muted group-hover:text-pw-primary' />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          // CATEGORY-GROUPED STRUCTURE WITH 8 LIMIT + VIEW ALL MODAL
        : <div className='space-y-16'>
            {Object.keys(groupedTools).map((catName) => {
              // Apply category filter if activeCategory is selected
              if (activeCategory !== 'All' && activeCategory !== catName)
                return null;
              const categoryTools = groupedTools[catName];

              // Fix: use component-level Record state instead of useState inside map
              const wrapped = wrappedCategories[catName] ?? false;
              const toggleWrapped = () =>
                setWrappedCategories((prev) => ({
                  ...prev,
                  [catName]: !prev[catName],
                }));

              const displayedTools =
                wrapped && !large ?
                  [categoryTools[0]]
                : categoryTools.slice(0, 4);
              const hasMore =
                (wrapped && !large && categoryTools.length > 1) ||
                categoryTools.length > 4;

              return (
                <section
                  key={catName}
                  className='space-y-6'>
                  <div className='flex justify-between items-center border-b border-white/5 pb-2 mx-2 px-2'>
                    <h2 className='text-lg md:text-xl sm:text-2xl font-bold font-display text-pw-text'>
                      {catName}
                    </h2>
                    <span
                      onClick={() => {
                        if (!large) toggleWrapped();
                      }}
                      title='Wrap this category'
                      className='text-xs text-pw-muted font-bold font-mono uppercase tracking-widest flex gap-1 cursor-pointer'>
                      {categoryTools.length} Tools
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 sm:hidden',
                          wrapped && 'rotate-[90deg]',
                        )}
                      />
                    </span>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6 '>
                    {displayedTools.map((tool) => (
                      <Link
                        href={tool.href}
                        key={tool.id}>
                        <Card className='card-glow bkblur h-full flex flex-col p-5 group hover:border-pw-primary/30 transition-all cursor-pointer'>
                          <div className='flex justify-between items-start mb-6'>
                            <div className='w-14 h-14 rounded-2xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-xl group-hover:scale-110 group-hover:shadow-pw-primary/5 transition-all duration-500'>
                              <tool.icon
                                className='h-7 w-7'
                                style={{ color: tool.color }}
                              />
                            </div>
                            <span className='text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-pw-muted'>
                              {tool.tag}
                            </span>
                          </div>

                          <h3 className='text-2xl font-bold font-display mb-3 flex items-center gap-2 group-hover:text-pw-primary transition-colors'>
                            {tool.title}
                            <ArrowRight className='h-5 w-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all' />
                          </h3>
                          <p className='text-pw-muted text-sm leading-relaxed flex-1 mb-4'>
                            {tool.description}
                          </p>

                          <div className='min-w-full flex items-end mb-4 '>
                            <Link
                              title={`Read about ${tool.title.toUpperCase()}, its features and how to use it.`}
                              href={`/docs/${tool.id}`}
                              className='text-pw-muted text-xs underline cursor-pointer hover:text-pw-primary hover:font-bold'
                              style={{ letterSpacing: '0.5px' }}>
                              View Docs
                            </Link>
                          </div>

                          <div className='pt-5 border-t border-white/5 flex items-center justify-between group-hover:border-pw-primary/10 transition-colors'>
                            <span className='text-[10px] font-bold text-pw-muted tracking-widest font-mono'>
                              v-{tool.version.v.toString()} ({tool.version.s})
                            </span>
                            <ChevronRight className='h-4 w-4 text-pw-muted group-hover:text-pw-primary' />
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                  {hasMore && (
                    <div className='min-w-full flex flex-col items-center'>
                      <div
                        onClick={() => setModalCategory(catName)}
                        className='glass rounded-2xl border-dashed border-pw-primary/20 hover:border-pw-primary/50 bkblur h-full justify-center p-2 text-center cursor-pointer group transition-all w-[80%] hover:w-[85%] max-w-[350px] opacity-90 hover:opacity-100 flex gap-2 items-center'>
                        <Eye className='h-5 w-5 text-pw-primary group-hover:scale-110 transition-transform' />
                        <p className='font-bold text-sm'>
                          View All {catName} Tools
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

      }

      {/* EMPTY SEARCH CASE */}
      {search.trim() && filteredTools.length === 0 && (
        <div className='flex flex-col items-center justify-center py-24 text-center'>
          <div className='w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6'>
            <LayoutGrid className='h-10 w-10 text-pw-muted opacity-20' />
          </div>
          <h3 className='text-2xl font-bold'>No tools found</h3>
          <p className='text-pw-muted mt-2'>
            Try adjusting your search query or category.
          </p>
          <Button
            variant='link'
            onClick={() => {
              setSearch('');
              setActiveCategory('All');
            }}
            className='mt-4 text-pw-primary'>
            Clear all filters
          </Button>
        </div>
      )}
      {/* DYNAMIC VIEW-ALL MODAL */}
      <AnimatePresence>
        {modalCategory && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='w-full max-w-4xl bg-pw-surface border border-white/10 rounded-3xl h-[85vh] overflow-hidden'>
              <div className='flex justify-between items-center border-b border-white/5 p-5 pt-8 sm:p-8 pb-4'>
                <div>
                  <h3 className='text-2xl font-bold font-display text-pw-text'>
                    {modalCategory}
                  </h3>
                  <p className='text-xs text-pw-muted mt-0.5'>
                    Explore the complete catalog of{' '}
                    {modalCategory.toLowerCase()}
                  </p>
                </div>
                <Button
                  onClick={() => setModalCategory(null)}
                  variant='outline'
                  className='h-10 w-10 p-0 rounded-full border-white/10 hover:bg-white/5'>
                  <X className='h-5 w-5' />
                </Button>
              </div>

              <div
                className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 h-[90%] gap-6 overflow-y-auto p-5 sm:p-8  pb-10'
                style={{ scrollbarWidth: 'none' }}>
                {TOOLS.filter((t) => t.category === modalCategory).map(
                  (tool) => (
                    <Link
                      href={tool.href}
                      key={tool.id}
                      onClick={() => setModalCategory(null)}>
                      <Card className='card-glow p-5 flex flex-col h-full bg-white/[0.01] hover:border-pw-primary/25 cursor-pointer group'>
                        <div className='flex items-center gap-3 mb-4'>
                          <div className='w-10 h-10 rounded-xl flex items-center justify-center bg-pw-surface border border-white/5'>
                            <tool.icon
                              className='h-5 w-5'
                              style={{ color: tool.color }}
                            />
                          </div>
                          <span className='text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-pw-muted'>
                            {tool.tag}
                          </span>
                        </div>
                        <h4 className='font-bold text-lg text-pw-text group-hover:text-pw-primary transition-colors'>
                          {tool.title}
                        </h4>
                        <p className='text-xs text-pw-muted mt-2 leading-relaxed flex-1 mb-4'>
                          {tool.description}
                        </p>

                        <div className='min-w-full flex items-end mb-4 '>
                          <Link
                            title={`Read about ${tool.title.toUpperCase()}, its features and how to use it.`}
                            href={`/docs/${tool.id}`}
                            className='text-pw-muted text-xs underline cursor-pointer hover:text-pw-primary hover:font-bold'
                            style={{ letterSpacing: '0.5px' }}>
                            View Docs
                          </Link>
                        </div>

                        <div className='pt-3 border-t border-white/5 text-[10px] font-bold text-pw-muted font-mono'>
                          v-{tool.version.v.toString()} ({tool.version.s})
                        </div>
                      </Card>
                    </Link>
                  ),
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className='divider h-1 my-16' />

      {/* EMBED FEEDBACK WIDGET AT BOTTOM */}
      <FeedbackWidget />
    </div>
  );
}
