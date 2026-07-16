'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutGrid,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Filter,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { tools } from '@/lib/general/data';

const metadata = {
  title: 'Tools',
  description:
    'Access all the designed tools for quiz, social management, text editing, image editing and many more.',
  keywords: [
    'Tools',
    'Tool',
    'Ping World',
    'pingwrld',
    'pingworld',
    'pingwrld tools',
    'pingwrld tool',
    'pingwrld pingworld',
    'pingwrld pingwrld',
    'anon link',
    'quiz',
    'quizzable',
    'editor',
    'image',
    'shortener',
    'image toolkit',
    'url shortener',
    'qr code',
    'word counter',
    'word',
    'counter',
    'word counter pingwrld',
    'word counter pingworld',
    'word counter pingwrld pingworld',
    'word counter pingwrld pingwrld',
    'qal technology',
    'Ping World',
    'pingworld',
    'pingwrld',
    'qal tech',
    'qal technologies',
    'trending',
    'trend',
  ],
};

export default function ToolsHubPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewCat, setViewCat] = useState(false);

  const TOOLS = tools;

  const categories = [
    'All',
    ...Array.from(new Set(TOOLS.map((t) => t.category))),
  ];

  const filteredTools = TOOLS.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className='container mx-auto px-6 py-12 max-w-7xl min-h-screen'>
      <div className='w-full flex flex-col md:flex-row items-center justify-between gap-6 mb-16'>
        <div className='max-w-2xl text-center md:text-left mb-2'>
          <div className='badge mb-4 inline-flex'>
            <Sparkles className='h-3.5 w-3.5' />
            Utility Suite
          </div>
          <h1 className='text-4xl md:text-6xl font-extrabold font-display leading-tight mb-4'>
            Discover your <span className='gradient-text'>World.</span>
          </h1>
          <p className='text-pw-muted text-lg'>
            Access all the designed tools for quiz, social management, text
            editing, image editing and many more...
          </p>
        </div>

        <div className='w-full md:w-[400px] flex flex-wrap gap-2 items-center flex-1'>
          <div className='relative flex-1'>
            <Search className='absolute left-4 top-5 -translate-y-1/2 h-5 w-5 text-pw-muted transition-colors' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools (e.g. 'quiz', 'link')..."
              className='card-glow pl-12 h-11 bg-transparent border-none focus-visible:ring-0 text-lg'
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
                  onClick={() => setActiveCategory(cat)}
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

      {filteredTools.length === 0 && (
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
    </div>
  );
}
