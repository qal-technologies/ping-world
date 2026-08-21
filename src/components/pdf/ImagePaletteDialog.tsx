'use client';

import { useState } from 'react';
import { Image as ImageIcon, Upload, Trash2, Pencil, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface ImagePaletteItem {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  description?: string;
  altText?: string;
}

interface ImagePaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imagePalette: ImagePaletteItem[];
  setImagePalette: React.Dispatch<React.SetStateAction<ImagePaletteItem[]>>;
  activePageContent: string;
  setPages: React.Dispatch<React.SetStateAction<any[]>>;
  activePageIndex: number;
  onScanAndReplace: (oldName: string, newName: string) => void;
}

export default function ImagePaletteDialog({
  open,
  onOpenChange,
  imagePalette,
  setImagePalette,
  activePageContent,
  setPages,
  activePageIndex,
  onScanAndReplace,
}: ImagePaletteDialogProps) {
  const [editingItem, setEditingItem] = useState<ImagePaletteItem | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [widthInput, setWidthInput] = useState(140);
  const [heightInput, setHeightInput] = useState(140);
  const [descriptionInput, setDescriptionInput] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95%] sm:max-w-2xl bg-[#0c0d1c] border-white/10 text-white rounded-3xl p-4 sm:p-6 mx-2 shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold font-display flex items-center gap-2 text-white'>
            <ImageIcon className='h-5 w-5 text-pw-primary' /> Image Palette & Captions
          </DialogTitle>
          <DialogDescription className='text-xs text-pw-muted'>
            Upload and manage images with descriptions. Reference any image in your body text using <code>[img:ref_name]</code>.
          </DialogDescription>
        </DialogHeader>

        {editingItem ? (
          <div className='p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 my-2'>
            <span className='text-xs font-bold text-pw-primary uppercase block'>
              Editing: [img:{editingItem.name}]
            </span>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <label className='text-[10px] font-bold text-pw-muted uppercase'>
                  Ref Tag Name
                </label>
                <Input
                  value={nameInput}
                  onChange={(e) =>
                    setNameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))
                  }
                  className='h-8 bg-black/40 border-white/10 text-xs font-mono'
                />
              </div>
              <div className='space-y-1'>
                <label className='text-[10px] font-bold text-pw-muted uppercase'>
                  Dimensions (WxH px)
                </label>
                <div className='flex gap-1'>
                  <Input
                    type='number'
                    value={widthInput}
                    onChange={(e) => setWidthInput(Number(e.target.value))}
                    className='h-8 bg-black/40 border-white/10 text-xs font-mono'
                  />
                  <Input
                    type='number'
                    value={heightInput}
                    onChange={(e) => setHeightInput(Number(e.target.value))}
                    className='h-8 bg-black/40 border-white/10 text-xs font-mono'
                  />
                </div>
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-[10px] font-bold text-pw-muted uppercase'>
                Image Caption
              </label>
              <Input
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder='e.g Image of a thing...'
                className='h-8 bg-black/40 border-white/10 text-xs'
              />
              <p className='text-[9px] text-pw-muted italic'>
                Renders directly beneath the image in both reader preview and exports.
              </p>
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setEditingItem(null)}
                className='h-7 text-xs border-white/10'>
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={() => {
                  const oldName = editingItem.name;
                  const newName = nameInput.trim() || oldName;

                  setImagePalette((prev) =>
                    prev.map((item) =>
                      item.id === editingItem.id
                        ? {
                            ...item,
                            name: newName,
                            width: widthInput || 140,
                            height: heightInput || 140,
                            description: descriptionInput.trim(),
                          }
                        : item,
                    ),
                  );

                  if (oldName !== newName) {
                    onScanAndReplace(oldName, newName);
                  } else {
                    toast.success('Image properties updated!');
                  }
                  setEditingItem(null);
                }}
                className='btn-primary h-7 text-xs font-bold'>
                <CheckCircle/>
              </Button>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4 max-h-80 overflow-y-auto custom-scrollbar'>
            {imagePalette.map((item) => (
              <div
                key={item.id}
                className='p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2 flex flex-col justify-between'>
                <div className='flex items-center gap-3'>
                  <img
                    src={item.src}
                    alt={item.name}
                    className='w-14 h-14 object-contain rounded-lg bg-black/40 p-1 border border-white/10 shrink-0'
                  />
                  <div className='min-w-0 flex-1'>
                    <span
                      className='text-xs font-bold text-white block truncate cursor-pointer hover:text-pw-primary'
                      onClick={() => {
                        navigator.clipboard.writeText(`[img:${item.name}]`);
                        toast.success(`Copied [img:${item.name}] tag!`);
                      }}>
                      [img:{item.name}]
                    </span>
                    <span className='text-[10px] text-pw-muted font-mono block'>
                      {item.width}x{item.height}px
                    </span>
                    {item.description && (
                      <span className='text-[10px] text-pw-primary italic line-clamp-1 block mt-0.5'>
                        &quot;{item.description}&quot;
                      </span>
                    )}
                  </div>
                </div>

                <div className='flex items-center gap-1.5 pt-1'>
                  <Button
                    size='sm'
                    onClick={() => {
                      const tag = ` [img:${item.name}] `;
                      const textarea = document.getElementById(
                        'book-editor-textarea',
                      ) as HTMLTextAreaElement;
                      const cursor = textarea ? textarea.selectionStart : activePageContent.length;
                      const updated =
                        activePageContent.substring(0, cursor) +
                        tag +
                        activePageContent.substring(cursor);
                      setPages((prev) =>
                        prev.map((p, idx) =>
                          idx === activePageIndex ? { ...p, content: updated } : p,
                        ),
                      );
                      onOpenChange(false);
                      toast.success(`Inserted [img:${item.name}] tag!`);
                    }}
                    className='btn-primary h-7 text-[10px] flex-1'>
                    Insert
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setEditingItem(item);
                      setNameInput(item.name);
                      setWidthInput(item.width || 140);
                      setHeightInput(item.height || 140);
                      setDescriptionInput(item.description || '');
                    }}
                    className='h-7 text-[10px] border-white/10'>
                    <Pencil className='h-3 w-3 mr-1' /> Edit
                  </Button>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() =>
                      setImagePalette((prev) => prev.filter((p) => p.id !== item.id))
                    }
                    className='h-7 w-7 text-pw-muted hover:text-pw-danger'>
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className='flex flex-row justify-between items-center pt-2'>
          <input
            id='palette-upload-input-file'
            type='file'
            accept='image/*'
            className='hidden'
              // jules edit: Convert uploaded palette image to Base64 Data URL to prevent CORS taint errors
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64DataUrl = ev.target?.result as string;
                  const cleanName = file.name
                    .replace(/\.[^/.]+$/, '')
                    .replace(/[^a-zA-Z0-9_]/g, '_')
                    .toLowerCase();
                  const newItem: ImagePaletteItem = {
                    id: `palette-${Date.now()}`,
                    name: cleanName || 'graphic',
                      src: base64DataUrl,
                    width: 140,
                    height: 140,
                    description: '',
                  };
                  setImagePalette((prev) => [...prev, newItem]);
                    toast.success(`Image uploaded as Base64! Tag: [img:${newItem.name}]`);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <Button
            onClick={() => document.getElementById('palette-upload-input-file')?.click()}
            className='btn-primary h-9 text-xs font-bold gap-1.5'>
            <Upload className='h-3.5 w-3.5' /> Upload Image
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant='outline'
            className='h-9 text-xs font-semibold border-white/10'>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
