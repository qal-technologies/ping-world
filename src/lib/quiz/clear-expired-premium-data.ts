import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Remove only Pro-only quiz metadata and its branding objects. Assessment
 * content, questions, responses and response media are deliberately retained. */
export async function clearExpiredPremiumQuizData(admin: SupabaseClient, userId: string) {
  const { data: quizzes, error } = await admin.from('quizzes')
    .select('id,settings').eq('user_id', userId).limit(1000);
  if (error) throw error;

  for (const quiz of quizzes || []) {
    const settings = quiz.settings && typeof quiz.settings === 'object' ? { ...quiz.settings } : {};
    delete settings.branding;
    delete settings.customUrl;
    delete settings.custom_id;
    delete settings.isCustom;
    delete settings.privateKey;
    delete settings.privateKeyHash;
    delete settings.allowedParticipants;
    delete settings.allowedParticipantUsernames;
    delete settings.fromPremium;
    settings.isPrivate = false;
    const { error: updateError } = await admin.from('quizzes').update({ custom_id: null, settings, updated_at: new Date().toISOString() })
      .eq('id', quiz.id).eq('user_id', userId);
    if (updateError) throw updateError;

    const base = `${userId}/${String(quiz.id).replace(/[^a-zA-Z0-9_-]/g, '')}/branding`;
    const { data: files, error: listError } = await admin.storage.from('quiz-media').list(base, { limit: 1000 });
    if (listError) throw listError;
    const paths = (files || []).filter((file) => file.name && file.id).map((file) => `${base}/${file.name}`);
    if (paths.length) {
      const { error: removeError } = await admin.storage.from('quiz-media').remove(paths);
      if (removeError) throw removeError;
    }
  }
  const { data: account } = await admin.auth.admin.getUserById(userId);
  if (account.user) {
    const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...account.user.app_metadata, premium_quiz_cleanup_at: new Date().toISOString() },
    });
    if (metadataError) throw metadataError;
  }
  return { quizzes: quizzes?.length || 0 };
}
