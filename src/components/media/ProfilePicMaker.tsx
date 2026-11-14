'use client';

import { ThemedSlider } from '@/components/ui/themed-slider';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Download,
  Camera,
  Check,
  Circle,
  Square,
  Hexagon,
  RotateCw,
  Sparkles,
  Sliders,
  Trash,
  Palette,
  Layers,
  LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { tagImageBlob } from '@/lib/pingworld-attribution';
import { makeHtml2CanvasCloneColorSafe } from '@/lib/image/html2canvas-color-safety';
import { cn } from '@/lib/utils';
import {
  TRENDY_OBJECT_MOCKS,
  ObjectMockItem,
} from '@/components/profile/ProfileAvatarDesigner';
import { motion } from 'framer-motion';

const BORDER_PALETTES = [
  { name: 'Neon Cyan', stops: ['#00F2FE', '#4FACFE'] },
  { name: 'Sunset Glow', stops: ['#FF512F', '#DD2476'] },
  { name: 'Emerald Mint', stops: ['#11998E', '#38EF7D'] },
  { name: 'Cosmic Purple', stops: ['#7F00FF', '#E100FF'] },
  { name: 'Amber Fire', stops: ['#F857A6', '#FF5858'] },
  { name: 'Gold Luxury', stops: ['#FFD700', '#9C7B00'] },
  { name: 'Ultra Violet', stops: ['#654ea3', '#eaafc8'] },
  { name: 'PingWorld', stops: ['#0EBAE1', '#6C3AEB', '#E100FF'] },
];

const BG_OPTIONS = [
  { label: 'Dark', value: '#0A0C1B' },
  { label: 'Navy', value: '#0F172A' },
  { label: 'Blue', value: '#1e3a8a' },
  { label: 'Purple', value: '#4c1d95' },
  { label: 'Emerald', value: '#064e3b' },
  { label: 'Rose', value: '#881337' },
  { label: 'White', value: '#ffffff' },
  { label: 'Transparent', value: 'transparent' },
];

type FrameShape = 'circle' | 'squircle' | 'hexagon';
type BadgeKind = 'none' | 'verified' | 'pro' | 'creator';
type FitMode = 'cover' | 'contain';

const SHAPE_CLASSES: Record<FrameShape, string> = {
  circle: 'rounded-full',
  squircle: 'rounded-[2.5rem]',
  hexagon: 'rounded-3xl',
};

const INNER_CLASSES: Record<FrameShape, string> = {
  circle: 'rounded-full',
  squircle: 'rounded-[2.1rem]',
  hexagon: 'rounded-2xl',
};

export default function ProfilePicMaker() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [shape, setShape] = useState<FrameShape>('circle');
  const [palette, setPalette] = useState(0);
  const [border, setBorder] = useState(7);
  const [glow, setGlow] = useState(40);
  const [badge, setBadge] = useState<BadgeKind>('verified');
  const [bg, setBg] = useState('#0A0C1B');
  const [exporting, setExporting] = useState(false);

  // Image Fitting & Positioning Controls (Fixes tall/portrait abnormal stretch)
  const [fitMode, setFitMode] = useState<FitMode>('cover');
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);

  // Object Mocks & Trendy Vector Accessories
  const [selectedMock, setSelectedMock] = useState<ObjectMockItem | null>(null);
  const [mockScale, setMockScale] = useState(1);
  const [mockY, setMockY] = useState(0);
  const [mockX, setMockX] = useState(0);

  const [activeTab, setActiveTab] = useState('align');

  const previewRef = useRef<HTMLDivElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar(ev.target?.result as string);
      // Reset positioning for new photo
      setZoom(100);
      setPanX(0);
      setPanY(0);
      setRotation(0);
      toast.success('Image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMock = (mock: ObjectMockItem) => {
    if (selectedMock?.id === mock.id) {
      setSelectedMock(null);
    } else {
      setSelectedMock(mock);
      setMockScale(mock.defaultScale || 1);
      setMockY(mock.defaultY || 0);
      setMockX(0);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetFraming = () => {
    setZoom(100);
    setPanX(0);
    setPanY(0);
    setRotation(0);
    setFitMode('cover');
  };

  const handleExport = async () => {
    if (!previewRef.current) return;
    previewRef.current.dataset.captureRoot ||= crypto.randomUUID();
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');

      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: null,
        scale: 4,
        useCORS: true,
        allowTaint: false,
        logging: false,
        foreignObjectRendering: true,
        onclone: (clonedDoc) =>
          makeHtml2CanvasCloneColorSafe(previewRef.current!, clonedDoc),
      });
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value ?
              resolve(value)
            : reject(new Error('Could not encode image.')),
          'image/png',
        ),
      );
      const url = URL.createObjectURL(await tagImageBlob(blob));
      const a = document.createElement('a');
      a.href = url;
      a.download = `pingworld-avatar-${Date.now()}.png`;
      a.click();
      toast.success('Profile avatar exported!');
    } catch (e) {
      toast.error(`Export failed. Please try again. ${e}`);
    } finally {
      setExporting(false);
    }
  };

  const { stops } = BORDER_PALETTES[palette];
  const gradient = `linear-gradient(135deg, ${stops.join(', ')})`;
  const glowColor = stops[0];

  return (
    <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-all'>
      {/* ───── Live Avatar Preview ───── */}
      <div className='lg:col-span-5 relative'>
        <div
          ref={previewRef}
          className='relative flex items-center justify-center p-2 transition-all'
          style={{
            filter:
              glow > 0 ?
                `drop-shadow(0 0 ${glow / 2}px ${glowColor}AA)`
              : 'none',
          }}>
          {/* Outer Gradient Border Ring */}
          <div
            className={cn(
              'flex items-center justify-center relative transition-all',
              SHAPE_CLASSES[shape],
            )}
            style={{
              padding: `${border}px`,
              background: gradient,
              width: 270,
              height: 270,
            }}>
            {/* Inner image container (strict aspect-square to prevent distortion) */}
            <div
              className={cn(
                'w-full h-full aspect-square overflow-hidden flex items-center justify-center relative select-none',
                INNER_CLASSES[shape],
              )}
              style={{ background: bg === 'transparent' ? 'transparent' : bg }}>
              {avatar ?
                <Image
                  src={avatar}
                  alt='Avatar'
                  width={270}
                  height={270}
                  unoptimized
                  crossOrigin='anonymous'
                  className={cn(
                    'select-none pointer-events-none transition-transform duration-75',
                    fitMode === 'cover' ?
                      'w-full h-full object-cover'
                    : 'max-w-full max-h-full object-contain',
                  )}
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              : <button
                  type='button'
                  className='flex flex-col items-center justify-center text-white/40 p-4 text-center bg-transparent border-none w-full h-full'
                  onClick={() =>
                    document.getElementById('profile-upload-input')?.click()
                  }>
                  <Camera className='h-12 w-12 mb-2 opacity-60' />
                  <span className='text-[10px] font-bold uppercase tracking-wider'>
                    Upload Photo
                  </span>
                </button>
              }
            </div>

            {/* Object Mock Vector Overlay */}
            {selectedMock && (
              <div
                className='absolute inset-0 flex items-center justify-center pointer-events-none select-none z-20'
                style={{
                  transform: `translate(${mockX}px, ${mockY}px) scale(${mockScale})`,
                  transition: 'transform 0.1s ease-out',
                }}>
                <div className='w-28 h-28 flex items-center justify-center'>
                  {selectedMock.svg(glowColor)}
                </div>
              </div>
            )}

            {/* Status Badge Overlay */}
            {badge !== 'none' && (
              <div
                className={cn(
                  'absolute bottom-3 right-3 p-1 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center z-30',
                )}>
                {badge === 'verified' && (
                  <span className='h-7 w-7 rounded-full bg-pw-primary flex items-center justify-center text-white text-xs font-black shadow-lg'>
                    ✓
                  </span>
                )}
                {badge === 'pro' && (
                  <span className='h-7 w-7 rounded-full bg-pw-warning flex items-center justify-center text-white text-[9px] font-black shadow-lg'>
                    PRO
                  </span>
                )}
                {badge === 'creator' && (
                  <span className='h-7 w-7 rounded-full bg-pw-cyan flex items-center justify-center text-white text-xs font-black shadow-lg'>
                    ★
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {avatar && (
          <Button
            onClick={handleExport}
            variant='ghost'
            disabled={!avatar || exporting}
            className='absolute right-5 bottom-0 rounded-full font-bold gap-1 text-xs h-10 w-10 shadow-lg shadow-pw-primary/20 z-[80] border border-pw-primary/20 hover:bg-pw-primary/80 transition-all'>
            {exporting ?
              <LoaderCircle className='h-3.5 w-3.5 animate-spin' />
            : <Download className='h-3.5 w-3.5' />}
          </Button>
        )}
      </div>

      {/* ───── Controls & Customizer Tabs ───── */}
      <div className='lg:col-span-7 space-y-4'>
        <Card className='p-0.5 ring-0 sm:ring-1 bg-transparent rounded-none sm:p-3 sm:bg-white/[0.02] sm:border sm:border-white/10 sm:rounded-3xl sm:backdrop-blur-xl sm:shadow-xl'>
          <div
            className='flex gap-1 bg-black/8 border border-white/5 rounded-3xl overflow-x-auto scrollable-row items-center bkblur p-0.5 shadow-md text-shadow-md w-full max-w-2xl place-self-center'
            style={{ paddingBottom: 0.5, gap: 0 }}>
            {[
              { title: 'Align', icon: Sliders, id: 'align' },
              { title: 'Overlay', icon: Layers, id: 'overlay' },
              { title: 'Color', icon: Palette, id: 'color' },
              { title: 'Border', icon: Square, id: 'border' },
            ].map((btn, i) => (
              <Button
                key={i + btn.id}
                variant='ghost'
                onClick={() => {
                  setActiveTab(btn.id as any);
                }}
                className={cn(
                  'flex-1 h-9 gap-1.5 rounded-2xl text-xs shrink-0 hover:bg-pw-primary/60 hover:px-5',
                  activeTab === btn.id &&
                    'bg-pw-primary text-white shadow-lg hover:bg-pw-primary',
                )}>
                <btn.icon className='h-3.5 w-3.5' /> {btn.title}
              </Button>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}>
            <Card
              className={cn(
                'p-2 flex flex-col gap-1 sm:p-0 rounded-[20px] sm:rounded-none pb-4 border-0 border-none sm:ring-0 bg-black/5 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none max-h-[30vh] overflow-y-auto flex-1 no-scrollbar shadow-lg sm:shadow-none',
              )}>
              {/* Photo Framing & Positioning (Prevents stretching & centers subject) */}
              {activeTab === 'align' && (
                <>
                  <section className='space-y-2 pt-2'>
                    <div className='flex items-center justify-between flex-wrap px-2'>
                      <label className='text-[12px] font-bold text-white/80 uppercase tracking-widest block flex items-center gap-1.5'>
                        Alignment
                      </label>
                      {avatar && (
                        <div className='flex items-center gap-1 bg-white/5 p-0.5 rounded-full border border-white/10'>
                          <button
                            type='button'
                            onClick={() => setFitMode('cover')}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[9px] font-bold uppercase transition-all',
                              fitMode === 'cover' ?
                                'gradient-brand text-black'
                              : 'text-pw-muted hover:text-white',
                            )}>
                            Cover (Fill)
                          </button>
                          <button
                            type='button'
                            onClick={() => setFitMode('contain')}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[9px] font-bold transition-all',
                              fitMode === 'contain' ?
                                'gradient-brand text-black'
                              : 'text-pw-muted hover:text-white',
                            )}>
                            Contain (Full)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Framing quick action pills */}
                    {avatar && (
                      <div className='flex items-center gap-2 justify-between px-1 mb-5 text-xs'>
                        <span className='text-[10px] font-bold text-pw-muted uppercase pl-1'>
                          Framing:
                        </span>
                        <div className='flex gap-1 w-fit items-center'>
                          <button
                            type='button'
                            onClick={handleRotate}
                            className='px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-semibold text-[10px] flex items-center gap-1'>
                            <RotateCw className='h-2.5 w-2.5' /> {rotation}°
                          </button>
                          <button
                            type='button'
                            onClick={resetFraming}
                            className='px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-pw-muted hover:text-white font-semibold text-[10px]'>
                            Reset
                          </button>
                        </div>
                      </div>
                    )}

                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 px-2 mt-3'>
                      {/* Zoom */}
                      <div className='space-y-1'>
                        <div className='flex justify-between text-[10px] font-bold'>
                          <span className='text-pw-muted'>Zoom Level</span>
                          <span className='font-mono text-pw-cyan'>
                            {zoom}%
                          </span>
                        </div>
                        <ThemedSlider
                          min={50}
                          max={250}
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className='w-full accent-pw-cyan'
                        />
                      </div>

                      {/* Pan Horizontal */}
                      <div className='space-y-1'>
                        <div className='flex justify-between text-[10px] font-bold'>
                          <span className='text-pw-muted'>
                            Pan X (Left/Right)
                          </span>
                          <span className='font-mono text-pw-primary'>
                            {panX}px
                          </span>
                        </div>
                        <ThemedSlider
                          min={-120}
                          max={120}
                          value={panX}
                          onChange={(e) => setPanX(Number(e.target.value))}
                          className='w-full accent-pw-primary'
                        />
                      </div>

                      {/* Pan Vertical */}
                      <div className='space-y-1'>
                        <div className='flex justify-between text-[10px] font-bold'>
                          <span className='text-pw-muted'>Pan Y (Up/Down)</span>
                          <span className='font-mono text-pw-success'>
                            {panY}px
                          </span>
                        </div>
                        <ThemedSlider
                          min={-120}
                          max={120}
                          value={panY}
                          onChange={(e) => setPanY(Number(e.target.value))}
                          className='w-full accent-pw-success'
                        />
                      </div>
                    </div>
                  </section>

                  <div className='divider my-3' />

                  {/* Frame Shape */}
                  <section className='space-y-2 pt-3 px-2'>
                    <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>
                      Frame Shape
                    </label>
                    <div className='flex items-center flex-wrap gap-2'>
                      {(['circle', 'squircle', 'hexagon'] as FrameShape[]).map(
                        (s) => (
                          <Button
                            key={s}
                            type='button'
                            variant='outline'
                            onClick={() => setShape(s)}
                            className={cn(
                              'h-8 text-xs font-bold gap-2 px-3 w-fit rounded-xl capitalize',
                              shape === s ?
                                'bg-pw-primary/20 border-pw-primary text-pw-primary'
                              : 'bg-white/5 border-white/10 text-pw-muted hover:bg-white/10',
                            )}>
                            {s === 'circle' && (
                              <Circle className='h-3.5 w-3.5' />
                            )}
                            {s === 'squircle' && (
                              <Square className='h-3.5 w-3.5' />
                            )}
                            {s === 'hexagon' && (
                              <Hexagon className='h-3.5 w-3.5' />
                            )}
                            {s}
                          </Button>
                        ),
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* Trendy Object Mocks & Vector Accessories */}
              {activeTab === 'overlay' && (
                <section className='space-y-2 pt-2'>
                  <div className='flex items-center justify-between mb-2 px-2'>
                    <label className='text-[12px] font-bold text-white/80 uppercase tracking-widest block flex items-center gap-1.5'>
                      <Sparkles className='h-3 w-3 text-amber-400' /> Add styles
                    </label>
                    {selectedMock && (
                      <button
                        type='button'
                        onClick={() => setSelectedMock(null)}
                        className='text-[9px] font-bold text-pw-danger bg-pw-danger/10 hover:bg-pw-danger/40 p-1 rounded-md hover:underline'>
                        <Trash className='w-4 h-4' />
                      </button>
                    )}
                  </div>

                  <div className='flex items-center scrollable-row gap-2 px-1'>
                    {TRENDY_OBJECT_MOCKS.map((mock) => {
                      const isSelected = selectedMock?.id === mock.id;
                      return (
                        <button
                          key={mock.id}
                          type='button'
                          onClick={() => handleSelectMock(mock)}
                          className={cn(
                            'w-fit min-w-18 h-16 rounded-xl border p-1.5 flex flex-col items-center justify-between transition-all relative',
                            isSelected ?
                              'bg-pw-primary/20 border-pw-primary shadow-md ring-1 ring-pw-primary/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 bkblur',
                          )}>
                          <div className='w-7 h-7 flex items-center justify-center shrink-0'>
                            {mock.svg(glowColor)}
                          </div>
                          <span className='text-[8.5px] font-semibold text-center truncate w-full'>
                            {mock.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Accessory Fine-tuning sliders if an accessory is active */}
                  {selectedMock && (
                    <div className='grid grid-cols-2 gap-3 px-3 mt-5'>
                      <div className='space-y-1'>
                        <div className='flex justify-between text-[10px] font-bold'>
                          <span className='text-pw-muted'>Position</span>
                          <span className='font-mono text-pw-cyan'>
                            {mockY}px
                          </span>
                        </div>
                        <ThemedSlider
                          min={-60}
                          max={60}
                          value={mockY}
                          onChange={(e) => setMockY(Number(e.target.value))}
                          className='w-full accent-pw-cyan'
                        />
                      </div>
                      <div className='space-y-1'>
                        <div className='flex justify-between text-[10px] font-bold'>
                          <span className='text-pw-muted'>Scale</span>
                          <span className='font-mono text-amber-400'>
                            {Math.round(mockScale * 100)}%
                          </span>
                        </div>
                        <ThemedSlider
                          min={50}
                          max={180}
                          value={Math.round(mockScale * 100)}
                          onChange={(e) =>
                            setMockScale(Number(e.target.value) / 100)
                          }
                          className='w-full accent-amber-400'
                        />
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Gradient Border Palettes and background color:*/}
              {activeTab === 'color' && (
                <>
                  <section className='space-y-2 p-2'>
                    <label className='text-[12px] font-bold text-white/80 uppercase tracking-widest block flex items-center gap-1.5'>
                      Border Color
                    </label>
                    <div className='grid grid-cols-4 gap-2'>
                      {BORDER_PALETTES.map((p, idx) => (
                        <button
                          key={p.name}
                          type='button'
                          onClick={() => setPalette(idx)}
                          title={p.name}
                          className={cn(
                            'h-10 rounded-xl relative flex items-center justify-center border-2 transition-all',
                            palette === idx ?
                              'border-white scale-105 shadow-md'
                            : 'border-none opacity-60 hover:opacity-100',
                          )}
                          style={{
                            background: `linear-gradient(135deg, ${p.stops.join(', ')})`,
                          }}>
                          {palette === idx && (
                            <Check className='h-4 w-4 text-white drop-shadow' />
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Background Color */}
                  <section className='space-y-2 p-2'>
                    <label className='text-[10px] font-bold text-white/80 uppercase tracking-widest block'>
                      Background Color
                    </label>
                    <div className='flex gap-2 flex-wrap'>
                      {BG_OPTIONS.map((b) => (
                        <button
                          key={b.value}
                          type='button'
                          onClick={() => setBg(b.value)}
                          title={b.label}
                          className={cn(
                            'h-8 w-8 rounded-full border-2 transition-all',
                            bg === b.value ?
                              'border-white scale-110 shadow-lg'
                            : 'border-white/20 hover:border-white/50',
                            b.value === 'transparent' &&
                              'bg-transparent border-dashed',
                          )}
                          style={
                            b.value !== 'transparent' ?
                              { background: b.value }
                            : {}
                          }
                        />
                      ))}
                    </div>
                  </section>
                </>
              )}

              {activeTab === 'border' && (
                <>
                  {/* Sliders: Thickness & Radiance */}
                  <section className='space-y-2 p-2'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-1.5'>
                        <div className='flex justify-between text-xs font-bold'>
                          <span className='text-white/80'>
                            Border Thickness
                          </span>
                          <span className='font-mono text-pw-cyan'>
                            {border}px
                          </span>
                        </div>
                        <ThemedSlider
                          min={0}
                          max={18}
                          value={border}
                          onChange={(e) => setBorder(Number(e.target.value))}
                          className='w-full accent-pw-cyan'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <div className='flex justify-between text-xs font-bold'>
                          <span className='text-white/80'>Border Glow</span>
                          <span className='font-mono text-pw-primary'>
                            {glow}%
                          </span>
                        </div>
                        <ThemedSlider
                          min={0}
                          max={100}
                          value={glow}
                          onChange={(e) => setGlow(Number(e.target.value))}
                          className='w-full accent-pw-primary'
                        />
                      </div>
                    </div>
                  </section>

                  <div className='divider my-3' />

                  {/* Status Badge */}
                  <section className='space-y-2 px-2'>
                    <label className='text-[10px] font-bold text-white/70 uppercase tracking-widest block'>
                      Profile Badge
                    </label>
                    <div className='flex items-center gap-2 flex-wrap'>
                      {(
                        [
                          { id: 'none', label: 'None' },
                          { id: 'verified', label: '✓ Verified' },
                          { id: 'pro', label: '★ PRO' },
                          { id: 'creator', label: 'Creator' },
                        ] as { id: BadgeKind; label: string }[]
                      ).map((b) => (
                        <Button
                          key={b.id}
                          type='button'
                          variant='outline'
                          onClick={() => setBadge(b.id)}
                          className={cn(
                            'h-8 text-xs font-bold rounded-2xl px-4',
                            badge === b.id ?
                              'bg-pw-primary/20 border-pw-primary text-pw-primary'
                            : 'bg-white/5 border-white/10 text-pw-muted hover:bg-white/10',
                          )}>
                          {b.label}
                        </Button>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </Card>
          </motion.div>
        </Card>

        {/* CTA Buttons */}
        <div className='flex flex-wrap items-center gap-3 w-full max-w-xs justify-between place-self-center'>
          <label className='flex-1 cursor-pointer w-fit'>
            <input
              type='file'
              accept='image/*'
              id='profile-upload-input'
              onChange={handleUpload}
              className='hidden'
            />
            <div className='w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-1 text-xs font-bold text-pw-muted hover:text-white transition-colors cursor-pointer select-none'>
              <Upload className='h-3.5 w-3.5' />
              {avatar ? 'Change Photo' : 'Upload Photo'}
            </div>
          </label>
          <Button
            onClick={handleExport}
            disabled={!avatar || exporting}
            className='flex-1 h-10 rounded-xl btn-primary font-bold gap-1 text-xs max-w-1/2 shadow-lg shadow-pw-primary/20'>
            <Download className='h-3.5 w-3.5' />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}
