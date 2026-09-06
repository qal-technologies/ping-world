'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Upload,
  Layers,
  Download,
  RefreshCw,
  Trash2,
  Palette,
  Check,
  Scaling,
  Scissors,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Sparkles,
  Crop as CropIcon,
  Eraser,
  UserCircle,
  CreditCard,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ProfilePicMaker from '@/components/image/ProfilePicMaker';
import BusinessCardMaker from '@/components/image/BusinessCardMaker';

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
    invert: number;
  };
}

const DEFAULT_FILTER_VALUES = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  blur: 0,
  invert: 0,
};

const PRESET_FILTERS: Filter[] = [
  { name: 'Normal', className: '', values: DEFAULT_FILTER_VALUES },
  {
    name: 'Vintage',
    className: 'sepia-[0.5] contrast-[1.1]',
    values: { ...DEFAULT_FILTER_VALUES, sepia: 50, contrast: 110 },
  },
  {
    name: 'Noir',
    className: 'grayscale contrast-[1.2]',
    values: { ...DEFAULT_FILTER_VALUES, grayscale: 100, contrast: 120 },
  },
  {
    name: 'Vibrant',
    className: 'saturate-[1.5]',
    values: { ...DEFAULT_FILTER_VALUES, saturate: 150 },
  },
  {
    name: 'Cinematic',
    className: 'contrast-[1.3] saturate-[0.9]',
    values: { ...DEFAULT_FILTER_VALUES, contrast: 130, saturate: 90 },
  },
  {
    name: 'Cyberpunk',
    className: 'hue-rotate-[120deg] saturate-[1.8]',
    values: { ...DEFAULT_FILTER_VALUES, hueRotate: 120, saturate: 180 },
  },
  {
    name: 'Fade',
    className: 'brightness-[1.1] contrast-[0.9] saturate-[0.8]',
    values: {
      ...DEFAULT_FILTER_VALUES,
      brightness: 110,
      contrast: 90,
      saturate: 80,
    },
  },
];

type StudioMode = 'editor' | 'profile' | 'bizcard';

export default function ImageToolkitPage() {
  const [studioMode, setStudioMode] = useState<StudioMode>('editor');
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'adjust' | 'filters' | 'transform' | 'crop' | 'bg'>(
    'adjust',
  );

  // Filters state
  const [filters, setFilters] = useState(DEFAULT_FILTER_VALUES);

  // Transform states
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Resizing states
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);

  // Format states
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');

  // Background removal / Key color tolerance state
  const [bgRemoveColor, setBgRemoveColor] = useState<string>('#ffffff');
  const [bgTolerance, setBgTolerance] = useState<number>(40);

  // Crop states
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentage-based crop box
  const [isCropping, setIsCropping] = useState(false);

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
      setFilters(DEFAULT_FILTER_VALUES);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
    };
    reader.readAsDataURL(file);
  };

  // Extract dimensions when img loads
  const handleImageLoad = () => {
    if (imgRef.current) {
      const w = imgRef.current.naturalWidth;
      const h = imgRef.current.naturalHeight;
      setOriginalWidth(w);
      setOriginalHeight(h);
      setResizeWidth(w);
      setResizeHeight(h);
    }
  };

  // Ensure maintain aspect ratio on resizing inputs
  const handleWidthChange = (val: number) => {
    setResizeWidth(val);
    if (maintainAspect && originalWidth > 0) {
      setResizeHeight(Math.round((val / originalWidth) * originalHeight));
    }
  };

  const handleHeightChange = (val: number) => {
    setResizeHeight(val);
    if (maintainAspect && originalHeight > 0) {
      setResizeWidth(Math.round((val / originalHeight) * originalWidth));
    }
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTER_VALUES);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    if (originalWidth > 0) {
      setResizeWidth(originalWidth);
      setResizeHeight(originalHeight);
    }
    setCropBox({ x: 10, y: 10, w: 80, h: 80 });
    toast.success('All edits reset!');
  };

  // Perform background color thresholding (Local client background removal)
  const performBgRemoval = () => {
    if (!image || !canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Parse the hex tolerance color
    const targetHex = bgRemoveColor.replace('#', '');
    const tr = parseInt(targetHex.substring(0, 2), 16);
    const tg = parseInt(targetHex.substring(2, 4), 16);
    const tb = parseInt(targetHex.substring(4, 6), 16);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.sqrt(
        Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2)
      );

      if (diff < bgTolerance) {
        data[i + 3] = 0; // Make transparent
      }
    }

    ctx.putImageData(imgData, 0, 0);
    setImage(canvas.toDataURL('image/png'));
    toast.success('Background pixels removed successfully!');
  };

  // Apply crop selection locally
  const performCrop = () => {
    if (!image || !canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    const sourceW = img.naturalWidth;
    const sourceH = img.naturalHeight;

    const cropX = (cropBox.x / 100) * sourceW;
    const cropY = (cropBox.y / 100) * sourceH;
    const cropW = (cropBox.w / 100) * sourceW;
    const cropH = (cropBox.h / 100) * sourceH;

    canvas.width = cropW;
    canvas.height = cropH;

    // Apply active filters onto cropped drawing
    ctx.filter = filterString;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    setImage(canvas.toDataURL('image/png'));
    setCropBox({ x: 10, y: 10, w: 80, h: 80 });
    toast.success('Image cropped successfully!');
  };

  const handleDownload = () => {
    if (!image || !canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    // Set size to target resized values
    canvas.width = resizeWidth || img.naturalWidth;
    canvas.height = resizeHeight || img.naturalHeight;

    ctx.save();

    // Setup transformation matrix inside canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply CSS-like filters directly onto HTML Canvas export context
    ctx.filter = filterString;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const formatLabel = exportFormat.split('/')[1] || 'png';

    // jules edit: Native HTML5 toBlob saving prevents download truncation on large images
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Export failed. Could not generate image blob.");
        return;
      }
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `pingworld-edited-${fileName.split('.')[0] || 'img'}.${formatLabel}`;
      link.href = downloadUrl;
      link.click();

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      toast.success(`Image exported as ${formatLabel.toUpperCase()} successfully!`);
    }, exportFormat);
  };

  const filterString = `
    brightness(${filters.brightness}%)
    contrast(${filters.contrast}%)
    saturate(${filters.saturate}%)
    grayscale(${filters.grayscale}%)
    sepia(${filters.sepia}%)
    hue-rotate(${filters.hueRotate}deg)
    blur(${filters.blur}px)
    invert(${filters.invert}%)
  `;

  // Dynamic slider input fallback styling for extreme compatibility
  const SliderInput = ({
    label,
    min,
    max,
    value,
    unit = '',
    onChange
  }: {
    label: string;
    min: number;
    max: number;
    value: number;
    unit?: string;
    onChange: (val: number) => void;
  }) => (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <label className='text-xs font-bold text-pw-muted uppercase'>{label}</label>
        <span className='text-xs font-mono'>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
      />
    </div>
  );

  return (
    <div className='container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8'>
        <div>
          <div className='badge mb-4'>
            <ImageIcon className='h-3.5 w-3.5' />
            Image Studio
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Visual <span className='gradient-text'>Studio.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Professional filters, avatar maker, business cards &amp; more &mdash; 100% in-browser.
          </p>
        </div>
        {image && studioMode === 'editor' && (
          <div className='flex flex-wrap gap-3'>
            <Button
              variant='outline'
              onClick={() => {
                setImage(null);
                setFileName('');
                handleReset();
              }}
              className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
              <Trash2 className='h-4 w-4' /> Reset
            </Button>
            <Button
              onClick={handleDownload}
              className='btn-primary gap-2 h-11 px-8'>
              <Download className='h-4 w-4' /> Export Image
            </Button>
          </div>
        )}
      </div>

      {/* ─── Studio Mode Switcher ─── */}
      <div className='flex bg-white/5 border border-white/5 rounded-3xl p-0.5 mb-8 w-fit max-w-full scrollable-row no-scrollbar' style={{placeSelf:'center', gap:0 }}>
        {([
          { id: 'editor',  label: 'Image Editor',      icon: <Wand2 className='h-4 w-4' /> },
          { id: 'profile', label: 'Profile Pic Maker',  icon: <UserCircle className='h-4 w-4' /> },
          { id: 'bizcard', label: 'Business Card',      icon: <CreditCard className='h-4 w-4' /> },
        ] as { id: StudioMode; label: string; icon: React.ReactNode }[]).map((m) => (
          <Button key={m.id} variant='ghost' onClick={() => setStudioMode(m.id)}
            className={cn(
              'h-9 gap-2 rounded-3xl text-xs font-bold px-4 transition-all',
              studioMode === m.id
                ? 'bg-pw-primary text-white shadow-lg shadow-pw-primary/25'
                : 'text-pw-muted hover:text-white hover:bg-white/10',
            )}>
            {m.icon}{m.label}
          </Button>
        ))}
      </div>

      {studioMode === 'profile' && (
        <motion.div key='profile' initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <ProfilePicMaker />
        </motion.div>
      )}

      {studioMode === 'bizcard' && (
        <motion.div key='bizcard' initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <BusinessCardMaker />
        </motion.div>
      )}

      {studioMode === 'editor' && (!image ?
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='relative'>
          <div
            onClick={() => document.getElementById('image-upload')?.click()}
            className='flex flex-col items-center justify-center py-20 px-3 sm:py-30 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group relative'>
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
            <p className='text-pw-muted text-xs sm:text-sm max-w-sm'>
              Drag and drop or click to pick an image. All processing happens in
              your browser for 100% privacy.
            </p>
          </div>
        </motion.div>
      : <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* Main Editor Canvas Area */}
          <div className='lg:col-span-7 flex flex-col gap-6'>
            <Card className='card-glow overflow-hidden bg-pw-surface/50 border-white/5 min-h-[500px] flex items-center justify-center p-2 relative'>
              <div className='relative max-w-full max-h-full flex items-center justify-center'>
                <img
                  ref={imgRef}
                  src={image}
                  onLoad={handleImageLoad}
                  alt='Editing Image'
                  className={cn(
                    'max-w-full max-h-[60vh] rounded-lg shadow-2xl transition-all',
                    flipH && 'scale-x-[-1]',
                    flipV && 'scale-y-[-1]',
                  )}
                  style={{
                    filter: filterString,
                    transform: `rotate(${rotation}deg)`,
                  }}
                />

                {/* Visual Crop Guide overlay when crop tab is active */}
                {activeTab === 'crop' && (
                  <div
                    className='absolute border-2 border-dashed border-pw-primary bg-pw-primary/10 rounded'
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.w}%`,
                      height: `${cropBox.h}%`,
                      pointerEvents: 'none',
                    }}>
                    <div className='absolute -top-2 -left-2 w-4 h-4 bg-pw-primary rounded-full' />
                    <div className='absolute -top-2 -right-2 w-4 h-4 bg-pw-primary rounded-full' />
                    <div className='absolute -bottom-2 -left-2 w-4 h-4 bg-pw-primary rounded-full' />
                    <div className='absolute -bottom-2 -right-2 w-4 h-4 bg-pw-primary rounded-full' />
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  className='hidden'
                />
              </div>
            </Card>
          </div>

          {/* Sidebar Controls */}
          <div className='lg:col-span-5 flex flex-col gap-6'>
            <div className='flex gap-1 bg-white/5 border border-white/5 rounded-3xl overflow-x-auto scrollable-row p-0.5' style={{paddingBottom:0.5}}>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('adjust')}
                className={cn(
                  'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                  activeTab === 'adjust' &&
                    'bg-pw-primary text-white shadow-lg',
                )}>
                <Scaling className='h-3.5 w-3.5' /> Adjust
              </Button>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('filters')}
                className={cn(
                  'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                  activeTab === 'filters' &&
                    'bg-pw-primary text-white shadow-lg',
                )}>
                <Palette className='h-3.5 w-3.5' /> Filters
              </Button>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('transform')}
                className={cn(
                  'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                  activeTab === 'transform' &&
                    'bg-pw-primary text-white shadow-lg',
                )}>
                <RotateCw className='h-3.5 w-3.5' /> Transform
              </Button>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('crop')}
                className={cn(
                  'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                  activeTab === 'crop' && 'bg-pw-primary text-white shadow-lg',
                )}>
                <Scissors className='h-3.5 w-3.5' /> Crop
              </Button>
              <Button
                variant='ghost'
                onClick={() => setActiveTab('bg')}
                className={cn(
                  'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                  activeTab === 'bg' && 'bg-pw-primary text-white shadow-lg',
                )}>
                <Eraser className='h-3.5 w-3.5' /> BG Tools
              </Button>
            </div>

            <Card className='card-glow p-6 flex flex-col gap-6'>
              {activeTab === 'adjust' && (
                <div className='space-y-5'>
                  <SliderInput
                    label='Brightness'
                    min={20}
                    max={200}
                    value={filters.brightness}
                    unit='%'
                    onChange={(val) =>
                      setFilters({ ...filters, brightness: val })
                    }
                  />
                  <SliderInput
                    label='Contrast'
                    min={20}
                    max={200}
                    value={filters.contrast}
                    unit='%'
                    onChange={(val) =>
                      setFilters({ ...filters, contrast: val })
                    }
                  />
                  <SliderInput
                    label='Saturation'
                    min={0}
                    max={200}
                    value={filters.saturate}
                    unit='%'
                    onChange={(val) =>
                      setFilters({ ...filters, saturate: val })
                    }
                  />
                  <SliderInput
                    label='Grayscale'
                    min={0}
                    max={100}
                    value={filters.grayscale}
                    unit='%'
                    onChange={(val) =>
                      setFilters({ ...filters, grayscale: val })
                    }
                  />
                  <SliderInput
                    label='Sepia'
                    min={0}
                    max={100}
                    value={filters.sepia}
                    unit='%'
                    onChange={(val) => setFilters({ ...filters, sepia: val })}
                  />
                  <SliderInput
                    label='Blur'
                    min={0}
                    max={20}
                    value={filters.blur}
                    unit='px'
                    onChange={(val) => setFilters({ ...filters, blur: val })}
                  />
                  <SliderInput
                    label='Invert'
                    min={0}
                    max={100}
                    value={filters.invert}
                    unit='%'
                    onChange={(val) => setFilters({ ...filters, invert: val })}
                  />
                  <Button
                    variant='outline'
                    onClick={handleReset}
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
                      onClick={() => setFilters(f.values)}
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

              {activeTab === 'transform' && (
                <div className='space-y-6'>
                  <div className='grid grid-cols-2 gap-4'>
                    <Button
                      variant='outline'
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className='h-12 border-white/10 flex items-center justify-center gap-2'>
                      <RotateCw className='h-4 w-4' /> Rotate 90°
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => setFlipH((prev) => !prev)}
                      className={cn(
                        'h-12 border-white/10 flex items-center justify-center gap-2',
                        flipH && 'bg-pw-primary/20 border-pw-primary',
                      )}>
                      <FlipHorizontal className='h-4 w-4' /> Flip H
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => setFlipV((prev) => !prev)}
                      className={cn(
                        'h-12 border-white/10 flex items-center justify-center gap-2',
                        flipV && 'bg-pw-primary/20 border-pw-primary',
                      )}>
                      <FlipVertical className='h-4 w-4' /> Flip V
                    </Button>
                  </div>

                  <div className='space-y-4 pt-4 border-t border-white/5'>
                    <p className='text-xs font-bold text-pw-muted uppercase'>
                      Image Resizing
                    </p>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='text-[10px] text-pw-muted font-bold block mb-1'>
                          WIDTH (PX)
                        </label>
                        <Input
                          type='number'
                          value={resizeWidth}
                          onChange={(e) =>
                            handleWidthChange(Number(e.target.value))
                          }
                          className='bg-white/5 border-white/10 h-10 animate-none'
                        />
                      </div>
                      <div>
                        <label className='text-[10px] text-pw-muted font-bold block mb-1'>
                          HEIGHT (PX)
                        </label>
                        <Input
                          type='number'
                          value={resizeHeight}
                          onChange={(e) =>
                            handleHeightChange(Number(e.target.value))
                          }
                          className='bg-white/5 border-white/10 h-10 animate-none'
                        />
                      </div>
                    </div>
                    <label className='flex items-center gap-2 text-xs text-pw-muted cursor-pointer select-none'>
                      <input
                        type='checkbox'
                        checked={maintainAspect}
                        onChange={(e) => setMaintainAspect(e.target.checked)}
                        className='rounded border-white/10 bg-white/5 h-4 w-4 accent-pw-primary'
                      />
                      Lock Aspect Ratio
                    </label>
                  </div>

                  <div className='space-y-4 pt-4 border-t border-white/5'>
                    <p className='text-xs font-bold text-pw-muted uppercase'>
                      Export Format
                    </p>
                    <div className='grid grid-cols-3 gap-2'>
                      <Button
                        variant='outline'
                        onClick={() => setExportFormat('image/png')}
                        className={cn(
                          'h-10 border-white/10 text-xs',
                          exportFormat === 'image/png' &&
                            'border-pw-primary bg-pw-primary/10',
                        )}>
                        PNG
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => setExportFormat('image/jpeg')}
                        className={cn(
                          'h-10 border-white/10 text-xs',
                          exportFormat === 'image/jpeg' &&
                            'border-pw-primary bg-pw-primary/10',
                        )}>
                        JPEG
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => setExportFormat('image/webp')}
                        className={cn(
                          'h-10 border-white/10 text-xs',
                          exportFormat === 'image/webp' &&
                            'border-pw-primary bg-pw-primary/10',
                        )}>
                        WEBP
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'crop' && (
                <div className='space-y-6'>
                  <p className='text-xs text-pw-muted mb-2 uppercase font-bold tracking-widest'>
                    Interactive Crop Settings
                  </p>

                  <div className='space-y-4'>
                    <SliderInput
                      label='Crop X Position'
                      min={0}
                      max={80}
                      value={cropBox.x}
                      unit='%'
                      onChange={(val) => setCropBox({ ...cropBox, x: val })}
                    />
                    <SliderInput
                      label='Crop Y Position'
                      min={0}
                      max={80}
                      value={cropBox.y}
                      unit='%'
                      onChange={(val) => setCropBox({ ...cropBox, y: val })}
                    />
                    <SliderInput
                      label='Crop Width'
                      min={10}
                      max={100 - cropBox.x}
                      value={cropBox.w}
                      unit='%'
                      onChange={(val) => setCropBox({ ...cropBox, w: val })}
                    />
                    <SliderInput
                      label='Crop Height'
                      min={10}
                      max={100 - cropBox.y}
                      value={cropBox.h}
                      unit='%'
                      onChange={(val) => setCropBox({ ...cropBox, h: val })}
                    />

                    <Button
                      onClick={performCrop}
                      className='w-full btn-primary h-11 gap-2 mt-4'>
                      <CropIcon className='h-4 w-4' /> Apply Selected Crop
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'bg' && (
                <div className='space-y-6'>
                  <p className='text-xs text-pw-muted mb-2 uppercase font-bold tracking-widest'>
                    Key Color Background Eraser
                  </p>

                  <div className='space-y-4'>
                    <div className='flex items-center gap-3'>
                      <div className='flex-1'>
                        <label className='text-xs text-pw-muted font-bold block mb-1'>
                          Target Eraser Color
                        </label>
                        <div className='flex gap-2'>
                          <input
                            type='color'
                            value={bgRemoveColor}
                            onChange={(e) => setBgRemoveColor(e.target.value)}
                            className='w-10 h-10 rounded cursor-pointer border-none bg-transparent'
                          />
                          <Input
                            value={bgRemoveColor}
                            onChange={(e) => setBgRemoveColor(e.target.value)}
                            className='bg-white/5 border-white/10 h-10 text-xs font-mono'
                          />
                        </div>
                      </div>
                    </div>

                    <SliderInput
                      label='Color Match Tolerance'
                      min={10}
                      max={150}
                      value={bgTolerance}
                      onChange={(val) => setBgTolerance(val)}
                    />

                    <Button
                      onClick={performBgRemoval}
                      className='w-full btn-primary h-11 gap-2 mt-4'>
                      <Eraser className='h-4 w-4' /> Erase Background Pixels
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <div className='bg-white/5 border border-white/5 rounded-2xl p-6'>
              <h4 className='text-sm font-bold flex items-center gap-2 mb-4'>
                <Layers className='h-4 w-4 text-pw-secondary' /> Active Image
                Specs
              </h4>
              <div className='space-y-3'>
                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Original Specs</span>
                  <span className='text-pw-success font-mono'>
                    {originalWidth} x {originalHeight} px
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Target Output</span>
                  <span className='text-pw-success font-mono'>
                    {resizeWidth} x {resizeHeight} px
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Output Format</span>
                  <span className='text-pw-success font-mono uppercase'>
                    {exportFormat.split('/')[1] || 'png'}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-pw-muted'>Privacy Mode</span>
                  <span className='text-pw-success font-mono'>
                    100% Client-Side
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
