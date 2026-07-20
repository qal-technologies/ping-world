import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import PublicBoardClient from './PublicBoardClient';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}'s Public Message Board — Ping World`,
    description: `Browse anonymous messages sent to @${username}.`,
    alternates: { canonical: `/u/${username}/messages` },
  };
}

export default async function PublicBoardPage({ params }: Props) {
  const { username } = await params;

  // Resolve the user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single();

  return <PublicBoardClient profile={profile} username={username} />;
}
