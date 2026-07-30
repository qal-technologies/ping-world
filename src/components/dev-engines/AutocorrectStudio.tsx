'use client';

import { useState, useRef, useEffect } from 'react';
import { Type, RotateCcw, History, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AutoCorrectEngine } from '@/lib/dev-engines/autocorrect';
import { toast } from 'sonner';

export default function AutocorrectStudio() {
  const [inputText, setInputText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [typos, setTypos] = useState<any[]>([]);
  const engineRef = useRef<AutoCorrectEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AutoCorrectEngine();
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Live check: If the last character entered is a space or punctuation, trigger autocorrect
    if (val.endsWith(' ') || val.endsWith('.') || val.endsWith(',') || val.endsWith('!') || val.endsWith('?')) {
      const result = engineRef.current!.analyze(val);
      if (result.correctedText !== val) {
        // Save current into history before replacing
        setHistory(prev => {
          const next = [...prev, val];
          return next.slice(-5); // keep last 5
        });
        setInputText(result.correctedText);
        setCorrectedText(result.correctedText);
        setTypos(result.corrections);
        toast.success('Auto-corrected spelling typo!', { duration: 1500 });
      }
    } else {
      // General analysis without replacement for live UI suggestions
      const result = engineRef.current!.analyze(val);
      setCorrectedText(result.correctedText);
      setTypos(result.corrections);
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setInputText(prev);
      setHistory(prevHistory => prevHistory.slice(0, -1));
      const result = engineRef.current!.analyze(prev);
      setCorrectedText(result.correctedText);
      setTypos(result.corrections);
      toast.info('Correction undone.', { duration: 1500 });
    } else {
      toast.error('No correction history to undo.');
    }
  };

  return (
    <Card className="card-glow bkblur p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold font-display flex items-center gap-2">
          <Type className="h-5 w-5 text-pw-primary" />
          Smart Live-Typing AutoCorrect Sandbox
        </h3>
        <span className="text-xs font-mono text-pw-muted bg-white/5 px-2.5 py-1 rounded-full">
          Phonetic & Suffix Check
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Textarea input */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-pw-muted">
              Type your text (Try typing "teh devloper is runing coding"):
            </label>
            {history.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUndo}
                className="h-7 text-[11px] gap-1 px-2 border-pw-primary/30 text-pw-primary hover:bg-pw-primary/10"
              >
                <RotateCcw className="h-3 w-3" />
                Undo Correct
              </Button>
            )}
          </div>
          <textarea
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type some text here..."
            rows={5}
            className="w-full rounded-xl bg-pw-surface/50 border border-white/10 p-4 font-mono text-sm text-pw-text focus:outline-none focus:border-pw-primary resize-y"
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-pw-muted font-bold flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              Undo History ({history.length}/5):
            </span>
            {history.map((h, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded cursor-pointer hover:bg-white/10 max-w-[120px] truncate"
                title={h}
                onClick={() => {
                  setInputText(h);
                  const result = engineRef.current!.analyze(h);
                  setCorrectedText(result.correctedText);
                  setTypos(result.corrections);
                }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: Corrected output & detections */}
        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold uppercase tracking-wider text-pw-muted">
            Live Analysis & Corrected Output:
          </label>
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-sm text-pw-text min-h-[100px] leading-relaxed whitespace-pre-wrap">
            {inputText ? (
              <span>{inputText}</span>
            ) : (
              <span className="text-pw-muted italic">Suggestions will appear here as you type...</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-pw-muted">
              Detected Typos & Fixes:
            </span>
            {typos.length === 0 ? (
              <div className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                <Check className="h-4 w-4" />
                All words spelled correctly or match phonetic stems.
              </div>
            ) : (
              <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-2">
                {typos.map((typo, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg"
                  >
                    <span className="font-mono text-rose-400">
                      "{typo.word}" &rarr; <span className="font-bold text-emerald-400">"{typo.suggestion}"</span>
                    </span>
                    <span className="text-[10px] text-pw-muted font-mono">{typo.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
