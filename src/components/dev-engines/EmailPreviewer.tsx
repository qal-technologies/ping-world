'use client';

import { useState } from 'react';
import { Mail, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmailEngine, EmailTemplateType } from '@/lib/dev-engines/email-engine';
import { toast } from 'sonner';

export default function EmailPreviewer() {
  const [templateType, setTemplateType] =
    useState<EmailTemplateType>('professional');
  const [companyName, setCompanyName] = useState('PingWorld Inc.');
  const [recipientName, setRecipientName] = useState('Developer User');
  const [title, setTitle] = useState(
    'Your Account Verification & API Credentials',
  );
  const [bodyText, setBodyText] = useState(
    'Thank you for choosing PingWorld Developer Tools. Your API access token is ready for integration. Click below to view docs or get started.',
  );
  const [primaryColor, setPrimaryColor] = useState('#00f0ff');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [ctaText, setCtaText] = useState('Access Developer Portal');
  const [ctaUrl, setCtaUrl] = useState('https://pingworld.dev/api');
  const [otpCode, setOtpCode] = useState('984120');
  const [footerText, setFooterText] = useState(
    '© 2026 PingWorld Technologies. All rights reserved.',
  );
  const [copiedHTML, setCopiedHTML] = useState(false);

  const engine = new EmailEngine();
  const htmlResult = engine.generateTemplate(templateType, {
    title,
    body: bodyText,
    recipientName,
    companyName,
    primaryColor,
    secondaryColor,
    otpCode,
    ctaText,
    ctaUrl,
    footerText,
  });

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(htmlResult);
    setCopiedHTML(true);
    toast.success('Email HTML template copied!');
    setTimeout(() => setCopiedHTML(false), 2000);
  };

  return (
    <Card className='card-glow bkblur p-6 flex flex-col gap-6'>
      <div className='flex justify-between items-center border-b border-white/5 pb-4'>
        <h3 className='text-lg font-bold font-display flex items-center gap-2'>
          <Mail className='h-5 w-5 text-pw-primary' />
          Interactive HTML Email Builder & Live Previewer
        </h3>
        <Button
          onClick={handleCopyHTML}
          variant='outline'
          size='sm'
          className='h-8 text-xs border-white/10 gap-1.5'>
          {copiedHTML ?
            <Check className='h-3.5 w-3.5 text-emerald-400' />
          : <Copy className='h-3.5 w-3.5' />}
          Copy Email HTML
        </Button>
      </div>

      {/* Template Theme Selector */}
      <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
        {(
          ['professional', 'otp', 'marketing', 'social', 'information'] as const
        ).map((t) => (
          <Button
            key={t}
            variant={templateType === t ? 'default' : 'outline'}
            onClick={() => setTemplateType(t)}
            className={`h-9 text-xs capitalize ${templateType === t ? 'bg-pw-primary text-black font-bold' : 'border-white/10'}`}>
            {t} Theme
          </Button>
        ))}
      </div>

      {/* Grid Controls */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div>
          <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
            Company Name
          </label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className='bg-pw-surface/50 border-white/10'
          />
        </div>
        <div>
          <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
            Recipient Name
          </label>
          <Input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className='bg-pw-surface/50 border-white/10'
          />
        </div>
        <div>
          <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
            Primary Color Accent
          </label>
          <div className='flex items-center gap-2'>
            <input
              type='color'
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className='w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10'
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className='font-mono bg-pw-surface/50 border-white/10'
            />
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
            Email Subject / Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='bg-pw-surface/50 border-white/10'
          />
        </div>

        {templateType === 'otp' ?
          <div>
            <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
              OTP Security Code
            </label>
            <Input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className='font-mono bg-pw-surface/50 border-white/10'
            />
          </div>
        : <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
                CTA Button Label
              </label>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className='bg-pw-surface/50 border-white/10'
              />
            </div>
            <div>
              <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
                CTA Target URL
              </label>
              <Input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className='bg-pw-surface/50 border-white/10 font-mono'
              />
            </div>
          </div>
        }
      </div>

      <div>
        <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
          Email Main Body Content
        </label>
        <textarea
          rows={3}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          className='w-full rounded-xl bg-pw-surface/50 border border-white/10 p-3 text-xs text-pw-text focus:outline-none focus:border-pw-primary leading-relaxed'
        />
      </div>

      <div>
        <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
          Custom Footer Text
        </label>
        <Input
          value={footerText}
          onChange={(e) => setFooterText(e.target.value)}
          className='bg-pw-surface/50 border-white/10 text-xs'
        />
      </div>

      {/* Live Email HTML Iframe Preview */}
      <div className='border border-white/10 rounded-2xl overflow-hidden bg-white shadow-2xl h-[380px]'>
        <iframe
          srcDoc={htmlResult}
          className='w-full h-full border-none'
          title='Email Live HTML Preview'
        />
      </div>
    </Card>
  );
}
