import type { Quiz } from '@/app/(main)/quiz/';
import { supabase } from './supabase';
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

const keyPrefix = (type: StorageItem['type']) => storageNames[type].bucket;

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
const localStorageKey = (type: StorageItem['type'], userId = activeStorageUserId) =>
  `pw_${keyPrefix(type)}_${encodeURIComponent(userId)}`;

const CACHE_DB_NAME = 'pingworld-local-cache-v1';
const CACHE_STORE_NAME = 'records';
let cacheDbPromise: Promise<IDBDatabase | null> | null = null;
let persistenceRequested = false;

function openCacheDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
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
        request = indexedDB.open(CACHE_DB_NAME, 1);
      } catch {
        safeResolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
            db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
          }
        } catch {
          safeResolve(null);
        }
      };
      request.onsuccess = () => {
        try {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            cacheDbPromise = null;
          };
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
  return cacheDbPromise;
}

const cacheRecordKey = (type: StorageItem['type'], userId = activeStorageUserId) =>
  `${encodeURIComponent(userId)}:${type}`;

async function readCacheValue<T>(key: string): Promise<T | null> {
  try {
    const db = await openCacheDb();
    if (!db) {
      try { return JSON.parse(localStorage.getItem(`pw_${key}`) || 'null') as T | null; }
      catch { return null; }
    }
    return await new Promise<T | null>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(null); }
      }, 1000);
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
        const req = tx.objectStore(CACHE_STORE_NAME).get(key);
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
  } catch {
    try { return JSON.parse(localStorage.getItem(`pw_${key}`) || 'null') as T | null; }
    catch { return null; }
  }
}

async function writeCacheValue<T>(key: string, value: T) {
  try {
    localStorage.setItem(`pw_${key}`, JSON.stringify(value));
  } catch {}
  try {
    const db = await openCacheDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(); }
      }, 1000);
      try {
        const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        transaction.objectStore(CACHE_STORE_NAME).put({ key, value, updatedAt: Date.now() });
        transaction.oncomplete = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
        transaction.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
        transaction.onabort = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
      } catch {
        if (!done) { done = true; clearTimeout(timer); resolve(); }
      }
    });
  } catch {}
}

async function deleteCacheValue(key: string) {
  try {
    localStorage.removeItem(`pw_${key}`);
  } catch {}
  try {
    const db = await openCacheDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(); }
      }, 1000);
      try {
        const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        transaction.objectStore(CACHE_STORE_NAME).delete(key);
        transaction.oncomplete = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
        transaction.onerror = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
        transaction.onabort = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
      } catch {
        if (!done) { done = true; clearTimeout(timer); resolve(); }
      }
    });
  } catch {}
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
  });
}

async function readLocal(type: StorageItem['type'], owner = activeStorageUserId): Promise<StorageItem[]> {
  try {
    const db = await openCacheDb();
    if (db) {
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
      if (Array.isArray(record?.items) && record.items.length > 0) {
        return record.items.filter((item: StorageItem) =>
          !item.ownerId || item.ownerId === owner,
        );
      }
    }
  } catch {}
  try {
    const raw = localStorage.getItem(localStorageKey(type, owner));
    const list: StorageItem[] = raw ? JSON.parse(raw) : [];
    return list.filter((item) => !item.ownerId || item.ownerId === owner);
  } catch {
    return [];
  }
}

async function writeLocal(type: StorageItem['type'], list: StorageItem[], owner = activeStorageUserId) {
  const scopedList = list.filter((item) => !item.ownerId || item.ownerId === owner)
    .map((item) => ({ ...item, ownerId: owner }));
  try {
    localStorage.setItem(localStorageKey(type, owner), JSON.stringify(scopedList));
  } catch {}
  try {
    const db = await openCacheDb();
    if (db) {
      await new Promise<void>((resolve) => {
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; resolve(); } }, 1000);
        try {
          const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
          transaction.objectStore(CACHE_STORE_NAME).put({
            key: cacheRecordKey(type, owner), items: scopedList, updatedAt: Date.now(),
          });
          transaction.oncomplete = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
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

  // Start with local
  local.forEach((item) => map.set(item.id, item));

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
  const blob = await response.blob();
  const extension = (blob.type.split('/')[1] || 'bin').split(';')[0].replace(/[^a-zA-Z0-9]/g, '') || 'bin';
  const storagePath = `${path}-${await blobFingerprint(blob)}.${extension}`;
  const mediaStorage = supabase.storage.from('quiz-media');
  const { data: exists, error: existsError } = await mediaStorage.exists(storagePath);
  if (existsError || !exists) {
    const { error } = await mediaStorage.upload(storagePath, blob, {
      upsert: false,
      contentType: blob.type || unpacked.type || 'application/octet-stream',
      cacheControl: '31536000',
    });
    if (error) {
      const { data: uploadedInParallel } = await mediaStorage.exists(storagePath);
      if (!uploadedInParallel) throw error;
    }
  }
  return supabase.storage.from('quiz-media').getPublicUrl(storagePath).data.publicUrl;
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
    while (true) {
      const orderColumn = type === 'message' || type === 'link' ? 'created_at' : 'updated_at';
      let query = supabase.from(tableName(type)).select('*')
        .order(orderColumn, { ascending: false })
        .range(offset, offset + 999);
      if (session) {
        const userCol = type === 'link' ? 'creator_id' : type === 'message' ? 'recipient_id' : 'user_id';
        query = query.eq(userCol, session.user.id) as any;
      }
      const { data, error } = await query;
      if (error || !data?.length) {
        if (error) console.warn(`[HybridStorage] Could not load ${type}:`, error.message);
        break;
      }
      rows.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    if (activeStorageUserId !== cacheOwner) return;

    if (rows.length > 0) {
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
          }
        }
      } catch (e) {
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

async function insertQuizResponse(quizId: string, response: any) {
  const persistedResponse = response.attemptId
    ? (await HybridStorage.getAttemptResponseDraft(quizId, response.attemptId)) || response
    : response;
  const answers = await externalizeResponseMedia(quizId, persistedResponse);
  if (response.attemptId && response.attemptToken) {
    const draft = await HybridStorage.getQuizAttemptDraft(quizId);
    if (!draft || draft.attemptId !== response.attemptId || !Array.isArray(draft.questionOrder)) return false;
    const attemptAnswers = Object.fromEntries((answers || []).filter((answer: any) => answer?.questionId).map((answer: any) => [String(answer.questionId), answer]));
    const attemptSync = await fetch('/api/quiz-attempts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: draft.remoteStarted ? 'save' : 'start', quizId, attemptId: response.attemptId,
        attemptToken: response.attemptToken, answers: attemptAnswers, questionOrder: draft.questionOrder,
        userData: response.userData || draft.userData || {}, currentQuestionIndex: draft.currentQuestionIndex || 0,
      }),
    });
    // A previously submitted attempt is safe to retry through the idempotent response endpoint.
    if (!attemptSync.ok && attemptSync.status !== 409) return false;
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
  if (!result.ok) return false;
  return await result.json() as { success: true; score: number; totalQuestions: number; categoryScores?: Record<string, { correct: number; total: number }> };
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
    const blob = await media.blob();
    const extension = (blob.type.split('/')[1] || 'bin').split(';')[0].replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    const path = `${safeStorageSegment(quizId)}/${safeStorageSegment(response.submissionId)}/${safeStorageSegment(String(answer.questionId || index))}-${await blobFingerprint(blob)}.${extension}`;
    const mediaStorage = supabase.storage.from('quiz-response-media');
    const { data: exists, error: existsError } = await mediaStorage.exists(path);
    if (existsError || !exists) {
      const { error } = await mediaStorage.upload(path, blob, {
        contentType: blob.type || unpacked.type || 'application/octet-stream',
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) {
        const { data: uploadedInParallel } = await mediaStorage.exists(path);
        if (!uploadedInParallel) throw error;
      }
    }
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
    } catch {
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
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(CACHE_STORE_NAME);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    }
    const cachePrefixes = [
      'pw_quizzes', 'pw_messages', 'pw_posts', 'pw_links', 'pw_games',
      'pw_documents', 'pw_composer_history', 'pw_quiz_drafts',
      'pw_queue:', 'pw_quiz_responses_pending_', 'pw_storage_legacy_migrated_v1_', 'pw_quiz_seed_template_', 'pw_quiz_template_',
      'pw_quiz_attempt:', 'pw_quiz_submission:',
      'completed_quiz_',
    ];
    Object.keys(localStorage).forEach((key) => {
      if (cachePrefixes.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key);
    });
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

  async getQuizDraft(quizId: string): Promise<Quiz | null> {
    const drafts = await readLocal('draft');
    return (drafts.find((item) => item.id === `draft-${quizId}`)?.content as Quiz) || null;
  },

  async deleteQuizDraft(quizId: string) {
    return this.delete(`draft-${quizId}`, 'draft');
  },

  async saveQuizAttemptDraft(quizId: string, draft: Record<string, unknown>) {
    const key = `quiz_attempt:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}`;
    await writeCacheValue(key, { ...draft, updatedAt: Date.now() });
  },

  async getQuizAttemptDraft(quizId: string): Promise<Record<string, any> | null> {
    const key = `quiz_attempt:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}`;
    return readCacheValue<Record<string, any>>(key);
  },

  async deleteQuizAttemptDraft(quizId: string) {
    const key = `quiz_attempt:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}`;
    await deleteCacheValue(key);
  },

  async prepareQuizAttemptSnapshot(quizId: string, snapshot: Record<string, any>) {
    const answers = snapshot.answers && typeof snapshot.answers === 'object' ? snapshot.answers : {};
    const items = Object.values(answers);
    if (!items.some((answer: any) => typeof answer?.fileUrl === 'string' && (unpackPingWorldMediaUrl(answer.fileUrl).url || answer.fileUrl).startsWith('data:'))) return snapshot;
    const externalized = await externalizeResponseMedia(quizId, { submissionId: snapshot.attemptId, answers: items });
    return { ...snapshot, answers: Object.fromEntries(externalized.filter((answer: any) => answer?.questionId).map((answer: any) => [String(answer.questionId), answer])) };
  },

  async storeAttemptResponseDraft(quizId: string, response: Record<string, any>) {
    const answers = await externalizeResponseMedia(quizId, response);
    const compactResponse = { ...response, answers, responseMediaExternalized: true };
    const key = `quiz_submission:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}:${encodeURIComponent(String(response.attemptId || response.submissionId || 'pending'))}`;
    await writeCacheValue(key, compactResponse);
    return compactResponse;
  },

  async getAttemptResponseDraft(quizId: string, attemptId: string) {
    const key = `quiz_submission:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}:${encodeURIComponent(attemptId)}`;
    return readCacheValue<Record<string, any>>(key);
  },

  async deleteAttemptResponseDraft(quizId: string, attemptId: string) {
    const key = `quiz_submission:${encodeURIComponent(activeStorageUserId)}:${getAttemptSessionId()}:${encodeURIComponent(quizId)}:${encodeURIComponent(attemptId)}`;
    await deleteCacheValue(key);
  },

  async getQuizResponses(quizId: string, offset = 0): Promise<{ responses: any[]; nextOffset: number | null; isLocalOnly?: boolean }> {
    let session = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
    } catch {}

    const responseCacheKey = `quiz_responses:${encodeURIComponent(activeStorageUserId)}:${encodeURIComponent(quizId)}:${Math.max(0, Math.floor(offset))}`;

    const loadLocalResponses = async () => {
      const cachedPage = await readCacheValue<{ responses: any[]; nextOffset: number | null }>(responseCacheKey);
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
          const templateStored = JSON.parse(localStorage.getItem('pw_template_responses') || '[]');
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

      return { responses: localResponses, nextOffset: null, isLocalOnly: true };
    };

    if (!session?.access_token) {
      return loadLocalResponses();
    }

    try {
      const responseResult = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/responses?offset=${Math.max(0, Math.floor(offset))}&limit=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (!responseResult.ok) {
        return loadLocalResponses();
      }
      const { responses: data = [], nextOffset = null } = await responseResult.json() as { responses?: any[]; nextOffset?: number | null };
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
      });
      return { responses: mapped, nextOffset, isLocalOnly: false };
    } catch {
      return loadLocalResponses();
    }
  },

  async clearQuizResponses(quizId: string) {
    const { data: rows, error: loadError } = await supabase.from('quiz_responses')
      .select('id,answers').eq('quiz_id', quizId);
    if (loadError) throw loadError;
    const paths = (rows || []).flatMap((row: any) =>
      (Array.isArray(row.answers) ? row.answers : [])
        .map((answer: any) => answer?.fileUrl)
        .filter((path: any) => typeof path === 'string' && !path.startsWith('http') && !path.startsWith('data:')),
    );
    if (paths.length) {
      const { error: mediaError } = await supabase.storage.from('quiz-response-media').remove(paths);
      if (mediaError) throw mediaError;
    }
    const { error } = await supabase.from('quiz_responses').delete().eq('quiz_id', quizId);
    if (error) throw error;
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
    try {
      await writeLocal(type, local, saveOwner);
    } catch {
      // Still attempt cloud persistence if this device has exhausted its cache quota.
    }

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
            }
          }
        } catch (e) {
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

    if (isOnline()) {
      try {
        const selectedColumns = columns || '*';
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        const timeoutPromise = new Promise<{ data: null; error: any }>((res) =>
          setTimeout(() => res({ data: null, error: new Error('timeout') }), 2500)
        );

        let queryPromise;
        if (isUuid && !ownerUsername) {
          queryPromise = supabase.from(tableName('quiz')).select(selectedColumns).eq('id', id).maybeSingle();
        } else {
          let customQuery = supabase.from(tableName('quiz')).select(selectedColumns).eq('custom_id', id);
          if (ownerUsername) {
            const { data: profile } = await supabase.from('profiles').select('id').eq('username', ownerUsername).maybeSingle();
            if (profile?.id) {
              customQuery = customQuery.eq('user_id', profile.id);
            }
          }
          queryPromise = customQuery.maybeSingle();
        }

        const onlineQuiz: any = await Promise.race([queryPromise, timeoutPromise]);
        if (!onlineQuiz.error && onlineQuiz.data) {
          return {
            ...normalizeQuizRow(onlineQuiz.data),
          } as Quiz;
        }
      } catch {}
    }
    return exactQuiz ?? null;
  },

  async saveResponse(quizId: string, response: any) {
    const submissionId = typeof response.submissionId === 'string' && /^[0-9a-f-]{36}$/i.test(response.submissionId)
      ? response.submissionId
      : createUuid();
    let responseToSave: any = {
      ...response,
      submissionId,
      timestamp: response.timestamp || new Date().toISOString(),
    };
    if (isOnline()) {
      await flushPendingResponses();
      try {
        responseToSave = {
          ...responseToSave,
          answers: await externalizeResponseMedia(quizId, responseToSave),
          responseMediaExternalized: true,
        };
        const saved = await insertQuizResponse(quizId, responseToSave);
        if (saved) return saved;
      } catch (error) {
        console.warn('[HybridStorage] Response insert failed; queueing locally:', error);
      }
    }
    const queued = { quizId, response: responseToSave };
    try {
      const queueKey = pendingResponsesKey();
      let current = (await readCacheValue<Array<{ quizId: string; response: any }>>(queueKey)) || [];
      await writeCacheValue(queueKey, [...current, queued]);
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
