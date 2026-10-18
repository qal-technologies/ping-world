'use client';

import { useParams } from 'next/navigation';
import PublicQuizResponsesView from '@/components/quiz/PublicQuizResponsesView';

export default function SharedQuizResponsesPage() {
  const params = useParams<{ id: string }>();
  return <PublicQuizResponsesView publicId={params.id} />;
}
