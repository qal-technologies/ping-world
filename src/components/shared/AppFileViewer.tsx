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
  FileTextIcon,
  Folder,
  ImageIcon,
  Maximize2,
  Minus,
  MusicIcon,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Settings2,
  VideoIcon,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { unpackPingWorldMediaUrl } from '@/lib/quiz/quiz-piping';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  hasPingWorldAttribution,
  PINGWORLD_ATTRIBUTION_TEXT,
  tagImageBlob,
} from '@/lib/pingworld-attribution';
import { openRangeZip } from '@/lib/range-zip-reader';
import { ThemedSlider } from '@/components/ui/themed-slider';
import { DocxPreview, PptxPreview } from '@/components/shared/OfficeFilePreview';

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
  canDownload?: boolean;
  onEditSave?: (file: File) => void | Promise<void>;
}

type PresentationItem = {
  kind: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  text?: string;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  imageSrc?: string;
};
type PresentationSlide = { items: PresentationItem[]; background: string };
type EpubChapter = { title: string; html: string; assetUrls: string[] };

interface AppFileViewerContextValue {
  openFile: (file: AppFileDescriptor) => void;
  closeFile: () => void;
}

const AppFileViewerContext = createContext<AppFileViewerContextValue | null>(
  null,
);

type OfficeDocumentFormat = 'docx' | 'pptx' | 'xlsx' | 'epub';

function getOfficeDocumentFormat(file: AppFileDescriptor): OfficeDocumentFormat | null {
  const mime = (file.mimeType || '').split(';')[0].trim().toLowerCase();
  let path = file.name || '';
  try {
    path += ` ${new URL(file.src, window.location.href).pathname}`;
  } catch {
    path += ` ${file.src}`;
  }
  const extension = path.toLowerCase().match(/\.(docx|pptx|xlsx|epub)(?:$|\s)/)?.[1];
  if (extension) return extension as OfficeDocumentFormat;
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'pptx';
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  if (mime === 'application/epub+zip') return 'epub';
  return null;
}

function classifyFile(file: AppFileDescriptor): AppFileKind {
  const mime = (file.mimeType || '').split(';')[0].trim().toLowerCase();
  let urlPath = file.src;
  try {
    urlPath = new URL(file.src, window.location.href).pathname;
  } catch {
    /* data/blob URL */
  }
  const path =
    `${file.name || ''} ${urlPath} ${file.src.slice(0, 100)}`.toLowerCase();
  // MIME/extension repair stale descriptors from Supabase records; explicit
  // caller kinds remain a fallback for extensionless formats.
  const explicitKind = file.kind && file.kind !== 'unknown' ? file.kind : null;
  if (
    mime.startsWith('image/') ||
    path.match(/data:image\//) ||
    /\.(png|jpe?g|gif|webp|avif|svg|bmp|tiff?|ico|heic|heif)(?:[?#]|$)/.test(
      path,
    )
  )
    return 'image';
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
    /\.(doc|odt|rtf|xls|ppt)(?:[?#]|$)/.test(path) ||
    getOfficeDocumentFormat(file) ||
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
  const [presentationSlides, setPresentationSlides] = useState<
    PresentationSlide[]
  >([]);
  const [epubChapters, setEpubChapters] = useState<EpubChapter[]>([]);
  const [activeEpubChapter, setActiveEpubChapter] = useState(0);
  const [presentationSize, setPresentationSize] = useState({
    width: 9144000,
    height: 5143500,
  });
  const [hideBar, setHideBar] = useState(false);
  const [viewerSettingsOpen, setViewerSettingsOpen] = useState(false);
  const [externalOfficePreview, setExternalOfficePreview] = useState(false);
  const [viewerSettingsInitialized, setViewerSettingsInitialized] =
    useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [seekSeconds, setSeekSeconds] = useState(10);
  const [preferredOrientation, setPreferredOrientation] = useState<
    'auto' | 'portrait' | 'landscape'
  >('auto');
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const documentScrollRef = useRef<HTMLElement | null>(null);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const viewerHistoryMarkerRef = useRef<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [attributionState, setAttributionState] = useState({
    src: '',
    tagged: false,
  });
  const hasAttribution =
    attributionState.src === file?.src && attributionState.tagged;
  const [imageCrop, setImageCrop] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaBuffering, setMediaBuffering] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [cropHistory, setCropHistory] = useState<Array<typeof imageCrop>>([]);
  const [editHistory, setEditHistory] = useState<
    Array<{
      crop: typeof imageCrop;
      rotated: boolean;
      flipX: boolean;
      flipY: boolean;
    }>
  >([]);
  const cropDragRef = useRef<{
    corner: string;
    start: typeof imageCrop;
    rect: DOMRect;
  } | null>(null);
  const closeFile = useCallback(() => {
    const marker = viewerHistoryMarkerRef.current;
    if (marker && window.history.state?.appFileViewer === marker) {
      // The viewer adds a same-URL entry so a hardware/browser Back gesture
      // dismisses the overlay instead of leaving the underlying page.
      window.history.back();
      return;
    }
    viewerHistoryMarkerRef.current = null;
    setFile((current) => {
      if (current?.src.startsWith('blob:')) URL.revokeObjectURL(current.src);
      return null;
    });
  }, []);
  const openFile = useCallback((nextFile: AppFileDescriptor) => {
    if (!nextFile.src?.trim()) return;
    const unpacked = unpackPingWorldMediaUrl(nextFile.src.trim());
    const resolvedSrc = unpacked.url || nextFile.src.trim();
    setFile((current) => {
      if (current?.src.startsWith('blob:') && current.src !== resolvedSrc)
        URL.revokeObjectURL(current.src);
      return {
        ...nextFile,
        name: nextFile.name || unpacked.name,
        mimeType: nextFile.mimeType || unpacked.type,
        size: nextFile?.size || unpacked?.size,
        src: resolvedSrc,
      };
    });
    setZoom(1);
    setRotated(false);
    setPdfPageCount(null);
    setDocumentText(null);
    setPresentationSlides([]);
    setEpubChapters([]);
    setActiveEpubChapter(0);
    setPresentationSize({ width: 9144000, height: 5143500 });
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setMuted(false);
    setImageFailed(false);
    setImageCrop({ x: 0, y: 0, width: 100, height: 100 });
    setFlipX(false);
    setFlipY(false);
    setMediaLoading(true);
    setMediaBuffering(false);
    setMediaError(false);
    setBufferedPercent(0);
    setCropHistory([]);
    setEditHistory([]);
    setHideBar(false);
    setViewerSettingsOpen(false);
    setExternalOfficePreview(false);
  }, []);
  const kind = useMemo(() => (file ? classifyFile(file) : 'unknown'), [file]);
  const officeFormat = useMemo(() => (file ? getOfficeDocumentFormat(file) : null), [file]);
  const isFileOpen = file !== null;
  const markMediaLoaded = useCallback(() => setMediaLoading(false), []);
  useEffect(() => {
    if (!isFileOpen || viewerHistoryMarkerRef.current) return;
    const marker = `pw-file-viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    viewerHistoryMarkerRef.current = marker;
    window.history.pushState(
      { ...(window.history.state || {}), appFileViewer: marker },
      '',
      window.location.href,
    );
    const onPopState = () => {
      viewerHistoryMarkerRef.current = null;
      setFile((current) => {
        if (current?.src.startsWith('blob:')) URL.revokeObjectURL(current.src);
        return null;
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isFileOpen]);
  useEffect(
    () => () => {
      for (const imageUrl of presentationSlides.flatMap((slide) =>
        slide.items
          .map((item) => item.imageSrc)
          .filter((value): value is string => Boolean(value)),
      )) {
        if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
      }
    },
    [presentationSlides],
  );
  useEffect(
    () => () => {
      for (const url of epubChapters.flatMap((chapter) => chapter.assetUrls))
        URL.revokeObjectURL(url);
    },
    [epubChapters],
  );
  const toggleViewerSettings = () => {
    if (!viewerSettingsOpen && !viewerSettingsInitialized) {
      try {
        const saved = JSON.parse(
          localStorage.getItem('pw_file_viewer_settings_v1') || '{}',
        );
        if ([0.5, 0.75, 1, 1.25, 1.5, 2].includes(saved.playbackRate))
          setPlaybackRate(saved.playbackRate);
        if ([5, 10, 15, 30].includes(saved.seekSeconds))
          setSeekSeconds(saved.seekSeconds);
        if (['auto', 'portrait', 'landscape'].includes(saved.orientation))
          setPreferredOrientation(saved.orientation);
      } catch {
        /* Use viewer defaults when settings are unavailable. */
      }
      setViewerSettingsInitialized(true);
    }
    setViewerSettingsOpen((open) => !open);
  };
  useEffect(() => {
    if (!viewerSettingsInitialized) return;
    try {
      localStorage.setItem(
        'pw_file_viewer_settings_v1',
        JSON.stringify({
          playbackRate,
          seekSeconds,
          orientation: preferredOrientation,
        }),
      );
    } catch {
      /* Preferences are optional. */
    }
    if (mediaRef.current) mediaRef.current.playbackRate = playbackRate;
  }, [
    playbackRate,
    seekSeconds,
    preferredOrientation,
    viewerSettingsInitialized,
  ]);
  const handleViewerDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('[aria-label="Viewer settings"]'))
      return;
    if (kind === 'video' || kind === 'audio') {
      const media = mediaRef.current;
      if (!media) return;
      const backwards = event.clientX < window.innerWidth / 2;
      const next = Math.max(
        0,
        Math.min(
          media.duration || duration,
          media.currentTime + (backwards ? -seekSeconds : seekSeconds),
        ),
      );
      media.currentTime = next;
      setCurrentTime(next);
      event.preventDefault();
      return;
    }
    if (kind === 'document' && documentScrollRef.current) {
      const backwards = event.clientX < window.innerWidth / 2;
      documentScrollRef.current.scrollBy({
        top:
          (backwards ? -1 : 1) *
          Math.max(240, documentScrollRef.current.clientHeight * 0.85),
        behavior: 'smooth',
      });
      event.preventDefault();
    }
  };
  const updateCropFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const x = Math.min(
      100,
      Math.max(0, ((event.clientX - drag.rect.left) / drag.rect.width) * 100),
    );
    const y = Math.min(
      100,
      Math.max(0, ((event.clientY - drag.rect.top) / drag.rect.height) * 100),
    );
    const start = drag.start;
    const left = drag.corner.includes('w');
    const top = drag.corner.includes('n');
    const x1 = left ? Math.min(x, start.x + start.width - 5) : start.x;
    const x2 = left ? start.x + start.width : Math.max(x, start.x + 5);
    const y1 = top ? Math.min(y, start.y + start.height - 5) : start.y;
    const y2 = top ? start.y + start.height : Math.max(y, start.y + 5);
    setImageCrop({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
  };
  const saveImageEdit = useCallback(async () => {
    if (!file?.canEdit || !file.onEditSave || kind !== 'image') return;
    try {
      const response = await fetch(file.src);
      if (!response.ok)
        throw new Error('Could not read this image for editing.');
      const bitmap = await createImageBitmap(await response.blob());
      const sx = Math.round((bitmap.width * imageCrop.x) / 100);
      const sy = Math.round((bitmap.height * imageCrop.y) / 100);
      const sw = Math.max(
        1,
        Math.round((bitmap.width * imageCrop.width) / 100),
      );
      const sh = Math.max(
        1,
        Math.round((bitmap.height * imageCrop.height) / 100),
      );
      const canvas = document.createElement('canvas');
      canvas.width = rotated ? sh : sw;
      canvas.height = rotated ? sw : sh;
      const context = canvas.getContext('2d');
      if (!context)
        throw new Error('Image editing is unavailable in this browser.');
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(rotated ? Math.PI / 2 : 0);
      context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      context.drawImage(bitmap, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value ?
              resolve(value)
            : reject(new Error('Could not export the edited image.')),
          file.mimeType || 'image/png',
        ),
      );
      // Tagging is best-effort: metadata writing must not prevent an otherwise
      // valid edited image from being saved.
      let attributedBlob = blob;
      try {
        attributedBlob = await tagImageBlob(blob);
      } catch (tagError) {
        console.warn('[AppFileViewer] Could not tag edited image:', tagError);
      }
      await file.onEditSave(
        new File([attributedBlob], file.name || 'edited-image.png', {
          type: attributedBlob.type,
        }),
      );
      closeFile();
    } catch (error) {
      console.error('[AppFileViewer] Image edit failed:', error);
    }
  }, [closeFile, file, flipX, flipY, imageCrop, kind, rotated]);

  const downloadFile = useCallback(async () => {
    if (!file || downloadBusy) return;
    setDownloadBusy(true);
    const filename = (
      file.name ||
      `pingwrld-file.${
        kind === 'image' ? 'jpg'
        : kind === 'pdf' ? 'pdf'
        : 'bin'
      }`
    )
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .slice(0, 180);
    try {
      if ((file.size || 0) > 32 * 1024 * 1024) {
        const direct = document.createElement('a');
        const target = new URL(file.src, window.location.href);
        if (/supabase\.co$/i.test(target.hostname))
          target.searchParams.set('download', filename);
        direct.href = target.toString();
        direct.download = filename;
        direct.rel = 'noopener';
        direct.target = '_blank';
        document.body.append(direct);
        direct.click();
        direct.remove();
        return;
      }
      // `download` is ignored for many cross-origin Supabase URLs. Fetch to a
      // local blob URL so the browser performs an actual named download.
      const response = await fetch(file.src, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Download request failed.');
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > 64 * 1024 * 1024)
        throw new Error('Use the direct download for large files.');
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
      let blob = new Blob(chunks, {
        type:
          response.headers.get('content-type') ||
          file.mimeType ||
          'application/octet-stream',
      });
      if (!blob.size) throw new Error('The file is empty.');
      if (kind === 'image') blob = await tagImageBlob(blob);
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
      console.warn(
        '[AppFileViewer] Download fallback:',
        error instanceof Error ? error.message : 'request failed',
      );
      const fallback = new URL(file.src, window.location.href);
      if (/supabase\.co$/i.test(fallback.hostname))
        fallback.searchParams.set('download', filename);
      const anchor = document.createElement('a');
      anchor.href = fallback.toString();
      anchor.download = filename;
      anchor.rel = 'noopener';
      anchor.target = '_blank';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setDownloadBusy(false);
    }
  }, [downloadBusy, file, kind]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (!file || kind === 'unknown') return;
    void (async () => {
      try {
        const readRange = async (range: string) => {
          const response = await fetch(file.src, {
            headers: { Range: range },
            credentials: 'omit',
          signal: controller.signal,
          });
          if (!response.ok || !response.body) return new Uint8Array();
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let total = 0;
          while (total < 262144) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = value.subarray(0, 262144 - total);
            chunks.push(chunk);
            total += chunk.length;
            if (total >= 262144) {
              await reader.cancel();
              break;
            }
          }
          const data = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) {
            data.set(chunk, offset);
            offset += chunk.length;
          }
          return data;
        };
        let tagged = hasPingWorldAttribution(await readRange('bytes=0-262143'));
        if (!tagged && file.size && file.size > 262144)
          tagged = hasPingWorldAttribution(await readRange('bytes=-262144'));
        if (!cancelled) setAttributionState({ src: file.src, tagged });
      } catch {
        /* Metadata inspection is optional if the source denies range reads. */
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [file, kind]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const controller = new AbortController();
    if (classifyFile(file) === 'unknown') {
      void fetch(file.src, {
        method: 'HEAD',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      })
        .then((response) => {
          const mimeType = response.headers
            .get('content-type')
            ?.split(';')[0]
            ?.trim();
          if (
            !cancelled &&
            response.ok &&
            mimeType &&
            mimeType !== 'application/octet-stream'
          ) {
            setFile((current) =>
              current?.src === file.src ? { ...current, mimeType } : current,
            );
          }
        })
        .catch(() => {
          /* type inference is optional; keep the download fallback */
        });
    }
    const officeFormat = getOfficeDocumentFormat(file);
    if (
      classifyFile(file) === 'document' &&
      (officeFormat === 'xlsx' || officeFormat === 'epub')
    ) {
      void (async () => {
        const temporaryEpubUrls: string[] = [];
        let epubUrlsTransferred = false;
        try {
          const zip = await openRangeZip(file.src, file.size, controller.signal);
          if (!cancelled && zip.file('_pingworld/attribution.json'))
            setAttributionState({ src: file.src, tagged: true });
          const parse = (xml: string) =>
            new DOMParser().parseFromString(xml, 'application/xml');
          let text = '';
          let renderedSlides: PresentationSlide[] | null = null;
          let renderedEpub: EpubChapter[] | null = null;
          if (officeFormat === 'epub') {
            const containerText = await zip
              .file('META-INF/container.xml')
              ?.async('text');
            const packagePath =
              containerText ?
                parse(containerText)
                  .getElementsByTagNameNS('*', 'rootfile')[0]
                  ?.getAttribute('full-path')
              : null;
            if (!packagePath)
              throw new Error('This EPUB is missing its package index.');
            const packageText = await zip.file(packagePath)?.async('text');
            if (!packageText)
              throw new Error('This EPUB package index could not be read.');
            const packageDoc = parse(packageText);
            const basePath = packagePath.slice(
              0,
              packagePath.lastIndexOf('/') + 1,
            );
            const resolvePath = (relativePath: string) => {
              const parts =
                `${basePath}${relativePath.split('#')[0].split('?')[0]}`.split(
                  '/',
                );
              const resolved: string[] = [];
              for (const part of parts) {
                if (!part || part === '.') continue;
                if (part === '..') resolved.pop();
                else resolved.push(decodeURIComponent(part));
              }
              return resolved.join('/');
            };
            const manifest = new Map<
              string,
              { href: string; mediaType: string }
            >();
            for (const item of Array.from(
              packageDoc.getElementsByTagNameNS('*', 'item'),
            )) {
              const id = item.getAttribute('id');
              const href = item.getAttribute('href');
              if (id && href)
                manifest.set(id, {
                  href,
                  mediaType: item.getAttribute('media-type') || '',
                });
            }
            const assetMimeByPath = new Map<string, string>();
            for (const item of Array.from(packageDoc.getElementsByTagNameNS('*', 'item'))) {
              const id = item.getAttribute('id');
              const href = item.getAttribute('href');
              if (id && href) {
                const path = resolvePath(href);
                assetMimeByPath.set(path, item.getAttribute('media-type') || 'application/octet-stream');
              }
            }
            const assetUrlCache = new Map<string, string>();
            const makeAssetUrl = async (assetPath: string) => {
              const cached = assetUrlCache.get(assetPath);
              if (cached) return cached;
              const asset = zip.file(assetPath);
              if (!asset) return '';
              const raw = await asset.async('blob');
              const blob = new Blob([raw], { type: assetMimeByPath.get(assetPath) || raw.type || 'application/octet-stream' });
              const url = URL.createObjectURL(blob);
              assetUrlCache.set(assetPath, url);
              temporaryEpubUrls.push(url);
              return url;
            };
            const rewriteCss = async (css: string, cssPath: string, depth = 0): Promise<string> => {
              if (depth > 5) return '';
              const importPattern = /@import\s+(?:url\(\s*)?(?:(['"])(.*?)\1|([^\s;)]+))\s*\)?[^;]*;/gi;
              const imports = [...css.matchAll(importPattern)];
              for (const match of imports) {
                const href = (match[2] || match[3] || '').trim();
                if (!href || /^(?:https?:)?\/\//i.test(href)) { css = css.replace(match[0], ''); continue; }
                const importedPath = resolvePathFrom(cssPath, href);
                const importedText = await zip.file(importedPath)?.async('text');
                const replacement = importedText ? await rewriteCss(importedText, importedPath, depth + 1) : '';
                css = css.replace(match[0], replacement);
              }
              const urlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
              const urlMatches = [...css.matchAll(urlPattern)];
              for (const match of urlMatches) {
                const href = match[2].trim();
                if (!href || href.startsWith('#') || /^data:(?:image|font)\//i.test(href)) continue;
                const replacement = /^(?:https?:)?\/\//i.test(href) ? '' : await makeAssetUrl(resolvePathFrom(cssPath, href));
                css = css.replace(match[0], replacement ? `url("${replacement}")` : 'none');
              }
              return css;
            };
            const resolvePathFrom = (basePath: string, href: string) => {
              const parts = `${basePath.slice(0, basePath.lastIndexOf('/') + 1)}${href.split('#')[0].split('?')[0]}`.split('/');
              const resolved: string[] = [];
              for (const part of parts) {
                if (!part || part === '.') continue;
                if (part === '..') resolved.pop();
                else resolved.push(decodeURIComponent(part));
              }
              return resolved.join('/');
            };
            const spine = Array.from(
              packageDoc.getElementsByTagNameNS('*', 'itemref'),
            );
            renderedEpub = [];
            for (
              let chapterIndex = 0;
              chapterIndex < spine.length;
              chapterIndex++
            ) {
              const id = spine[chapterIndex].getAttribute('idref');
              const item = id ? manifest.get(id) : undefined;
              const chapterPath = item ? resolvePath(item.href) : '';
              if (!chapterPath || !item?.mediaType.includes('html')) continue;
              const chapterFile = zip.file(chapterPath);
              if (!chapterFile) continue;
              const chapterHtml = await chapterFile.async('text');
              const chapterDoc = new DOMParser().parseFromString(
                chapterHtml,
                'text/html',
              );
              chapterDoc
                .querySelectorAll('script, iframe, object, embed, form')
                .forEach((node) => node.remove());
              for (const link of Array.from(chapterDoc.querySelectorAll('link[rel~="stylesheet"]'))) {
                const href = link.getAttribute('href') || '';
                if (!href || /^(?:https?:)?\/\//i.test(href)) { link.remove(); continue; }
                const cssPath = resolvePathFrom(chapterPath, href);
                const cssFile = zip.file(cssPath);
                if (!cssFile) { link.remove(); continue; }
                const css = await rewriteCss(await cssFile.async('text'), cssPath);
                const style = chapterDoc.createElement('style');
                style.textContent = css;
                link.replaceWith(style);
              }
              chapterDoc.querySelectorAll('link').forEach((link) => link.remove());
              for (const style of Array.from(chapterDoc.querySelectorAll('style'))) {
                style.textContent = await rewriteCss(style.textContent || '', chapterPath);
              }
              for (const node of Array.from(chapterDoc.querySelectorAll('*'))) {
                for (const attribute of Array.from(node.attributes)) {
                  const attr = attribute.name.toLowerCase();
                  const value = attribute.value.trim();
                  if (/^on/i.test(attr) || /^javascript:/i.test(value)) { node.removeAttribute(attribute.name); continue; }
                  if (attr === 'srcset') { node.removeAttribute(attribute.name); continue; }
                  if (attr === 'style') { node.setAttribute(attribute.name, await rewriteCss(value, chapterPath)); continue; }
                  if (['src', 'poster', 'xlink:href'].includes(attr)) {
                    if (/^(?:https?:)?\/\//i.test(value)) { node.removeAttribute(attribute.name); continue; }
                    if (/^(?:data:image|data:font)\//i.test(value) || value.startsWith('#')) continue;
                    const assetUrl = await makeAssetUrl(resolvePathFrom(chapterPath, value));
                    if (assetUrl) node.setAttribute(attribute.name, assetUrl);
                    else node.removeAttribute(attribute.name);
                    continue;
                  }
                  if (attr === 'href' && node.tagName.toLowerCase() === 'a' && !value.startsWith('#')) {
                    node.setAttribute(attribute.name, '#');
                    continue;
                  }
                  if (attr === 'href' && /^(?:https?:)?\/\//i.test(value)) node.removeAttribute(attribute.name);
                }
              }
              const title =
                chapterDoc.querySelector('title')?.textContent?.trim() ||
                chapterDoc.querySelector('h1,h2')?.textContent?.trim() ||
                `Chapter ${renderedEpub.length + 1}`;
              renderedEpub.push({
                title,
                html: `<!doctype html>${chapterDoc.documentElement.outerHTML}`,
                assetUrls: [...temporaryEpubUrls],
              });
            }
            if (!renderedEpub.length)
              throw new Error('No readable chapters were found in this EPUB.');
            text = renderedEpub
              .map((chapter, index) => `${index + 1}. ${chapter.title}`)
              .join('\n');
          } else if (/\.docx$/i.test(file.name || file.src)) {
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
            const presentationXml = await zip
              .file('ppt/presentation.xml')
              ?.async('text');
            const sizeNode =
              presentationXml ?
                parse(presentationXml).getElementsByTagNameNS('*', 'sldSz')[0]
              : null;
            const slideWidth = Number(sizeNode?.getAttribute('cx')) || 9144000;
            const slideHeight = Number(sizeNode?.getAttribute('cy')) || 5143500;
            if (!cancelled)
              setPresentationSize({ width: slideWidth, height: slideHeight });
            const toHex = (node?: Element | null) => {
              if (!node) return undefined;
              const rgb = node
                .getElementsByTagNameNS('*', 'srgbClr')[0]
                ?.getAttribute('val');
              return rgb && /^[0-9a-f]{6}$/i.test(rgb) ? `#${rgb}` : undefined;
            };
            const zipPath = (base: string, target: string) => {
              const parts = (
                target.startsWith('/') ?
                  target.slice(1)
                : `${base.slice(0, base.lastIndexOf('/') + 1)}${target}`).split(
                '/',
              );
              const resolved: string[] = [];
              for (const part of parts) {
                if (!part || part === '.') continue;
                if (part === '..') resolved.pop();
                else resolved.push(part);
              }
              return resolved.join('/');
            };
            renderedSlides = await Promise.all(
              slideFiles.map(async (name): Promise<PresentationSlide> => {
                const xml = (await zip.file(name)?.async('text')) || '';
                const slideDoc = parse(xml);
                const relName = `${name.slice(0, name.lastIndexOf('/') + 1)}_rels/${name.slice(name.lastIndexOf('/') + 1)}.rels`;
                const relXml = await zip.file(relName)?.async('text');
                const relations = new Map<string, string>();
                if (relXml)
                  for (const rel of Array.from(
                    parse(relXml).getElementsByTagNameNS('*', 'Relationship'),
                  )) {
                    const id = rel.getAttribute('Id');
                    const target = rel.getAttribute('Target');
                    if (
                      id &&
                      target &&
                      rel.getAttribute('TargetMode') !== 'External'
                    )
                      relations.set(id, zipPath(name, target));
                  }
                const items: PresentationItem[] = [];
                for (const pic of Array.from(
                  slideDoc.getElementsByTagNameNS('*', 'pic'),
                )) {
                  const xfrm = pic.getElementsByTagNameNS('*', 'xfrm')[0];
                  const off = xfrm?.getElementsByTagNameNS('*', 'off')[0];
                  const ext = xfrm?.getElementsByTagNameNS('*', 'ext')[0];
                  const relId =
                    pic
                      .getElementsByTagNameNS('*', 'blip')[0]
                      ?.getAttribute('r:embed') ||
                    pic
                      .getElementsByTagNameNS('*', 'blip')[0]
                      ?.getAttributeNS(
                        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
                        'embed',
                      );
                  const imageFile =
                    relId ? zip.file(relations.get(relId) || '') : null;
                  if (!off || !ext || !imageFile) continue;
                  const imageBlob = await imageFile.async('blob');
                  items.push({
                    kind: 'image',
                    x: (Number(off.getAttribute('x')) / slideWidth) * 100,
                    y: (Number(off.getAttribute('y')) / slideHeight) * 100,
                    width: (Number(ext.getAttribute('cx')) / slideWidth) * 100,
                    height:
                      (Number(ext.getAttribute('cy')) / slideHeight) * 100,
                    imageSrc: URL.createObjectURL(imageBlob),
                  });
                }
                for (const shape of Array.from(
                  slideDoc.getElementsByTagNameNS('*', 'sp'),
                )) {
                  const xfrm = shape.getElementsByTagNameNS('*', 'xfrm')[0];
                  const off = xfrm?.getElementsByTagNameNS('*', 'off')[0];
                  const ext = xfrm?.getElementsByTagNameNS('*', 'ext')[0];
                  if (!off || !ext) continue;
                  const paragraphs = Array.from(
                    shape.getElementsByTagNameNS('*', 'p'),
                  );
                  const value = paragraphs
                    .map((paragraph) =>
                      Array.from(paragraph.getElementsByTagNameNS('*', 't'))
                        .map((node) => node.textContent || '')
                        .join(''),
                    )
                    .join('\n');
                  const props = shape.getElementsByTagNameNS('*', 'spPr')[0];
                  const fill = toHex(
                    props?.getElementsByTagNameNS('*', 'solidFill')[0],
                  );
                  const runProps =
                    shape.getElementsByTagNameNS('*', 'rPr')[0] ||
                    shape.getElementsByTagNameNS('*', 'defRPr')[0];
                  const fontColor = toHex(
                    runProps?.getElementsByTagNameNS('*', 'solidFill')[0],
                  );
                  const size = Number(runProps?.getAttribute('sz'));
                  const alignment = paragraphs[0]
                    ?.getElementsByTagNameNS('*', 'pPr')[0]
                    ?.getAttribute('algn');
                  items.push({
                    kind:
                      value ?
                        fill ? 'shape'
                        : 'text'
                      : 'shape',
                    x: (Number(off.getAttribute('x')) / slideWidth) * 100,
                    y: (Number(off.getAttribute('y')) / slideHeight) * 100,
                    width: (Number(ext.getAttribute('cx')) / slideWidth) * 100,
                    height:
                      (Number(ext.getAttribute('cy')) / slideHeight) * 100,
                    fill,
                    text: value,
                    color: fontColor || '#202124',
                    fontSize: size ? Math.max(8, ((size / 100) * 4) / 3) : 16,
                    bold: runProps?.getAttribute('b') === '1',
                    align:
                      alignment === 'ctr' ? 'center'
                      : alignment === 'r' ? 'right'
                      : 'left',
                  });
                }
                const bg = slideDoc.getElementsByTagNameNS('*', 'bg')[0];
                const background =
                  toHex(bg?.getElementsByTagNameNS('*', 'solidFill')[0]) ||
                  '#ffffff';
                return { items, background };
              }),
            );
            text = renderedSlides
              .map(
                (slide, index) =>
                  `Slide ${index + 1}\n${slide.items
                    .map((item) => item.text)
                    .filter(Boolean)
                    .join('\n')}`,
              )
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
            if (renderedSlides) setPresentationSlides(renderedSlides);
            if (renderedEpub) {
              setEpubChapters(renderedEpub);
              setActiveEpubChapter(0);
              epubUrlsTransferred = true;
            }
            setDocumentText(
              text || 'No text content was found in this document.',
            );
            setMediaLoading(false);
          } else {
            for (const imageUrl of renderedSlides?.flatMap((slide) =>
              slide.items
                .map((item) => item.imageSrc)
                .filter((value): value is string => Boolean(value)),
            ) || []) {
              if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
            }
            for (const url of temporaryEpubUrls) URL.revokeObjectURL(url);
          }
        } catch (error) {
          if (!epubUrlsTransferred) for (const url of temporaryEpubUrls) URL.revokeObjectURL(url);
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
      if (event.key === '-') setZoom((value) => Math.max(0.4, value - 0.2));
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
      controller.abort();
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
            ref={viewerRef}
            className='app-file-viewer fixed inset-0 z-[100] flex flex-col bg-slate-950/95 text-white backdrop-blur-2xl'
            onDoubleClick={handleViewerDoubleClick}
            onPointerMove={updateCropFromPointer}
            onPointerUp={() => {
              cropDragRef.current = null;
            }}
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
                  {kind} {file?.size ? `(${formatFileSize(file.size)})` : ''}
                </p>
              </div>

              <div className='flex gap-3 flex-wrap items-center justify-between'>
                <button
                  type='button'
                  aria-label='Viewer settings'
                  title='Viewer settings'
                  onClick={toggleViewerSettings}
                  className='rounded-lg p-2 hover:bg-white/10'>
                  <Settings2 size={17} />
                </button>
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
                      onClick={() =>
                        setZoom((value) => Math.min(4, value + 0.2))
                      }
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
                    onClick={() => {
                      setEditHistory((history) => [
                        ...history,
                        { crop: imageCrop, rotated, flipX, flipY },
                      ]);
                      setRotated((value) => !value);
                    }}
                    className='rounded-lg p-2 hover:bg-white/10'>
                    <RotateCcw size={17} />
                  </button>
                )}
                {kind === 'image' && file.canEdit && (
                  <>
                    <button
                      type='button'
                      onClick={() => {
                        const previous = cropHistory.at(-1);
                        if (previous) setImageCrop(previous);
                        setCropHistory((history) => history.slice(0, -1));
                      }}
                      disabled={!cropHistory.length}
                      className='rounded-lg p-1 hover:bg-white/10 disabled:opacity-40 text-[10px]'
                      title='Undo crop'>
                      Undo Crop
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        const previous = editHistory.at(-1);
                        if (!previous) return;
                        setImageCrop(previous.crop);
                        setRotated(previous.rotated);
                        setFlipX(previous.flipX);
                        setFlipY(previous.flipY);
                        setEditHistory((history) => history.slice(0, -1));
                      }}
                      disabled={!editHistory.length}
                      className='rounded-lg p-2 hover:bg-white/10 disabled:opacity-40 text-xs'
                      title='Undo whole image edit'>
                      Undo edit
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setEditHistory((history) => [
                          ...history,
                          { crop: imageCrop, rotated, flipX, flipY },
                        ]);
                        setFlipX((value) => !value);
                      }}
                      className='rounded-lg p-2 hover:bg-white/10 text-xs'
                      title='Flip horizontal'>
                      ⇋
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setEditHistory((history) => [
                          ...history,
                          { crop: imageCrop, rotated, flipX, flipY },
                        ]);
                        setFlipY((value) => !value);
                      }}
                      className='rounded-lg p-2 hover:bg-white/10 text-xs'
                      title='Flip vertical'>
                      ⇅
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setImageCrop({ x: 0, y: 0, width: 100, height: 100 })
                      }
                      className='rounded-lg p-2 hover:bg-white/10 text-xs'
                      title='Reset crop'>
                      Clear crop
                    </button>
                    <button
                      type='button'
                      onClick={() => void saveImageEdit()}
                      className='rounded-lg bg-cyan-400 px-3 py-1 text-xs font-bold text-black'>
                      Save
                    </button>
                  </>
                )}
              {kind === 'document' && officeFormat && /^https?:/i.test(file.src) && (
                  <button
                    type='button'
                    onClick={() => {
                      if (externalOfficePreview) { setMediaLoading(true); setExternalOfficePreview(false); return; }
                      const accepted = window.confirm('The online renderer will receive this remote file URL to display the document with its native layout. Continue?');
                      if (accepted) { setMediaLoading(true); setExternalOfficePreview(true); }
                    }}
                    className='rounded-lg border border-cyan-200/20 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-white/10'>
                    {externalOfficePreview ? 'Use local preview' : 'Native layout'}
                  </button>
                )}
                {file.canDownload !== false && (
                  <button
                    type='button'
                    onClick={() => void downloadFile()}
                    disabled={downloadBusy}
                    aria-label={
                      downloadBusy ? 'Downloading file' : 'Download file'
                    }
                    className='rounded-lg p-2 hover:bg-white/10 disabled:opacity-50'>
                    {downloadBusy ?
                      <RefreshCcw
                        size={17}
                        className='animate-spin'
                      />
                    : <Download size={17} />}
                  </button>
                )}
                <button
                  type='button'
                  onClick={closeFile}
                  aria-label='Close viewer'
                  className='rounded-lg p-2 hover:bg-white/10'>
                  <X size={19} />
                </button>
              </div>
            </header>
            {viewerSettingsOpen && (
              <section
                role='dialog'
                aria-label='Viewer settings'
                className='absolute right-3 top-16 z-[120] w-[min(21rem,calc(100vw-1.5rem))] space-y-4 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl'
                onPointerDown={(event) => event.stopPropagation()}>
                <div className='flex items-center justify-between'>
                  <h2 className='text-sm font-bold'>Viewer settings</h2>
                  <button
                    type='button'
                    aria-label='Close settings'
                    onClick={() => setViewerSettingsOpen(false)}
                    className='rounded-lg p-1.5 hover:bg-white/10'>
                    <X size={16} />
                  </button>
                </div>
                {(kind === 'audio' || kind === 'video') && (
                  <>
                    <label className='flex items-center justify-between gap-3 text-xs text-white/75'>
                      Playback speed
                      <select
                        value={playbackRate}
                        onChange={(event) =>
                          setPlaybackRate(Number(event.target.value))
                        }
                        className='rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-white'>
                        <option value={0.5}>0.5×</option>
                        <option value={0.75}>0.75×</option>
                        <option value={1}>1×</option>
                        <option value={1.25}>1.25×</option>
                        <option value={1.5}>1.5×</option>
                        <option value={2}>2×</option>
                      </select>
                    </label>
                    <label className='flex items-center justify-between gap-3 text-xs text-white/75'>
                      Double-click seek
                      <select
                        value={seekSeconds}
                        onChange={(event) =>
                          setSeekSeconds(Number(event.target.value))
                        }
                        className='rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-white'>
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={15}>15 seconds</option>
                        <option value={30}>30 seconds</option>
                      </select>
                    </label>
                  </>
                )}
                <label className='flex items-center justify-between gap-3 text-xs text-white/75'>
                  Preferred orientation
                  <select
                    value={preferredOrientation}
                    onChange={(event) =>
                      setPreferredOrientation(
                        event.target.value as typeof preferredOrientation,
                      )
                    }
                    className='rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-white'>
                    <option value='auto'>Automatic</option>
                    <option value='portrait'>Portrait</option>
                    <option value='landscape'>Landscape</option>
                  </select>
                </label>
                <button
                  type='button'
                  onClick={() => {
                    if (
                      preferredOrientation === 'auto' ||
                      !document.fullscreenElement
                    )
                      return;
                    const orientation =
                      screen.orientation as ScreenOrientation & {
                        lock?: (
                          value: 'portrait' | 'landscape',
                        ) => Promise<void>;
                      };
                    void orientation
                      .lock?.(preferredOrientation)
                      .catch(() => {});
                  }}
                  className='w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15'>
                  Apply orientation in fullscreen
                </button>
              </section>
            )}
            <main className='flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.07),transparent_55%)] p-1 sm:p-4 relative'>
              {(mediaLoading || mediaBuffering) && kind !== 'unknown' && (
                <div
                  className={cn(
                    'absolute z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/85',
                    kind === 'video' ?
                      'inset-x-0 top-1/2 mx-auto aspect-video w-full max-w-6xl -translate-y-1/2'
                    : kind === 'image' ? 'inset-0'
                    : 'inset-0',
                  )}>
                  <span className='text-3xl'>
                    {kind === 'image' ?
                      <ImageIcon className='text-cyan-300' size={32} />
                    : kind === 'video' ?
                      <VideoIcon className='text-cyan-300' size={32} />
                    : kind === 'audio' ?
                      <MusicIcon className='text-cyan-300' size={32} />
                    : kind === 'pdf' || kind === 'document' ?
                      <FileTextIcon className='text-cyan-300' size={32} />
                    : <Folder className='text-cyan-300' size={32} />}
                  </span>
                  <div className='h-7 w-7 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300' />
                  <span className='text-xs text-white/65'>
                    {mediaBuffering ? `Buffering ${kind}…` : `Loading ${kind}…`}
                  </span>
                  {mediaBuffering && bufferedPercent > 0 && (
                    <span className='text-[10px] tabular-nums text-white/45'>
                      {Math.round(bufferedPercent)}% buffered
                    </span>
                  )}
                </div>
              )}
              {mediaError && (kind === 'audio' || kind === 'video') && (
                <div
                  role='alert'
                  className='absolute inset-x-3 top-1/2 z-30 mx-auto flex max-w-md -translate-y-1/2 flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 bkblur p-5 text-center shadow-2xl'>
                  <p className='text-sm font-semibold'>
                    Media playback was interrupted
                  </p>
                  <p className='text-xs leading-relaxed text-white/60'>
                    The source may not support range requests or this format may
                    not be playable in this browser. You can retry or download
                    the original file.
                  </p>
                  <div className='flex flex-wrap justify-center gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setMediaError(false);
                        setMediaLoading(true);
                        setMediaBuffering(false);
                        if (mediaRef.current) {
                          mediaRef.current.load();
                        }
                      }}
                      className='rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950'>
                      Retry playback
                    </button>
                    {file.canDownload !== false && (
                      <button
                        type='button'
                        onClick={() => void downloadFile()}
                        className='rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10'>
                        Download original
                      </button>
                    )}
                  </div>
                </div>
              )}
              {kind === 'document' && officeFormat === 'xlsx' && !externalOfficePreview && (
                <div className='absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-center text-[11px] text-white/75 shadow-lg'>
                  <span>For exact native layout, open the original document.</span>
                  <button type='button' onClick={() => void downloadFile()} className='rounded-md bg-cyan-300 px-2.5 py-1 font-semibold text-slate-950'>
                    Download original
                  </button>
                </div>
              )}
              {kind === 'image' && !imageFailed && (
                <div className='relative inline-flex max-h-full max-w-full'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.src}
                    alt={file.name || 'Preview'}
                    draggable={false}
                    decoding='async'
                    onLoad={() => setMediaLoading(false)}
                    onError={() => {
                      setImageFailed(true);
                      setMediaLoading(false);
                    }}
                    className='block max-h-[calc(100vh-10rem)] max-w-[calc(100vw-2rem)] object-contain transition-transform duration-150'
                    style={{
                      width: 'auto',
                      height: 'auto',
                      transform: `scale(${zoom}) rotate(${rotated ? 90 : 0}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`,
                    }}
                  />
                  {hasAttribution && (
                    <span className='pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/60 bkblur px-2 py-1 text-[10px] font-medium text-white/85'>
                      {PINGWORLD_ATTRIBUTION_TEXT}
                    </span>
                  )}
                  {file.canEdit && (
                    <div className='absolute inset-0 pointer-events-none'>
                      <div
                        className='absolute border-2 border-dotted border-cyan-200 bg-black/5'
                        style={{
                          left: `${imageCrop.x}%`,
                          top: `${imageCrop.y}%`,
                          width: `${imageCrop.width}%`,
                          height: `${imageCrop.height}%`,
                          boxShadow: '0 0 0 9999px rgba(0,0,0,.35)',
                        }}>
                        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                          <button
                            key={corner}
                            type='button'
                            aria-label={`Adjust ${corner} crop corner`}
                            onPointerDown={(event) => {
                              const parent = event.currentTarget
                                .closest('main')
                                ?.querySelector('img');
                              if (!parent) return;
                              const imageRect = parent.getBoundingClientRect();
                              event.preventDefault();
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              cropDragRef.current = {
                                corner,
                                start: imageCrop,
                                rect: imageRect,
                              };
                              setCropHistory((history) => [
                                ...history,
                                imageCrop,
                              ]);
                            }}
                            onPointerCancel={() => {
                              cropDragRef.current = null;
                            }}
                            className={cn(
                              'pointer-events-auto absolute h-5 w-5 touch-none rounded-full border-2 border-slate-950 bg-cyan-200 shadow-md',
                              corner.includes('n') ? '-top-2.5' : '-bottom-2.5',
                              corner.includes('w') ? '-left-2.5' : '-right-2.5',
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {kind === 'image' && file.canEdit && (
                <div className='absolute bottom-3 flex items-center justify-center'>
                  <div className='flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/5 bg-slate-950/60 p-2 pl-3 text-xs bkblur w-fit shadow-md self-center'>
                    <span className='px-1 text-white/60'>Crop</span>
                    {(
                      [
                        ['Free', 100, 100],
                        ['Square', 1, 1],
                        ['4:3', 4, 3],
                        ['16:9', 16, 9],
                        ['16:10', 16, 10],
                      ] as const
                    ).map(([label, rw, rh]) => (
                      <button
                        key={label}
                        type='button'
                        onClick={() => {
                          if (label === 'Free') {
                            setImageCrop({
                              x: 0,
                              y: 0,
                              width: 100,
                              height: 100,
                            });
                            return;
                          }
                          const ratio = rw / rh;
                          const image = document.querySelector(
                            '.app-file-viewer img',
                          ) as HTMLImageElement | null;
                          const imageRatio =
                            image?.naturalWidth && image?.naturalHeight ?
                              image.naturalWidth / image.naturalHeight
                            : 1;
                          let width = 90;
                          let height = (width * imageRatio) / ratio;
                          if (height > 90) {
                            height = 90;
                            width = (height * ratio) / imageRatio;
                          }
                          setImageCrop({
                            x: (100 - width) / 2,
                            y: (100 - height) / 2,
                            width,
                            height,
                          });
                        }}
                        className='rounded-xl border border-white/5 px-3 py-1 hover:bg-white/10'>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {kind === 'image' && imageFailed && (
                <div className='max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center'>
                  <h2 className='mb-2 font-semibold'>
                    Image preview unavailable
                  </h2>
                  <p className='mb-4 text-xs text-white/65'>
                    The image URL may have expired or the object is not
                    accessible. Try downloading it or reopen the file.
                  </p>
                  <button
                    type='button'
                    onClick={() => void downloadFile()}
                    className='rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black'>
                    Download image
                  </button>
                </div>
              )}
              {(kind === 'audio' || kind === 'video') && (
                <div
                  className={`relative flex max-h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 bkblur shadow-2xl shadow-pw-cyan/20 ${kind === 'audio' ? 'max-w-3xl p-4 sm:p-6' : 'max-w-6xl'}`}>
                  {kind === 'audio' && (
                    <div className='flex flex-col justify-center gap-2'>
                      <div className='flex items-center gap-1 justify-between w-full'>
                        <div className='flex items-center gap-4 max-w-[80%]'>
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
                            <div
                              className='flex h-8 items-end gap-1'
                              aria-hidden='true'>
                              {[9, 17, 12, 25, 15, 21, 11].map(
                                (height, index) => (
                                  <span
                                    key={index}
                                    className={cn(
                                      'w-1 rounded-full bg-current transition-all',
                                      playing && 'animate-pulse',
                                    )}
                                    style={{
                                      height: `${height}px`,
                                      animationDelay: `${index * 70}ms`,
                                    }}
                                  />
                                ),
                              )}
                            </div>
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
                      <ThemedSlider
                        aria-label='Seek media'
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
                        className='mt-2 min-w-full cursor-pointer'
                        trackHeight={3}
                        activeHeight={7}
                        shimmer={playing}
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
                      onDoubleClick={(event) => event.preventDefault()}
                      onLoadStart={() => setMediaLoading(true)}
                      onCanPlay={() => {
                        setMediaLoading(false);
                        setMediaBuffering(false);
                        setMediaError(false);
                      }}
                      onWaiting={() => setMediaBuffering(true)}
                      onStalled={() => setMediaBuffering(true)}
                      onPlaying={() => {
                        setMediaLoading(false);
                        setMediaBuffering(false);
                        setMediaError(false);
                      }}
                      onError={() => {
                        setMediaLoading(false);
                        setMediaBuffering(false);
                        setMediaError(true);
                      }}
                      onProgress={(event) => {
                        const media = event.currentTarget;
                        if (
                          !Number.isFinite(media.duration) ||
                          media.duration <= 0 ||
                          !media.buffered.length
                        )
                          return;
                        const bufferedEnd = media.buffered.end(
                          media.buffered.length - 1,
                        );
                        setBufferedPercent(
                          Math.min(
                            100,
                            Math.max(0, (bufferedEnd / media.duration) * 100),
                          ),
                        );
                      }}
                      onClick={() => {
                        if (mediaRef.current?.paused) {
                          mediaRef.current?.play();
                        }
                        setHideBar(!hideBar);
                      }}
                      onTimeUpdate={(event) =>
                        setCurrentTime(event.currentTarget.currentTime)
                      }
                      onLoadedMetadata={(event) => {
                        setDuration(event.currentTarget.duration || 0);
                        event.currentTarget.playbackRate = playbackRate;
                        setMediaLoading(false);
                      }}
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
                      onLoadedMetadata={(event) => {
                        setDuration(event.currentTarget.duration || 0);
                        event.currentTarget.playbackRate = playbackRate;
                        setMediaLoading(false);
                      }}
                      onWaiting={() => setMediaBuffering(true)}
                      onStalled={() => setMediaBuffering(true)}
                      onPlaying={() => {
                        setMediaLoading(false);
                        setMediaBuffering(false);
                        setMediaError(false);
                      }}
                      onError={() => {
                        setMediaLoading(false);
                        setMediaBuffering(false);
                        setMediaError(true);
                      }}
                      onProgress={(event) => {
                        const media = event.currentTarget;
                        if (
                          !Number.isFinite(media.duration) ||
                          media.duration <= 0 ||
                          !media.buffered.length
                        )
                          return;
                        const bufferedEnd = media.buffered.end(
                          media.buffered.length - 1,
                        );
                        setBufferedPercent(
                          Math.min(
                            100,
                            Math.max(0, (bufferedEnd / media.duration) * 100),
                          ),
                        );
                      }}
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                    />
                  )}

                  {kind === 'video' && (!hideBar || !playing) && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        exit={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='absolute top-0 w-full min-w-[100%] h-9 flex items-center justify-center p-1'>
                        <div
                          style={{ textShadow: '0px 1px 10px gray' }}
                          className='w-fit max-w-[90%] flex gap-1 m-1 rounded-full shadow-md text-center text-white bg-slate-950/60 bkblur text-xs sm:text-sm p-1 px-3'>
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
                          <ThemedSlider
                            aria-label='Seek media'
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
                            className='w-full cursor-pointer'
                            trackHeight={3}
                            activeHeight={7}
                            shimmer={playing}
                          />
                          <div className='flex items-center gap-2'>
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
                              {formatTime(currentTime)} / {formatTime(duration)}
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

                                <ThemedSlider
                                  aria-label='Volume'
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
                                  className='mr-1 w-24 cursor-pointer'
                                  length='6rem'
                                  trackHeight={3}
                                  activeHeight={6}
                                  gradient={false}
                                  gradientStart='#22d4fd'
                                  trackColor='rgba(255,255,255,.28)'
                                />

                                <button
                                  type='button'
                                  aria-label='Full screen'
                                  onClick={() => {
                                    if (document.fullscreenElement)
                                      void document
                                        .exitFullscreen()
                                        .catch(() => {});
                                    else
                                      void viewerRef.current
                                        ?.requestFullscreen()
                                        .catch(() => {});
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
                <>
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
                  <a
                    href={file.src}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='absolute right-3 top-3 z-10 rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow hover:bg-white'>
                    Open PDF in browser
                  </a>
                  {hasAttribution && (
                    <span className='pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/85'>
                      {PINGWORLD_ATTRIBUTION_TEXT}
                    </span>
                  )}
                </>
              )}
              {kind === 'document' && externalOfficePreview && (
                <iframe
                  title={`${file.name || 'Office document'} native-layout preview`}
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.src)}`}
                  className='h-full w-full bg-white'
                  onLoad={() => setMediaLoading(false)}
                  referrerPolicy='no-referrer'
                />
              )}
              {kind === 'document' && !externalOfficePreview && officeFormat === 'docx' && (
                <DocxPreview key={file.src} src={file.src} name={file.name} onLoaded={markMediaLoaded} />
              )}
              {kind === 'document' && !externalOfficePreview && officeFormat === 'pptx' && (
                <PptxPreview key={file.src} src={file.src} name={file.name} onLoaded={markMediaLoaded} />
              )}
              {kind === 'document' && !externalOfficePreview && officeFormat !== 'docx' && officeFormat !== 'pptx' &&
                ((
                  officeFormat === 'epub' &&
                  epubChapters.length > 0
                ) ?
                  <div className='flex h-full w-full min-h-0 flex-col overflow-hidden rounded-xl bg-white text-slate-900'>
                    <div className='flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-xs'>
                      <button
                        type='button'
                        disabled={activeEpubChapter <= 0}
                        onClick={() =>
                          setActiveEpubChapter((index) =>
                            Math.max(0, index - 1),
                          )
                        }
                        className='rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40'>
                        Previous chapter
                      </button>
                      <span className='min-w-0 flex-1 truncate text-center font-semibold'>
                        {epubChapters[activeEpubChapter]?.title} ·{' '}
                        {activeEpubChapter + 1} / {epubChapters.length}
                      </span>
                      <button
                        type='button'
                        disabled={activeEpubChapter >= epubChapters.length - 1}
                        onClick={() =>
                          setActiveEpubChapter((index) =>
                            Math.min(epubChapters.length - 1, index + 1),
                          )
                        }
                        className='rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40'>
                        Next chapter
                      </button>
                    </div>
                    <iframe
                      title={
                        epubChapters[activeEpubChapter]?.title || 'EPUB chapter'
                      }
                      sandbox=''
                      srcDoc={epubChapters[activeEpubChapter]?.html}
                      onLoad={() => setMediaLoading(false)}
                      className='min-h-0 flex-1 bg-white'
                    />
                  </div>
                : (
                  /\.pptx$/i.test(file.name || file.src) &&
                  presentationSlides.length > 0
                ) ?
                  <div
                    ref={(element) => {
                      documentScrollRef.current = element;
                    }}
                    className='h-full w-full overflow-auto bg-slate-900 p-4 sm:p-8'>
                    <div className='mx-auto flex max-w-6xl flex-col gap-8'>
                      {presentationSlides.map((slide, slideIndex) => (
                        <section
                          key={slideIndex}
                          aria-label={`Slide ${slideIndex + 1}`}
                          className='relative mx-auto w-full overflow-hidden shadow-2xl'
                          style={{
                            aspectRatio: `${presentationSize.width} / ${presentationSize.height}`,
                            backgroundColor: slide.background,
                            containerType: 'inline-size',
                          }}>
                          {slide.items.map((item, itemIndex) => (
                            <div
                              key={itemIndex}
                              className='absolute overflow-hidden'
                              style={{
                                left: `${item.x}%`,
                                top: `${item.y}%`,
                                width: `${item.width}%`,
                                height: `${item.height}%`,
                                backgroundColor: item.fill || 'transparent',
                                color: item.color || '#202124',
                                fontSize: `${((item.fontSize || 16) * 100) / ((presentationSize.width / 914400) * 96)}cqw`,
                                fontWeight: item.bold ? 700 : 400,
                                textAlign: item.align || 'left',
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.15,
                                padding:
                                  item.kind === 'text' ? '0.15em' : '0.35em',
                              }}>
                              {item.imageSrc ?
                                <Image
                                  src={item.imageSrc}
                                  alt=''
                                  fill
                                  unoptimized
                                  draggable={false}
                                  className='object-contain'
                                />
                              : item.text}
                            </div>
                          ))}
                          <span className='pointer-events-none absolute bottom-2 right-3 rounded bg-black/50 px-2 py-1 text-[10px] text-white'>
                            {slideIndex + 1} / {presentationSlides.length}
                          </span>
                        </section>
                      ))}
                    </div>
                  </div>
                : officeFormat === 'xlsx' ?
                  <pre
                    ref={(element) => {
                      documentScrollRef.current = element;
                    }}
                    className='h-full w-full overflow-auto whitespace-pre-wrap bg-white p-6 text-sm leading-relaxed text-slate-900'>
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
                    <button
                      type='button'
                      onClick={() => void downloadFile()}
                      className='inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black'>
                      Download document
                    </button>
                  </div>)}
              {kind === 'unknown' && (
                <div className='max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center'>
                  <Maximize2 className='mx-auto mb-3 text-cyan-300' />
                  <h2 className='mb-2 font-semibold'>Preview unavailable</h2>
                  <p className='mb-4 text-xs text-white/65 px-1'>
                    This file type is not supported for in-browser preview.
                  </p>
                  <button
                    type='button'
                    onClick={() => void downloadFile()}
                    className='inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black'>
                    Download file
                  </button>
                </div>
              )}
              {hasAttribution && kind !== 'image' && kind !== 'pdf' && (
                <span className='pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/85'>
                  {PINGWORLD_ATTRIBUTION_TEXT}
                </span>
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
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
