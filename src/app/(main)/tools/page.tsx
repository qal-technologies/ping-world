"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  LayoutGrid, 
  ArrowRight,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {tools} from "@/lib/general/data";

const metadata = {
  title: "Tools",
  description: "Manage your content, engage your audience, and streamline your workflow with our premium tool suite.",
  keywords: ["Tools", "Tool", "Ping World", "pingwrld", "pingworld", "pingwrld tools", "pingwrld tool", "pingwrld pingworld", "pingwrld pingwrld", 'anon link', 'quiz', 'quizzable', 'editor', 'image', 'shortener', 'image toolkit','url shortener', 'qr code', 'word counter', 'word', 'counter', 'word counter pingwrld', 'word counter pingworld', 'word counter pingwrld pingworld', 'word counter pingwrld pingwrld', 'qal technology', 'Ping World', 'pingworld', 'pingwrld', 'qal tech', 'qal technologies', 'trending', 'trend'],
}

export default function ToolsHubPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const TOOLS = tools;

  const categories = ["All", ...Array.from(new Set(TOOLS.map(t => t.category)))];

  const filteredTools = TOOLS.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl min-h-screen">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className="max-w-2xl text-center md:text-left">
          <div className="badge mb-4 inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            Utility Suite
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold font-display leading-tight mb-4">
            Discover your <span className="gradient-text">World.</span>
          </h1>
          <p className="text-pw-muted text-lg">
            Manage your content, engage your audience, and streamline your workflow with our premium tool suite.
          </p>
        </div>
        
        <div className="w-full md:w-[400px]">
          <Card className="p-2 card-glow bg-white/5 border-white/10 group">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-pw-muted group-focus-within:text-pw-primary transition-colors" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools (e.g. 'quiz', 'link')..." 
                className="pl-12 h-8 bg-transparent border-none focus-visible:ring-0 text-lg"
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-12">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant="ghost"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "h-9 rounded-full px-6 transition-all cursor-pointer",
              activeCategory === cat 
                ? "bg-pw-primary text-white shadow-lg shadow-pw-primary/20" 
                : "bg-white/5 text-pw-muted hover:text-pw-text hover:bg-white/10"
            )}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool) => (
            <motion.div
              key={tool.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Link href={tool.href}>
                <Card className="card-glow h-full flex flex-col p-8 pb-5 group hover:border-pw-primary/30 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-xl group-hover:scale-110 group-hover:shadow-pw-primary/5 transition-all duration-500">
                      <tool.icon className="h-7 w-7" style={{ color: tool.color }} />
                    </div>
                    <div className="h-8 px-3 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest flex items-center text-pw-muted">
                      {tool.category}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold font-display mb-3 flex items-center gap-2 group-hover:text-pw-primary transition-colors">
                    {tool.title}
                    <ArrowRight className="h-5 w-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-pw-muted text-sm leading-relaxed flex-1">
                    {tool.description}
                  </p>
                  
                  <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between group-hover:border-pw-primary/10 transition-colors">
                    <span className="text-[10px] font-bold text-pw-muted tracking-widest font-mono">
                      v-{tool.version.v.toString()} ({tool.version.s})
                    </span>
                    <ChevronRight className="h-4 w-4 text-pw-muted group-hover:text-pw-primary" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTools.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <LayoutGrid className="h-10 w-10 text-pw-muted opacity-20" />
          </div>
          <h3 className="text-2xl font-bold">No tools found</h3>
          <p className="text-pw-muted mt-2">Try adjusting your search query or category.</p>
          <Button 
            variant="link" 
            onClick={() => { setSearch(""); setActiveCategory("All"); }}
            className="mt-4 text-pw-primary"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
