'use client';

import { useState } from 'react';
import { Bell, Volume2, Smartphone, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertingToastEngine,
  ToastType,
  SoundType,
} from '@/lib/dev-engines/alerting-toast';
import { toast } from 'sonner';

export default function AlertToastRenderer() {
  const [title, setTitle] = useState('System Notification');
  const [message, setMessage] = useState(
    'PingWorld Developer Alert Triggered!',
  );
  const [type, setType] = useState<ToastType>('success');
  const [sound, setSound] = useState<SoundType>('chime');
  const [screenFlash, setScreenFlash] = useState(true);

  const engine = new AlertingToastEngine();

  const handleTrigger = () => {
    engine.trigger({
      title,
      message,
      type,
      sound,
      vibrate: [100, 50, 100],
      screenFlash,
    });

    if (type === 'success') toast.success(`${title}: ${message}`);
    else if (type === 'error' || type === 'critical')
      toast.error(`${title}: ${message}`);
    else if (type === 'warning') toast.warning(`${title}: ${message}`);
    else toast.info(`${title}: ${message}`);
  };

  return (
    <Card className='card-glow bkblur p-6 flex flex-col gap-6'>
      <div className='flex justify-between items-center border-b border-white/5 pb-4'>
        <h3 className='text-lg font-bold font-display flex items-center gap-2'>
          <Bell className='h-5 w-5 text-pw-primary' />
          Interactive Alert & Toast DOM Renderer
        </h3>
        <span className='text-xs font-mono text-pw-muted bg-white/5 px-2.5 py-1 rounded-full'>
          Audio + Haptic + Flash
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
            Alert Type
          </label>
          <div className='grid grid-cols-4 gap-2'>
            {(['info', 'success', 'warning', 'error'] as const).map((t) => (
              <Button
                key={t}
                variant={type === t ? 'default' : 'outline'}
                onClick={() => setType(t)}
                className={`h-9 text-xs capitalize ${type === t ? 'bg-pw-primary text-black font-bold' : 'border-white/10'}`}>
                {t}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
          Message Content
        </label>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className='bg-pw-surface/50 border-white/10'
        />
      </div>

      <div className='flex items-center justify-between pt-2'>
        <div className='flex items-center gap-4'>
          <label className='flex items-center gap-2 text-xs font-bold cursor-pointer text-pw-muted hover:text-pw-text'>
            <input
              type='checkbox'
              checked={screenFlash}
              onChange={(e) => setScreenFlash(e.target.checked)}
              className='rounded accent-pw-primary'
            />
            Flash Screen Accessibility
          </label>
        </div>

        <Button
          onClick={handleTrigger}
          className='h-11 px-6 btn-primary font-bold gap-2'>
          <Sparkles className='h-4 w-4' />
          Trigger Live Alert Toast
        </Button>
      </div>
    </Card>
  );
}
