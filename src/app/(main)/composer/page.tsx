import { ComposerLayout } from '@/components/composer/ComposerLayout';
import { ComposerProvider } from '@/lib/composer/useComposerStore';

export const metadata = {
  title: 'Composer - Ping World',
  description:
    'Craft, polish, and publish to Social platforms including X, Instagram, Facebook, LinkedIn and more. AI-powered rephrasing, hashtag generation, media editing, and real-time platform previews.',
};

export default function ComposerPage() {
  return (
    <ComposerProvider>
      <ComposerLayout />
    </ComposerProvider>
  );
}
