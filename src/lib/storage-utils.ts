import type { Quiz } from '@/app/(main)/quiz/';
import { supabase, supabaseStorage } from './supabase';
import { optimizeImageForStorage } from './media-optimization';
import { unpackPingWorldMediaUrl } from '@/lib/quiz/quiz-piping';
interface BaseQuiz {
  user_id: string;
}

// Add composer_history to StorageItem type
export type StorageItem = {
  id: string;
  ownerId?: string;
  type:
    | 'quiz'
    | 'message'
    | 'post'
    | 'link'
    | 'games'
    | 'document'
    | 'composer_history'
    | 'draft';
  content: any;
  updated_at: string;
  is_synced: boolean;
};

type StorageName = { bucket: string; table?: string };

/** Check browser/Node navigator.onLine — fastest possible signal */
const isOnline = (): boolean =>
  typeof navigator !== 'undefined' ? navigator.onLine : true;

function reportSyncFailure(type: StorageItem['type'], id: string, error: unknown) {
  if (typeof window === 'undefined') return;
  const message = error instanceof Error ? error.message : 'Remote save failed.';
  window.dispatchEvent(new CustomEvent('pw_sync_error', { detail: { type, id, message } }));
}

function reportResponseSyncFailure(error: unknown) {
  if (typeof window === 'undefined') return;
  const message = error instanceof Error ? error.message : 'Response media upload failed.';
  window.dispatchEvent(new CustomEvent('pw_quiz_response_sync_error', { detail: { message } }));
}

const storageNames: Record<StorageItem['type'], StorageName> = {
  quiz: { bucket: 'quizzes', table: 'quizzes' },
  message: { bucket: 'messages', table: 'messages' },
  post: { bucket: 'posts' },
  link: { bucket: 'links', table: 'short_links' },
  games: { bucket: 'games', table: 'tournaments' },
  document: { bucket: 'documents' },
  composer_history: { bucket: 'composer_history' },
  draft: { bucket: 'quiz_drafts' },
};

const LOCAL_ONLY_TYPES: StorageItem['type'][] = ['post', 'document', 'composer_history', 'draft'];

const tableName = (type: StorageItem['type']) => {
  const table = storageNames[type].table;
  if (!table) throw new Error(`Storage type "${type}" is local-only and has no Supabase table`);
  return table;
};

let activeStorageUserId = 'guest';
let localAttemptSessionId: string | null = null;
function getAttemptSessionId() {
  if (localAttemptSessionId) return localAttemptSessionId;
  if (typeof window !== 'undefined') {
    try {
      const existing = sessionStorage.getItem('pw_attempt_session_v1');
      if (existing) return (localAttemptSessionId = existing);
      const created = createUuid();
      sessionStorage.setItem('pw_attempt_session_v1', created);
      return (localAttemptSessionId = created);
    } catch {
      // Keep the cache isolated for this page lifetime if session storage is disabled.
    }
  }
  return (localAttemptSessionId = createUuid());
}
const CACHE_DB_NAME = 'pingworld-local-cache-v1';
const CACHE_STORE_NAME = 'records';
let cacheDbPromise: Promise<IDBDatabase | null> | null = null;
let cacheStoreUpgradePromise: Promise<IDBDatabase | null> | null = null;
let persistenceRequested = false;
let abandonedNamespaceCleanup: Promise<void> | null = null;
let localDurableCopiesCleaned = false;

function removeLocalDurableCopies() {
  if (typeof localStorage === 'undefined' || localDurableCopiesCleaned) return;
  localDurableCopiesCleaned = true;
  const durablePrefixes = [
    'pw_quizzes_', 'pw_messages_', 'pw_links_', 'pw_games_', 'pw_posts_',
    'pw_documents_', 'pw_composer_history_', 'pw_quiz_drafts_',
    'pw_quiz_attempt:', 'pw_quiz_submission:', 'pw_quiz_responses:',
    'pw_quiz_feedback:', 'pw_queue:', 'pw_quiz_response_queue_',
  ];
  for (const key of Object.keys(localStorage)) {
    if (durablePrefixes.some((prefix) => key.startsWith(prefix)) ||
      key === 'pw_template_v1_responses' || key === 'pw_template_responses') {
      try { localStorage.removeItem(key); } catch {}
    }
  }
}

function attachCacheDb(db: IDBDatabase) {
  removeLocalDurableCopies();
  db.onversionchange = () => {
    db.close();
    cacheDbPromise = null;
  };
  if (!abandonedNamespaceCleanup) {
    abandonedNamespaceCleanup = new Promise<void>((done) => {
      try {
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) { done(); return; }
        const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(CACHE_STORE_NAME);
        const keys = store.getAllKeys();
        keys.onsuccess = () => keys.result.forEach((key) => {
          if (String(key).startsWith('v2:')) store.delete(key);
        });
        transaction.oncomplete = () => done();
        transaction.onerror = () => done();
        transaction.onabort = () => done();
      } catch { done(); }
    });
  }
}

function openCacheDb(createStore = false): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!cacheDbPromise && cacheStoreUpgradePromise) return cacheStoreUpgradePromise;
  if (!cacheDbPromise) {
    if (!persistenceRequested && typeof navigator !== 'undefined' && navigator.storage?.persist) {
      persistenceRequested = true;
      void navigator.storage.persist().catch(() => false);
    }
    cacheDbPromise = new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 1500);

      const safeResolve = (val: IDBDatabase | null) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(val);
        }
      };

      let request: IDBOpenDBRequest;
      try {
        // Opening for reads must not create an object store. The store is
        // created lazily only when a real item is written.
        request = indexedDB.open(CACHE_DB_NAME);
      } catch {
        safeResolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        try {
          // A brand new database remains store-free until the first write.
        } catch {
          safeResolve(null);
        }
      };
      request.onsuccess = () => {
        try {
          const db = request.result;
          attachCacheDb(db);
          // If a slow open crossed the short caller timeout, retain the
          // successful connection for subsequent IndexedDB operations.
          cacheDbPromise = Promise.resolve(db);
          safeResolve(db);
        } catch {
          safeResolve(null);
        }
      };
      request.onerror = () => {
        cacheDbPromise = null;
        safeResolve(null);
      };
      request.onblocked = () => {
        safeResolve(null);
      };
    });
  }
  return cacheDbPromise.then(async (db) => {
    if (!db || !createStore || db.objectStoreNames.contains(CACHE_STORE_NAME)) return db;
    if (cacheStoreUpgradePromise) return cacheStoreUpgradePromise;
    cacheStoreUpgradePromise = new Promise<IDBDatabase | null>((resolve) => {
      const nextVersion = Math.max(1, db.version + 1);
      db.close();
      cacheDbPromise = null;
      let request: IDBOpenDBRequest;
      try { request = indexedDB.open(CACHE_DB_NAME, nextVersion); }
      catch { cacheStoreUpgradePromise = null; resolve(null); return; }
      request.onupgradeneeded = () => {
        try {
          if (!request.result.objectStoreNames.contains(CACHE_STORE_NAME)) {
            request.result.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
          }
        } catch { /* surfaced as an unavailable cache below */ }
      };
      request.onsuccess = () => {
        const upgraded = request.result;
        if (!upgraded.objectStoreNames.contains(CACHE_STORE_NAME)) {
          upgraded.close();
          cacheStoreUpgradePromise = null;
          resolve(null);
          return;
        }
        attachCacheDb(upgraded);
        cacheDbPromise = Promise.resolve(upgraded);
        cacheStoreUpgradePromise = null;
        resolve(upgraded);
      };
      request.onerror = () => { cacheStoreUpgradePromise = null; resolve(null); };
      request.onblocked = () => {
        // Existing tabs close their connections on versionchange. Keep this
        // single upgrade promise pending so no competing version request starts.
      };
    });
    return cacheStoreUpgradePromise;
  });
}

async function pruneEmptyCacheStore(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) return;
  const count = await new Promise<number>((resolve) => {
    try {
      const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(CACHE_STORE_NAME).count();
      request.onsuccess = () => resolve(Number(request.result) || 0);
      request.onerror = () => resolve(1);
      transaction.onerror = () => resolve(1);
    } catch { resolve(1); }
  });
  if (count !== 0 || cacheStoreUpgradePromise) return;

  cacheStoreUpgradePromise = new Promise<IDBDatabase | null>((resolve) => {
    db.close();
    cacheDbPromise = null;
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(CACHE_DB_NAME, db.version + 1); }
    catch { cacheStoreUpgradePromise = null; resolve(null); return; }
    request.onupgradeneeded = () => {
      const upgradeDb = request.result;
      if (!upgradeDb.objectStoreNames.contains(CACHE_STORE_NAME)) return;
      // Recount in the version-change transaction to avoid deleting a store
      // another tab populated after the initial empty check.
      const transaction = request.transaction;
      if (!transaction) return;
      const recount = transaction.objectStore(CACHE_STORE_NAME).count();
      recount.onsuccess = () => {
        if (recount.result === 0 && upgradeDb.objectStoreNames.contains(CACHE_STORE_NAME)) {
          upgradeDb.deleteObjectStore(CACHE_STORE_NAME);
        }
      };
    };
    request.onsuccess = () => {
      const nextDb = request.result;
      attachCacheDb(nextDb);
      cacheDbPromise = Promise.resolve(nextDb);
      cacheStoreUpgradePromise = null;
      resolve(nextDb);
    };
    request.onerror = () => { cacheStoreUpgradePromise = null; resolve(null); };
    request.onblocked = () => {
      // Other tabs close their connection on versionchange; the request will
      // continue when they do. Keep callers from trying to create parallel DBs.
    };
  });
  await cacheStoreUpgradePromise;
}

const cacheRecordKey = (type: StorageItem['type'], userId = activeStorageUserId) =>
  `${encodeURIComponent(userId)}:${type}`;

async function readCacheValue<T>(key: string): Promise<T | null> {
  removeLocalDurableCopies();
  const currentKey = key;
  try {
    const db = await openCacheDb();
    if (!db || !db.objectStoreNames.contains(CACHE_STORE_NAME)) return null;
    const cached = await new Promise<T | null>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(null); }
      }, 1000);
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
        const req = tx.objectStore(CACHE_STORE_NAME).get(currentKey);
        req.onsuccess = () => {
          if (!done) { done = true; clearTimeout(timer); resolve((req.result?.value as T) ?? null); }
        };
        req.onerror = () => {
          if (!done) { done = true; clearTimeout(timer); resolve(null); }
        };
        tx.onerror = () => {
          if (!done) { done = true; clearTimeout(timer); resolve(null); }
        };
        tx.onabort = () => {
          if (!done) { done = true; clearTimeout(timer); resolve(null); }
        };
      } catch {
        if (!done) { done = true; clearTimeout(timer); resolve(null); }
      }
    });
    if (cached === null) await pruneEmptyCacheStore(db);
    return cached;
  } catch {
    return null;
  }
}

async function writeCacheValue<T>(key: string, value: T): Promise<boolean> {
  const currentKey = key;
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
    return deleteCacheValue(currentKey);
  }
  try {
    const db = await openCacheDb(true);
    if (!db || !db.objectStoreNames.contains(CACHE_STORE_NAME)) return false;
    return await new Promise<boolean>((resolve) => {
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; resolve(false); } }, 5000);
      try {
        const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        transaction.objectStore(CACHE_STORE_NAME).put({ key: currentKey, value, updatedAt: Date.now() });
        transaction.oncomplete = () => { if (!done) { done = true; clearTimeout(timer); resolve(true); } };
        transaction.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve(false); } };
        transaction.onabort = () => { if (!done) { done = true; clearTimeout(timer); resolve(false); } };
      } catch {
        if (!done) { done = true; clearTimeout(timer); resolve(false); }
      }
    });
  } catch { return false; }
}

async function deleteCacheValue(key: string): Promise<boolean> {
  const currentKey = key;
  try {
    const db = await openCacheDb();
    if (!db || !db.objectStoreNames.contains(CACHE_STORE_NAME)) return true;
    const deleted = await new Promise<boolean>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(false); }
      }, 5000);
      try {
        const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        transaction.objectStore(CACHE_STORE_NAME).delete(currentKey);
        transaction.oncomplete = () => { if (!done) { done = true; clearTimeout(timer); resolve(true); } };
        transaction.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve(false); } };
        transaction.onabort = () => { if (!done) { done = true; clearTimeout(timer); resolve(false); } };
      } catch {
        if (!done) { done = true; clearTimeout(timer); resolve(false); }
      }
    });
    if (deleted) await pruneEmptyCacheStore(db);
    return deleted;
  } catch { return false; }
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
  });
}

async function readLocal(type: StorageItem['type'], owner = activeStorageUserId): Promise<StorageItem[]> {
  removeLocalDurableCopies();
  try {
    const db = await openCacheDb();
    if (db && db.objectStoreNames.contains(CACHE_STORE_NAME)) {
      await abandonedNamespaceCleanup;
      const record = await new Promise<any>((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) { done = true; resolve(null); }
        }, 1000);
        try {
          const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
          const req = tx.objectStore(CACHE_STORE_NAME).get(cacheRecordKey(type, owner));
          req.onsuccess = () => { if (!done) { done = true; clearTimeout(timer); resolve(req.result); } };
          req.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve(null); } };
          tx.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve(null); } };
          tx.onabort = () => { if (!done) { done = true; clearTimeout(timer); resolve(null); } };
        } catch {
          if (!done) { done = true; clearTimeout(timer); resolve(null); }
        }
      });
      if (Array.isArray(record?.items)) {
        return record.items.filter((item: StorageItem) => !item.ownerId || item.ownerId === owner);
      }
      await pruneEmptyCacheStore(db);
    }
  } catch {}
  return [];
}

async function writeLocal(type: StorageItem['type'], list: StorageItem[], owner = activeStorageUserId): Promise<boolean> {
  const scopedList = list.filter((item) => !item.ownerId || item.ownerId === owner)
    .map((item) => ({ ...item, ownerId: owner }));
  // Empty collections are represented by absence. Do not create a database
  // or object store merely because a page requested an empty list.
  if (scopedList.length === 0) {
    const existingDb = await openCacheDb();
    if (!existingDb || !existingDb.objectStoreNames.contains(CACHE_STORE_NAME)) return true;
    const removed = await new Promise<boolean>((resolve) => {
      try {
        const transaction = existingDb.transaction(CACHE_STORE_NAME, 'readwrite');
        transaction.objectStore(CACHE_STORE_NAME).delete(cacheRecordKey(type, owner));
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
        transaction.onabort = () => resolve(false);
      } catch { resolve(false); }
    });
    if (removed) await pruneEmptyCacheStore(existingDb);
    return removed;
  }
  let persisted = false;
  try {
    const db = await openCacheDb(true);
    if (db) {
      await new Promise<void>((resolve) => {
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; resolve(); } }, 1000);
        try {
          const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
          transaction.objectStore(CACHE_STORE_NAME).put({
            key: cacheRecordKey(type, owner), items: scopedList, updatedAt: Date.now(),
          });
          transaction.oncomplete = () => { persisted = true; if (!done) { done = true; clearTimeout(timer); resolve(); } };
          transaction.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
          transaction.onabort = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
        } catch {
          if (!done) { done = true; clearTimeout(timer); resolve(); }
        }
      });
    }
  } catch (error) {
    console.warn(`[HybridStorage] Local ${type} cache write failed:`, error);
  }
  return persisted;
}

async function setActiveStorageUser(userId?: string | null) {
  activeStorageUserId = userId || 'guest';
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

async function mergeIntoLocal(type: StorageItem['type'], remoteRows: any[], owner = activeStorageUserId) {
  const local = await readLocal(type, owner);
  const map = new Map<string, StorageItem>();
  const remoteIds = new Set(remoteRows.map((row) => String(row.id)));

  // Keep unsynced drafts. A previously synced item missing remotely was
  // deleted on another device and must not be resurrected from this cache.
  local.forEach((item) => {
    if (!item.is_synced || remoteIds.has(item.id)) map.set(item.id, item);
  });

  // Remote wins for synced items
  remoteRows.forEach((row) => {
    const normalizedRow = type === 'quiz'
      ? normalizeQuizRow(row)
      : row;
    const existing = map.get(row.id);
    if (existing && !existing.is_synced) return;
    map.set(row.id, {
      ...(existing || {}),
      id: row.id,
      ownerId: row.user_id || row.creator_id || row.recipient_id || activeStorageUserId,
      type,
      content: { ...(existing?.content || {}), ...normalizedRow },
      updated_at: row.updated_at || new Date().toISOString(),
      is_synced: true,
    });
  });

  const merged = [...map.values()];
  await writeLocal(type, merged, owner);
  return merged;
}

function flattenItems(items: StorageItem[]): any[] {
  return items.map((item) => ({ ...(item.content || item), is_synced: item.is_synced }));
}

function normalizeQuizRow(row: any) {
  const settings = row?.settings && typeof row.settings === 'object' ? row.settings : {};
  return {
    ...row,
    ...settings,
    id: row?.id,
    user_id: row?.user_id,
    title: row?.title || settings.title || '',
    description: row?.description ?? settings.description ?? '',
    type: row?.type || settings.type || 'quiz',
    questions: Array.isArray(row?.questions) ? row.questions : (settings.questions || []),
    responses: Array.isArray(row?.responses) ? row.responses : (settings.responses || []),
    customUrl: row?.custom_id || settings.customUrl || row?.customUrl || '',
  };
}

//Safe utility to get active user ID from either Firebase Auth or Supabase Auth
async function getActiveUserId(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch {}

  try {
    const { auth } = await import('@/lib/firebase');
    if (auth.currentUser && !auth.currentUser.isAnonymous) return auth.currentUser.uid;
  } catch {}

  return null;
}

// ---------------------------------------------------------------------------

// Safely construct payloads mapping local state directly to DB schema columns
function safeStorageSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'media';
}

async function blobFingerprint(blob: Blob) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest)).slice(0, 12)
      .map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${blob.size}-${blob.type.replace(/[^a-z0-9]/gi, '')}`;
}

async function persistQuizMedia(value: any, path: string) {
  if (typeof value !== 'string') return value;
  const unpacked = unpackPingWorldMediaUrl(value);
  const source = unpacked.url || value;
  if (!source.startsWith('data:')) return value;

  const response = await fetch(source);
  if (!response.ok) throw new Error('Could not read uploaded assessment media.');
  const blob = await optimizeImageForStorage(await response.blob());
  if (blob.size > 50 * 1024 * 1024) throw new Error('Quiz images must be smaller than 50 MB to upload.');
  const extension = (blob.type.split('/')[1] || 'bin').split(';')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'bin';
  const storagePath = `${path}-${await blobFingerprint(blob)}.${extension}`;
  const contentType = blob.type || unpacked.type || 'application/octet-stream';
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in with your Ping World account before uploading quiz images.');

  const signingResponse = await fetch('/api/quiz-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: session.access_token, quizId: path.split('/')[1] || '', objectPath: storagePath, contentType }),
  });
  const signedUpload = await signingResponse.json().catch(() => null);
  if (!signingResponse.ok || typeof signedUpload?.token !== 'string') {
    throw new Error(signedUpload?.error || `Could not authorize quiz image upload (HTTP ${signingResponse.status}).`);
  }
  const { error: uploadError } = await supabaseStorage.storage.from('quiz-media').uploadToSignedUrl(
    storagePath,
    signedUpload.token,
    blob,
    { contentType, cacheControl: '3600', upsert: true },
  );
  if (uploadError) {
    console.error('[QuizMedia] Signed Storage upload failed:', {
      message: uploadError.message,
      status: (uploadError as any).status,
      statusCode: (uploadError as any).statusCode,
      bucket: 'quiz-media',
      storagePath,
      blobType: contentType,
      blobSize: blob.size,
    });
    throw new Error(`Supabase image upload failed: ${uploadError.message}`);
  }
  if (typeof signedUpload.publicUrl !== 'string' || !signedUpload.publicUrl) {
    throw new Error('Quiz image uploaded, but Supabase did not return its public URL.');
  }
  return signedUpload.publicUrl;
}

async function externalizeQuizMedia(quiz: any, userId: string) {
  const safeUser = safeStorageSegment(userId);
  const safeQuiz = safeStorageSegment(quiz.id || 'quiz');
  const output = { ...quiz };
  if (Array.isArray(quiz.questions)) {
    output.questions = await Promise.all(quiz.questions.map(async (question: any, questionIndex: number) => {
      const q = { ...question };
      const questionPath = `${safeUser}/${safeQuiz}/${safeStorageSegment(String(q.id || `question-${questionIndex}`))}`;
      for (const field of ['uploadUrl', 'imageUrl']) {
        if (typeof q[field] === 'string') q[field] = await persistQuizMedia(q[field], `${questionPath}/${field}`);
      }
      if (Array.isArray(q.options)) {
        q.options = await Promise.all(q.options.map(async (option: any, optionIndex: number) => {
          if (!option || typeof option !== 'object') return option;
          const next = { ...option };
          const optionPath = `${questionPath}/${safeStorageSegment(String(next.id || `option-${optionIndex}`))}`;
          for (const field of ['uploadUrl', 'imageUrl']) {
            if (typeof next[field] === 'string') next[field] = await persistQuizMedia(next[field], `${optionPath}/${field}`);
          }
          return next;
        }));
      }
      return q;
    }));
  }
  if (typeof quiz.branding?.image === 'string') {
    output.branding = {
      ...quiz.branding,
      image: await persistQuizMedia(quiz.branding.image, `${safeUser}/${safeQuiz}/branding/image`),
    };
  }
  return output;
}

async function buildSupabasePayload(
  type: StorageItem['type'],
  content: any,
  userId: string,
  timestamp: string,
) {
  const baseId = content.id;

  if (type === 'quiz') {
    const remoteContent = await externalizeQuizMedia(content, userId);
    const settings = { ...remoteContent };
    // Moderation state is server-owned and survives ordinary quiz edits. Never
    // let a stale local draft accidentally unpause an assessment under review.
    try {
      const { data: existing } = await supabase.from('quizzes').select('settings').eq('id', baseId).eq('user_id', userId).maybeSingle();
      if (existing?.settings?.moderationStatus === 'under_review') {
        settings.moderationStatus = 'under_review';
        settings.moderationPausedAt = existing.settings.moderationPausedAt;
      }
    } catch {
      // If the moderation flag cannot be read, continue with the save; the
      // normal owner RLS and server report route still control public access.
    }
    [
      'id', 'user_id', 'userId', 'ownerId', 'title', 'description', 'type',
      'questions', 'responses', 'canGoBack', 'showScore', 'hasTimer',
      'correctOption', 'correctOptionDes', 'randomizeOptions', 'randomizeQuestions',
      'allowRetry', 'enforceSecurity', 'enforceIdentity', 'endScreen', 'expires_at',
      'customUrl', 'custom_id', 'settings', 'is_synced',
    ].forEach((field) => delete settings[field]);

    return {
      id: baseId,
      user_id: userId,
      title: remoteContent.title,
      description: remoteContent.description,
      type: remoteContent.type,
      questions: remoteContent.questions,
      responses: remoteContent.responses,
      canGoBack: remoteContent.canGoBack,
      showScore: remoteContent.showScore,
      hasTimer: typeof remoteContent.hasTimer === 'boolean'
        ? remoteContent.hasTimer
        : Boolean(remoteContent.timer?.hasTimer),
      correctOption: remoteContent.correctOption,
      correctOptionDes: remoteContent.correctOptionDes,
      randomizeOptions: remoteContent.randomizeOptions,
      randomizeQuestions: remoteContent.randomizeQuestions,
      allowRetry: remoteContent.allowRetry,
      enforceSecurity: remoteContent.enforceSecurity,
      enforceIdentity: remoteContent.enforceIdentity,
      endScreen: remoteContent.endScreen,
      expires_at: remoteContent.expires_at,
      custom_id: remoteContent.customUrl || remoteContent.custom_id || null,
      settings,
      updated_at: timestamp,
    };
  } else if (type === 'link') {
    return {
      id: baseId,
      creator_id: userId, // Schema uses creator_id
      original_url: content.originalUrl || content.original_url,
      clicks: content.clicks || 0,
    };
  } else if (type === 'message') {
    return {
      id: baseId,
      recipient_id: content.recipientId || content.recipient_id || userId,
      content: content.content,
      is_seen: content.isSeen || content.is_seen || false,
      // updated_at does not exist on messages
    };
  } else if (type === 'games') {
    return {
      id: baseId,
      user_id: userId,
      name: content.name || 'Tournament Standings',
      teams: content.teams || [],
      updated_at: timestamp,
    };
  }

  // Fallback for unexpected types (like 'post' if ever created)
  const result = {
    ...content,
    id: baseId,
    user_id: userId,
    updated_at: timestamp,
  };
  delete result.createdAt;
  delete result.updatedAt;
  return result;
}

// Background remote fetch → merge → optional callback
// ---------------------------------------------------------------------------

async function syncFromRemote(
  type: StorageItem['type'],
  onUpdate?: (items: any[]) => void,
) {
  if (!isOnline() || LOCAL_ONLY_TYPES.includes(type)) return;
  const cacheOwner = activeStorageUserId;

  try {
    // Route 'games' (Tournament Standings) directly to Firebase Firestore collections
    if (type === 'games') {
      const userId = await getActiveUserId();
      if (!userId || userId !== cacheOwner) return;

      const { db } = await import('@/lib/firebase');
      const { collection, getDocs, query, where, limit } = await import(
        'firebase/firestore'
      );

      const q = query(
        collection(db, 'tournaments'),
        where('user_id', '==', userId),
        limit(50),
      );

      const querySnapshot = await getDocs(q);
      if (activeStorageUserId !== cacheOwner) return;
      const rows: any[] = [];
      querySnapshot.forEach((docSnapshot) => {
        rows.push(docSnapshot.data());
      });

      if (rows.length > 0) {
        const merged = await mergeIntoLocal(type, rows, cacheOwner);
        onUpdate?.(flattenItems(merged));
      }
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (activeStorageUserId !== cacheOwner) return;

    // Prevent anonymous full-table scans for private data
    if (type !== 'quiz' && !session) return;

    const rows: any[] = [];
    let offset = 0;
    let remoteReadComplete = false;
    while (true) {
      const orderColumn = type === 'message' || type === 'link' ? 'created_at' : 'updated_at';
      let query = supabase.from(tableName(type)).select('*')
        .order(orderColumn, { ascending: false })
        .range(offset, offset + 999);
      if (session) {
        if (!session.user.email_confirmed_at) return;
        const userCol = type === 'link' ? 'creator_id' : type === 'message' ? 'recipient_id' : 'user_id';
        query = query.eq(userCol, session.user.id) as any;
      }
      const { data, error } = await query;
      if (error) {
        console.warn(`[HybridStorage] Could not load ${type}:`, error.message);
        break;
      }
      if (!data?.length) {
        remoteReadComplete = true;
        break;
      }
      rows.push(...data);
      if (data.length < 1000) {
        remoteReadComplete = true;
        break;
      }
      offset += 1000;
    }

    if (activeStorageUserId !== cacheOwner) return;

    if (remoteReadComplete) {
      const merged = await mergeIntoLocal(type, rows, cacheOwner);
      onUpdate?.(flattenItems(merged));
    }
  } catch (e) {
    console.warn('[HybridStorage] Background sync failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Push unsynced local items to remote
// ---------------------------------------------------------------------------

async function pushUnsyncedItems(type: StorageItem['type']) {
  if (!isOnline() || LOCAL_ONLY_TYPES.includes(type)) return;
  const syncOwner = activeStorageUserId;

  try {
    const userId = await getActiveUserId();
    if (!userId || userId !== syncOwner) return;

    const local = await readLocal(type, syncOwner);
    const unsynced = local.filter((i) => !i.is_synced);
    if (unsynced.length === 0) return;

    for (const item of unsynced) {
      if (activeStorageUserId !== syncOwner) return;
      try {
        // Route 'games' (Tournament Standings) push to Firebase Firestore collections
        if (type === 'games') {
          const { db } = await import('@/lib/firebase');
          const { doc, setDoc } = await import('firebase/firestore');

          await setDoc(doc(db, 'tournaments', item.id), {
            id: item.id,
            user_id: userId,
            name: item.content.name || 'Tournament Standings',
            teams: item.content.teams || [],
            updated_at: new Date().toISOString(),
          });

          item.is_synced = true;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pw_sync_status', { detail: { type, id: item.id, is_synced: true } }));
          }
        } else {
          const payload = await buildSupabasePayload(
            type,
            item.content,
            userId,
            new Date().toISOString(),
          );

          let { error } = await supabase.from(tableName(type)).upsert(payload);

          // Auto-heal missing profile if trigger failed
          if (error?.code === '23503' && error.message.includes('profiles')) {
            await supabase.from('profiles').upsert({
              id: userId,
              username: 'user_' + userId.substring(0, 8),
              display_name: 'User',
            });
            // Retry original upsert
            const retry = await supabase.from(tableName(type)).upsert(payload);
            error = retry.error;
          }

          if (!error) {
            item.is_synced = true;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('pw_sync_status', { detail: { type, id: item.id, is_synced: true } }));
            }
          } else throw error;
        }
      } catch (e) {
        reportSyncFailure(type, item.id, e);
        console.error(`[HybridStorage] Failed to push item ${item.id}:`, e);
      }
    }

    if (activeStorageUserId === syncOwner) await writeLocal(type, local, syncOwner);
  } catch (e) {
    console.warn('[HybridStorage] Push failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Listen for connectivity restoration → auto-sync all types
// ---------------------------------------------------------------------------

const ALL_TYPES: StorageItem['type'][] = ['quiz', 'message', 'link', 'games'];

const pendingResponsesKey = () =>
  `queue:${encodeURIComponent(activeStorageUserId)}`;

async function clearQuizScopedCache(quizId: string, removeCompletionMarker = false) {
  if (typeof window === 'undefined' || !quizId) return;
  const encodedId = encodeURIComponent(quizId);
  const encodedOwnerId = encodeURIComponent(activeStorageUserId);
  const db = await openCacheDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(CACHE_STORE_NAME);
        const keysRequest = store.getAllKeys();
        keysRequest.onsuccess = () => {
          for (const rawKey of keysRequest.result) {
            const key = String(rawKey);
            const isCurrentOwnerData = key.includes(encodedOwnerId);
            const scopedAttemptOrResponse =
              (key.includes('quiz_attempt:') || key.includes('quiz_submission:') || key.includes('quiz_responses:')) &&
              (key.includes(quizId) || key.includes(encodedId)) && (removeCompletionMarker || isCurrentOwnerData);
            if (scopedAttemptOrResponse) store.delete(rawKey);
            if ((key.endsWith(':draft') || key === 'draft') && (removeCompletionMarker || isCurrentOwnerData)) {
              const draftRequest = store.get(rawKey);
              draftRequest.onsuccess = () => {
                const record = draftRequest.result;
                if (!Array.isArray(record?.items)) return;
                const items = record.items.filter((item: StorageItem) => item.id !== `draft-${quizId}`);
                if (items.length !== record.items.length) store.put({ ...record, items, updatedAt: Date.now() });
              };
            }
            if (key.startsWith('queue:') && (removeCompletionMarker || key === pendingResponsesKey())) {
              const queueRequest = store.get(rawKey);
              queueRequest.onsuccess = () => {
                const record = queueRequest.result;
                const queue = Array.isArray(record?.value) ? record.value : [];
                const filtered = queue.filter((entry: any) => entry?.quizId !== quizId);
                if (filtered.length === queue.length) return;
                if (filtered.length) store.put({ ...record, value: filtered, updatedAt: Date.now() });
                else store.delete(rawKey);
              };
            }
            if (removeCompletionMarker && key.endsWith(':quiz')) {
              const quizRequest = store.get(rawKey);
              quizRequest.onsuccess = () => {
                const record = quizRequest.result;
                if (!Array.isArray(record?.items)) return;
                const items = record.items.filter((item: StorageItem) => item.id !== quizId);
                if (items.length !== record.items.length) store.put({ ...record, items, updatedAt: Date.now() });
              };
            }
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch { resolve(); }
    });
  }

  for (const type of ['attempt', 'submission', 'responses'] as const) {
    for (const key of Object.keys(localStorage)) {
      if (key.includes(encodedId) && key.includes(`quiz_${type}:`) && (removeCompletionMarker || key.includes(encodedOwnerId))) {
        localStorage.removeItem(key);
      }
    }
  }

  // Remove this assessment's queued response from every account namespace on
  // this device. A deleted assessment must not be resurrected by a later sync.
  {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('pw_queue:') || key.startsWith('pw_quiz_response_queue_')) localStorage.removeItem(key);
    }
  }

  // Remove the local assessment draft record across cached owners, without
  // touching the assessment itself or its one-time completion marker.
  try {
    const draftKey = `draft-${quizId}`;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('pw_quiz_drafts_')) localStorage.removeItem(key);
    }
    const draftRows = await readLocal('draft', activeStorageUserId);
    if (draftRows.some((row) => row.id === draftKey)) {
      await writeLocal('draft', draftRows.filter((row) => row.id !== draftKey), activeStorageUserId);
    }
  } catch {}
  if (removeCompletionMarker) {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('pw_quizzes_')) localStorage.removeItem(key);
    }
    try { localStorage.removeItem(`completed_quiz_${quizId}`); } catch {}
  }
  if (db) await pruneEmptyCacheStore(db);
}

async function clearQuizResponsePageCache(quizId: string) {
  if (typeof window === 'undefined' || !quizId) return;
  const encodedQuizId = encodeURIComponent(quizId);
  const db = await openCacheDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(CACHE_STORE_NAME);
        const request = store.getAllKeys();
        request.onsuccess = () => {
          for (const rawKey of request.result) {
            const key = String(rawKey);
            if (key.includes('quiz_responses:') && (key.includes(quizId) || key.includes(encodedQuizId))) store.delete(rawKey);
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch { resolve(); }
    });
  }
  for (const key of Object.keys(localStorage)) {
    if (key.includes('quiz_responses:') && (key.includes(quizId) || key.includes(encodedQuizId))) localStorage.removeItem(key);
  }

  // Remove response snapshots from local quiz objects while retaining the
  // quiz and its authoring data.
  for (const owner of new Set([activeStorageUserId, 'guest'])) {
    const quizzes = await readLocal('quiz', owner);
    let changed = false;
    const updated = quizzes.map((item) => {
      if (item.id !== quizId || !Array.isArray(item.content?.responses)) return item;
      const responses: any[] = [];
      if (responses.length === item.content.responses.length) return item;
      changed = true;
      return { ...item, content: { ...item.content, responses } };
    });
    if (changed) await writeLocal('quiz', updated, owner);
  }
  if (db) await pruneEmptyCacheStore(db);
}

async function insertQuizResponse(quizId: string, response: any) {
  const persistedResponse = response.attemptId
    ? (await HybridStorage.getAttemptResponseDraft(quizId, response.attemptId)) || response
    : response;
  const answers = persistedResponse.responseMediaExternalized
    ? (persistedResponse.answers || [])
    : await externalizeResponseMedia(quizId, persistedResponse);
  if (response.attemptId && response.attemptToken) {
    const draft = await HybridStorage.getQuizAttemptDraft(quizId);
    if (!draft || draft.attemptId !== response.attemptId || !Array.isArray(draft.questionOrder)) return false;
    const attemptAnswers = Object.fromEntries((answers || []).filter((answer: any) => answer?.questionId).map((answer: any) => [String(answer.questionId), answer]));
    const attemptSync = await fetch('/api/quiz-attempts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: draft.remoteStarted ? 'save' : 'start', quizId, attemptId: response.attemptId,
        attemptToken: response.attemptToken, answers: attemptAnswers, questionOrder: draft.questionOrder,
        deviceKey: draft.deviceKey,
        userData: response.userData || draft.userData || {}, currentQuestionIndex: draft.currentQuestionIndex || 0,
      }),
    });
    // A previously submitted attempt is safe to retry through the idempotent response endpoint.
    if (!attemptSync.ok && attemptSync.status !== 409) {
      const failure = await attemptSync.json().catch(() => null);
      throw new Error(failure?.error || `Could not synchronize answers (HTTP ${attemptSync.status}).`);
    }
    draft.answers = attemptAnswers;
    draft.remoteStarted = true;
    await HybridStorage.saveQuizAttemptDraft(quizId, draft);
  }
  const result = await fetch('/api/quiz-responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizId, response: {
      ...response,
      answers,
      userData: {
      ...(persistedResponse.userData || {}),
      country: persistedResponse.country || null,
      continent: persistedResponse.continent || null,
      timezone: persistedResponse.timezone || null,
      submissionReason: persistedResponse.submissionReason || 'completion',
      assessmentType: persistedResponse.assessmentType || 'quiz',
      categoryScores: persistedResponse.categoryScores || null,
      answeredQuestions: persistedResponse.answeredQuestions ?? answers.length,
      },
    } }),
  });
  const payload = await result.json().catch(() => null);
  if (!result.ok) throw new Error(payload?.error || `The server could not save this response (HTTP ${result.status}).`);
  return payload as { success: true; score: number; totalQuestions: number; categoryScores?: Record<string, { correct: number; total: number }> };
}

async function externalizeResponseMedia(quizId: string, response: any) {
  const answers = Array.isArray(response.answers) ? response.answers : [];
  return Promise.all(answers.map(async (answer: any, index: number) => {
    if (!answer || typeof answer.fileUrl !== 'string') return answer;
    const unpacked = unpackPingWorldMediaUrl(answer.fileUrl);
    const source = unpacked.url || answer.fileUrl;
    if (!source.startsWith('data:')) return answer;
    const media = await fetch(source);
    if (!media.ok) throw new Error('Could not read uploaded response file.');
    const blob = await optimizeImageForStorage(await media.blob());
    if (blob.size > 50 * 1024 * 1024) throw new Error('Response files must be smaller than 50 MB to upload.');
    const extension = (blob.type.split('/')[1] || 'bin').split(';')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'bin';
    const path = `${safeStorageSegment(quizId)}/${safeStorageSegment(String(response.submissionId || response.attemptId || 'pending'))}/${safeStorageSegment(String(answer.questionId || index))}-${await blobFingerprint(blob)}.${extension}`;
    if (!response.attemptId || !response.attemptToken) {
      throw new Error('This response upload has no active attempt authorization. Keep the response saved locally and retry from the assessment.');
    }
    const contentType = blob.type || unpacked.type || 'application/octet-stream';
    const signingResponse = await fetch('/api/quiz-response-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId,
        attemptId: response.attemptId,
        attemptToken: response.attemptToken,
        questionId: String(answer.questionId || ''),
        objectPath: path,
        contentType,
      }),
    });
    const signed = await signingResponse.json().catch(() => null);
    if (!signingResponse.ok || typeof signed?.token !== 'string') {
      throw new Error(signed?.error || `Could not authorize response file upload (HTTP ${signingResponse.status}).`);
    }
    const { error: uploadError } = await supabaseStorage.storage.from('quiz-response-media').uploadToSignedUrl(
      path, signed.token, blob, { contentType, cacheControl: '3600', upsert: true },
    );
    if (uploadError) throw new Error(`Response file upload failed: ${uploadError.message}`);
    return { ...answer, fileUrl: path, fileType: blob.type || unpacked.type };
  }));
}

async function flushPendingResponses() {
  if (!isOnline() || typeof window === 'undefined') return;
  const queueKey = pendingResponsesKey();
  let pending: Array<{ quizId: string; response: any }>;
  try {
    pending = (await readCacheValue<Array<{ quizId: string; response: any }>>(queueKey)) || [];
    if (!Array.isArray(pending) || pending.length === 0) return;
  } catch {
    return;
  }

  for (let index = 0; index < pending.length; index++) {
    const item = pending[index];
    try {
      const saved = await insertQuizResponse(item.quizId, item.response);
      if (!saved || typeof saved !== 'object' || saved.success !== true) break;
      if (item.response?.attemptId) await HybridStorage.deleteQuizAttemptDraft(item.quizId).catch(() => {});
      pending.splice(index, 1);
      index--;
      if (queueKey !== pendingResponsesKey()) return;
      await writeCacheValue(queueKey, pending);
    } catch (error) {
      reportResponseSyncFailure(error);
      break;
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[HybridStorage] Connection restored — syncing…');
    ALL_TYPES.forEach((t) => {
      pushUnsyncedItems(t);
      syncFromRemote(t);
    });
    void flushPendingResponses();
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const HybridStorage = {
  async getOfflineValue<T>(key: string): Promise<T | null> {
    const currentUserId = await getActiveUserId();
    if (currentUserId && currentUserId !== activeStorageUserId) await setActiveStorageUser(currentUserId);
    return readCacheValue<T>(`app:${encodeURIComponent(activeStorageUserId)}:${key}`);
  },
  async setOfflineValue<T>(key: string, value: T): Promise<void> {
    const currentUserId = await getActiveUserId();
    if (currentUserId && currentUserId !== activeStorageUserId) await setActiveStorageUser(currentUserId);
    if (!await writeCacheValue(`app:${encodeURIComponent(activeStorageUserId)}:${key}`, value)) throw new Error('Could not save data to IndexedDB on this device.');
  },
  async removeOfflineValue(key: string): Promise<void> {
    const currentUserId = await getActiveUserId();
    if (currentUserId && currentUserId !== activeStorageUserId) await setActiveStorageUser(currentUserId);
    if (!await deleteCacheValue(`app:${encodeURIComponent(activeStorageUserId)}:${key}`)) throw new Error('Could not remove data from IndexedDB on this device.');
  },
  /** Select the isolated browser cache for the active account. */
  setUserId(userId?: string | null) {
    return setActiveStorageUser(userId);
  },

  async flushPendingResponses () {
    return flushPendingResponses();
  },
  async getCacheCounts() {
    const [quizzes, drafts, messages, documents, links, history] = await Promise.all([
      readLocal('quiz'), readLocal('draft'), readLocal('message'), readLocal('document'),
      readLocal('link'), readLocal('composer_history'),
    ]);
    return {
      quizzes: quizzes.length + drafts.length,
      messages: messages.length,
      documents: documents.length,
      links: links.length,
      history: history.length,
    };
  },
  async clearLocalCache() {
    const db = await openCacheDb();
    if (db && db.objectStoreNames.contains(CACHE_STORE_NAME)) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(CACHE_STORE_NAME);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      await pruneEmptyCacheStore(db);
    }
    const cachePrefixes = [
      'pw_quizzes', 'pw_messages', 'pw_posts', 'pw_links', 'pw_games',
      'pw_documents', 'pw_composer_history', 'pw_quiz_drafts', 'pw2_', 'pw_v2:',
      'pw_queue:', 'pw_quiz_responses_pending_', 'pw_storage_legacy_migrated_v1_', 'pw_quiz_seed_template_',
      'pw_quiz_attempt:', 'pw_quiz_submission:', 'pw_quiz_feedback:',
      'pw_quiz_response_queue_v2:', 'pw2_', 'pw_v2:',
      'completed_quiz_',
    ];
    Object.keys(localStorage).forEach((key) => {
      if (key !== 'pw_quiz_template_v1' && cachePrefixes.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key);
    });
  },
  async clearQuizLocalData(quizId: string, options?: { removeCompletionMarker?: boolean }) {
    await clearQuizScopedCache(quizId, Boolean(options?.removeCompletionMarker));
  },
  async clearQuizResponseCache(quizId: string) {
    await clearQuizResponsePageCache(quizId);
  },
  // Add dedicated post helpers
  async savePost(postData: any) {
    return this.save(postData.id || `post_${Date.now()}`, postData, 'post');
  },

  async getPosts(onUpdate?: (items: any[]) => void) {
    return this.getAll('post', onUpdate);
  },

  async deletePost(id: string) {
    return this.delete(id, 'post');
  },

  async saveQuizDraft(quizId: string, content: Quiz) {
    return this.save(`draft-${quizId}`, content, 'draft');
  },

  async saveTemplatePreviewResponse(quizId: string, response: Record<string, any>) {
    const key = `template_responses:${encodeURIComponent(quizId)}`;
    const existing = await readCacheValue<any[]>(key) || [];
    const responseId = String(response.id || response.timestamp || createUuid());
    const next = [response, ...existing.filter((item) => String(item?.id || item?.timestamp || '') !== responseId)].slice(0, 100);
    if (!await writeCacheValue(key, next)) {
      throw new Error('Preview response could not be saved in IndexedDB.');
    }
  },

  async clearTemplatePreviewResponses(quizId: string) {
    if (!await deleteCacheValue(`template_responses:${encodeURIComponent(quizId)}`)) {
      throw new Error('Could not clear template preview responses from IndexedDB.');
    }
    await clearQuizResponsePageCache(quizId);
  },

  async getQuizDraft(quizId: string): Promise<Quiz | null> {
    const drafts = await readLocal('draft');
    return (drafts.find((item) => item.id === `draft-${quizId}`)?.content as Quiz) || null;
  },

  async deleteQuizDraft(quizId: string) {
    return this.delete(`draft-${quizId}`, 'draft');
  },

  async saveQuizAttemptDraft(quizId: string, draft: Record<string, unknown>) {
    const key = `quiz_attempt:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}`;
    if (!await writeCacheValue(key, { ...draft, updatedAt: Date.now() })) {
      throw new Error('Assessment progress could not be saved to IndexedDB on this device.');
    }
  },

  async getQuizAttemptDraft(quizId: string): Promise<Record<string, any> | null> {
    const key = `quiz_attempt:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}`;
    return readCacheValue<Record<string, any>>(key);
  },

  async deleteQuizAttemptDraft(quizId: string) {
    const key = `quiz_attempt:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}`;
    if (!await deleteCacheValue(key)) throw new Error('Assessment attempt cache could not be cleared from IndexedDB.');
  },

  async prepareQuizAttemptSnapshot(quizId: string, snapshot: Record<string, any>) {
    const answers = snapshot.answers && typeof snapshot.answers === 'object' ? snapshot.answers : {};
    const items = Object.values(answers);
    if (!items.some((answer: any) => typeof answer?.fileUrl === 'string' && (unpackPingWorldMediaUrl(answer.fileUrl).url || answer.fileUrl).startsWith('data:'))) return snapshot;
    const externalized = await externalizeResponseMedia(quizId, {
      submissionId: snapshot.attemptId,
      attemptId: snapshot.attemptId,
      attemptToken: snapshot.attemptToken,
      answers: items,
    });
    return { ...snapshot, answers: Object.fromEntries(externalized.filter((answer: any) => answer?.questionId).map((answer: any) => [String(answer.questionId), answer])) };
  },

  async storeAttemptResponseDraft(quizId: string, response: Record<string, any>) {
    const answers = await externalizeResponseMedia(quizId, response);
    const compactResponse = { ...response, answers, responseMediaExternalized: true };
    const key = `quiz_submission:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}:${encodeURIComponent(String(response.attemptId || response.submissionId || 'pending'))}`;
    if (!await writeCacheValue(key, compactResponse)) {
      throw new Error('The response could not be cached in IndexedDB on this device.');
    }
    return compactResponse;
  },

  async getAttemptResponseDraft(quizId: string, attemptId: string) {
    const key = `quiz_submission:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}:${encodeURIComponent(attemptId)}`;
    return readCacheValue<Record<string, any>>(key);
  },

  async deleteAttemptResponseDraft(quizId: string, attemptId: string) {
    const key = `quiz_submission:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}:${encodeURIComponent(attemptId)}`;
    if (!await deleteCacheValue(key)) throw new Error('Assessment response cache could not be cleared from IndexedDB.');
  },

  async getQuizResponses(quizId: string, offset = 0): Promise<{ responses: any[]; nextOffset: number | null; totalCount?: number; isLocalOnly?: boolean, isCached?:boolean }> {
    let session = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
    } catch {}

    const responseCacheKey = `quiz_responses:${encodeURIComponent(activeStorageUserId)}:${encodeURIComponent(quizId)}:${Math.max(0, Math.floor(offset))}`;
    const readCachedPage = () => readCacheValue<{ responses: any[]; nextOffset: number | null; totalCount?: number }>(responseCacheKey);

    const loadLocalResponses = async () => {
      const cachedPage = await readCacheValue<{ responses: any[]; nextOffset: number | null; totalCount?: number }>(responseCacheKey);
      if (cachedPage && Array.isArray(cachedPage.responses)) {
        return { ...cachedPage, isLocalOnly: true, isCached: true };
      }
      
      const localQuizzes = await readLocal('quiz', activeStorageUserId);
      const guestQuizzes = activeStorageUserId !== 'guest' ? await readLocal('quiz', 'guest') : [];
      const allLocal = [...flattenItems(localQuizzes), ...flattenItems(guestQuizzes)];
      const targetQuiz = allLocal.find((q) => q.id === quizId);
      let localResponses = Array.isArray(targetQuiz?.responses) ? [...targetQuiz.responses] : [];

      if (quizId === 'pingworld-mastery-showcase' || quizId === 'pingworld-showcase-assessment') {
        try {
          const templateStored = await readCacheValue<any[]>(`template_responses:${encodeURIComponent(quizId)}`) || [];
          if (Array.isArray(templateStored) && templateStored.length > 0) {
            localResponses = [...templateStored, ...localResponses];
          }
        } catch {}
      }

      try {
        const queueKey = pendingResponsesKey();
        const pending = (await readCacheValue<Array<{ quizId: string; response: any }>>(queueKey)) || [];
        const matchingPending = pending.filter((item) => item.quizId === quizId).map((item) => item.response);
        if (matchingPending.length > 0) {
          localResponses = [...matchingPending, ...localResponses];
        }
      } catch {}

      localResponses.sort((a, b) => new Date(b?.timestamp || 0).getTime() - new Date(a?.timestamp || 0).getTime());
      return { responses: localResponses, nextOffset: null, totalCount: localResponses.length, isLocalOnly: true };
    };

    const cachedPage = await readCachedPage();
    if (!session?.access_token || !isOnline()) {
      return cachedPage && Array.isArray(cachedPage.responses)
        ? { ...cachedPage, isLocalOnly: true, isCached: true }
        : loadLocalResponses();
    }

    try {
      const responseResult = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/responses?offset=${Math.max(0, Math.floor(offset))}&limit=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (!responseResult.ok) {
        return cachedPage && Array.isArray(cachedPage.responses)
          ? { ...cachedPage, isLocalOnly: true, isCached: true }
          : loadLocalResponses();
      }
      const { responses: data = [], nextOffset = null, totalCount } = await responseResult.json() as { responses?: any[]; nextOffset?: number | null; totalCount?: number };
      const mapped = (data || []).map((row: any) => {
        const metadata = row.userData || {};
        const userData = { ...metadata };
        delete userData.country;
        delete userData.continent;
        delete userData.timezone;
        delete userData.submissionReason;
        delete userData.assessmentType;
        delete userData.categoryScores;
        delete userData.answeredQuestions;
        delete userData.responseMediaExternalized;
        const answers = Array.isArray(row.answers) ? row.answers : [];
        return {
          id: row.id,
          timestamp: row.timestamp,
          score: row.score || 0,
          totalQuestions: row.totalQuestions || 0,
          userData,
          answers,
          ...(row.status ? { status: row.status, startedAt: row.startedAt } : {}),
          country: metadata.country,
          continent: metadata.continent,
          submissionReason: metadata.submissionReason,
          assessmentType: metadata.assessmentType,
          categoryScores: metadata.categoryScores,
          answeredQuestions: metadata.answeredQuestions,
        };
      });
      
      await writeCacheValue(responseCacheKey, {
        responses: mapped,
        nextOffset,
        totalCount,
      });
      return { responses: mapped, nextOffset, totalCount, isLocalOnly: false };
    } catch {
      return cachedPage && Array.isArray(cachedPage.responses)
        ? { ...cachedPage, isLocalOnly: true, isCached: true }
        : loadLocalResponses();
    }
  },

  async clearQuizResponses(quizId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in to clear assessment responses.');
    const result = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/responses?all=1`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
    });
    const payload = await result.json();
    if (!result.ok || payload.success !== true) throw new Error(payload.error || 'Could not clear assessment responses.');
    await clearQuizResponsePageCache(quizId);
  },

  /**
   * Save a resource.
   * 1. Writes to local cache IMMEDIATELY (no network wait).
   * 2. Pushes to Supabase in the background if online.
   */
  async save(key: string, content: any, type: StorageItem['type']) {
    const timestamp = new Date().toISOString();
    const saveOwner = activeStorageUserId;

    const item: StorageItem = {
      id: type === 'draft' ? key : (content.id || key || createUuid()),
      ownerId: saveOwner,
      type,
      content,
      updated_at: timestamp,
      is_synced: false,
    };

    // 1. Write to local immediately
    const local = await readLocal(type, saveOwner);
    if (activeStorageUserId !== saveOwner) return item;
    const idx = local.findIndex((i) => i.id === item.id);
    if (idx >= 0) local[idx] = item;
    else local.unshift(item);
    const savedLocally = await writeLocal(type, local, saveOwner);
    if (!savedLocally) throw new Error('Could not save this item on this device. Free up storage and try again.');

    // 2. Push to remote in background (non-blocking)
    const validQuizUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id);
    if (isOnline() && !LOCAL_ONLY_TYPES.includes(type) && (type !== 'quiz' || validQuizUuid)) {
      (async () => {
        try {
          const userId = await getActiveUserId();
          if (!userId || userId !== saveOwner || activeStorageUserId !== saveOwner) return;

          // Route 'games' (Tournament Standings) background save to Firebase Firestore
          if (type === 'games') {
            const { db } = await import('@/lib/firebase');
            const { doc, setDoc } = await import('firebase/firestore');

            await setDoc(doc(db, 'tournaments', item.id), {
              id: item.id,
              user_id: userId,
              name: content.name || 'Tournament Standings',
              teams: content.teams || [],
              updated_at: timestamp,
            });

            if (activeStorageUserId !== saveOwner) return;
            // Mark as synced locally
            const refreshed = await readLocal(type, saveOwner);
            const i = refreshed.findIndex((r) => r.id === item.id);
            if (i >= 0) refreshed[i].is_synced = true;
            await writeLocal(type, refreshed, saveOwner);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('pw_sync_status', { detail: { type, id: item.id, is_synced: true } }));
            }
          } else {
            const payload = await buildSupabasePayload(
              type,
              content,
              userId,
              timestamp,
            );

            let { error } = await supabase
              .from(tableName(type))
              .upsert(payload);

            if (activeStorageUserId !== saveOwner) return;

            // Auto-heal missing profile if trigger failed
            if (error?.code === '23503' && error.message.includes('profiles')) {
              await supabase.from('profiles').upsert({
                id: userId,
                username: 'user_' + userId.substring(0, 8),
                display_name: 'User',
              });
              // Retry original upsert
              const retry = await supabase
                .from(tableName(type))
                .upsert(payload);
              error = retry.error;
            }

            if (!error) {
              if (activeStorageUserId !== saveOwner) return;
              // Mark as synced locally
              const refreshed = await readLocal(type, saveOwner);
              const i = refreshed.findIndex((r) => r.id === item.id);
              if (i >= 0) refreshed[i].is_synced = true;
              await writeLocal(type, refreshed, saveOwner);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pw_sync_status', { detail: { type, id: item.id, is_synced: true } }));
              }
            } else throw error;
          }
        } catch (e) {
          reportSyncFailure(type, item.id, e);
          console.warn('[HybridStorage] Background push failed:', e);
        }
      })();
    }

    return item;
  },

  /**
   * Retrieve all items of a type.
   *
   * Strategy:
   *  • Returns local cache INSTANTLY (0 ms latency, works offline).
   *  • Fires a background fetch from Supabase if online.
   *  • Calls `onUpdate(freshItems)` once remote data arrives so the caller
   *    can re-render with fresh data without blocking the initial load.
   *
   * @param type      - Resource type
   * @param onUpdate  - Optional callback fired when remote data is ready
   */
  async getAll(
    type: StorageItem['type'],
    onUpdate?: (items: any[]) => void,
  ): Promise<any[]> {
    const currentUserId = await getActiveUserId();
    if (currentUserId && currentUserId !== activeStorageUserId) {
      await setActiveStorageUser(currentUserId);
    }
    const cacheOwner = activeStorageUserId;
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      void navigator.storage.persist().catch(() => false);
    }

    // 1. Return local immediately filtered by user_id rule
    const local = await readLocal(type, cacheOwner);
    const localFlat = flattenItems(local);

    // 2. Background sync if online
    if (isOnline() && !LOCAL_ONLY_TYPES.includes(type)) {
      syncFromRemote(type, onUpdate);
    }

    return localFlat;
  },

  /* A way to get an exact quiz by it's id without reading an entire collection from it */
  async getQuiz(id?: string, columns?: string, ownerUsername?: string): Promise<Quiz | null> {
    if (!id) return null;
    const currentUserId = await getActiveUserId();
    if (currentUserId && currentUserId !== activeStorageUserId) {
      await setActiveStorageUser(currentUserId);
    }
    const cacheOwner = activeStorageUserId;
    const local = await readLocal('quiz', cacheOwner);
    const localFlat = flattenItems(local);
    let exactQuiz = localFlat.find((i) =>
      i.id === id || (!ownerUsername && (i.customUrl === id || i.custom_id === id)),
    );

    // If not found in active user's cache, check 'guest' cache
    if (!exactQuiz && cacheOwner !== 'guest') {
      const guestLocal = await readLocal('quiz', 'guest');
      exactQuiz = flattenItems(guestLocal).find((i) =>
        i.id === id || (!ownerUsername && (i.customUrl === id || i.custom_id === id)),
      );
    }

    // Check seed template cache if needed
    if (!exactQuiz && typeof window !== 'undefined') {
      try {
        const seedStr = localStorage.getItem('pw_quiz_template_v1');
        if (seedStr) {
          const seedQuiz = JSON.parse(seedStr);
          if (seedQuiz?.id === id || seedQuiz?.customUrl === id || seedQuiz?.custom_id === id) {
            exactQuiz = seedQuiz;
          }
        }
      } catch {}
    }

    if (exactQuiz && !isOnline()) return exactQuiz;
    if (!isOnline()) return exactQuiz ?? null;
    try {
      const headers: Record<string, string> = {};
      // Public quiz reads are intentionally unauthenticated; omitting the session
      // avoids sending a large Supabase JWT in a request header.
      const response = await fetch(`/api/quizzes/${encodeURIComponent(id)}${ownerUsername ? `?owner=${encodeURIComponent(ownerUsername)}` : ''}`, {
        headers, cache: 'no-store', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return exactQuiz ?? null;
      const payload = await response.json() as { quiz?: any };
      if (!payload.quiz) return exactQuiz ?? null;
      const remoteQuiz = normalizeQuizRow(payload.quiz) as Quiz;
      if (!ownerUsername && remoteQuiz.id) {
        const owner = activeStorageUserId;
        const rows = await readLocal('quiz', owner);
        if (activeStorageUserId === owner) {
          await writeLocal('quiz', [...rows.filter((item) => item.id !== remoteQuiz.id), {
            id: remoteQuiz.id, ownerId: owner, type: 'quiz', content: remoteQuiz,
            updated_at: (remoteQuiz as any).updated_at || new Date().toISOString(), is_synced: true,
          }], owner);
        }
      }
      return remoteQuiz;
    } catch {
      return exactQuiz ?? null;
    }
  },

  async saveResponse(quizId: string, response: any, options?: { requireRemote?: boolean }) {
    if (options?.requireRemote && !isOnline()) {
      throw new Error('You are offline. Reconnect to the internet and try submitting again.');
    }
    const submissionId = typeof response.submissionId === 'string' && /^[0-9a-f-]{36}$/i.test(response.submissionId)
      ? response.submissionId
      : createUuid();
    let responseToSave: any = {
      ...response,
      submissionId,
      timestamp: response.timestamp || new Date().toISOString(),
    };
    if (isOnline()) {
      if (!options?.requireRemote) await flushPendingResponses();
      try {
        responseToSave = {
          ...responseToSave,
          answers: await externalizeResponseMedia(quizId, responseToSave),
          responseMediaExternalized: true,
        };
        const saved = await insertQuizResponse(quizId, responseToSave);
        if (saved) {
          if (responseToSave.attemptId) await this.deleteAttemptResponseDraft(quizId, responseToSave.attemptId).catch(() => {});
          await clearQuizScopedCache(quizId, false);
          return saved;
        }
        if (options?.requireRemote) throw new Error('The assessment response was not confirmed by the server. Please retry submission.');
      } catch (error) {
        reportResponseSyncFailure(error);
        if (options?.requireRemote) throw error;
        console.warn('[HybridStorage] Response insert failed; queueing locally:', error);
      }
    }
    if (options?.requireRemote) {
      throw new Error('You are offline. Reconnect to the internet and try submitting again.');
    }
    const queued = { quizId, response: responseToSave };
    try {
      const queueKey = pendingResponsesKey();
      let current = (await readCacheValue<Array<{ quizId: string; response: any }>>(queueKey)) || [];
      if (!await writeCacheValue(queueKey, [...current, queued])) throw new Error('IndexedDB could not save the pending response.');
    } catch (error) {
      console.error('[HybridStorage] Could not queue quiz response locally:', error);
      return null;
    }
    return { success: true, queued: true, attemptId: responseToSave.attemptId };
  },

  /**
   * Delete an item from local and remote.
   */
  async delete(id: string, type: StorageItem['type']) {
    // 1. Delete locally first
    const owner = activeStorageUserId;
    const local = (await readLocal(type, owner)).filter((i) => i.id !== id);
    if (activeStorageUserId !== owner) return false;
    await writeLocal(type, local, owner);
    if (type === 'quiz') await clearQuizScopedCache(id, true);

    // 2. Background remote delete
    const validQuizUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (isOnline() && !LOCAL_ONLY_TYPES.includes(type) && (type !== 'quiz' || validQuizUuid)) {
      (async () => {
        try {
          // Route 'games' (Tournament Standings) remote delete to Firebase Firestore
          if (type === 'games') {
            const { db } = await import('@/lib/firebase');
            const { doc, deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'tournaments', id));
          } else if (type === 'quiz') {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            const response = await fetch(`/api/quizzes/${encodeURIComponent(id)}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!response.ok) throw new Error('Cloud assessment delete failed.');
          } else {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;
            await supabase.from(tableName(type)).delete().eq('id', id);
          }
        } catch (e) {
          console.error('[HybridStorage] Remote delete failed:', e);
        }
      })();
    }

    return true;
  },

  /**
   * Manually trigger a push of all unsynced local items across all categories.
   */
  async syncPending() {
    const types: StorageItem['type'][] = ['quiz', 'message', 'link', 'games'];
    if (!isOnline()) throw new Error('Connect to the internet before syncing your offline changes.');
    const syncOwner = activeStorageUserId;
    await flushPendingResponses();
    const pendingResponses = (await readCacheValue<Array<{ quizId: string; response: any }>>(pendingResponsesKey())) || [];
    if (pendingResponses.length) throw new Error(`${pendingResponses.length} assessment response(s) are still waiting to sync. Your data remains saved on this device.`);
    for (const t of types) {
      try {
        await pushUnsyncedItems(t);
      } catch (err) {
        console.warn(`[HybridStorage] Sync failed for type ${t}:`, err);
      }
    }
    if (activeStorageUserId !== syncOwner) throw new Error('The signed-in account changed during sync. Sign in again before syncing.');
    for (const type of types) {
      const remaining = (await readLocal(type, syncOwner)).filter((item) => !item.is_synced);
      if (remaining.length) throw new Error(`${remaining.length} ${type} item(s) are still waiting to sync. Your data remains saved on this device.`);
    }
  },

  /**
   * Manually trigger a push of all unsynced local items to remote.
   * Call this after detecting connectivity is available.
   */
  async syncLocalToRemote(type: StorageItem['type']) {
    return pushUnsyncedItems(type);
  },

  /**
   * Clean up any expired quizzes or messages from local storage to align with database expirations.
   */
  async cleanupExpiredItems() {
    if (typeof window === 'undefined') return;
    try {
      const owner = activeStorageUserId;
      const types: ('quiz' | 'message')[] = ['quiz', 'message'];
      for (const t of types) {
        const list = await readLocal(t, owner);
        const filtered = list.filter((item) => {
          const expiresAt = item.content?.expires_at || (item as any).expires_at;
          if (!expiresAt) return true;
          const gracePeriod = t === 'quiz' ? 48 * 60 * 60 * 1000 : 0;
          return new Date(expiresAt).getTime() + gracePeriod > Date.now();
        });

        if (filtered.length !== list.length && activeStorageUserId === owner) {
          await writeLocal(t, filtered, owner);
        }
      }
    } catch (e) {
      console.warn('[HybridStorage] Failed to cleanup expired local items:', e);
    }
  },
};
