'use client';

import { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
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
  ZoomIn,
  ZoomOut,
  Sun,
  Contrast,
  Droplets,
  Circle,
  Coffee,
  Sparkles as BlurIcon,
  RotateCcw,
  X,
  Plus,
  type LucideIcon,
  Fullscreen,
  CircleArrowDown,
  ChevronDown,
  MoreVertical,
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
type AdjustmentKey =
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'grayscale'
  | 'sepia'
  | 'blur'
  | 'invert';
type CanvasElement = {
  id: string;
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  color: string;
  text?: string;
};

const ADJUSTMENT_CONTROLS: {
  key: AdjustmentKey;
  label: string;
  min: number;
  max: number;
  unit: string;
  icon: LucideIcon;
}[] = [
  {
    key: 'brightness',
    label: 'Brightness',
    min: 20,
    max: 200,
    unit: '%',
    icon: Sun,
  },
  {
    key: 'contrast',
    label: 'Contrast',
    min: 20,
    max: 200,
    unit: '%',
    icon: Contrast,
  },
  {
    key: 'saturate',
    label: 'Saturation',
    min: 0,
    max: 200,
    unit: '%',
    icon: Droplets,
  },
  {
    key: 'grayscale',
    label: 'Grayscale',
    min: 0,
    max: 100,
    unit: '%',
    icon: Circle,
  },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%', icon: Coffee },
  { key: 'blur', label: 'Blur', min: 0, max: 20, unit: 'px', icon: BlurIcon },
  {
    key: 'invert',
    label: 'Invert',
    min: 0,
    max: 100,
    unit: '%',
    icon: RotateCcw,
  },
];

export default function ImageToolkitPage() {
  const [studioMode, setStudioMode] = useState<StudioMode>('editor');
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'adjust' | 'filters' | 'transform' | 'crop' | 'bg'
  >('adjust');
  const [focusedAdjustment, setFocusedAdjustment] =
    useState<AdjustmentKey | null>('brightness');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPointerAdjusting, setIsPointerAdjusting] = useState(false);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedCanvasElementId, setSelectedCanvasElementId] = useState<
    string | null
  >(null);
  const draggingElementRef = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Filters state
  const [filters, setFilters] = useState(DEFAULT_FILTER_VALUES);
  const [imageEditingHistory, setImageEditingHistory] = useState([]);

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
  const [exportFormat, setExportFormat] = useState<
    'image/png' | 'image/jpeg' | 'image/webp'
  >('image/png');

  // Background removal / Key color tolerance state
  const [bgRemoveColor, setBgRemoveColor] = useState<string>('#ffffff');
  const [bgTolerance, setBgTolerance] = useState<number>(40);

  // Crop states
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentage-based crop box
  const [isCropping, setIsCropping] = useState(false);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const adjustmentStartRef = useRef<{
    y: number;
    value: number;
    key: AdjustmentKey;
  } | null>(null);
  const panStartRef = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      e.target.value = '';
      return toast.error('Please upload an image file.');
    }
    if (file.size > 25 * 1024 * 1024) {
      e.target.value = '';
      return toast.error('Choose an image under 25 MB for in-browser editing.');
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string')
        return toast.error('Could not read this image.');
      const probe = new Image();
      probe.onload = () => {
        if (
          !probe.naturalWidth ||
          !probe.naturalHeight ||
          probe.naturalWidth * probe.naturalHeight > 40_000_000
        ) {
          setImage(null);
          return toast.error(
            'This image exceeds the 40-megapixel editing limit.',
          );
        }
        setImage(result);
        setIsEditorFullscreen(true);
        setCanvasElements([]);
        setFilters(DEFAULT_FILTER_VALUES);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      probe.onerror = () => toast.error('This image could not be decoded.');
      probe.src = result;
    };
    reader.onerror = () => toast.error('Could not read this image.');
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isEditorFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEditorFullscreen(false);
        setShowToolbar(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditorFullscreen]);

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
    const safeWidth = Math.max(1, Math.min(8192, Math.round(val || 1)));
    setResizeWidth(safeWidth);
    if (maintainAspect && originalWidth > 0) {
      setResizeHeight(
        Math.max(
          1,
          Math.min(
            8192,
            Math.round((safeWidth / originalWidth) * originalHeight),
          ),
        ),
      );
    }
  };

  const handleHeightChange = (val: number) => {
    const safeHeight = Math.max(1, Math.min(8192, Math.round(val || 1)));
    setResizeHeight(safeHeight);
    if (maintainAspect && originalHeight > 0) {
      setResizeWidth(
        Math.max(
          1,
          Math.min(
            8192,
            Math.round((safeHeight / originalHeight) * originalWidth),
          ),
        ),
      );
    }
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTER_VALUES);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
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
        Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2),
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
    // Swap output dimensions for quarter-turn rotations so the image stays inside the canvas.
    const sourceWidth = Math.max(
      1,
      Math.min(8192, Math.round(resizeWidth || img.naturalWidth)),
    );
    const sourceHeight = Math.max(
      1,
      Math.min(8192, Math.round(resizeHeight || img.naturalHeight)),
    );
    if (sourceWidth * sourceHeight > 40_000_000) {
      toast.error(
        'Requested export exceeds the 40-megapixel limit. Reduce the dimensions first.',
      );
      return;
    }
    const quarterTurn = Math.abs(rotation % 180) === 90;
    canvas.width = quarterTurn ? sourceHeight : sourceWidth;
    canvas.height = quarterTurn ? sourceWidth : sourceHeight;

    ctx.save();

    // Setup transformation matrix inside canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);

    // Apply CSS-like filters directly onto HTML Canvas export context
    ctx.filter = filterString;

    ctx.drawImage(
      img,
      -sourceWidth / 2,
      -sourceHeight / 2,
      sourceWidth,
      sourceHeight,
    );
    canvasElements.forEach((element) => {
      const x = (element.x / 100) * sourceWidth - sourceWidth / 2;
      const y = (element.y / 100) * sourceHeight - sourceHeight / 2;
      ctx.fillStyle = element.color;
      if (element.type === 'rectangle')
        ctx.fillRect(
          x - sourceWidth * 0.08,
          y - sourceHeight * 0.06,
          sourceWidth * 0.16,
          sourceHeight * 0.12,
        );
      else if (element.type === 'circle') {
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          Math.min(sourceWidth, sourceHeight) * 0.07,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else {
        ctx.font = `bold ${Math.max(16, sourceWidth * 0.045)}px sans-serif`;
        ctx.fillText(element.text || 'Text', x, y, sourceWidth * 0.8);
      }
    });
    ctx.restore();

    const formatLabel = exportFormat.split('/')[1] || 'png';

    // Native HTML5 toBlob saving prevents download truncation on large images
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Export failed. Could not generate image blob.');
        return;
      }
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `pingworld-edited-${fileName.split('.')[0] || 'img'}.${formatLabel}`;
      link.href = downloadUrl;
      link.click();

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      toast.success(
        `Image exported as ${formatLabel.toUpperCase()} successfully!`,
      );
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
    onChange,
  }: {
    label: string;
    min: number;
    max: number;
    value: number;
    unit?: string;
    onChange: (val: number) => void;
  }) => (
    <div className='space-y-1 px-2 w-full'>
      <div className='flex items-center justify-between'>
        <label className='text-xs font-bold text-pw-muted uppercase'>
          {label}
        </label>
        <span className='text-xs font-mono'>
          {value}
          {unit}
        </span>
      </div>
      <input
        type='range'
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className='w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary'
      />
    </div>
  );

  return (
    <AnimatePresence>
      <div
        className={cn(
          'container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20',
          isEditorFullscreen &&
            image &&
            studioMode === 'editor' &&
            'fixed inset-0 z-[80] !m-0 !h-[100dvh] !w-full !max-w-none !p-0 !pb-0 overflow-hidden bg-[#090a13]/40 backdrop-blur-2xl',
        )}>
        <div
          className={cn(
            'flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8',
            isEditorFullscreen && 'hidden',
          )}>
          <div>
            <div className='badge mb-4'>
              <ImageIcon className='h-3.5 w-3.5' />
              Image Studio
            </div>
            <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
              Visual <span className='gradient-text'>Studio.</span>
            </h1>
            <p className='mt-2 text-pw-muted'>
              Professional filters, avatar maker, business cards &amp; more
              &mdash; 100% in-browser.
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
        <div
          className={cn(
            'flex bg-white/5 border border-white/5 rounded-3xl p-0.5 mb-8 w-fit max-w-full scrollable-row no-scrollbar',
            isEditorFullscreen && 'my-2',
          )}
          style={{ placeSelf: 'center', gap: 0 }}>
          {(
            [
              {
                id: 'editor',
                label: 'Image Editor',
                icon: <Wand2 className='h-4 w-4' />,
                only: isEditorFullscreen,
              },
              {
                id: 'profile',
                label: 'Profile Pic Maker',
                icon: <UserCircle className='h-4 w-4' />,
              },
              {
                id: 'bizcard',
                label: 'Business Card',
                icon: <CreditCard className='h-4 w-4' />,
              },
            ] as { id: StudioMode; label: string; icon: React.ReactNode }[]
          ).map((m) => (
            <Button
              key={m.id}
              variant='ghost'
              onClick={() => setStudioMode(m.id)}
              className={cn(
                'h-9 gap-2 rounded-3xl text-xs font-bold px-4 transition-all',
                studioMode === m.id ?
                  'bg-pw-primary text-white shadow-lg shadow-pw-primary/25'
                : 'text-pw-muted hover:text-white hover:bg-white/10',
                isEditorFullscreen && m.id !== 'editor' && 'hidden',
              )}>
              {m.icon}
              {m.label}
            </Button>
          ))}
        </div>
        {isEditorFullscreen && (
          <Button
            variant='ghost'
            onClick={() => {
              setIsEditorFullscreen(false);
              setShowToolbar(true);
            }}
            className='absolute right-2 top-2 z-30 h-10 w-10 gap-2 bg-white/10 text-white backdrop-blur-xl rounded-full'>
            <X className='h-4 w-4' />
          </Button>
        )}

        {studioMode === 'profile' && (
          <motion.div
            key='profile'
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}>
            <ProfilePicMaker />
          </motion.div>
        )}

        {studioMode === 'bizcard' && (
          <motion.div
            key='bizcard'
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}>
            <BusinessCardMaker />
          </motion.div>
        )}

        {studioMode === 'editor' &&
          (!image ?
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
                  Drag and drop or click to pick an image. All processing
                  happens in your browser for 100% privacy.
                </p>
              </div>
            </motion.div>
          : <div
              className={cn(
                'grid grid-cols-1 gap-2',
                !isEditorFullscreen && 'lg:grid-cols-12',
                isEditorFullscreen && 'relative h-full gap-0',
              )}>
              {isEditorFullscreen && (
                <>
                  <div className='absolute right-1 top-2 z-30 flex sm:flex-row flex-col gap-1 bg-black/30 bkblur p-1 rounded-full h-fit items-center justify-evenly sm:px-2'>
                    <Button
                      variant='ghost'
                    onClick={handleReset}
                  className={'rounded-full'}>
                      <RefreshCw className='h-4 w-4' />
                  </Button>
                  
                  
                    <Button
                      variant='ghost'
                    onClick={handleDownload}
                  className='rounded-full'>
                      <Download className='h-4 w-4' />
                  </Button>
                  
                  <Button
                      variant='ghost'
                  className={'rounded-full'}>
                      <MoreVertical className='h-4 w-4' />
                  </Button>
                  </div>
                </>
              )}
              {/* Main Editor Canvas Area */}
              <div
                className={cn(
                  !isEditorFullscreen && 'lg:col-span-7',
                  'flex flex-col gap-6',
                  isEditorFullscreen && 'h-full w-full',
                )}>
                <Card
                  className={cn(
                    'overflow-hidden bg-pw-surface/50 border-white/5 min-h-[400px] flex items-center justify-center p-0 relative bkblur  rounded-3xl',
                    isEditorFullscreen &&
                      'h-full min-h-0 bg-pw-surface/20 pt-2 pb-[40vh]',
                  )}>
                  <div className='top-2 w-full z-100 absolute flex justify-between px-2'>
                    <Button
                      variant='ghost'
                      className={
                        'p-1 bg-black/40 rounded-full h-10 w-10 bkblur shadow-md border-none text-white'
                      }
                      onClick={() =>
                        document.getElementById('image-upload')?.click()
                      }>
                      <Upload className='h-10 w-10 ' />
                      <input
                        id='image-upload'
                        type='file'
                        accept='image/*'
                        onChange={handleUpload}
                        className='hidden'
                      />
                    </Button>

                    <Button
                      variant='ghost'
                      className={
                        !isEditorFullscreen ?
                          'p-1 bg-black/40 rounded-full h-10 w-10 bkblur border-none shadow-md text-white'
                        : 'hidden'
                      }
                      onClick={() => setIsEditorFullscreen(true)}>
                      <Fullscreen className='h-10 w-10' />
                    </Button>
                  </div>

                  <div
                    ref={stageRef}
                    className='relative max-w-full w-full h-full max-h-full flex items-center justify-center'>
                    <NextImage
                      ref={imgRef}
                      src={image}
                      width={1280}
                      height={900}
                      unoptimized
                      onLoad={handleImageLoad}
                      onDoubleClick={() => {
                        if (!focusedAdjustment) return;
                        setFilters((current) => ({
                          ...current,
                          [focusedAdjustment]:
                            DEFAULT_FILTER_VALUES[focusedAdjustment],
                        }));
                        toast.success(
                          `${ADJUSTMENT_CONTROLS.find((item) => item.key === focusedAdjustment)?.label} reset`,
                        );
                      }}
                      alt='Editing Image'
                      draggable={false}
                      onPointerDown={(event) => {
                        if (activeTab === 'adjust' && focusedAdjustment) {
                          event.preventDefault();
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          adjustmentStartRef.current = {
                            y: event.clientY,
                            value: filters[focusedAdjustment],
                            key: focusedAdjustment,
                          };
                          setIsPointerAdjusting(true);
                          return;
                        }
                        if (
                          activeTab === 'adjust' &&
                          !focusedAdjustment &&
                          zoom > 1
                        ) {
                          event.preventDefault();
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          panStartRef.current = {
                            x: event.clientX,
                            y: event.clientY,
                            startX: pan.x,
                            startY: pan.y,
                          };
                          return;
                        }
                        if (activeTab !== 'crop') return;
                        const rect =
                          event.currentTarget.getBoundingClientRect();
                        if (!rect.width || !rect.height) return;
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const x = Math.max(
                          0,
                          Math.min(
                            100,
                            ((event.clientX - rect.left) / rect.width) * 100,
                          ),
                        );
                        const y = Math.max(
                          0,
                          Math.min(
                            100,
                            ((event.clientY - rect.top) / rect.height) * 100,
                          ),
                        );
                        cropStartRef.current = { x, y };
                        setCropBox({ x, y, w: 0, h: 0 });
                        setIsCropping(true);
                      }}
                      onPointerMove={(event) => {
                        const adjustmentStart = adjustmentStartRef.current;
                        if (adjustmentStart && activeTab === 'adjust') {
                          const config = ADJUSTMENT_CONTROLS.find(
                            (item) => item.key === adjustmentStart.key,
                          )!;
                          const delta =
                            Math.round(
                              ((adjustmentStart.y - event.clientY) / 3) * 2,
                            ) / 2;
                          const nextValue = Math.max(
                            config.min,
                            Math.min(config.max, adjustmentStart.value + delta),
                          );
                          setFilters((current) => ({
                            ...current,
                            [adjustmentStart.key]: nextValue,
                          }));
                          return;
                        }
                        const panStart = panStartRef.current;
                        if (panStart && activeTab === 'adjust') {
                          setPan({
                            x: panStart.startX + event.clientX - panStart.x,
                            y: panStart.startY + event.clientY - panStart.y,
                          });
                          return;
                        }
                        const start = cropStartRef.current;
                        if (!start || activeTab !== 'crop') return;
                        const rect =
                          event.currentTarget.getBoundingClientRect();
                        const x = Math.max(
                          0,
                          Math.min(
                            100,
                            ((event.clientX - rect.left) / rect.width) * 100,
                          ),
                        );
                        const y = Math.max(
                          0,
                          Math.min(
                            100,
                            ((event.clientY - rect.top) / rect.height) * 100,
                          ),
                        );
                        setCropBox({
                          x: Math.min(start.x, x),
                          y: Math.min(start.y, y),
                          w: Math.abs(x - start.x),
                          h: Math.abs(y - start.y),
                        });
                      }}
                      onPointerUp={(event) => {
                        if (adjustmentStartRef.current) {
                          adjustmentStartRef.current = null;
                          setIsPointerAdjusting(false);
                          if (
                            event.currentTarget.hasPointerCapture(
                              event.pointerId,
                            )
                          )
                            event.currentTarget.releasePointerCapture(
                              event.pointerId,
                            );
                          return;
                        }
                        if (panStartRef.current) {
                          panStartRef.current = null;
                          if (
                            event.currentTarget.hasPointerCapture(
                              event.pointerId,
                            )
                          )
                            event.currentTarget.releasePointerCapture(
                              event.pointerId,
                            );
                          return;
                        }
                        if (!cropStartRef.current) return;
                        cropStartRef.current = null;
                        setIsCropping(false);
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        )
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                      }}
                      onPointerCancel={() => {
                        adjustmentStartRef.current = null;
                        cropStartRef.current = null;
                        panStartRef.current = null;
                        setIsPointerAdjusting(false);
                        setIsCropping(false);
                      }}
                      className={cn(
                        'w-full max-w-full h-full rounded-lg shadow-2xl transition-all',
                        isEditorFullscreen ?
                          'max-h-[calc(100dvh-40vh)] max-w-[96vw] rounded-xl'
                        : 'max-h-[60vh]',
                        (activeTab === 'crop' ||
                          (activeTab === 'adjust' &&
                            (focusedAdjustment || zoom > 1))) &&
                          'touch-none select-none',
                        activeTab === 'crop' && 'cursor-crosshair',
                        activeTab === 'adjust' &&
                          focusedAdjustment &&
                          'cursor-ns-resize',
                        activeTab === 'adjust' &&
                          !focusedAdjustment &&
                          zoom > 1 &&
                          'cursor-grab',
                      )}
                      style={{
                        filter: filterString,
                        transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        objectFit: 'contain',
                      }}
                    />

                    {canvasElements.length > 0 && (
                      <svg
                        className='absolute inset-0 h-full w-full overflow-visible'
                        viewBox='0 0 100 100'
                        preserveAspectRatio='none'
                        style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                          touchAction: 'none',
                        }}
                        onPointerMove={(event) => {
                          const id = draggingElementRef.current;
                          if (!id || !stageRef.current) return;
                          const rect = stageRef.current.getBoundingClientRect();
                          const x = Math.max(
                            0,
                            Math.min(
                              100,
                              ((event.clientX - rect.left) / rect.width) * 100,
                            ),
                          );
                          const y = Math.max(
                            0,
                            Math.min(
                              100,
                              ((event.clientY - rect.top) / rect.height) * 100,
                            ),
                          );
                          setCanvasElements((items) =>
                            items.map((item) =>
                              item.id === id ? { ...item, x, y } : item,
                            ),
                          );
                        }}
                        onPointerUp={() => {
                          draggingElementRef.current = null;
                        }}>
                        {canvasElements.map((item) => (
                          <g
                            key={item.id}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedCanvasElementId(item.id);
                              draggingElementRef.current = item.id;
                              event.currentTarget.ownerSVGElement?.setPointerCapture(
                                event.pointerId,
                              );
                            }}
                            style={{ cursor: 'move', pointerEvents: 'all' }}>
                            {item.type === 'rectangle' ?
                              <rect
                                x={item.x - 8}
                                y={item.y - 6}
                                width='16'
                                height='12'
                                rx='1.5'
                                fill={item.color}
                                stroke='white'
                                strokeWidth='0.5'
                              />
                            : item.type === 'circle' ?
                              <circle
                                cx={item.x}
                                cy={item.y}
                                r='7'
                                fill={item.color}
                                stroke='white'
                                strokeWidth='0.5'
                              />
                            : <text
                                x={item.x}
                                y={item.y}
                                fill={item.color}
                                stroke='white'
                                strokeWidth='0.2'
                                fontSize='6'
                                fontWeight='bold'>
                                {item.text || 'Text'}
                              </text>
                            }
                          </g>
                        ))}
                      </svg>
                    )}

                    {activeTab === 'adjust' &&
                      focusedAdjustment &&
                      (() => {
                        const control = ADJUSTMENT_CONTROLS.find(
                          (item) => item.key === focusedAdjustment,
                        )!;
                        const Icon = control.icon;
                        return (
                          <div
                            className={cn(
                              'absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/5 bg-black/65 px-3 py-1.5 text-xs text-white shadow-lg bkblur transition-opacity',
                              isPointerAdjusting ? 'opacity-100' : 'opacity-75',
                            )}>
                            <Icon className='h-3.5 w-3.5 text-pw-primary' />
                            <span>{control.label}</span>
                            <span className='font-mono tabular-nums'>
                              {filters[focusedAdjustment]}
                              {control.unit}
                            </span>
                          </div>
                        );
                      })()}

                    <div
                      className={cn(
                        'absolute bottom-2 z-10 flex items-center gap-1 rounded-full border border-white/5 bg-black/60 text-white shadow-lg backdrop-blur-md',
                        isEditorFullscreen ? 'bottom-4' : 'right-1',
                      )}
                      aria-label='Image zoom controls'>
                      <button
                        type='button'
                        aria-label='Zoom out'
                        title='Zoom out'
                        disabled={zoom <= 0.5}
                        onClick={() =>
                          setZoom((value) =>
                            Math.max(
                              0.5,
                              Math.round((value - 0.25) * 100) / 100,
                            ),
                          )
                        }
                        className='grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40'>
                        <ZoomOut className='h-4 w-4' />
                      </button>
                      <button
                        type='button'
                        aria-label='Reset zoom'
                        title='Reset zoom'
                        onClick={() => {
                          setZoom(1);
                          setPan({ x: 0, y: 0 });
                        }}
                        className='min-w-12 px-1 text-[10px] font-mono tabular-nums hover:text-pw-primary'>
                        {Math.round(zoom * 100)}%
                      </button>
                      <button
                        type='button'
                        aria-label='Zoom in'
                        title='Zoom in'
                        disabled={zoom >= 3}
                        onClick={() =>
                          setZoom((value) =>
                            Math.min(3, Math.round((value + 0.25) * 100) / 100),
                          )
                        }
                        className='grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40'>
                        <ZoomIn className='h-4 w-4' />
                      </button>
                    </div>

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
              <div
                className={cn(
                  !isEditorFullscreen && 'lg:col-span-5',
                  'flex flex-col gap-4 flex-1',
                  isEditorFullscreen &&
                    'fixed inset-x-0 bottom-0 z-20 h-fit max-h-[40vh] gap-2 px-2 bg-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 w-full max-w-[800px] left-1/2 -translate-x-1/2',
                )}>
                {isEditorFullscreen && (
                  <Button
                    onClick={() => setShowToolbar(!showToolbar)}
                    variant='outline'
                    className='absolute top-[-45px] z-50 right-1 p-1 w-12 h-10 bg-pw-surface/10 bkblur items-center flex shadow-md rounded-full border border-white/5 bg-black/60 text-white shadow-lg shadow-pw-primary/20 backdrop-blur-md'>
                    <ChevronDown
                      className={cn('h-12 w-12', !showToolbar && 'rotate-180')}
                    />
                  </Button>
                )}

                <div
                  className='flex gap-1 bg-black/5 border border-white/5 rounded-3xl overflow-x-auto scrollable-row items-center bkblur p-0.5 shadow-md'
                  style={{ paddingBottom: 0.5, gap: 0 }}>
                  <Button
                    variant='ghost'
                    onClick={() => {
                      setActiveTab('adjust');
                      setShowToolbar(true);
                    }}
                    className={cn(
                      'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                      activeTab === 'adjust' &&
                        'bg-pw-primary text-white shadow-lg',
                    )}>
                    <Scaling className='h-3.5 w-3.5' /> Adjust
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() => {
                      setActiveTab('filters');
                      setShowToolbar(true);
                    }}
                    className={cn(
                      'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                      activeTab === 'filters' &&
                        'bg-pw-primary text-white shadow-lg',
                    )}>
                    <Palette className='h-3.5 w-3.5' /> Filters
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() => {
                      setActiveTab('transform');
                      setShowToolbar(true);
                    }}
                    className={cn(
                      'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                      activeTab === 'transform' &&
                        'bg-pw-primary text-white shadow-lg',
                    )}>
                    <RotateCw className='h-3.5 w-3.5' /> Transform
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() => {
                      setActiveTab('crop');
                      setShowToolbar(true);
                    }}
                    className={cn(
                      'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                      activeTab === 'crop' &&
                        'bg-pw-primary text-white shadow-lg',
                    )}>
                    <Scissors className='h-3.5 w-3.5' /> Crop
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() => {
                      setActiveTab('bg');
                      setShowToolbar(true);
                    }}
                    className={cn(
                      'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0',
                      activeTab === 'bg' &&
                        'bg-pw-primary text-white shadow-lg',
                    )}>
                    <Eraser className='h-3.5 w-3.5' /> BG Tools
                  </Button>
                </div>

                {showToolbar && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}>
                    <Card
                      className={cn(
                        'p-2 flex flex-col gap-6 rounded-[30px] pb-4',
                        isEditorFullscreen ?
                          'border-0 border-none bg-black/5 bkblur max-h-[30vh] overflow-y-auto flex-1 no-scrollbar shadow-lg'
                        : 'bg-card',
                      )}>
                      {activeTab === 'adjust' && (
                        <div className='space-y-5 flex items-center flex-col max-w-full relative pb-2'>
                          <div
                            className={cn(
                              'flex items-center justify-between max-w-[100%] gap-1 scrollable-row shrink-0 flex-1',
                              !isEditorFullscreen &&
                                'border border-white/5 bg-white/[0.03] rounded-full p-1',
                            )}
                            role='group'
                            aria-label='Image adjustments'>
                            {ADJUSTMENT_CONTROLS.map(
                              ({ key, label, icon: Icon }) => (
                                <button
                                  key={key}
                                  type='button'
                                  title={`${label} (double-click image to reset)`}
                                  aria-label={label}
                                  aria-pressed={focusedAdjustment === key}
                                  onClick={() =>
                                    setFocusedAdjustment((current) =>
                                      current === key ? null : key,
                                    )
                                  }
                                  className={cn(
                                    'flex h-12 w-12 items-center justify-center rounded-full transition-all shrink-0',
                                    focusedAdjustment === key ?
                                      'bg-pw-primary text-white shadow-sm shadow-pw-primary/10'
                                    : 'text-pw-muted hover:bg-white/10 hover:text-white',
                                  )}>
                                  <Icon className='h-6 w-6' />
                                </button>
                              ),
                            )}
                          </div>

                          {focusedAdjustment ?
                            (() => {
                              const activeKey = focusedAdjustment;
                              const control = ADJUSTMENT_CONTROLS.find(
                                (item) => item.key === activeKey,
                              )!;
                              return (
                                <>
                                  <SliderInput
                                    label={control.label}
                                    min={control.min}
                                    max={control.max}
                                    value={filters[activeKey]}
                                    unit={control.unit}
                                    onChange={(value) =>
                                      setFilters((current) => ({
                                        ...current,
                                        [activeKey]: value,
                                      }))
                                    }
                                  />
                                  <p className='text-[10px] text-pw-muted select-none'>
                                    Drag on the image to adjust; double-tap to
                                    reset this value.
                                  </p>
                                </>
                              );
                            })()
                          : <p className='text-[10px] text-pw-muted px-2 text-center'>
                              No adjustment selected. Choose an icon to edit, or
                              use the zoom controls and drag the zoomed image to
                              pan.
                            </p>
                          }
                          {!isEditorFullscreen && (
                            <Button
                              variant='ghost'
                              onClick={handleReset}
                              className='w-fit px-5 h-10 rounded-full ring-0 bg-pw-danger/10 text-pw-danger hover:bg-pw-danger/20 mt-4'>
                              <RefreshCw className='h-4 w-4 mr-2' /> Reset
                              Adjustments
                            </Button>
                          )}

                         <div className='flex flex-wrap items-center gap-2 border-t border-white/10 pt-2'>
                      <span className='mr-1 text-[10px] font-bold uppercase tracking-wider text-pw-muted'>
                        Elements
                      </span>
                      {(['rectangle', 'circle', 'text'] as const).map(
                        (type) => (
                          <Button
                            key={type}
                            type='button'
                            variant='outline'
                            className='h-8 gap-1 px-2 text-xs'
                            onClick={() => {
                              const text =
                                type === 'text' ?
                                  window
                                    .prompt(
                                      'Text to place on the image',
                                      'Your text',
                                    )
                                    ?.slice(0, 200)
                                : undefined;
                              if (type === 'text' && !text) return;
                              const newId = crypto.randomUUID();
                              setCanvasElements((items) => [
                                ...items,
                                {
                                  id: newId,
                                  type,
                                  x: 50,
                                  y: 50,
                                  color: '#f97316',
                                  text,
                                },
                              ]);
                              setSelectedCanvasElementId(newId);
                              toast.success(
                                `${type === 'text' ? 'Text' : type} added. Drag it into position.`,
                              );
                            }}>
                            <Plus className='h-3.5 w-3.5' />
                            {type}
                          </Button>
                        ),
                      )}
                      {selectedCanvasElementId &&
                        canvasElements.some(
                          (item) => item.id === selectedCanvasElementId,
                        ) && (
                          <>
                            <input
                              aria-label='Selected element color'
                              type='color'
                              className='h-8 w-9 rounded border-0 bg-transparent p-0'
                              value={
                                canvasElements.find(
                                  (item) => item.id === selectedCanvasElementId,
                                )?.color || '#f97316'
                              }
                              onChange={(event) =>
                                setCanvasElements((items) =>
                                  items.map((item) =>
                                    item.id === selectedCanvasElementId ?
                                      { ...item, color: event.target.value }
                                    : item,
                                  ),
                                )
                              }
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              className='h-8 px-2 text-xs text-pw-danger'
                              onClick={() => {
                                setCanvasElements((items) =>
                                  items.filter(
                                    (item) =>
                                      item.id !== selectedCanvasElementId,
                                  ),
                                );
                                setSelectedCanvasElementId(null);
                              }}>
                              <Trash2 className='mr-1 h-3.5 w-3.5' />
                              Remove
                            </Button>
                          </>
                        )}
                    </div> 
                        </div>
                      )}

                      {activeTab === 'filters' && (
                        <div className='flex items-center h-30 shrink-0 w-full gap-3 scrollable-row'>
                          {PRESET_FILTERS.map((f) => (
                            <button
                              key={f.name}
                              onClick={() => setFilters(f.values)}
                              className={cn(
                                'flex flex-col items-center gap-1 p-1 rounded-2xl border border-white/5 bg-white/5 hover:border-pw-primary/50 transition-all group h-30',
                                JSON.stringify(filters) ===
                                  JSON.stringify(f.values) &&
                                  'border-pw-primary bg-pw-primary/5',
                              )}>
                              <div className='w-28 h-full aspect-video rounded-xl overflow-hidden relative'>
                                <NextImage
                                  src={image}
                                  alt={f.name}
                                  width={640}
                                  height={360}
                                  unoptimized
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
                              <span className='text-xs font-medium'>
                                {f.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {activeTab === 'transform' && (
                        <div className='space-y-4'>
                          <div className='flex flex-wrap gap-2'>
                            <Button
                              variant='outline'
                              onClick={() =>
                                setRotation((prev) => (prev + 90) % 360)
                              }
                              className='h-10 border-white/10 flex items-center justify-center gap-2 rounded-full px-4'>
                              <RotateCw className='h-4 w-4' /> Rotate 90°
                            </Button>
                            <Button
                              variant='outline'
                              onClick={() => setFlipH((prev) => !prev)}
                              className={cn(
                                'h-10 border-white/10 flex items-center justify-center gap-2 rounded-full px-4',
                                flipH && 'bg-pw-primary/20 border-pw-primary',
                              )}>
                              <FlipHorizontal className='h-4 w-4' /> Flip H
                            </Button>
                            <Button
                              variant='outline'
                              onClick={() => setFlipV((prev) => !prev)}
                              className={cn(
                                'h-10 border-white/10 flex items-center justify-center gap-2 rounded-full px-4',
                                flipV && 'bg-pw-primary/20 border-pw-primary',
                              )}>
                              <FlipVertical className='h-4 w-4' /> Flip V
                            </Button>
                          </div>

                          <div className='space-y-2 pt-4 border-t border-white/5'>
                            <p className='text-xs font-bold text-pw-muted uppercase'>
                              Image Resizing
                            </p>
                            <select
                              aria-label='Resize preset'
                              defaultValue=''
                              onChange={(e) => {
                                const preset = e.target.value;
                                if (preset === 'original') {
                                  setResizeWidth(originalWidth);
                                  setResizeHeight(originalHeight);
                                } else if (preset) {
                                  const [width, height] = preset
                                    .split('x')
                                    .map(Number);
                                  if (
                                    maintainAspect &&
                                    originalWidth &&
                                    originalHeight
                                  ) {
                                    const scale = Math.min(
                                      width / originalWidth,
                                      height / originalHeight,
                                    );
                                    setResizeWidth(
                                      Math.max(
                                        1,
                                        Math.round(originalWidth * scale),
                                      ),
                                    );
                                    setResizeHeight(
                                      Math.max(
                                        1,
                                        Math.round(originalHeight * scale),
                                      ),
                                    );
                                  } else {
                                    setResizeWidth(width);
                                    setResizeHeight(height);
                                  }
                                }
                                e.currentTarget.value = '';
                              }}
                              className='h-9 w-full rounded-lg border border-white/10 bg-pw-surface px-3 text-xs text-white focus:border-pw-primary focus:outline-none'>
                              <option
                                value=''
                                disabled>
                                Quick size preset…
                              </option>
                              <option value='original'>
                                Original · {originalWidth} × {originalHeight}
                              </option>
                              <option value='512x512'>
                                Avatar · 512 × 512 (fit)
                              </option>
                              <option value='1080x1080'>
                                Social square · 1080 × 1080 (fit)
                              </option>
                              <option value='1280x720'>
                                HD · 1280 × 720 (fit)
                              </option>
                              <option value='1920x1080'>
                                Full HD · 1920 × 1080 (fit)
                              </option>
                            </select>
                            <div className='grid grid-cols-2 gap-4'>
                              <div>
                                <label className='text-[10px] text-pw-muted font-bold block mb-1'>
                                  WIDTH (PX)
                                </label>
                                <Input
                                  type='number'
                                  min={1}
                                  max={8192}
                                  value={resizeWidth}
                                  onChange={(e) =>
                                    handleWidthChange(Number(e.target.value))
                                  }
                                  className='glass bkblur border-white/10 h-10 animate-none'
                                />
                              </div>
                              <div>
                                <label className='text-[10px] text-pw-muted font-bold block mb-1'>
                                  HEIGHT (PX)
                                </label>
                                <Input
                                  type='number'
                                  min={1}
                                  max={8192}
                                  value={resizeHeight}
                                  onChange={(e) =>
                                    handleHeightChange(Number(e.target.value))
                                  }
                                  className='glass bkblur border-white/10 h-10 animate-none'
                                />
                              </div>
                            </div>
                            <label className='flex items-center gap-2 text-xs text-pw-muted cursor-pointer select-none'>
                              <input
                                type='checkbox'
                                checked={maintainAspect}
                                onChange={(e) =>
                                  setMaintainAspect(e.target.checked)
                                }
                                className='rounded border-white/10 bg-white/5 h-4 w-4 accent-pw-primary'
                              />
                              Lock Aspect Ratio
                            </label>
                          </div>

                          <div className='space-y-2 pt-4 border-t border-white/5'>
                            <p className='text-xs font-bold text-pw-muted uppercase'>
                              Export Format
                            </p>
                            <select
                              aria-label='Export image format'
                              value={exportFormat}
                              onChange={(e) =>
                                setExportFormat(
                                  e.target.value as typeof exportFormat,
                                )
                              }
                              className='h-10 w-full rounded-lg border border-white/10 bg-pw-surface px-3 text-xs font-semibold text-white focus:border-pw-primary focus:outline-none glass bkblur'>
                              <option value='image/png'>
                                PNG · lossless transparency
                              </option>
                              <option value='image/jpeg'>
                                JPEG · smaller photos
                              </option>
                              <option value='image/webp'>
                                WebP · compact modern image
                              </option>
                            </select>
                          </div>
                        </div>
                      )}

                      {activeTab === 'crop' && (
                        <div className='space-y-4 p-1'>
                          <p className='text-xs text-pw-muted mb-2 uppercase font-bold tracking-widest p-1'>
                            Interactive Crop Settings
                          </p>

                          <div className='space-y-4'>
                            <SliderInput
                              label='Crop X Position'
                              min={0}
                              max={80}
                              value={cropBox.x}
                              unit='%'
                              onChange={(val) =>
                                setCropBox({ ...cropBox, x: val })
                              }
                            />
                            <SliderInput
                              label='Crop Y Position'
                              min={0}
                              max={80}
                              value={cropBox.y}
                              unit='%'
                              onChange={(val) =>
                                setCropBox({ ...cropBox, y: val })
                              }
                            />
                            <SliderInput
                              label='Crop Width'
                              min={10}
                              max={100 - cropBox.x}
                              value={cropBox.w}
                              unit='%'
                              onChange={(val) =>
                                setCropBox({ ...cropBox, w: val })
                              }
                            />
                            <SliderInput
                              label='Crop Height'
                              min={10}
                              max={100 - cropBox.y}
                              value={cropBox.h}
                              unit='%'
                              onChange={(val) =>
                                setCropBox({ ...cropBox, h: val })
                              }
                            />

                            <Button
                              onClick={performCrop}
                              className='w-full btn-primary h-11 gap-2 mt-4'>
                              <CropIcon className='h-4 w-4' /> Apply Selected
                              Crop
                            </Button>
                          </div>
                        </div>
                      )}

                      {activeTab === 'bg' && (
                        <div className='space-y-4 p-1'>
                        <p className='text-xs text-pw-muted mb-2 uppercase font-bold tracking-widest p-1'>
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
                                    onChange={(e) =>
                                      setBgRemoveColor(e.target.value)
                                    }
                                    className='w-10 h-10 rounded cursor-pointer border-none bg-transparent'
                                  />
                                  <Input
                                    value={bgRemoveColor}
                                    onChange={(e) =>
                                      setBgRemoveColor(e.target.value)
                                    }
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
                              <Eraser className='h-4 w-4' /> Erase Background
                              Pixels
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              {!isEditorFullscreen &&
                <div className='bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-6'>
                  <h4 className='text-sm font-bold flex items-center gap-2 mb-4'>
                    <Layers className='h-4 w-4 text-pw-secondary' /> Active
                    Image Specs
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
                  </div>
                </div>
              }
              </div>
            </div>)}
      </div>
    </AnimatePresence>
  );
}
