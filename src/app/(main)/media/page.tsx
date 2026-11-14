'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Upload,
  UserCircle,
  CreditCard,
  Wand2,
  X,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ProfilePicMaker from '@/components/media/ProfilePicMaker';
import BusinessCardMaker from '@/components/media/BusinessCardMaker';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import ImageEditor, {
  DEFAULT_FILTER_VALUES,
} from '@/components/media/ImageEditor';

type StudioMode = 'editor' | 'profile' | 'bizcard';

export type CanvasElement = {
  id: string;
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  color: string;
  text?: string;
};

export default function ImageToolkitPage() {
  const { isFeatureUnlocked, isPremium } = useAppContext();
  const hasProImage = isFeatureUnlocked('images');
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── URL-driven Tab Routing ──────────────────────────────────────
  const urlTab = searchParams.get('tab');
  const [studioMode, setStudioMode] = useState<StudioMode>(
    (urlTab as StudioMode) || 'editor',
  );

  const handleTabChange = (val: StudioMode) => {
    setStudioMode(val);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', val);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);

  // Transform states
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [filters, setFilters] = useState(DEFAULT_FILTER_VALUES);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);

  const [editFor, setEditFor] = useState<'image' | 'video' | 'audio'>('image');


  return (
    <AnimatePresence>
      <div
        className={cn(
          'container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20 relative',
          isEditorFullscreen &&
            image &&
            studioMode === 'editor' &&
            'fixed inset-0 z-[80] !m-0 !h-[100dvh] !w-full !max-w-none !p-0 !pb-0 overflow-hidden bg-[#090a13]/20 backdrop-blur-2xl place-self-center',
        )}>
        <div
          className={cn(
            'flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8',
            isEditorFullscreen && 'hidden',
          )}>
          <div>
            <div className='badge mb-4'>
              <Lightbulb className='h-3.5 w-3.5' />
              Workspace
            </div>
            <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
              Media <span className='gradient-text'>Studio.</span>
            </h1>
            <p className='mt-2 text-pw-muted'>
              Professional filters, avatar maker, business cards &amp; more.
              100% in-browser.
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex sticky gap-1 items-center w-full px-1 justify-center',
            isEditorFullscreen ? 'gap-2 my-2' : 'sticky top-21 z-[40] mb-8',
          )}>
          {/* ─── Studio Mode Switcher ─── */}
          <div
            className={cn(
              'flex bg-white/5 border border-white/5 bkblur rounded-3xl p-0.5 w-fit max-w-full scrollable-row no-scrollbar backdrop-blur-md justify-start items-center',
            )}
            style={{ placeSelf: 'center', gap: 0 }}>
            {(
              [
                {
                  id: 'editor',
                  label: 'Image Editor',
                  icon: <Wand2 className='h-4 w-4' />,
                  only: isEditorFullscreen,
                },
                {
                  id: 'profile',
                  label: 'Profile Pic Maker',
                  icon: <UserCircle className='h-4 w-4' />,
                },
                {
                  id: 'bizcard',
                  label: 'Business Card',
                  icon: <CreditCard className='h-4 w-4' />,
                },
              ] as { id: StudioMode; label: string; icon: React.ReactNode }[]
            ).map((m) => (
              <Button
                key={m.id}
                variant='ghost'
                onClick={() => handleTabChange(m.id)}
                className={cn(
                  'h-9 gap-2 rounded-3xl text-xs font-bold px-4 transition-all hover:px-6',
                  studioMode === m.id ?
                    'bg-pw-primary text-white shadow-lg shadow-pw-primary/25 hover:bg-pw-primary/80'
                  : 'text-white/80 hover:text-white hover:bg-white/10',
                  isEditorFullscreen && m.id !== 'editor' && 'hidden',
                )}>
                {m.icon}
                {m.label}
              </Button>
            ))}
          </div>

          {isEditorFullscreen && (
            <Button
              variant='ghost'
              onClick={() => {
                setIsEditorFullscreen(false);
                setShowToolbar(true);
              }}
              className='z-90 h-9 w-9 bg-pw-primary/20 hover:bg-pw-primary/70 text-pw-primary backdrop-blur-xl rounded-full bkblur'>
              <X className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>

        {studioMode === 'profile' && (
          <motion.div
            key='profile'
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}>
            <ProfilePicMaker />
          </motion.div>
        )}

        {studioMode === 'bizcard' && (
          <motion.div
            key='bizcard'
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}>
            <BusinessCardMaker />
          </motion.div>
        )}

        {studioMode === 'editor' &&
           <ImageEditor
              canvasElements={canvasElements}
              filters={filters}
              flipH={flipH}
              flipV={flipV}
              image={image}
              isEditorFullscreen={isEditorFullscreen}
              pan={pan}
              rotation={rotation}
              setCanvasElements={setCanvasElements}
              setFilters={setFilters}
              setFlipH={setFlipH}
              setFlipV={setFlipV}
              setImage={setImage}
              setIsEditorFullscreen={setIsEditorFullscreen}
              setPan={setPan}
              setRotation={setRotation}
              setShowToolbar={setShowToolbar}
              setZoom={setZoom}
              showToolbar={showToolbar}
              zoom={zoom}
              key={'image-editor-in-play'}
          />
        }
      </div>
    </AnimatePresence>
  );
}
