import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import PublicInboxForm from './PublicInboxForm';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `Send ${username} an anonymous message — Ping World`,
    description: `Send an anonymous message to @${username}. They won't know who you are.`,
    alternates: { canonical: `/u/${username}` },
  };
}

export default async function PublicInboxPage({ params }: Props) {
  const { username } = await params;

  // Look up the recipient
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, subscription_tier, custom_question')
    .eq('username', username)
    .single();

  return (
    <PublicInboxForm
      profile={profile}
      username={username}
    />
  );
}
