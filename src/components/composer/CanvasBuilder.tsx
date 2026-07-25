'use client';

import { useRef, useState, useEffect } from 'react';
import {
  Type,
  Palette,
  Plus,
  Trash2,
  Download,
  Layers,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Circle,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { CANVAS_FONTS, PREMIUM_FEATURES } from '@/lib/composer/constants';
import { PremiumGate } from './PremiumGate';
import { toast } from 'sonner';

const BG_PRESETS = [
  { label: 'Dark', value: 'linear-gradient(135deg, #12152e 0%, #1a1f40 100%)' },
  {
    label: 'Purple',
    value: 'linear-gradient(135deg, #5c6fff 0%, #985cff 100%)',
  },
  { label: 'Cyan', value: 'linear-gradient(135deg, #22d4fd 0%, #0a66c2 100%)' },
  { label: 'Warm', value: 'linear-gradient(135deg, #ff8c42 0%, #ff5c7a 100%)' },
  {
    label: 'Emerald',
    value: 'linear-gradient(135deg, #22c985 0%, #0a66c2 100%)',
  },
  { label: 'Gold', value: 'linear-gradient(135deg, #ffb347 0%, #985cff 100%)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
];

const templateFeature = PREMIUM_FEATURES.find(
  (f) => f.id === 'canvas_templates',
)!;

interface CanvasShape {
  id: string;
  type: 'circle' | 'square';
  color: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  size: number;
  x: number;
  y: number;
}

export function CanvasBuilder() {
  const { state, dispatch } = useComposer();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Custom added local state for canvas shapes
  const [shapes, setShapes] = useState<CanvasShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Active overlays/layers controls state
  const [selectedOverlayIdx, setSelectedOverlayIdx] = useState<number | null>(
    null,
  );

  // Layer shadow state
  const [addShadow, setAddShadow] = useState(true);

  // Base adding tool variables
  const [newText, setNewText] = useState('Add text...');
  const [newFont, setNewFont] = useState('Syne');
  const [newFontSize, setNewFontSize] = useState(32);
  const [newColor, setNewColor] = useState('#ffffff');
  const [newBold, setNewBold] = useState(true);

  const [canvasPreview, setCanvasPreview] = useState<string | null>(null);

  // Dragging states
  const [draggingTextIdx, setDraggingTextIdx] = useState<number | null>(null);
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load effects immediately to state fields when selecting a different text layer
  useEffect(() => {
    if (
      selectedOverlayIdx !== null &&
      state.canvasTextOverlays[selectedOverlayIdx]
    ) {
      const activeOverlay = state.canvasTextOverlays[selectedOverlayIdx];
      setNewText(activeOverlay.text);
      setNewFont(activeOverlay.fontFamily);
      setNewFontSize(activeOverlay.fontSize);
      setNewColor(activeOverlay.color);
      setNewBold(activeOverlay.bold);
    }
  }, [selectedOverlayIdx, state.canvasTextOverlays]);

  const handleUpdateActiveLayer = (
    updates: Partial<(typeof state.canvasTextOverlays)[0]>,
  ) => {
    if (selectedOverlayIdx === null) return;
    const current = state.canvasTextOverlays[selectedOverlayIdx];
    dispatch({
      type: 'UPDATE_CANVAS_TEXT',
      payload: {
        index: selectedOverlayIdx,
        overlay: { ...current, ...updates },
      },
    });
  };

  const addTextOverlay = () => {
    const overlay = {
      text: newText,
      fontFamily: newFont,
      fontSize: newFontSize,
      color: newColor,
      bold: newBold,
      italic: false,
      x: 50,
      y: 50,
    };
    dispatch({ type: 'ADD_CANVAS_TEXT', payload: overlay });
    setSelectedOverlayIdx(state.canvasTextOverlays.length);
    toast.success('Text layer added!');
  };

  const addShapeOverlay = (type: 'circle' | 'square') => {
    const shape: CanvasShape = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      color: '#3b82f6',
      borderColor: '#ffffff',
      borderWidth: 0,
      opacity: 0.8,
      size: 80,
      x: 50,
      y: 50,
    };
    setShapes((prev) => [...prev, shape]);
    setSelectedShapeId(shape.id);
    setSelectedOverlayIdx(null);
    toast.success(
      `${type === 'circle' ? 'Circle' : 'Square'} added to canvas!`,
    );
  };

  const removeOverlay = (idx: number) => {
    dispatch({ type: 'REMOVE_CANVAS_TEXT', payload: idx });
    if (selectedOverlayIdx === idx) setSelectedOverlayIdx(null);
  };

  const removeShape = (id: string) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };

  const handlePointerDownText = (idx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLDivElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    setSelectedOverlayIdx(idx);
    setSelectedShapeId(null);
    setDraggingTextIdx(idx);
    const overlay = state.canvasTextOverlays[idx];
    const bounding = canvasRef.current?.getBoundingClientRect();
    if (!bounding) return;
    const clickX = ((e.clientX - bounding.left) / bounding.width) * 100;
    const clickY = ((e.clientY - bounding.top) / bounding.height) * 100;
    setDragOffset({ x: clickX - overlay.x, y: clickY - overlay.y });
  };

  const handlePointerDownShape = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLDivElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    setSelectedShapeId(id);
    setSelectedOverlayIdx(null);
    setDraggingShapeId(id);
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;
    const bounding = canvasRef.current?.getBoundingClientRect();
    if (!bounding) return;
    const clickX = ((e.clientX - bounding.left) / bounding.width) * 100;
    const clickY = ((e.clientY - bounding.top) / bounding.height) * 100;
    setDragOffset({ x: clickX - shape.x, y: clickY - shape.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const bounding = canvasRef.current?.getBoundingClientRect();
    if (!bounding) return;
    const mouseX = ((e.clientX - bounding.left) / bounding.width) * 100;
    const mouseY = ((e.clientY - bounding.top) / bounding.height) * 100;

    if (draggingTextIdx !== null) {
      const current = state.canvasTextOverlays[draggingTextIdx];
      const targetX = Math.max(0, Math.min(100, mouseX - dragOffset.x));
      const targetY = Math.max(0, Math.min(100, mouseY - dragOffset.y));
      dispatch({
        type: 'UPDATE_CANVAS_TEXT',
        payload: {
          index: draggingTextIdx,
          overlay: { ...current, x: targetX, y: targetY },
        },
      });
    } else if (draggingShapeId !== null) {
      const targetX = Math.max(0, Math.min(100, mouseX - dragOffset.x));
      const targetY = Math.max(0, Math.min(100, mouseY - dragOffset.y));
      setShapes((prev) =>
        prev.map((s) =>
          s.id === draggingShapeId ? { ...s, x: targetX, y: targetY } : s,
        ),
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {}
    setDraggingTextIdx(null);
    setDraggingShapeId(null);
  };

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(canvasRef.current, {
        scale: 1.5,
        backgroundColor: null, 
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      // Add PingWorld watermark
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '14px Syne, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('pingwrld.com', canvas.width - 120, canvas.height - 12);
      }

      const dataUrl = canvas.toDataURL('image/png');
      setCanvasPreview(dataUrl);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `pingworld-instagram-canvas-${Date.now()}.png`;
      link.click();
      toast.success('Canvas downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Download failed — try again');
    } finally {
      setDownloading(false);
    }
  };

  const selectedShape = shapes.find((s) => s.id === selectedShapeId);

  return (
    <div className='space-y-5 select-none'>
      <div className='flex items-center gap-2'>
        <Layers className='h-4 w-4 text-pw-secondary' />
        <p className='text-xs font-bold text-pw-text'>Canvas Builder</p>
        <span className='text-[10px] text-pw-muted ml-auto'>
          Interactive vector canvas
        </span>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Canvas Area with unified pointer dragging listeners */}
        <div className='w-full relative flex flex-col items-center mb-2'>
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className='relative w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 touch-none'
            style={{ background: state.canvasBackground }}>
            {state.canvasTextOverlays.length === 0 && shapes.length === 0 && (
              <p className='text-white/30 text-xs sm:text-sm font-semibold'>
                Add vector shapes & layers below
              </p>
            )}

            {/* Render shapes */}
            {shapes.map((shape) => (
              <div
                key={shape.id}
                onPointerDown={(e) => handlePointerDownShape(shape.id, e)}
                onPointerUp={handlePointerUp}
                style={{
                  position: 'absolute',
                  top: `${shape.y}%`,
                  left: `${shape.x}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${shape.size}px`,
                  height: `${shape.size}px`,
                  backgroundColor: shape.color,
                  borderColor: shape.borderColor,
                  borderWidth: `${shape.borderWidth}px`,
                  borderStyle: shape.borderWidth > 0 ? 'solid' : 'none',
                  opacity: shape.opacity,
                  borderRadius: shape.type === 'circle' ? '50%' : '8px',
                  cursor: 'move',
                  touchAction: 'none'
                }}
                className={cn(
                  'transition-all duration-75',
                  selectedShapeId === shape.id &&
                    'ring-2 ring-white/70 scale-105 shadow-xl',
                )}
              />
            ))}

            {/* Render text layers */}
            {state.canvasTextOverlays.map((overlay, i) => (
              <div
                key={i}
                onPointerDown={(e) => handlePointerDownText(i, e)}
                onPointerUp={handlePointerUp}
                className={cn(
                  'absolute cursor-move select-none transition-all duration-75 touch-none',
                  selectedOverlayIdx === i &&
                    'ring-1 ring-white/50 rounded px-1 scale-105',
                )}
                style={{
                  top: `${overlay.y}%`,
                  left: `${overlay.x}%`,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: overlay.fontFamily,
                  fontSize: `${overlay.fontSize}px`,
                  color: overlay.color,
                  fontWeight: overlay.bold ? 700 : 400,
                  fontStyle: overlay.italic ? 'italic' : 'normal',
                  textShadow: addShadow ? '0 2px 8px rgba(0,0,0,0.6)' : 'none',
                  maxWidth: '90%',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  touchAction: 'none'
                }}>
                {overlay.text}
              </div>
            ))}

            {/* PingWorld watermark */}
            <div className='absolute bottom-2 right-3 text-[10px] font-bold text-white/30 pointer-events-none'>
              pingwrld.com
            </div>
          </div>

          {/* BG Presets */}
          <div className='space-y-2 mt-3 w-full'>
            <label className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
              Background Pattern
            </label>
            <div className='flex gap-2 flex-wrap px-1'>
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() =>
                    dispatch({ type: 'SET_CANVAS_BG', payload: preset.value })
                  }
                  className={cn(
                    'h-7 w-7 rounded-lg border-2 transition-all',
                    state.canvasBackground === preset.value ?
                      'border-pw-primary scale-110'
                    : 'border-white/10 hover:border-white/30',
                  )}
                  title={preset.label}
                  style={{ background: preset.value }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Vector Elements Controls */}
        <div className='w-full relative flex flex-col items-center space-y-4'>
          {/* Quick Shape Adder Toolbar */}
          <div className='p-3.5 w-full rounded-xl bg-white/[0.03] border border-white/10 space-y-2'>
            <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
              Vector Shapes Layer
            </p>
            <div className='grid grid-cols-2 gap-2'>
              <button
                onClick={() => addShapeOverlay('circle')}
                className='flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-pw-text'>
                <Circle className='h-4 w-4 text-pw-primary' /> Add Circle
              </button>
              <button
                onClick={() => addShapeOverlay('square')}
                className='flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-pw-text'>
                <Square className='h-4 w-4 text-pw-secondary' /> Add Square
              </button>
            </div>
          </div>

          {/* Shape Editor Toolbar Panel */}
          {selectedShape && (
            <div className='p-4 w-full rounded-xl bg-white/[0.03] border border-white/10 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase text-pw-secondary tracking-widest'>
                  Editing {selectedShape.type}
                </span>
                <button
                  onClick={() => removeShape(selectedShape.id)}
                  className='text-pw-muted hover:text-pw-danger transition-colors p-1'>
                  <Trash2 className='h-3.5 w-3.5' />
                </button>
              </div>

              {/* Color */}
              <div className='flex items-center gap-3 justify-between'>
                <span className='text-xs text-pw-muted'>Shape Color</span>
                <input
                  type='color'
                  value={selectedShape.color}
                  onChange={(e) =>
                    setShapes((prev) =>
                      prev.map((s) =>
                        s.id === selectedShapeId ?
                          { ...s, color: e.target.value }
                        : s,
                      ),
                    )
                  }
                  className='h-6 w-10 rounded cursor-pointer border-none bg-transparent'
                />
              </div>

              {/* Size */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-pw-muted'>Dimensions</span>
                  <span className='text-[10px] font-mono text-pw-muted'>
                    {selectedShape.size}px
                  </span>
                </div>
                <input
                  type='range'
                  min={10}
                  max={250}
                  value={selectedShape.size}
                  onChange={(e) =>
                    setShapes((prev) =>
                      prev.map((s) =>
                        s.id === selectedShapeId ?
                          { ...s, size: parseInt(e.target.value) }
                        : s,
                      ),
                    )
                  }
                  className='w-full accent-pw-primary cursor-pointer'
                />
              </div>

              {/* Opacity */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-pw-muted'>Opacity</span>
                  <span className='text-[10px] font-mono text-pw-muted'>
                    {Math.round(selectedShape.opacity * 100)}%
                  </span>
                </div>
                <input
                  type='range'
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selectedShape.opacity}
                  onChange={(e) =>
                    setShapes((prev) =>
                      prev.map((s) =>
                        s.id === selectedShapeId ?
                          { ...s, opacity: parseFloat(e.target.value) }
                        : s,
                      ),
                    )
                  }
                  className='w-full accent-pw-primary cursor-pointer'
                />
              </div>

              {/* Borders */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-pw-muted'>Border Width</span>
                  <span className='text-[10px] font-mono text-pw-muted'>
                    {selectedShape.borderWidth}px
                  </span>
                </div>
                <input
                  type='range'
                  min={0}
                  max={10}
                  value={selectedShape.borderWidth}
                  onChange={(e) =>
                    setShapes((prev) =>
                      prev.map((s) =>
                        s.id === selectedShapeId ?
                          { ...s, borderWidth: parseInt(e.target.value) }
                        : s,
                      ),
                    )
                  }
                  className='w-full accent-pw-primary cursor-pointer'
                />
              </div>
            </div>
          )}

          {/* Text Layer controls */}
          <div className='space-y-3 p-4 w-full rounded-xl bg-white/[0.03] border border-white/10'>
            <div className='flex items-center justify-between'>
              <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
                {selectedOverlayIdx !== null ?
                  'Edit Text Layer'
                : 'Add Text Layer'}
              </p>
              <button
                onClick={() => setAddShadow(!addShadow)}
                className='flex items-center gap-1.5 text-[10px] font-semibold text-pw-muted hover:text-pw-primary transition-colors'>
                {addShadow ?
                  <ToggleRight className='h-4 w-4 text-pw-primary' />
                : <ToggleLeft className='h-4 w-4' />}
                Shadow effect
              </button>
            </div>

            <input
              type='text'
              value={newText}
              onChange={(e) => {
                setNewText(e.target.value);
                handleUpdateActiveLayer({ text: e.target.value });
              }}
              placeholder='Your text...'
              className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-pw-text placeholder:text-pw-muted/40 focus:outline-none focus:border-pw-primary/40 no-outline'
            />

            <div className='grid grid-cols-2 gap-2'>
              <select
                value={newFont}
                onChange={(e) => {
                  setNewFont(e.target.value);
                  handleUpdateActiveLayer({ fontFamily: e.target.value });
                }}
                className='bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-pw-text focus:outline-none no-outline appearance-none'>
                {CANVAS_FONTS.map((f) => (
                  <option
                    key={f}
                    value={f}
                    className='bg-pw-surface'>
                    {f}
                  </option>
                ))}
              </select>

              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  value={newFontSize}
                  onChange={(e) => {
                    setNewFontSize(Number(e.target.value));
                    handleUpdateActiveLayer({
                      fontSize: Number(e.target.value),
                    });
                  }}
                  min={12}
                  max={120}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-pw-text focus:outline-none no-outline'
                />
                <span className='text-[10px] text-pw-muted shrink-0'>px</span>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2 flex-1'>
                <Palette className='h-3.5 w-3.5 text-pw-muted shrink-0' />
                <input
                  type='color'
                  value={newColor}
                  onChange={(e) => {
                    setNewColor(e.target.value);
                    handleUpdateActiveLayer({ color: e.target.value });
                  }}
                  className='h-6 w-10 rounded cursor-pointer border-none bg-transparent'
                />
                <span className='text-[10px] font-mono text-pw-muted'>
                  {newColor}
                </span>
              </div>
              <button
                onClick={() => {
                  setNewBold(!newBold);
                  handleUpdateActiveLayer({ bold: !newBold });
                }}
                className={cn(
                  'px-2 py-1 rounded-lg text-xs font-bold border transition-all',
                  newBold ?
                    'bg-pw-primary/20 border-pw-primary/40 text-pw-primary'
                  : 'bg-white/5 border-white/10 text-pw-muted',
                )}>
                B
              </button>
            </div>

            <button
              onClick={addTextOverlay}
              className='w-full flex items-center justify-center gap-2 py-2 rounded-xl btn-primary text-xs font-semibold'>
              <Plus className='h-3.5 w-3.5' />
              Add to Canvas
            </button>
          </div>

          {/* Overlay list */}
          {state.canvasTextOverlays.length > 0 && (
            <div className='space-y-2 w-full mt-3'>
              <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
                Text Layers
              </p>
              {state.canvasTextOverlays.map((overlay, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all',
                    selectedOverlayIdx === i ?
                      'border-pw-primary/40 bg-pw-primary/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                  )}
                  onClick={() =>
                    setSelectedOverlayIdx(selectedOverlayIdx === i ? null : i)
                  }>
                  <div
                    className='h-6 w-6 rounded-md shrink-0 flex items-center justify-center'
                    style={{ backgroundColor: overlay.color + '33' }}>
                    <Type
                      className='h-3 w-3'
                      style={{ color: overlay.color }}
                    />
                  </div>
                  <span className='text-xs text-pw-text flex-1 truncate'>
                    {overlay.text}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverlay(i);
                    }}
                    className='text-pw-muted hover:text-pw-danger transition-colors p-1'>
                    <Trash2 className='h-3.5 w-3.5' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium Templates */}
      <PremiumGate
        feature={templateFeature}
        isPremium={state.isPremium}
        showPartial={false}
        className='h-14 mt-4'>
        <div className='p-3 h-14 flex items-center gap-2'>
          <span className='text-sm text-pw-muted'>
            10+ premium templates available
          </span>
        </div>
      </PremiumGate>

      {/* Download */}
      <button
        disabled={downloading}
        onClick={handleDownload}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold  transition-all',
          !downloading &&
            ' border-pw-primary/30 bg-pw-primary/5 text-pw-primary hover:bg-pw-primary/10',
        )}>
        {!downloading && <Download className='h-4 w-4' />}
        {downloading ? 'Downloading...' : 'Download Canvas PNG'}
      </button>
    </div>
  );
}
