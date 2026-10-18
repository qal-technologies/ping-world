'use client';
import { useParams } from 'next/navigation';
import PublicQuizResponseView from '@/components/quiz/PublicQuizResponseView';
export default function SharedResponsePage() {
  const params = useParams<{ id: string }>();
  return <PublicQuizResponseView publicId={params.id} />;
}
