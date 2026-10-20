'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';

type PreviewState = { progress: number | null; error: string | null };

async function fetchFile(
  src: string,
  signal: AbortSignal,
  onProgress: (progress: number | null) => void,
): Promise<Blob> {
  const response = await fetch(src, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error(`Could not load this file (${response.status}).`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body) return new Blob([await response.arrayBuffer()]);

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let loaded = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
        loaded += value.byteLength;
        onProgress(total ? Math.min(99, Math.round((loaded / total) * 100)) : null);
      }
    }
  } finally {
    reader.releaseLock();
  }
  onProgress(100);
  return new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
}

function Loading({ progress, label }: { progress: number | null; label: string }) {
  return (
    <div className='flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-slate-500' role='status' aria-live='polite'>
      <LoaderCircle className='h-8 w-8 animate-spin text-cyan-500' />
      <p className='text-sm font-medium'>{label}{progress !== null ? ` · ${progress}%` : ''}</p>
      {progress !== null && <div className='h-1.5 w-48 overflow-hidden rounded-full bg-slate-200'><div className='h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-[width]' style={{ width: `${progress}%` }} /></div>}
    </div>
  );
}

function PreviewError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className='flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center'>
      <AlertTriangle className='h-8 w-8 text-amber-500' />
      <p className='max-w-lg text-sm text-slate-600'>{message}</p>
      <button type='button' onClick={retry} className='inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50'><RefreshCw className='h-4 w-4' />Try again</button>
    </div>
  );
}

export function DocxPreview({ src, name, onLoaded }: { src: string; name?: string; onLoaded?: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PreviewState>({ progress: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const body = bodyRef.current;
    const styles = stylesRef.current;
    if (!body || !styles) return () => controller.abort();
    body.replaceChildren();
    styles.replaceChildren();
    void (async () => {
      try {
        setState({ progress: null, error: null });
        const blob = await fetchFile(src, controller.signal, (progress) => active && setState({ progress, error: null }));
        if (!active) return;
        const { renderAsync } = await import('docx-preview');
        await renderAsync(blob, body, styles, { className: 'pw-docx', inWrapper: true, breakPages: true, renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true });
        if (active) { setState({ progress: 100, error: null }); onLoaded?.(); }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          body.replaceChildren();
          styles.replaceChildren();
          setState({ progress: null, error: error instanceof Error ? error.message : 'This Word document could not be rendered.' });
          onLoaded?.();
        }
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [src, attempt, onLoaded]);

  return <div className='h-full w-full overflow-auto bg-slate-100 p-2 sm:p-6' aria-label={name || 'Word document preview'}>
    {state.error ? <PreviewError message={state.error} retry={() => setAttempt((value) => value + 1)} /> : state.progress !== 100 ? <Loading progress={state.progress} label='Loading Word document' /> : null}
    <div ref={stylesRef} />
    <div ref={bodyRef} className='mx-auto max-w-5xl' />
  </div>;
}

export function PptxPreview({ src, name, onLoaded }: { src: string; name?: string; onLoaded?: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PreviewState>({ progress: null, error: null });
  const [slides, setSlides] = useState<Array<{ url: string; index: number }>>([]);
  const slideUrls = useRef<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    for (const url of slideUrls.current) URL.revokeObjectURL(url);
    slideUrls.current = [];
    void (async () => {
      try {
        setState({ progress: null, error: null });
        const blob = await fetchFile(src, controller.signal, (progress) => active && setState({ progress, error: null }));
        if (!active) return;
        const [{ loadPresentation, getSlides }, { renderSlideToSvg, defaultMeasurer }] = await Promise.all([
          import('@office-kit/pptx'), import('@office-kit/pptx-preview'),
        ]);
        const presentation = await loadPresentation(blob);
        const slideData = getSlides(presentation);
        if (!slideData.length) throw new Error('No slides were found in this presentation.');
        const rendered: Array<{ url: string; index: number }> = [];
        for (let index = 0; index < slideData.length; index++) {
          if (!active) return;
          const svg = renderSlideToSvg(presentation, slideData[index], { textLayout: 'svg', measureText: defaultMeasurer });
          const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
          slideUrls.current.push(url);
          rendered.push({ url, index });
          setState({ progress: Math.min(99, Math.round(((index + 1) / slideData.length) * 100)), error: null });
        }
        if (active) {
          setSlides(rendered);
          setState({ progress: 100, error: null });
          onLoaded?.();
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          for (const url of slideUrls.current) URL.revokeObjectURL(url);
          slideUrls.current = [];
          setSlides([]);
          setState({ progress: null, error: error instanceof Error ? error.message : 'This presentation could not be rendered.' });
          onLoaded?.();
        }
      }
    })();
    return () => { active = false; controller.abort(); for (const url of slideUrls.current) URL.revokeObjectURL(url); slideUrls.current = []; };
  }, [src, attempt, onLoaded]);

  return <div className='h-full w-full overflow-auto bg-slate-900 p-3 sm:p-6' aria-label={name || 'Presentation preview'}>
    {state.error ? <PreviewError message={state.error} retry={() => setAttempt((value) => value + 1)} /> : state.progress !== 100 ? <Loading progress={state.progress} label='Loading presentation' /> : null}
    {slides.length > 0 && <div className='mx-auto flex max-w-6xl flex-col gap-6'>
      {slides.map(({ url, index }) => <figure key={`${src}-${index}`} className='overflow-hidden rounded-lg bg-white shadow-2xl'>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG object URLs need native img rendering. */}
        <img src={url} alt={`${name || 'Presentation'} — slide ${index + 1}`} className='block h-auto w-full' />
        <figcaption className='bg-slate-800 px-3 py-2 text-right text-xs text-slate-300'>Slide {index + 1} of {slides.length}</figcaption>
      </figure>)}
    </div>}
  </div>;
}
