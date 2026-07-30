'use client';

import { useState } from 'react';
import { Bell, Volume2, Smartphone, Zap, Sparkles, MessageSquare, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertingToastEngine, ToastType, SoundType, AnimationType } from '@/lib/dev-engines/alerting-toast';
import { toast } from 'sonner';

export default function AlertToastRenderer() {
  const [title, setTitle] = useState('System Process Complete');
  const [message, setMessage] = useState('Service cluster completed continuous database backup cycle.');
  const [type, setType] = useState<ToastType>('success');
  const [sound, setSound] = useState<SoundType>('chime');
  const [screenFlash, setScreenFlash] = useState(true);

  // Position choices
  const [positionMode, setPositionMode] = useState<'preset' | 'coords'>('preset');
  const [positionPreset, setPositionPreset] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'>('top-right');
  const [coordX, setCoordX] = useState(100);
  const [coordY, setCoordY] = useState(250);

  // Custom visual styling
  const [animType, setAnimType] = useState<AnimationType>('slide');
  const [stackMode, setStackMode] = useState<'stack' | 'wrap'>('stack');
  const [fullWidth, setFullWidth] = useState(false);

  // Interaction Results
  const [dialogResult, setDialogResult] = useState<string | null>(null);

  const engine = AlertingToastEngine.getInstance();

  const handleTrigger = () => {
    const position = positionMode === 'coords' ? { x: coordX, y: coordY } : positionPreset;

    engine.trigger({
      title,
      message,
      type,
      sound,
      vibrate: [200, 100, 200],
      screenFlash,
      position,
      animation: animType,
      stackingMode: stackMode,
      fullWidth
    });

    toast.info('Triggered custom DOM notification.');
  };

  const handleConfirmDialog = async () => {
    setDialogResult('Awaiting user confirm action...');
    const res = await engine.confirm(
      'Database Migration Warning',
      'This operation is irreversible and will delete 24 legacy record collections. Do you wish to proceed?'
    );
    setDialogResult(`Confirm returned: ${res ? 'TRUE (Confirmed)' : 'FALSE (Cancelled)'}`);
  };

  const handlePromptDialog = async () => {
    setDialogResult('Awaiting user text prompt input...');
    const text = await engine.prompt(
      'System API Key Configuration',
      'Please set your custom verification passphrase key to sign state transfers:',
      'prod_sign_secret_99'
    );
    setDialogResult(`Prompt returned: ${text !== null ? `"${text}"` : 'NULL (Cancelled)'}`);
  };

  return (
    <Card className='card-glow bkblur p-6 flex flex-col gap-6'>
      <div className='flex justify-between items-center border-b border-white/5 pb-4'>
        <h3 className='text-lg font-bold font-display flex items-center gap-2'>
          <Bell className='h-5 w-5 text-pw-primary' />
          Zero-Dependency Visual Alert, Toast, Confirm & Prompt Engine
        </h3>
        <span className='text-xs font-mono text-pw-muted bg-white/5 px-2.5 py-1 rounded-full'>
          Zero-Provider DOM Injector
        </span>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
            Alert Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='bg-pw-surface/50 border-white/10'
          />
        </div>
        <div>
          <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
            Alert Type & Color Theme
          </label>
          <div className='grid grid-cols-5 gap-1.5'>
            {(['info', 'success', 'warning', 'error', 'critical'] as const).map((t) => (
              <Button
                key={t}
                variant={type === t ? 'default' : 'outline'}
                onClick={() => setType(t)}
                className={`h-9 px-1 text-[11px] capitalize ${type === t ? 'bg-pw-primary text-black font-bold' : 'border-white/10'}`}>
                {t}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
          Message Content Text
        </label>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className='bg-pw-surface/50 border-white/10'
        />
      </div>

      {/* Grid: Stacking, Animations, Audio & Pos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Animation Style</label>
          <select value={animType} onChange={e => setAnimType(e.target.value as any)} className="w-full h-10 rounded-xl bg-pw-surface/50 border border-white/10 px-3 text-xs text-pw-text focus:outline-none">
            <option value="slide">Slide In (Dynamic)</option>
            <option value="fade">Fade In</option>
            <option value="blur">Blur In (Cinematic)</option>
            <option value="flash">Flash In (Distracting)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Toast Overlap Mode</label>
          <select value={stackMode} onChange={e => setStackMode(e.target.value as any)} className="w-full h-10 rounded-xl bg-pw-surface/50 border border-white/10 px-3 text-xs text-pw-text focus:outline-none">
            <option value="stack">Stack (Items Below Each Other)</option>
            <option value="wrap">Wrap (Hides Behind, Stack on Click)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Audio Chime Type</label>
          <select value={sound} onChange={e => setSound(e.target.value as any)} className="w-full h-10 rounded-xl bg-pw-surface/50 border border-white/10 px-3 text-xs text-pw-text focus:outline-none">
            <option value="chime">Multi-tone Chime</option>
            <option value="beep">Standard Beep</option>
            <option value="alarm">Urgent Siren Alarm</option>
            <option value="pop">Light Pop</option>
            <option value="none">Mute (No sound)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Position Mode</label>
          <div className="flex gap-2">
            <Button size="sm" variant={positionMode === 'preset' ? 'default' : 'outline'} onClick={() => setPositionMode('preset')} className="text-xs h-9 flex-1">Presets</Button>
            <Button size="sm" variant={positionMode === 'coords' ? 'default' : 'outline'} onClick={() => setPositionMode('coords')} className="text-xs h-9 flex-1">X/Y Coordinates</Button>
          </div>
        </div>

        {positionMode === 'preset' ? (
          <div>
            <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Select Preset Position</label>
            <select value={positionPreset} onChange={e => setPositionPreset(e.target.value as any)} className="w-full h-10 rounded-xl bg-pw-surface/50 border border-white/10 px-3 text-xs text-pw-text focus:outline-none">
              <option value="top-right">Top-Right Corner</option>
              <option value="top-left">Top-Left Corner</option>
              <option value="top-center">Top-Center</option>
              <option value="bottom-right">Bottom-Right Corner</option>
              <option value="bottom-left">Bottom-Left Corner</option>
              <option value="bottom-center">Bottom-Center</option>
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-pw-muted uppercase font-bold block mb-1">X Coordinate (px)</label>
              <Input type="number" value={coordX} onChange={e => setCoordX(Number(e.target.value))} className="h-10 bg-pw-surface/50 border-white/10 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-pw-muted uppercase font-bold block mb-1">Y Coordinate (px)</label>
              <Input type="number" value={coordY} onChange={e => setCoordY(Number(e.target.value))} className="h-10 bg-pw-surface/50 border-white/10 text-xs font-mono" />
            </div>
          </div>
        )}
      </div>

      {/* Accessibility & Modal Toggles */}
      <div className='flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4'>
        <div className="flex flex-wrap gap-4 text-xs font-bold text-pw-muted">
          <label className='flex items-center gap-2 cursor-pointer hover:text-pw-text'>
            <input
              type='checkbox'
              checked={screenFlash}
              onChange={(e) => setScreenFlash(e.target.checked)}
              className='rounded accent-pw-primary w-4 h-4'
            />
            Highly Visible Screen Flash
          </label>
          <label className='flex items-center gap-2 cursor-pointer hover:text-pw-text'>
            <input
              type='checkbox'
              checked={fullWidth}
              onChange={(e) => setFullWidth(e.target.checked)}
              className='rounded accent-pw-primary w-4 h-4'
            />
            Take Full Width (100%)
          </label>
        </div>

        <Button
          onClick={handleTrigger}
          className='h-12 px-6 btn-primary font-bold gap-2 shadow-lg shadow-pw-primary/25'>
          <Sparkles className='h-4.5 w-4.5' />
          Trigger Custom DOM Toast
        </Button>
      </div>

      {/* Advanced Confirm & Prompt Sandbox */}
      <div className="p-4 rounded-xl bg-pw-surface/30 border border-white/10 flex flex-col gap-4">
        <span className="text-xs font-bold text-pw-primary uppercase font-mono flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          Blocking Promise-based Confirm & Prompt Dialogs
        </span>
        <div className="flex gap-2">
          <Button onClick={handleConfirmDialog} variant="outline" className="h-10 text-xs flex-1 gap-1.5 border-white/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Launch Confirm Dialog
          </Button>
          <Button onClick={handlePromptDialog} variant="outline" className="h-10 text-xs flex-1 gap-1.5 border-white/10">
            <Zap className="h-4 w-4 text-pw-primary" />
            Launch Prompt Dialog
          </Button>
        </div>

        {dialogResult && (
          <div className="p-3 rounded-lg bg-black/60 border border-white/5 font-mono text-xs flex justify-between items-center text-pw-text">
            <span>Result Stream: <span className="text-emerald-400 font-bold">{dialogResult}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setDialogResult(null)} className="h-6 w-6 text-pw-muted hover:text-pw-text">✕</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
