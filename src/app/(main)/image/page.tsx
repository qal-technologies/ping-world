'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Upload,
  Crop,
  Layers,
  Download,
  RefreshCw,
  Trash2,
  Maximize,
  Minimize,
  Palette,
  Check,
  Scaling,
  Scissors,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {cn} from '@/lib/utils';

const metadata = {
  title: 'Image Toolkit',
  description: 'Edit and enhance your images with our powerful toolkit (from Krafty).',
  keywords: ['Image Toolkit', 'Image', 'Toolkit', 'Krafty', 'Ping World', 'pingworld', 'pingwrld', 'qal tech', 'qal technologies', 'trending', 'trend'],
}

// --- Types ---
interface Filter {
  name: string;
  className: string;
  values: {
    brightness: number;
    contrast: number;
    saturate: number;
    grayscale: number;
    sepia: number;
    hueRotate: number;
    blur: number;
  };
}

const DEFAULT_FILTER: Filter = {
  name: 'Normal',
  className: '',
  values: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0,
    blur: 0,
  },
};

const PRESET_FILTERS: Filter[] = [
  DEFAULT_FILTER,
  {
    name: 'Vintage',
    className: 'sepia-[0.5] contrast-[1.1]',
    values: { ...DEFAULT_FILTER.values, sepia: 50, contrast: 110 },
  },
  {
    name: 'Noir',
    className: 'grayscale contrast-[1.2]',
    values: { ...DEFAULT_FILTER.values, grayscale: 100, contrast: 120 },
  },
  {
    name: 'Vibrant',
    className: 'saturate-[1.5]',
    values: { ...DEFAULT_FILTER.values, saturate: 150 },
  },
  {
    name: 'Fade',
    className: 'brightness-[1.1] contrast-[0.9] saturate-[0.8]',
    values: {
      ...DEFAULT_FILTER.values,
      brightness: 110,
      contrast: 90,
      saturate: 80,
    },
  },
  {
    name: 'Cold',
    className: 'hue-rotate-[180deg] saturate-[1.2]',
    values: { ...DEFAULT_FILTER.values, hueRotate: 180, saturate: 120 },
  },
];

export default function ImageToolkitPage() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'adjust' | 'filters' | 'crop'>(
    'adjust',
  );
  const [filters, setFilters] = useState(DEFAULT_FILTER.values);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please upload an image file.');
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setFilters(DEFAULT_FILTER.values);
    };
    reader.readAsDataURL(file);
  };

  const applyFilter = (filter: Filter) => {
    setFilters(filter.values);
  };

  const handleDownload = () => {
    if (!image || !canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Apply filters to canvas
    ctx.filter = `
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      saturate(${filters.saturate}%)
      grayscale(${filters.grayscale}%)
      sepia(${filters.sepia}%)
      hue-rotate(${filters.hueRotate}deg)
      blur(${filters.blur}px)
    `;

    ctx.drawImage(img, 0, 0);

    const link = document.createElement('a');
    link.download = `pingworld-edited-${fileName}`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const filterString = `
    brightness(${filters.brightness}%)
    contrast(${filters.contrast}%)
    saturate(${filters.saturate}%)
    grayscale(${filters.grayscale}%)
    sepia(${filters.sepia}%)
    hue-rotate(${filters.hueRotate}deg)
    blur(${filters.blur}px)
  `;

  return (
    <div className='container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <ImageIcon className='h-3.5 w-3.5' />
            Image Toolkit
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Visual <span className='gradient-text'>Enhancer.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Remove backgrounds, apply filters, and crop images &mdash; no server
            uploads.
          </p>
        </div>
        {image && (
          <div className='flex gap-3'>
            <>
              <Button
                variant='outline'
                onClick={() => {
                  setImage(null);
                  setFilters(DEFAULT_FILTER.values);
                }}
                className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
                <Trash2 className='h-4 w-4' /> Reset
              </Button>
              <Button
                onClick={handleDownload}
                className='btn-primary gap-2 h-11 px-8'>
                <Download className='h-4 w-4' /> Download Result
              </Button>
            </>
          </div>
        )}
      </div>

      {!image ?
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='relative'>
          <div
            onClick={() => document.getElementById('image-upload')?.click()}
            className='flex flex-col items-center justify-center py-30 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group relative'>
            <input
              id='image-upload'
              type='file'
              accept='image/*'
              onChange={handleUpload}
              className='hidden'
            />
            <div className='w-24 h-24 rounded-2xl bg-pw-surface border border-white/10 flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform'>
              <Upload className='h-10 w-10 text-pw-primary' />
            </div>
            <h3 className='text-2xl font-bold font-display mb-2'>
              Upload an Image
            </h3>
            <p className='text-pw-muted max-w-sm'>
              Drag and drop or click to pick an image. All processing happens in
              your browser for 100% privacy.
            </p>
          </div>
        </motion.div>
      : <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* Main Editor Canvas Area */}
          <div className='lg:col-span-7 flex flex-col gap-6'>
            <Card className='card-glow overflow-hidden bg-pw-surface/50 border-white/5 min-h-[500px] flex items-center justify-center p-2'>
              <div className='relative max-w-full max-h-full'>
                <img
                  ref={imgRef}
                  src={image}
                  alt='Editing Image'
                  className='max-w-full max-h-[70vh] rounded-lg shadow-2xl transition-all'
                  style={{ filter: filterString }}
                />
                <canvas
                  ref={canvasRef}
                  className='hidden'
                />
              </div>
            </Card>
          </div>

          {/* Sidebar Controls */}
          <div className='lg:col-span-5 flex flex-col gap-6'>
            <div className='flex p-0.5 gap-1 bg-white/5 border border-white/5 rounded-3xl'>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('adjust')}
                className={cn(
                  'flex-1 h-9 gap-2 rounded-2xl',
                  activeTab === 'adjust' &&
                    'bg-pw-primary text-white shadow-lg',
                )}>
                <Scaling className='h-4 w-4' /> Adjust
              </Button>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('filters')}
                className={cn(
                  'flex-1 h-9 gap-2 rounded-2xl',
                  activeTab === 'filters' &&
                    'bg-pw-primary text-white shadow-lg',
                )}>
                <Palette className='h-4 w-4' /> Filters
              </Button>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('crop')}
                className={cn(
                  'flex-1 h-9 gap-2 rounded-2xl',
                  activeTab === 'crop' && 'bg-pw-primary text-white shadow-lg',
                )}>
                <Scissors className='h-4 w-4' /> Crop
              </Button>
            </div>

            <Card className='card-glow p-6 flex flex-col gap-8'>
              {activeTab === 'adjust' && (
                <div className='space-y-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <label className='text-xs font-bold text-pw-muted uppercase'>
                        Brightness
                      </label>
                      <span className='text-xs font-mono'>
                        {filters.brightness}%
                      </span>
                    </div>
                    <Slider
                      defaultValue={[100]}
                      value={[filters.brightness]}
                      max={200}
                      step={1}
                      onValueChange={(vals: any) =>
                        setFilters({ ...filters, brightness: vals[0] })
                      }
                    />
                  </div>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <label className='text-xs font-bold text-pw-muted uppercase'>
                        Contrast
                      </label>
                      <span className='text-xs font-mono'>
                        {filters.contrast}%
                      </span>
                    </div>
                    <Slider
                      defaultValue={[100]}
                      value={[filters.contrast]}
                      max={200}
                      step={1}
                      onValueChange={(vals: any) =>
                        setFilters({ ...filters, contrast: vals[0] })
                      }
                    />
                  </div>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <label className='text-xs font-bold text-pw-muted uppercase'>
                        Saturation
                      </label>
                      <span className='text-xs font-mono'>
                        {filters.saturate}%
                      </span>
                    </div>
                    <Slider
                      defaultValue={[100]}
                      value={[filters.saturate]}
                      max={200}
                      step={1}
                      onValueChange={(vals: any) =>
                        setFilters({ ...filters, saturate: vals[0] })
                      }
                    />
                  </div>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <label className='text-xs font-bold text-pw-muted uppercase'>
                        Blur
                      </label>
                      <span className='text-xs font-mono'>
                        {filters.blur}px
                      </span>
                    </div>
                    <Slider
                      defaultValue={[0]}
                      value={[filters.blur]}
                      max={20}
                      step={1}
                      onValueChange={(vals: any) =>
                        setFilters({ ...filters, blur: vals[0] })
                      }
                    />
                  </div>
                  <Button
                    variant='outline'
                    onClick={() => setFilters(DEFAULT_FILTER.values)}
                    className='w-full h-10 border-white/10 hover:bg-white/5 mt-4'>
                    <RefreshCw className='h-4 w-4 mr-2' /> Reset Adjustments
                  </Button>
                </div>
              )}

              {activeTab === 'filters' && (
                <div className='grid grid-cols-2 gap-4'>
                  {PRESET_FILTERS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => applyFilter(f)}
                      className={cn(
                        'flex flex-col items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:border-pw-primary/50 transition-all group',
                        JSON.stringify(filters) === JSON.stringify(f.values) &&
                          'border-pw-primary bg-pw-primary/5',
                      )}>
                      <div className='w-full aspect-video rounded-lg overflow-hidden relative'>
                        <img
                          src={image}
                          alt={f.name}
                          className={cn(
                            'w-full h-full object-cover',
                            f.className,
                          )}
                        />
                        {JSON.stringify(filters) ===
                          JSON.stringify(f.values) && (
                          <div className='absolute inset-0 bg-pw-primary/20 flex items-center justify-center'>
                            <Check className='h-6 w-6 text-white' />
                          </div>
                        )}
                      </div>
                      <span className='text-xs font-medium'>{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'crop' && (
                <div className='space-y-6'>
                  <p className='text-xs text-pw-muted mb-2 uppercase font-bold tracking-widest'>
                    Presets
                  </p>
                  {/* {<div className='grid grid-cols-2 gap-3'>
                    <Button
                      variant='outline'
                      onClick={() => setAspectRatio(null)}
                      className={cn(
                        'h-12 border-white/10',
                        !aspectRatio && 'border-pw-primary bg-pw-primary/5',
                      )}>
                      {' '}
                      Free{' '}
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => setAspectRatio(1)}
                      className={cn(
                        'h-12 border-white/10',
                        aspectRatio === 1 &&
                        'border-pw-primary bg-pw-primary/5',
                      )}>
                      {' '}
                      1:1 Square{' '}
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => setAspectRatio(16 / 9)}
                      className={cn(
                        'h-12 border-white/10',
                        aspectRatio === 16 / 9 &&
                        'border-pw-primary bg-pw-primary/5',
                      )}>
                      {' '}
                      16:9 HD{' '}
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => setAspectRatio(4 / 5)}
                      className={cn(
                        'h-12 border-white/10',
                        aspectRatio === 4 / 5 &&
                        'border-pw-primary bg-pw-primary/5',
                      )}>
                      {' '}
                      4:5 Post{' '}
                    </Button>
                  </div>} */}

                  <div className='bg-pw-primary/5 border border-pw-primary/20 rounded-xl p-4 mt-5'>
                    <p className='text-xs text-pw-primary font-medium flex items-center gap-2'>
                      <Maximize className='h-4 w-4' /> Cropping tool coming
                      soon!
                    </p>
                    <p className='text-[10px] text-pw-muted mt-2'>
                      Full interactive cropping with handles is being optimized
                      for the next module update.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <div className='bg-white/5 border border-white/5 rounded-2xl p-6'>
              <h4 className='text-sm font-bold flex items-center gap-2 mb-4'>
                <Layers className='h-4 w-4 text-pw-secondary' /> Tool Stats
              </h4>
              <div className='space-y-3'>
                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Image Size</span>
                  <span className='text-pw-success font-mono'>~{'1MB'}</span>
                </div>

                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Browser Engine</span>
                  <span className='text-pw-success font-mono'>
                    Webkit / Blink
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Memory Usage</span>
                  <span className='text-pw-success font-mono'>Dynamic</span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Privacy Mode</span>
                  <span className='text-pw-success font-mono'>End-to-End</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  );
}
