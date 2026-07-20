import { COMPANY } from "@/lib/config/company";
import { Suspense } from 'react';
import type { Metadata } from 'next';
import GamesClient from './GamesClient';

export const metadata: Metadata = {
  title: 'Tournament Bracket & Standings Game Table | Ping World',
  description:
    'Auto-calculate sports league ranks, tournament points, game statistics, wins, draws, and goals in real-time. Built by Qal Technologies and developer Poshcodes.',
  keywords: [
    'Games Table',
    'Standings Calculator',
    'League Table Generator',
    'Tournament Points Calculator',
    'Ping World Games',
    'Qal Technologies',
  ],
  openGraph: {
    title: 'Tournament Bracket & Standings Game Table | Ping World',
    description:
      'Auto-calculate sports league ranks, tournament points, game statistics, wins, draws, and goals in real-time.',
    url: `${COMPANY.domain}/tools/games`,
    siteName: 'Ping World',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tournament Bracket & Standings Game Table | Ping World',
    description:
      'Auto-calculate sports league ranks, tournament points, game statistics, wins, draws, and goals in real-time.',
  },
};

export default function GamesTablePage() {
  return (
    <Suspense
      fallback={
        <div className='container mx-auto px-6 py-12 max-w-6xl text-center text-pw-muted'>
          Loading tournament data...
        </div>
      }>
      <GamesClient />
    </Suspense>
  );
}
