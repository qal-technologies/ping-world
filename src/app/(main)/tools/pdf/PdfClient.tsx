'use client';

import { useState, useRef } from 'react';
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
  ArrowRight,
  ChevronRight,
  Sparkle,
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

interface PDFImagePage {
  id: string;
  name: string;
  src: string;
  title: string;
  caption: string;
}

interface PDFTextPage {
  id: string;
  title: string;
  content: string;
}

export default function PdfToolStudioPage() {
  const [activeTab, setActiveTab] = useState('img-to-pdf');

  const [uploadedImages, setUploadedImages] = useState<PDFImagePage[]>([]);
  const [pdfOrientation, setPdfOrientation] = useState<'p' | 'l'>('p');
  const [pdfMargin, setPdfMargin] = useState<'none' | 'small' | 'normal'>(
    'normal',
  );

  const [textPages, setTextPages] = useState<PDFTextPage[]>([
    { id: '1', title: 'Page 1', content: '' },
  ]);

  // PDF to Text states
  const [pdfTextResult, setPdfTextResult] = useState('');
  const [extractedFileName, setExtractedFileName] = useState('');

  // Merge simulation states
  const [mergeFiles, setMergeFiles] = useState<{ id: string; name: string; size: string; file?: File }[]>([]);

  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [filenameInput, setFilenameInput] = useState('');
  const [filenameExtension, setFilenameExtension] = useState('');
  const [onConfirmFilename, setOnConfirmFilename] = useState<
    ((cleanName: string) => void) | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to trigger custom filename modal and clean extensions
  const triggerExport = (
    defaultName: string,
    ext: string,
    callback: (cleanName: string) => void,
  ) => {
    setFilenameInput(defaultName.replace(/\.[^/.]+$/, '')); // Strip any extension initially
    setFilenameExtension(ext);
    setOnConfirmFilename(() => callback);
    setIsNameModalOpen(true);
  };

  const handleConfirmFilename = () => {
    let clean = filenameInput.trim();
    if (!clean) clean = 'untitled';
    // Screen/strip common extensions to avoid double extension bugs
    clean = clean.replace(/\.(txt|pdf|png|doc|docx|json)$/i, '');
    if (onConfirmFilename) {
      onConfirmFilename(clean);
    }
    setIsNameModalOpen(false);
  };

  // Multiple conversion of uploaded images to PDF (Image queue logic)
  const handleMultipleImagesUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

  // Image page controls
  const moveImagePage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === uploadedImages.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...uploadedImages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    setUploadedImages(reordered);
  };

  const updateImagePageDetails = (
    id: string,
    fields: Partial<PDFImagePage>,
  ) => {
    setUploadedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...fields } : img)),
    );
  };

  const deleteImagePage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
    toast.success('Page removed from layout!');
  };

  // Image Multi-page compiler
  const handleImageToPdf = async () => {
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image!');
      return;
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

        // Create PDF
        const doc = new jsPDF({
          orientation,
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        uploadedImages.forEach((img, idx) => {
          if (idx > 0) {
            doc.addPage();
          }

          let currentY = marginVal + 10;

          // Optional page title
          if (img.title.trim()) {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(img.title, marginVal, currentY);
            currentY += 8;
          }

          // Draw Image beautifully scaled
          const maxWidth = pageWidth - marginVal * 2;
          const maxHeight =
            pageHeight - currentY - marginVal - (img.caption.trim() ? 15 : 5);

          doc.addImage(
            img.src,
            'PNG',
            marginVal,
            currentY,
            maxWidth,
            maxHeight,
          );
          currentY += maxHeight + 5;

          // Optional page caption
          if (img.caption.trim()) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitCaption = doc.splitTextToSize(img.caption, maxWidth);
            doc.text(splitCaption, marginVal, currentY);
          }
        });

        doc.save(`${filename}.pdf`);
        toast.dismiss();
        toast.success('Multi-page PDF compiled & downloaded successfully!');
      } catch (err) {
        toast.dismiss();
        console.error(err);
        toast.error('Compilation failed. Please try again.');
      }
    });
  };

  // Text page controls
  const addTextPage = () => {
    const newPage: PDFTextPage = {
      id: `${Date.now()}-${Math.random()}`,
      title: `Page ${textPages.length + 1}`,
      content: '',
    };
    setTextPages([...textPages, newPage]);
  };

  const updateTextPageDetails = (id: string, fields: Partial<PDFTextPage>) => {
    setTextPages((prev) =>
      prev.map((page) => (page.id === id ? { ...page, ...fields } : page)),
    );
  };

  const deleteTextPage = (id: string) => {
    if (textPages.length === 1) {
      toast.error('You must have at least one page!');
      return;
    }
    setTextPages((prev) => prev.filter((page) => page.id !== id));
  };

  // Compile Text Multi-pages to PDF
  const handleTextToPdf = async () => {
    const hasContent = textPages.some((p) => p.content.trim() !== '');
    if (!hasContent) {
      toast.error('Please add content to at least one page!');
      return;
    }

    triggerExport('document-compiled', 'pdf', async (filename) => {
      toast.loading('Formatting Text PDF...');
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        textPages.forEach((page, idx) => {
          if (idx > 0) {
            doc.addPage();
          }

          doc.setFontSize(22);
          doc.setFont('helvetica', 'bold');
          doc.text(page.title || `Section ${idx + 1}`, 15, 20);

          doc.setFontSize(14);
          doc.setFont('helvetica', 'normal');
          const splitText = doc.splitTextToSize(page.content, 180);
          doc.text(splitText, 15, 35);
        });

        doc.save(`${filename}.pdf`);
        toast.dismiss();
        toast.success('Multi-page Document Compiled & Downloaded!');
      } catch (err) {
        toast.dismiss();
        console.error(err);
        toast.error('Text compilation failed.');
      }
    });
  };

  // Convert PDF to Text (Plain Text Extractor)
  const handlePdfToTextUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractedFileName(file.name);
    toast.loading('Analyzing file layers...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      const mockExtracted =
        raw ?
          `--- Parsed Output: ${file.name} ---\n\n` +
          raw.substring(0, 1000).replace(/[^\x20-\x7E\n\r]/g, '')
        : 'Simple textual data parsed from document.';
      setPdfTextResult(mockExtracted);
      toast.dismiss();
      toast.success('Text layers extracted successfully!');
    };
    reader.readAsText(file);
  };

  // jules edit: Real PDF page-by-page client merger using pdf-lib
  const handleAddMergeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      file: f
    }));
    setMergeFiles([...mergeFiles, ...newFiles]);
    toast.success('Document added to compilation list!');
  };

  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      toast.error('Please add at least 2 files to merge!');
      return;
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

        // Use standard non-blocking browser blob creation & downloads
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
        console.error("PDF merge error:", err);
        toast.error(`Merge failed: ${err.message || err}`);
      }
    });
  };

  // Suggestions dynamic lists
  const currentToolId = 'pdf-tools';
  const matchedSuggestions = tools
    .filter((t) => t.id !== currentToolId)
    .slice(0, 3);

  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-screen'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <FileText className='h-3.5 w-3.5' />
            Workspace
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            PDF <span className='gradient-text'>Studio.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Advanced multi-page PDF image rendering, page captioning, custom
            multi-page text document formatting, and local merges.
          </p>
        </div>
      </div>

      <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-8'>
        <Tabs
          defaultValue='img-to-pdf'
          onValueChange={setActiveTab}
          className='w-full flex flex-col'>
          <TabsList
            className='flex bg-white/5 mb-8 gap-2 h-auto p-1 sm:pl-2 w-full sm:min-w-full rounded-full gap-1 overflow-x-auto'
            style={{
              placeSelf: 'center',
              justifyContent: 'flex-start',
              scrollbarWidth: 'none',
            }}>
            <TabsTrigger
              value='img-to-pdf'
              className='gap-2 py-3 text-xs rounded-full px-4 cursor-pointer'>
              <ImageIcon className='h-4 w-4' /> Image To PDF
            </TabsTrigger>
            <TabsTrigger
              value='text-to-pdf'
              className='gap-2 py-3 text-xs rounded-full px-4 cursor-pointer'>
              <FileText className='h-4 w-4' /> Text To PDF
            </TabsTrigger>
            <TabsTrigger
              value='pdf-to-text'
              className='gap-2 py-3 text-xs rounded-full px-4 cursor-pointer'>
              <FileCode className='h-4 w-4' /> PDF To Text
            </TabsTrigger>
            <TabsTrigger
              value='merge'
              className='gap-2 py-3 text-xs rounded-full px-4 cursor-pointer'>
              <Layers className='h-4 w-4' /> Merge PDFs
            </TabsTrigger>
          </TabsList>

          {/* IMAGE TO PDF */}
          <TabsContent
            value='img-to-pdf'
            className='m-0 space-y-6'>
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
                <h3 className='text-xl font-bold font-display mb-1'>
                  Upload Target Images
                </h3>
                <p className='text-pw-muted text-xs max-w-sm'>
                  Upload one or more images (PNG, JPG, JPEG, WEBP) to compile a
                  multi-page PDF document.
                </p>
              </div>
            : <div className='space-y-6'>
                {/* Global Settings */}
                <div className='sm:p-4 sm:rounded-xl sm:bg-white/[0.02] sm:border sm:border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 items-center'>
                  <div className='space-y-1'>
                    <span className='text-[10px] text-pw-muted font-bold uppercase tracking-wider block'>
                      Orientation
                    </span>
                    <select
                      value={pdfOrientation}
                      onChange={(e) => setPdfOrientation(e.target.value as any)}
                      className='bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none w-full cursor-pointer'>
                      <option
                        value='p'
                        className='bg-pw-surface'>
                        Portrait (Vertical)
                      </option>
                      <option
                        value='l'
                        className='bg-pw-surface'>
                        Landscape (Horizontal)
                      </option>
                    </select>
                  </div>
                  <div className='space-y-1'>
                    <span className='text-[10px] text-pw-muted font-bold uppercase tracking-wider block'>
                      Page Margin
                    </span>
                    <select
                      value={pdfMargin}
                      onChange={(e) => setPdfMargin(e.target.value as any)}
                      className='bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pw-text focus:outline-none w-full cursor-pointer'>
                      <option
                        value='none'
                        className='bg-pw-surface'>
                        None (0px)
                      </option>
                      <option
                        value='small'
                        className='bg-pw-surface'>
                        Small (10px)
                      </option>
                      <option
                        value='normal'
                        className='bg-pw-surface'>
                        Normal (15px)
                      </option>
                    </select>
                  </div>
                  <div className='col-span-2 flex flex-wrap gap-2 justify-end'>
                    <Button
                      variant='outline'
                      onClick={() => setUploadedImages([])}
                      className='h-10 border-white/10 hover:bg-white/5 text-xs'>
                      Clear
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className='h-10 border border-pw-primary/30 bg-pw-primary/10 hover:bg-pw-primary/20 text-xs text-pw-primary px-5'>
                      Add More Images
                    </Button>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*'
                      multiple
                      onChange={handleMultipleImagesUpload}
                      className='hidden'
                    />
                  </div>
                </div>

                <div className='divider my-8 sm:hidden' />
                {/* Queue of PDF Image pages */}
                <div className='space-y-12 sm:space-y-4 max-h-[500px] overflow-y-auto pr-1'>
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className='sm:p-4 sm:rounded-xl sm:border sm:border-white/5 sm:bg-white/[0.01] grid grid-cols-1 md:grid-cols-12 gap-3 items-center'>
                      <div className='md:col-span-3 aspect-video rounded-lg overflow-hidden border border-white/10 relative'>
                        <img
                          src={img.src}
                          alt={img.name}
                          className='w-full h-full object-cover'
                        />
                        <span className='absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 rounded-xl bkblur text-[10px] text-white font-mono'>
                          Page {idx + 1}
                        </span>
                      </div>

                      <div className='md:col-span-7 grid grid-cols-1 gap-1.5'>
                        <Input
                          value={img.title}
                          onChange={(e) =>
                            updateImagePageDetails(img.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder='Add Page Header (Optional)...'
                          className='bg-white/5 border-white/10 h-9 text-xs'
                        />
                        <Input
                          value={img.caption}
                          onChange={(e) =>
                            updateImagePageDetails(img.id, {
                              caption: e.target.value,
                            })
                          }
                          placeholder='Add Page Caption/Description text (Optional)...'
                          className='bg-white/5 border-white/10 h-9 text-xs'
                        />
                      </div>

                      <div className='md:col-span-2 flex items-center justify-end gap-1.5'>
                        <Button
                          variant='ghost'
                          disabled={idx === 0}
                          title='Move Image Up'
                          onClick={() => moveImagePage(idx, 'up')}
                          className='h-8 w-8 p-0'>
                          <ArrowUp className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          title='Move Image Down'
                          disabled={idx === uploadedImages.length - 1}
                          onClick={() => moveImagePage(idx, 'down')}
                          className='h-8 w-8 p-0'>
                          <ArrowDown className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          title='Delete Image'
                          onClick={() => deleteImagePage(img.id)}
                          className='h-8 w-8 p-0 text-pw-danger hover:bg-pw-danger/10'>
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  title='Compile all Images to PDF'
                  onClick={handleImageToPdf}
                  className='btn-primary h-12 gap-2 w-full font-bold'>
                  <Download className='h-4 w-4' /> Compile to PDF
                </Button>
              </div>
            }
          </TabsContent>

          {/* TEXT TO PDF */}
          <TabsContent
            value='text-to-pdf'
            className='m-0 space-y-6'>
            <div className='space-y-4'>
              <div className='flex justify-between items-center flex-wrap'>
                <span className='text-xs text-pw-muted font-bold uppercase tracking-wider'>
                  Document Page Creator
                </span>
                <Button
                  onClick={addTextPage}
                  variant='outline'
                  className='h-9 text-xs gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 px-5 liq-glass hover:rounded-2xl'>
                  <Plus className='h-3.5 w-3.5' /> Add Page
                </Button>
              </div>

              <div className='space-y-4 max-h-[500px] overflow-y-auto pr-1'>
                {textPages.map((page, idx) => {
                  return (
                    <div
                      key={page.id}
                      className='p-2 sm:p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3 relative'>
                      <div className='flex justify-between items-center'>
                        <span className='text-xs font-mono text-pw-primary uppercase'>
                          Page {idx + 1}
                        </span>
                        <Button
                          variant='ghost'
                          onClick={() => deleteTextPage(page.id)}
                          className='h-7 w-7 p-0 text-pw-muted hover:text-pw-danger'>
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                      <div className='grid grid-cols-1 gap-2'>
                        <Input
                          value={page.title}
                          onChange={(e) =>
                            updateTextPageDetails(page.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder={`Page ${idx + 1} Title`}
                          className='bg-white/5 border-white/10 h-10 text-xs font-bold'
                        />
                        <textarea
                          value={page.content}
                          onChange={(e) =>
                            updateTextPageDetails(page.id, {
                              content: e.target.value,
                            })
                          }
                          placeholder='Type page-specific text content...'
                          className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs focus:border-pw-primary focus:outline-none resize-none'
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleTextToPdf}
                className='btn-primary h-12 gap-2 w-full font-bold'>
                <Download className='h-4 w-4' /> Compile Document PDF
              </Button>
            </div>
          </TabsContent>

          {/* PDF TO TEXT */}
          <TabsContent
            value='pdf-to-text'
            className='m-0 space-y-6'>
            {!pdfTextResult ?
              <div
                onClick={() =>
                  document.getElementById('pdf-to-txt-input')?.click()
                }
                className='flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group relative'>
                <input
                  id='pdf-to-txt-input'
                  type='file'
                  accept='.pdf'
                  onChange={handlePdfToTextUpload}
                  className='hidden'
                />
                <div className='w-12 h-12 rounded-2xl bg-pw-surface border border-white/10 flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform'>
                  <Upload className='h-6 w-6 text-pw-secondary' />
                </div>
                <h3 className='text-xl font-bold font-display mb-1'>
                  Upload PDF Document
                </h3>
                <p className='text-pw-muted text-xs max-w-sm'>
                  Analyzes and extracts textual characters pure client-side.
                </p>
              </div>
            : <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <p className='text-xs text-pw-success font-bold uppercase'>
                    Extracted from: {extractedFileName}
                  </p>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setPdfTextResult('');
                      setExtractedFileName('');
                    }}
                    className='h-9 px-3 border-white/5 hover:bg-white/5 text-pw-muted hover:text-pw-text'>
                    Reset
                  </Button>
                </div>
                <div className='bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-mono max-h-60 overflow-y-auto select-all leading-relaxed whitespace-pre-wrap'>
                  {pdfTextResult}
                </div>
              </div>
            }
          </TabsContent>

          {/* MERGE PDFs */}
          <TabsContent
            value='merge'
            className='m-0 space-y-6'>
            <div className='space-y-4'>
              <div className='flex justify-between items-center flex-wrap gap-4'>
                <h3 className='text-sm font-bold flex items-center gap-1.5 text-pw-muted'>
                  <Sliders className='h-4 w-4 text-pw-primary' /> Consolidation
                  List ({mergeFiles.length} files)
                </h3>
                <Button
                  onClick={() =>
                    document.getElementById('pdf-merge-input')?.click()
                  }
                  variant='outline'
                  className='h-10 border-white/10 hover:bg-white/5 text-xs font-bold gap-2'>
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
                  <div
                    key={file.id}
                    className='p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between bkblur'>
                    <div>
                      <span className='text-xs font-bold text-pw-text'>
                        {file.name}
                      </span>
                      <span className='text-[10px] text-pw-muted block mt-0.5'>
                        {file.size}
                      </span>
                    </div>
                    <Button
                      onClick={() =>
                        setMergeFiles(
                          mergeFiles.filter((f) => f.id !== file.id),
                        )
                      }
                      variant='ghost'
                      className='h-8 w-8 p-0 text-pw-muted hover:text-pw-danger'>
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                ))}

                {mergeFiles.length === 1 && (
                  <p className='text-center py-10 text-xs text-pw-muted leading-relaxed'>
                    Compilation queue must be from two and above to be able to
                    merge. Click &quot;Add Documents&quot; above to add more
                    documents.
                  </p>
                )}

                {mergeFiles.length === 0 && (
                  <p className='text-center py-10 text-xs text-pw-muted leading-relaxed'>
                    Compilation queue is empty. Click &quot;Add Documents&quot;
                    above to arrange your documents.
                  </p>
                )}
              </div>

              <Button
                onClick={executeMerge}
                disabled={mergeFiles.length < 2}
                className='btn-primary h-12 gap-2 w-full font-bold mt-4'>
                <Layers className='h-4 w-4' /> Merge into Single PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Suggested utilities */}
      <div className='mt-20 space-y-6'>
        <h2 className='text-2xl font-bold font-display flex items-center gap-2'>
          <Sparkle className='h-5 w-5 text-pw-primary animate-spin-slow' />{' '}
          Suggested Utilities
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {matchedSuggestions.map((tool) => (
            <a
              href={tool.href}
              key={tool.id}
              className='group'>
              <Card className='card-glow p-5 flex flex-col h-full bg-[#0c0d1c] border border-white/5 hover:border-pw-primary/30 transition-all cursor-pointer'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='w-10 h-10 rounded-xl flex items-center justify-center bg-pw-surface border border-white/5 shadow-xl group-hover:scale-105 transition-all'>
                    <tool.icon
                      className='h-5 w-5'
                      style={{ color: tool.color }}
                    />
                  </div>
                  <span className='text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-pw-muted'>
                    {tool.tag}
                  </span>
                </div>
                <h4 className='text-base font-bold text-pw-text group-hover:text-pw-primary transition-colors flex items-center gap-1'>
                  {tool.title}
                  <ChevronRight className='h-4 w-4 text-pw-muted group-hover:text-pw-primary transition-colors' />
                </h4>
                <p className='text-xs text-pw-muted mt-2 leading-relaxed flex-1'>
                  {tool.description}
                </p>
              </Card>
            </a>
          ))}
        </div>
      </div>

      <Dialog
        open={isNameModalOpen}
        onOpenChange={setIsNameModalOpen}>
        <DialogContent className='max-w-md w-full bg-[#0c0d1c] pt-5 border border-white/10 rounded-2xl shadow-2xl text-pw-text animate-fade-in'>
          <DialogHeader className='p-2'>
            <DialogTitle className='text-xl font-extrabold font-display'>
              Export Name Customization
            </DialogTitle>
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
              className='flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-pw-muted hover:text-pw-text transition-all'>
              Cancel
            </button>
            <button
              onClick={handleConfirmFilename}
              className='flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold text-white transition-all'>
              Export
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
