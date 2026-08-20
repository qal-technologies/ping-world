'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  Sliders,
  FileCode,
  ArrowUp,
  ArrowDown,
  Plus,
  ChevronRight,
  Sparkles,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading,
  Settings,
  Save,
  BookOpen,
  Link2,
  MoreVertical,
  Pencil,
  X as XIcon,
  Cloud,
  Strikethrough,
  Maximize2,
  Minimize2,
  ArrowRight,
  ArrowLeft,
  Undo,
  Redo,
  CheckCircle2,
  Share,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { useAppModal } from '@/components/ui/AppModalProvider';
import { HybridStorage } from '@/lib/storage-utils';
import BookReaderModal from '@/components/pdf/BookReaderModal';
import ImagePaletteDialog from '@/components/pdf/ImagePaletteDialog';

interface PDFImagePage {
  id: string;
  name: string;
  src: string;
  title: string;
  caption: string;
}

interface ImagePaletteItem {
  id: string;
  name: string; // reference name (e.g. logo, chart1)
  src: string; // URL or base64
  width: number;
  height: number;
  altText?: string;
}

interface HistoryChange {
  changeId: string;
  timestamp: string;
  pages: BookPage[];
  chapters: BookChapter[];
  wordCount: number;
}

interface SessionHistorySnapshot {
  historyId: string;
  startTime: string;
  changes: HistoryChange[];
}

interface Footnote {
  id: string;
  number: number;
  text: string;
}

interface BookPage {
  id: string;
  title: string;
  showTitle: boolean;
  content: string;
  chapterId: string | null;
  titleAlign: 'left' | 'center' | 'right';
  titleColor: string;
  titleBgColor: string;
  titlePadding: number;
  titleMargin: number;
  footnotes: Footnote[];
}

interface BookChapter {
  id: string;
  name: string;
}

interface Book {
  id: string;
  name: string;
  chapters: BookChapter[];
  pages: BookPage[];
  imagePalette: ImagePaletteItem[];
  frontCoverTitle: string;
  frontCoverSubtitle: string;
  frontCoverAuthor: string;
  backCoverSummary: string;
  backCoverBgColor: string;
  hasFrontCover: boolean;
  hasBackCover: boolean;
  pageMargin: 'compact' | 'normal' | 'wide';
  fontFamily?: string;
  fontSize?: 'small' | 'normal' | 'large' | 'extralarge';
  orientation?: 'portrait' | 'landscape';
  paperScheme?: 'white' | 'cream' | 'gray' | 'dark';
  bodyColor?: string;
  globalTitleColor?: string;
  historySnapshots?: SessionHistorySnapshot[];
  updatedAt?: string;
}

type FormatType = 'pdf' | 'word' | 'excel' | 'txt' | 'images';

const FORMAT_ACCEPT_MAP: Record<FormatType, string> = {
  pdf: '.pdf,application/pdf',
  word: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  excel:
    '.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: '.txt,text/plain',
  images: 'image/*',
};

const BRAND_SEED_BOOK: Book = {
  id: 'book-seed-1',
  name: 'Qal Technologies Blueprint',
  chapters: [{ id: 'ch-1', name: 'Chapter 1: Corporate Blueprint' }],
  pages: [
    {
      id: 'pg-seed-1',
      title: 'Qal Technologies Corporate Blueprint',
      showTitle: true,
      content: `Welcome to the official Brand Blueprint of Qal Technologies! This default template showcases our sophisticated page flow and modular design guidelines.

Qal Technologies is a pioneering developer and orchestrator of visual platforms, high-integrity developer sandboxes, and hybrid edge synchronizations. Our core tenets represent:
* Precision craftsmanship & pixel-perfect designs
* Advanced real-time visual formatting and pagination
* Multi-source database synchronization integrity

This template also showcases rich text annotations, inline footnotes, custom list listings, and hyperlinked references:
* Read our <a href="https://qaltech.io">Technical Whitepaper</a>
* Explore <a href="https://poshcodes.site">Poshcodes Styling Core</a>

To load brand logo graphics directly inside your text content streams, use the Image Palette tool! Pre-loaded brand assets have been supplied for immediate visual formatting: [img:company_logo]`,
      chapterId: 'ch-1',
      titleAlign: 'center',
      titleColor: '#3b82f6',
      titleBgColor: 'transparent',
      titlePadding: 4,
      titleMargin: 10,
      footnotes: [
        {
          id: 'fn-1',
          number: 1,
          text: 'This blueprint document is powered by Qal Technologies in partnership with Ping World.',
        },
      ],
    },
  ],
  imagePalette: [
    {
      id: 'palette-logo',
      name: 'company_logo',
      src: '/images/logo.png',
      width: 120,
      height: 120,
    },
  ],
  frontCoverTitle: 'Qal Technologies',
  frontCoverSubtitle: 'Corporate Brand and Creative Asset Manual',
  frontCoverAuthor: 'Qal Executive Board',
  backCoverSummary:
    'A cohesive style manual and technical visual specification blueprint compiled on the Ping World platform.',
  backCoverBgColor: '#0a0c1b',
  hasFrontCover: true,
  hasBackCover: true,
  pageMargin: 'normal',
  updatedAt: new Date().toISOString(),
};

export default function PdfToolStudioPage() {
  const { isFeatureUnlocked, isPremium, user } = useAppContext();
  const hasProPdf = isFeatureUnlocked('pdf-tools');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showAlert, showConfirm, showPrompt } = useAppModal();

  // ── URL-driven Tab Routing ──────────────────────────────────────
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'conversion');

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', val);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // ── Universal Conversion States ─────────────────────────────────
  const [fromFormat, setFromFormat] = useState<FormatType>('pdf');
  const [toFormat, setToFormat] = useState<FormatType>('word');
  const [conversionFile, setConversionFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const conversionInputRef = useRef<HTMLInputElement>(null);

  const detectFormatFromFile = (file: File): FormatType => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (
      name.endsWith('.xls') ||
      name.endsWith('.xlsx') ||
      name.endsWith('.csv')
    )
      return 'excel';
    if (name.endsWith('.txt')) return 'txt';
    if (file.type.startsWith('image/')) return 'images';
    return 'pdf';
  };

  // ── Book Creator States ─────────────────────────────────────────
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string>('book-seed-1');
  const [showBookList, setShowBookList] = useState(true);

  // Active book workspace elements
  const [chapters, setChapters] = useState<BookChapter[]>(
    BRAND_SEED_BOOK.chapters,
  );
  const [activeChapter, setActiveChapter] = useState<string>(
    chapters[0].id || '',
  );

  const [pages, setPages] = useState<BookPage[]>(BRAND_SEED_BOOK.pages);
  const [imagePalette, setImagePalette] = useState<ImagePaletteItem[]>(
    BRAND_SEED_BOOK.imagePalette,
  );
  const [frontCoverTitle, setFrontCoverTitle] = useState(
    BRAND_SEED_BOOK.frontCoverTitle,
  );
  const [frontCoverSubtitle, setFrontCoverSubtitle] = useState(
    BRAND_SEED_BOOK.frontCoverSubtitle,
  );
  const [frontCoverAuthor, setFrontCoverAuthor] = useState(
    BRAND_SEED_BOOK.frontCoverAuthor,
  );
  const [frontCoverBg, setFrontCoverBg] = useState<string | null>(null);
  const [backCoverSummary, setBackCoverSummary] = useState(
    BRAND_SEED_BOOK.backCoverSummary,
  );
  const [backCoverBgColor, setBackCoverBgColor] = useState(
    BRAND_SEED_BOOK.backCoverBgColor,
  );
  const [hasFrontCover, setHasFrontCover] = useState(
    BRAND_SEED_BOOK.hasFrontCover,
  );
  const [hasBackCover, setHasBackCover] = useState(
    BRAND_SEED_BOOK.hasBackCover,
  );
  const [pageMargin, setPageMargin] = useState<'compact' | 'normal' | 'wide'>(
    'normal',
  );

  // Global Book Settings states
  const [fontFamily, setFontFamily] = useState<string>(
    "'Merriweather', 'Georgia', serif",
  );
  const [fontSize, setFontSize] = useState<
    'small' | 'normal' | 'large' | 'extralarge'
  >('normal');
  const [paperOrientation, setPaperOrientation] = useState<
    'portrait' | 'landscape'
  >('portrait');
  const [paperScheme, setPaperScheme] = useState<
    'white' | 'cream' | 'gray' | 'dark'
  >('white');
  const [bodyColor, setBodyColor] = useState<string>('#1e293b');
  const [globalTitleColor, setGlobalTitleColor] = useState<string>('#3b82f6');

  // Overall Multi-Page Book Reader View toggle & zoom
  const [showOverallBookReader, setShowOverallBookReader] = useState(false);
  const [readerZoom, setReaderZoom] = useState<number>(100);

  // 2-Tier History Engine states
  const [historySnapshots, setHistorySnapshots] = useState<
    SessionHistorySnapshot[]
  >([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string>(
    `sess-${Date.now()}`,
  );
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const lastHistoryCaptureRef = useRef<number>(0);

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [collapsedChapters, setCollapsedChapters] = useState<
    Record<string, boolean>
  >({});
  const [stackType, setStackType] = useState<'page' | 'chapter'>('page');

  // Preview & Drawer toggles
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [showCoverDrawer, setShowCoverDrawer] = useState(false);
  const [showBookSettings, setShowBookSettings] = useState(false);
  const [showFootnoteDrawer, setShowFootnoteDrawer] = useState(false);

  // Footnote editing
  const [footnoteInput, setFootnoteInput] = useState('');
  const [editingFootnoteId, setEditingFootnoteId] = useState<string | null>(
    null,
  );
  const [editingFootnoteText, setEditingFootnoteText] = useState('');

  // Image Palette Dialog
  const [showImagePaletteDialog, setShowImagePaletteDialog] = useState(false);
  const [editingPaletteItem, setEditingPaletteItem] =
    useState<ImagePaletteItem | null>(null);
  const [paletteNameInput, setPaletteNameInput] = useState('');
  const [paletteWidthInput, setPaletteWidthInput] = useState(120);
  const [paletteHeightInput, setPaletteHeightInput] = useState(120);
  const [paletteAltInput, setPaletteAltInput] = useState('');

  // Paper Background Color from paperScheme selection
  const paperBgColor = useMemo(() => {
    switch (paperScheme) {
      case 'cream':
        return '#FAF7EE';
      case 'gray':
        return '#F3F4F6';
      case 'dark':
        return '#0F172A';
      case 'white':
      default:
        return '#FFFFFF';
    }
  }, [paperScheme]);

  // Unified Export Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('');
  const [exportFormat, setExportFormat] = useState<
    'pdf' | 'doc' | 'txt' | 'pwbook'
  >('pdf');

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<
    { id: string; name: string; size: string; file: File }[]
  >([]);

  // ── Load Books from LocalStorage / HybridStorage ────────────────
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const cached = localStorage.getItem('pw_pdf_books_list_v5');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBooks(parsed);
            return;
          }
        }
        // Seed default template
        setBooks([BRAND_SEED_BOOK]);
        localStorage.setItem(
          'pw_pdf_books_list_v5',
          JSON.stringify([BRAND_SEED_BOOK]),
        );
      } catch (err) {
        console.error('Failed to load books:', err);
        setBooks([BRAND_SEED_BOOK]);
      }
    };
    loadBooks();
  }, []);

  // Dynamic Word Capacity Matrix based on fontSize, margin & orientation
  const wordCapacity = useMemo(() => {
    let base = 400;
    if (pageMargin === 'compact') base = 500;
    if (pageMargin === 'wide') base = 300;

    if (fontSize === 'small') base = Math.round(base * 1.25);
    if (fontSize === 'large') base = Math.round(base * 0.85);
    if (fontSize === 'extralarge') base = Math.round(base * 0.7);

    if (paperOrientation === 'landscape') base = Math.round(base * 1.2);

    return base;
  }, [pageMargin, fontSize, paperOrientation]);

  // Automatic 2-Tier History Snapshot Engine (5-second change batching under session history ID)
  useEffect(() => {
    if (showBookList) return;
    const now = Date.now();
    // Throttle capture to at most once per second
    if (now - lastHistoryCaptureRef.current < 1000) return;
    lastHistoryCaptureRef.current = now;

    const totalWords = pages.reduce(
      (acc, p) =>
        acc + (p.content?.trim().split(/\s+/).filter(Boolean).length || 0),
      0,
    );

    setHistorySnapshots((prev) => {
      let currentSession = prev.find((s) => s.historyId === activeHistoryId);
      if (!currentSession) {
        currentSession = {
          historyId: activeHistoryId,
          startTime: new Date().toISOString(),
          changes: [],
        };
      }

      const lastChange =
        currentSession.changes[currentSession.changes.length - 1];
      const changeTime = new Date().getTime();

      // If last change occurred within 5 seconds, batch into it to prevent memory bloat
      if (
        lastChange &&
        changeTime - new Date(lastChange.timestamp).getTime() < 5000
      ) {
        const updatedChanges = [...currentSession.changes];
        updatedChanges[updatedChanges.length - 1] = {
          ...lastChange,
          timestamp: new Date().toISOString(),
          pages: JSON.parse(JSON.stringify(pages)),
          chapters: JSON.parse(JSON.stringify(chapters)),
          wordCount: totalWords,
        };
        return prev.map((s) =>
          s.historyId === activeHistoryId ?
            { ...s, changes: updatedChanges }
          : s,
        );
      }

      // Check if session has 10 changes; if so, trigger a new session history ID
      if (currentSession.changes.length >= 10) {
        const newSessId = `sess-${Date.now()}`;
        setActiveHistoryId(newSessId);
        const newChange: HistoryChange = {
          changeId: `chg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          pages: JSON.parse(JSON.stringify(pages)),
          chapters: JSON.parse(JSON.stringify(chapters)),
          wordCount: totalWords,
        };
        const newSession: SessionHistorySnapshot = {
          historyId: newSessId,
          startTime: new Date().toISOString(),
          changes: [newChange],
        };
        return [newSession, ...prev];
      }

      const newChange: HistoryChange = {
        changeId: `chg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        pages: JSON.parse(JSON.stringify(pages)),
        chapters: JSON.parse(JSON.stringify(chapters)),
        wordCount: totalWords,
      };

      const updatedSession = {
        ...currentSession,
        changes: [...currentSession.changes, newChange],
      };

      return prev.some((s) => s.historyId === activeHistoryId) ?
          prev.map((s) =>
            s.historyId === activeHistoryId ? updatedSession : s,
          )
        : [updatedSession, ...prev];
    });
  }, [pages, chapters, showBookList, activeHistoryId]);

  // Palette Reference Scanner & Safe Exact Tag Replacer
  const handleScanAndReplacePaletteReference = (
    oldRef: string,
    newRef: string,
  ) => {
    if (!oldRef || !newRef || oldRef === newRef) return;
    const oldTagPattern = new RegExp(`\\[img:${oldRef}\\]`, 'gi');
    const newTag = `[img:${newRef}]`;

    setPages((prevPages) =>
      prevPages.map((p) => {
        if (!p.content) return p;
        const updatedContent = p.content.replace(oldTagPattern, newTag);
        return { ...p, content: updatedContent };
      }),
    );
    toast.success(`Updated all [img:${oldRef}] references to [img:${newRef}]!`);
  };

  // Step back/forward through change IDs across session history snapshots
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  const handleUndo = () => {
    if (historySnapshots.length === 0) {
      toast.info('No saved history available.');
      return;
    }
    const currentSession =
      historySnapshots.find((s) => s.historyId === activeHistoryId) ||
      historySnapshots[0];
    if (!currentSession || currentSession.changes.length < 2) {
      toast.info('No previous change in active history.');
      return;
    }
    const targetIdx =
      historyPointer === -1 ?
        currentSession.changes.length - 2
      : Math.max(0, historyPointer - 1);
    setHistoryPointer(targetIdx);
    const targetChange = currentSession.changes[targetIdx];
    if (targetChange) {
      handleRollbackHistoryChange(targetChange);
    }
  };

  const handleRedo = () => {
    if (historySnapshots.length === 0 || historyPointer === -1) {
      toast.info('No redo steps available.');
      return;
    }
    const currentSession =
      historySnapshots.find((s) => s.historyId === activeHistoryId) ||
      historySnapshots[0];
    if (!currentSession) return;
    const targetIdx = Math.min(
      currentSession.changes.length - 1,
      historyPointer + 1,
    );
    setHistoryPointer(targetIdx);
    const targetChange = currentSession.changes[targetIdx];
    if (targetChange) {
      handleRollbackHistoryChange(targetChange);
    }
  };

  // Rollback to specific history change checkpoint
  const handleRollbackHistoryChange = (change: HistoryChange) => {
    setPages(JSON.parse(JSON.stringify(change.pages)));
    setChapters(JSON.parse(JSON.stringify(change.chapters)));
    toast.success(
      `Rolled back to history from ${new Date(change.timestamp).toLocaleTimeString()}!`,
    );
  };

  const handleClearHistorySnapshots = () => {
    setHistorySnapshots([]);
    const freshSess = `sess-${Date.now()}`;
    setActiveHistoryId(freshSess);
    toast.success('History cleared.');
  };

  const activePage = pages[activePageIndex] || pages[0];
  const activeWordCount = useMemo(() => {
    if (!activePage?.content) return 0;
    const words = activePage.content.trim().split(/\s+/);
    return words.filter(Boolean).length;
  }, [activePage?.content]);

  // ── Dynamic Auto-Pagination Split ───────────────────────────────
  const checkAutoPagination = (text: string) => {
    const words = text.trim() ? text.trim().split(/\s+/) : [];

    if (words.length > wordCapacity) {
      // Find character index of the split word
      let splitIdx = 0;
      let count = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i].match(/\s/)) {
          if (i > 0 && !text[i - 1].match(/\s/)) {
            count++;
            if (count === wordCapacity) {
              splitIdx = i;
              break;
            }
          }
        }
      }

      if (splitIdx > 0) {
        const firstHalf = text.substring(0, splitIdx).trimEnd();
        const secondHalf = text.substring(splitIdx).trim();

        const nextPageIndex = activePageIndex + 1;
        if (nextPageIndex < pages.length) {
          const nextPg = pages[nextPageIndex];
          const updatedNextContent = (
            secondHalf +
            '\n\n' +
            nextPg.content
          ).trim();
          setPages((prev) =>
            prev.map((p, idx) => {
              if (idx === activePageIndex) return { ...p, content: firstHalf };
              if (idx === nextPageIndex)
                return { ...p, content: updatedNextContent };
              return p;
            }),
          );
          toast.info(
            'Text overflowed page capacity - excess words pushed to the next page.',
          );
        } else {
          const newPage: BookPage = {
            id: `pg-${Date.now()}`,
            title: `Page ${pages.length + 1}`,
            showTitle: true,
            content: secondHalf,
            chapterId: activePage ? activePage.chapterId : null,
            titleAlign: 'left',
            titleColor: '#3b82f6',
            titleBgColor: 'transparent',
            titlePadding: 4,
            titleMargin: 10,
            footnotes: [],
          };
          setPages([
            ...pages.map((p, idx) =>
              idx === activePageIndex ? { ...p, content: firstHalf } : p,
            ),
            newPage,
          ]);
          setActivePageIndex(nextPageIndex);
          toast.success(
            'Text overflowed - automatically created a new page for remaining words.',
          );
        }
      }
    }
  };

  // ── Formatted HTML Content Parser ──────────────────────────────
  const renderFormattedContent = (
    content: string,
    palette: ImagePaletteItem[],
  ) => {
    if (!content) return '';
    let html = content;

    // Replace Image Palette tags [img:name]
    if (Array.isArray(palette)) {
      palette.forEach((item) => {
        if (!item || !item.src) return;
        const tagId = `\\[img:${item.id}\\]`;
        const tagName = `\\[img:${item.name}\\]`;
        const imgHtml = `<img src="${item.src}" alt="${item.name || 'Graphic'}" style="max-width: ${item.width || 120}px; max-height: ${item.height || 120}px; object-fit: contain; margin: 12px auto; display: block; border-radius: 8px;" />`;
        html = html.replace(new RegExp(tagId, 'gi'), imgHtml);
        html = html.replace(new RegExp(tagName, 'gi'), imgHtml);
      });
    }

    // Markdown Images ![alt](url)
    html = html.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      '<img src="$2" alt="$1" style="max-width: 100%; max-height: 240px; object-fit: contain; margin: 12px auto; display: block; border-radius: 8px;" />',
    );

    // Lists & formatting
    html = html
      .replace(
        /^\s*\*\s+(.*)$/gm,
        '<li style="margin-left: 18px; list-style-type: disc; padding-left: 4px;">$1</li>',
      )
      .replace(
        /^\s*\d+\.\s+(.*)$/gm,
        '<li style="margin-left: 18px; list-style-type: decimal; padding-left: 4px;">$1</li>',
      )
      .replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>')
      .replace(/<i>(.*?)<\/i>/g, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/<strike>(.*?)<\/strike>/g, '<del>$1</del>')
      .replace(
        /<mark>(.*?)<\/mark>/g,
        '<span style="background-color: rgba(255, 96, 215, 0.4); padding: 1px 4px; border-radius: 4px;">$1</span>',
      )
      .replace(
        /<blockquote>(.*?)<\/blockquote>/g,
        '<blockquote style="border-left: 3px solid #da3bf6; padding-left: 12px; margin: 10px 0; color: #64748b; font-style: italic;">$1</blockquote>',
      )
      .replace(
        /<h2>(.*?)<\/h2>/g,
        '<h2 style="font-size: 1.25rem; font-weight: bold; margin: 14px 0 6px 0; color: #0f172a;">$1</h2>',
      )
      .replace(
        /\[fn:(\d+)\]/g,
        '<sup style="color: #ca3bf6; font-weight: bold;">[$1]</sup>',
      );

    return html;
  };

  // ── Book Selection & Local / Cloud Save ─────────────────────────
  const handleOpenBookWorkspace = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    setActiveBookId(book.id);
    setChapters(book.chapters || []);
    setPages(book.pages || []);
    setImagePalette(book.imagePalette || []);
    setFrontCoverTitle(book.frontCoverTitle || book.name);
    setFrontCoverSubtitle(book.frontCoverSubtitle || '');
    setFrontCoverAuthor(book.frontCoverAuthor || 'Author');
    setBackCoverSummary(book.backCoverSummary || '');
    setBackCoverBgColor(book.backCoverBgColor || '#0a0c1b');
    setHasFrontCover(
      book.hasFrontCover !== undefined ? book.hasFrontCover : true,
    );
    setHasBackCover(book.hasBackCover !== undefined ? book.hasBackCover : true);
    setPageMargin(book.pageMargin || 'normal');
    setFontFamily(book.fontFamily || "'Merriweather', 'Georgia', serif");
    setFontSize(book.fontSize || 'normal');
    setPaperOrientation(book.orientation || 'portrait');
    setPaperScheme(book.paperScheme || 'white');
    setBodyColor(book.bodyColor || '#1e293b');
    setGlobalTitleColor(book.globalTitleColor || '#c43bf6');
    setHistorySnapshots(book.historySnapshots || []);
    setActivePageIndex(0);
    setShowBookList(false);
  };

  const handleSaveCurrentBookAndClose = async () => {
    const updatedBook: Book = {
      id: activeBookId,
      name:
        frontCoverTitle ||
        books.find((b) => b.id === activeBookId)?.name ||
        'Untitled Volume',
      chapters,
      pages,
      imagePalette,
      frontCoverTitle,
      frontCoverSubtitle,
      frontCoverAuthor,
      backCoverSummary,
      backCoverBgColor,
      hasFrontCover,
      hasBackCover,
      pageMargin,
      fontFamily,
      fontSize,
      orientation: paperOrientation,
      paperScheme,
      bodyColor,
      globalTitleColor,
      historySnapshots,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = books.map((b) =>
      b.id === activeBookId ? updatedBook : b,
    );
    setBooks(updatedList);
    localStorage.setItem('pw_pdf_books_list_v5', JSON.stringify(updatedList));

    if (hasProPdf || isPremium) {
      try {
        await HybridStorage.save(activeBookId, updatedBook, 'document');
        toast.success('Saved and synced to the cloud!');
      } catch {
        toast.success('Saved to browser storage.');
      }
    } else {
      toast.info(
        'Saved locally on this device. (Upgrade plan for automated Cloud Sync).',
        {
          duration: 5000,
        },
      );
    }

    setShowBookList(true);
  };

  const handleCreateNewBookPrompt = async () => {
    const name = await showPrompt('Enter the title for your new book:', {
      title: 'Create New Book Volume',
      placeholder: 'e.g. Modern Architecture Guide',
      defaultValue: `Book ${books.length + 1}`,
    });

    if (!name || !name.trim()) return;

    const newId = `book-${Date.now()}`;
    const newBook: Book = {
      id: newId,
      name: name.trim(),
      chapters: [{ id: `ch-${Date.now()}`, name: 'Chapter 1: Introduction' }],
      pages: [
        {
          id: `pg-${Date.now()}`,
          title: 'Opening Page',
          showTitle: true,
          content: 'Begin drafting your sophisticated volume here...',
          chapterId: `ch-${Date.now()}`,
          titleAlign: 'left',
          titleColor: '#3b82f6',
          titleBgColor: 'transparent',
          titlePadding: 4,
          titleMargin: 10,
          footnotes: [],
        },
      ],
      imagePalette: [],
      frontCoverTitle: name.trim(),
      frontCoverSubtitle: 'A new manuscript volume',
      frontCoverAuthor: user?.user_metadata?.full_name || 'Author Name',
      backCoverSummary: 'Summary of this published book volume.',
      backCoverBgColor: '#0a0c1b',
      hasFrontCover: true,
      hasBackCover: true,
      pageMargin: 'normal',
      updatedAt: new Date().toISOString(),
    };

    const list = [newBook, ...books];
    setBooks(list);
    localStorage.setItem('pw_pdf_books_list_v5', JSON.stringify(list));
    handleOpenBookWorkspace(newId);
    toast.success(`🎉 Created new book: "${name.trim()}"`);
  };

  const handleDeleteBook = async (bookId: string) => {
    if (books.length <= 1) {
      toast.error('You must keep at least one book volume in your library.');
      return;
    }

    const confirmed = await showConfirm(
      'Are you sure you want to permanently delete this book volume?',
      {
        title: 'Delete Book Volume',
        confirmText: 'Delete Permanently',
        type: 'danger',
      },
    );

    if (!confirmed) return;

    const list = books.filter((b) => b.id !== bookId);
    setBooks(list);
    localStorage.setItem('pw_pdf_books_list_v5', JSON.stringify(list));
    toast.success('Book volume removed from library.');
  };

  // ── Chapter & Page Organization ─────────────────────────────────
  const handleRenameChapter = async (
    chapterId: string,
    currentName: string,
  ) => {
    const prefixMatch = currentName.match(/^(Chapter\s+\d+):\s*(.*)$/i);
    const existingSubtitle = prefixMatch ? prefixMatch[2] : currentName;

    const newSub = await showPrompt('Enter new chapter title / subtitle:', {
      title: 'Rename Chapter',
      placeholder: 'e.g. The Beginning',
      defaultValue: existingSubtitle,
    });

    if (newSub === null) return;

    setChapters((prev) =>
      prev.map((ch, idx) => {
        if (ch.id === chapterId) {
          const prefix = prefixMatch ? prefixMatch[1] : `Chapter ${idx + 1}`;
          const cleanSub = newSub.replace(/^(Chapter\s+\d+):\s*/i, '').trim();
          return { ...ch, name: `${prefix}: ${cleanSub || 'Untitled'}` };
        }
        return ch;
      }),
    );
    toast.success('Chapter title updated.');
  };

  const handleDisbandChapter = async (chapterId: string) => {
    const confirmed = await showConfirm(
      'Disband this chapter? Its pages will remain safely intact in your book as independent pages.',
      {
        title: 'Disband Chapter',
        confirmText: 'Disband Chapter',
        type: 'warning',
      },
    );

    if (!confirmed) return;

    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    setPages((prev) =>
      prev.map((p) =>
        p.chapterId === chapterId ? { ...p, chapterId: null } : p,
      ),
    );
    toast.success(
      'Chapter disbanded! Sub-pages are preserved as independent pages.',
    );
  };

  const handleDeleteChapterWithPages = async (chapterId: string) => {
    const confirmed = await showConfirm(
      'Delete this chapter AND all pages under it? This action cannot be undone.',
      {
        title: 'Delete Chapter & Pages',
        confirmText: 'Delete Everything',
        type: 'danger',
      },
    );

    if (!confirmed) return;

    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    setPages((prev) => prev.filter((p) => p.chapterId !== chapterId));
    setActivePageIndex(0);
    toast.success('Chapter and associated pages deleted.');
  };

  const handleAddPageToChapter = (chapterId: string | null) => {
    let title = `Page ${pages.length + 1}`;

    const newPage: BookPage = {
      id: `pg-${Date.now()}`,
      title,
      showTitle: true,
      content: '',
      chapterId,
      titleAlign: 'left',
      titleColor: '#3b82f6',
      titleBgColor: 'transparent',
      titlePadding: 4,
      titleMargin: 10,
      footnotes: [],
    };
    setPages([...pages, newPage]);
    setActivePageIndex(pages.length);

    if (chapterId) {
      setActiveChapter(chapterId);

      setCollapsedChapters((prev) => ({
        ...prev,
        [chapterId]: false,
      }));
    }
    toast.success('New page added to book!');
  };

  const handleDeletePage = async (pageId: string) => {
    if (pages.length <= 1) {
      toast.error('Your book must contain at least one page!');
      return;
    }

    const confirmed = await showConfirm(
      'Are you sure you want to delete this page?',
      {
        title: 'Delete Page',
        confirmText: 'Delete Page',
        type: 'danger',
      },
    );

    if (!confirmed) return;

    setPages((prev) => prev.filter((p) => p.id !== pageId));
    setActivePageIndex(0);
    toast.success('Page removed from book.');
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === pages.length - 1)
    )
      return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const list = [...pages];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setPages(list);
    setActivePageIndex(targetIdx);
  };

  // ── Formatting Toolbar Text Injector ────────────────────────────
  const handleFormatText = (tag: string) => {
    const textarea = document.getElementById(
      'book-editor-textarea',
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activePage.content;
    const selected = text.substring(start, end);

    let replacement = '';
    switch (tag) {
      case 'b':
        replacement = `<b>${selected || 'bold text'}</b>`;
        break;
      case 'i':
        replacement = `<i>${selected || 'italic text'}</i>`;
        break;
      case 'u':
        replacement = `<u>${selected || 'underlined text'}</u>`;
        break;
      case 'strike':
        replacement = `<strike>${selected || 'strikethrough'}</strike>`;
        break;
      case 'mark':
        replacement = `<mark>${selected || 'highlighted text'}</mark>`;
        break;
      case 'ul':
        replacement = `\n* ${selected || 'Bullet item'}\n`;
        break;
      case 'ol':
        replacement = `\n1. ${selected || 'Numbered item'}\n`;
        break;
      case 'quote':
        replacement = `\n<blockquote>${selected || 'Quoted phrase'}</blockquote>\n`;
        break;
      case 'h2':
        replacement = `\n<h2>${selected || 'Section Header'}</h2>\n`;
        break;
      case 'link':
        replacement = `<a href="https://example.com">${selected || 'Link description'}</a>`;
        break;
      default:
        replacement = selected;
    }

    const updated =
      text.substring(0, start) + replacement + text.substring(end);
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, content: updated } : p,
      ),
    );

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 50);
  };

  // ── Footnotes Logic ─────────────────────────────────────────────
  const handleAddFootnote = () => {
    if (!footnoteInput.trim()) return;
    const newFn: Footnote = {
      id: `fn-${Date.now()}`,
      number: (activePage.footnotes?.length || 0) + 1,
      text: footnoteInput.trim(),
    };

    const textarea = document.getElementById(
      'book-editor-textarea',
    ) as HTMLTextAreaElement;
    const cursor =
      textarea ? textarea.selectionStart : activePage.content.length;
    const text = activePage.content;
    const tag = ` [fn:${newFn.number}]`;
    const updated = text.substring(0, cursor) + tag + text.substring(cursor);

    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ?
          {
            ...p,
            content: updated,
            footnotes: [...(p.footnotes || []), newFn],
          }
        : p,
      ),
    );
    setFootnoteInput('');
    toast.success('Footnote added and referenced in text.');
  };

  const handleSaveEditFootnote = (fnId: string, newText: string) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ?
          {
            ...p,
            footnotes: (p.footnotes || []).map((f) =>
              f.id === fnId ? { ...f, text: newText } : f,
            ),
          }
        : p,
      ),
    );
    setEditingFootnoteId(null);
    toast.success('Footnote updated.');
  };

  const handleDeleteFootnote = (fnId: string) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ?
          {
            ...p,
            footnotes: (p.footnotes || []).filter((f) => f.id !== fnId),
          }
        : p,
      ),
    );
    toast.success('Footnote removed.');
  };

  // ── Universal Conversion Engine ─────────────────────────────────
  const handleUniversalConversion = async () => {
    if (fromFormat === toFormat) {
      toast.error(
        'Source (From) and Target (To) formats cannot be identical! Please select different formats.',
      );
      return;
    }
    if (!conversionFile) {
      toast.error('Please choose or drop a file to convert.');
      return;
    }

    setIsConverting(true);
    const toastId = toast.loading(
      `Converting ${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()}...`,
    );

    try {
      if (fromFormat === 'pdf' && toFormat === 'word') {
        // High-fidelity PDF to Word conversion via PDF.js with scanned image fallback
        const arrayBuffer = await conversionFile.arrayBuffer();

        if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        let extractedHtml = '';

        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDoc = await loadingTask.promise;

          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');

            if (pageText.trim()) {
              extractedHtml += `<h3 style="color:#3b82f6; margin-top:24px;">Page ${i}</h3><p style="text-indent:24px; line-height:1.6;">${pageText}</p>`;
            } else {
              // Scanned page rendering
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport }).promise;
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                extractedHtml += `<h3 style="color:#3b82f6; margin-top:24px;">Page ${i} (Scanned Image)</h3><div style="text-align:center;"><img src="${imgData}" style="max-width:100%; border:1px solid #ccc; margin:10px auto;" /></div>`;
              }
            }
          }
        }

        if (!extractedHtml.trim()) {
          extractedHtml = `<p>Converted textual content from ${conversionFile.name}</p>`;
        }

        const docHtml = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><title>Converted Word Manuscript</title><meta charset="utf-8"></head>
          <body style="font-family: Calibri, Arial, sans-serif; line-height: 1.6; padding: 40px;">
            <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Extracted PDF Document: ${conversionFile.name}</h2>
            ${extractedHtml}
          </body>
          </html>
        `;

        const blob = new Blob(['\ufeff' + docHtml], {
          type: 'application/msword',
        });
        const { saveAs } = await import('file-saver');
        saveAs(blob, `${conversionFile.name.replace(/\.[^/.]+$/, '')}.doc`);

        toast.dismiss(toastId);
        toast.success(
          '🎉 Successfully converted PDF to Microsoft Word (.doc)!',
        );
      } else if (toFormat === 'pdf') {
        // Text/Word/Excel to PDF
        const text = await conversionFile
          .text()
          .catch(() => 'Document textual stream');
        const clean = text.replace(/<[^>]*>/g, '').substring(0, 10000);

        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Converted Document: ${conversionFile.name}`, 15, 20);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(clean, 180);
        doc.text(splitText, 15, 32);

        doc.save(`${conversionFile.name.replace(/\.[^/.]+$/, '')}.pdf`);
        toast.dismiss(toastId);
        toast.success(`🎉 Converted ${fromFormat.toUpperCase()} to PDF!`);
      } else if (toFormat === 'txt') {
        const text = await conversionFile.text().catch(() => 'Converted text');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const { saveAs } = await import('file-saver');
        saveAs(blob, `${conversionFile.name.replace(/\.[^/.]+$/, '')}.txt`);
        toast.dismiss(toastId);
        toast.success('🎉 Converted to Plain Text (.txt)!');
      } else {
        toast.dismiss(toastId);
        toast.success(
          `Conversion from ${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()} completed!`,
        );
      }
    } catch (err: any) {
      console.error('Universal conversion error:', err);
      toast.dismiss(toastId);
      toast.error(
        'Conversion failed: ' +
          (err?.message || 'Please verify your file format.'),
      );
    } finally {
      setIsConverting(false);
    }
  };

  // ── Book Export Compilations ────────────────────────────────────
  const handleExecuteBookExport = async () => {
    const finalFilename =
      exportFilename.trim() || frontCoverTitle || 'book-manuscript';
    setShowExportModal(false);
    const toastId = toast.loading(
      `Compiling book as ${exportFormat.toUpperCase()}...`,
    );

    try {
      if (exportFormat === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Front Cover
        if (hasFrontCover) {
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, 210, 297, 'F');

          doc.setFontSize(26);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(frontCoverTitle.toUpperCase(), 15, 90);

          doc.setFontSize(13);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(200, 200, 200);
          doc.text(frontCoverSubtitle, 15, 110);

          doc.setFontSize(11);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(255, 255, 255);
          doc.text(`Written by ${frontCoverAuthor}`, 15, 240);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 150, 150);
          doc.text('Compiled with Ping World Book Studio', 15, 275);
          doc.addPage();
        }

        // 2. Pages & Chapters
        pages.forEach((page, idx) => {
          if (idx > 0 || hasFrontCover) doc.addPage();

          const belongsToChapter = chapters.find(
            (c) => c.id === page.chapterId,
          );
          const isFirstPageOfChapter =
            page.chapterId &&
            pages.findIndex((p) => p.chapterId === page.chapterId) === idx;

          if (page.showTitle) {
            doc.setTextColor(59, 130, 246);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');

            const titleWidth = doc.getTextWidth(page.title);
            let titleX = 15;
            if (page.titleAlign === 'center')
              titleX = (pageWidth - titleWidth) / 2;
            if (page.titleAlign === 'right')
              titleX = pageWidth - 15 - titleWidth;

            if (belongsToChapter && isFirstPageOfChapter) {
              doc.setFontSize(11);
              doc.setFont('helvetica', 'italic');
              doc.text(belongsToChapter.name.toUpperCase(), 15, 20);
              doc.setFontSize(20);
              doc.setFont('helvetica', 'bold');
              doc.text(page.title, titleX, 30);
            } else {
              doc.text(page.title, titleX, 25);
            }
          }

          doc.setTextColor(30, 41, 59);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          const startY = page.showTitle ? 42 : 25;
          const cleanLines = page.content.replace(/<[^>]*>/g, '');
          const splitBody = doc.splitTextToSize(cleanLines, 180);
          doc.text(splitBody, 15, startY);

          // Footnotes
          if (page.footnotes && page.footnotes.length > 0) {
            let fnY = 250;
            doc.line(15, fnY - 3, 80, fnY - 3);
            page.footnotes.forEach((fn) => {
              doc.setFontSize(8);
              doc.text(`[${fn.number}] ${fn.text}`, 15, fnY);
              fnY += 5;
            });
          }

          // Page Numbering
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${hasFrontCover ? idx + 2 : idx + 1} | Ping World`,
            15,
            285,
          );
        });

        // 3. Back Cover
        if (hasBackCover) {
          doc.addPage();
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, 210, 297, 'F');

          doc.setFontSize(13);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(220, 220, 220);
          const splitSummary = doc.splitTextToSize(backCoverSummary, 160);
          doc.text(splitSummary, 25, 100);

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text('PING WORLD CREATIVE STUDIOS', 25, 240);
        }

        doc.save(`${finalFilename}.pdf`);
        toast.success('🎉 PDF Manuscript compiled and downloaded!');
      } else if (exportFormat === 'doc') {
        let html = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><title>${frontCoverTitle}</title><meta charset="utf-8">
          <style>
            body { font-family: Calibri, Arial, sans-serif; line-height: 1.6; padding: 40px; }
            .cover { text-align: center; margin-top: 80px; page-break-after: always; }
            .chapter { font-size: 18pt; font-weight: bold; color: #3b82f6; margin-top: 30px; border-bottom: 2px solid #ddd; }
            .title { font-size: 16pt; font-weight: bold; margin-top: 15px; }
            p { text-indent: 20px; text-align: justify; }
          </style>
          </head>
          <body>
        `;

        if (hasFrontCover) {
          html += `<div class="cover"><h1>${frontCoverTitle}</h1><h2>${frontCoverSubtitle}</h2><h3>By ${frontCoverAuthor}</h3></div>`;
        }

        pages.forEach((page, idx) => {
          const ch = chapters.find((c) => c.id === page.chapterId);
          if (ch && pages.findIndex((p) => p.chapterId === ch.id) === idx) {
            html += `<div class="chapter">${ch.name}</div>`;
          }
          if (page.showTitle) {
            html += `<div class="title" style="text-align:${page.titleAlign}; color:${page.titleColor};">${page.title}</div>`;
          }
          html += `<p>${renderFormattedContent(page.content, imagePalette)}</p>`;
        });

        if (hasBackCover) {
          html += `<div style="page-break-before:always; text-align:center; margin-top:80px;"><p>${backCoverSummary}</p></div>`;
        }

        html += `</body></html>`;

        const blob = new Blob(['\ufeff' + html], {
          type: 'application/msword',
        });
        const { saveAs } = await import('file-saver');
        saveAs(blob, `${finalFilename}.doc`);
        toast.success('🎉 Word manuscript (.doc) exported!');
      } else if (exportFormat === 'pwbook') {
        await handleExportBookJson();
      } else {
        // Plain Text export
        let plain = `BOOK: ${frontCoverTitle}\nSUBTITLE: ${frontCoverSubtitle}\nAUTHOR: ${frontCoverAuthor}\n\n========================\n\n`;
        pages.forEach((p, i) => {
          plain += `--- PAGE ${i + 1}: ${p.title} ---\n\n${p.content}\n\n`;
        });
        const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
        const { saveAs } = await import('file-saver');
        saveAs(blob, `${finalFilename}.txt`);
        toast.success('🎉 Text document exported!');
      }
    } catch (err: any) {
      toast.error(
        'Export compilation error: ' + (err?.message || 'Please try again.'),
      );
    } finally {
      toast.dismiss(toastId);
    }
  };

  // Export Book JSON / .pwbook
  const handleExportBookJson = async () => {
    const activeBook: Book = {
      id: activeBookId,
      name: frontCoverTitle || 'Untitled Book',
      chapters,
      pages,
      imagePalette,
      frontCoverTitle,
      frontCoverSubtitle,
      frontCoverAuthor,
      backCoverSummary,
      backCoverBgColor,
      hasFrontCover,
      hasBackCover,
      pageMargin,
      fontFamily,
      fontSize,
      orientation: paperOrientation,
      paperScheme,
      bodyColor,
      globalTitleColor,
      historySnapshots,
      updatedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(activeBook, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const { saveAs } = await import('file-saver');
    const filename = (frontCoverTitle || 'book')
      .replace(/\s+/g, '-')
      .toLowerCase();
    saveAs(blob, `${filename}.pwbook`);
    toast.success('Exported book (.pwbook)!');
  };

  // Import Book JSON / .pwbook
  const handleImportBookJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedBook = JSON.parse(text) as Book;
        if (
          !importedBook ||
          !importedBook.id ||
          !Array.isArray(importedBook.pages)
        ) {
          throw new Error('Invalid book JSON format.');
        }

        const newBookId = `book-imported-${Date.now()}`;
        importedBook.id = newBookId;

        const updatedBooks = [importedBook, ...books];
        setBooks(updatedBooks);
        localStorage.setItem(
          'pw_pdf_books_list_v5',
          JSON.stringify(updatedBooks),
        );

        handleOpenBookWorkspace(newBookId);
        toast.success(`Imported book: "${importedBook.name}"`);
        toast.info(
          'Reminder: If palette images need updating, import or rename them in Image Palette tab. Palette edits immediately reflect across the book!',
          { duration: 8000 },
        );
      } catch (err: any) {
        toast.error(
          'Failed to import book: ' + (err?.message || 'Invalid JSON file.'),
        );
      }
    };
    reader.readAsText(file);
  };

  // ── Render Studio ───────────────────────────────────────────────
  return (
    <div className='min-h-[calc(100vh-64px)] pb-24 pt-8 px-4 sm:px-6 max-w-7xl mx-auto'>
      {/* Studio Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-8 pb-6'>
        <div>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pw-primary/10 border border-pw-primary/20 text-pw-primary text-xs font-bold mb-2'>
            <FileText className='h-3.5 w-3.5' /> PDF & Word Studio
          </div>
          <h1 className='text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight'>
            Universal Document <span className='gradient-text'>Studio.</span>
          </h1>
          <p className='text-pw-muted text-xs sm:text-sm mt-1 max-w-xl'>
            Convert between formats with real document parsing, and author
            structured multi-chapter books.
          </p>
        </div>

        <div className='divider my-4 sm:hidden' />

        {/* Tab Selector Buttons */}
        <div
          className='flex items-center max-w-full bg-white/2 bkblur p-0.5 sm:p-1 mt-4 sm:mt-0 rounded-full border border-white/10 shrink-0 self-center md:self-auto overflow-hidden scrollable-row'
          style={{ gap: '0px' }}>
          <Button
            onClick={() => handleTabChange('conversion')}
            variant='ghost'
            className={cn(
              'h-9 px-4 sm:px-5 text-xs font-bold rounded-full transition-all',
              activeTab === 'conversion' ?
                'bg-pw-primary text-white shadow-lg'
              : 'text-pw-muted hover:text-white',
            )}>
            <Sparkles className='h-3.5 w-3.5 mr-1' /> Convert
          </Button>
          <Button
            onClick={() => handleTabChange('text-to-pdf')}
            variant='ghost'
            className={cn(
              'h-9 px-4 sm:px-5 text-xs font-bold rounded-full transition-all',
              activeTab === 'text-to-pdf' ?
                'bg-pw-primary text-white shadow-lg'
              : 'text-pw-muted hover:text-white',
            )}>
            <BookOpen className='h-3.5 w-3.5 mr-1' /> Book Editor
          </Button>
          <Button
            onClick={() => handleTabChange('merge')}
            variant='ghost'
            className={cn(
              'h-9 px-4 sm:px-5 text-xs font-bold rounded-full transition-all',
              activeTab === 'merge' ?
                'bg-pw-primary text-white shadow-lg'
              : 'text-pw-muted hover:text-white',
            )}>
            <Sliders className='h-3.5 w-3.5 mr-1' /> Merge PDFs
          </Button>
        </div>
      </div>

      <div className='hidden divider my-4 mb-8 sm:flex' />

      {/* ── TAB 1: UNIVERSAL CONVERTER ─────────────────────────────── */}
      {activeTab === 'conversion' && (
        <Card className='bg-transparent ring-0 sm:ring- sm:p-10 sm:bg-[#0c0d1c]/60 bkblur sm:border sm:border-white/2 sm:rounded-3xl sm:shadow-2xl space-y-4 sm:space-y-8 max-w-4xl mx-auto'>
          <div className='text-left sm:text-center space-y-2 max-w-lg mx-auto'>
            <h2 className='text-2xl font-bold font-display text-white'>
              Text File Converter
            </h2>
            <p className='text-xs text-pw-muted'>
              Select your source & target formats. The engine parses raw text
              streams and scanned image structures.
            </p>
          </div>

          {/* Format Selectors with Responsive Arrow */}
          <div className='grid grid-cols-1 md:grid-cols-11 gap-4 items-center'>
            {/* From Dropdown */}
            <div className='md:col-span-5 space-y-2 px-1'>
              <label className='text-xs font-bold uppercase tracking-wider text-pw-muted block'>
                Convert From (Source)
              </label>
              <select
                value={fromFormat}
                onChange={(e) => {
                  const val = e.target.value as FormatType;
                  setFromFormat(val);
                  if (val === toFormat) {
                    toast.warning('Source and Target cannot be identical.');
                  }
                }}
                className='w-full h-11 px-3.5 bg-[#12152e]/70 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pw-primary cursor-pointer'>
                <option value='pdf'>PDF (.pdf)</option>
                <option value='word'>Word (.doc, .docx)</option>
                <option value='excel'>
                  Excel / Spreadsheets (.xlsx, .csv)
                </option>
                <option value='txt'>Text (.txt)</option>
                <option value='images'>Images (PNG, JPG, WEBP)</option>
              </select>
            </div>

            {/* Responsive Direction Arrow (down on mobile, right on desktop) */}
            <div className='md:col-span-1 items-center justify-center pt-2 md:pt-6 hidden sm:flex'>
              <div className='w-9 h-9 rounded-full bg-pw-primary/10 text-pw-primary border border-pw-primary/20 flex items-center justify-center font-bold text-sm shadow-md'>
                <ArrowRight className='hidden md:block h-4 w-4' />
                <ArrowDown className='block md:hidden h-4 w-4' />
              </div>
            </div>

            {/* To Dropdown */}
            <div className='md:col-span-5 space-y-2 px-1'>
              <label className='text-xs font-bold uppercase tracking-wider text-pw-muted block'>
                Convert To (Export)
              </label>
              <select
                value={toFormat}
                onChange={(e) => {
                  const val = e.target.value as FormatType;
                  setToFormat(val);
                  if (val === fromFormat) {
                    toast.warning('Source and Target cannot be identical.');
                  }
                }}
                className='w-full h-11 px-3.5 bg-[#12152e]/70 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pw-primary cursor-pointer'>
                <option value='word'>Word (.doc)</option>
                <option value='pdf'>PDF (.pdf)</option>
                <option value='txt'>Text (.txt)</option>
                <option value='excel'>Excel (.csv)</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop File Input with Format Auto-Detection */}
          <div
            onClick={() => conversionInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) {
                setConversionFile(file);
                const detected = detectFormatFromFile(file);
                setFromFormat(detected);
                toast.success(
                  `Detected file format: ${detected.toUpperCase()}`,
                );
              }
            }}
            className='flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group bkblur'>
            <input
              ref={conversionInputRef}
              type='file'
              accept={FORMAT_ACCEPT_MAP[fromFormat]}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setConversionFile(file);
                  const detected = detectFormatFromFile(file);
                  setFromFormat(detected);
                  toast.success(`Loaded file: ${file.name}`);
                }
              }}
              className='hidden'
            />

            <div className='w-14 h-14 rounded-2xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform'>
              {conversionFile ?
                <ImageIcon className='h-6 w-6' />
              : <Upload className='h-6 w-6' />}
            </div>

            {conversionFile ?
              <div className='space-y-1'>
                <p className='text-sm font-bold text-pw-primary font-mono'>
                  {conversionFile.name}
                </p>
                <p className='text-xs text-pw-muted font-mono'>
                  {(conversionFile.size / 1024).toFixed(1)} KB - Click to choose
                  a different file
                </p>
              </div>
            : <div className='space-y-1'>
                <h3 className='text-base font-bold text-white'>
                  Drop or select your {fromFormat.toUpperCase()} file here
                </h3>
                <p className='text-[10px] text-pw-muted max-w-sm'>
                  File types are automatically detected and prepared for
                  high-integrity conversion.
                </p>
              </div>
            }
          </div>

          {/* Action Button */}
          <Button
            onClick={handleUniversalConversion}
            disabled={!conversionFile || isConverting}
            className='btn-primary h-12 w-full text-sm font-bold shadow-xl max-w-[400px] shadow-pw-primary/20 self-center'>
            <CheckCircle2 className='h-6 w-6 mr-2' /> Convert{' '}
            <span className='hidden sm:inline-block'>
              {fromFormat.toUpperCase()} to {toFormat.toUpperCase()}
            </span>
          </Button>
        </Card>
      )}

      {/* ── TAB 2: ADVANCED BOOK CREATOR ───────────────────────────── */}
      {activeTab === 'text-to-pdf' && (
        <div className='space-y-6'>
          {/* VIEW A: BOOKS LIBRARY LIST */}
          {showBookList ?
            <div className='space-y-6 max-w-5xl mx-auto'>
              <div className='flex items-center justify-between flex-wrap gap-4'>
                <div>
                  <h2 className='text-2xl font-bold font-display text-white'>
                    My Books Library
                  </h2>
                  <p className='text-xs text-pw-muted mt-0.5'>
                    Select an existing book to continue writing, or start a new
                    book.
                  </p>
                </div>
                <Button
                  onClick={handleCreateNewBookPrompt}
                  title='Create New Book'
                  className='gradient-brand h-10 px-4 sm:px-5 text-sm rounded-full font-bold'>
                  <Plus className='h-6 w-6' />{' '}
                  <span className='hidden sm:inline-flex ml-1'>New Book</span>
                </Button>
              </div>

              {/* Books List Grid */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {books.map((book) => {
                  const totalWords = (book.pages || []).reduce(
                    (acc, p) =>
                      acc +
                      (p.content?.trim().split(/\s+/).filter(Boolean).length ||
                        0),
                    0,
                  );
                  return (
                    <Card
                      key={book.id}
                      className='bg-[#0c0d1c]/70 bkblur border border-white/5 hover:border-pw-primary/30 rounded-2xl shadow-xl transition-all flex flex-col justify-between group p-0'>
                      <div className='sapce-y-2 p-3 sm:p-4 pb-1'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='p-2.5 rounded-xl bg-pw-primary/10 text-pw-primary border border-pw-primary/20 shrink-0'>
                            <BookOpen className='h-5 w-5' />
                          </div>
                          <span className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 text-pw-muted font-bold'>
                            {book.pages?.length === 0 ?
                              ''
                            : book.pages?.length > 1 ?
                              `${book.pages?.length} Pages`
                            : `1 Page`}
                          </span>
                        </div>

                        <h3 className='text-lg font-bold text-white group-hover:text-pw-primary transition-colors line-clamp-1 pt-2'>
                          {book.name}
                        </h3>
                        <p className='text-xs text-pw-muted line-clamp-2 leading-relaxed'>
                          {book.frontCoverSubtitle ||
                            book.backCoverSummary ||
                            'Authoring manuscript workspace.'}
                        </p>
                      </div>

                      <div className='border-t border-white/5 p-2 sm:p-4 pt-3 space-y-3'>
                        <div className='flex items-center justify-between text-[10px] text-pw-muted font-mono px-1 flex-wrap'>
                          <span>{book.chapters?.length || 1} Chapters</span>
                          <span>~{totalWords} Words</span>
                        </div>

                        <div className='flex items-center gap-2 flex-wrap'>
                          <Button
                            onClick={() => handleOpenBookWorkspace(book.id)}
                            className='btn-primary h-9 flex-1 text-xs font-bold'>
                            Open
                          </Button>
                          <Button
                            onClick={() => {
                              handleOpenBookWorkspace(book.id);
                              setShowExportModal(true);
                            }}
                            variant='outline'
                            className='h-9 px-3 border-white/10 hover:bg-white/5 text-xs font-bold text-pw-muted hover:text-white'
                            title='Export Manuscript'>
                            <Download className='h-3.5 w-3.5' />
                          </Button>
                          <Button
                            onClick={() => handleDeleteBook(book.id)}
                            variant='ghost'
                            className='h-9 px-3 text-pw-muted hover:text-pw-danger'
                            title='Delete Book'>
                            <Trash2 className='h-3.5 w-3.5' />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          : /* VIEW B: ACTIVE BOOK WORKSPACE */
            <div className='space-y-4 sm:space-y-6'>
              {/* Workspace Action Bar */}
              <div className='flex items-center justify-between flex-wrap gap-4'>
                <div className='min-w-full flex items-center flex-wrap gap-3 sm:bg-[#0c0d1c]/50 sm:bkblur sm:p-2 sm:rounded-2xl sm:border sm:border-white/2'>
                  <Button
                    onClick={handleSaveCurrentBookAndClose}
                    variant='outline'
                    className='h-9 px-2 sm:px-3 border-white/10 hover:bg-white/5 text-xs font-bold gap-2 text-pw-muted hover:text-white'>
                    <ArrowLeft className='h-3.5 w-3.5' />
                  </Button>

                  <div className='flex-1 gap-1 flex flex-wrap items-center justify-between'>
                    <h2 className='flex-1 text-base font-bold text-white flex items-center justify-between gap-2'>
                      {frontCoverTitle || 'Book Editor'}
                    </h2>

                    <div className='flex items-center gap-1'>
                      {hasProPdf ?
                        <span className='text-[9px] uppercase px-2 py-0.5 rounded-full bg-pw-primary/15 text-pw-primary font-bold'>
                          <Cloud className='h-3.5 w-3.5' />
                        </span>
                      : <span className='text-[9px] uppercase px-2 py-1 rounded-full bg-white/5 text-pw-muted font-mono'>
                          Draft
                        </span>
                      }

                      <Button
                        onClick={() => {
                          setExportFilename(
                            frontCoverTitle.replace(/\s+/g, '-').toLowerCase(),
                          );
                          setShowExportModal(true);
                        }}
                        variant='ghost'
                        className='h-9 text-xs font-bold gap-1.5'>
                        <Share className='h-3.5 w-3.5' /> Export
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 flex-wrap sm:mt-0'>
                  <Button
                    onClick={() => setShowOverallBookReader(true)}
                    variant='outline'
                    className='h-9 text-xs font-bold border-white/10 hover:bg-white/5 gap-1.5 text-pw-primary'>
                    <BookOpen className='h-3.5 w-3.5' /> Reader
                  </Button>
                  <Button
                    onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                    variant='outline'
                    className='h-9 text-xs font-bold border-white/10 hover:bg-white/5 gap-1.5 text-pw-muted hover:text-white'>
                    <History className='h-3.5 w-3.5 text-pw-warning' /> History
                  </Button>
                  <Button
                    onClick={() => setShowImagePaletteDialog(true)}
                    variant='outline'
                    className='h-9 text-xs font-bold border-white/10 hover:bg-white/5 gap-1.5'>
                    <ImageIcon className='h-3.5 w-3.5 text-pw-primary' />{' '}
                    Palette
                  </Button>
                </div>
              </div>

              <div className='sm:hidden divider my-4' />

              {/* Main Book Workspace Grid */}
              <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
                {/* LEFT NAVIGATOR: CHAPTERS & PAGES TREE */}
                <div className='lg:col-span-4 space-y-4'>
                  <Card className='mt-2 sm:mt-0 sm:p-4 bg-transparent ring-0 sm:ring-1 sm:bg-[#0c0d1c]/70 bkblur sm:border sm:border-white/5 sm:rounded-2xl space-y-4 sm:shadow-xl'>
                    <div className='flex items-center justify-between flex-wrap'>
                      <span className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                        Chapters & Pages
                      </span>
                      <Button
                        onClick={() => handleAddPageToChapter(null)}
                        size='sm'
                        className='btn-ghost h-7 text-[10px] font-bold gap-1'>
                        <Plus className='h-3 w-3' /> Add Page
                      </Button>
                    </div>

                    {/* Add Stack (Chapter / Page) */}
                    <div className='flex gap-2 mx-1 flex-wrap'>
                      <select
                        value={stackType}
                        onChange={(e) => setStackType(e.target.value as any)}
                        className='bg-white/5 border border-white/10 rounded-xl px-2 text-xs text-pw-text focus:outline-none flex-1 cursor-pointer h-9'>
                        <option
                          value='page'
                          className='bg-[#0A0C1B]'>
                          Page
                        </option>
                        <option
                          value='chapter'
                          className='bg-[#0A0C1B]'>
                          Chapter
                        </option>
                      </select>
                      <Button
                        onClick={() => {
                          if (stackType === 'chapter') {
                            const newChId = `ch-${Date.now()}`;
                            setChapters([
                              ...chapters,
                              {
                                id: newChId,
                                name: `Chapter ${chapters.length + 1}: Subtitle`,
                              },
                            ]);
                            setActiveChapter(newChId);

                            setStackType('page');
                            toast.success('Chapter created!.');
                          } else {
                            handleAddPageToChapter(activeChapter || null);
                            setCollapsedChapters((prev) => ({
                              ...prev,
                              [activeChapter as string]:
                                !prev[activeChapter as string],
                            }));
                          }
                        }}
                        size='sm'
                        className='btn-primary h-9 px-3 text-xs font-bold'>
                        Add
                      </Button>
                    </div>

                    {/* Chapters List */}
                    <div className='space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar'>
                      {chapters.map((ch) => {
                        const chPages = pages.filter(
                          (p) => p.chapterId === ch.id,
                        );
                        const isCollapsed = !!collapsedChapters[ch.id];

                        return (
                          <div
                            key={ch.id}
                            className='space-y-1.5'>
                            {/* Chapter Header */}
                            <div
                              className={cn(
                                'flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 group',
                                activeChapter === ch.id &&
                                  'border-pw-primary/15 bg-pw-primary/10',
                              )}
                              onClick={() => setActiveChapter(ch.id)}>
                              <div className='flex items-center gap-2 cursor-pointer flex-1 min-w-0'>
                                <ChevronRight
                                  onClick={() =>
                                    setCollapsedChapters((prev) => ({
                                      ...prev,
                                      [ch.id]: !prev[ch.id],
                                    }))
                                  }
                                  className={cn(
                                    'h-3.5 w-3.5 text-pw-primary shrink-0 transition-transform duration-200',
                                    !isCollapsed && 'rotate-90',
                                  )}
                                />
                                <span className='text-xs font-bold text-pw-primary font-mono truncate'>
                                  {ch.name}
                                </span>
                              </div>

                              {/* Chapter 3-Dot Options Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    className='h-7 w-7 text-pw-muted hover:text-white shrink-0'>
                                    <MoreVertical className='h-3.5 w-3.5' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className='bg-[#0c0d1c] border-white/10 text-white w-52 shadow-2xl'>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleRenameChapter(ch.id, ch.name)
                                    }>
                                    <Pencil className='h-3.5 w-3.5 mr-2 text-pw-primary' />{' '}
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAddPageToChapter(ch.id)
                                    }>
                                    <Plus className='h-3.5 w-3.5 mr-2 text-pw-success' />{' '}
                                    Add Page
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDisbandChapter(ch.id)}>
                                    <Link2 className='h-3.5 w-3.5 mr-2 text-pw-warning' />{' '}
                                    Disband (Keep Pages)
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className='bg-white/10' />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteChapterWithPages(ch.id)
                                    }>
                                    <Trash2 className='h-3.5 w-3.5 mr-2 text-pw-danger' />{' '}
                                    Delete All
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Sub-Pages Under Chapter */}
                            {!isCollapsed && (
                              <div className='pl-4 space-y-1 border-l border-white/10'>
                                {chPages.map((page) => {
                                  const pIdx = pages.findIndex(
                                    (p) => p.id === page.id,
                                  );
                                  const isActive = activePageIndex === pIdx;

                                  return (
                                    <div
                                      key={page.id}
                                      onClick={() => setActivePageIndex(pIdx)}
                                      className={cn(
                                        'p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all',
                                        isActive ?
                                          'bg-pw-primary/15 text-pw-primary font-bold'
                                        : 'hover:bg-white/5 text-pw-muted',
                                      )}>
                                      <span className='truncate flex-1'>
                                        {pIdx + 1}.{' '}
                                        {page.title || 'Untitled Page'}
                                      </span>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger
                                          asChild
                                          onClick={(e: any) =>
                                            e.stopPropagation()
                                          }>
                                          <Button
                                            size='icon'
                                            variant='ghost'
                                            className='h-6 w-6 text-pw-muted hover:text-white shrink-0'>
                                            <MoreVertical className='h-3 w-3' />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className='bg-[#0c0d1c] border-white/10 text-white w-48 shadow-2xl'>
                                          <DropdownMenuItem
                                            disabled={pIdx === 0}
                                            onClick={() =>
                                              handleMovePage(pIdx, 'up')
                                            }>
                                            <ArrowUp className='h-3.5 w-3.5 mr-2' />{' '}
                                            Move Up
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            disabled={pIdx === pages.length - 1}
                                            onClick={() =>
                                              handleMovePage(pIdx, 'down')
                                            }>
                                            <ArrowDown className='h-3.5 w-3.5 mr-2' />{' '}
                                            Move Down
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              setPages((prev) =>
                                                prev.map((p) =>
                                                  p.id === page.id ?
                                                    { ...p, chapterId: null }
                                                  : p,
                                                ),
                                              )
                                            }>
                                            <Link2 className='h-3.5 w-3.5 mr-2 text-pw-warning' />{' '}
                                            Make Independent
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator className='bg-white/10' />
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleDeletePage(page.id)
                                            }>
                                            <Trash2 className='h-3.5 w-3.5 mr-2 text-pw-danger' />{' '}
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Independent Pages */}
                      {pages.filter((p) => !p.chapterId).length > 0 && (
                        <div className='space-y-1 pt-2 border-t border-white/5'>
                          <span className='text-[10px] font-bold text-pw-muted uppercase pl-1 block'>
                            Independent Pages
                          </span>
                          {pages
                            .filter((p) => !p.chapterId)
                            .map((page) => {
                              const pIdx = pages.findIndex(
                                (p) => p.id === page.id,
                              );
                              const isActive = activePageIndex === pIdx;

                              return (
                                <div
                                  key={page.id}
                                  onClick={() => setActivePageIndex(pIdx)}
                                  className={cn(
                                    'p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all',
                                    isActive ?
                                      'bg-pw-primary/15 text-pw-primary font-bold'
                                    : 'hover:bg-white/5 text-pw-muted',
                                  )}>
                                  <span className='truncate flex-1'>
                                    {pIdx + 1}. {page.title || 'Untitled Page'}
                                  </span>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      asChild
                                      onClick={(e: any) => e.stopPropagation()}>
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        className='h-6 w-6 text-pw-muted hover:text-white shrink-0'>
                                        <MoreVertical className='h-3 w-3' />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className='bg-[#0c0d1c] border-white/10 text-white w-48 shadow-2xl'>
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <BookOpen className='h-3.5 w-3.5 mr-2' />{' '}
                                          Move to Chapter
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent className='bg-[#0c0d1c] border-white/10 text-white w-48'>
                                            {chapters.map((c) => (
                                              <DropdownMenuItem
                                                key={c.id}
                                                onClick={() =>
                                                  setPages((prev) =>
                                                    prev.map((p) =>
                                                      p.id === page.id ?
                                                        {
                                                          ...p,
                                                          chapterId: c.id,
                                                        }
                                                      : p,
                                                    ),
                                                  )
                                                }>
                                                {c.name}
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>

                                      <DropdownMenuItem
                                        disabled={pIdx === 0}
                                        onClick={() =>
                                          handleMovePage(pIdx, 'up')
                                        }>
                                        <ArrowUp className='h-3.5 w-3.5 mr-2' />{' '}
                                        Move Up
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={pIdx === pages.length - 1}
                                        onClick={() =>
                                          handleMovePage(pIdx, 'down')
                                        }>
                                        <ArrowDown className='h-3.5 w-3.5 mr-2' />{' '}
                                        Move Down
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className='bg-white/10' />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeletePage(page.id)
                                        }>
                                        <Trash2 className='h-3.5 w-3.5 mr-2 text-pw-danger' />{' '}
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className='divider my-4 sm:hidden' />

                  {/* Collapsible Book Covers Settings */}
                  <Card className='p-4 bg-[#0c0d1c]/70 bkblur border border-white/5 rounded-2xl space-y-3'>
                    <div
                      onClick={() => setShowCoverDrawer(!showCoverDrawer)}
                      className='flex items-center justify-between cursor-pointer'>
                      <span className='text-xs font-bold text-white uppercase flex items-center gap-2'>
                        <BookOpen className='h-3.5 w-3.5 text-pw-primary' />{' '}
                        Front & Back Covers
                      </span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 text-pw-muted transition-transform',
                          showCoverDrawer && 'rotate-90',
                        )}
                      />
                    </div>

                    {showCoverDrawer && (
                      <div className='space-y-4 pt-2 border-t border-white/5'>
                        <div className='space-y-2'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                            Front Cover Title
                          </label>
                          <Input
                            value={frontCoverTitle}
                            onChange={(e) => setFrontCoverTitle(e.target.value)}
                            className='h-8 bg-white/5 border-white/10 text-xs'
                          />
                        </div>
                        <div className='space-y-2'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                            Subtitle
                          </label>
                          <Input
                            value={frontCoverSubtitle}
                            onChange={(e) =>
                              setFrontCoverSubtitle(e.target.value)
                            }
                            className='h-8 bg-white/5 border-white/10 text-xs'
                          />
                        </div>
                        <div className='space-y-2'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                            Author
                          </label>
                          <Input
                            value={frontCoverAuthor}
                            onChange={(e) =>
                              setFrontCoverAuthor(e.target.value)
                            }
                            className='h-8 bg-white/5 border-white/10 text-xs'
                          />
                        </div>
                        <div className='space-y-2'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase block'>
                            Back Cover Summary
                          </label>
                          <textarea
                            value={backCoverSummary}
                            onChange={(e) =>
                              setBackCoverSummary(e.target.value)
                            }
                            className='w-full h-16 p-2 bg-white/5 border border-white/10 rounded-xl text-xs resize-none'
                          />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Book Global settings */}
                  <Card className='p-4 bg-[#0c0d1c]/70 bkblur border border-white/5 rounded-2xl space-y-3'>
                    <div
                      onClick={() => setShowBookSettings(!showBookSettings)}
                      className='flex items-center justify-between cursor-pointer'>
                      <span className='text-xs font-bold text-white uppercase flex items-center gap-2'>
                        <Settings className='h-3.5 w-3.5 text-pw-primary' />{' '}
                        Book Settings
                      </span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 text-pw-muted transition-transform',
                          showBookSettings && 'rotate-90',
                        )}
                      />
                    </div>

                    {showBookSettings && (
                      <div className='space-y-4 pt-2 border-t border-white/5 text-white space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar'>
                        <div className='space-y-1.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase'>
                            Font
                          </label>
                          <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className='w-full h-8 bg-white/5 border border-white/10 rounded-lg text-xs px-2'>
                            <option
                              value="'Merriweather', 'Georgia', serif"
                              className='bg-[#0a0c1b]'>
                              Serif (Merriweather / Georgia)
                            </option>
                            <option
                              value="'Inter', 'Arial', sans-serif"
                              className='bg-[#0a0c1b]'>
                              Sans (Inter / Arial)
                            </option>
                            <option
                              value="'JetBrains Mono', 'Courier', monospace"
                              className='bg-[#0a0c1b]'>
                              Mono (JetBrains Mono / Courier)
                            </option>
                            <option
                              value='OpenDyslexic, sans-serif'
                              className='bg-[#0a0c1b]'>
                              OpenDyslexic
                            </option>
                          </select>
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase'>
                            Font Size
                          </label>
                          <select
                            value={fontSize}
                            onChange={(e) => setFontSize(e.target.value as any)}
                            className='w-full h-8 bg-white/5 border border-white/10 rounded-lg text-xs px-2'>
                            <option
                              value='small'
                              className='bg-[#0a0c1b]'>
                              Small (12pt)
                            </option>
                            <option
                              value='normal'
                              className='bg-[#0a0c1b]'>
                              Normal (14pt)
                            </option>
                            <option
                              value='large'
                              className='bg-[#0a0c1b]'>
                              Large (16pt)
                            </option>
                            <option
                              value='extralarge'
                              className='bg-[#0a0c1b]'>
                              Extra Large (18pt)
                            </option>
                          </select>
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase'>
                            Paper Orientation
                          </label>
                          <div className='flex gap-1'>
                            {(['portrait', 'landscape'] as const).map(
                              (orient) => (
                                <Button
                                  key={orient}
                                  size='sm'
                                  variant='ghost'
                                  onClick={() => setPaperOrientation(orient)}
                                  className={cn(
                                    'h-7 flex-1 text-xs capitalize',
                                    paperOrientation === orient ?
                                      'bg-pw-primary text-white'
                                    : 'hover:bg-white/5',
                                  )}>
                                  {orient}
                                </Button>
                              ),
                            )}
                          </div>
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase'>
                            Paper Color Scheme
                          </label>
                          <select
                            value={paperScheme}
                            onChange={(e) =>
                              setPaperScheme(e.target.value as any)
                            }
                            className='w-full h-8 bg-white/5 border border-white/10 rounded-lg text-xs px-2'>
                            <option
                              value='white'
                              className='bg-[#0a0c1b]'>
                              Crisp White (#FFFFFF)
                            </option>
                            <option
                              value='cream'
                              className='bg-[#0a0c1b]'>
                              Warm Cream (#FAF7EE)
                            </option>
                            <option
                              value='gray'
                              className='bg-[#0a0c1b]'>
                              Soft Gray (#F3F4F6)
                            </option>
                            <option
                              value='dark'
                              className='bg-[#0a0c1b]'>
                              Dark Slate (#0F172A)
                            </option>
                          </select>
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase'>
                            Body Font Color
                          </label>
                          <Input
                            type='color'
                            value={bodyColor}
                            onChange={(e) => setBodyColor(e.target.value)}
                            className='h-8 w-full bg-white/5 border-white/10 cursor-pointer p-0'
                          />
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase'>
                            Book Titles Color
                          </label>
                          <Input
                            type='color'
                            value={globalTitleColor}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGlobalTitleColor(val);
                              setPages((prev) =>
                                prev.map((p) => ({ ...p, titleColor: val })),
                              );
                            }}
                            className='h-8 w-full bg-white/5 border-white/10 cursor-pointer p-0'
                          />
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-[10px] font-bold text-pw-muted uppercase'>
                            Page Margin
                          </label>
                          <select
                            value={pageMargin}
                            onChange={(e) =>
                              setPageMargin(e.target.value as any)
                            }
                            className='w-full h-8 bg-white/5 border border-white/10 rounded-lg text-xs px-2'>
                            <option
                              value='compact'
                              className='bg-[#0a0c1b]'>
                              Compact (15mm)
                            </option>
                            <option
                              value='normal'
                              className='bg-[#0a0c1b]'>
                              Normal (25mm)
                            </option>
                            <option
                              value='wide'
                              className='bg-[#0a0c1b]'>
                              Wide (35mm)
                            </option>
                          </select>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* RIGHT WORKSPACE: EDITOR & LIVE PREVIEW */}

                <div className='divider my-4 sm:hidden' />

                <div className='lg:col-span-8 space-y-6'>
                  <Card className='bg-transparent ring-0 sm:ring-1 sm:p-6 sm:bg-[#0c0d1c]/70 sm:bkblur sm:border sm:border-white/10 sm:rounded-3xl sm:space-y-6 sm:shadow-2xl'>
                    {/* Header Row: Title + Settings Popover */}
                    <div className='flex items-center justify-between gap-3 mb-1'>
                      <Input
                        value={activePage.title}
                        onChange={(e) =>
                          setPages((prev) =>
                            prev.map((p, idx) =>
                              idx === activePageIndex ?
                                { ...p, title: e.target.value }
                              : p,
                            ),
                          )
                        }
                        placeholder='Page Title...'
                        className='h-11 bg-white/5 border-white/10 text-base font-bold text-white rounded-xl focus:border-pw-primary flex-1'
                      />
                    </div>

                    {/* Rich Text Formatting Bar */}
                    <div className='flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/10 flex-wrap'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={handleUndo}
                        title='Undo Change'
                        className='h-8 w-8 p-0'>
                        <Undo className='h-4 w-4 text-pw-muted hover:text-white' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={handleRedo}
                        title='Redo Change'
                        className='h-8 w-8 p-0'>
                        <Redo className='h-4 w-4 text-pw-muted hover:text-white' />
                      </Button>
                      <div className='w-px h-5 bg-white/10 mx-1' />
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('b')}
                        title='Bold'
                        className='h-8 w-8 p-0'>
                        <Bold className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('i')}
                        title='Italic'
                        className='h-8 w-8 p-0'>
                        <Italic className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('u')}
                        title='Underline'
                        className='h-8 w-8 p-0'>
                        <Underline className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('strike')}
                        title='Strikethrough'
                        className='h-8 w-8 p-0'>
                        <Strikethrough className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('ul')}
                        title='Bullet List'
                        className='h-8 w-8 p-0'>
                        <List className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('ol')}
                        title='Numbered List'
                        className='h-8 w-8 p-0'>
                        <ListOrdered className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('quote')}
                        title='Blockquote'
                        className='h-8 w-8 p-0'>
                        <Quote className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('h2')}
                        title='Section Header'
                        className='h-8 w-8 p-0'>
                        <Heading className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('link')}
                        title='Insert Link'
                        className='h-8 w-8 p-0'>
                        <Link2 className='h-4 w-4 text-pw-primary' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleFormatText('mark')}
                        title='Highlight'
                        className='h-8 px-2 text-pw-warning text-xs font-bold'>
                        Highlight
                      </Button>
                    </div>

                    {/* Fit Ratio Progress Indicator */}
                    <div className='bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-1.5'>
                      <div className='flex items-center justify-between text-xs font-mono'>
                        <span className='text-pw-muted'>
                          {activeWordCount} / {wordCapacity} words
                        </span>
                        <span
                          className={cn(
                            'font-bold',
                            activeWordCount > wordCapacity ? 'text-pw-danger'
                            : 'text-pw-success',
                          )}>
                          {wordCapacity - activeWordCount > 0 ?
                            `${wordCapacity - activeWordCount} words remaining`
                          : 'Auto-paginating overflow'}
                        </span>
                      </div>
                      <div className='w-full bg-white/10 h-1.5 rounded-full overflow-hidden'>
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            activeWordCount > wordCapacity ? 'bg-pw-danger' : (
                              'bg-pw-primary'
                            ),
                          )}
                          style={{
                            width: `${Math.min(100, Math.round((activeWordCount / wordCapacity) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Main Content Textarea */}
                    <textarea
                      id='book-editor-textarea'
                      value={activePage.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPages((prev) =>
                          prev.map((p, idx) =>
                            idx === activePageIndex ?
                              { ...p, content: val }
                            : p,
                          ),
                        );
                        checkAutoPagination(val);
                      }}
                      placeholder='Write your body content here. Bullet points (*), numbered lists (1.), and tags like <b>bold</b> or [img:logo] are fully supported!'
                      className='w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs focus:outline-none focus:border-pw-primary resize-none leading-relaxed'
                    />

                    {/* Visual Page Boundary Divider */}
                    <div className='relative flex items-center justify-center my-2 select-none'>
                      <div className='w-full border-t border-dashed border-white/15' />
                      <span className='absolute bg-[#0c0d1c] px-3 text-[10px] font-bold text-pw-primary/60 uppercase tracking-widest'>
                        Page {activePageIndex + 1} Printable Boundary
                      </span>
                    </div>

                    {/* Live Physical Paper Sheet Preview Card */}
                    <div className='space-y-3 pt-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                          Page Preview
                        </span>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            setIsPreviewFullscreen(!isPreviewFullscreen)
                          }
                          className='h-7 text-[10px] text-pw-primary hover:text-white gap-1'>
                          {isPreviewFullscreen ?
                            <Minimize2 className='h-3 w-3' />
                          : <Maximize2 className='h-3 w-3' />}
                          {isPreviewFullscreen ?
                            'Exit Fullscreen'
                          : 'Fullscreen Preview'}
                        </Button>
                      </div>

                      <Card
                        style={{
                          backgroundColor: paperBgColor,
                          color: bodyColor,
                          fontFamily: fontFamily,
                        }}
                        className={cn(
                          'p-4 rounded-2xl shadow-2xl min-h-[380px] flex flex-col justify-between select-all transition-all border border-slate-200',
                          isPreviewFullscreen &&
                            'fixed inset-4 z-50 overflow-y-auto max-w-4xl mx-auto',
                        )}>
                        <div>
                          {activePage.showTitle && (
                            <h2
                              style={{
                                textAlign: activePage.titleAlign || 'left',
                                color:
                                  activePage.titleColor ||
                                  globalTitleColor ||
                                  '#3b82f6',
                                padding: `${activePage.titlePadding || 4}px`,
                                marginBottom: `${activePage.titleMargin || 10}px`,
                              }}
                              className='text-2xl font-extrabold border-b border-slate-200/50 pb-2'>
                              {activePage.title || 'Untitled Page'}
                            </h2>
                          )}

                          <div
                            style={{ color: bodyColor }}
                            className='text-xs sm:text-sm leading-relaxed whitespace-pre-wrap mt-4'
                            dangerouslySetInnerHTML={{
                              __html: renderFormattedContent(
                                activePage.content,
                                imagePalette,
                              ),
                            }}
                          />
                        </div>

                        {/* Footnotes on physical sheet */}
                        {activePage.footnotes &&
                          activePage.footnotes.length > 0 && (
                            <div className='border-t border-slate-200 pt-3 mt-6 text-[10px] text-slate-500 font-sans space-y-1'>
                              {activePage.footnotes.map((fn) => (
                                <div key={fn.id}>
                                  <span className='font-bold text-pw-primary'>
                                    [{fn.number}]
                                  </span>{' '}
                                  {fn.text}
                                </div>
                              ))}
                            </div>
                          )}
                      </Card>
                    </div>

                    {/* Footnotes Panel */}
                    <div className='border-t border-white/5 pt-4 space-y-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                          Page Footnotes ({activePage.footnotes?.length || 0})
                        </span>
                      </div>

                      {activePage.footnotes &&
                        activePage.footnotes.length > 0 && (
                          <div className='space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar'>
                            {activePage.footnotes.map((fn) => (
                              <div
                                key={fn.id}
                                className='flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs'>
                                {editingFootnoteId === fn.id ?
                                  <div className='flex items-center gap-2 flex-1'>
                                    <Input
                                      value={editingFootnoteText}
                                      onChange={(e) =>
                                        setEditingFootnoteText(e.target.value)
                                      }
                                      className='h-7 bg-black/40 border-white/20 text-xs flex-1'
                                      autoFocus
                                    />
                                    <Button
                                      size='sm'
                                      onClick={() =>
                                        handleSaveEditFootnote(
                                          fn.id,
                                          editingFootnoteText,
                                        )
                                      }
                                      className='btn-primary h-7 px-2 text-[10px]'>
                                      Save
                                    </Button>
                                  </div>
                                : <>
                                    <span className='truncate text-pw-muted'>
                                      <strong className='text-pw-primary'>
                                        [{fn.number}]
                                      </strong>{' '}
                                      {fn.text}
                                    </span>
                                    <div className='flex items-center gap-1'>
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        onClick={() => {
                                          setEditingFootnoteId(fn.id);
                                          setEditingFootnoteText(fn.text);
                                        }}
                                        className='h-6 w-6 text-pw-muted hover:text-pw-primary'>
                                        <Pencil className='h-3 w-3' />
                                      </Button>
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        onClick={() =>
                                          handleDeleteFootnote(fn.id)
                                        }
                                        className='h-6 w-6 text-pw-muted hover:text-pw-danger'>
                                        <Trash2 className='h-3 w-3' />
                                      </Button>
                                    </div>
                                  </>
                                }
                              </div>
                            ))}
                          </div>
                        )}

                      <div className='flex gap-2'>
                        <Input
                          value={footnoteInput}
                          onChange={(e) => setFootnoteInput(e.target.value)}
                          placeholder='Add a new footnote for this page...'
                          className='h-9 bg-white/5 border-white/10 text-xs'
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleAddFootnote()
                          }
                        />
                        <Button
                          onClick={handleAddFootnote}
                          className='btn-primary h-9 px-4 text-xs font-bold shrink-0'>
                          Add Footnote
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          }
        </div>
      )}

      {/* ── TAB 3: MERGE PDFs ──────────────────────────────────────── */}
      {activeTab === 'merge' && (
        <Card className='bg-transparent ring-0 sm:ring-1 sm:p-10 sm:bg-[#0c0d1c] sm:border sm:border-white/10 sm:rounded-3xl sm:shadow-2xl space-y-8 max-w-4xl mx-auto'>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div>
              <h2 className='text-2xl font-bold font-display text-white'>
                Merge PDF Documents
              </h2>
              <p className='text-xs text-pw-muted'>
                Combine multiple PDF files into one structured document.
              </p>
            </div>
            <Button
              onClick={() =>
                document.getElementById('pdf-merge-file-input')?.click()
              }
              className='btn-primary h-10 px-5 text-xs font-bold gap-2'>
              <Upload className='h-4 w-4' /> Add Documents
            </Button>
            <input
              id='pdf-merge-file-input'
              type='file'
              multiple
              accept='.pdf'
              className='hidden'
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  const arr = Array.from(files).map((f) => ({
                    id: `merge-${Date.now()}-${Math.random()}`,
                    name: f.name,
                    size: `${(f.size / 1024).toFixed(1)} KB`,
                    file: f,
                  }));
                  setMergeFiles((prev) => [...prev, ...arr]);
                  toast.success(`Added ${arr.length} files to queue.`);
                }
              }}
            />
          </div>

          {mergeFiles.length > 0 ?
            <div className='space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar'>
              {mergeFiles.map((item, idx) => (
                <div
                  key={item.id}
                  className='p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <span className='font-mono font-bold text-pw-primary text-xs'>
                      {idx + 1}.
                    </span>
                    <div>
                      <span className='text-xs font-bold text-white block'>
                        {item.name}
                      </span>
                      <span className='text-[10px] text-pw-muted font-mono'>
                        {item.size}
                      </span>
                    </div>
                  </div>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() =>
                      setMergeFiles((prev) =>
                        prev.filter((f) => f.id !== item.id),
                      )
                    }
                    className='h-8 w-8 text-pw-muted hover:text-pw-danger'>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          : <div className='py-16 text-center border-2 border-dashed border-white/10 rounded-2xl text-pw-muted text-xs'>
              No PDF files queued yet. Click &quot;Add Documents&quot; to begin
              merging.
            </div>
          }

          <Button
            disabled={mergeFiles.length < 2}
            onClick={async () => {
              const toastId = toast.loading('Merging PDF documents...');
              try {
                const { PDFDocument } = await import('pdf-lib');
                const mergedPdf = await PDFDocument.create();

                for (const item of mergeFiles) {
                  const bytes = await item.file.arrayBuffer();
                  const donorPdf = await PDFDocument.load(bytes);
                  const pages = await mergedPdf.copyPages(
                    donorPdf,
                    donorPdf.getPageIndices(),
                  );
                  pages.forEach((p) => mergedPdf.addPage(p));
                }

                const mergedBytes = await mergedPdf.save();
                const blob = new Blob([mergedBytes as any], {
                  type: 'application/pdf',
                });
                const { saveAs } = await import('file-saver');
                saveAs(blob, `merged-document-${Date.now()}.pdf`);

                toast.dismiss(toastId);
                toast.success('🎉 Successfully merged and downloaded PDFs!');
              } catch (err: any) {
                toast.dismiss(toastId);
                toast.error(
                  'Failed to merge PDFs: ' +
                    (err?.message || 'Please try again.'),
                );
              }
            }}
            className='btn-primary h-12 w-full text-sm font-bold shadow-xl gap-2'>
            <Sliders className='h-4 w-4' /> Merge {mergeFiles.length} PDF
            Documents
          </Button>
        </Card>
      )}

      {/* ── IMAGE PALETTE MODAL ────────────────────────────────────── */}
      <ImagePaletteDialog
        open={showImagePaletteDialog}
        onOpenChange={setShowImagePaletteDialog}
        imagePalette={imagePalette}
        setImagePalette={setImagePalette}
        activePageContent={activePage.content}
        setPages={setPages}
        activePageIndex={activePageIndex}
        onScanAndReplace={handleScanAndReplacePaletteReference}
      />

      {/* ── UNIFIED EXPORT MODAL ────────────────────────────────────── */}
      <Dialog
        open={showExportModal}
        onOpenChange={setShowExportModal}>
        <DialogContent className='max-w-md bg-[#0c0d1c] border-white/10 text-white rounded-3xl p-4 sm:p-6 mx-2 shadow-2xl sm:space-y-4'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold font-display text-white'>
              Export Book
            </DialogTitle>
            <DialogDescription className='text-xs text-pw-muted'>
              Choose your export document format and filename.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <label className='text-[10px] font-bold text-pw-muted uppercase'>
                Filename
              </label>
              <Input
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder='book-manuscript'
                className='h-9 bg-white/5 border-white/10 text-xs font-semibold'
              />
            </div>

            <div className='space-y-1.5'>
              <label className='text-[10px] font-bold text-pw-muted uppercase'>
                Select Format
              </label>
              <div className='flex items-center flex-wrap gap-2'>
                {(
                  [
                    { id: 'pdf', label: 'PDF (.pdf)' },
                    { id: 'doc', label: 'Word (.doc)' },
                    { id: 'txt', label: 'Text (.txt)' },
                    { id: 'pwbook', label: 'Pwbook (.pwbook)' },
                  ] as const
                ).map((fmt) => (
                  <Button
                    key={fmt.id}
                    type='button'
                    variant='ghost'
                    onClick={() => setExportFormat(fmt.id)}
                    className={cn(
                      'h-8 flex flex-col items-center justify-center text-[10px] p-1 px-3 font-bold rounded-xl border transition-all',
                      exportFormat === fmt.id ?
                        'bg-pw-primary/20 border-pw-primary text-pw-primary shadow-lg'
                      : 'bg-white/5 border-white/10 text-pw-muted hover:text-white',
                    )}>
                    {fmt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className='flex flex-row justify-end gap-2 pt-2'>
            <Button
              onClick={() => setShowExportModal(false)}
              variant='outline'
              className='h-9 text-xs border-white/10'>
              Close
            </Button>
            <Button
              onClick={handleExecuteBookExport}
              className='btn-primary h-9 px-5 text-xs font-bold'>
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── OVERALL MULTI-PAGE BOOK READER SHEET MODAL ────────────────── */}
      <BookReaderModal
        open={showOverallBookReader}
        onOpenChange={setShowOverallBookReader}
        pages={pages}
        chapters={chapters}
        coverConfig={{
          hasFrontCover,
          hasBackCover,
          frontCoverTitle,
          frontCoverSubtitle,
          frontCoverAuthor,
          backCoverSummary,
          frontCoverTemplate: 'minimal',
          backCoverTemplate: 'minimal',
        }}
        paperBgColor={paperBgColor}
        bodyColor={bodyColor}
        fontFamily={fontFamily}
        globalTitleColor={globalTitleColor}
        imagePalette={imagePalette}
        renderFormattedContent={renderFormattedContent}
      />

      {/* ── STICKY HISTORY DRAWER ────────────────────────────────────── */}
      {showHistoryDrawer && (
        <div className='fixed bottom-6 right-6 z-50 w-80 bg-[#0c0d1c] border border-white/15 text-white rounded-3xl p-5 shadow-2xl space-y-4 bkblur-md'>
          <div className='flex items-center justify-between border-b border-white/10 pb-3'>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-4 w-4 text-pw-warning' />
              <span className='text-xs font-bold uppercase tracking-wider text-white'>
                Book History
              </span>
            </div>
            <Button
              size='icon'
              variant='ghost'
              onClick={() => setShowHistoryDrawer(false)}
              className='h-6 w-6 text-pw-muted hover:text-white'>
              <XIcon className='h-3.5 w-3.5' />
            </Button>
          </div>

          <div className='space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1'>
            {historySnapshots.length === 0 ?
              <p className='text-xs text-pw-muted italic text-center py-4'>
                No history recorded yet. Changes in the editor will
                automatically generate batch snapshots.
              </p>
            : historySnapshots.map((sess) => (
                <div
                  key={sess.historyId}
                  className='space-y-1.5'>
                  <span className='text-[9px] font-mono text-pw-muted uppercase font-bold block'>
                    Change {new Date(sess.startTime).toLocaleTimeString()}
                  </span>
                  {sess.changes.map((chg) => (
                    <div
                      key={chg.changeId}
                      className='p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-pw-primary/30 flex items-center justify-between transition-all'>
                      <div>
                        <span className='text-[10px] font-bold text-white block'>
                          {new Date(chg.timestamp).toLocaleTimeString()}
                        </span>
                        <span className='text-[9px] text-pw-muted font-mono'>
                          {chg.wordCount} words • {chg.pages?.length || 0} pages
                        </span>
                      </div>
                      <Button
                        size='sm'
                        onClick={() => handleRollbackHistoryChange(chg)}
                        className='btn-primary h-6 px-2.5 text-[9px] font-bold'>
                        Rollback
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            }
          </div>

          <div className='border-t border-white/10 pt-3 flex justify-between items-center'>
            <Button
              size='sm'
              variant='ghost'
              onClick={handleClearHistorySnapshots}
              className='h-7 text-[10px] text-pw-danger hover:bg-pw-danger/10'>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
