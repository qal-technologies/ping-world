import { ComposerLayout } from '@/components/composer/ComposerLayout';
import { ComposerProvider } from '@/lib/composer/useComposerStore';

export const metadata = {
  title: 'Composer',
  description:
    'Craft, polish, and publish to Social platforms including X, Instagram, Facebook, LinkedIn and more. AI-powered rephrasing, hashtag generation, media editing, and real-time platform previews.',
  keyword:['composer', 'pingworld', 'ping world', 'social media manager', 'social media', 'instagram poster', 'x composer', 'facebook composer', 'linkedin composer', 'qal tech', 'qal technologies', 'trending', 'trend']
};

// jules edit: Remove redundant ComposerProvider as it is now defined in MainLayout
export default function ComposerPage() {
  return <ComposerLayout />;
}
