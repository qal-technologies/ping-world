"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Layout, 
  Sparkles, 
  Eye, 
  Settings, 
  Check,
  Zap,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {cn} from "@/lib/utils";

const metadata = {
  title: 'Editor',
  description: 'Edit and enhance your texts and documents with our powerful toolkit (from Ping World).',
  keywords: ['Editor', 'Text', 'Documents', 'Ping World', 'word doc', 'doc', 'Ping World', 'pingworld', 'pingwrld', 'qal tech', 'qal technologies', 'trending', 'trend'],
}

// Dynamic imports for heavy editor components
const TiptapEditor = dynamic(() => import("@/components/editor/tiptap-editor"), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] skeleton animate-pulse" />,
});

const CanvasEditor = dynamic(() => import("@/components/editor/canvas-editor"), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] skeleton animate-pulse" />,
});

export default function EditorPage() {
  const [mode, setMode] = useState<"document" | "canvas">("document");
  const [content, setContent] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pingworld-editor-content") || "";
    }
    return "";
  });

  // Auto-save to local storage
  useEffect(() => {
    localStorage.setItem("pingworld-editor-content", content);
  }, [content]);

  // Live stats from content
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="badge mb-4">
            <Sparkles className="h-3 w-3" />
            Ping World Editor
          </div>
          <h1 className="text-4xl font-extrabold font-display">Craft your <span className="gradient-text">masterpiece.</span></h1>
          <p className="mt-2 text-pw-muted">Switch between rich document editing and visual post creation.</p>
        </div>

        <div className="flex p-1 bg-pw-surface border border-white/5 rounded-xl self-start">
          <button
            onClick={() => setMode("document")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              mode === "document" 
                ? "bg-pw-primary text-white shadow-lg" 
                : "text-pw-muted hover:text-pw-text"
            )}
          >
            <FileText className="h-4 w-4" /> Document
          </button>
          <button
            onClick={() => setMode("canvas")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              mode === "canvas" 
                ? "bg-pw-primary text-white shadow-lg" 
                : "text-pw-muted hover:text-pw-text"
            )}
          >
            <Layout className="h-4 w-4" /> Post Card
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Editor Area */}
        <div className="xl:col-span-3">
          <AnimatePresence mode="wait">
            {mode === "document" ? (
              <motion.div
                key="document"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <TiptapEditor content={content} onChange={setContent} />
              </motion.div>
            ) : (
              <motion.div
                key="canvas"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CanvasEditor />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Controls/Stats */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="card-glow p-6">
            <h3 className="text-sm font-bold font-display flex items-center gap-2 mb-6 uppercase tracking-wider">
              <Zap className="h-4 w-4 text-pw-primary" /> Live Stats
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-pw-muted">
                  <div className="p-2 bg-pw-primary/10 rounded-lg">
                    <FileText className="h-4 w-4 text-pw-primary" />
                  </div>
                  <span className="text-sm">Words</span>
                </div>
                <span className="text-lg font-bold">{wordCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-pw-muted">
                  <div className="p-2 bg-pw-secondary/10 rounded-lg">
                    <Check className="h-4 w-4 text-pw-secondary" />
                  </div>
                  <span className="text-sm">Characters</span>
                </div>
                <span className="text-lg font-bold">{charCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-pw-muted">
                  <div className="p-2 bg-pw-success/10 rounded-lg">
                    <BookOpen className="h-4 w-4 text-pw-success" />
                  </div>
                  <span className="text-sm">Reading Time</span>
                </div>
                <span className="text-lg font-bold">{readingTime} min</span>
              </div>
            </div>
          </Card>

          <Card className="card-glow p-6">
            <h3 className="text-sm font-bold font-display flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Settings className="h-4 w-4 text-pw-primary" /> Editor Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-pw-muted">Auto-save</span>
                <span className="text-pw-success font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" /> Enabled
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-pw-muted">Local Storage</span>
                <span className="text-pw-primary font-medium">85 KB</span>
              </div>
              <Button variant="outline" className="w-full h-10 border-white/5 bg-white/5 hover:bg-white/10 gap-2 mt-2">
                <Eye className="h-4 w-4" /> Preview Mode
              </Button>
            </div>
          </Card>

          <div className="bg-pw-primary/5 border border-pw-primary/10 rounded-2xl p-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pw-primary mb-4 shadow-xl shadow-pw-primary/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-sm font-bold mb-2">AI Writing Assistant</h4>
            <p className="text-xs text-pw-muted leading-relaxed mb-4">
              Need help with your content? Let our AI suggest headlines or polish your text.
            </p>
            <Button className="w-full btn-primary h-9 text-xs">Unlock AI Tools</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
