-- Widen the legacy boolean column to the string values written by the builder.
DO $$
DECLARE
  column_type TEXT;
BEGIN
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'quizzes'
    AND column_name = 'correctOptionDes';

  IF column_type = 'boolean' THEN
    ALTER TABLE public.quizzes ALTER COLUMN "correctOptionDes" DROP DEFAULT;
    ALTER TABLE public.quizzes
      ALTER COLUMN "correctOptionDes" TYPE TEXT
      USING CASE WHEN "correctOptionDes" IS TRUE THEN 'in-question' ELSE 'in-result' END;
  END IF;

  ALTER TABLE public.quizzes
    ALTER COLUMN "correctOptionDes" SET DEFAULT 'in-result';
END;
$$;
