# API Keys Reference Guide

This document lists all third-party API integrations in PingWorld, whether they're placeholder stubs or active, and exactly where to get the required keys.

---

## Active Integrations

### Supabase (Database & Auth)
- **Status:** ✅ Active — project already configured
- **Type:** Persistent storage for quizzes, messages, links, profiles, and tournament standings
- **Where to get keys:** [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API
- **Required env vars:**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

---

## Placeholder Integrations (Need Setup)

### Firebase (Realtime DB — for live leaderboards & message streams)
- **Status:** 🚧 Stub — `useFirebase.ts` exists with typed interface but Firebase SDK is NOT installed
- **Type:** Realtime Database or Firestore for high-frequency live events (quiz leaderboards, message reply streams)
- **Where to get keys:** [console.firebase.google.com](https://console.firebase.google.com) → Create Project → Project Settings → Web App → Firebase SDK
- **Installation:** `npm install firebase`
- **Required env vars:**
  ```env
  NEXT_PUBLIC_FIREBASE_API_KEY=your-key
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-id
  NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
  ```
- **Activation:** Update `src/hooks/useFirebase.ts` → replace `TODO` stubs with real Firestore/RTDB calls

---

### IPInfo.io (IP Locator Tool)
- **Status:** 🚧 Placeholder — IP Locator page uses a hardcoded demo response
- **Type:** Geolocation data from IP addresses (city, country, ISP, lat/lng)
- **Where to get keys:** [ipinfo.io/account](https://ipinfo.io/account) — Free plan: 50k lookups/month
- **Required env var:**
  ```env
  NEXT_PUBLIC_IPINFO_TOKEN=your-token-here
  ```
- **Integration point:** `src/app/(main)/tools/ip-locator/`

---

### ExchangeRate-API (Currency Calculator Tab)
- **Status:** 🚧 Placeholder — Currency tab uses static rates
- **Type:** Live exchange rate data for currency conversion tab in Multi Calculator
- **Where to get keys:** [exchangerate-api.com](https://exchangerate-api.com) — Free: 1,500 requests/month
- **Required env var:**
  ```env
  NEXT_PUBLIC_EXCHANGE_API_KEY=your-key
  ```
- **Integration point:** `src/app/(main)/tools/calculator/CalculatorClient.tsx` → Currency tab

---

### Remove.bg (Image Background Removal)
- **Status:** 🚧 Placeholder — Background removal button in Image Toolkit is UI-only
- **Type:** Paid AI-based background removal API
- **Where to get keys:** [remove.bg/api](https://www.remove.bg/api) — Free: 50 previews/month; paid for HD
- **Required env var:**
  ```env
  NEXT_PUBLIC_REMOVEBG_KEY=your-key
  ```
- **Integration point:** `src/app/(main)/image/` → background removal handler

---

### OpenAI / Google Gemini (AI-Assist in Composer)
- **Status:** 🚧 Placeholder — AI content improvement buttons are stubbed
- **Type:** LLM API for grammar checking, translation, hashtag generation in Creator Hub
- **Where to get keys:**
  - **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - **Google AI Studio (Gemini):** [aistudio.google.com](https://aistudio.google.com) — Free tier available
- **Required env var:**
  ```env
  OPENAI_API_KEY=sk-your-openai-key
  # OR
  NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
  ```
- **Integration point:** `src/app/(main)/composer/`

---

### Vercel Cron (Expired Message Cleanup)
- **Status:** ✅ Configured via `vercel.json` — runs daily at 2 AM UTC
- **Type:** Serverless cron job targeting `/api/cleanup-messages`
- **Optional security:** Set `CRON_SECRET` env var in Vercel dashboard to protect the endpoint
  ```env
  CRON_SECRET=your-random-secret-string
  ```
- **Endpoint file:** `src/app/api/cleanup-messages/route.ts`

---

## .env.local Template

Copy the following to your `.env.local` file and fill in the values:

```env
# ACTIVE (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# PLACEHOLDER (Firebase — install SDK first)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# PLACEHOLDER (IP Locator)
NEXT_PUBLIC_IPINFO_TOKEN=

# PLACEHOLDER (Currency Calculator)
NEXT_PUBLIC_EXCHANGE_API_KEY=

# PLACEHOLDER (Background Removal)
NEXT_PUBLIC_REMOVEBG_KEY=

# PLACEHOLDER (AI Composer)
OPENAI_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=

# OPTIONAL (Cron security)
CRON_SECRET=
```
