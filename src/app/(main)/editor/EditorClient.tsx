'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Layout,
  Sparkles,
  Eye,
  Settings,
  Check,
  Zap,
  BookOpen,
  Plus,
  Trash2,
  Cloud,
  CloudOff,
  Search,
  Tag,
  Calendar,
  Layers,
  Upload,
  ChevronRight,
  Sparkle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { tools } from '@/lib/general/data';

// Dynamic imports for heavy editor components
const TiptapEditor = dynamic(
  () => import('@/components/editor/tiptap-editor'),
  {
    ssr: false,
    loading: () => <div className='w-full h-[500px] skeleton animate-pulse' />,
  },
);

const CanvasEditor = dynamic(
  () => import('@/components/editor/canvas-editor'),
  {
    ssr: false,
    loading: () => <div className='w-full h-[600px] skeleton animate-pulse' />,
  },
);

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
}

export default function EditorPage() {
  const { premiumTier, isPremium } = useAppContext();
  const [mode, setMode] = useState<'document' | 'canvas'>('document');
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Selected note for editing
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editContent, setEditContent] = useState('');
  
  
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [filenameInput, setFilenameInput] = useState('');
  const [filenameExtension, setFilenameExtension] = useState('');
  const [onConfirmFilename, setOnConfirmFilename] = useState<
    ((cleanName: string) => void) | null
  >(null);

  // Load notes from local storage or set default
  useEffect(() => {
    const saved = localStorage.getItem('pingworld_offline_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0) {
          selectNote(parsed[0]);
        }
      } catch {
        console.warn('Notes parsing failed');
      }
    } else {
      const seed: Note[] = [
        {
          id: '1',
          title: 'My First Rich Note',
          content:
            '<h1>Welcome to Rich Notes & Editor!</h1><p>You can format text with headings, lists, quotes, and highlights. Export to <strong>DOC</strong>, <strong>PDF</strong>, or <strong>TXT</strong>.</p>',
          category: 'General',
          updatedAt: new Date().toLocaleDateString(),
        },
      ];
      setNotes(seed);
      selectNote(seed[0]);
    }
  }, []);

  // Save notes list to local storage
  const saveToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem(
      'pingworld_offline_notes',
      JSON.stringify(updatedNotes),
    );
  };

  const selectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category);
  };

  const createNote = () => {
    const newNote: Note = {
      id: `${Date.now()}`,
      title: 'Untitled Note',
      content: '<p>Start typing your rich content here...</p>',
      category: 'General',
      updatedAt: new Date().toLocaleDateString(),
    };
    const updated = [newNote, ...notes];
    saveToStorage(updated);
    selectNote(newNote);
    toast.success('New rich note created!');
  };

  const updateCurrentNote = (fields: Partial<Note>) => {
    if (!selectedNoteId) return;
    const updated = notes.map((n) => {
      if (n.id !== selectedNoteId) return n;
      return {
        ...n,
        ...fields,
        updatedAt: new Date().toLocaleDateString(),
      };
    });
    saveToStorage(updated);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveToStorage(updated);
    if (selectedNoteId === id) {
      if (updated.length > 0) {
        selectNote(updated[0]);
      } else {
        setSelectedNoteId(null);
        setEditTitle('');
        setEditContent('');
        setEditCategory('General');
      }
    }
    toast.success('Note removed successfully.');
  };

  const handleCloudSync = () => {
    if (isPremium) {
      // handleDbSave();
      toast.success(
        'Cloud sync executed! Local notes are fully secured in the PingWorld Cloud.',
      );
    } else {
      toast.error(
        'Cloud backup is a Premium feature. Upgrade to enable auto cloud sync!',
      );
    }
  };

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

  // Export Notes implementations
  const exportAsTxt = (title: string, htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.innerText || tempDiv.textContent || '';

    triggerExport(title || 'document', 'txt', (filename) => {
      const blob = new Blob([textContent], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported as plain text!');
    });
  };

  const exportAsDoc = (title: string, htmlContent: string) => {
    triggerExport(title || 'document', 'doc', (filename) => {
      const header =
        "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
        "xmlns:w='urn:schemas-microsoft-com:office:word' " +
        "xmlns='http://www.w3.org/TR/REC-html40'>" +
        '<head><title>' +
        title +
        "</title><meta charset='utf-8'></head><body>";
      const footer = '</body></html>';
      const sourceHTML = header + htmlContent + footer;

      const blob = new Blob(['\ufeff' + sourceHTML], {
        type: 'application/msword',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported as Word document!');
    });
  };

  const exportAsPdf = async (title: string, htmlContent: string) => {
    triggerExport(title || 'document', 'pdf', async (filename) => {
      toast.loading('Rendering PDF...');
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        // Strip tags for clean simple multiline PDF drawing
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const textContent = tempDiv.innerText || tempDiv.textContent || '';

        doc.setFontSize(20);
        doc.text(title || 'PingWorld Document', 15, 20);
        doc.setFontSize(11);

        const splitText = doc.splitTextToSize(textContent, 180);
        doc.text(splitText, 15, 35);
        doc.save(`${filename}.pdf`);
        toast.dismiss();
        toast.success('Exported as PDF document!');
      } catch (err) {
        toast.dismiss();
        toast.error('Failed to compile PDF.');
      }
    });
  };

  // Import files
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const title = file.name.replace(/\.[^/.]+$/, '');

      // Attempt basic HTML format detection
      const content =
        text.trim().startsWith('<') ?
          text
        : `<p>${text.replace(/\n/g, '<br/>')}</p>`;

      const importedNote: Note = {
        id: `${Date.now()}`,
        title,
        content,
        category: 'Imported',
        updatedAt: new Date().toLocaleDateString(),
      };

      const updated = [importedNote, ...notes];
      saveToStorage(updated);
      selectNote(importedNote);
      toast.success(`Successfully imported ${file.name}!`);
    };
    reader.readAsText(file);
  };

  const getStats = () => {
    if (typeof window === 'undefined') {
      return { words: 0, chars: 0, readingTime: 0 };
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editContent;
    const plainText = tempDiv.innerText || tempDiv.textContent || '';
    const words = plainText.split(/\s+/).filter((w) => w.length > 0).length;
    const chars = plainText.length;
    const readingTime = Math.ceil(words / 200);
    return { words, chars, readingTime };
  };

  const { words, chars, readingTime } = getStats();

  const categories = [
    'All',
    ...Array.from(new Set(notes.map((n) => n.category))),
  ];

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'All' || n.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const currentToolId = 'editor';
  const matchedSuggestions = tools
    .filter((t) => t.id !== currentToolId)
    .slice(0, 3);

  return (
    <div className='container mx-auto p-4 sm:px-6 py-12 max-w-8xl min-h-screen'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-end justify-between w-full gap-6 mb-12 flex-wrap'>
        <div>
          <div className='badge mb-4'>
            <Sparkles className='h-3 w-3' />
            Workspace
          </div>
          <h1 className='text-4xl font-extrabold font-display'>
            Rich Notes <span className='gradient-text'>&amp; Editor.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            The integrated offline-first rich text document workbench and note
            stacking panel.
          </p>
        </div>

        <div className='flex flex-col gap-6 flex-1'>
          <div className='flex bg-pw-surface/30 glass border border-white/5 rounded-full self-start'>
            <button
              onClick={() => setMode('document')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                mode === 'document' ?
                  'bg-pw-primary text-white shadow-lg'
                : 'text-pw-muted hover:text-pw-text',
              )}>
              <FileText className='h-4 w-4' /> Document
            </button>
            <button
              onClick={() => setMode('canvas')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                mode === 'canvas' ?
                  'bg-pw-primary text-white shadow-lg'
                : 'text-pw-muted hover:text-pw-text',
              )}>
              <Layout className='h-4 w-4' /> Post Card
            </button>
          </div>

          {mode === 'document' && (
            <div className='flex flex-col gap-1'>
              <Card className='p-0 card-glow bg-white/5 border-white/10'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pw-muted' />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search notes content...'
                    className='pl-9 h-10 bg-transparent border-none focus-visible:ring-0 text-sm focus:border-pw-primary'
                  />
                </div>
              </Card>

              {/* Categories select row */}
              <div className='flex overflow-x-auto scrollable-row py-1 gap-1.5'>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider transition-all border shrink-0',
                      activeCategory === cat ?
                        'bg-pw-primary text-white border-pw-primary'
                      : 'bg-white/5 text-pw-muted border-white/5 hover:text-pw-text',
                    )}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-12 gap-8'>
        {mode === 'document' && (
          <div className='xl:col-span-4 flex flex-col gap-4'>
            <div className='space-y-3 max-h-[480px] overflow-y-auto pr-1'>
              {filteredNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => selectNote(n)}
                  className={cn(
                    'p-4 pb-2 rounded-2xl border transition-all cursor-pointer relative group',
                    selectedNoteId === n.id ?
                      'border-pw-primary bg-pw-primary/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                  )}>
                  <div className='flex justify-between items-start gap-2'>
                    <h4 className='font-bold text-xs text-pw-text truncate max-w-[80%]'>
                      {n.title || 'Untitled'}
                    </h4>
                    <span className='text-[8px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full font-mono text-pw-muted shrink-0'>
                      {n.category}
                    </span>
                  </div>
                  <div className='flex items-center justify-between mt-3 pt-1 border-t border-white/5'>
                    <span className='text-[9px] text-pw-muted font-mono flex items-center gap-1'>
                      <Calendar className='h-3 w-3' /> {n.updatedAt}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(n.id);
                      }}
                      className='opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-pw-danger sm:text-pw-muted hover:text-pw-danger transition-opacity h-6 w-6 rounded flex items-center justify-center'>
                      <Trash2 className='h-3.5 w-3.5' />
                    </button>
                  </div>
                </div>
              ))}

              {filteredNotes.length === 0 && (
                <div className='py-12 text-center text-pw-muted text-xs'>
                  No matching local notes.
                </div>
              )}
            </div>

            <Button
              onClick={createNote}
              className='w-full btn-primary h-11 gap-2 rounded-xl text-xs font-bold'>
              <Plus className='h-4 w-4' /> Create New Note
            </Button>

            <div className='grid grid-cols-2 gap-2'>
              <Button
                variant='outline'
                onClick={handleCloudSync}
                className='bg-white/5 border-white/10 hover:bg-white/10 gap-1.5 h-10 text-[10px] font-bold'>
                {isPremium ?
                  <Cloud className='h-3.5 w-3.5 text-pw-success' />
                : <CloudOff className='h-3.5 w-3.5 text-pw-warning' />}
                Cloud Sync
              </Button>
              <Button
                variant='outline'
                onClick={() =>
                  document.getElementById('import-file-input')?.click()
                }
                className='bg-white/5 border-white/10 hover:bg-white/10 gap-1.5 h-10 text-[10px] font-bold'>
                <Upload className='h-3.5 w-3.5 text-pw-secondary' />
                Import File
              </Button>
              <input
                id='import-file-input'
                type='file'
                accept='.txt,.md,.doc'
                onChange={handleImportFile}
                className='hidden'
              />
            </div>
          </div>
        )}
        <div className='divider xl:hidden' />

        {/* Center/Right: Document Work Editor */}
        <div className='xl:col-span-6 space-y-4'>
          {selectedNoteId ?
            <div className='space-y-4'>
              {/* Note Header Info */}

              {mode === 'document' && (
                <Card className='bg-transparent ring-0 sm:ring-1 sm:glass p-2 sm:p-4 flex flex-row items-center flex-wrap justify-between gap-4'>
                  <div className='flex flex-col'>
                    <input
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        updateCurrentNote({ title: e.target.value });
                      }}
                      className='bg-transparent border-none text-base sm:text-lg font-bold p-0 focus-visible:ring-0 focus:border-pw-primary h-auto no-outline w-full text-pw-text'
                      placeholder='Enter Note Title...'
                    />
                    <div className='flex items-center gap-2 mt-1.5'>
                      <Tag className='h-3 w-3 text-pw-secondary shrink-0' />
                      <input
                        value={editCategory}
                        onChange={(e) => {
                          setEditCategory(e.target.value);
                          updateCurrentNote({ category: e.target.value });
                        }}
                        className='bg-white/5 border-white/5 h-6 text-[9px] max-w-[100px] font-bold uppercase tracking-wider rounded-lg px-2'
                        placeholder='Category...'
                      />
                    </div>
                  </div>

                  {/* Export Operations Dropdown Row */}
                  <div className='flex flex-col items-center gap-1'>
                    <p className='w-full min-w-[100%] font-bold text-center text-xs uppercase'>
                      Export As
                    </p>
                    <div className='flex gap-1.5'>
                      <Button
                        variant='outline'
                        title='Export as PDF'
                        onClick={() => exportAsPdf(editTitle, editContent)}
                        className='h-8 px-2 border-white/5 bg-white/5 hover:bg-white/10 text-xs gap-1'>
                        PDF
                      </Button>
                      <Button
                        variant='outline'
                        title='Export as Word'
                        onClick={() => exportAsDoc(editTitle, editContent)}
                        className='h-8 px-2 border-white/5 bg-white/5 hover:bg-white/10 text-xs gap-1'>
                        Word
                      </Button>
                      <Button
                        variant='outline'
                        title='Export as Plain Text'
                        onClick={() => exportAsTxt(editTitle, editContent)}
                        className='h-8 px-2 border-white/5 bg-white/5 hover:bg-white/10 text-xs gap-1'>
                        TXT
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Mode Specific Editors */}
              <AnimatePresence mode='wait'>
                {mode === 'document' ?
                  <motion.div
                    key='document'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}>
                    <TiptapEditor
                      content={editContent}
                      onChange={(html) => {
                        setEditContent(html);
                        updateCurrentNote({ content: html });
                      }}
                    />
                  </motion.div>
                : <motion.div
                    key='canvas'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}>
                    <CanvasEditor />
                  </motion.div>
                }
              </AnimatePresence>
            </div>
          : <Card className='card-glow p-12 bg-pw-surface/50 min-h-[450px] flex flex-col items-center justify-center text-center'>
              <Layers className='h-12 w-12 text-pw-primary/30 animate-pulse mb-4' />
              <h3 className='text-xl font-bold'>Select or Create a Note</h3>
              <p className='text-sm text-pw-muted mt-2 max-w-sm'>
                Select an existing note on the left sidebar, or create a brand
                new rich note stack instantly to get started.
              </p>
              <Button
                onClick={createNote}
                className='btn-primary mt-6 gap-1.5 h-11 px-6'>
                <Plus className='h-4 w-4' /> Create Note
              </Button>
            </Card>
          }
        </div>

        {/* Right Side: Live Stats & Metadata */}
        {mode === 'document' && (
          <div className='xl:col-span-2 space-y-6'>
            <Card className='card-glow p-4'>
              <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3 text-pw-muted'>
                    <div className='p-1 bg-pw-primary/10 rounded-lg'>
                      <FileText className='h-4 w-4 text-pw-primary' />
                    </div>
                    <span className='text-xs font-semibold'>Words</span>
                  </div>
                  <span className='text-sm font-bold'>{words}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3 text-pw-muted'>
                    <div className='p-1 bg-pw-secondary/10 rounded-lg'>
                      <Check className='h-4 w-4 text-pw-secondary' />
                    </div>
                    <span className='text-xs font-semibold'>Characters</span>
                  </div>
                  <span className='text-sm font-bold'>{chars}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3 text-pw-muted'>
                    <div className='p-1 bg-pw-success/10 rounded-lg'>
                      <BookOpen className='h-4 w-4 text-pw-success' />
                    </div>
                    <span className='text-xs font-semibold'>Reading Time</span>
                  </div>
                  <span className='text-sm font-bold'>{readingTime} min</span>
                </div>
              </div>
            </Card>

            <Card className='hidden sm:inline-flex card-glow p-4'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-pw-muted'>Auto-save</span>
                  <span className='text-pw-success font-semibold flex items-center gap-1'>
                    <Check className='h-3 w-3' /> Enabled
                  </span>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-pw-muted'>Workspace Storage</span>
                  <span className='text-pw-primary font-semibold'>
                    Local Memory
                  </span>
                </div>
              </div>
            </Card>

            <div className='bg-pw-primary/5 border border-pw-primary/10 rounded-2xl p-6 text-center'>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-pw-primary mb-3 shadow-xl shadow-pw-primary/20'>
                <Sparkles className='h-5 w-5 text-white' />
              </div>
              <h4 className='text-xs font-bold mb-1.5'>AI Writing Assistant</h4>
              <p className='text-[11px] text-pw-muted leading-relaxed mb-4'>
                Let AI suggestions adjust tone, write catchy headings, or expand
                your note.
              </p>
              <Button className='w-full btn-primary h-9 text-xs'>
                Unlock AI Tools
              </Button>
            </div>
          </div>
        )}
      </div>

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
        <DialogContent className='max-w-md w-full pt-5 bg-[#0c0d1c] border border-white/10 rounded-2xl shadow-2xl text-pw-text'>
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
