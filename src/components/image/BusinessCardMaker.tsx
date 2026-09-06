'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download, Upload, Trash2, Type, Building2, Phone, Mail,
  Globe, Linkedin, Twitter, MapPin, Palette, RotateCcw,
  QrCode, Layers, ArrowLeftRight, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ─────────────────────────────── Types ──────────────────────────────── */

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

type TemplateId = 'midnight' | 'aurora' | 'monochrome' | 'coral' | 'forest' | 'slate';

interface Template {
  id:         TemplateId;
  name:       string;
  bg:         string;             // Tailwind class(es) or inline bg
  accent:     string;             // hex used for detail elements
  textPrimary:string;
  textMuted:  string;
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
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: 'bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]',
    accent: '#38EF7D',
    textPrimary: 'text-white',
    textMuted: 'text-white/50',
  },
  {
    id: 'monochrome',
    name: 'Mono',
    bg: 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d]',
    accent: '#e5e5e5',
    textPrimary: 'text-white',
    textMuted: 'text-white/40',
  },
  {
    id: 'coral',
    name: 'Coral',
    bg: 'bg-gradient-to-br from-[#FF512F] to-[#DD2476]',
    accent: '#ffffff',
    textPrimary: 'text-white',
    textMuted: 'text-white/70',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: 'bg-gradient-to-br from-[#134e4a] via-[#065f46] to-[#064e3b]',
    accent: '#6ee7b7',
    textPrimary: 'text-white',
    textMuted: 'text-white/50',
  },
  {
    id: 'slate',
    name: 'Slate',
    bg: 'bg-gradient-to-br from-[#e2e8f0] to-[#f8fafc]',
    accent: '#334155',
    textPrimary: 'text-slate-800',
    textMuted: 'text-slate-500',
  },
];

/* ─────────────────────────────── Card Preview ───────────────────────── */

function BusinessCardPreview({
  data,
  template,
  showBack,
  logoDataUrl,
}: {
  data: CardData;
  template: Template;
  showBack: boolean;
  logoDataUrl: string | null;
}) {
  return (
    /* 3.5" × 2" ratio → 350px × 200px at 1× */
    <div
      className={cn(
        'relative w-[350px] h-[200px] rounded-2xl overflow-hidden shadow-2xl',
        'ring-1 ring-white/10 select-none shrink-0',
        template.bg,
      )}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Decorative accent bar */}
      <div className='absolute left-0 top-0 bottom-0 w-1 rounded-full'
        style={{ background: template.accent }} />

      {/* Decorative dot cluster */}
      <div className='absolute top-3 right-3 flex gap-1 opacity-30'>
        {[...Array(3)].map((_, i) => (
          <span key={i} className='w-1.5 h-1.5 rounded-full'
            style={{ background: template.accent }} />
        ))}
      </div>

      {!showBack ? (
        /* ── Front Face ── */
        <div className='absolute inset-0 flex items-center p-6 gap-4'>
          {/* Logo / Initials */}
          <div className='shrink-0'>
            {logoDataUrl ? (
              <img src={logoDataUrl} alt='Logo'
                className='w-14 h-14 rounded-xl object-contain bg-white/10' />
            ) : (
              <div className='w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black'
                style={{ background: `${template.accent}22`, color: template.accent, border: `1.5px solid ${template.accent}55` }}>
                {data.name ? data.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>

          {/* Name + Contact Info */}
          <div className='flex-1 min-w-0 space-y-0.5'>
            <p className={cn('text-base font-black leading-tight truncate', template.textPrimary)}>
              {data.name || 'Your Name'}
            </p>
            <p className='text-[11px] font-semibold leading-tight truncate'
              style={{ color: template.accent }}>
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
        </div>
      ) : (
        /* ── Back Face ── */
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 p-6'>
          <div className='w-full flex items-center justify-center gap-2 flex-col'>
            <p className={cn('text-lg font-black tracking-wide', template.textPrimary)}>
              {data.company || 'Company Name'}
            </p>
            <div className={cn('flex flex-wrap gap-3 text-[9px] font-semibold', template.textMuted)}>
              {data.address && (
                <span className='flex items-center gap-1'><MapPin className='h-2.5 w-2.5' />{data.address}</span>
              )}
              {data.linkedin && (
                <span className='flex items-center gap-1'><Linkedin className='h-2.5 w-2.5' />{data.linkedin}</span>
              )}
              {data.twitter && (
                <span className='flex items-center gap-1'><Twitter className='h-2.5 w-2.5' />{data.twitter}</span>
              )}
            </div>
          </div>
          {/* QR Code placeholder */}
          <div className='w-12 h-12 rounded-lg flex items-center justify-center opacity-60'
            style={{ background: `${template.accent}22`, border: `1.5px solid ${template.accent}55` }}>
            <QrCode className='h-7 w-7' style={{ color: template.accent }} />
          </div>
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
  const [data, setData]             = useState<CardData>(EMPTY);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>('midnight');
  const [showBack, setShowBack]     = useState(false);
  const [exporting, setExporting]   = useState(false);

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
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(ref.current, {
        backgroundColor: null,
        scale: 6,      // ~300 dpi equivalent for a 350px wide element
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-card-${side}-${Date.now()}.png`;
      a.click();
      toast.success(`${side === 'front' ? 'Front' : 'Back'} exported at print quality!`);
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className='grid grid-cols-1 xl:grid-cols-12 gap-8 items-start'>
      {/* ───── Live Preview ───── */}
      <div className='xl:col-span-7 flex flex-col items-center gap-6
                      p-8'>

        {/* Front preview */}
        <div ref={frontRef}>
          <BusinessCardPreview
            data={data} template={template} showBack={false} logoDataUrl={logoDataUrl} />
        </div>

        {/* Back preview (dimmed when viewing front) */}
        <div ref={backRef} className='opacity-60 hover:opacity-100 transition-opacity' title='Back side'>
          <BusinessCardPreview
            data={data} template={template} showBack={true} logoDataUrl={logoDataUrl} />
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
        {/* Templates */}
        <Card className='p-5 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl shadow-xl space-y-4'>
          <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest block'>
            Card Template
          </label>
          <div className='grid grid-cols-3 gap-2'>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type='button'
                onClick={() => setTemplateId(t.id)}
                className={cn(
                  'h-12 rounded-xl text-xs font-bold border-2 transition-all',
                  t.bg,
                  templateId === t.id ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-90',
                  t.textPrimary,
                )}>
                {t.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Personal Info */}
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
        </Card>

        {/* Logo Upload */}
        <Card className='p-5 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl shadow-xl'>
          <div className='flex items-center justify-between'>
            <label className='text-[10px] font-bold text-pw-muted uppercase tracking-widest flex items-center gap-1'>
              <Building2 className='h-3 w-3' /> Company Logo
            </label>
            {logoDataUrl && (
              <button type='button' onClick={() => setLogoDataUrl(null)}
                className='text-pw-muted hover:text-pw-error transition-colors text-[10px] flex items-center gap-1'>
                <Trash2 className='h-3 w-3' /> Remove
              </button>
            )}
          </div>
          <label className='mt-3 cursor-pointer block'>
            <input type='file' accept='image/*' onChange={handleLogoUpload} className='hidden' />
            {logoDataUrl ? (
              <img src={logoDataUrl} alt='Logo preview'
                className='h-16 max-w-full object-contain rounded-xl bg-white/5 border border-white/10 p-2' />
            ) : (
              <div className='h-16 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center
                              text-pw-muted text-xs font-bold gap-2 hover:bg-white/5 transition-colors'>
                <Upload className='h-4 w-4' /> Upload Logo
              </div>
            )}
          </label>
        </Card>
      </div>
    </div>
  );
}
