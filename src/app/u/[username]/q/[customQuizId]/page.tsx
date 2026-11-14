import PublicQuizTaker from '@/components/quiz/PublicQuizTaker';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';

interface CustomQuizParams {
  params: Promise<{ username: string; customQuizId: string }>;
}

export async function generateMetadata({ params }: CustomQuizParams): Promise<Metadata> {
  const { username, customQuizId } = await params;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('username', username)
      .single();
    if (!profile) throw new Error('Quiz owner not found');

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('title, description')
      .eq('custom_id', customQuizId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (quiz) {
      const title = `${quiz.title} by ${profile.display_name} | Quizzable`;
      const description = quiz.description || `Assessment created by ${profile.display_name}`;
      return {
        title,
        description,
        openGraph: {title, description, type: 'website'},
        robots: {
          follow: false,
          index:false,
        }
      };
    }
  } catch (e) {
    console.warn('Failed to load metadata for custom quiz', e);
  }

  return {
    title: `Assessment by @${username} | Quizzable`,
    description: `Take custom assessment by @${username}`,
    
  };
}

export default function UserCustomQuizPage() {
  return <PublicQuizTaker />;
}
