'use client';

import { useState, useEffect } from 'react';
import { Palette, Copy, Check, Eye, Sun, Sparkles, MessageSquare, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ColorSuggestionEngine } from '@/lib/dev-engines/color-suggestion';
import { toast } from 'sonner';

export default function ColorDevTool() {
  const [colorInput, setColorInput] = useState('#00f0ff');
  const [compareInput, setCompareInput] = useState('#111625');
  const [copied, setCopied] = useState(false);

  // Mentions text extractor states
  const [mentionsText, setMentionsText] = useState('We designed the background with navy and highlights in coral under the lightyellow sun.');
  const [extractedColors, setExtractedColors] = useState<{ name: string; hex: string }[]>([]);

  const engine = new ColorSuggestionEngine();
  const details = engine.detect(colorInput);
  const comparison = engine.compare(colorInput, compareInput);
  const shades = engine.suggestShades(colorInput, 6);

  useEffect(() => {
    // Scan text for standard CSS named colors or hex values
    const words = mentionsText.toLowerCase().split(/[\s,.:;!?]+/);
    const found: { name: string; hex: string }[] = [];

    // Helper to detect hex pattern
    const hexPattern = /#(?:[0-9a-f]{3}){1,2}\b/gi;
    const matches = mentionsText.match(hexPattern) || [];
    matches.forEach(m => {
      found.push({ name: m, hex: m });
    });

    const CSS_COLORS_LIST = [
      'black', 'white', 'red', 'lime', 'blue', 'yellow', 'cyan', 'magenta', 'silver', 'gray', 'maroon', 'olive', 'green', 'purple', 'teal', 'navy', 'orange', 'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'blanchedalmond', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblack', 'darkslateblue', 'darkslategray', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'greenyellow', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightsteelblue', 'lightyellow', 'limegreen', 'linen', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'oldlace', 'olivedrab', 'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'rosypink', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'skyblue', 'slateblack', 'slateblue', 'slategray', 'snow', 'springgreen', 'steelblue', 'tan', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'yellowgreen'
    ];

    words.forEach(w => {
      if (CSS_COLORS_LIST.includes(w)) {
        // Resolve hex code
        const d = engine.detect(w);
        if (d && !found.some(f => f.name === w)) {
          found.push({ name: w, hex: d.hex });
        }
      }
    });

    setExtractedColors(found);
  }, [mentionsText]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`Copied ${text} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className='bg-transparent ring-0 sm:ring-1 sm:bg-pw-glass sm:glass sm:bkblur p-3 sm:p-6 flex flex-col gap-6'>
      <div className='flex justify-between items-center border-b border-white/5 pb-4'>
        <h3 className='text-lg font-bold font-display flex items-center gap-2'>
          <Palette className='h-5 w-5 text-pw-primary' />
          Color Mentions & Palette Suggestion Engine
        </h3>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Active Color Card */}
        <div className='flex flex-col gap-4'>
          <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
            Primary Color Input
          </label>
          <div className='flex items-center gap-3'>
            {/* Color Swatch Box */}
            <div
              className='w-14 h-14 rounded-2xl border-2 border-white/20 shadow-2xl flex-shrink-0 transition-transform hover:scale-105 cursor-pointer'
              style={{
                backgroundColor: details.hex,
                boxShadow: `0 0 25px ${details.hex}60`,
              }}
            />
            <div className='flex-1 flex flex-col gap-1'>
              <Input
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                placeholder='Hex, RGB, HSL, or CSS color name (e.g. cyan, crimson)'
                className='font-mono bg-pw-surface/50 border-white/10'
              />
              <span className='text-xs text-pw-muted font-mono flex items-center gap-2'>
                Nearest Named Color:
                <span
                  className='px-2 py-0.5 rounded-lg font-bold text-black text-[11px] uppercase inline-flex items-center gap-1'
                  style={{ backgroundColor: details.hex }}>
                  {details.nearestNamedColor}
                </span>
              </span>
            </div>
          </div>

          {/* Formats Grid */}
          <div className='grid grid-cols-3 gap-2 text-center font-mono text-xs pt-2 '>
            <div
              onClick={() => handleCopy(details.hex)}
              className='p-3 rounded-xl bg-pw-surface/20 border border-white/5 cursor-pointer hover:border-pw-primary transition-colors'>
              <span className='text-[10px] text-pw-muted block mb-1'>HEX</span>
              <span className='font-bold text-pw-primary'>{details.hex}</span>
            </div>

            <div
              onClick={() =>
                handleCopy(
                  `rgb(${details.rgb.r}, ${details.rgb.g}, ${details.rgb.b})`,
                )
              }
              className='p-3 rounded-xl bg-pw-surface/20 border border-white/5 cursor-pointer hover:border-pw-primary transition-colors'>
              <span className='text-[10px] text-pw-muted block mb-1'>RGB</span>
              <span className='font-bold text-pw-text'>
                {details.rgb.r},{details.rgb.g},{details.rgb.b}
              </span>
            </div>

            <div
              onClick={() =>
                handleCopy(
                  `hsl(${details.hsl.h}, ${details.hsl.s}%, ${details.hsl.l}%)`,
                )
              }
              className='p-3 rounded-xl bg-pw-surface/20 border border-white/5 cursor-pointer hover:border-pw-primary transition-colors'>
              <span className='text-[10px] text-pw-muted block mb-1'>HSL</span>
              <span className='font-bold text-pw-text'>
                {details.hsl.h}°,{details.hsl.s}%,{details.hsl.l}%
              </span>
            </div>
          </div>
        </div>

        {/* Contrast & Accessibility Comparison */}
        <div className='flex flex-col gap-4'>
          <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
            Contrast & WCAG Check
          </label>
          <div className='flex items-center gap-3'>
            <Input
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value)}
              placeholder='Background color to compare against'
              className='font-mono bg-pw-surface/50 border-white/10'
            />
            <div
              className='w-10 h-10 rounded-xl border border-white/20 flex-shrink-0'
              style={{ backgroundColor: compareInput }}
            />
          </div>

          {/* Live Contrast Card */}
          <div
            className='p-4 rounded-xl border border-white/5 flex items-center justify-between font-mono flex-wrap gap-2'
            style={{ backgroundColor: compareInput, color: details.hex }}>
            <span className='font-bold text-sm'>Sample Preview Text</span>
            <div className='flex items-center flex-wrap gap-1 text-xs'>
              <span className='px-2 py-0.5 rounded bg-black/60 text-white font-bold'>
                Ratio: {comparison.contrastRatio}:1
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${comparison.isAccessibleAA ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-white'}`}>
                {comparison.isAccessibleAA ? 'WCAG AA ✓' : 'FAIL ✗'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monochromatic Shades Palette */}
      <div>
        <label className='text-xs font-bold uppercase tracking-wider text-pw-muted mb-3 block'>
          Generated Color Palette Shades
        </label>
        <div className='flex flex-wrap gap-2'>
          {shades.map((shadeHex, idx) => (
            <div
              key={idx}
              onClick={() => handleCopy(shadeHex)}
              className='h-16 rounded-xl border border-white/10 p-2 flex flex-col justify-end flex-wrap cursor-pointer hover:scale-105 transition-transform'
              style={{ backgroundColor: shadeHex }}>
              <span className='text-[10px] font-mono font-bold px-1 py-0.5 bg-black/60 text-white rounded w-fit'>
                {shadeHex}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: Extracted Mentions Extractor Box */}
      <div className="border-t border-white/5 pt-4">
        <label className='text-xs font-bold uppercase tracking-wider text-pw-muted mb-2 block flex items-center gap-1'>
          <MessageSquare className="h-4 w-4 text-pw-primary" />
          Color Mentions Live Extractor (Type names of colors and watch them render below)
        </label>
        <textarea
          rows={2}
          value={mentionsText}
          onChange={e => setMentionsText(e.target.value)}
          placeholder="e.g. forestgreen, crimson, deepskyblue, #ff00ea..."
          className="w-full rounded-xl bg-pw-surface/30 border border-white/10 p-3 text-xs text-pw-text focus:outline-none focus:border-pw-primary mb-3"
        />

        {extractedColors.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {extractedColors.map((color, index) => (
              <div
                key={index}
                onClick={() => setColorInput(color.hex)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div
                  className="w-5 h-5 rounded-md border border-white/10"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs font-mono font-bold text-pw-text capitalize">{color.name}</span>
                <span className="text-[10px] font-mono text-pw-muted">{color.hex}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='divider my-5 sm:hidden' />
    </Card>
  );
}
