'use client';
import { useParams } from 'next/navigation';
import PublicQuizResponseView from '@/components/quiz/PublicQuizResponseView';
export default function SharedTakerResponsePage() {
  const params = useParams<{ id: string }>();
  return <PublicQuizResponseView publicId={params.id} />;
}
