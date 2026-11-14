# 🗄️ PingWorld Database Setup & Rules Guide (Supabase + Firebase)

This guide covers environment configuration, installation steps, Firebase rules, and targeted follow-up operations. The executable Supabase schema is kept in `DATABASE_SCHEMA.sql`.

## Required server environment

Set `SUPABASE_SERVICE_ROLE_KEY` only in the server/deployment environment (never in a `NEXT_PUBLIC_*` variable or browser bundle). The API routes use it to return redacted public quizzes, grade submissions, sign quiz-media uploads scoped to the authenticated owner's quiz path, and run cleanup jobs. Image bytes upload directly from the browser to Supabase Storage using the short-lived signed token, so they do not pass through the app server. Configure `CRON_SECRET` for scheduled cleanup, `FIREBASE_SERVICE_ACCOUNT_KEY` only if the Firebase bridge is enabled, and a free VAPID key pair (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY_BASE64`, `VAPID_SUBJECT`) for Web Push delivery. Keep `VAPID_PRIVATE_KEY_BASE64` server-only. The admin client fails closed when the service role key is missing.

Generate a free VAPID P-256 key pair with Node's built-in crypto (no added package):

```sh
node -e "const c=require('node:crypto');const {privateKey,publicKey}=c.generateKeyPairSync('ec',{namedCurve:'prime256v1'});const p=publicKey.export({format:'jwk'});const raw=Buffer.concat([Buffer.from([4]),Buffer.from(p.x,'base64url'),Buffer.from(p.y,'base64url')]);console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY='+raw.toString('base64url'));console.log('VAPID_PRIVATE_KEY_BASE64='+privateKey.export({format:'der',type:'pkcs8'}).toString('base64'));"
```

Set `VAPID_SUBJECT` to a monitored `mailto:` address. For themed welcome, paid subscription-confirmation, and response-export emails, set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to a sender verified with Resend. Welcome emails are sent after email verification; exports are restricted to an active server-confirmed paid account. Apply `DATABASE_SCHEMA.sql` before enabling Web Push.

Public quiz reads and response writes use the app's assessment routes. For a fresh database, create a Supabase project and run the separate `DATABASE_SCHEMA.sql` file once. For existing deployments, only apply a targeted SQL change after confirming it is missing.

---

## 🔵 1. Supabase (Fresh Table Creation, Indexes, & RLS Policies)


The full, executable Supabase schema is maintained separately in [`DATABASE_SCHEMA.sql`](./DATABASE_SCHEMA.sql). Run that file once for a fresh database. This guide contains setup steps and service configuration; do not run it as a schema script.

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
5. Open `DATABASE_SCHEMA.sql`, copy its contents into the SQL editor, and run it once for a fresh database. For an existing database, first verify the target change is absent and apply only the matching release migration once.
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

The daily `/api/cleanup-quiz-attempts` job removes only `in_progress` attempt rows untouched for 24 hours, and deletes their response-media objects before deleting the row. This gives a taker a full day to retry a failed final submission. It is scheduled in `vercel.json` and uses the same `CRON_SECRET`; it does not require a database migration.

The daily `/api/cleanup-notifications` job removes notification batches with no activity for 30 days. It is scheduled in `vercel.json` and uses `CRON_SECRET`; users are informed of this retention period in the notification center.
## Existing database notes

The fresh-install target schema is in `DATABASE_SCHEMA.sql`; it defines `correctOptionDes` as `TEXT` and installs the current assessment write trigger. Do not run the fresh-install schema against an existing production database. If your existing database has already applied the corresponding type and trigger changes, no additional SQL is needed. Check the live column type and trigger before applying any release-specific migration, and never rerun a migration already recorded as applied.

For migrating custom disclaimer settings to the unified `info` field and dropping deprecated `hidePingWorldDisclaimer`:
```sql
UPDATE quizzes
SET settings = (settings - 'customDisclaimer' - 'hidePingWorldDisclaimer') ||
  CASE
    WHEN settings ? 'customDisclaimer' AND NOT settings ? 'info'
    THEN jsonb_build_object('info', settings->'customDisclaimer')
    ELSE '{}'::jsonb
  END
WHERE settings ? 'customDisclaimer' OR settings ? 'hidePingWorldDisclaimer';
```
