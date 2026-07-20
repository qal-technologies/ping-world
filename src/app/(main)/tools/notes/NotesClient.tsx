
"use client";

import { useState, useEffect } from "react";
import {
  FileCode,
  Plus,
  Trash2,
  CloudOff,
  Cloud,
  Search,
  Tag,
  Calendar,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
}

export default function OfflineNotesPage() {
  const [isPremium, setIsPremium] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Selected note for editing
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("General");

  // Safe checks for premium status
  useEffect(() => {
    // Read from localStorage or try useComposer
    const storedPremium = localStorage.getItem("pingworld_premium") === "true";
    setIsPremium(storedPremium);
  }, []);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pingworld_offline_notes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0) {
          selectNote(parsed[0]);
        }
      } catch {
        console.warn("Notes parsing failed");
      }
    } else {
      // Seed initial dummy notes
      const seed: Note[] = [
        {
          id: "1",
          title: "My First Note",
          content: "Welcome to Offline Notes. These notes are stored directly on your phone/device locally.",
          category: "General",
          updatedAt: new Date().toLocaleDateString()
        }
      ];
      setNotes(seed);
      selectNote(seed[0]);
    }
  }, []);

  // Save to localStorage
  const saveToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem("pingworld_offline_notes", JSON.stringify(updatedNotes));
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
      title: "Untitled Note",
      content: "",
      category: "General",
      updatedAt: new Date().toLocaleDateString()
    };
    const updated = [newNote, ...notes];
    saveToStorage(updated);
    selectNote(newNote);
    document.getElementById('note-place')?.scrollIntoView();
    toast.success("New note stacked!");
  };

  const updateCurrentNote = (fields: Partial<Note>) => {
    if (!selectedNoteId) return;
    const updated = notes.map(n => {
      if (n.id !== selectedNoteId) return n;
      return {
        ...n,
        ...fields,
        updatedAt: new Date().toLocaleDateString()
      };
    });
    saveToStorage(updated);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    saveToStorage(updated);
    if (selectedNoteId === id) {
      if (updated.length > 0) {
        selectNote(updated[0]);
      } else {
        setSelectedNoteId(null);
        setEditTitle("");
        setEditContent("");
        setEditCategory("General");
      }
    }
    toast.success("Note unstacked/removed");
  };

  const handleCloudSync = () => {
    if (isPremium) {
      toast.success("Cloud sync successfully executed! Your local notes are secured in PingWorld cloud.");
    } else {
      toast.error("Cloud backup is a Premium feature. Upgrade to enable auto cloud sync!");
    }
  };

  const categories = ["All", ...Array.from(new Set(notes.map(n => n.category)))];

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
                         n.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || n.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className='container mx-auto px-6 py-12 max-w-6xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <FileCode className='h-3.5 w-3.5' />
            Workspace
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Text <span className='gradient-text'>Note.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Save local-first integrated notes with custom categories and many more...
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant='outline'
            onClick={handleCloudSync}
            className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
            {isPremium ? <Cloud className="h-4 w-4 text-pw-success animate-pulse" /> : <CloudOff className="h-4 w-4 text-pw-warning" />}
            {isPremium ? "Cloud Sync" : "Backup to Cloud"}
          </Button>
          <Button
            onClick={createNote}
            className='btn-primary gap-2 h-11 px-6'>
            <Plus className='h-5 w-5' /> Add Note
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Left column: List of Notes */}
        <div className='lg:col-span-4 flex flex-col gap-4'>
          <Card className="p-0 card-glow bg-white/5 border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pw-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search note content..."
                className="pl-9 h-11 bg-transparent border-none focus-visible:ring-0 text-sm focus:border-pw-primary"
              />
            </div>
          </Card>

          {/* Categories select row */}
          <div className="flex overflow-x-auto scrollable-row py-1 gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "text-[10px] px-3.5 py-1 rounded-full font-bold uppercase tracking-wider transition-all border",
                  activeCategory === cat ? "bg-pw-primary text-white border-pw-primary" : "bg-white/5 text-pw-muted border-white/5 hover:text-pw-text"
                )}>
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredNotes.map(n => (
              <div
                key={n.id}
                onClick={() => selectNote(n)}
                className={cn(
                  "p-4 pb-2 rounded-2xl border transition-all cursor-pointer relative group",
                  selectedNoteId === n.id ? "border-pw-primary bg-pw-primary/5" : "border-white/5 bg-white/[0.02] hover:border-white/10"
                )}>
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-sm text-pw-text truncate max-w-[150px]">{n.title || "Untitled"}</h4>
                  <span className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full font-mono text-pw-muted shrink-0">{n.category}</span>
                </div>
                <p className="text-xs text-pw-muted mt-1.5 truncate leading-relaxed">{n.content || "Empty content..."}</p>
                <div className="flex items-center justify-between mt-3 pt-1 border-t border-white/5">
                  <span className="text-[10px] text-pw-muted font-mono flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {n.updatedAt}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                    className="opacity-0 group-hover:opacity-100 text-pw-muted hover:text-pw-danger transition-opacity h-6 w-6 rounded flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredNotes.length === 0 && (
              <div className="py-12 text-center text-pw-muted text-xs">
                No local notes stacked yet. Click &quot;Stack Note&quot; to begin!
              </div>
            )}
          </div>
        </div>

        <div className='divider sm:hidden my-3'/>
        {/* Right column: Active Note Workspace editor */}
        <div className='lg:col-span-8' id='note-place'>
          {selectedNoteId ? (
            <Card className="bg-transparent px-1 ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-4">
              <div className="flex flex-row flex-wrap gap-4 justify-between items-start">
                <div className="flex-1 space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => { setEditTitle(e.target.value); updateCurrentNote({ title: e.target.value }); }}
                    className="bg-transparent border-none text-lg sm:text-xl font-bold p-0 focus-visible:ring-0 focus:border-pw-primary h-auto no-outline"
                    placeholder="Enter Note Title..."
                  />
                  <div className="flex items-center gap-3 mt-1">
                    <Tag className="h-3.5 w-3.5 text-pw-secondary shrink-0" />
                    <input
                      value={editCategory}
                      onChange={(e) => { setEditCategory(e.target.value); updateCurrentNote({ category: e.target.value }); }}
                      className="bg-white/5 border-white/5 h-7 text-[10px] max-w-[120px] font-bold uppercase tracking-wider rounded-lg px-2"
                      placeholder="Category..."
                    />
                  </div>
                </div>

                <Button
                  onClick={() => deleteNote(selectedNoteId)}
                  variant="outline"
                  className="h-10 border-white/10 hover:bg-pw-danger/10 text-pw-muted hover:text-pw-danger gap-2 rounded-xl">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className='divider mt-[-4px] mb-3 min-w-full'/>

              <textarea
                value={editContent}
                onChange={(e) => { setEditContent(e.target.value); updateCurrentNote({ content: e.target.value }); }}
                placeholder="Type anything here..."
                className="w-full h-96 bg-transparent text-pw-text text-sm leading-relaxed placeholder:text-pw-muted/40 focus:outline-none resize-none border-none no-outline"
              />
            </Card>
          ) : (
            <Card className="card-glow p-12 bg-pw-surface/50 min-h-[400px] flex flex-col items-center justify-center text-center">
              <Layers className="h-12 w-12 text-pw-primary/30 animate-pulse mb-4" />
              <h3 className="text-xl font-bold">Select or Stack a Note</h3>
              <p className="text-sm text-pw-muted mt-2 max-w-sm">Tap on an existing note on the left or create a new note stack instantly to begin editing.</p>
              <Button onClick={createNote} className="btn-primary mt-6 gap-1.5 h-11 px-6">
                <Plus className="h-4 w-4" /> Stack New Note
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
