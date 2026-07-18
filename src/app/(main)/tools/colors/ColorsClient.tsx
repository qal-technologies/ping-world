// jules edit: Extracted client-side Color Palette implementation to support server-side SEO & metadata compilation
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Palette,
  Copy,
  Shuffle,
  Sparkles,
  Plus,
  Trash2,
  Droplet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Helper to convert hex to rgb
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper to convert rgb to hsl
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Helper to convert hsl to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const y = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * y).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export default function ColorPalettePage() {
  const [selectedColor, setSelectedColor] = useState("#5c6fff");
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>(["#5c6fff", "#985cff", "#ff8c42", "#ff5c7a", "#22c985"]);
  const [exportFormat, setExportFormat] = useState<"hex" | "rgb" | "hsl">("hex");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate random color
  const generateRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    setSelectedColor(hex);
  };

  // Generate random palette
  const randomizePalette = () => {
    const newPalette = Array.from({ length: 5 }, () => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    });
    setPalette(newPalette);
    setSelectedColor(newPalette[0]);
    toast.success("New color palette generated!");
  };

  // Copy to clipboard helper
  const copyColor = (color: string, format: "hex" | "rgb" | "hsl") => {
    let textToCopy = color;
    const rgb = hexToRgb(color);
    if (rgb) {
      if (format === "rgb") {
        textToCopy = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      } else if (format === "hsl") {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        textToCopy = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      }
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedColor(color);
    setCopiedFormat(format);
    toast.success(`Copied: ${textToCopy}`);
    setTimeout(() => {
      setCopiedColor(null);
      setCopiedFormat(null);
    }, 2000);
  };

  // Color suggestions generators (Shades, Analogous, Complementary, Triadic)
  const getShades = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return [];
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return [20, 35, 50, 65, 80].map(l => hslToHex(hsl.h, hsl.s, l));
  };

  const getComplementary = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return [];
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const compH = (hsl.h + 180) % 360;
    return [
      hslToHex(hsl.h, hsl.s, hsl.l),
      hslToHex(compH, hsl.s, hsl.l),
      hslToHex(compH, Math.max(0, hsl.s - 20), Math.min(100, hsl.l + 10))
    ];
  };

  const getAnalogous = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return [];
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return [
      hslToHex((hsl.h + 330) % 360, hsl.s, hsl.l),
      hslToHex((hsl.h + 345) % 360, hsl.s, hsl.l),
      hex,
      hslToHex((hsl.h + 15) % 360, hsl.s, hsl.l),
      hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)
    ];
  };

  const getTriadic = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return [];
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return [
      hex,
      hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
      hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
    ];
  };

  // Extract palette from uploaded image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      const imgData = ctx.getImageData(0, 0, 100, 100).data;

      // Basic k-means/grid color extractor
      const colors: string[] = [];
      const steps = [10, 30, 50, 70, 90];
      steps.forEach((y) => {
        steps.forEach((x) => {
          const idx = (y * 100 + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx+1];
          const b = imgData[idx+2];
          const hex = "#" + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
          colors.push(hex);
        });
      });

      // Filter uniques and get 5 diverse colors
      const uniqueColors = Array.from(new Set(colors)).slice(0, 5);
      if (uniqueColors.length > 0) {
        setPalette(uniqueColors);
        setSelectedColor(uniqueColors[0]);
        toast.success("Extracted color palette from image!");
      }
    };
  }, [imageSrc]);

  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <Palette className='h-3.5 w-3.5' />
            Color Studio
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Chromatic <span className='gradient-text'>Palette.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Pick, generate, and extract gorgeous color harmonies. Save or export
            in standard formats.
          </p>
        </div>
        <div className='flex gap-3 flex-wrap'>
          <Button
            variant='outline'
            onClick={randomizePalette}
            className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
            <Shuffle className='h-4 w-4' /> Randomize
          </Button>
          <Button
            variant='outline'
            onClick={() => fileInputRef.current?.click()}
            className='btn-primary bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
            <Droplet className='h-4 w-4' /> Pick Image
          </Button>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleImageUpload}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Left column: Color Picker & Harmony generator */}
        <div className='lg:col-span-7 space-y-6'>
          {/* Main Color Picker Card */}
          <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-6'>
            <div className='flex flex-col md:flex-row gap-6 items-center'>
              <div className='relative'>
                <input
                  type='color'
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className='w-32 h-32 rounded-3xl cursor-pointer border-none bg-transparent'
                />
                <div
                  onClick={generateRandomColor}
                  className='absolute bottom-1 right-1 w-8 h-8 rounded-full bg-pw-primary flex items-center justify-center cursor-pointer hover:scale-110 transition-transform'>
                  <Shuffle className='h-4 w-4 text-white' />
                </div>
              </div>

              <div className='flex-1 space-y-4 w-full'>
                <div>
                  <label className='text-xs font-bold text-pw-muted uppercase block mb-1.5'>
                    Color Codes
                  </label>
                  <div className='grid grid-cols-3 gap-2'>
                    <Button
                      variant='outline'
                      onClick={() => setExportFormat('hex')}
                      className={cn(
                        'text-xs border-white/10 h-10',
                        exportFormat === 'hex' &&
                          'border-pw-primary bg-pw-primary/15',
                      )}>
                      HEX
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => setExportFormat('rgb')}
                      className={cn(
                        'text-xs border-white/10 h-10',
                        exportFormat === 'rgb' &&
                          'border-pw-primary bg-pw-primary/15',
                      )}>
                      RGB
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => setExportFormat('hsl')}
                      className={cn(
                        'text-xs border-white/10 h-10',
                        exportFormat === 'hsl' &&
                          'border-pw-primary bg-pw-primary/15',
                      )}>
                      HSL
                    </Button>
                  </div>
                </div>

                <div className='flex gap-2'>
                  <Input
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className='bg-white/5 border-white/10 h-12 text-sm font-mono focus:border-pw-primary'
                  />
                  <Button
                    onClick={() => copyColor(selectedColor, exportFormat)}
                    className='btn-primary h-12 w-12 shrink-0'>
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>

            {/* Harmony Suggestions */}
            <div className='space-y-4 pt-4 border-t border-white/5'>
              <h3 className='text-sm font-bold flex items-center gap-1.5 text-pw-muted'>
                <Sparkles className='h-4 w-4 text-pw-secondary' /> Suggestions &
                Harmonies
              </h3>

              {/* Shades */}
              <div className='space-y-2'>
                <p className='text-[10px] font-bold uppercase tracking-wider text-pw-muted'>
                  Shades
                </p>
                <div className='grid grid-cols-5 gap-1.5'>
                  {getShades(selectedColor).map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedColor(c)}
                      className='group relative aspect-video rounded-lg cursor-pointer transition-all border border-white/5 hover:scale-105'
                      style={{ backgroundColor: c }}>
                      <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg'>
                        <span className='text-[9px] font-mono font-bold text-white uppercase'>
                          {c}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analogous */}
              <div className='space-y-2'>
                <p className='text-[10px] font-bold uppercase tracking-wider text-pw-muted'>
                  Analogous
                </p>
                <div className='grid grid-cols-5 gap-1.5 px-1 sm:px-0'>
                  {getAnalogous(selectedColor).map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedColor(c)}
                      className='group relative aspect-video rounded-lg cursor-pointer transition-all border border-white/5 hover:scale-105'
                      style={{ backgroundColor: c }}>
                      <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg'>
                        <span className='text-[9px] font-mono font-bold text-white uppercase'>
                          {c}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complementary */}
              <div className='space-y-2'>
                <p className='text-[10px] font-bold uppercase tracking-wider text-pw-muted'>
                  Complementary
                </p>
                <div className='grid grid-cols-3 gap-1.5 px-1 sm:px-0'>
                  {getComplementary(selectedColor).map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedColor(c)}
                      className='group relative aspect-video rounded-lg cursor-pointer transition-all border border-white/5 hover:scale-105'
                      style={{ backgroundColor: c }}>
                      <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg'>
                        <span className='text-[9px] font-mono font-bold text-white uppercase'>
                          {c}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Triadic */}
              <div className='space-y-2'>
                <p className='text-[10px] font-bold uppercase tracking-wider text-pw-muted'>
                  Triadic
                </p>
                <div className='grid grid-cols-3 gap-1.5 px-1 sm:px-0'>
                  {getTriadic(selectedColor).map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedColor(c)}
                      className='group relative aspect-video rounded-lg cursor-pointer transition-all border border-white/5 hover:scale-105'
                      style={{ backgroundColor: c }}>
                      <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg'>
                        <span className='text-[9px] font-mono font-bold text-white uppercase'>
                          {c}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className='divider sm:hidden my-1' />

        {/* Right column: Active Palette & Image Extraction Preview */}
        <div className='lg:col-span-5 flex flex-col gap-6'>
          <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-6'>
            <h3 className='text-lg font-bold flex items-center gap-2'>
              <Palette className='h-5 w-5 text-pw-primary' /> Active Palette
            </h3>

            <div className='space-y-3'>
              {palette.map((color, idx) => {
                const rgb = hexToRgb(color);
                const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
                const activeVal =
                  exportFormat === 'rgb' && rgb ?
                    `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                  : exportFormat === 'hsl' && hsl ?
                    `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
                  : color;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer',
                      selectedColor === color ?
                        'border-pw-primary bg-pw-primary/5'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                    )}
                    onClick={() => setSelectedColor(color)}>
                    <div
                      className='w-12 h-12 rounded-lg border border-white/10 shrink-0'
                      style={{ backgroundColor: color }}
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-bold font-mono uppercase truncate'>
                        {activeVal}
                      </p>
                      <p className='text-[10px] text-pw-muted'>
                        Palette {idx + 1}
                      </p>
                    </div>
                    <div className='flex gap-1.5'>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyColor(color, exportFormat);
                        }}
                        variant='outline'
                        className='h-8 w-8 p-0 border-white/5 hover:bg-white/5'>
                        <Copy className='h-3.5 w-3.5' />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPalette(palette.filter((_, i) => i !== idx));
                          toast.success('Color removed from palette');
                        }}
                        variant='outline'
                        className='h-8 w-8 p-0 border-white/5 hover:bg-white/5 text-pw-danger hover:text-pw-danger'>
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {palette.length < 10 && (
                <Button
                  onClick={() => {
                    if (palette.includes(selectedColor)) {
                      toast.error('Color already in palette!');
                      return;
                    }
                    setPalette([...palette, selectedColor]);
                    toast.success('Added color to palette!');
                  }}
                  variant='outline'
                  className='w-full border-dashed border-white/10 hover:border-pw-primary/40 h-11 text-xs gap-1.5'>
                  <Plus className='h-4 w-4' /> Add selected color
                </Button>
              )}
            </div>

            {/* Hidden canvas for extraction */}
            <canvas
              ref={canvasRef}
              className='hidden'
            />

            {imageSrc && (
              <div className='pt-4 border-t border-white/5'>
                <p className='text-xs font-bold uppercase tracking-wider text-pw-muted mb-2'>
                  Extraction Image Preview
                </p>
                <div className='aspect-video w-full rounded-xl overflow-hidden border border-white/5 relative'>
                  <img
                    src={imageSrc}
                    alt='Extract Source'
                    className='w-full h-full object-cover'
                  />
                  <button
                    onClick={() => setImageSrc(null)}
                    className='absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors'>
                    <Trash2 className='h-3.5 w-3.5' />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
