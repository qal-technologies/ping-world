'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutGrid,
  ArrowRight,
  ChevronRight,
  Sparkles,
  X,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { tools } from '@/lib/general/data';
import FeedbackWidget from '@/components/shared/FeedbackWidget';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';

export default function ToolsHubPage() {
  const { premiumTier } = useAppContext();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [large, setLarge] = useState(false);
  const router = useRouter();
  const [wrappedCategories, setWrappedCategories] = useState<
    Record<string, boolean>
  >({});

  const [modalCategory, setModalCategory] = useState<string | null>(null);

  const TOOLS = tools;

  const matchesSearchText = (t: (typeof tools)[0], query: string) => {
    const q = query.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(q);
    const descMatch = t.description.toLowerCase().includes(q);
    const tagMatch = t.tag.toLowerCase().includes(q);
    return titleMatch || descMatch || tagMatch;
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

  const handleToolClick = (e: React.MouseEvent, tool: any) => {
    if ((tool as any).proOnly && premiumTier !== 'pro') {
      e.preventDefault();
      toast.info(
        `⭐ PRO Tool: "${tool.title}" is exclusive to Pro subscribers. Upgrade your plan to gain access!`,
      );
    }
  };

  const groupedTools: Record<string, typeof tools> = {};
  TOOLS.forEach((t) => {
    const cat = t.category;
    if (!groupedTools[cat]) groupedTools[cat] = [];
    groupedTools[cat].push(t);
  });

  // Matching tools list prioritizing title match first
  const filteredTools = TOOLS.filter((t) => {
    const matchesSearch = matchesSearchText(t, search);
    const matchesCategory =
      activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (!search.trim()) return 0;
    const q = search.toLowerCase();
    const aTitle = a.title.toLowerCase().includes(q);
    const bTitle = b.title.toLowerCase().includes(q);
    if (aTitle && !bTitle) return -1;
    if (!aTitle && bTitle) return 1;
    return 0;
  });

  const categories = [
    'All',
    ...Array.from(new Set(TOOLS.map((t) => t.category))),
  ];

  return (
    <div className='container mx-auto py-12 max-w-7xl px-1 min-h-screen'>
      <div className='w-full flex flex-col md:flex-row items-center justify-between gap-6 mb-16 flex-wrap md:px-2 lg:px-3'>
        <div className='max-w-2xl text-center md:text-left mb-2'>
          <div className='badge mb-4 inline-flex'>
            <Sparkles className='h-3.5 w-3.5' />
            Tool Space
          </div>
          <h1 className='text-4xl md:text-6xl font-extrabold font-display leading-tight mb-4'>
            Discover your <span className='gradient-text'>World.</span>
          </h1>
          <p className='text-pw-muted px-2 sm:text-lg'>
            Access all the designed tools for quiz, social management, text
            editing, image editing and many more...
          </p>
        </div>

        <div className='w-full md:min-w-[280px] flex flex-wrap gap-2 items-center flex-1 px-4 relative'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-5 z-10 -translate-y-1/2 h-5 w-5 text-pw-muted transition-colors' />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) setActiveCategory('All');
              }}
              placeholder='Search tools...'
              className='card-glow pl-10 z-0 h-10 bg-transparent border-none'
            />

            {/* Absolute floating search overlay prioritizing titles */}
            {search.trim().length > 0 && (
              <div className='absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto bg-[#0a0c1b]/60 bkblur border border-white/10 rounded-2xl shadow-2xl p-1 space-y-1 custom-scrollbar'>
                {filteredTools.length === 0 ?
                  <p className='p-3 text-xs text-pw-muted text-center italic'>
                    No tools found matching &quot;{search}&quot;
                  </p>
                : filteredTools.slice(0, 10).map((tool) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={(e) => handleToolClick(e, tool)}
                      className='flex items-center justify-between p-2 rounded-xl hover:bg-pw-primary/10 transition-all group'>
                      <div className='min-w-0 pr-2'>
                        <p className='text-xs font-bold text-white transition-colors truncate'>
                          {tool.title} ●
                          <span className='text-[9px] font-bold uppercase tracking-wider text-pw-cyan shrink-0 ml-1'>
                            {tool.category}
                          </span>
                        </p>
                        <p className='text-[10px] text-pw-muted truncate'>
                          {tool.description}
                        </p>
                      </div>
                    </Link>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Dropdown and Direct Tool Launcher */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 px-4 w-full'>
        <div className='flex items-center gap-2.5 w-full sm:w-auto'>
          <span className='text-xs font-bold text-pw-muted uppercase font-mono tracking-wider shrink-0'>
            Quick Tool:
          </span>
          <select
            onChange={(e) => {
              if (e.target.value) {
                const targetHref = e.target.value;
                const toolObj = TOOLS.find((t) => t.href === targetHref);
                if (
                  toolObj &&
                  (toolObj as any).proOnly &&
                  premiumTier !== 'pro'
                ) {
                  toast.info(
                    `⭐ PRO Tool: "${toolObj.title}" is exclusive to Pro subscribers.`,
                  );
                  return;
                }
                router.push(targetHref);
              }
            }}
            defaultValue=''
            className='h-10 rounded-xl bg-pw-surface/50 border border-white/10 px-4 font-mono text-xs text-pw-text focus:outline-none focus:border-pw-primary cursor-pointer w-full sm:w-64 accent:bg-pw-primary/60'>
            <option
              value=''
              disabled
              className='bg-pw-surface text-pw-muted'>
              Select Tool...
            </option>
            {Object.entries(groupedTools).map(([cat, categoryTools]) => (
              <optgroup
                key={cat}
                label={cat.toUpperCase()}
                className='bg-pw-surface text-pw-primary font-bold'>
                {categoryTools.map((t) => (
                  <option
                    key={t.href}
                    value={t.href}
                    className='bg-pw-surface text-pw-text font-normal'>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
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
                  <ToolCard
                    tool={tool}
                    key={tool.id + 'card'}
                    onClick={(e) => handleToolClick(e, tool)}
                  />
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
                      {categoryTools.length}{' '}
                      {categoryTools.length > 1 ? 'Tools' : 'Tool'}
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
                      <ToolCard
                        tool={tool}
                        key={tool.id + 'card'}
                        onClick={(e) => handleToolClick(e, tool)}
                      />
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
                    <ToolCard
                      tool={tool}
                      key={tool.id + 'card'}
                      onClick={(e) => handleToolClick(e, tool)}
                    />
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

type toolstt = typeof tools;
interface ToolsType extends toolstt {
  id: string;
  href: string;
  icon: any;
}

const ToolCard = ({
  tool,
  onClick,
}: {
  tool: any;
  onClick: (e: any, tool: typeof tools) => void;
}) => {
  return (
    <motion.div
      key={tool.id + 'inner-card'}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}>
      <Link
        href={tool.href}
        onClick={(e) => onClick(e, tool)}>
        <Card className='card-glow bkblur h-full flex flex-col p-4 group hover:border-pw-primary/30 transition-all cursor-pointer rounded-2xl'>
          <div className='relative flex flex-wrap gap-3 items-center'>
            <div className='w-14 h-14 rounded-2xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-xl group-hover:scale-110 group-hover:shadow-pw-primary/5 transition-all duration-500'>
              <tool.icon
                className='h-7 w-7'
                style={{ color: tool.color }}
              />
            </div>

            <div className='flex items-start gap-1 flex-wrap flex-col'>
              <h3 className='text-xl font-bold font-display group-hover:text-pw-primary transition-colors flex gap-1 items-center'>
                {tool.title}
                <ArrowRight className='h-5 w-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all' />
              </h3>
              <div className='flex items-center gap-1.5'>
                <div className='text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/2.5 border border-white/5 text-pw-muted'>
                  {tool.category}
                </div>
                {(tool as any).proOnly && (
                  <span className='text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-500'>
                    PRO
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className='text-pw-muted leading-relaxed flex-1 text-sm font-medium'>
            {tool.description}
          </p>

          <div className='min-w-full flex items-end '>
            <Link
              title={`Read about ${tool.title.toUpperCase()}, it's features and how to use it.`}
              href={`/docs/${tool.id}`}
              className='text-pw-muted text-xs underline cursor-pointer hover:text-pw-cyan hover:font-bold'
              style={{ letterSpacing: '0.5px' }}>
              View Docs
            </Link>
          </div>

          <div className='pt-5 border-t border-white/5 flex items-center justify-between group-hover:border-pw-primary/10 transition-colors'>
            <span className='text-[10px] font-bold text-white/40 tracking-widest font-mono'>
              v-{tool.version.v.toString()} ({tool.version.s})
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
};
