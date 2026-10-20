'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, FileUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';

function inferMimeType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    pdf: 'application/pdf',
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    avif: 'image/avif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    epub: 'application/epub+zip',
  };
  return extension ?
      byExtension[extension] || 'application/octet-stream'
    : 'application/octet-stream';
}

export default function ViewPage() {
  const { openFile } = useAppFileViewer();
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileType, setFileType] = useState('');
  const urlRef = useRef<string | null>(null);
  const selectedFileRef = useRef<File | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const open = (file?: File) => {
    if (!file) return;
    selectedFileRef.current = file;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const mimeType = inferMimeType(file);
    // Blob URLs do not carry the original filename. Set the detected MIME so
    // the browser's built-in PDF renderer recognizes PDFs with missing MIME.
    const viewerFile =
      file.type === mimeType ?
        file
      : new File([file], file.name, { type: mimeType });
    const url = URL.createObjectURL(viewerFile);
    urlRef.current = url;
    setFileName(file.name);
    setFileSize(file.size);
    setFileType(mimeType);
    // Keep the File as a local Blob URL. Native media and PDF viewers can read
    // it progressively without expanding a large video into a base64 string.
    openFile({ src: url, name: file.name, mimeType, size: file.size });
  };

  return (
    <main className='mx-auto flex min-h-[75dvh] w-full max-w-3xl items-center px-2 py-10'>
      <Card className='w-full border-white/10 bg-pw-surface/70 p-4 pt-6 sm:pt-12 text-center shadow-2xl sm:p-10'>
        <div className='mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-pw-primary/20 bg-pw-primary/10 text-pw-primary'>
          <FileUp className='h-7 w-7' />
        </div>
        <h1 className='text-2xl font-bold'>File viewer</h1>
        <p className='mx-auto mt-2 max-w-xl text-sm text-pw-muted'>
          Choose an image, video, audio recording, PDF, or supported document.
        </p>
        <label className='mx-auto mt-7 flex w-full max-w-[95%] cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-4 sm:p-8 transition hover:border-pw-primary/50 hover:bg-white/[0.06]'>
          <Upload className='h-6 w-6 text-pw-cyan mb-1' />
          <span className='text-sm font-semibold truncate max-w-[80%]'>
            {fileName || 'Select a file to view'}
          </span>
          <input
            type='file'
            className='sr-only'
            onChange={(event) => open(event.target.files?.[0])}
          />
        </label>
        {fileName && (
          <p className='mt-3 text-xs text-pw-muted'>
            {fileType} ·{' '}
            {(fileSize / (1024 * 1024)).toFixed(
              fileSize >= 1024 * 1024 ? 1 : 2,
            )}{' '}
            MB
          </p>
        )}
        <p className='mt-5 w-full text-center flex items-center justify-center gap-2 text-xs text-pw-muted'>
          <Info className='h-5 w-5' />
          Video, audio, and PDF files use the browser’s progressive reader.
          Large office archives may take longer to parse; the original remains
          available to download from the viewer.
        </p>
        <Button
          variant='outline'
          className='mt-6'
          disabled={!fileName}
          onClick={() => {
            if (selectedFileRef.current) open(selectedFileRef.current);
          }}>
          Open selected file
        </Button>
      </Card>
    </main>
  );
}
