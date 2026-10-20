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
    NEW.settings := (NEW.settings - 'customUrl' - 'custom_id' - 'privateKey' - 'privateKeyHash' - 'allowedParticipants' - 'allowedParticipantUsernames' - 'customDisclaimer' - 'hidePingWorldDisclaimer') || jsonb_build_object('isPrivate', false);
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
