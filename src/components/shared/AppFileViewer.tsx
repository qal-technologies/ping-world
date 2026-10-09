'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ChevronLeft,
  Download,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { unpackPingWorldMediaUrl } from '@/lib/quiz/quiz-piping';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type AppFileKind =
  | 'image'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'document'
  | 'unknown';

export interface AppFileDescriptor {
  src: string;
  name?: string;
  mimeType?: string;
  kind?: AppFileKind;
  size?: number;
  canEdit?: boolean;
  onEditSave?: (file: File) => void | Promise<void>;
}

interface AppFileViewerContextValue {
  openFile: (file: AppFileDescriptor) => void;
  closeFile: () => void;
}

const AppFileViewerContext = createContext<AppFileViewerContextValue | null>(
  null,
);

function classifyFile(file: AppFileDescriptor): AppFileKind {
  const mime = (file.mimeType || '').split(';')[0].trim().toLowerCase();
  let urlPath = file.src;
  try { urlPath = new URL(file.src, window.location.href).pathname; } catch { /* data/blob URL */ }
  const path = `${file.name || ''} ${urlPath} ${file.src.slice(0, 100)}`.toLowerCase();
  // MIME/extension repair stale descriptors from Supabase records; explicit
  // caller kinds remain a fallback for extensionless formats.
  const explicitKind = file.kind && file.kind !== 'unknown' ? file.kind : null;
  if (mime.startsWith('image/') || path.match(/data:image\//) || /\.(png|jpe?g|gif|webp|avif|svg|bmp|tiff?|ico|heic|heif)(?:[?#]|$)/.test(path)) return 'image';
  if (
    mime.startsWith('audio/') ||
    path.match(/data:audio\//) ||
    /\.(mp3|wav|ogg|oga|m4a|aac|flac|aiff?|wma|opus)(?:[?#]|$)/.test(path)
  )
    return 'audio';
  if (
    mime.startsWith('video/') ||
    path.match(/data:video\//) ||
    /\.(mp4|webm|mov|m4v|ogv|mkv|avi|3gp|mpeg|mpg)(?:[?#]|$)/.test(path)
  )
    return 'video';
  if (
    mime === 'application/pdf' ||
    /\.pdf(?:[?#]|$)|data:application\/pdf/.test(path)
  )
    return 'pdf';
  if (mime.startsWith('text/') || /\.(txt|csv|md)(?:[?#]|$)/.test(path))
    return 'document';
  if (
    /\.(doc|docx|odt|rtf|xls|xlsx|ppt|pptx)(?:[?#]|$)/.test(path) ||
    /wordprocessingml|msword|spreadsheetml|presentationml/.test(mime)
  )
    return 'document';
  return explicitKind || 'unknown';
}

export function useAppFileViewer() {
  const context = useContext(AppFileViewerContext);
  if (!context)
    throw new Error(
      'useAppFileViewer must be used inside AppFileViewerProvider',
    );
  return context;
}

export function AppFileViewerProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<AppFileDescriptor | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotated, setRotated] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [hideBar, setHideBar] = useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageCrop, setImageCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [cropHistory, setCropHistory] = useState<Array<typeof imageCrop>>([]);
  const cropDragRef = useRef<{ x: number; y: number; rect: DOMRect } | null>(null);
  const closeFile = useCallback(
    () =>
      setFile((current) => {
        if (current?.src.startsWith('blob:')) URL.revokeObjectURL(current.src);
        return null;
      }),
    [],
  );
  const openFile = useCallback((nextFile: AppFileDescriptor) => {
    if (!nextFile.src?.trim()) return;
    const unpacked = unpackPingWorldMediaUrl(nextFile.src.trim());
    setFile((current) => {
      if (current?.src.startsWith('blob:')) URL.revokeObjectURL(current.src);
      return {
        ...nextFile,
        name: nextFile.name || unpacked.name,
        mimeType: nextFile.mimeType || unpacked.type,
        size: nextFile?.size || unpacked?.size,
        src: unpacked.url || nextFile.src.trim(),
      };
    });
    setZoom(1);
    setRotated(false);
    setPdfPageCount(null);
    setDocumentText(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setMuted(false);
    setImageFailed(false);
    setImageCrop({ x: 0, y: 0, width: 100, height: 100 });
    setFlipX(false);
    setFlipY(false);
    setMediaLoading(true);
    setCropHistory([]);
    setHideBar(false);
  }, []);
  const kind = useMemo(() => (file ? classifyFile(file) : 'unknown'), [file]);
  useEffect(() => {
    if (!file) return;
    setMediaLoading(true);
  }, [file?.src]);
  useEffect(() => {
    if (!file || kind === 'unknown') return;
    const timer = window.setTimeout(() => setMediaLoading(false), 12_000);
    return () => window.clearTimeout(timer);
  }, [file, kind]);
  const updateCropFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const x = Math.min(100, Math.max(0, ((event.clientX - drag.rect.left) / drag.rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - drag.rect.top) / drag.rect.height) * 100));
    const startX = Math.min(100, Math.max(0, ((drag.x - drag.rect.left) / drag.rect.width) * 100));
    const startY = Math.min(100, Math.max(0, ((drag.y - drag.rect.top) / drag.rect.height) * 100));
    const next = { x: Math.min(startX, x), y: Math.min(startY, y), width: Math.max(5, Math.abs(x - startX)), height: Math.max(5, Math.abs(y - startY)) };
    setCropHistory((history) => history.length ? history : [imageCrop]);
    setImageCrop({ ...next, width: Math.min(next.width, 100 - next.x), height: Math.min(next.height, 100 - next.y) });
  };
  const saveImageEdit = useCallback(async () => {
    if (!file?.canEdit || !file.onEditSave || kind !== 'image') return;
    try {
      const response = await fetch(file.src);
      if (!response.ok) throw new Error('Could not read this image for editing.');
      const bitmap = await createImageBitmap(await response.blob());
      const sx = Math.round(bitmap.width * imageCrop.x / 100);
      const sy = Math.round(bitmap.height * imageCrop.y / 100);
      const sw = Math.max(1, Math.round(bitmap.width * imageCrop.width / 100));
      const sh = Math.max(1, Math.round(bitmap.height * imageCrop.height / 100));
      const canvas = document.createElement('canvas');
      canvas.width = rotated ? sh : sw; canvas.height = rotated ? sw : sh;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image editing is unavailable in this browser.');
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(rotated ? Math.PI / 2 : 0);
      context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      context.drawImage(bitmap, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not export the edited image.')), file.mimeType || 'image/png'));
      await file.onEditSave(new File([blob], file.name || 'edited-image.png', { type: blob.type }));
      closeFile();
    } catch (error) {
      console.error('[AppFileViewer] Image edit failed:', error);
    }
  }, [closeFile, file, flipX, flipY, imageCrop, kind, rotated]);

  const downloadFile = useCallback(async () => {
    if (!file || downloadBusy) return;
    setDownloadBusy(true);
    const filename = (file.name || `pingwrld-file.${kind === 'image' ? 'jpg' : kind === 'pdf' ? 'pdf' : 'bin'}`)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180);
    try {
      if ((file.size || 0) > 32 * 1024 * 1024) {
        const direct = document.createElement('a');
        const target = new URL(file.src, window.location.href);
        if (/supabase\.co$/i.test(target.hostname)) target.searchParams.set('download', filename);
        direct.href = target.toString(); direct.download = filename; direct.rel = 'noopener'; direct.target = '_blank';
        document.body.append(direct); direct.click(); direct.remove();
        return;
      }
      // `download` is ignored for many cross-origin Supabase URLs. Fetch to a
      // local blob URL so the browser performs an actual named download.
      const response = await fetch(file.src, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('Download request failed.');
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > 64 * 1024 * 1024) throw new Error('Use the direct download for large files.');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming download is unavailable.');
      const chunks: ArrayBuffer[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 64 * 1024 * 1024) {
          await reader.cancel();
          throw new Error('Use the direct download for large files.');
        }
        chunks.push(value.slice().buffer as ArrayBuffer);
      }
      const blob = new Blob(chunks, { type: response.headers.get('content-type') || file.mimeType || 'application/octet-stream' });
      if (!blob.size) throw new Error('The file is empty.');
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch (error) {
      // Still give the user a usable open-in-new-tab fallback if CORS forbids
      // downloading; do not silently claim that a download happened.
      console.warn('[AppFileViewer] Download fallback:', error instanceof Error ? error.message : 'request failed');
      const fallback = new URL(file.src, window.location.href);
      if (/supabase\.co$/i.test(fallback.hostname)) fallback.searchParams.set('download', filename);
      const anchor = document.createElement('a');
      anchor.href = fallback.toString();
      anchor.download = filename;
      anchor.rel = 'noopener';
      anchor.target = '_blank';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally { setDownloadBusy(false); }
  }, [downloadBusy, file, kind]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    if (classifyFile(file) === 'unknown') {
      void fetch(file.src, { method: 'HEAD', credentials: 'omit', cache: 'no-store' }).then((response) => {
        const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();
        if (!cancelled && response.ok && mimeType && mimeType !== 'application/octet-stream') {
          setFile((current) => current?.src === file.src ? { ...current, mimeType } : current);
        }
      }).catch(() => { /* type inference is optional; keep the download fallback */ });
    }
    if (
      classifyFile(file) === 'document' &&
      /\.(docx|pptx|xlsx)$/i.test(file.name || file.src)
    ) {
      void (async () => {
        try {
          const response = await fetch(file.src);
          if (!response.ok) throw new Error('Could not read this document.');
          if (
            Number(response.headers.get('content-length') || 0) >
            40 * 1024 * 1024
          )
            throw new Error('Document is too large to preview.');
          const bytes = await response.arrayBuffer();
          if (bytes.byteLength > 40 * 1024 * 1024)
            throw new Error('Document is too large to preview.');
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(bytes);
          const parse = (xml: string) =>
            new DOMParser().parseFromString(xml, 'application/xml');
          let text = '';
          if (/\.docx$/i.test(file.name || file.src)) {
            const xml = await zip.file('word/document.xml')?.async('text');
            if (!xml) throw new Error('Word document content was not found.');
            text = Array.from(parse(xml).getElementsByTagNameNS('*', 'p'))
              .map((paragraph) =>
                Array.from(paragraph.getElementsByTagNameNS('*', 't'))
                  .map((node) => node.textContent || '')
                  .join(''),
              )
              .join('\n');
          } else if (/\.pptx$/i.test(file.name || file.src)) {
            const slideFiles = Object.keys(zip.files)
              .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
              .sort(
                (a, b) =>
                  Number(a.match(/slide(\d+)/)?.[1]) -
                  Number(b.match(/slide(\d+)/)?.[1]),
              );
            const slides = await Promise.all(
              slideFiles.map(async (name) => {
                const xml = (await zip.file(name)?.async('text')) || '';
                return Array.from(parse(xml).getElementsByTagNameNS('*', 't'))
                  .map((node) => node.textContent || '')
                  .join(' ');
              }),
            );
            text = slides
              .map((slide, index) => `Slide ${index + 1}\n${slide}`)
              .join('\n\n');
          } else {
            const sharedXml = await zip
              .file('xl/sharedStrings.xml')
              ?.async('text');
            const shared =
              sharedXml ?
                Array.from(
                  parse(sharedXml).getElementsByTagNameNS('*', 'si'),
                ).map((item) =>
                  Array.from(item.getElementsByTagNameNS('*', 't'))
                    .map((node) => node.textContent || '')
                    .join(''),
                )
              : [];
            const sheetNames = Object.keys(zip.files)
              .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
              .sort(
                (a, b) =>
                  Number(a.match(/sheet(\d+)/)?.[1]) -
                  Number(b.match(/sheet(\d+)/)?.[1]),
              );
            const sheets = await Promise.all(
              sheetNames.map(async (name) => {
                const xml = (await zip.file(name)?.async('text')) || '';
                const sheet = parse(xml);
                return Array.from(sheet.getElementsByTagNameNS('*', 'row'))
                  .map((row) =>
                    Array.from(row.getElementsByTagNameNS('*', 'c'))
                      .map((cell) => {
                        const value =
                          cell.getElementsByTagNameNS('*', 'v')[0]
                            ?.textContent || '';
                        return cell.getAttribute('t') === 's' ?
                            shared[Number(value)] || ''
                          : value;
                      })
                      .join('\t'),
                  )
                  .join('\n');
              }),
            );
            text = sheets.join('\n\n');
          }
          if (!cancelled) {
            setDocumentText(
              text || 'No text content was found in this document.',
            );
            setMediaLoading(false);
          }
        } catch (error) {
          if (!cancelled) {
            setDocumentText(
              error instanceof Error ?
                error.message
              : 'Document preview is unavailable.',
            );
            setMediaLoading(false);
          }
        }
      })();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFile();
      if (event.key === '+' || event.key === '=')
        setZoom((value) => Math.min(4, value + 0.2));
      if(event.key === '-') setZoom((value) => Math.max(0.4, value - 0.2));
      if (event.key === 'Enter') {
        if (mediaRef.current?.paused) mediaRef.current?.play();
        else mediaRef.current?.pause();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [file, closeFile]);

  const contextValue = useMemo(
    () => ({ openFile, closeFile }),
    [openFile, closeFile],
  );


  return (
    <AppFileViewerContext.Provider value={contextValue}>
      {children}
      {file && (
        <AnimatePresence>
          <div
            className='fixed inset-0 z-[100] flex flex-col bg-slate-950/95 text-white backdrop-blur-2xl'
            role='dialog'
            aria-modal='true'
            aria-label={file.name || 'File viewer'}>
            <header className='flex min-h-14 items-center gap-3 flex-wrap border-b border-white/10 bg-white/[0.045] px-3 py-2 pt-3 shadow-lg shadow-black/20 backdrop-blur-xl sm:px-5 relative'>
              <button
                type='button'
                onClick={closeFile}
                aria-label='Close viewer'
                className='rounded-full p-2 bg-white/5 hover:bg-white/10 absolute left-1 top-2'>
                <ChevronLeft size={19} />
              </button>

              <div className='min-w-15 flex-1 ml-8'>
                <p className='truncate text-sm font-semibold'>
                  {file.name || 'File preview'}
                </p>
                <p className='text-[10px] uppercase tracking-wider text-white/50'>
                  {kind} {' '} {file?.size ? `(${formatFileSize(file.size)})` : ''}
                </p>
              </div>

              <div className='flex gap-3 flex-wrap items-center'>
              {(kind === 'image' || kind === 'pdf') && (
                <>
                  <button
                    type='button'
                    aria-label='Zoom out'
                    onClick={() =>
                      setZoom((value) => Math.max(0.4, value - 0.2))
                    }
                    className='rounded-lg p-2 hover:bg-white/10'>
                    <Minus size={17} />
                  </button>
                  <span className='min-w-12 text-center text-xs tabular-nums'>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type='button'
                    aria-label='Zoom in'
                    onClick={() => setZoom((value) => Math.min(4, value + 0.2))}
                    className='rounded-lg p-2 hover:bg-white/10'>
                    <Plus size={17} />
                  </button>
                </>
              )}
              {kind === 'pdf' && (
                <span className='hidden text-xs text-white/60 sm:inline'>
                  {pdfPageCount ? `${pdfPageCount} pages` : 'PDF'}
                </span>
              )}
              {kind === 'image' && (
                <button
                  type='button'
                  aria-label='Rotate image'
                  onClick={() => setRotated((value) => !value)}
                  className='rounded-lg p-2 hover:bg-white/10'>
                  <RotateCcw size={17} />
                </button>
              )}
              {kind === 'image' && file.canEdit && (
                <>
                  <button type='button' onClick={() => { const previous = cropHistory.at(-1); if (previous) setImageCrop(previous); setCropHistory((history) => history.slice(0, -1)); }} disabled={!cropHistory.length} className='rounded-lg p-2 hover:bg-white/10 disabled:opacity-40' title='Undo crop'>Undo</button>
                  <button type='button' onClick={() => setFlipX((value) => !value)} className='rounded-lg p-2 hover:bg-white/10' title='Flip horizontal'>⇋</button>
                  <button type='button' onClick={() => setFlipY((value) => !value)} className='rounded-lg p-2 hover:bg-white/10' title='Flip vertical'>⇅</button>
                  <button type='button' onClick={() => setImageCrop({ x: 0, y: 0, width: 100, height: 100 })} className='rounded-lg p-2 hover:bg-white/10' title='Reset crop'>Reset crop</button>
                  <button type='button' onClick={() => void saveImageEdit()} className='rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-black'>Save edit</button>
                </>
              )}
              <button type='button' onClick={() => void downloadFile()} disabled={downloadBusy}
                aria-label={downloadBusy ? 'Downloading file' : 'Download file'}
                className='rounded-lg p-2 hover:bg-white/10 disabled:opacity-50'>
                <Download size={17} />
              </button>
              <button
                type='button'
                onClick={closeFile}
                aria-label='Close viewer'
                className='rounded-lg p-2 hover:bg-white/10'>
                <X size={19} />
              </button>
              </div>
            </header>
            <main className='flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.07),transparent_55%)] p-2 sm:p-5 relative'>
              {mediaLoading && <div className={cn('absolute z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/85', kind === 'video' ? 'inset-x-0 top-1/2 mx-auto aspect-video w-full max-w-6xl -translate-y-1/2' : kind === 'image' ? 'inset-0' : 'inset-0')}><span className='text-3xl'>{kind === 'image' ? '▧' : kind === 'video' ? '▶' : kind === 'audio' ? '♫' : kind === 'pdf' ? '▤' : kind === 'document' ? '▣' : '…'}</span><div className='h-7 w-7 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300' /><span className='text-xs text-white/65'>Loading {kind}…</span></div>}
              {kind === 'image' && !imageFailed && (
                <div className='relative inline-flex max-h-full max-w-full' onPointerDown={file.canEdit ? (event) => { if ((event.target as HTMLElement).closest('input,button')) return; event.currentTarget.setPointerCapture(event.pointerId); cropDragRef.current = { x: event.clientX, y: event.clientY, rect: event.currentTarget.getBoundingClientRect() }; setCropHistory((history) => [...history, imageCrop]); } : undefined} onPointerMove={file.canEdit ? updateCropFromPointer : undefined} onPointerUp={() => { cropDragRef.current = null; }}>
                  <Image unoptimized width={1600} height={1200} src={file.src} alt={file.name || 'Preview'} onLoad={() => setMediaLoading(false)}
                    onError={() => setImageFailed(true)}
                    className='max-h-[calc(100vh-10rem)] max-w-[calc(100vw-2rem)] object-contain transition-transform duration-150'
                    style={{ width: 'auto', height: 'auto', clipPath: `inset(${imageCrop.y}% ${100 - imageCrop.x - imageCrop.width}% ${100 - imageCrop.y - imageCrop.height}% ${imageCrop.x}%)`, transform: `scale(${zoom}) rotate(${rotated ? 90 : 0}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})` }} />
                  {file.canEdit && <div className='absolute inset-0 pointer-events-none touch-none'><div className='absolute border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]' style={{ left: `${imageCrop.x}%`, top: `${imageCrop.y}%`, width: `${imageCrop.width}%`, height: `${imageCrop.height}%` }} /></div>}
                </div>
              )}
              {kind === 'image' && file.canEdit && (
                <div className='absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/90 p-3 text-xs sm:grid-cols-4'>
                  {(['x', 'y', 'width', 'height'] as const).map((key) => <label key={key} className='flex items-center gap-2 capitalize'>{key}<input aria-label={`Crop ${key}`} type='range' min={key === 'width' || key === 'height' ? 10 : 0} max={100} value={imageCrop[key]} onChange={(event) => setImageCrop((current) => ({ ...current, [key]: Number(event.target.value), ...(key === 'x' ? { width: Math.min(current.width, 100 - Number(event.target.value)) } : {}), ...(key === 'y' ? { height: Math.min(current.height, 100 - Number(event.target.value)) } : {}) }))} className='w-full accent-cyan-300' /></label>)}
                  </div>
              )}
              {kind === 'image' && imageFailed && <div className='max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center'><h2 className='mb-2 font-semibold'>Image preview unavailable</h2><p className='mb-4 text-sm text-white/65'>The image URL may have expired or the object is not accessible. Try downloading it or reopen the file.</p><button type='button' onClick={() => void downloadFile()} className='rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black'>Download image</button></div>}
              {(kind === 'audio' || kind === 'video') && (
                <div
                  className={`relative flex max-h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 bkblur shadow-2xl shadow-pw-cyan/20 ${kind === 'audio' ? 'max-w-3xl p-4 sm:p-6' : 'max-w-6xl'}`}>
                  {kind === 'audio' && (
                    <div className='flex flex-col justify-center gap-2'>
                      <div className='flex items-center gap-1 justify-between w-full'>
                        <div className='flex items-center gap-4'>
                          <div
                            className={cn(
                              'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 z-50',
                              playing && 'animate-pulse',
                            )}
                            onClick={() => {
                              const media = mediaRef.current;
                              if (!media) return;
                              if (media.paused)
                                void media.play().catch(() => {});
                              else media.pause();
                            }}>
                            <Volume2 size={28} />
                          </div>
                          <div className='min-w-0'>
                            <p className='truncate text-base font-semibold'>
                              {file.name || 'Audio track'}
                            </p>
                            <p className='mt-1 text-xs text-white/45'>
                              Audio player
                            </p>
                          </div>
                        </div>

                        <div className='flex flex-col gap-1 items-center self-end'>
                          <button
                            type='button'
                            aria-label={playing ? 'Pause' : 'Play'}
                            onClick={() => {
                              const media = mediaRef.current;
                              if (!media) return;
                              if (media.paused)
                                void media.play().catch(() => {});
                              else media.pause();
                            }}
                            className='rounded-xl transition-all text-pw-cyan/90 hover:fill-pw-cyan z-50'>
                            {playing ?
                              <Pause size={17} />
                            : <Play size={17} />}
                          </button>
                          <span className='min-w-20 text-xs tabular-nums text-white/65'>
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>
                      </div>

                      <div
                        className={cn(
                          'absolute left-[-20px] gradient-brand w-25 h-25 blur-lg opacity-60 rounded-full z-10',
                          playing && 'animate-pulse',
                        )}
                      />
                      <input
                        aria-label='Seek media'
                        type='range'
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={Math.min(currentTime, duration || 0)}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (mediaRef.current)
                            mediaRef.current.currentTime = next;
                          setCurrentTime(next);
                        }}
                        className='h-0.5 min-w-[100%] mt-2 cursor-pointer bg-white/50 accent-pw-cyan hover:h-2 border-none rounded-full no-outline appearance-none'
                      />
                    </div>
                  )}
                  {kind === 'video' && (
                    <video
                      ref={(element) => {
                        mediaRef.current = element;
                      }}
                      className='max-h-[calc(100vh-10rem)] w-full bg-black object-contain'
                      src={file.src}
                      playsInline
                      preload='metadata'
                      onLoadStart={() => setMediaLoading(true)}
                      onCanPlay={() => setMediaLoading(false)}
                      onClick={() => {
                        if (mediaRef.current?.paused) {
                          mediaRef.current?.play();
                        }
                        setHideBar(!hideBar);
                      }}
                      onTimeUpdate={(event) =>
                        setCurrentTime(event.currentTarget.currentTime)
                      }
                      onLoadedMetadata={(event) =>
                        (setDuration(event.currentTarget.duration || 0), setMediaLoading(false))
                      }
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                    />
                  )}
                  {kind === 'audio' && (
                    <audio
                      ref={(element) => {
                        mediaRef.current = element;
                      }}
                      className='hidden'
                      src={file.src}
                      preload='metadata'
                      onTimeUpdate={(event) =>
                        setCurrentTime(event.currentTarget.currentTime)
                      }
                      onLoadedMetadata={(event) =>
                        setDuration(event.currentTarget.duration || 0)
                      }
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                    />
                  )}

                  {kind === 'video' &&
                    (!hideBar || !playing) && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          exit={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className='absolute top-0 w-full min-w-[100%] h-9 flex items-center justify-center p-1'>
                          <div
                            style={{ textShadow: '0px 1px 10px gray' }}
                            className='w-fit max-w-[90%] flex gap-1 m-1 rounded-full shadow-md text-center text-white bg-slate-950/60 bkblur text-sm p-1 px-3'>
                            <p className='max-w-full truncate'>{file.name}</p>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          exit={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className='absolute bottom-0 w-full max-w-[100%] flex items-center justify-center'>
                          <div
                            className={`m-1 transition-all bg-slate-950/60 p-1 px-2.5 shadow-sm rounded-2xl sm:px-5 bkblur w-full max-w-[600px] space-y-3 border border-black/5`}>
                            <input
                              aria-label='Seek media'
                              type='range'
                              min={0}
                              max={duration || 0}
                              step={0.1}
                              value={Math.min(currentTime, duration || 0)}
                              onChange={(event) => {
                                const next = Number(event.target.value);
                                if (mediaRef.current)
                                  mediaRef.current.currentTime = next;
                                setCurrentTime(next);
                              }}
                              className='h-0.5 w-full cursor-pointer bg-white/40 accent-pw-cyan hover:h-2 border-none rounded-full no-outline appearance-none'
                            />
                            <div className='flex items-center gap-3'>
                              <button
                                type='button'
                                aria-label={playing ? 'Pause' : 'Play'}
                                onClick={() => {
                                  const media = mediaRef.current;
                                  if (!media) return;
                                  if (media.paused)
                                    void media.play().catch(() => {});
                                  else media.pause();
                                }}
                                className='rounded-xl transition-all text-pw-cyan/90 hover:fill-pw-cyan'>
                                {playing ?
                                  <Pause size={17} />
                                : <Play size={17} />}
                              </button>
                              <span className='min-w-20 text-xs tabular-nums text-white/80'>
                                {formatTime(currentTime)} /{' '}
                                {formatTime(duration)}
                              </span>

                              <span className='flex-1' />
                              {kind === 'video' && (
                                <div className='flex gap-1 items-center'>
                                  <button
                                    type='button'
                                    aria-label={muted ? 'Unmute' : 'Mute'}
                                    onClick={() => {
                                      if (mediaRef.current)
                                        mediaRef.current.muted = !muted;
                                      setMuted((value) => !value);
                                    }}
                                    className='rounded-lg p-2 text-white/70 hover:bg-white/10'>
                                    {muted ?
                                      <VolumeX size={17} />
                                    : <Volume2 size={17} />}
                                  </button>

                                  <input
                                    aria-label='Volume'
                                    type='range'
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    defaultValue={1}
                                    onChange={(event) => {
                                      if (mediaRef.current)
                                        mediaRef.current.volume = Number(
                                          event.target.value,
                                        );
                                    }}
                                    className='w-24 mr-1 h-0.5 w-full cursor-pointer bg-white/50 accent-pw-cyan hover:h-2 border-none rounded-full no-outline appearance-none'
                                  />

                                  <button
                                    type='button'
                                    aria-label='Full screen'
                                    onClick={() => {
                                      const player = mediaRef.current as
                                        | (HTMLVideoElement & {
                                            requestFullscreen?: () => Promise<void>;
                                          })
                                        | null;
                                      void player?.requestFullscreen?.();
                                    }}
                                    className='rounded-lg p-2 text-white/70 hover:bg-white/10'>
                                    <Maximize2 size={17} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </>
                    )}
                </div>
              )}
              {kind === 'pdf' && (
                <iframe
                  title={file.name || 'PDF document'}
                  src={file.src}
                  className='h-full w-full bg-white'
                  onLoad={() => setMediaLoading(false)}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    width: `${100 / zoom}%`,
                    height: `${100 / zoom}%`,
                  }}
                />
              )}
              {kind === 'document' &&
                (/\.(docx|pptx|xlsx)$/i.test(file.name || file.src) ?
                  <pre className='h-full w-full overflow-auto whitespace-pre-wrap bg-white p-6 text-sm leading-relaxed text-slate-900'>
                    {documentText ?? 'Reading document…'}
                  </pre>
                : (
                  file.mimeType?.startsWith('text/') ||
                  /\.(txt|csv|md)(?:[?#]|$)/i.test(file.name || file.src)
                ) ?
                  <iframe
                  title={file.name || 'Text document'}
                  src={file.src}
                  onLoad={() => setMediaLoading(false)}
                    sandbox=''
                    className='h-full w-full bg-white'
                  />
                : <div className='max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center'>
                    <Maximize2 className='mx-auto mb-3 text-cyan-300' />
                    <h2 className='mb-2 font-semibold'>Document preview</h2>
                    <p className='mb-4 text-sm text-white/65 px-1'>
                      This file type cannot be rendered safely in the browser.
                      Download it to open in a compatible app.
                    </p>
                    <button type='button' onClick={() => void downloadFile()} className='inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black'>
                      Download document
                    </button>
                  </div>)}
              {kind === 'unknown' && (
                <div className='max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center'>
                  <Maximize2 className='mx-auto mb-3 text-cyan-300' />
                  <h2 className='mb-2 font-semibold'>Preview unavailable</h2>
                  <p className='mb-4 text-sm text-white/65 px-1'>
                    This file type is not supported for in-browser preview.
                  </p>
                  <button type='button' onClick={() => void downloadFile()} className='inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black'>
                    Download file
                  </button>
                </div>
              )}
            </main>
            <footer className='border-t border-white/10 px-4 py-2 text-center text-[10px] text-white/45'>
              Press Esc to close · Your file stays on this device unless its
              source was already remote
            </footer>
          </div>
        </AnimatePresence>
      )}
    </AppFileViewerContext.Provider>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  return `${Math.floor(value / 60)}:${Math.floor(value % 60)
    .toString()
    .padStart(2, '0')}`;
}

function formatFileSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
