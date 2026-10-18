'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, FileUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';

export default function ViewPage() {
  const { openFile } = useAppFileViewer();
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const open = (file?: File) => {
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setFileName(file.name);
    setError('');
    openFile({ src: url, name: file.name, mimeType: file.type || undefined, size: file.size });
  };

  return (
    <main className='mx-auto flex min-h-[75dvh] w-full max-w-3xl items-center px-4 py-10'>
      <Card className='w-full border-white/10 bg-pw-surface/70 p-6 text-center shadow-2xl sm:p-10'>
        <div className='mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-pw-primary/20 bg-pw-primary/10 text-pw-primary'><FileUp className='h-7 w-7' /></div>
        <h1 className='text-2xl font-bold'>File viewer</h1>
        <p className='mx-auto mt-2 max-w-xl text-sm text-pw-muted'>Choose an image, video, audio recording, PDF, or supported document to preview it with PingWorld controls.</p>
        <label className='mx-auto mt-7 flex max-w-xl cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-8 transition hover:border-pw-primary/50 hover:bg-white/[0.06]'>
          <Upload className='h-6 w-6 text-pw-cyan' />
          <span className='text-sm font-semibold'>{fileName || 'Select a file to view'}</span>
          <span className='text-xs text-pw-muted'>Your selected file opens locally in the viewer.</span>
          <input type='file' className='sr-only' onChange={(event) => open(event.target.files?.[0])} />
        </label>
        {error && <p role='alert' className='mt-4 text-sm text-pw-danger'>{error}</p>}
        <p className='mt-5 flex items-center justify-center gap-2 text-xs text-pw-muted'><Info className='h-3.5 w-3.5' />Very large files may take longer to open. Some office formats need a compatible browser preview.</p>
        <Button variant='outline' className='mt-6' disabled={!fileName} onClick={() => { if (urlRef.current) openFile({ src: urlRef.current, name: fileName }); }}>Open selected file</Button>
      </Card>
    </main>
  );
}
