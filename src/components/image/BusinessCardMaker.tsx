'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Download, Upload, Trash2, Type, Building2, Phone, Mail,
  Globe, Linkedin, Twitter, MapPin, Palette, RotateCcw,
  QrCode, Layers, ArrowLeftRight, Check, Lock, Crown,
  Terminal, Shield, Sparkles, Wifi, Diamond, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { makeHtml2CanvasCloneColorSafe } from '@/lib/image/html2canvas-color-safety';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';

/* ─────────────────────────────── Types ──────────────────────────────── */

export type CardLayoutType =
  | 'classic-split'
  | 'executive-minimal'
  | 'cyber-terminal'
  | 'gold-crest'
  | 'bold-split'
  | 'holo-glass';

interface CardData {
  name:       string;
  title:      string;
  company:    string;
  phone:      string;
  email:      string;
  website:    string;
  linkedin:   string;
  twitter:    string;
  address:    string;
  logoUrl:    string | null;
}

type TemplateId =
  | 'midnight'
  | 'aurora'
  | 'monochrome'
  | 'coral'
  | 'forest'
  | 'slate'
  | 'glassmorphism'
  | 'techcyber'
  | 'goldelite'
  | 'executiveminimal'
  | 'modernvertical'
  | 'holochrome'
  | 'matrixcode'
  | 'luxuryrose';

interface Template {
  id: TemplateId;
  name: string;
  bg: string;
  accent: string;
  textPrimary: string;
  textMuted: string;
  isPremium?: boolean;
  layoutType: CardLayoutType;
}

/* ─────────────────────────────── Templates ──────────────────────────── */

const TEMPLATES: Template[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    bg: 'bg-gradient-to-br from-[#0A0C1B] via-[#11152e] to-[#1a1040]',
    accent: '#0EBAE1',
    textPrimary: 'text-white',
    textMuted: 'text-white/50',
    isPremium: false,
    layoutType: 'classic-split',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: 'bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]',
    accent: '#38EF7D',
    textPrimary: 'text-white',
    textMuted: 'text-white/50',
    isPremium: false,
    layoutType: 'holo-glass',
  },
  {
    id: 'monochrome',
    name: 'Mono',
    bg: 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d]',
    accent: '#e5e5e5',
    textPrimary: 'text-white',
    textMuted: 'text-white/40',
    isPremium: false,
    layoutType: 'executive-minimal',
  },
  {
    id: 'coral',
    name: 'Coral',
    bg: 'bg-gradient-to-br from-[#FF512F] to-[#DD2476]',
    accent: '#ffffff',
    textPrimary: 'text-white',
    textMuted: 'text-white/70',
    isPremium: false,
    layoutType: 'bold-split',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: 'bg-gradient-to-br from-[#134e4a] via-[#065f46] to-[#064e3b]',
    accent: '#6ee7b7',
    textPrimary: 'text-white',
    textMuted: 'text-white/50',
    isPremium: false,
    layoutType: 'classic-split',
  },
  {
    id: 'slate',
    name: 'Slate',
    bg: 'bg-gradient-to-br from-[#e2e8f0] to-[#f8fafc]',
    accent: '#334155',
    textPrimary: 'text-slate-800',
    textMuted: 'text-slate-500',
    isPremium: false,
    layoutType: 'executive-minimal',
  },
  /* Premium Distinct Architectures */
  {
    id: 'techcyber',
    name: 'Cyber Neon HUD',
    bg: 'bg-gradient-to-tr from-black via-[#041228] to-[#032a30]',
    accent: '#22D3EE',
    textPrimary: 'text-cyan-100',
    textMuted: 'text-cyan-400/60',
    isPremium: true,
    layoutType: 'cyber-terminal',
  },
  {
    id: 'matrixcode',
    name: 'Matrix Terminal',
    bg: 'bg-gradient-to-b from-[#021808] to-[#010a04]',
    accent: '#22c55e',
    textPrimary: 'text-emerald-300',
    textMuted: 'text-emerald-600',
    isPremium: true,
    layoutType: 'cyber-terminal',
  },
  {
    id: 'goldelite',
    name: 'Gold Luxury Crest',
    bg: 'bg-gradient-to-br from-[#1A1408] via-[#2A1F0C] to-[#0F0D05]',
    accent: '#FBBF24',
    textPrimary: 'text-amber-100',
    textMuted: 'text-amber-300/60',
    isPremium: true,
    layoutType: 'gold-crest',
  },
  {
    id: 'luxuryrose',
    name: 'Rose Royalty',
    bg: 'bg-gradient-to-tr from-[#2a1b1b] via-[#3d2326] to-[#1a0f12]',
    accent: '#fb7185',
    textPrimary: 'text-rose-100',
    textMuted: 'text-rose-300/60',
    isPremium: true,
    layoutType: 'gold-crest',
  },
  {
    id: 'executiveminimal',
    name: 'Executive Swiss',
    bg: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617]',
    accent: '#38BDF8',
    textPrimary: 'text-slate-100',
    textMuted: 'text-slate-400',
    isPremium: true,
    layoutType: 'executive-minimal',
  },
  {
    id: 'modernvertical',
    name: 'Dynamic Two-Tone',
    bg: 'bg-gradient-to-tr from-rose-600 via-red-800 to-indigo-950',
    accent: '#F43F5E',
    textPrimary: 'text-rose-50',
    textMuted: 'text-rose-200/70',
    isPremium: true,
    layoutType: 'bold-split',
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphic NFC',
    bg: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900',
    accent: '#C084FC',
    textPrimary: 'text-white',
    textMuted: 'text-purple-200/60',
    isPremium: true,
    layoutType: 'holo-glass',
  },
  {
    id: 'holochrome',
    name: 'Holo Prism',
    bg: 'bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a]',
    accent: '#38BDF8',
    textPrimary: 'text-white',
    textMuted: 'text-cyan-200/70',
    isPremium: true,
    layoutType: 'holo-glass',
  },
];

const LAYOUT_DEFINITIONS: { id: CardLayoutType; label: string; icon: any; isPremium?: boolean }[] = [
  { id: 'classic-split', label: 'Classic Split', icon: Layers, isPremium: false },
  { id: 'executive-minimal', label: 'Executive Swiss', icon: LayoutGrid, isPremium: false },
  { id: 'bold-split', label: 'Two-Tone Asymmetric', icon: Shield, isPremium: false },
  { id: 'cyber-terminal', label: 'Cyber Terminal HUD', icon: Terminal, isPremium: true },
  { id: 'gold-crest', label: 'Imperial Gold Crest', icon: Diamond, isPremium: true },
  { id: 'holo-glass', label: 'Glassmorphic NFC', icon: Sparkles, isPremium: true },
];

/* ─────────────────────────────── Card Preview ───────────────────────── */

function BusinessCardPreview({
  data,
  template,
  showBack,
  logoDataUrl,
  layoutType,
  isExporting = false,
}: {
  data: CardData;
  template: Template;
  showBack: boolean;
  logoDataUrl: string | null;
  layoutType?: CardLayoutType;
  isExporting?: boolean;
}) {
  const activeLayout = layoutType || template.layoutType || 'classic-split';

  return (
    /* 3.5" × 2" ratio → 350px × 200px at 1× */
    <div
      className={cn(
        'relative w-[350px] h-[200px] rounded-2xl overflow-hidden shadow-2xl',
        'ring-1 ring-white/10 select-none shrink-0 relative',
        template.bg,
      )}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Subtle non-intrusive preview watermark on screen (removed during 6x export) */}
      {!isExporting && (
        <div className='absolute inset-x-0 bottom-0 pointer-events-none select-none z-30 flex items-center justify-center overflow-hidden'>
          <div className=' flex flex-col items-center gap-1 opacity-[0.15]'>
            <div className='h-[1px] w-48 bg-white/40' />
            <div className='flex items-center gap-1.5 text-[8px] pb-1 font-black tracking-[0.25em] text-white uppercase font-mono'>
              <span>PINGWORLD</span>
              <span>•</span>
              <span>CARD PREVIEW</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 1: CYBER TERMINAL HUD (techcyber, matrixcode)
          ========================================================================= */}
      {activeLayout === 'cyber-terminal' && (
        <div className='absolute inset-0 font-mono p-4 flex flex-col justify-between text-left'>
          {/* Cyber HUD Corner crosshairs */}
          <span className='absolute top-2 left-2 text-[10px] opacity-60' style={{ color: template.accent }}>┌ [SYS:ID]</span>
          <span className='absolute top-2 right-2 text-[10px] opacity-60' style={{ color: template.accent }}>[0x7F] ┐</span>
          <span className='absolute bottom-2 left-2 text-[10px] opacity-60' style={{ color: template.accent }}>└ PING_NET</span>
          <span className='absolute bottom-2 right-2 text-[10px] opacity-60' style={{ color: template.accent }}>STATUS:ACTIVE ┘</span>

          {!showBack ? (
            /* Cyber Front */
            <div className='flex flex-col justify-between h-full pt-3 pb-2 z-10'>
              {/* Top status bar */}
              <div className='flex items-center justify-between border-b border-white/10 pb-1.5'>
                <div className='flex items-center gap-1.5'>
                  <Terminal className='h-3 w-3' style={{ color: template.accent }} />
                  <span className='text-[9px] font-bold tracking-widest uppercase opacity-80' style={{ color: template.accent }}>
                    {data.company || 'CYBER_SEC // PINGWORLD'}
                  </span>
                </div>
                <span className='w-1.5 h-1.5 rounded-full animate-ping' style={{ background: template.accent }} />
              </div>

              {/* Main ID & Details */}
              <div className='flex items-center gap-3.5 my-auto'>
                {/* HUD Bracket Avatar */}
                <div className='relative shrink-0'>
                  {logoDataUrl ? (
                    <Image src={logoDataUrl} alt='Logo' width={48} height={48} unoptimized className='w-12 h-12 rounded-lg object-contain bg-black/40 border' style={{ borderColor: `${template.accent}66` }} />
                  ) : (
                    <div className='w-12 h-12 rounded-lg bg-black/50 border flex items-center justify-center font-black text-lg' style={{ borderColor: `${template.accent}66`, color: template.accent }}>
                      {data.name ? data.name.charAt(0).toUpperCase() : 'X'}
                    </div>
                  )}
                  <span className='absolute -top-1 -left-1 text-[8px]' style={{ color: template.accent }}>+</span>
                  <span className='absolute -bottom-1 -right-1 text-[8px]' style={{ color: template.accent }}>+</span>
                </div>

                <div className='flex-1 min-w-0 space-y-0.5'>
                  <p className={cn('text-sm font-black tracking-wider truncate', template.textPrimary)}>
                    {data.name ? `> ${data.name.toUpperCase()}` : '> OPERATOR NAME'}
                  </p>
                  <p className='text-[10px] font-bold truncate opacity-90' style={{ color: template.accent }}>
                    {data.title ? `[ ${data.title} ]` : '[ SPECIALIST ]'}
                  </p>
                  <div className='text-[8px] space-y-0.5 pt-1 text-white/70'>
                    {data.email && <p className='truncate'>MAIL: {data.email}</p>}
                    {data.phone && <p className='truncate'>COMM: {data.phone}</p>}
                    {data.website && <p className='truncate'>HTTP: {data.website}</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Cyber Back */
            <div className='flex items-center justify-between h-full pt-4 pb-2 px-3 z-10'>
              <div className='space-y-1.5 flex-1 min-w-0 pr-4'>
                <p className='text-xs font-black tracking-widest' style={{ color: template.accent }}>
                  // {data.company || 'SECURE ACCESS'}
                </p>
                <div className='text-[8px] space-y-0.5 opacity-75 text-white/80'>
                  {data.address && <p className='truncate'>LOC: {data.address}</p>}
                  {data.linkedin && <p className='truncate'>NET: {data.linkedin}</p>}
                  {data.twitter && <p className='truncate'>SIG: {data.twitter}</p>}
                </div>
                <div className='pt-1'>
                  <span className='text-[7px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-widest'>
                    VERIFIED_NODE
                  </span>
                </div>
              </div>
              <div className='p-2 rounded-xl bg-black/60 border shrink-0 flex flex-col items-center gap-1' style={{ borderColor: `${template.accent}66` }}>
                <QrCode className='h-9 w-9' style={{ color: template.accent }} />
                <span className='text-[7px] font-bold tracking-tighter'>SCAN_NODE</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          LAYOUT 2: EXECUTIVE SWISS MINIMALIST (executiveminimal, slate, monochrome)
          ========================================================================= */}
      {activeLayout === 'executive-minimal' && (
        <div className='absolute inset-0 p-6 flex flex-col justify-between text-center'>
          {!showBack ? (
            /* Executive Front */
            <div className='flex flex-col justify-between h-full'>
              <div className='flex items-center justify-between border-b border-white/15 pb-2'>
                <span className='text-[9px] font-black uppercase tracking-[0.25em]' style={{ color: template.accent }}>
                  {data.company || 'ENTERPRISE PARTNERS'}
                </span>
                {logoDataUrl && (
                  <Image src={logoDataUrl} alt='Logo' width={80} height={20} unoptimized className='h-5 w-20 object-contain' />
                )}
              </div>

              <div className='my-auto py-2 space-y-1'>
                <h2 className={cn('text-lg font-extrabold tracking-tight truncate', template.textPrimary)}>
                  {data.name || 'Alexander Wright'}
                </h2>
                <p className='text-[10px] font-semibold uppercase tracking-[0.2em]' style={{ color: template.accent }}>
                  {data.title || 'Managing Director'}
                </p>
              </div>

              <div className={cn('flex items-center justify-center gap-3 pt-2 border-t border-white/15 text-[8.5px] font-medium', template.textMuted)}>
                {data.phone && <span className='truncate'>{data.phone}</span>}
                {data.phone && data.email && <span className='opacity-30'>|</span>}
                {data.email && <span className='truncate'>{data.email}</span>}
                {data.email && data.website && <span className='opacity-30'>|</span>}
                {data.website && <span className='truncate'>{data.website}</span>}
              </div>
            </div>
          ) : (
            /* Executive Back */
            <div className='flex flex-col items-center justify-center h-full space-y-2.5'>
              <div className='w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-black'
                style={{ borderColor: template.accent, color: template.accent }}>
                {data.company ? data.company.charAt(0).toUpperCase() : 'W'}
              </div>
              <p className={cn('text-xs font-bold uppercase tracking-[0.2em]', template.textPrimary)}>
                {data.company || 'Enterprise Partners'}
              </p>
              {data.address && (
                <p className={cn('text-[9px] max-w-[220px] truncate', template.textMuted)}>
                  {data.address}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          LAYOUT 3: IMPERIAL GOLD CREST (goldelite, luxuryrose)
          ========================================================================= */}
      {activeLayout === 'gold-crest' && (
        <div className='absolute inset-0 p-3'>
          {/* Double Gold-Foil Inset Border */}
          <div className='w-full h-full border border-amber-400/40 rounded-xl p-4 flex flex-col justify-between relative shadow-inner'>
            <div className='absolute inset-1 border border-amber-400/20 rounded-lg pointer-events-none' />

            {!showBack ? (
              /* Gold Crest Front */
              <>
                <div className='flex items-center justify-between relative z-10'>
                  <div className='flex items-center gap-1.5'>
                    <Diamond className='h-3.5 w-3.5 text-amber-400' />
                    <span className='text-[8.5px] font-serif uppercase tracking-[0.2em] text-amber-300/90'>
                      {data.company || 'The Royal Crest'}
                    </span>
                  </div>
                  {logoDataUrl && (
                    <Image src={logoDataUrl} alt='Logo' width={24} height={24} unoptimized className='h-6 w-6 rounded-full border border-amber-400/40 object-contain' />
                  )}
                </div>

                <div className='space-y-0.5 relative z-10'>
                  <h2 className={cn('text-lg font-serif font-bold tracking-wide truncate', template.textPrimary)}>
                    {data.name || 'Lord Harrison Vance'}
                  </h2>
                  <p className='text-[9.5px] uppercase tracking-[0.25em] font-semibold text-amber-400'>
                    {data.title || 'Private Wealth Counsel'}
                  </p>
                </div>

                <div className='flex items-center gap-2 text-[8px] text-amber-200/70 border-t border-amber-400/20 pt-1.5 relative z-10'>
                  {data.email && <span className='truncate'>{data.email}</span>}
                  {data.email && data.phone && <span className='text-amber-400'>•</span>}
                  {data.phone && <span className='truncate'>{data.phone}</span>}
                  {data.phone && data.website && <span className='text-amber-400'>•</span>}
                  {data.website && <span className='truncate'>{data.website}</span>}
                </div>
              </>
            ) : (
              /* Gold Crest Back */
              <div className='flex flex-col items-center justify-center h-full space-y-2 relative z-10'>
                <div className='w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400 flex items-center justify-center text-amber-400 text-sm font-serif font-black shadow-lg shadow-amber-400/20'>
                  {data.name ? data.name.charAt(0).toUpperCase() : 'H'}
                </div>
                <p className='text-xs font-serif font-bold text-amber-200 uppercase tracking-widest'>
                  {data.company || 'The Royal Crest'}
                </p>
                <div className='h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent' />
                <div className='flex items-center gap-2'>
                  <QrCode className='h-6 w-6 text-amber-400' />
                  <span className='text-[8px] text-amber-300/80 font-mono'>VIP ACCESS PRIVILEGE</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 4: TWO-TONE DYNAMIC SPLIT (modernvertical, coral, forest)
          ========================================================================= */}
      {activeLayout === 'bold-split' && (
        <div className='absolute inset-0 flex'>
          {/* Left Contrast Vertical Pillar (32%) */}
          <div className='w-[32%] h-full bg-black/40 border-r border-white/10 flex flex-col justify-between p-3.5 items-center text-center'>
            <div className='w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md'
              style={{ background: template.accent }}>
              {logoDataUrl ? (
                  <Image src={logoDataUrl} alt='Logo' width={220} height={220} unoptimized className='w-full h-full rounded-xl object-contain' />
              ) : (
                data.name ? data.name.charAt(0).toUpperCase() : 'P'
              )}
            </div>
            <span className='text-[8.5px] font-black uppercase tracking-[0.2em] [writing-mode:vertical-rl] rotate-180 opacity-70 truncate max-h-[85px]'>
              {data.company || 'PINGWORLD STUDIO'}
            </span>
            <span className='w-2 h-2 rounded-full' style={{ background: template.accent }} />
          </div>

          {/* Right Main Detail Body (68%) */}
          <div className='w-[68%] h-full p-4 flex flex-col justify-between text-left'>
            {!showBack ? (
              /* Bold Split Front */
              <>
                <div className='space-y-1'>
                  <h2 className={cn('text-base font-black truncate', template.textPrimary)}>
                    {data.name || 'Jordan Rivera'}
                  </h2>
                  <span className='inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm truncate'
                    style={{ background: `${template.accent}25`, borderColor: `${template.accent}55`, color: template.accent }}>
                    {data.title || 'Creative Director'}
                  </span>
                </div>

                <div className='space-y-1 text-[8.5px] font-medium text-white/80'>
                  {data.email && (
                    <div className='flex items-center gap-1.5 truncate'>
                      <Mail className='h-2.5 w-2.5 shrink-0' style={{ color: template.accent }} />
                      <span className='truncate'>{data.email}</span>
                    </div>
                  )}
                  {data.phone && (
                    <div className='flex items-center gap-1.5 truncate'>
                      <Phone className='h-2.5 w-2.5 shrink-0' style={{ color: template.accent }} />
                      <span className='truncate'>{data.phone}</span>
                    </div>
                  )}
                  {data.website && (
                    <div className='flex items-center gap-1.5 truncate'>
                      <Globe className='h-2.5 w-2.5 shrink-0' style={{ color: template.accent }} />
                      <span className='truncate'>{data.website}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Bold Split Back */
              <div className='flex flex-col justify-between h-full'>
                <div>
                  <p className={cn('text-sm font-black truncate', template.textPrimary)}>
                    {data.company || 'Company Headquarters'}
                  </p>
                  {data.address && (
                    <p className='text-[8.5px] text-white/70 truncate mt-1'>{data.address}</p>
                  )}
                </div>

                <div className='flex items-center gap-3 pt-2 border-t border-white/10'>
                  <QrCode className='h-8 w-8 shrink-0' style={{ color: template.accent }} />
                  <div className='text-[8px] space-y-0.5 text-white/70 truncate'>
                    {data.linkedin && <p className='truncate'>in/{data.linkedin}</p>}
                    {data.twitter && <p className='truncate'>@{data.twitter}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 5: GLASSMORPHIC FLOATING NFC (glassmorphism, holochrome, aurora)
          ========================================================================= */}
      {activeLayout === 'holo-glass' && (
        <div className='absolute inset-0 p-3 flex items-center justify-center'>
          {/* Floating Frosted Glass Capsule */}
          <div className='w-full h-full rounded-xl backdrop-blur-xl bg-white/[0.08] border border-white/25 shadow-2xl p-3.5 flex flex-col justify-between relative overflow-hidden text-left'>
            {/* Holographic light sheen reflection */}
            <div className='absolute -inset-full bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 pointer-events-none' />

            {!showBack ? (
              /* Holo Front */
              <>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    {logoDataUrl ? (
                      <Image src={logoDataUrl} alt='Logo' width={32} height={32} unoptimized className='w-8 h-8 rounded-lg object-contain bg-black/20 border border-white/20' />
                    ) : (
                      <div className='w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-xs font-black'
                        style={{ color: template.accent }}>
                        {data.name ? data.name.charAt(0).toUpperCase() : 'N'}
                      </div>
                    )}
                    <span className='text-[9px] font-bold uppercase tracking-widest text-white/90 truncate'>
                      {data.company || 'NFC DIGITAL CARD'}
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-[8px] font-mono text-white/70 bg-white/10 px-2 py-0.5 rounded-full border border-white/15'>
                    <Wifi className='h-2.5 w-2.5 rotate-90 text-pw-cyan animate-pulse' />
                    <span>NFC</span>
                  </div>
                </div>

                <div className='space-y-0.5'>
                  <h2 className={cn('text-base font-extrabold tracking-tight truncate', template.textPrimary)}>
                    {data.name || 'Morgan Taylor'}
                  </h2>
                  <p className='text-[9.5px] font-semibold truncate' style={{ color: template.accent }}>
                    {data.title || 'Product Architect'}
                  </p>
                </div>

                <div className='flex flex-wrap gap-2 text-[8px] text-white/80'>
                  {data.email && (
                    <span className='bg-white/5 px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[140px]'>
                      {data.email}
                    </span>
                  )}
                  {data.phone && (
                    <span className='bg-white/5 px-2 py-0.5 rounded-md border border-white/10 truncate'>
                      {data.phone}
                    </span>
                  )}
                </div>
              </>
            ) : (
              /* Holo Back */
              <div className='flex flex-col items-center justify-center h-full space-y-2 text-center'>
                <div className='p-2 rounded-xl bg-white/10 border border-white/20 shadow-inner'>
                  <QrCode className='h-10 w-10 text-white' />
                </div>
                <p className='text-[9px] font-bold text-white uppercase tracking-widest'>
                  TAP OR SCAN TO CONNECT
                </p>
                <span className='text-[7.5px] text-white/60 font-mono'>
                  INSTANT DIGITAL VCARD
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 6: CLASSIC SPLIT (midnight, etc.)
          ========================================================================= */}
      {activeLayout === 'classic-split' && (
        <div className='absolute inset-0 flex items-center p-6 gap-4 text-left'>
          {/* Accent Line */}
          <div className='absolute left-0 top-0 bottom-0 w-1 rounded-full' style={{ background: template.accent }} />

          {!showBack ? (
            /* Classic Front */
            <>
              <div className='shrink-0'>
                {logoDataUrl ? (
                  <Image src={logoDataUrl} alt='Logo' width={56} height={56} unoptimized className='w-14 h-14 rounded-xl object-contain bg-white/10' />
                ) : (
                  <div className='w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black'
                    style={{ background: `${template.accent}22`, color: template.accent, border: `1.5px solid ${template.accent}55` }}>
                    {data.name ? data.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>

              <div className='flex-1 min-w-0 space-y-0.5'>
                <p className={cn('text-base font-black leading-tight truncate', template.textPrimary)}>
                  {data.name || 'Your Name'}
                </p>
                <p className='text-[11px] font-semibold leading-tight truncate' style={{ color: template.accent }}>
                  {data.title || 'Job Title'}
                </p>
                <p className={cn('text-[10px] font-medium truncate', template.textMuted)}>
                  {data.company}
                </p>

                <div className={cn('pt-2 space-y-0.5', template.textMuted, 'text-[9px] font-medium')}>
                  {data.email && (
                    <div className='flex items-center gap-1 truncate'>
                      <Mail className='h-2.5 w-2.5 shrink-0' />{data.email}
                    </div>
                  )}
                  {data.phone && (
                    <div className='flex items-center gap-1 truncate'>
                      <Phone className='h-2.5 w-2.5 shrink-0' />{data.phone}
                    </div>
                  )}
                  {data.website && (
                    <div className='flex items-center gap-1 truncate'>
                      <Globe className='h-2.5 w-2.5 shrink-0' />{data.website}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Classic Back */
            <div className='w-full flex flex-col items-center justify-center gap-3 text-center'>
              <p className={cn('text-base font-black tracking-wide', template.textPrimary)}>
                {data.company || 'Company Name'}
              </p>
              <div className={cn('flex flex-wrap gap-2 text-[8.5px] font-semibold justify-center', template.textMuted)}>
                {data.address && <span className='flex items-center gap-1'><MapPin className='h-2.5 w-2.5' />{data.address}</span>}
                {data.linkedin && <span className='flex items-center gap-1'><Linkedin className='h-2.5 w-2.5' />{data.linkedin}</span>}
                {data.twitter && <span className='flex items-center gap-1'><Twitter className='h-2.5 w-2.5' />{data.twitter}</span>}
              </div>
              <div className='w-10 h-10 rounded-lg flex items-center justify-center'
                style={{ background: `${template.accent}22`, border: `1.5px solid ${template.accent}55` }}>
                <QrCode className='h-6 w-6' style={{ color: template.accent }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── Main ───────────────────────────────── */

const EMPTY: CardData = {
  name: '', title: '', company: '', phone: '',
  email: '', website: '', linkedin: '', twitter: '', address: '', logoUrl: null,
};

export default function BusinessCardMaker() {
  const { premiumTier } = useAppContext();
  const isProUser = premiumTier !== 'free';

  const [data, setData]               = useState<CardData>(EMPTY);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [templateId, setTemplateId]   = useState<TemplateId>('midnight');
  const [activeLayout, setActiveLayout] = useState<CardLayoutType>('classic-split');
  const [showBack, setShowBack]       = useState(false);
  const [exporting, setExporting]     = useState(false);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef  = useRef<HTMLDivElement>(null);

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const set = (k: keyof CardData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((prev) => ({ ...prev, [k]: e.target.value }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const exportCard = async (side: 'front' | 'back') => {
    const ref = side === 'front' ? frontRef : backRef;
    if (!ref.current) return;
    ref.current.dataset.captureRoot ||= crypto.randomUUID();
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(ref.current, {
        backgroundColor: null,
        scale: 6, // ~300 dpi equivalent print quality
        useCORS: true,
        allowTaint: false,
        logging: false,
        onclone: (clonedDoc) => {
          makeHtml2CanvasCloneColorSafe(ref.current!, clonedDoc);
          // Remove watermark overlay from exported high-res canvas
          const watermarkOverlays = clonedDoc.querySelectorAll('.pointer-events-none.select-none.z-30');
          watermarkOverlays.forEach((el) => el.remove());
        },
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-card-${side}-${Date.now()}.png`;
      a.click();
      toast.success(`${side === 'front' ? 'Front' : 'Back'} card exported at print-ready 6× resolution!`);
    } catch (e) {
      toast.error(`Export failed. Please try again.  ${e}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className='grid grid-cols-1 xl:grid-cols-12 gap-8 items-start'>
      {/* ───── Live Preview ───── */}
      <div className='xl:col-span-7 flex flex-col items-center gap-6 p-4 sm:p-8'>

        {/* Front preview */}
        <div ref={frontRef}>
          <BusinessCardPreview
            data={data}
            template={template}
            layoutType={activeLayout}
            showBack={false}
            logoDataUrl={logoDataUrl}
          />
        </div>

        {/* Back preview */}
        <div ref={backRef} className='opacity-80 hover:opacity-100 transition-opacity cursor-pointer' title='Back side preview'>
          <BusinessCardPreview
            data={data}
            template={template}
            layoutType={activeLayout}
            showBack={true}
            logoDataUrl={logoDataUrl}
          />
        </div>

        {/* Export buttons */}
        <div className='flex gap-3 flex-wrap justify-center'>
          <Button
            onClick={() => exportCard('front')}
            disabled={exporting}
            className='h-11 px-6 rounded-xl btn-primary font-bold gap-2 text-xs shadow-lg shadow-pw-primary/20'>
            <Download className='h-4 w-4' />
            Export Front
          </Button>
          <Button
            onClick={() => exportCard('back')}
            disabled={exporting}
            variant='outline'
            className='h-11 px-6 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 font-bold gap-2 text-xs'>
            <Download className='h-4 w-4' />
            Export Back
          </Button>
        </div>
      </div>

      {/* ───── Controls ───── */}
      <div className='xl:col-span-5 space-y-5'>

        {/* Physical Layout Architecture Selector */}
        <Card className='p-5 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl shadow-xl space-y-3'>
          <div className='flex items-center justify-between'>
            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>
              Card Architecture & Layout
            </label>
            <span className='text-[10px] text-pw-cyan font-semibold'>
              {LAYOUT_DEFINITIONS.find((l) => l.id === activeLayout)?.label}
            </span>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {LAYOUT_DEFINITIONS.map((l) => {
              const isLocked = l.isPremium && !isProUser;
              const IconComp = l.icon;
              const isSelected = activeLayout === l.id;

              return (
                <button
                  key={l.id}
                  type='button'
                  onClick={() => {
                    if (isLocked) {
                      toast.info(`Upgrade to Pro to unlock the "${l.label}" physical card layout!`);
                      return;
                    }
                    setActiveLayout(l.id);
                  }}
                  className={cn(
                    'h-16 rounded-xl text-xs font-bold border transition-all relative flex flex-col items-center justify-center p-2 gap-1 text-center',
                    isSelected ? 'bg-pw-primary/15 border-pw-primary text-white shadow-lg ring-1 ring-pw-primary/50' : 'bg-white/5 border-white/10 text-pw-muted hover:text-white',
                    isLocked && 'opacity-50 grayscale hover:opacity-60 cursor-not-allowed',
                  )}>
                  <IconComp className={cn('h-4 w-4', isSelected ? 'text-pw-primary' : 'text-pw-muted')} />
                  <span className='text-[10px] font-semibold truncate w-full'>{l.label}</span>
                  {l.isPremium && (
                    <span className='absolute top-1 right-1.5 text-[8px] text-pw-warning flex items-center gap-0.5'>
                      {isLocked ? <Lock className='h-2 w-2' /> : <Crown className='h-2 w-2' />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Templates Color Palette */}
        <Card className='p-5 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl shadow-xl space-y-4'>
          <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>
            Colorway & Material Theme
          </label>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {TEMPLATES.map((t) => {
              const isLocked = t.isPremium && !isProUser;
              return (
                <button
                  key={t.id}
                  type='button'
                  onClick={() => {
                    if (isLocked) {
                      toast.info(`Unlock "${t.name}" premium business card style with a Pro upgrade!`);
                      return;
                    }
                    setTemplateId(t.id);
                    setActiveLayout(t.layoutType);
                  }}
                  className={cn(
                    'h-14 rounded-xl text-xs font-bold border-2 transition-all relative flex flex-col items-center justify-center p-1',
                    t.bg,
                    templateId === t.id ? 'border-white scale-105 shadow-md ring-2 ring-pw-primary/40' : 'border-transparent opacity-75 hover:opacity-100',
                    t.textPrimary,
                    isLocked && 'opacity-50 grayscale hover:opacity-60 cursor-not-allowed',
                  )}>
                  <span className='truncate w-full text-center'>{t.name}</span>
                  {t.isPremium && (
                    <span className={cn('text-[9px] font-mono flex items-center gap-0.5 mt-0.5', isLocked ? 'text-pw-warning font-bold' : 'text-amber-300')}>
                      {isLocked ? <Lock className='h-2.5 w-2.5' /> : <Crown className='h-2.5 w-2.5' />}
                      {isLocked ? 'LOCKED' : 'PRO'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Identity & Details */}
        <Card className='p-5 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl shadow-xl space-y-4'>
          <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block flex items-center gap-1'>
            <Type className='h-3 w-3' /> Identity
          </label>

          <div className='space-y-2.5'>
            {[
              { key: 'name',    placeholder: 'Full Name',    icon: <Type className='h-3.5 w-3.5' /> },
              { key: 'title',   placeholder: 'Job Title',    icon: <Layers className='h-3.5 w-3.5' /> },
              { key: 'company', placeholder: 'Company',      icon: <Building2 className='h-3.5 w-3.5' /> },
            ].map(({ key, placeholder, icon }) => (
              <div key={key} className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted'>{icon}</span>
                <Input
                  value={(data as any)[key]}
                  onChange={set(key as keyof CardData)}
                  placeholder={placeholder}
                  className='pl-9 bg-white/5 border-white/10 text-sm h-10 rounded-xl placeholder:text-pw-muted/50'
                />
              </div>
            ))}
          </div>

          <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block pt-2 flex items-center gap-1'>
            <Phone className='h-3 w-3' /> Contact
          </label>
          <div className='space-y-2.5'>
            {[
              { key: 'email',   placeholder: 'Email',    icon: <Mail className='h-3.5 w-3.5' /> },
              { key: 'phone',   placeholder: 'Phone',    icon: <Phone className='h-3.5 w-3.5' /> },
              { key: 'website', placeholder: 'Website',  icon: <Globe className='h-3.5 w-3.5' /> },
            ].map(({ key, placeholder, icon }) => (
              <div key={key} className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted'>{icon}</span>
                <Input
                  value={(data as any)[key]}
                  onChange={set(key as keyof CardData)}
                  placeholder={placeholder}
                  className='pl-9 bg-white/5 border-white/10 text-sm h-10 rounded-xl placeholder:text-pw-muted/50'
                />
              </div>
            ))}
          </div>

          <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block pt-2 flex items-center gap-1'>
            <Linkedin className='h-3 w-3' /> Socials & Address (Back)
          </label>
          <div className='space-y-2.5'>
            {[
              { key: 'linkedin', placeholder: 'LinkedIn handle', icon: <Linkedin className='h-3.5 w-3.5' /> },
              { key: 'twitter',  placeholder: 'X / Twitter',     icon: <Twitter  className='h-3.5 w-3.5' /> },
              { key: 'address',  placeholder: 'Office Address',  icon: <MapPin   className='h-3.5 w-3.5' /> },
            ].map(({ key, placeholder, icon }) => (
              <div key={key} className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted'>{icon}</span>
                <Input
                  value={(data as any)[key]}
                  onChange={set(key as keyof CardData)}
                  placeholder={placeholder}
                  className='pl-9 bg-white/5 border-white/10 text-sm h-10 rounded-xl placeholder:text-pw-muted/50'
                />
              </div>
            ))}
          </div>

          {/* Logo upload */}
          <div className='pt-2'>
            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block mb-2'>
              Company Logo / Icon
            </label>
            <div className='flex items-center gap-3'>
              {logoDataUrl ? (
                <div className='relative w-12 h-12 rounded-xl bg-white/10 border border-white/10 p-1 flex items-center justify-center shrink-0'>
                    <Image src={logoDataUrl} alt='Logo' width={220} height={100} unoptimized className='max-w-full max-h-full object-contain' />
                  <button
                    type='button'
                    onClick={() => setLogoDataUrl(null)}
                    className='absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pw-danger text-white flex items-center justify-center text-[9px]'>
                    ×
                  </button>
                </div>
              ) : null}
              <label className='flex-1 cursor-pointer'>
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleLogoUpload}
                  className='hidden'
                />
                <div className='w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 text-xs font-semibold text-pw-muted hover:text-white transition-all'>
                  <Upload className='h-3.5 w-3.5' />
                  {logoDataUrl ? 'Replace Logo' : 'Upload Logo'}
                </div>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
