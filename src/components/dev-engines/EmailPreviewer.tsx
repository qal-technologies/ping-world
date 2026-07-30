'use client';

import { useState } from 'react';
import { Mail, Copy, Check, Plus, Trash2, Code, Layout, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmailEngine, EmailTemplateType, ButtonConfig, DownlinkConfig, ModularEmailParams } from '@/lib/dev-engines/email-engine';
import { toast } from 'sonner';

export default function EmailPreviewer() {
  const [useModular, setUseModular] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#00f0ff');

  // Simple Mode states
  const [templateType, setTemplateType] = useState<EmailTemplateType>('professional');
  const [simpleTitle, setSimpleTitle] = useState('Verification & API Credentials');
  const [simpleBody, setSimpleBody] = useState('Thank you for choosing PingWorld Developer Tools. Your API access token is ready for integration.');
  const [recipientName, setRecipientName] = useState('Developer User');
  const [companyName, setCompanyName] = useState('PingWorld Inc.');

  // Modular Mode states
  const [headerTitle, setHeaderTitle] = useState('Modular Delivery System');
  const [headerDesc, setHeaderDesc] = useState('High reliability messaging infrastructure');
  const [headerColor, setHeaderColor] = useState('#00f0ff');
  const [headerBg, setHeaderBg] = useState('#0f172a');

  const [bodyText, setBodyText] = useState('Your microservices cluster is operating optimally. Operational verification checks are successful.');

  const [buttons, setButtons] = useState<ButtonConfig[]>([
    { order: 'before-text', title: { text: 'Cluster Health Check', color: '#000000', weight: 'bold' }, url: 'https://pingworld.dev', position: 'center' },
    { order: 'after-text', title: { text: 'View System Analytics', color: '#ffffff', weight: 'normal', underline: true }, url: 'https://pingworld.dev/analytics', position: 'left' }
  ]);

  const [footerText, setFooterText] = useState('© 2026 PingWorld Systems. Under international SLA compliance policies.');
  const [downlinks, setDownlinks] = useState<DownlinkConfig[]>([
    { text: 'Privacy & Terms', url: 'https://pingworld.dev/privacy' },
    { text: 'Security Compliance', url: 'https://pingworld.dev/security' }
  ]);

  const [copiedHTML, setCopiedHTML] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const engine = new EmailEngine();

  // Compose modular config
  const modularParams: ModularEmailParams = {
    primaryColor,
    header: {
      title: headerTitle,
      description: headerDesc,
      color: headerColor,
      bgColor: headerBg
    },
    body: {
      text: bodyText,
      buttons
    },
    footer: {
      text: footerText,
      downlinks
    }
  };

  const htmlResult = useModular
    ? engine.generateTemplate('modular', { title: '', body: '', modularConfig: modularParams })
    : engine.generateTemplate(templateType, {
        title: simpleTitle,
        body: simpleBody,
        recipientName,
        companyName,
        primaryColor,
        logoUrl: 'https://pingworld.app/images/logo.png',
        footerText: footerText
      });

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(htmlResult);
    setCopiedHTML(true);
    toast.success('Email HTML template copied!');
    setTimeout(() => setCopiedHTML(false), 2000);
  };

  const handleAddButton = () => {
    setButtons(prev => [
      ...prev,
      { order: 'after-text', title: { text: 'New CTA Button', color: '#ffffff' }, url: 'https://pingworld.dev', position: 'center' }
    ]);
    toast.success('Added new CTA button element.');
  };

  const handleRemoveButton = (idx: number) => {
    setButtons(prev => prev.filter((_, i) => i !== idx));
    toast.info('Removed CTA button.');
  };

  const handleAddDownlink = () => {
    setDownlinks(prev => [
      ...prev,
      { text: 'New Link', url: 'https://pingworld.dev' }
    ]);
  };

  const handleRemoveDownlink = (idx: number) => {
    setDownlinks(prev => prev.filter((_, i) => i !== idx));
  };

  const codeSnippet = `// API Post Configuration for calling the Email Template Engine
fetch('/api/call/email-engine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'generateTemplate',
    data: 'modular',
    params: ${JSON.stringify(modularParams, null, 2)}
  })
}).then(res => res.json()).then(console.log);`;

  return (
    <Card className='card-glow bkblur p-6 flex flex-col gap-6'>
      <div className='flex justify-between items-center border-b border-white/5 pb-4'>
        <h3 className='text-lg font-bold font-display flex items-center gap-2'>
          <Mail className='h-5 w-5 text-pw-primary' />
          Visual Responsive Email Template Builder
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCode(!showCode)}
            variant="outline"
            size="sm"
            className="h-8 text-xs border-white/10 gap-1.5"
          >
            <Code className="h-3.5 w-3.5" />
            {showCode ? 'Hide Code' : 'Generate API Call'}
          </Button>
          <Button
            onClick={handleCopyHTML}
            variant='outline'
            size='sm'
            className='h-8 text-xs border-white/10 gap-1.5 bg-pw-primary/10 text-pw-primary hover:bg-pw-primary hover:text-white'>
            {copiedHTML ?
              <Check className='h-3.5 w-3.5 text-emerald-400' />
            : <Copy className='h-3.5 w-3.5' />}
            Copy Email HTML
          </Button>
        </div>
      </div>

      {/* Editor Type Toggle */}
      <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 w-fit">
        <button
          onClick={() => setUseModular(true)}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 ${useModular ? 'bg-pw-primary text-black' : 'text-pw-muted hover:text-pw-text'}`}
        >
          <Layout className="h-3.5 w-3.5" />
          Pro Modular Customizer
        </button>
        <button
          onClick={() => setUseModular(false)}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 ${!useModular ? 'bg-pw-primary text-black' : 'text-pw-muted hover:text-pw-text'}`}
        >
          <Layers className="h-3.5 w-3.5" />
          Classic Themes
        </button>
      </div>

      {showCode && (
        <pre className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-pw-muted overflow-x-auto max-h-[220px]">
          {codeSnippet}
        </pre>
      )}

      {useModular ? (
        // Modular customization workspace
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls Column */}
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 space-y-3">
            {/* Header Settings */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-pw-primary uppercase block">// Header Module Settings</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-pw-muted uppercase block font-bold mb-1">Title</label>
                  <Input value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} className="bg-pw-surface/50 border-white/10" />
                </div>
                <div>
                  <label className="text-[10px] text-pw-muted uppercase block font-bold mb-1">Description</label>
                  <Input value={headerDesc} onChange={e => setHeaderDesc(e.target.value)} className="bg-pw-surface/50 border-white/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-pw-muted uppercase block font-bold mb-1">Title Color (Override)</label>
                  <div className="flex gap-1.5 items-center">
                    <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="w-8 h-8 rounded bg-transparent border-none cursor-pointer" />
                    <Input value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="h-8 font-mono text-xs bg-pw-surface/50 border-white/10" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-pw-muted uppercase block font-bold mb-1">Bg Color (Override)</label>
                  <div className="flex gap-1.5 items-center">
                    <input type="color" value={headerBg} onChange={e => setHeaderBg(e.target.value)} className="w-8 h-8 rounded bg-transparent border-none cursor-pointer" />
                    <Input value={headerBg} onChange={e => setHeaderBg(e.target.value)} className="h-8 font-mono text-xs bg-pw-surface/50 border-white/10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Body Settings */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-pw-primary uppercase block">// Body Module Settings</span>
              <div>
                <label className="text-[10px] text-pw-muted uppercase block font-bold mb-1">Primary Body Text</label>
                <textarea rows={3} value={bodyText} onChange={e => setBodyText(e.target.value)} className="w-full rounded-xl bg-pw-surface/50 border border-white/10 p-3 text-xs text-pw-text focus:outline-none focus:border-pw-primary leading-relaxed" />
              </div>

              {/* Dynamic Buttons Array */}
              <div className="space-y-3 border-t border-white/5 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-pw-muted uppercase font-bold">Action Buttons ({buttons.length})</span>
                  <Button onClick={handleAddButton} size="sm" variant="outline" className="h-7 text-[10px] gap-1 px-2 border-white/10">
                    <Plus className="h-3 w-3" />
                    Add Button
                  </Button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <Input value={btn.title.text} onChange={e => {
                          const copy = [...buttons];
                          copy[idx].title.text = e.target.value;
                          setButtons(copy);
                        }} className="h-7 text-xs bg-pw-surface/50 border-white/10 flex-1" placeholder="Button Title" />

                        <Button onClick={() => handleRemoveButton(idx)} size="icon" variant="ghost" className="h-7 w-7 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                        <div>
                          <label className="text-pw-muted mb-0.5 block">Position</label>
                          <select value={btn.position} onChange={e => {
                            const copy = [...buttons];
                            copy[idx].position = e.target.value as any;
                            setButtons(copy);
                          }} className="w-full h-7 bg-pw-surface border border-white/10 rounded px-1.5 focus:outline-none">
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-pw-muted mb-0.5 block">Placement Order</label>
                          <select value={btn.order} onChange={e => {
                            const copy = [...buttons];
                            copy[idx].order = e.target.value as any;
                            setButtons(copy);
                          }} className="w-full h-7 bg-pw-surface border border-white/10 rounded px-1.5 focus:outline-none">
                            <option value="before-text">Before Text</option>
                            <option value="after-text">After Text</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-pw-muted mb-0.5 block">Button Color</label>
                          <input type="color" value={btn.title.color || '#ffffff'} onChange={e => {
                            const copy = [...buttons];
                            copy[idx].title.color = e.target.value;
                            setButtons(copy);
                          }} className="w-full h-7 rounded border-none bg-transparent cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Settings */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-pw-primary uppercase block">// Footer Module Settings</span>
              <div>
                <label className="text-[10px] text-pw-muted uppercase block font-bold mb-1">Footer Legal Text</label>
                <Input value={footerText} onChange={e => setFooterText(e.target.value)} className="bg-pw-surface/50 border-white/10 text-xs" />
              </div>

              {/* Downlinks */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-pw-muted uppercase font-bold">Downlinks ({downlinks.length})</span>
                  <Button onClick={handleAddDownlink} size="sm" variant="outline" className="h-7 text-[10px] gap-1 px-2 border-white/10">
                    <Plus className="h-3 w-3" />
                    Add Link
                  </Button>
                </div>
                {downlinks.map((dl, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input value={dl.text} onChange={e => {
                      const copy = [...downlinks];
                      copy[idx].text = e.target.value;
                      setDownlinks(copy);
                    }} className="h-7 text-xs bg-pw-surface/50 border-white/10 flex-1" placeholder="Text" />
                    <Input value={dl.url} onChange={e => {
                      const copy = [...downlinks];
                      copy[idx].url = e.target.value;
                      setDownlinks(copy);
                    }} className="h-7 text-xs bg-pw-surface/50 border-white/10 font-mono flex-1" placeholder="URL" />
                    <Button onClick={() => handleRemoveDownlink(idx)} size="icon" variant="ghost" className="h-7 w-7 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase text-pw-muted mb-2 block">Live Responsive Preview:</span>
            <div className='border border-white/10 rounded-2xl overflow-hidden bg-white shadow-2xl h-[500px]'>
              <iframe srcDoc={htmlResult} className='w-full h-full border-none' title='Modular Email Preview' />
            </div>
          </div>
        </div>
      ) : (
        // Simple Classic templates
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>Theme Style</label>
              <select value={templateType} onChange={e => setTemplateType(e.target.value as any)} className="w-full h-11 rounded-xl bg-pw-surface/50 border border-white/10 px-4 font-mono text-sm text-pw-text focus:outline-none focus:border-pw-primary">
                <option value="professional" className="bg-pw-surface text-pw-text">Professional</option>
                <option value="otp" className="bg-pw-surface text-pw-text">OTP / Auth Code</option>
                <option value="marketing" className="bg-pw-surface text-pw-text">Marketing</option>
                <option value="social" className="bg-pw-surface text-pw-text">Social Update</option>
                <option value="information" className="bg-pw-surface text-pw-text">General info</option>
              </select>
            </div>
            <div>
              <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>Company Name</label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className='bg-pw-surface/50 border-white/10' />
            </div>
            <div>
              <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>Recipient</label>
              <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} className='bg-pw-surface/50 border-white/10' />
            </div>
            <div>
              <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>Title</label>
              <Input value={simpleTitle} onChange={e => setSimpleTitle(e.target.value)} className='bg-pw-surface/50 border-white/10' />
            </div>
          </div>

          <div>
            <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>Email Body text</label>
            <textarea rows={4} value={simpleBody} onChange={e => setSimpleBody(e.target.value)} className="w-full rounded-xl bg-pw-surface/50 border border-white/10 p-3 text-xs text-pw-text focus:outline-none focus:border-pw-primary leading-relaxed" />
          </div>

          <div className='border border-white/10 rounded-2xl overflow-hidden bg-white shadow-2xl h-[340px]'>
            <iframe srcDoc={htmlResult} className='w-full h-full border-none' title='Classic Email Preview' />
          </div>
        </div>
      )}
    </Card>
  );
}
