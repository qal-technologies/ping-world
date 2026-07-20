import { ComposerLayout } from '@/components/composer/ComposerLayout';
import { ComposerProvider } from '@/lib/composer/useComposerStore';
import { COMPANY } from '@/lib/config/company';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Composer',
  description:
    'Craft, polish, and publish to Social platforms including X, Instagram, Facebook, LinkedIn and more. AI-powered rephrasing, hashtag generation, media editing, and real-time platform previews.',
  keywords: [
    'composer',
    'pingworld',
    'ping world',
    'social media manager',
    'social media',
    'instagram poster',
    'x composer',
    'facebook composer',
    'linkedin composer',
    'qal tech',
    'qal technologies',
    'trending',
    'trend',
  ],
  openGraph: {
    title: 'Composer | Ping World',
    description:
      'Craft, polish, and publish to Social platforms including X, Instagram, Facebook, LinkedIn and more. AI-powered rephrasing, hashtag generation, media editing, and real-time platform previews.',
    url: `${COMPANY.domain}/composer`,
    siteName: 'Ping World',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Composer | Ping World',
    description:
      'Craft, polish, and publish to Social platforms including X, Instagram, Facebook, LinkedIn and more. AI-powered rephrasing, hashtag generation, media editing, and real-time platform previews.',
  },
};

export default function ComposerPage() {
  return (
    <ComposerProvider>
      <ComposerLayout />
    </ComposerProvider>
  );
}
