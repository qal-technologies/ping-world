-- Supabase Table Creation, Indexes, and Row-Level Security (RLS) Policies

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

-- Server-enforced username change cooldown. The API calls this function with
-- service-role access after authenticating the caller's Supabase session.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_updated_at TIMESTAMPTZ;
UPDATE public.profiles SET username_updated_at = updated_at WHERE username IS NOT NULL AND username_updated_at IS NULL;
CREATE OR REPLACE FUNCTION public.enforce_profile_username_cooldown()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    IF COALESCE(OLD.username_updated_at, OLD.updated_at) + interval '60 days' > now() THEN
      RAISE EXCEPTION 'COOLDOWN';
    END IF;
    NEW.username_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profile_username_cooldown ON public.profiles;
CREATE TRIGGER profile_username_cooldown BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_username_cooldown();
CREATE OR REPLACE FUNCTION public.change_profile_username(user_uuid UUID, username_text TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE next_allowed TIMESTAMPTZ; changed_at TIMESTAMPTZ := now();
BEGIN
  IF username_text !~ '^[a-z0-9_]{5,20}$' THEN RAISE EXCEPTION 'INVALID_USERNAME'; END IF;
  PERFORM 1 FROM public.profiles WHERE id = user_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  SELECT COALESCE(username_updated_at, updated_at) + interval '60 days'
    INTO next_allowed FROM public.profiles WHERE id = user_uuid;
  IF next_allowed IS NOT NULL AND changed_at < next_allowed THEN RAISE EXCEPTION 'COOLDOWN'; END IF;
  UPDATE public.profiles SET username = username_text, username_updated_at = changed_at, updated_at = changed_at WHERE id = user_uuid;
  RETURN changed_at + interval '60 days';
END;
$$;
REVOKE ALL ON FUNCTION public.change_profile_username(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_profile_username(UUID, TEXT) TO service_role;

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
  notification_type TEXT NOT NULL CHECK (notification_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  pending_count INTEGER NOT NULL DEFAULT 0 CHECK (pending_count >= 0),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  read_count INTEGER NOT NULL DEFAULT 0 CHECK (read_count >= 0),
  done_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claim_token UUID,
  claim_until TIMESTAMPTZ,
  UNIQUE (recipient_id, resource_id, notification_type)
);
ALTER TABLE public.notification_batches ADD COLUMN IF NOT EXISTS read_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.notification_batches ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.notification_batches ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;
ALTER TABLE public.notification_batches DROP CONSTRAINT IF EXISTS notification_batches_notification_type_check;
ALTER TABLE public.notification_batches ADD CONSTRAINT notification_batches_notification_type_check CHECK (notification_type ~ '^[a-z][a-z0-9_]{1,63}$');
CREATE INDEX IF NOT EXISTS idx_notification_batches_pending ON public.notification_batches(last_event_at) WHERE pending_count > 0;

-- A single expiring row per account supports focus-aware push delivery without
-- storing device history or creating one row per notification/event.
CREATE TABLE IF NOT EXISTS public.notification_presence (
  recipient_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  active_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_presence_expiry ON public.notification_presence(active_until);
ALTER TABLE public.notification_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_presence FROM anon, authenticated;
GRANT ALL ON TABLE public.notification_presence TO service_role;
ALTER TABLE public.notification_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_batches FROM anon, authenticated;
GRANT ALL ON TABLE public.notification_batches TO service_role;
-- Authenticated clients may receive only their own notification rows over
-- Realtime. They still cannot insert, update, or delete notification batches.
GRANT SELECT ON TABLE public.notification_batches TO authenticated;
DROP POLICY IF EXISTS notification_batches_read_own ON public.notification_batches;
CREATE POLICY notification_batches_read_own ON public.notification_batches
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_batches;
EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN RAISE NOTICE 'Supabase Realtime publication is unavailable; API polling remains enabled.';
END $$;

CREATE OR REPLACE FUNCTION public.queue_assessment_response_notification(recipient_uuid UUID, quiz_uuid UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE batch_id UUID;
BEGIN
  INSERT INTO public.notification_batches(recipient_id, resource_id, notification_type, pending_count, total_count, payload, last_event_at)
  VALUES (recipient_uuid, quiz_uuid, 'assessment_response', 1, 1,
    jsonb_build_object('title', 'Assessment responses', 'body', 'New responses are ready to review.',
      'action', jsonb_build_object('label', 'View feedback', 'href', '/quiz?feedback=' || quiz_uuid::text), 'icon', 'assessment'), now())
  ON CONFLICT (recipient_id, resource_id, notification_type) DO UPDATE
    SET pending_count = notification_batches.pending_count + 1,
        total_count = notification_batches.total_count + 1,
        payload = jsonb_build_object(
          'title', 'Assessment responses',
          'body', 'New responses are ready to review.',
          'action', jsonb_build_object('label', 'View feedback', 'href', '/quiz?feedback=' || quiz_uuid::text),
          'icon', 'assessment'
        ),
        done_at = NULL,
        last_event_at = now()
  RETURNING id INTO batch_id;
  RETURN batch_id;
END; $$;

-- Reusable enqueue API for any app feature. The unique recipient/resource/type
-- key coalesces repeated events into one row; only service-role code can call it.
CREATE OR REPLACE FUNCTION public.queue_in_app_notification(
  recipient_uuid UUID, resource_uuid UUID, type_text TEXT, title_text TEXT,
  body_text TEXT, action_href TEXT DEFAULT NULL, action_label TEXT DEFAULT NULL,
  icon_text TEXT DEFAULT 'bell'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE batch_id UUID; notification_payload JSONB;
BEGIN
  IF type_text !~ '^[a-z][a-z0-9_]{1,63}$' OR length(title_text) > 160 OR length(body_text) > 1000 THEN
    RAISE EXCEPTION 'Invalid notification payload';
  END IF;
  IF action_href IS NOT NULL AND (action_href NOT LIKE '/%' OR action_href LIKE '//%' OR length(action_href) > 512) THEN
    RAISE EXCEPTION 'Invalid notification action';
  END IF;
  notification_payload := jsonb_build_object('title', title_text, 'body', body_text, 'icon', left(icon_text, 40));
  IF action_href IS NOT NULL THEN
    notification_payload := notification_payload || jsonb_build_object('action', jsonb_build_object('label', left(coalesce(action_label, 'Open'), 40), 'href', action_href));
  END IF;
  INSERT INTO public.notification_batches(recipient_id, resource_id, notification_type, pending_count, total_count, payload, last_event_at)
  VALUES (recipient_uuid, resource_uuid, type_text, 1, 1, notification_payload, now())
  ON CONFLICT (recipient_id, resource_id, notification_type) DO UPDATE
    SET pending_count = notification_batches.pending_count + 1,
        total_count = notification_batches.total_count + 1,
        payload = EXCLUDED.payload, done_at = NULL, last_event_at = now()
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
REVOKE ALL ON FUNCTION public.queue_in_app_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_notification_batch(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ack_notification_batch(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_notification_batch(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_assessment_response_notification(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_in_app_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
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
-- Extended the quizzes table schema with all the missing camelCase and snake_case configuration columns
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
  "correctOptionDes" TEXT DEFAULT 'in-result',
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

-- Resource ids are app-wide (not quiz-only); owning APIs delete associated
-- batches explicitly when deleting a resource.
ALTER TABLE public.notification_batches DROP CONSTRAINT IF EXISTS notification_batches_resource_id_fkey;

-- Assessment writes are restricted using server-managed app metadata.
-- Existing installations should verify the assessment write trigger and apply only a missing release migration.
CREATE OR REPLACE FUNCTION public.enforce_pro_assessment_privacy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
DECLARE
  owner_metadata JSONB;
  expiry_at TIMESTAMPTZ;
  tier_name TEXT := 'free';
  purchased_tools JSONB := '[]'::jsonb;
  quiz_is_active BOOLEAN := false;
  pro_is_active BOOLEAN := false;
  max_file_size_mb NUMERIC := 5;
  max_expiry_days INTEGER := 2;
BEGIN
  IF jsonb_typeof(NEW.settings) <> 'object' OR NEW.settings IS NULL THEN NEW.settings := '{}'::jsonb; END IF;
  IF jsonb_typeof(NEW.questions) <> 'array' OR NEW.questions IS NULL THEN NEW.questions := '[]'::jsonb; END IF;
  SELECT raw_app_meta_data INTO owner_metadata FROM auth.users WHERE id = NEW.user_id;
  tier_name := COALESCE(owner_metadata->>'tier', 'free');
  purchased_tools := COALESCE(owner_metadata->'purchased_tools', '[]'::jsonb);
  IF tier_name IN ('pro', 'standard', 'flexible') THEN
    BEGIN
      expiry_at := (owner_metadata->>'tier_expires_at')::timestamptz;
      pro_is_active := tier_name = 'pro' AND expiry_at > now();
      quiz_is_active := expiry_at > now() AND (tier_name IN ('pro', 'standard') OR (tier_name = 'flexible' AND purchased_tools ?| ARRAY['quizzable', 'quiz', 'quiz-builder']));
      max_expiry_days := CASE WHEN pro_is_active THEN 30 WHEN tier_name = 'standard' AND quiz_is_active THEN 14 WHEN quiz_is_active THEN 7 ELSE 2 END;
    EXCEPTION WHEN OTHERS THEN
      pro_is_active := false;
      quiz_is_active := false;
    END;
  END IF;
  IF NOT quiz_is_active THEN
    NEW.settings := (NEW.settings - 'branding' - 'allowPass') || jsonb_build_object('fromPremium', false);
  ELSE
    NEW.settings := jsonb_set(NEW.settings, '{fromPremium}', 'true'::jsonb, true);
    max_file_size_mb := CASE WHEN tier_name = 'pro' THEN 50 ELSE 15 END;
  END IF;
  IF NEW.expires_at IS NULL OR NEW.expires_at > NEW.created_at + make_interval(days => max_expiry_days) THEN
    NEW.expires_at := NEW.created_at + make_interval(days => max_expiry_days);
  END IF;
  IF NOT pro_is_active THEN
    NEW.custom_id := NULL;
    NEW.settings := (NEW.settings - 'customUrl' - 'custom_id' - 'privateKey' - 'privateKeyHash' - 'allowedParticipants' - 'allowedParticipantUsernames' - 'info' - 'customDisclaimer' - 'hidePingWorldDisclaimer') || jsonb_build_object('isPrivate', false);
  ELSE
    IF NEW.custom_id IS NOT NULL AND NEW.custom_id !~ '^[a-z0-9_-]{1,12}$' THEN RAISE EXCEPTION 'A Pro custom quiz URL must be 1 to 12 lowercase letters, numbers, hyphens, or underscores'; END IF;
    IF NEW.settings->>'isPrivate' IS DISTINCT FROM 'true' THEN
      NEW.settings := NEW.settings - 'privateKey' - 'privateKeyHash' - 'allowedParticipantUsernames';
    ELSIF COALESCE(NEW.settings->>'privateKeyHash', '') !~ '^[a-fA-F0-9]{64}$' THEN
      RAISE EXCEPTION 'An active Pro assessment must have a valid access-key hash before it can be private';
    ELSE
      NEW.settings := NEW.settings - 'privateKey';
    END IF;
  END IF;
  SELECT COALESCE(jsonb_agg(CASE WHEN jsonb_typeof(q.value) = 'object' THEN
    jsonb_set(jsonb_set(q.value, '{maxFileSize}', to_jsonb(LEAST(max_file_size_mb, GREATEST(1,
      CASE WHEN COALESCE(q.value->>'maxFileSize', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN (q.value->>'maxFileSize')::numeric ELSE max_file_size_mb END
    ))), true), '{allowedTypes}', to_jsonb(CASE
      WHEN NOT quiz_is_active AND (COALESCE(q.value->>'allowedTypes', '') = '.' OR position('video/' in lower(COALESCE(q.value->>'allowedTypes', ''))) > 0 OR position('audio/' in lower(COALESCE(q.value->>'allowedTypes', ''))) > 0 OR position('.zip' in lower(COALESCE(q.value->>'allowedTypes', ''))) > 0)
        THEN 'image/*,.pdf,.doc,.docx,.txt,.json,application/json'
      ELSE COALESCE(q.value->>'allowedTypes', 'image/*,.pdf,.doc,.docx,.txt,.json,application/json')
    END), true) ELSE q.value END ORDER BY q.ordinality), '[]'::jsonb)
  INTO NEW.questions FROM jsonb_array_elements(NEW.questions) WITH ORDINALITY AS q(value, ordinality);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_pro_assessment_privacy ON public.quizzes;
CREATE TRIGGER enforce_pro_assessment_privacy BEFORE INSERT OR UPDATE OF settings, user_id, custom_id, questions ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_assessment_privacy();
REVOKE ALL ON FUNCTION public.enforce_pro_assessment_privacy() FROM PUBLIC, anon, authenticated;

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
  score NUMERIC NOT NULL,
  total_questions INTEGER NOT NULL,
  user_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  answers JSONB DEFAULT '[]'::jsonb NOT NULL
);
ALTER TABLE public.quiz_responses ALTER COLUMN score TYPE NUMERIC USING score::NUMERIC;

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
  user_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_key_hash TEXT
);
-- Idempotent install/update for existing test databases. The raw device key is
-- never stored; the API stores only its SHA-256 digest for one-attempt quizzes.
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS device_key_hash TEXT;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_status ON public.quiz_attempts(quiz_id, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_device_once
  ON public.quiz_attempts(quiz_id, device_key_hash) WHERE device_key_hash IS NOT NULL;

-- Save a completed response and close its authenticated attempt atomically.
-- The API passes only a hash of the attempt token; raw tokens never enter SQL.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt_response(
  response_uuid UUID,
  quiz_uuid UUID,
  response_score NUMERIC,
  response_total INTEGER,
  response_user_data JSONB,
  response_answers JSONB,
  attempt_uuid UUID,
  attempt_token_hash TEXT
)
RETURNS TABLE (response_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_attempt public.quiz_attempts%ROWTYPE;
BEGIN
  IF response_uuid IS DISTINCT FROM attempt_uuid THEN
    RAISE EXCEPTION 'RESPONSE_ATTEMPT_ID_MISMATCH';
  END IF;

  SELECT * INTO locked_attempt
  FROM public.quiz_attempts
  WHERE id = attempt_uuid
    AND quiz_id = quiz_uuid
    AND attempt_token_hash = submit_quiz_attempt_response.attempt_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_AUTHORIZATION_FAILED';
  END IF;

  IF locked_attempt.status = 'submitted' THEN
    RETURN QUERY SELECT existing.id FROM public.quiz_responses AS existing
    WHERE existing.id = response_uuid AND existing.quiz_id = quiz_uuid;
    RETURN;
  END IF;
  IF locked_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_ACTIVE';
  END IF;

  INSERT INTO public.quiz_responses (id, quiz_id, score, total_questions, user_data, answers)
  VALUES (response_uuid, quiz_uuid, response_score, response_total, response_user_data, response_answers);

  UPDATE public.quiz_attempts
  SET status = 'submitted', answers = '{}'::jsonb, user_data = '{}'::jsonb,
      question_order = '[]'::jsonb, current_question_index = 0, updated_at = now()
  WHERE id = attempt_uuid AND status = 'in_progress';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_CLOSE_FAILED';
  END IF;

  RETURN QUERY SELECT response_uuid;
END;
$$;
DROP FUNCTION IF EXISTS public.submit_quiz_attempt_response(UUID, UUID, INTEGER, INTEGER, JSONB, JSONB, UUID, TEXT);
REVOKE ALL ON FUNCTION public.submit_quiz_attempt_response(UUID, UUID, NUMERIC, INTEGER, JSONB, JSONB, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt_response(UUID, UUID, NUMERIC, INTEGER, JSONB, JSONB, UUID, TEXT) TO service_role;

-- Reports are write/read restricted to the server admin client. Five distinct
-- reporters place an assessment into review; the public quiz API then pauses it.
CREATE TABLE IF NOT EXISTS public.quiz_reports (
  id UUID PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes ON DELETE CASCADE,
  category TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 2000),
  reporter_key TEXT NOT NULL,
  reporter_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);
ALTER TABLE public.quiz_reports ADD COLUMN IF NOT EXISTS reporter_key TEXT;
UPDATE public.quiz_reports SET reporter_key = 'legacy:' || id::text WHERE reporter_key IS NULL;
ALTER TABLE public.quiz_reports ALTER COLUMN reporter_key SET NOT NULL;
ALTER TABLE public.quiz_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.quiz_reports FROM anon, authenticated;
GRANT ALL ON TABLE public.quiz_reports TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_reports_one_per_reporter
  ON public.quiz_reports(quiz_id, reporter_key);
CREATE INDEX IF NOT EXISTS idx_quiz_reports_review_queue
  ON public.quiz_reports(quiz_id, status, created_at DESC);

-- The dashboard fetches all card counts in one owner-scoped aggregate call.
CREATE OR REPLACE FUNCTION public.get_quiz_response_counts(owner_uuid UUID)
RETURNS TABLE (quiz_id UUID, response_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT activity.quiz_id, COUNT(*)::BIGINT
  FROM (
    SELECT response.quiz_id
    FROM public.quiz_responses AS response
    UNION ALL
    SELECT attempt.quiz_id
    FROM public.quiz_attempts AS attempt
    WHERE attempt.status = 'in_progress'
  ) AS activity
  INNER JOIN public.quizzes AS quiz ON quiz.id = activity.quiz_id
  WHERE quiz.user_id = owner_uuid
  GROUP BY activity.quiz_id;
$$;
REVOKE ALL ON FUNCTION public.get_quiz_response_counts(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_response_counts(UUID) TO service_role;

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
-- Created tournaments table for competitive games tracking
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
-- Created short links table for redirects
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
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_timestamp ON public.quiz_responses(quiz_id, timestamp DESC);
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

