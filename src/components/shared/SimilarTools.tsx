"use client";

import { tools } from "@/lib/general/data";
import { Card } from "@/components/ui/card";
import { ChevronRight, Sparkle } from "lucide-react";

interface SimilarToolsProps {
  currentToolId: string;
}

export default function SimilarTools({ currentToolId }: SimilarToolsProps) {
  // jules edit: Select up to 3 similar/suggested tools dynamically based on category or position
  const currentTool = tools.find(t => t.id === currentToolId);
  const currentCategory = currentTool?.category || "Utility";

  // Match tools in the same category first, then fallback to other categories
  let matches = tools.filter(t => t.id !== currentToolId && t.category === currentCategory);
  if (matches.length < 3) {
    const remaining = tools.filter(t => t.id !== currentToolId && !matches.includes(t));
    matches = [...matches, ...remaining];
  }

  const suggestedTools = matches.slice(0, 3);

  return (
    <div className="mt-20 space-y-6">
      <h2 className="text-2xl font-bold font-display flex items-center gap-2">
        <Sparkle className="h-5 w-5 text-pw-primary animate-spin-slow" /> Suggested Utilities
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {suggestedTools.map((tool) => (
          <a href={tool.href} key={tool.id} className="group">
            <Card className="card-glow p-5 flex flex-col h-full bg-[#0c0d1c] border border-white/5 hover:border-pw-primary/30 transition-all cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-xl group-hover:scale-105 transition-all">
                  <tool.icon className="h-5 w-5" style={{ color: tool.color }} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-pw-muted">
                  {tool.tag}
                </span>
              </div>
              <h4 className="text-base font-bold text-pw-text group-hover:text-pw-primary transition-colors flex items-center gap-1">
                {tool.title}
                <ChevronRight className="h-4 w-4 text-pw-muted group-hover:text-pw-primary transition-colors" />
              </h4>
              <p className="text-xs text-pw-muted mt-2 leading-relaxed flex-1">
                {tool.description}
              </p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
