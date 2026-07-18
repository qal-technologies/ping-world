// jules edit: Extracted client-side Word Counter implementation to support server-side SEO & metadata compilation
"use client";

import { useState } from "react";
import {
  FileText,
  Trash2,
  Sparkles,
  Clock,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function WordCounterPage() {
  const [text, setText] = useState("");

  const handleClear = () => {
    setText("");
    toast.success("Text cleared!");
  };

  const getStats = () => {
    const raw = text.trim();
    if (!raw) {
      return {
        words: 0,
        chars: 0,
        sentences: 0,
        paragraphs: 0,
        readTime: 0,
        readability: "Easy"
      };
    }

    const words = raw.split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const sentences = raw.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = raw.split(/\n+/).filter(p => p.trim().length > 0).length;

    // Estimate read time: ~200 WPM
    const readTime = Math.max(1, Math.round((words / 200) * 60));

    // Basic readability index based on character density per word
    const density = chars / Math.max(1, words);
    let readability = "Easy";
    if (density > 6.5) readability = "Complex";
    else if (density > 5.2) readability = "Medium";

    return {
      words,
      chars,
      sentences,
      paragraphs,
      readTime,
      readability
    };
  };

  const stats = getStats();

  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <FileText className='h-3.5 w-3.5' />
            Content Suite
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Lexical <span className='gradient-text'>Analyzer.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Count words, characters, sentences, paragraphs, and estimate complexity in real-time.
          </p>
        </div>
        {text && (
          <Button
            variant='outline'
            onClick={handleClear}
            className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
            <Trash2 className='h-4 w-4' /> Clear Text
          </Button>
        )}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Input Panel */}
        <div className='lg:col-span-8 space-y-6'>
          <Card className='card-glow p-6 relative'>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your content here to begin analyzing..."
              className="w-full h-96 bg-transparent text-pw-text text-sm leading-relaxed placeholder:text-pw-muted/40 focus:outline-none resize-none border-none"
            />
          </Card>
        </div>

        {/* Real-time Stats Panel */}
        <div className='lg:col-span-4 flex flex-col gap-6'>
          <Card className='card-glow p-8 space-y-6'>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pw-primary" /> Analysis Stats
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <p className="text-[10px] text-pw-muted font-bold uppercase tracking-wider">Words</p>
                <span className="text-2xl font-bold font-display text-pw-text">{stats.words}</span>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <p className="text-[10px] text-pw-muted font-bold uppercase tracking-wider">Characters</p>
                <span className="text-2xl font-bold font-display text-pw-text">{stats.chars}</span>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <p className="text-[10px] text-pw-muted font-bold uppercase tracking-wider">Sentences</p>
                <span className="text-2xl font-bold font-display text-pw-text">{stats.sentences}</span>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <p className="text-[10px] text-pw-muted font-bold uppercase tracking-wider">Paragraphs</p>
                <span className="text-2xl font-bold font-display text-pw-text">{stats.paragraphs}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-pw-muted flex items-center gap-2">
                  <Clock className="h-4 w-4 text-pw-secondary" /> Read Time
                </span>
                <span className="font-mono font-bold text-pw-text">{stats.readTime} seconds</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-pw-muted flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-pw-success" /> Readability
                </span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded-full border text-[10px]",
                  stats.readability === "Easy" && "text-pw-success bg-pw-success/10 border-pw-success/20",
                  stats.readability === "Medium" && "text-pw-warning bg-pw-warning/10 border-pw-warning/20",
                  stats.readability === "Complex" && "text-pw-danger bg-pw-danger/10 border-pw-danger/20"
                )}>
                  {stats.readability}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
