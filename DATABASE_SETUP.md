# 🗄️ PingWorld Database Setup & Rules Guide (Supabase + Firebase)

This guide provides the complete database schemas, table creation statements, row-level security (RLS) policies, indexes, and security rules for both **Supabase (PostgreSQL)** and **Firebase (Firestore/Realtime Database)**.

## Required server environment

Set `SUPABASE_SERVICE_ROLE_KEY` only in the server/deployment environment (never in a `NEXT_PUBLIC_*` variable or browser bundle). The API routes use it to return redacted public quizzes, grade submissions, sign quiz-media uploads scoped to the authenticated owner's quiz path, and run cleanup jobs. Image bytes upload directly from the browser to Supabase Storage using the short-lived signed token, so they do not pass through the app server. Configure `CRON_SECRET` for scheduled cleanup, `FIREBASE_SERVICE_ACCOUNT_KEY` only if the Firebase bridge is enabled, and a free VAPID key pair (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY_BASE64`, `VAPID_SUBJECT`) for Web Push delivery. Keep `VAPID_PRIVATE_KEY_BASE64` server-only. The admin client fails closed when the service role key is missing.

Generate a free VAPID P-256 key pair with Node's built-in crypto (no added package):

```sh
node -e "const c=require('node:crypto');const {privateKey,publicKey}=c.generateKeyPairSync('ec',{namedCurve:'prime256v1'});const p=publicKey.export({format:'jwk'});const raw=Buffer.concat([Buffer.from([4]),Buffer.from(p.x,'base64url'),Buffer.from(p.y,'base64url')]);console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY='+raw.toString('base64url'));console.log('VAPID_PRIVATE_KEY_BASE64='+privateKey.export({format:'der',type:'pkcs8'}).toString('base64'));"
```

Set `VAPID_SUBJECT` to a monitored `mailto:` address. For themed welcome, paid subscription-confirmation, and response-export emails, set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to a sender verified with Resend. Welcome emails are sent after email verification; exports are restricted to an active server-confirmed paid account. Apply the fresh schema below before enabling Web Push.

Public quiz reads and response writes use `/api/quizzes/[id]` and `/api/quiz-responses`. For the testing environment, create a fresh Supabase project and run the complete schema below once.

---

## 🔵 1. Supabase (Fresh Table Creation, Indexes, & RLS Policies)

If you are setting up a fresh database, run the following complete schema query. It creates all tables with the exact columns and configurations needed by the application out-of-the-box:

```sql
-- jules edit: Supabase Table Creation, Indexes, and Row-Level Security (RLS) Policies

-- ==========================================
-- 1. PROFILES TABLE (User metadata & tier tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  tier TEXT DEFAULT 'free',
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Per-device Web Push subscriptions. Endpoints and encryption keys are private.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_owner_id ON public.push_subscriptions(owner_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can register their push subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can remove their push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);
REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;

-- One durable, coalescing row per quiz owner. Bursts increment this row instead
-- of inserting a notification row for every response.
CREATE TABLE IF NOT EXISTS public.notification_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type = 'assessment_response'),
  pending_count INTEGER NOT NULL DEFAULT 0 CHECK (pending_count >= 0),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claim_token UUID,
  claim_until TIMESTAMPTZ,
  UNIQUE (recipient_id, resource_id, notification_type)
);
CREATE INDEX IF NOT EXISTS idx_notification_batches_pending ON public.notification_batches(last_event_at) WHERE pending_count > 0;
ALTER TABLE public.notification_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_batches FROM anon, authenticated;
GRANT ALL ON TABLE public.notification_batches TO service_role;

CREATE OR REPLACE FUNCTION public.queue_assessment_response_notification(recipient_uuid UUID, quiz_uuid UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE batch_id UUID;
BEGIN
  INSERT INTO public.notification_batches(recipient_id, resource_id, notification_type, pending_count, total_count, last_event_at)
  VALUES (recipient_uuid, quiz_uuid, 'assessment_response', 1, 1, now())
  ON CONFLICT (recipient_id, resource_id, notification_type) DO UPDATE
    SET pending_count = notification_batches.pending_count + 1,
        total_count = notification_batches.total_count + 1,
        last_event_at = now()
  RETURNING id INTO batch_id;
  RETURN batch_id;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_notification_batch(batch_uuid UUID, claim_token UUID)
RETURNS SETOF public.notification_batches LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE public.notification_batches
  SET claim_token = $2, claim_until = now() + interval '2 minutes'
  WHERE id = $1 AND pending_count > 0 AND (claim_until IS NULL OR claim_until < now())
  RETURNING *;
$$;
CREATE OR REPLACE FUNCTION public.ack_notification_batch(batch_uuid UUID, claim_token UUID, delivered_count INTEGER)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE public.notification_batches SET pending_count = GREATEST(0, pending_count - GREATEST(0, $3)), claim_token = NULL, claim_until = NULL
  WHERE id = $1 AND claim_token = $2;
$$;
CREATE OR REPLACE FUNCTION public.release_notification_batch(batch_uuid UUID, claim_token UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE public.notification_batches SET claim_token = NULL, claim_until = now() + interval '5 minutes' WHERE id = $1 AND claim_token = $2;
$$;
REVOKE ALL ON FUNCTION public.queue_assessment_response_notification(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_notification_batch(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ack_notification_batch(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_notification_batch(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_assessment_response_notification(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_batch(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.ack_notification_batch(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_notification_batch(UUID, UUID) TO service_role;

-- Idempotency ledger for the one-time welcome and paid lifecycle emails.
CREATE TABLE IF NOT EXISTS public.transactional_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  event_key TEXT NOT NULL UNIQUE,
  email_type TEXT NOT NULL CHECK (email_type IN ('welcome', 'subscription_confirmed')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
ALTER TABLE public.transactional_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.transactional_email_events FROM anon, authenticated;
GRANT ALL ON TABLE public.transactional_email_events TO service_role;

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 2. QUIZZES TABLE (Quizzable tool data)
-- ==========================================
-- jules edit: Extended the quizzes table schema with all the missing camelCase and snake_case configuration columns
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'multiple-choice',
  questions JSONB DEFAULT '[]'::jsonb NOT NULL,
  responses JSONB DEFAULT '[]'::jsonb,
  "canGoBack" BOOLEAN DEFAULT true,
  "showScore" BOOLEAN DEFAULT true,
  "hasTimer" BOOLEAN DEFAULT false,
  "correctOption" BOOLEAN DEFAULT true,
  "correctOptionDes" BOOLEAN DEFAULT true,
  "randomizeOptions" BOOLEAN DEFAULT false,
  "randomizeQuestions" BOOLEAN DEFAULT false,
  "allowRetry" BOOLEAN DEFAULT true,
  "enforceSecurity" BOOLEAN DEFAULT false,
  "enforceIdentity" BOOLEAN DEFAULT false,
  "askDetails" BOOLEAN DEFAULT false,
  "endScreen" JSONB DEFAULT '{}'::jsonb,
  custom_id TEXT,
  settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_batches_resource_id_fkey') THEN
    ALTER TABLE public.notification_batches ADD CONSTRAINT notification_batches_resource_id_fkey
      FOREIGN KEY (resource_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on Quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Quizzes Policies
CREATE POLICY "Quizzes are viewable by everyone (until expired)"
  ON public.quizzes FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create quizzes"
  ON public.quizzes FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes"
  ON public.quizzes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes"
  ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. QUIZ RESPONSES TABLE (Scores & participant answers)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  user_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  answers JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- Enable RLS on Quiz Responses
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Quiz Responses Policies
CREATE POLICY "Anyone can submit responses"
  ON public.quiz_responses FOR INSERT WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes ON DELETE CASCADE,
  attempt_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_question_index INTEGER NOT NULL DEFAULT 0,
  question_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_data JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_status ON public.quiz_attempts(quiz_id, status, updated_at DESC);

CREATE POLICY "Quiz owners can view responses"
  ON public.quiz_responses FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE public.quizzes.id = quiz_responses.quiz_id
      AND public.quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Quiz owners can delete responses"
  ON public.quiz_responses FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE public.quizzes.id = quiz_responses.quiz_id
      AND public.quizzes.user_id = auth.uid()
    )
  );

-- ==========================================
-- 4. MESSAGES TABLE (AnonLink tool messaging)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_seen BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages Policies
CREATE POLICY "Anyone can send anonymous messages"
  ON public.messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Recipients can view their own messages"
  ON public.messages FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can toggle message seen status"
  ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can delete their own messages"
  ON public.messages FOR DELETE USING (auth.uid() = recipient_id);

-- ==========================================
-- 5. TOURNAMENTS TABLE (Games standings tool data)
-- ==========================================
-- jules edit: Created tournaments table for competitive games tracking
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  teams JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are viewable by everyone"
  ON public.tournaments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their own tournaments"
  ON public.tournaments FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 6. SHORT LINKS TABLE (URL Shortener tool data)
-- ==========================================
-- jules edit: Created short links table for redirects
CREATE TABLE IF NOT EXISTS public.short_links (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES auth.users ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0 NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Short Links
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Short links are viewable by everyone"
  ON public.short_links FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their own short links"
  ON public.short_links FOR ALL USING (auth.uid() = creator_id);

-- ==========================================
-- 7. PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_user_custom_id ON public.quizzes(user_id, custom_id) WHERE custom_id IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('quiz-media', 'quiz-media', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Public can read assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete assessment media" ON storage.objects;
CREATE POLICY "Public can read assessment media" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'quiz-media');
CREATE POLICY "Owners can upload assessment media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'quiz-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Owners can update assessment media" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'quiz-media' AND auth.uid()::text = (storage.foldername(name))[1]
  ) WITH CHECK (
    bucket_id = 'quiz-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Owners can delete assessment media" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'quiz-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('quiz-response-media', 'quiz-response-media', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Participants can upload response media" ON storage.objects;
DROP POLICY IF EXISTS "Quiz owners can read response media" ON storage.objects;
DROP POLICY IF EXISTS "Quiz owners can delete response media" ON storage.objects;
-- Response uploads are authorized by /api/quiz-response-media using a verified,
-- active attempt and short-lived path-scoped Storage upload token. Do not grant
-- anonymous INSERT access or depend on a client-callable upload RPC here.
CREATE POLICY "Quiz owners can read response media" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'quiz-response-media'
    AND EXISTS (
      SELECT 1 FROM public.quiz_responses response
      JOIN public.quizzes quiz ON quiz.id = response.quiz_id
      WHERE response.id::text = (storage.foldername(name))[2]
        AND quiz.user_id = auth.uid()
    )
  );
CREATE POLICY "Quiz owners can delete response media" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'quiz-response-media'
    AND EXISTS (
      SELECT 1 FROM public.quiz_responses response
      JOIN public.quizzes quiz ON quiz.id = response.quiz_id
      WHERE response.id::text = (storage.foldername(name))[2]
        AND quiz.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.list_expired_quiz_media(p_quiz_ids UUID[])
RETURNS TABLE(bucket_id TEXT, object_name TEXT)
LANGUAGE SQL SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT o.bucket_id, o.name FROM storage.objects o
  JOIN public.quizzes q ON q.id = ANY(p_quiz_ids)
  WHERE q.expires_at IS NOT NULL AND q.expires_at < now() - INTERVAL '48 hours'
    AND ((o.bucket_id = 'quiz-media'
      AND (storage.foldername(o.name))[1] = q.user_id::text
      AND (storage.foldername(o.name))[2] = q.id::text)
      OR (o.bucket_id = 'quiz-response-media'
      AND (storage.foldername(o.name))[1] = q.id::text));
$$;
REVOKE ALL ON FUNCTION public.list_expired_quiz_media(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_expired_quiz_media(UUID[]) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_expired_quizzes(p_quiz_ids UUID[])
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.quizzes
  WHERE id = ANY(p_quiz_ids) AND expires_at IS NOT NULL
    AND expires_at < now() - INTERVAL '48 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_expired_quizzes(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_quizzes(UUID[]) TO service_role;
CREATE INDEX IF NOT EXISTS idx_quizzes_expires_at ON public.quizzes(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON public.quiz_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON public.tournaments(user_id);
CREATE INDEX IF NOT EXISTS idx_short_links_creator_id ON public.short_links(creator_id);

-- ==========================================
-- 8. AUTOMATIC USER PROFILE TRIGGER
-- ==========================================
-- Automatically creates a profile row in public.profiles when a user signs up via Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, tier, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'User'),
    COALESCE(new.raw_user_meta_data->>'tier', 'free'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔥 2. Firebase Firestore (Schema Structs & Security Rules)

If you are using Firebase Firestore alongside or in place of Supabase, copy the configuration rules below into the **Firestore Database Rules** tab of your Firebase Console.

### 📜 Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Is the active request authenticated?
    function isAuth() {
      return request.auth != null;
    }

    // Helper: Does request uid match document owner?
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // ─── PROFILES COLLECTION ───
    match /profiles/{userId} {
      allow read: if true;
      allow create, update: if isAuth() && isOwner(userId);
      allow delete: if false;
    }

    // ─── QUIZZES COLLECTION ───
    match /quizzes/{quizId} {
      allow read: if resource.data.expires_at == null || resource.data.expires_at > request.time;
      allow create: if isAuth() && request.resource.data.user_id == request.auth.uid;
      allow update, delete: if isAuth() && resource.data.user_id == request.auth.uid;
    }

    // ─── QUIZ RESPONSES COLLECTION ───
    match /quiz_responses/{responseId} {
      allow create: if true; // Public submissions allowed
      allow read: if isAuth() && get(/databases/$(database)/documents/quizzes/$(resource.data.quiz_id)).data.user_id == request.auth.uid;
      allow update, delete: if false;
    }

    // ─── MESSAGES COLLECTION ───
    match /messages/{messageId} {
      allow create: if true; // Public anonymous submissions allowed
      allow read, update, delete: if isAuth() && resource.data.recipient_id == request.auth.uid;
    }
  }
}
```

---

## 🛠️ Step-by-Step Paste Directions

### For Supabase SQL Editor:
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Open your project.
3. Click on the **SQL Editor** tab in the left-hand navigation bar (represented by a `SQL` icon).
4. Click on **New Query** to create a blank editor workspace.
5. Paste the entire script from **Section 1** (or **Section 2** if installing from scratch) above into the editor.
6. Click **Run** on the bottom right. You should see `Success. No rows returned.`

### For Firebase Console:
1. Log in to your [Firebase Console](https://console.firebase.google.com).
2. Open your project.
3. Click on **Firestore Database** in the Build menu.
4. Go to the **Rules** tab at the top.
5. Replace everything in the editor box with the rules from **Section 3** above.
6. Click **Publish**.

## Scheduled notification batches

The `/api/notifications/flush` endpoint sends coalesced response alerts after one quiet minute. Keep it behind `CRON_SECRET`. For frequent delivery on a free Vercel Hobby deployment, schedule this endpoint from Supabase instead of adding a frequent Vercel cron (Hobby cron jobs are limited to once per day). Enable the `pg_cron` and `pg_net` extensions in the Supabase dashboard, add `pingworld_app_url` and `pingworld_cron_secret` to Supabase Vault, then run:

```sql
select cron.schedule(
  'pingworld-notification-batches',
  '* * * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'pingworld_app_url') || '/api/notifications/flush',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'pingworld_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );$$
);
```

The app database schema also creates the service-role-only idempotency ledger for welcome and paid subscription emails. Configure the Stripe webhook endpoint at `/api/stripe/webhook` with `STRIPE_WEBHOOK_SECRET`; subscription confirmation is sent only after Stripe reports the paid/active checkout and the verified account is updated server-side.


# Prompt:
## First of all go through the codebase, understand it porperly down to the codes and statemenrs themselves.
1. Look for errors that may cause crash, stale or unfunctional ui or function.
2. Look for best pratices and better logic implementation.
3. All supposed functions, features and implemenrations should be done.
Note that at the point all tools, ai, api, and libs used are to be free and reduce cost for now.
For the quiz section:
1. Work on feedback and analysis, make the imageanswers previewed immediately and when clicked it shows in fllscreen. HAndle analysis for quiz and survey in relation to data these two different types would be getting or expecting. it should be stremed properly, wrapped, not congested and may probaly have it's own modal or page if opened.
2. Create an app-wide auto file opener for both audios, images, videos, pdfs and even docs and make it handle user responses easily and also add to implement to the pdf sections too. Tje opener must render data full screen, cutting out any distractions and have all functions of a player and a file viewer, with things like zoom, page count, title, and other file and player featuers in it. it should be routed/imported to sections that needs it and data sent to it should be properly trimmed and handled too.
3. Handle linking all settings to the frontend properly without missing or errors and may the types match and be appropriate.
4. Hanlde realtime scoring, option correct explationation and answe displaying, option to explain for each option (why it is right or wrong - so disable the feature to add an explation to an option if it the correct option and an explanation has been added to the question already and also gate this option feature and other featues relative to the assessment type too)
5. Handle mentioning in options, input keyworks, brnach rules and everywhere, and ability to add a option branching logic (for mc) to accept an input of a text just to help to be able to pipe in a category or group name and if the eval or pipe fails, default ot the normal flow or end c=group.
6. Look into tightening the taker flow logic and streamlineing it better, i feel it is too populated and may be prone to errors or implementation errors.
7. Make the quiz language or programmatic evaluation more profound and strong and easy to use.
8. Allow an eddit in question texts to be able to add basic, bold, tailic, underline and other basic stlyings
9. Handle piping in feeback too, and handle a better exporting logic and pattern that works.
10. Adding groups in the setter with input doesnt work and seems like th edropdownmenu omponent is having an event glitch or hindrance that makes adding texts to inputs no work at all. loook into it.
11. Make all questions and category in the sidebar actually match the index in the quiz.questions array properly, to avoid seeing them good in sidebar but while using index in the taker everything crashes. Make all questions to be added or removed be in sync with the actual index they are added or removed, and a group map is a range of index where a griuo starts and ends and any question in that group should obey this map to be able to keep question in index sync regardless of when or where the question was added to the array. and the moving and ranking of the questions up and down should reflect this index sync too.
12. Check all types of each questions, option, quiz and implentn all types that are not implentntted and if any unnecessary or duplicate type is seen, remove it. 
13. Categorize all types into relations as i did with timer, branding and categories, this helps in pointing to data easily eithout having to think the type name. and make sure to reflect and change all occurances too
14. Pro users should be able to create a custom assessment id relative to their username and the taker should be able to detect it (username/quiz-id) and it treats the username and id very well 
15. Do a very good sweep, audit and handling on the hybrid storage, to be more efficeitn, has more storage and handles data fast and relative to the user's id (apart from rpc or public data like quiz and others).
16. On the seed template, detect ot and save every edit on it to be only local, to avoid people actually making changes to the global data or saving in the db.

### Pdf section:
1. Handle a better file and data conversion as now it is crap and handles everything badly (use lib if possible)
2. Images gets squashed when exported handle it ot be better and actually use the better object fit for it, to display the images properly.
3. Handle the book editing and implemetmntation better and add the globval opener as th ereader.
4. Handle the book creation sction to be top notch and be th etalk of the town that would attract people to come use it to create their books.
5. Make book lists more simpleir and make everything better
6. Check what anad what actual authors and publishers need for their books and add them to the editor itself.
7. If possible make the input for the book texts themselves displays all the styles directly and images without having a previewer seperatly. 
8. Hnadle images here too not to shrink and exporting to file types to be hdnaled properly.
9. Look into this editor well and make sure to be the best.

### In the composer section:
Look into it you see the idea there right? just make it better without brekaing any thing

### In the image section:
More editing features, more profile and styling features and make ht ebusiness card actually lit.

### add more tools that you feel like people would actually want to use and build them till completion and then add them to /tools and create docs for them.
