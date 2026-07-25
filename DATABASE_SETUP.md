# 🗄️ PingWorld Database Setup & Rules Guide (Supabase + Firebase)

This guide provides the complete database schemas, table creation statements, row-level security (RLS) policies, indexes, and security rules for both **Supabase (PostgreSQL)** and **Firebase (Firestore/Realtime Database)**.

---

## ⚡ 1. QUICK HEAL: SQL Database Healing Migration (Supabase SQL Editor)
If you have already executed a previous SQL schema script and are seeing `400 (Bad Request)` errors in your browser console when navigating quizzes or messages, it means your existing tables are missing the correct column structure.

Paste this **Healing Migration block** directly into your **Supabase SQL Editor** and click **Run**. This will gracefully add all missing columns to existing tables without erasing any of your current data:

```sql
-- jules edit: Safe PostgreSQL database column healing migration script

-- 1. UPGRADE PUBLIC.QUIZZES TABLE with camelCase and JSON columns
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'multiple-choice';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "canGoBack" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "showScore" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "hasTimer" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "correctOption" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "correctOptionDes" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "randomizeOptions" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "randomizeQuestions" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "allowRetry" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "enforceSecurity" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "enforceIdentity" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "askDetails" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "endScreen" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 2. UPGRADE PUBLIC.MESSAGES TABLE with content and seen tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. UPGRADE PUBLIC.PROFILES TABLE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. ENSURE SHORT_LINKS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.short_links (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES auth.users ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0 NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS original_url TEXT;
ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 5. ENSURE TOURNAMENTS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  teams JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users ON DELETE CASCADE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS teams JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
```

---

## 🔵 2. Supabase (Fresh Table Creation, Indexes, & RLS Policies)

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
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- jules edit: Safe migration instructions to guarantee existing databases are auto-patched with the new columns
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'trivia';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "canGoBack" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "showScore" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "hasTimer" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "correctOption" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "correctOptionDes" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "randomizeOptions" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "randomizeQuestions" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "allowRetry" BOOLEAN DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "enforceSecurity" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "enforceIdentity" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "askDetails" BOOLEAN DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS "endScreen" JSONB DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Enable RLS on Quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Quizzes Policies
CREATE POLICY "Quizzes are viewable by everyone (until expired)"
  ON public.quizzes FOR SELECT USING (expires_at IS NULL OR expires_at > now());

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
  ON public.quiz_responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Quiz owners can view responses"
  ON public.quiz_responses FOR SELECT USING (
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
    COALESCE(new.raw_user_meta_data->>'display_name', new.email?.split('@')[0] || 'User'),
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

## 🔥 3. Firebase Firestore (Schema Structs & Security Rules)

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
