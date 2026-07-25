'use client';

import { useState } from 'react';
import { Palette, Sparkles, Code, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StylingEngine } from '@/lib/dev-engines/styling-engine';
import { toast } from 'sonner';

export default function StylingPreviewer() {
  const [primaryColor, setPrimaryColor] = useState('#00f0ff');
  const [theme, setTheme] = useState<'cyber' | 'glass' | 'dark'>('cyber');
  const [injected, setInjected] = useState(false);

  const engine = new StylingEngine();
  const cssCode = engine.generateCSS({ primaryColor, theme });

  const handleToggleInject = () => {
    if (!injected) {
      engine.injectToDOM({ primaryColor, theme });
      setInjected(true);
      toast.success('Styling Engine CSS injected globally to DOM head!');
    } else {
      const el = document.getElementById('pingworld_styling_engine');
      if (el) el.remove();
      setInjected(false);
      toast.info('Removed injected CSS from DOM.');
    }
  };

  return (
    <Card className="card-glow bkblur p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold font-display flex items-center gap-2">
          <Palette className="h-5 w-5 text-pw-primary" />
          Liquid Glass & Button Styling Studio
        </h3>
        <Button
          onClick={handleToggleInject}
          variant={injected ? 'default' : 'outline'}
          size="sm"
          className={`h-8 text-xs font-bold gap-1.5 ${injected ? 'bg-emerald-500 text-black' : 'border-white/10'}`}
        >
          {injected ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-pw-primary" />}
          {injected ? 'CSS Injected to DOM' : 'Inject CSS to DOM'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Theme Style</label>
          <div className="grid grid-cols-3 gap-2">
            {(['cyber', 'glass', 'dark'] as const).map(t => (
              <Button
                key={t}
                variant={theme === t ? 'default' : 'outline'}
                onClick={() => setTheme(t)}
                className={`h-9 text-xs capitalize ${theme === t ? 'bg-pw-primary text-black font-bold' : 'border-white/10'}`}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Primary Accent</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10"
            />
            <span className="font-mono text-sm font-bold text-pw-primary">{primaryColor}</span>
          </div>
        </div>
      </div>

      {/* Live Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Liquid Glass Card */}
        <div
          className="p-6 rounded-2xl border border-white/20 backdrop-blur-xl flex flex-col gap-3 transition-all"
          style={{ background: 'rgba(255, 255, 255, 0.05)', boxShadow: `0 8px 32px 0 ${primaryColor}20` }}
        >
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-pw-muted">Liquid Glass Container</span>
          <h4 className="text-xl font-bold font-display" style={{ color: primaryColor }}>Cyberpunk Glassmorphism</h4>
          <p className="text-xs text-pw-muted leading-relaxed">
            Smooth backdrop blur with dynamic HSL color glows and custom padding utilities (`.pw-p-6`, `.pw-m-4`).
          </p>
          <button
            className="h-10 px-5 rounded-xl font-bold text-xs transition-all shadow-lg mt-2"
            style={{ backgroundColor: primaryColor, color: '#000', boxShadow: `0 0 20px ${primaryColor}60` }}
          >
            Liquid Button
          </button>
        </div>

        {/* CSS Code Snippet */}
        <div className="rounded-2xl bg-black/60 border border-white/10 p-4 font-mono text-xs overflow-x-auto max-h-[180px]">
          <span className="text-[10px] text-pw-muted block mb-2">// Generated CSS Code:</span>
          <pre className="text-pw-primary">{cssCode}</pre>
        </div>
      </div>
    </Card>
  );
}
