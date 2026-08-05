'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  Layers,
  Sliders,
  FileCode,
  ArrowUp,
  ArrowDown,
  Plus,
  ChevronRight,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Indent,
  Settings,
  Save,
  BookOpen,
  Image,
  Link2,
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
import { toast } from 'sonner';
import { tools } from '@/lib/general/data';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';

interface PDFImagePage {
  id: string;
  name: string;
  src: string;
  title: string;
  caption: string;
}

interface ImagePaletteItem {
  id: string;
  name: string; // reference name (e.g. graph1)
  src: string; // base64 URL
  width: number;
  height: number;
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

export default function PdfToolStudioPage() {
  const { isPremium } = useAppContext();
  const [activeTab, setActiveTab] = useState('img-to-pdf');

  // --- Image to PDF States ---
  const [uploadedImages, setUploadedImages] = useState<PDFImagePage[]>([]);
  const [pdfOrientation, setPdfOrientation] = useState<'p' | 'l'>('p');
  const [pdfMargin, setPdfMargin] = useState<'none' | 'small' | 'normal'>('normal');

  // --- Cover Page States ---
  const [hasFrontCover, setHasFrontCover] = useState(true);
  const [frontCoverTitle, setFrontCoverTitle] = useState('The Great Manuscript');
  const [frontCoverSubtitle, setFrontCoverSubtitle] = useState('A comprehensive study of digital workspaces.');
  const [frontCoverAuthor, setFrontCoverAuthor] = useState('Author Name');
  const [frontCoverBg, setFrontCoverBg] = useState<string | null>(null);

  const [hasBackCover, setHasBackCover] = useState(true);
  const [backCoverSummary, setBackCoverSummary] = useState('This book outlines standard client-side compilers and modular book builders designed exclusively for creators.');
  const [backCoverBgColor, setBackCoverBgColor] = useState('#0B0F19');

  // --- Book Creator (Text to PDF) States ---
  const [chapters, setChapters] = useState<BookChapter[]>([
    { id: 'ch-1', name: 'Chapter 1: The Beginning' }
  ]);
  const [pages, setPages] = useState<BookPage[]>([
    {
      id: 'pg-1',
      title: 'First Page Title',
      showTitle: true,
      content: 'This is the main body paragraph of the first page. Highlight some text and click the <b>Bold</b> or <i>Italic</i> buttons below to see rich formatting. Or add a footnote at the bottom of the page!\n\nHere is a list of features:\n* Unlimited chapters & pages\n* Modular footnoting structures\n* Built-in Image Reference Palettes\n* Dynamic highlights using the <mark>highlighter</mark> markup.',
      chapterId: 'ch-1',
      titleAlign: 'left',
      titleColor: '#00f0ff',
      titleBgColor: 'transparent',
      titlePadding: 4,
      titleMargin: 10,
      footnotes: [
        { id: 'fn-1', number: 1, text: 'This is the first footnote in this chapter.' }
      ]
    }
  ]);

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [stackType, setStackType] = useState<'page' | 'chapter'>('page');
  const [showStickyChapterSelector, setShowStickyChapterSelector] = useState<string | null>(null);

  // Image Palette State
  const [imagePalette, setImagePalette] = useState<ImagePaletteItem[]>([]);
  const [showImagePaletteDialog, setShowImagePaletteDialog] = useState(false);

  // New Footnote States
  const [footnoteInput, setFootnoteInput] = useState('');

  // Title configuration box
  const [showTitleConfig, setShowTitleConfig] = useState<string | null>(null);

  // PDF to Word states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTextResult, setPdfTextResult] = useState('');
  const [extractedFileName, setExtractedFileName] = useState('');

  // Word to PDF states
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [wordTextContent, setWordTextResult] = useState('');

  // Merge simulation states
  const [mergeFiles, setMergeFiles] = useState<{ id: string; name: string; size: string; file?: File }[]>([]);

  // Dialog Export state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [filenameInput, setFilenameInput] = useState('');
  const [filenameExtension, setFilenameExtension] = useState('');
  const [onConfirmFilename, setOnConfirmFilename] = useState<((cleanName: string) => void) | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save drafts locally
  useEffect(() => {
    const saved = localStorage.getItem('pw_pdf_book_workspace_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.chapters && parsed.pages) {
          setChapters(parsed.chapters);
          setPages(parsed.pages);
          if (parsed.imagePalette) {
            setImagePalette(parsed.imagePalette);
          }
          if (parsed.frontCoverTitle) {
            setFrontCoverTitle(parsed.frontCoverTitle);
            setFrontCoverSubtitle(parsed.frontCoverSubtitle);
            setFrontCoverAuthor(parsed.frontCoverAuthor);
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  const saveBookDraft = () => {
    localStorage.setItem(
      'pw_pdf_book_workspace_v3',
      JSON.stringify({ chapters, pages, imagePalette, frontCoverTitle, frontCoverSubtitle, frontCoverAuthor })
    );
    toast.success('Progress saved locally as draft!');
  };

  const triggerExport = (
    defaultName: string,
    ext: string,
    callback: (cleanName: string) => void,
  ) => {
    setFilenameInput(defaultName.replace(/\.[^/.]+$/, ''));
    setFilenameExtension(ext);
    setOnConfirmFilename(() => callback);
    setIsNameModalOpen(true);
  };

  const handleConfirmFilename = () => {
    let clean = filenameInput.trim();
    if (!clean) clean = 'untitled';
    clean = clean.replace(/\.(txt|pdf|png|doc|docx|json|jpeg)$/i, '');
    if (onConfirmFilename) {
      onConfirmFilename(clean);
    }
    setIsNameModalOpen(false);
  };

  // --- TEXT METRICS & OVERFLOW CALCULATION ---
  const calculateTextMetrics = (content: string) => {
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const maxWordsPerPage = 400;
    const overflowCount = Math.max(0, wordCount - maxWordsPerPage);
    const estimatedPagesNeeded = Math.ceil(wordCount / maxWordsPerPage) || 1;
    return { wordCount, overflowCount, estimatedPagesNeeded };
  };

  // --- STACK CREATOR & CHAPTER LOGIC ---
  const handleAddStackItem = () => {
    if (stackType === 'chapter') {
      const newChId = `ch-${Date.now()}`;
      const newCh: BookChapter = {
        id: newChId,
        name: `Chapter ${chapters.length + 1}: Unnamed Chapter`,
      };
      setChapters([...chapters, newCh]);
      setStackType('page');
      toast.success('Chapter stack added! Stack type auto-switched to Page.');
    } else {
      // Add Page
      const activeCh = chapters[chapters.length - 1]?.id || null;
      const newPage: BookPage = {
        id: `pg-${Date.now()}`,
        title: `Page ${pages.length + 1} Title`,
        showTitle: true,
        content: '',
        chapterId: activeCh,
        titleAlign: 'left',
        titleColor: '#00f0ff',
        titleBgColor: 'transparent',
        titlePadding: 4,
        titleMargin: 10,
        footnotes: []
      };
      setPages([...pages, newPage]);
      setActivePageIndex(pages.length);
      toast.success('New page added!');
    }
  };

  const handlePageSelectChapter = (pageId: string, chapterId: string | null) => {
    setPages(prev =>
      prev.map((p) => (p.id === pageId ? { ...p, chapterId } : p))
    );
    setShowStickyChapterSelector(null);
    toast.success('Chapter updated.');
  };

  // Edit Chapter Name directly
  const handleEditChapterName = (id: string, newName: string) => {
    setChapters(prev =>
      prev.map((ch) => (ch.id === id ? { ...ch, name: newName } : ch))
    );
  };

  // Delete Chapter
  const handleDeleteChapter = (id: string) => {
    setChapters(prev => prev.filter((ch) => ch.id !== id));
    // Orphan associated pages
    setPages(prev =>
      prev.map((p) => (p.chapterId === id ? { ...p, chapterId: null } : p))
    );
    toast.success('Chapter deleted. Sub-pages are now independent.');
  };

  // Delete Page
  const handleDeletePage = (id: string) => {
    if (pages.length === 1) {
      return toast.error('You must keep at least one page!');
    }
    setPages(prev => prev.filter((p) => p.id !== id));
    setActivePageIndex(0);
    toast.success('Page deleted.');
  };

  // --- STYLING BAR / TEXT INJECTOR (Detect and replace selected text) ---
  const handleFormatSelectedText = (tag: 'b' | 'i' | 'u' | 'mark') => {
    const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activePage.content;

    const selectedText = text.substring(start, end);
    const formattedText = `<${tag}>${selectedText || 'styled text'}</${tag}>`;

    const updatedContent = text.substring(0, start) + formattedText + text.substring(end);
    setPages(prev =>
      prev.map((p, idx) => (idx === activePageIndex ? { ...p, content: updatedContent } : p))
    );

    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formattedText.length);
    }, 50);
  };

  // --- FOOTNOTES SUPPORT ---
  const handleAddFootnote = () => {
    if (!footnoteInput.trim()) return;
    const activePageObj = pages[activePageIndex];
    if (!activePageObj) return;

    const newFn: Footnote = {
      id: `fn-${Date.now()}`,
      number: activePageObj.footnotes.length + 1,
      text: footnoteInput.trim()
    };

    const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement;
    const cursor = textarea ? textarea.selectionStart : activePageObj.content.length;
    const text = activePageObj.content;
    const superscriptTag = ` [fn:${newFn.number}]`;
    const updatedContent = text.substring(0, cursor) + superscriptTag + text.substring(cursor);

    setPages(prev =>
      prev.map((p, idx) =>
        idx === activePageIndex
          ? { ...p, content: updatedContent, footnotes: [...p.footnotes, newFn] }
          : p
      )
    );

    setFootnoteInput('');
    toast.success('Footnote added!');
  };

  const handleRemoveFootnote = (fnId: string) => {
    setPages(prev =>
      prev.map((p, idx) =>
        idx === activePageIndex
          ? { ...p, footnotes: p.footnotes.filter(fn => fn.id !== fnId) }
          : p
      )
    );
  };

  // --- IMAGE PALETTE MANAGER ---
  const handleImagePaletteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newItem: ImagePaletteItem = {
          id: `img-${Date.now()}-${Math.random()}`,
          name: file.name.split('.')[0].replace(/\s+/g, '_').toLowerCase(),
          src: event.target?.result as string,
          width: 100,
          height: 100,
        };
        setImagePalette(prev => [...prev, newItem]);
        toast.success(`Image "${newItem.name}" added to palette!`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleInsertImagePaletteRef = (refName: string) => {
    const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement;
    const cursor = textarea ? textarea.selectionStart : activePage.content.length;
    const text = activePage.content;
    const imgTag = ` image[${refName}, width=100, height=100, align=center]`;
    const updatedContent = text.substring(0, cursor) + imgTag + text.substring(cursor);

    setPages(prev =>
      prev.map((p, idx) => (idx === activePageIndex ? { ...p, content: updatedContent } : p))
    );
  };

  const handleMultipleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImg: PDFImagePage = {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          src: event.target?.result as string,
          title: file.name.split('.')[0],
          caption: '',
        };
        setUploadedImages((prev) => [...prev, newImg]);
      };
      reader.readAsDataURL(file);
    });
    toast.success('Images added to PDF layout queue!');
  };

  // Compile full cover background loading
  const handleFrontCoverBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = (ev) => {
        setFrontCoverBg(ev.target?.result as string);
        toast.success('Front cover background image loaded!');
      };
      r.readAsDataURL(file);
    }
  };

  const handleImageToPdf = async () => {
    if (uploadedImages.length === 0) {
      return toast.error('Please upload at least one image!');
    }

    triggerExport('images-compiled', 'pdf', async (filename) => {
      toast.loading('Compiling Multi-page PDF...');
      try {
        const { jsPDF } = await import('jspdf');
        const orientation = pdfOrientation;
        const marginVal =
          pdfMargin === 'none' ? 0
          : pdfMargin === 'small' ? 10
          : 15;

        const doc = new jsPDF({
          orientation,
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        uploadedImages.forEach((img, idx) => {
          if (idx > 0) doc.addPage();

          let currentY = marginVal + 10;

          if (img.title.trim()) {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(img.title, marginVal, currentY);
            currentY += 8;
          }

          const maxWidth = pageWidth - marginVal * 2;
          const maxHeight = pageHeight - currentY - marginVal - (img.caption.trim() ? 15 : 5);

          doc.addImage(img.src, 'PNG', marginVal, currentY, maxWidth, maxHeight);
          currentY += maxHeight + 5;

          if (img.caption.trim()) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitCaption = doc.splitTextToSize(img.caption, maxWidth);
            doc.text(splitCaption, marginVal, currentY);
          }
        });

        doc.save(`${filename}.pdf`);
        toast.dismiss();
        toast.success('Multi-page PDF compiled successfully!');
      } catch (err) {
        toast.dismiss();
        toast.error('Compilation failed.');
      }
    });
  };

  // Draw rich text with <b>, <i>, <u>, and highlights/lists parsing into PDF
  const drawRichText = (doc: any, text: string, x: number, y: number, maxWidth: number) => {
    let currentX = x;
    let currentY = y;
    let currentStyle = 'normal';

    const words = text.split(/\s+/);
    doc.setFont('helvetica', 'normal');

    // Bullet points list detection
    const isBulletLine = text.trim().startsWith('*');
    if (isBulletLine) {
      doc.text('•', x - 4, y);
    }

    words.forEach((word) => {
      let fontStyle = currentStyle;
      let cleanWord = word;
      let isUnderline = false;
      let isHighlight = false;

      if (cleanWord.includes('<b>')) {
        fontStyle = 'bold';
        cleanWord = cleanWord.replace('<b>', '');
      }
      if (cleanWord.includes('</b>')) {
        currentStyle = 'normal';
        cleanWord = cleanWord.replace('</b>', '');
      }
      if (cleanWord.includes('<i>')) {
        fontStyle = 'italic';
        cleanWord = cleanWord.replace('<i>', '');
      }
      if (cleanWord.includes('</i>')) {
        currentStyle = 'normal';
        cleanWord = cleanWord.replace('</i>', '');
      }
      if (cleanWord.includes('<u>')) {
        isUnderline = true;
        cleanWord = cleanWord.replace('<u>', '');
      }
      if (cleanWord.includes('</u>')) {
        isUnderline = false;
        cleanWord = cleanWord.replace('</u>', '');
      }
      if (cleanWord.includes('<mark>')) {
        isHighlight = true;
        cleanWord = cleanWord.replace('<mark>', '');
      }
      if (cleanWord.includes('</mark>')) {
        isHighlight = false;
        cleanWord = cleanWord.replace('</mark>', '');
      }

      if (cleanWord.startsWith('*')) {
        cleanWord = cleanWord.replace('*', '');
      }

      doc.setFont('helvetica', fontStyle);
      const wordWidth = doc.getTextWidth(cleanWord + ' ');

      if (currentX + wordWidth > x + maxWidth) {
        currentX = x;
        currentY += 7;
      }

      if (isHighlight) {
        doc.setFillColor(255, 235, 59); // Yellow highlighter
        doc.rect(currentX, currentY - 4.5, wordWidth, 6.5, 'F');
      }

      doc.text(cleanWord, currentX, currentY);
      if (isUnderline) {
        doc.line(currentX, currentY + 1, currentX + wordWidth - 1, currentY + 1);
      }
      currentX += wordWidth;
    });

    return currentY;
  };

  // Compile Book-style chapters and titles to PDF
  const handleCompileBookPdf = async () => {
    triggerExport('book-manuscript', 'pdf', async (filename) => {
      toast.loading('Formatting book layout...');
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. RENDER FRONT COVER (Page 1)
        if (hasFrontCover) {
          if (frontCoverBg) {
            doc.addImage(frontCoverBg, 'JPEG', 0, 0, 210, 297);
          } else {
            doc.setFillColor(15, 23, 42); // Elegant slate-900 front cover
            doc.rect(0, 0, 210, 297, 'F');
          }

          doc.setFontSize(28);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(frontCoverTitle.toUpperCase(), 15, 90);

          doc.setFontSize(14);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(200, 200, 200);
          doc.text(frontCoverSubtitle, 15, 110);

          doc.setFontSize(12);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(255, 255, 255);
          doc.text(`Written by ${frontCoverAuthor}`, 15, 240);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 150, 150);
          doc.text('Published on Ping World Platform', 15, 275);
          doc.addPage();
        }

        // 2. RENDER PAGES & CHAPTERS
        pages.forEach((page, idx) => {
          if (idx > 0 || hasFrontCover) doc.addPage();

          const belongsToChapter = chapters.find((c) => c.id === page.chapterId);
          const isFirstPageOfChapter = page.chapterId && pages.findIndex(p => p.chapterId === page.chapterId) === idx;

          if (page.showTitle) {
            doc.setTextColor(0, 240, 255); // styled book titles

            // Calculate precise alignment coordinates
            const titleWidth = doc.getTextWidth(page.title);
            let titleX = 15;
            if (page.titleAlign === 'center') {
              titleX = (pageWidth - titleWidth) / 2;
            } else if (page.titleAlign === 'right') {
              titleX = pageWidth - 15 - titleWidth;
            }

            if (belongsToChapter && isFirstPageOfChapter) {
              doc.setFontSize(12);
              doc.setFont('helvetica', 'italic');
              doc.text(belongsToChapter.name.toUpperCase(), 15, 20);

              doc.setFontSize(22);
              doc.setFont('helvetica', 'bold');
              doc.text(page.title, titleX, 30);
            } else if (belongsToChapter) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.text(belongsToChapter.name, 15, 12);
              doc.text(page.title, 150, 12);
              doc.line(15, 15, 195, 15);
            } else {
              doc.setFontSize(20);
              doc.setFont('helvetica', 'bold');
              doc.text(page.title, titleX, 25);
            }
          }

          // Main body text flow with paragraph indentation rules
          doc.setTextColor(30, 41, 59); // Dark slate body text
          const startY = page.showTitle ? 42 : 25;
          let currentY = startY;

          const lines = page.content.split('\n');
          lines.forEach((line) => {
            if (line.trim().startsWith('image[')) {
              const imgMatches = line.match(/image\[(.*?)\]/);
              if (imgMatches) {
                const parts = imgMatches[1].split(',');
                const refName = parts[0].trim();
                const paletteItem = imagePalette.find(item => item.name === refName);
                if (paletteItem) {
                  doc.addImage(paletteItem.src, 'PNG', 15, currentY, 60, 60);
                  currentY += 65;
                }
              }
            } else {
              // Apply indented layout to paragraph begins
              const isIndentedBegin = line.length > 5 && !line.trim().startsWith('*');
              const finalX = isIndentedBegin ? 23 : 15; // 8mm left paragraph indent for book compatibility

              currentY = drawRichText(doc, line, finalX, currentY, 180);
              currentY += 7;
            }
          });

          // Draw Footnotes
          if (page.footnotes && page.footnotes.length > 0) {
            let footnoteY = 250;
            doc.line(15, footnoteY - 4, 80, footnoteY - 4);
            page.footnotes.forEach((fn) => {
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.text(`[${fn.number}] ${fn.text}`, 15, footnoteY);
              footnoteY += 5;
            });
          }

          // Footer page numbering
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(`Page ${hasFrontCover ? idx + 2 : idx + 1} | Compiled with Ping World`, 15, 285);
        });

        // 3. RENDER BACK COVER (Page Last)
        if (hasBackCover) {
          doc.addPage();
          doc.setFillColor(15, 23, 42); // Elegant slate back cover
          doc.rect(0, 0, 210, 297, 'F');

          doc.setFontSize(14);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(200, 200, 200);
          const splitSummary = doc.splitTextToSize(backCoverSummary, 160);
          doc.text(splitSummary, 25, 100);

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 240, 255);
          doc.text('PING WORLD CREATIVE STUDIOS', 25, 240);
        }

        doc.save(`${filename}.pdf`);
        toast.dismiss();
        toast.success('PDF manuscript compiled with Front & Back Covers, Footnotes, and Paragraph Indents!');
      } catch (err) {
        toast.dismiss();
        toast.error('Compilation failed.');
      }
    });
  };

  // Compile/Export complete book manuscript as MS Word (.doc compatible HTML XML)
  const handleExportBookAsWord = () => {
    triggerExport('book-manuscript-full', 'doc', (filename) => {
      let htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Book Manuscript</title><meta charset="utf-8">
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; padding: 50px; }
          .cover { text-align: center; margin-top: 100px; page-break-after: always; }
          .cover h1 { font-size: 32pt; font-weight: bold; margin-bottom: 10px; }
          .cover h2 { font-size: 18pt; color: #555; margin-bottom: 200px; }
          .chapter { font-size: 20pt; font-weight: bold; color: #00f0ff; margin-top: 40px; border-bottom: 2px solid #ccc; padding-bottom: 5px; }
          .page-title { font-size: 16pt; font-weight: bold; margin-top: 20px; }
          p { text-indent: 30px; font-size: 11pt; margin-bottom: 10px; text-align: justify; }
          .footnotes { font-size: 9pt; border-top: 1px solid #aaa; margin-top: 50px; padding-top: 10px; }
        </style>
        </head>
        <body>
      `;

      // 1. Add Front Cover
      if (hasFrontCover) {
        htmlContent += `
          <div class="cover">
            <h1>${frontCoverTitle}</h1>
            <h2>${frontCoverSubtitle}</h2>
            <h3>Written by: ${frontCoverAuthor}</h3>
          </div>
        `;
      }

      // 2. Add Chapters & Pages
      pages.forEach((page, idx) => {
        const belongsToChapter = chapters.find((c) => c.id === page.chapterId);
        const isFirstPageOfChapter = page.chapterId && pages.findIndex(p => p.chapterId === page.chapterId) === idx;

        if (belongsToChapter && isFirstPageOfChapter) {
          htmlContent += `<div class="chapter">${belongsToChapter.name}</div>`;
        }

        if (page.showTitle) {
          htmlContent += `<div class="page-title" style="text-align: ${page.titleAlign};">${page.title}</div>`;
        }

        // Clean inline tags into HTML-compatible tags
        const formattedContent = page.content
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br/>')
          .replace(/image\[(.*?)\]/g, '<b>[Image reference: $1]</b>');

        htmlContent += `<p>${formattedContent}</p>`;

        // Footnotes
        if (page.footnotes && page.footnotes.length > 0) {
          htmlContent += `<div class="footnotes">`;
          page.footnotes.forEach((fn) => {
            htmlContent += `<div>[${fn.number}] ${fn.text}</div>`;
          });
          htmlContent += `</div>`;
        }
      });

      // 3. Add Back Cover
      if (hasBackCover) {
        htmlContent += `
          <div style="page-break-before: always; text-align: center; margin-top: 100px;">
            <p>${backCoverSummary}</p>
            <h4 style="color: #00f0ff; margin-top: 200px;">PING WORLD STUDIOS</h4>
          </div>
        `;
      }

      htmlContent += `</body></html>`;

      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full Book manuscript exported as Microsoft Word Document (.doc) successfully!');
    });
  };

  const handlePdfToWordUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setExtractedFileName(file.name);
    toast.loading('Analyzing PDF textual structures...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      const textStream: string[] = [];
      const matches = raw.match(/\((.*?)\)\s*Tj/g);
      if (matches && matches.length > 0) {
        matches.forEach(m => {
          const t = m.slice(1, -4).replace(/\\/g, '');
          if (t.trim() && t.length > 1) {
            textStream.push(t);
          }
        });
      }

      const cleanText = textStream.length > 0
        ? textStream.join('\n')
        : raw ? raw.substring(0, 3000).replace(/[^\x20-\x7E\n\r]/g, '') : 'Parsed Document Content';

      setPdfTextResult(cleanText);
      toast.dismiss();
      toast.success('PDF text structures extracted!');
    };
    reader.readAsText(file);
  };

  const handleExportWordDoc = () => {
    if (!pdfTextResult) return;
    triggerExport('extracted-manuscript', 'doc', (filename) => {
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Converted Word Manuscript</title><meta charset="utf-8"></head>
        <body style="font-family: Calibri, Arial, sans-serif; line-height: 1.6; padding: 40px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #34d399; padding-bottom: 8px;">Extracted PDF Stream</h2>
          <p style="font-size: 14px; color: #1e293b; white-space: pre-wrap;">${pdfTextResult}</p>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Document (.doc) exported!');
    });
  };

  const handleWordToPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWordFile(file);
    toast.loading('Analyzing Word document layout layers...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      const stripped = raw ? raw.replace(/<[^>]*>/g, '').substring(0, 5000) : 'Parsed document content.';
      setWordTextResult(stripped);
      toast.dismiss();
      toast.success('Word manuscript parsed successfully!');
    };
    reader.readAsText(file);
  };

  const handleExportWordToPdf = async () => {
    if (!wordTextContent) return;
    triggerExport('word-converted-doc', 'pdf', async (filename) => {
      toast.loading('Compiling PDF from Word...');
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Converted Word Document Stream', 15, 20);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(wordTextContent, 180);
        doc.text(splitText, 15, 32);

        doc.save(`${filename}.pdf`);
        toast.dismiss();
        toast.success('Word converted to PDF!');
      } catch (err) {
        toast.dismiss();
        toast.error('Conversion failed.');
      }
    });
  };

  const handleAddMergeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      file: f,
    }));
    setMergeFiles([...mergeFiles, ...newFiles]);
    toast.success('Document added to compilation queue!');
  };

  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      return toast.error('Please add at least 2 files to merge!');
    }

    triggerExport("consolidated-merged", "pdf", async (filename) => {
      toast.loading("Merging PDF documents...");
      try {
        const { PDFDocument } = await import("pdf-lib");
        const mergedPdf = await PDFDocument.create();

        for (const item of mergeFiles) {
          if (!item.file) continue;
          const arrayBuffer = await item.file.arrayBuffer();
          const srcDoc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes] as any, { type: "application/pdf" });
        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${filename}.pdf`;
        link.click();

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
        toast.dismiss();
        toast.success("PDFs merged successfully!");
      } catch (err: any) {
        toast.dismiss();
        toast.error(`Merge failed: ${err.message || err}`);
      }
    });
  };

  const activePage = pages[activePageIndex] || pages[0];
  const { wordCount, overflowCount, estimatedPagesNeeded } = calculateTextMetrics(activePage?.content || '');

  const matchedSuggestions = tools
    .filter((t) => t.id !== 'pdf-tools')
    .slice(0, 3);

  return (
    <div className='container mx-auto px-6 py-12 max-w-7xl min-h-screen'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <FileText className='h-3.5 w-3.5' />
            Workspace
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            PDF & Word <span className='gradient-text'>Studio.</span>
          </h1>
          <p className='mt-2 text-pw-muted text-sm leading-relaxed'>
            Sophisticated book publishing workspace with chapter-page structures, front/back covers creator, footnotes, local image palette referencing, and high-fidelity text-stream parses.
          </p>
        </div>
      </div>

      <Card className='bg-transparent ring-0 space-y-4 sm:px-5'>
        <Tabs
          defaultValue='img-to-pdf'
          onValueChange={setActiveTab}
          className='w-full flex flex-col space-y-2'>
          <TabsList
            className='flex bg-white/5 mb-6 min-h-10 w-full max-w-[800px] rounded-full overflow-x-auto'
            style={{
              placeSelf: 'center',
              justifyContent: 'flex-start',
              scrollbarWidth: 'none',
            }}>
            <TabsTrigger value='img-to-pdf' className='gap-2 text-xs h-9 rounded-full px-4 cursor-pointer'>
              <ImageIcon className='h-4 w-4' /> Image To PDF
            </TabsTrigger>
            <TabsTrigger value='text-to-pdf' className='gap-2 text-xs h-9 rounded-full px-4 cursor-pointer'>
              <BookOpen className='h-4 w-4' /> Book & Text Creator
            </TabsTrigger>
            <TabsTrigger value='pdf-to-word' className='gap-2 text-xs h-9 rounded-full px-4 cursor-pointer'>
              <FileCode className='h-4 w-4' /> PDF To Word
            </TabsTrigger>
            <TabsTrigger value='word-to-pdf' className='gap-2 text-xs h-9 rounded-full px-4 cursor-pointer'>
              <FileText className='h-4 w-4' /> Word To PDF
            </TabsTrigger>
            <TabsTrigger value='merge' className='gap-2 text-xs h-9 rounded-full px-4 cursor-pointer'>
              <Layers className='h-4 w-4' /> Merge PDFs
            </TabsTrigger>
          </TabsList>

          {/* IMAGE TO PDF */}
          <TabsContent value='img-to-pdf' className='m-0 space-y-6'>
            {uploadedImages.length === 0 ?
              <div
                onClick={() => fileInputRef.current?.click()}
                className='flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group relative'>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  multiple
                  onChange={handleMultipleImagesUpload}
                  className='hidden'
                />
                <div className='w-16 h-16 rounded-2xl bg-pw-surface border border-white/10 flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform'>
                  <Upload className='h-6 w-6 text-pw-primary' />
                </div>
                <h3 className='text-xl font-bold font-display mb-1'>Upload Target Images</h3>
                <p className='text-pw-muted text-xs max-w-sm'>
                  Upload PNG, JPG, JPEG, or WEBP photos to compile a multi-page PDF document.
                </p>
              </div>
            : <div className='space-y-4'>
                <div className='mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center'>
                  <div className='space-y-1'>
                    <span className='text-[10px] text-pw-muted font-bold uppercase block'>Orientation</span>
                    <select
                      value={pdfOrientation}
                      onChange={(e) => setPdfOrientation(e.target.value as any)}
                      className='bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none w-full cursor-pointer'
                    >
                      <option value='p' className='bg-pw-surface'>Portrait</option>
                      <option value='l' className='bg-pw-surface'>Landscape</option>
                    </select>
                  </div>
                  <div className='space-y-1'>
                    <span className='text-[10px] text-pw-muted font-bold uppercase block'>Page Margin</span>
                    <select
                      value={pdfMargin}
                      onChange={(e) => setPdfMargin(e.target.value as any)}
                      className='bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none w-full cursor-pointer'
                    >
                      <option value='none' className='bg-pw-surface'>None</option>
                      <option value='small' className='bg-pw-surface'>Small (10mm)</option>
                      <option value='normal' className='bg-pw-surface'>Normal (15mm)</option>
                    </select>
                  </div>
                </div>

                <div className='space-y-4 max-h-[500px] overflow-y-auto pr-1'>
                  {uploadedImages.map((img, idx) => (
                    <div key={img.id} className='p-2.5 rounded-xl border border-white/5 bg-white/[0.01] grid grid-cols-1 md:grid-cols-12 gap-3 items-start'>
                      <div className='md:col-span-3 aspect-video rounded-lg overflow-hidden border border-white/10 relative'>
                        <img src={img.src} alt={img.name} className='w-full h-full object-cover' />
                        <span className='absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 rounded-xl text-[10px] text-white font-mono'>
                          Page {idx + 1}
                        </span>
                      </div>
                      <div className='md:col-span-7 grid grid-cols-1 gap-1.5'>
                        <Input
                          value={img.title}
                          onChange={(e) => setUploadedImages(prev => prev.map(m => m.id === img.id ? { ...m, title: e.target.value } : m))}
                          placeholder='Add Page Header...'
                          className='bg-white/5 border-white/10 h-9 text-xs'
                        />
                        <Input
                          value={img.caption}
                          onChange={(e) => setUploadedImages(prev => prev.map(m => m.id === img.id ? { ...m, caption: e.target.value } : m))}
                          placeholder='Add Page Description...'
                          className='bg-white/5 border-white/10 h-9 text-xs'
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={handleImageToPdf} className='btn-primary h-12 gap-2 w-full font-bold'>
                  <Download className='h-4 w-4' /> Compile to PDF
                </Button>
              </div>
            }
          </TabsContent>

          {/* SOPHISTICATED BOOK / TEXT TO PDF WORKSPACE */}
          <TabsContent value='text-to-pdf' className='m-0 space-y-6'>
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
              {/* Stack Navigator Left (Chapters & Pages Tree) */}
              <div className='lg:col-span-4 space-y-4'>
                <Card className='p-4 bg-white/[0.01] border border-white/5 space-y-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-bold text-pw-muted uppercase'>Book Stack Maker</span>
                    <div className='flex gap-1.5'>
                      <Button onClick={() => setShowImagePaletteDialog(true)} size='sm' variant='outline' className='h-8 text-[10px] gap-1'>
                        <ImageIcon className='h-3 w-3 text-pw-primary' /> Image Palette
                      </Button>
                      <Button onClick={saveBookDraft} size='sm' variant='outline' className='h-8 text-[10px] gap-1'>
                        <Save className='h-3 w-3' /> Save Draft
                      </Button>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 gap-2'>
                    <label className='text-[10px] text-pw-muted uppercase'>Stack Element Type</label>
                    <div className='flex gap-2'>
                      <select
                        value={stackType}
                        onChange={(e) => setStackType(e.target.value as any)}
                        className='bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-pw-text focus:outline-none flex-1 cursor-pointer'
                      >
                        <option value='page' className='bg-[#0A0C1B]'>Page</option>
                        <option value='chapter' className='bg-[#0A0C1B]'>Chapter Header</option>
                      </select>
                      <Button onClick={handleAddStackItem} size='sm' className='btn-primary gap-1 h-10'>
                        <Plus className='h-3.5 w-3.5' /> Add Stack
                      </Button>
                    </div>
                  </div>

                  {/* List of Chapters & Pages Under them */}
                  <div className='space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar pt-2'>
                    {chapters.map((ch) => {
                      const chPages = pages.filter((p) => p.chapterId === ch.id);
                      return (
                        <div key={ch.id} className='space-y-1.5'>
                          {/* Chapter Header with direct rename input & Delete button */}
                          <div className='flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 gap-2'>
                            <Input
                              value={ch.name}
                              onChange={(e) => handleEditChapterName(ch.id, e.target.value)}
                              className='h-8 bg-transparent border-none text-xs font-bold text-pw-primary font-mono focus-visible:ring-0 p-0 flex-1'
                            />
                            <div className='flex items-center gap-1 shrink-0'>
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => handleDeleteChapter(ch.id)}
                                className='h-6 w-6 text-pw-muted hover:text-pw-danger'
                                title='Delete Chapter'
                              >
                                <Trash2 className='h-3 w-3' />
                              </Button>
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => {
                                  const newPage: BookPage = {
                                    id: `pg-${Date.now()}`,
                                    title: `Page ${pages.length + 1} Title`,
                                    showTitle: true,
                                    content: '',
                                    chapterId: ch.id,
                                    titleAlign: 'left',
                                    titleColor: '#00f0ff',
                                    titleBgColor: 'transparent',
                                    titlePadding: 4,
                                    titleMargin: 10,
                                    footnotes: []
                                  };
                                  setPages([...pages, newPage]);
                                  setActivePageIndex(pages.length);
                                }}
                                title='Add page under chapter'
                                className='h-6 w-6 text-pw-muted hover:text-pw-primary'
                              >
                                <Plus className='h-3 w-3' />
                              </Button>
                            </div>
                          </div>

                          {/* Pages Indented slightly under chapter */}
                          <div className='pl-3.5 space-y-1 border-l border-white/10'>
                            {chPages.map((page) => {
                              const pIdx = pages.findIndex((p) => p.id === page.id);
                              return (
                                <div
                                  key={page.id}
                                  onClick={() => setActivePageIndex(pIdx)}
                                  className={cn(
                                    'p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors',
                                    activePageIndex === pIdx ? 'bg-pw-primary/10 text-pw-primary' : 'hover:bg-white/[0.02] text-pw-muted'
                                  )}
                                >
                                  <div className='flex items-center gap-1.5 truncate'>
                                    <span className='font-mono text-[10px] text-pw-primary'>pg-{pIdx + 1}</span>
                                    <span className='truncate'>{page.title || 'Untitled Page'}</span>
                                  </div>
                                  <div className='flex items-center gap-1.5 shrink-0'>
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePage(page.id);
                                      }}
                                      className='h-5 w-5 text-pw-muted hover:text-pw-danger'
                                      title='Delete Page'
                                    >
                                      <Trash2 className='h-3 w-3' />
                                    </Button>
                                    <span className='text-[8px] font-bold font-mono px-1 py-0.5 rounded bg-white/5 uppercase'>
                                      pg
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Independent Pages (No chapter) */}
                    {pages.filter(p => !p.chapterId).length > 0 && (
                      <div className='space-y-1.5 pt-2 border-t border-white/5'>
                        <span className='text-[10px] font-bold text-pw-muted uppercase pl-1'>Independent Pages</span>
                        {pages.filter(p => !p.chapterId).map((page) => {
                          const pIdx = pages.findIndex(p => p.id === page.id);
                          return (
                            <div
                              key={page.id}
                              onClick={() => setActivePageIndex(pIdx)}
                              className={cn(
                                'p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors',
                                activePageIndex === pIdx ? 'bg-pw-primary/10 text-pw-primary' : 'hover:bg-white/[0.02] text-pw-muted'
                              )}
                            >
                              <div className='flex items-center gap-1.5 truncate'>
                                <span className='font-mono text-[10px] text-pw-primary'>pg-{pIdx + 1}</span>
                                <span className='truncate'>{page.title || 'Untitled Page'}</span>
                              </div>
                              <div className='flex items-center gap-1.5 shrink-0'>
                                <Button
                                  size='icon'
                                  variant='ghost'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePage(page.id);
                                  }}
                                  className='h-5 w-5 text-pw-muted hover:text-pw-danger'
                                  title='Delete Page'
                                >
                                  <Trash2 className='h-3 w-3' />
                                </Button>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowStickyChapterSelector(page.id);
                                  }}
                                  className='text-[8px] font-bold font-mono px-1 py-0.5 rounded bg-pw-primary/20 text-pw-primary uppercase hover:bg-pw-primary/30 shrink-0'
                                >
                                  Assign Ch
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Sticky chapter re-assignment select list */}
                {showStickyChapterSelector && (
                  <Card className='p-3 border border-pw-primary/20 bg-pw-primary/5 space-y-2'>
                    <span className='text-[10px] font-bold uppercase text-pw-primary block'>Select Chapter Target</span>
                    <div className='space-y-1'>
                      {chapters.map((ch) => (
                        <Button
                          key={ch.id}
                          variant='ghost'
                          onClick={() => handlePageSelectChapter(showStickyChapterSelector, ch.id)}
                          className='w-full justify-start h-8 text-xs text-pw-muted hover:text-white'
                        >
                          {ch.name}
                        </Button>
                      ))}
                      <Button
                        variant='ghost'
                        onClick={() => handlePageSelectChapter(showStickyChapterSelector, null)}
                        className='w-full justify-start h-8 text-xs text-pw-danger hover:bg-pw-danger/10'
                      >
                        Make Independent (No Chapter)
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* Editor Workspace Right */}
              <div className='lg:col-span-8 space-y-4'>
                {/* Front & Back Cover Creator (Dynamic Panel) */}
                <Card className='p-5 bg-white/[0.01] border border-white/5 space-y-4'>
                  <div className='flex items-center justify-between border-b border-white/5 pb-2'>
                    <span className='text-xs font-bold uppercase text-pw-primary flex items-center gap-1.5'>
                      <Sparkles className='h-4 w-4' /> Covers Creator (Front & Back Cover)
                    </span>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Front Cover Settings */}
                    <div className='space-y-3 p-3.5 rounded-xl bg-white/[0.01] border border-white/5'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-white'>Front Cover</span>
                        <label className='text-[10px] text-pw-muted flex items-center gap-1 cursor-pointer select-none'>
                          <input type='checkbox' checked={hasFrontCover} onChange={(e) => setHasFrontCover(e.target.checked)} /> Include Cover
                        </label>
                      </div>
                      <Input
                        value={frontCoverTitle}
                        onChange={(e) => setFrontCoverTitle(e.target.value)}
                        placeholder='Book Main Title...'
                        className='bg-white/5 border-white/10 h-9 text-xs'
                      />
                      <Input
                        value={frontCoverSubtitle}
                        onChange={(e) => setFrontCoverSubtitle(e.target.value)}
                        placeholder='Sub-title...'
                        className='bg-white/5 border-white/10 h-9 text-xs'
                      />
                      <Input
                        value={frontCoverAuthor}
                        onChange={(e) => setFrontCoverAuthor(e.target.value)}
                        placeholder='Author Name...'
                        className='bg-white/5 border-white/10 h-9 text-xs'
                      />
                      <div className='space-y-1'>
                        <span className='text-[9px] text-pw-muted uppercase font-bold block'>Cover Background Image</span>
                        <Input type='file' accept='image/*' onChange={handleFrontCoverBgUpload} className='bg-white/5 border-white/10 h-9 text-xs' />
                      </div>
                    </div>

                    {/* Back Cover Settings */}
                    <div className='space-y-3 p-3.5 rounded-xl bg-white/[0.01] border border-white/5'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-white'>Back Cover</span>
                        <label className='text-[10px] text-pw-muted flex items-center gap-1 cursor-pointer select-none'>
                          <input type='checkbox' checked={hasBackCover} onChange={(e) => setHasBackCover(e.target.checked)} /> Include Back
                        </label>
                      </div>
                      <textarea
                        value={backCoverSummary}
                        onChange={(e) => setBackCoverSummary(e.target.value)}
                        placeholder='Book Summary / Back blurb...'
                        className='w-full h-24 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-pw-primary resize-none'
                      />
                      <div className='space-y-1.5'>
                        <span className='text-[9px] text-pw-muted uppercase font-bold block'>Back Cover Color</span>
                        <Input value={backCoverBgColor} onChange={(e) => setBackCoverBgColor(e.target.value)} className='bg-white/5 border-white/10 h-8 text-xs font-mono' />
                      </div>
                    </div>
                  </div>
                </Card>

                {activePage ? (
                  <Card className='p-6 bg-white/[0.01] border border-white/5 space-y-4'>
                    {/* Header Controls (Title alignment & Toggle) */}
                    <div className='flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-4'>
                      <div className='flex items-center gap-2'>
                        <Button
                          onClick={() => setShowTitleConfig(showTitleConfig ? null : activePage.id)}
                          size='sm'
                          variant='outline'
                          className='h-8 text-xs gap-1 border-white/10'
                        >
                          <Settings className='h-3.5 w-3.5' /> Title Settings
                        </Button>
                        <label className='text-xs text-pw-muted flex items-center gap-1.5 cursor-pointer select-none'>
                          <input
                            type='checkbox'
                            checked={activePage.showTitle}
                            onChange={(e) =>
                              setPages(prev =>
                                prev.map((p, idx) => (idx === activePageIndex ? { ...p, showTitle: e.target.checked } : p))
                              )
                            }
                            className='rounded border-white/10'
                          />
                          Show Title
                        </label>
                      </div>

                      {/* Display estimated metrics & warnings */}
                      <div className='flex items-center gap-3'>
                        <span className='text-[10px] font-mono text-pw-muted bg-white/5 px-2 py-0.5 rounded'>
                          {wordCount} words
                        </span>
                        {overflowCount > 0 ? (
                          <span className='text-[10px] font-bold text-pw-warning bg-pw-warning/10 border border-pw-warning/20 px-2 py-0.5 rounded animate-pulse'>
                            ⚠️ Overflow! (Est: {estimatedPagesNeeded} pages)
                          </span>
                        ) : (
                          <span className='text-[10px] font-bold text-pw-success bg-pw-success/10 border border-pw-success/20 px-2 py-0.5 rounded'>
                            Fits on 1 Page
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title Configuration Sticky Box */}
                    {showTitleConfig === activePage.id && (
                      <Card className='p-4 border border-white/10 bg-black/40 space-y-3'>
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='space-y-1.5'>
                            <label className='text-[10px] text-pw-muted uppercase font-bold'>Title Color</label>
                            <Input
                              value={activePage.titleColor}
                              onChange={(e) =>
                                setPages(prev =>
                                  prev.map((p, idx) => (idx === activePageIndex ? { ...p, titleColor: e.target.value } : p))
                                )
                              }
                              className='h-9 bg-white/5 border-white/10 text-xs font-mono'
                            />
                          </div>
                          <div className='space-y-1.5'>
                            <label className='text-[10px] text-pw-muted uppercase font-bold'>Alignment</label>
                            <div className='flex gap-1'>
                              <Button
                                size='sm'
                                variant={activePage.titleAlign === 'left' ? 'default' : 'outline'}
                                onClick={() =>
                                  setPages(prev =>
                                    prev.map((p, idx) => (idx === activePageIndex ? { ...p, titleAlign: 'left' } : p))
                                  )
                                }
                                className='h-8 px-2.5'
                              >
                                <AlignLeft className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                size='sm'
                                variant={activePage.titleAlign === 'center' ? 'default' : 'outline'}
                                onClick={() =>
                                  setPages(prev =>
                                    prev.map((p, idx) => (idx === activePageIndex ? { ...p, titleAlign: 'center' } : p))
                                  )
                                }
                                className='h-8 px-2.5'
                              >
                                <AlignCenter className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                size='sm'
                                variant={activePage.titleAlign === 'right' ? 'default' : 'outline'}
                                onClick={() =>
                                  setPages(prev =>
                                    prev.map((p, idx) => (idx === activePageIndex ? { ...p, titleAlign: 'right' } : p))
                                  )
                                }
                                className='h-8 px-2.5'
                              >
                                <AlignRight className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Page Content Fields */}
                    <div className='space-y-3'>
                      {activePage.showTitle && (
                        <Input
                          value={activePage.title}
                          onChange={(e) =>
                            setPages(prev =>
                              prev.map((p, idx) => (idx === activePageIndex ? { ...p, title: e.target.value } : p))
                            )
                          }
                          placeholder='Add Page Header title...'
                          className='bg-white/5 border-white/10 h-10 text-sm font-bold focus:border-pw-primary rounded-xl'
                        />
                      )}

                      {/* Formatting Tool bar above body text (Handles selected text formatting & Highlights) */}
                      <div className='flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/10 flex-wrap'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleFormatSelectedText('b')}
                          title='Bold (Wrap selection)'
                          className='h-8 px-2.5 hover:bg-white/5'
                        >
                          <Bold className='h-4 w-4 text-pw-primary' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleFormatSelectedText('i')}
                          title='Italic (Wrap selection)'
                          className='h-8 px-2.5 hover:bg-white/5'
                        >
                          <Italic className='h-4 w-4 text-pw-primary' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleFormatSelectedText('u')}
                          title='Underline (Wrap selection)'
                          className='h-8 px-2.5 hover:bg-white/5'
                        >
                          <Underline className='h-4 w-4 text-pw-primary' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleFormatSelectedText('mark')}
                          title='Highlight Text (Wrap selection)'
                          className='h-8 px-2.5 hover:bg-white/5 text-pw-warning text-[10px] font-bold'
                        >
                          Highlight
                        </Button>
                      </div>

                      <textarea
                        id='body-textarea'
                        value={activePage.content}
                        onChange={(e) =>
                          setPages(prev =>
                            prev.map((p, idx) => (idx === activePageIndex ? { ...p, content: e.target.value } : p))
                          )
                        }
                        placeholder='Type body content. Bullet lists (* item) and inline tags like <b>bold</b>, <i>italic</i>, and <mark>highlights</mark> are fully supported!'
                        className='w-full h-80 bg-white/5 border border-white/10 rounded-xl p-4 text-xs focus:border-pw-primary focus:outline-none resize-none leading-relaxed font-body text-pw-text'
                      />
                    </div>

                    {/* Footnotes Panel */}
                    <div className='border-t border-white/5 pt-4 space-y-3.5'>
                      <div className='flex justify-between items-center'>
                        <h4 className='text-xs font-bold uppercase tracking-wider text-pw-muted'>Footnotes & References</h4>
                        <span className='text-[10px] text-pw-muted font-mono'>{activePage.footnotes?.length || 0} active</span>
                      </div>

                      {activePage.footnotes && activePage.footnotes.length > 0 && (
                        <div className='space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar'>
                          {activePage.footnotes.map((fn) => (
                            <div key={fn.id} className='flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs'>
                              <div className='flex items-center gap-2 truncate'>
                                <span className='font-mono font-bold text-pw-primary'>[{fn.number}]</span>
                                <span className='truncate text-pw-muted'>{fn.text}</span>
                              </div>
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => handleRemoveFootnote(fn.id)}
                                className='h-6 w-6 text-pw-muted hover:text-pw-danger'
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className='flex gap-2'>
                        <Input
                          value={footnoteInput}
                          onChange={(e) => setFootnoteInput(e.target.value)}
                          placeholder='Add footnote text...'
                          className='h-10 bg-white/5 border-white/10 text-xs'
                          onKeyDown={(e) => e.key === 'Enter' && handleAddFootnote()}
                        />
                        <Button onClick={handleAddFootnote} size='sm' className='btn-primary h-10 px-4 text-xs font-bold shrink-0'>
                          Add Footnote
                        </Button>
                      </div>
                    </div>

                    {/* Export compilation options */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-2'>
                      <Button onClick={handleCompileBookPdf} className='btn-primary h-12 gap-2 font-bold'>
                        <Download className='h-4 w-4' /> Compile Full Book PDF
                      </Button>
                      <Button onClick={handleExportBookAsWord} className='btn-secondary h-12 gap-2 font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10'>
                        <FileCode className='h-4 w-4' /> Export Book as Word (.doc)
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <p className='text-center py-20 text-pw-muted text-xs'>No active pages found. Add a page or chapter stack on the left navigator.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* PDF TO WORD */}
          <TabsContent value='pdf-to-word' className='m-0 space-y-6'>
            {!pdfTextResult ?
              <div
                onClick={() => document.getElementById('pdf-to-word-input')?.click()}
                className='flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group relative'
              >
                <input
                  id='pdf-to-word-input'
                  type='file'
                  accept='.pdf'
                  onChange={handlePdfToWordUpload}
                  className='hidden'
                />
                <div className='w-12 h-12 rounded-2xl bg-pw-surface border border-white/10 flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform'>
                  <Upload className='h-6 w-6 text-pw-secondary' />
                </div>
                <h3 className='text-xl font-bold font-display mb-1'>Upload PDF Document</h3>
                <p className='text-pw-muted text-xs max-w-sm'>
                  Extracts text streams and structures a genuine Microsoft Word (.doc) document.
                </p>
              </div>
            : <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <p className='text-xs text-pw-success font-bold uppercase'>
                    Extracted Stream: {extractedFileName}
                  </p>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setPdfTextResult('');
                      setExtractedFileName('');
                    }}
                    className='h-9 px-3 border-white/5 hover:bg-white/5 text-pw-muted hover:text-pw-text'
                  >
                    Reset
                  </Button>
                </div>
                <div className='bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-mono max-h-60 overflow-y-auto select-all leading-relaxed whitespace-pre-wrap text-pw-text'>
                  {pdfTextResult}
                </div>
                <Button onClick={handleExportWordDoc} className='btn-primary h-12 gap-2 w-full font-bold'>
                  <Download className='h-4 w-4' /> Export as Microsoft Word Document (.doc)
                </Button>
              </div>
            }
          </TabsContent>

          {/* WORD TO PDF */}
          <TabsContent value='word-to-pdf' className='m-0 space-y-6'>
            {!wordTextContent ?
              <div
                onClick={() => document.getElementById('word-to-pdf-input')?.click()}
                className='flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group relative'
              >
                <input
                  id='word-to-pdf-input'
                  type='file'
                  accept='.doc,.docx,.txt'
                  onChange={handleWordToPdfUpload}
                  className='hidden'
                />
                <div className='w-12 h-12 rounded-2xl bg-pw-surface border border-white/10 flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform'>
                  <Upload className='h-6 w-6 text-pw-primary' />
                </div>
                <h3 className='text-xl font-bold font-display mb-1 flex items-center gap-1.5'>
                  Upload Word Document (.doc, .docx, .txt)
                </h3>
                <p className='text-pw-muted text-xs max-w-sm'>
                  Compiles Word document layout layers into standard formatted PDF documents.
                </p>
              </div>
            : <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <p className='text-xs text-pw-success font-bold uppercase'>Loaded Word Content:</p>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setWordFile(null);
                      setWordTextResult('');
                    }}
                    className='h-9 px-3 border-white/5 hover:bg-white/5 text-pw-muted hover:text-pw-text'
                  >
                    Reset
                  </Button>
                </div>
                <textarea
                  value={wordTextContent}
                  onChange={(e) => setWordTextResult(e.target.value)}
                  className='w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-pw-text focus:outline-none focus:border-pw-primary'
                />
                <Button onClick={handleExportWordToPdf} className='btn-primary h-12 gap-2 w-full font-bold'>
                  <Download className='h-4 w-4' /> Export as PDF Document
                </Button>
              </div>
            }
          </TabsContent>

          {/* MERGE PDFs */}
          <TabsContent value='merge' className='m-0 space-y-6'>
            <div className='space-y-4'>
              <div className='flex justify-between items-center flex-wrap gap-4'>
                <h3 className='text-sm font-bold flex items-center gap-1.5 text-pw-muted'>
                  <Sliders className='h-4 w-4 text-pw-primary' /> Consolidation Queue ({mergeFiles.length} files)
                </h3>
                <Button
                  onClick={() => document.getElementById('pdf-merge-input')?.click()}
                  variant='outline'
                  className='h-10 border-white/10 hover:bg-white/5 text-xs font-bold gap-2'
                >
                  <Upload className='h-4 w-4' /> Add Documents
                </Button>
                <input
                  id='pdf-merge-input'
                  type='file'
                  multiple
                  accept='.pdf'
                  className='hidden'
                  onChange={handleAddMergeFile}
                />
              </div>

              <div className='space-y-2.5 max-h-60 overflow-y-auto'>
                {mergeFiles.map((file) => (
                  <div key={file.id} className='p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between'>
                    <div>
                      <span className='text-xs font-bold text-pw-text'>{file.name}</span>
                      <span className='text-[10px] text-pw-muted block mt-0.5'>{file.size}</span>
                    </div>
                    <Button
                      onClick={() => setMergeFiles(mergeFiles.filter((f) => f.id !== file.id))}
                      variant='ghost'
                      className='h-8 w-8 p-0 text-pw-muted hover:text-pw-danger'
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                ))}

                {mergeFiles.length < 2 && (
                  <p className='text-center py-10 text-xs text-pw-muted'>
                    Queue must have at least 2 files to merge. Add more documents to compile.
                  </p>
                )}
              </div>

              <Button onClick={executeMerge} disabled={mergeFiles.length < 2} className='btn-primary h-12 gap-2 w-full font-bold mt-4'>
                <Layers className='h-4 w-4' /> Merge
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Suggested utilities */}
      <div className='mt-20 space-y-6'>
        <h2 className='text-2xl font-bold font-display flex items-center gap-2'>
          <Sparkles className='h-5 w-5 text-pw-primary animate-pulse' /> Suggested Utilities
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {matchedSuggestions.map((tool) => (
            <a href={tool.href} key={tool.id} className='group'>
              <Card className='card-glow p-5 flex flex-col h-full bg-[#0c0d1c] border border-white/5 hover:border-pw-primary/30 transition-all cursor-pointer'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='w-10 h-10 rounded-xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-xl group-hover:scale-105 transition-all'>
                    <tool.icon className='h-5 w-5' style={{ color: tool.color }} />
                  </div>
                  <span className='text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-pw-muted'>
                    {tool.tag}
                  </span>
                </div>
                <h4 className='text-base font-bold text-pw-text group-hover:text-pw-primary transition-colors flex items-center gap-1'>
                  {tool.title}
                  <ChevronRight className='h-4 w-4 text-pw-muted group-hover:text-pw-primary' />
                </h4>
                <p className='text-xs text-pw-muted mt-2 leading-relaxed flex-1'>
                  {tool.description}
                </p>
              </Card>
            </a>
          ))}
        </div>
      </div>

      {/* Image Palette Dialog Modal */}
      <Dialog open={showImagePaletteDialog} onOpenChange={setShowImagePaletteDialog}>
        <DialogContent className='max-w-xl w-full bg-[#0c0d1c] border border-white/10 rounded-2xl text-pw-text p-6 max-h-[85vh] overflow-y-auto custom-scrollbar'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold font-display flex items-center gap-1.5'>
              <ImageIcon className='h-5 w-5 text-pw-primary' /> Image Reference Palette
            </DialogTitle>
            <DialogDescription className='text-xs text-pw-muted'>
              Upload images to your book palette, rename them, and reference them in your page body using the syntax: <span className='font-mono text-pw-primary font-bold'>image[ref_name]</span>.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-6 pt-4'>
            {/* Upload Area */}
            <div
              onClick={() => document.getElementById('palette-upload-input')?.click()}
              className='flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all'
            >
              <input
                id='palette-upload-input'
                type='file'
                accept='image/*'
                onChange={handleImagePaletteUpload}
                className='hidden'
              />
              <Upload className='h-5 w-5 text-pw-muted mb-2' />
              <span className='text-xs font-bold'>Upload Image Asset</span>
              <span className='text-[10px] text-pw-muted mt-1'>PNG, JPG, WEBP formats</span>
            </div>

            {/* List of active images in the palette */}
            <div className='space-y-4'>
              <span className='text-[10px] font-bold uppercase tracking-wider text-pw-muted'>Active Palette Assets ({imagePalette.length})</span>
              <div className='grid grid-cols-2 gap-4'>
                {imagePalette.map((item) => (
                  <Card key={item.id} className='p-3 bg-white/[0.02] border border-white/5 space-y-2 rounded-xl relative group'>
                    <div className='aspect-video rounded-lg overflow-hidden border border-white/10 relative'>
                      <img src={item.src} alt={item.name} className='w-full h-full object-cover' />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-[9px] font-bold text-pw-muted uppercase'>Reference Name</label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          setImagePalette(prev =>
                            prev.map(img => img.id === item.id ? { ...img, name: e.target.value.toLowerCase().replace(/\s+/g, '_') } : img)
                          )
                        }
                        className='h-8 bg-white/5 border-white/10 text-xs font-mono text-pw-primary'
                      />
                    </div>
                    <div className='flex gap-1.5 pt-1.5'>
                      <Button onClick={() => handleInsertImagePaletteRef(item.name)} size='sm' className='h-8 text-[10px] btn-primary flex-1'>
                        Insert to Content
                      </Button>
                      <Button
                        onClick={() => setImagePalette(prev => prev.filter(img => img.id !== item.id))}
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-pw-muted hover:text-pw-danger'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowImagePaletteDialog(false)} variant='outline' className='h-10 text-xs px-6 border-white/10'>
              Close Palette
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNameModalOpen} onOpenChange={setIsNameModalOpen}>
        <DialogContent className='max-w-md w-full bg-[#0c0d1c] pt-5 border border-white/10 rounded-2xl shadow-2xl text-pw-text'>
          <DialogHeader className='p-2'>
            <DialogTitle className='text-xl font-extrabold font-display'>Export Name Customization</DialogTitle>
            <DialogDescription className='text-pw-muted text-xs'>
              Specify the filename you want to save. Do not include extensions.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='relative'>
              <Input
                value={filenameInput}
                onChange={(e) => setFilenameInput(e.target.value)}
                placeholder='Enter filename...'
                className='card-glow bg-transparent h-11 text-sm border-white/5 focus-visible:ring-0 w-full'
              />
              <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-pw-primary font-mono uppercase'>
                .{filenameExtension}
              </span>
            </div>
          </div>

          <DialogFooter className='flex flex-col sm:flex-row gap-2'>
            <button
              onClick={() => setIsNameModalOpen(false)}
              className='flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-pw-muted hover:text-pw-text transition-all'
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmFilename}
              className='flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold text-white'
            >
              Export
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
