import { supabase } from './supabase';

export type StorageItem = {
  id: string;
  type: 'quiz' | 'message' | 'post' | 'link' | 'games';
  content: any;
  updated_at: string;
  is_synced: boolean;
};

/** Check browser/Node navigator.onLine — fastest possible signal */
const isOnline = (): boolean =>
  typeof navigator !== 'undefined' ? navigator.onLine : true;

const keyPrefix = (type: StorageItem['type']) =>
  type === 'quiz' ? 'quizzes' : `${type}s`;

const tableName = (type: StorageItem['type']) =>
  type === 'quiz' ? 'quizzes' : `${type}s`;

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function readLocal(type: StorageItem['type']): StorageItem[] {
  try {
    const raw = localStorage.getItem(`pingworld_${keyPrefix(type)}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(type: StorageItem['type'], list: StorageItem[]) {
  localStorage.setItem(`pingworld_${keyPrefix(type)}`, JSON.stringify(list));
}

function mergeIntoLocal(type: StorageItem['type'], remoteRows: any[]) {
  const local = readLocal(type);
  const map = new Map<string, StorageItem>();

  // Start with local
  local.forEach((item) => map.set(item.id, item));

  // Remote wins for synced items
  remoteRows.forEach((row) => {
    map.set(row.id, {
      id: row.id,
      type,
      content: row,
      updated_at: row.updated_at || new Date().toISOString(),
      is_synced: true,
    });
  });

  const merged = [...map.values()];
  writeLocal(type, merged);
  return merged;
}

function flattenItems(items: StorageItem[]): any[] {
  return items.map((i) => i.content || i);
}

// ---------------------------------------------------------------------------

// Safely construct payloads mapping local state directly to DB schema columns
function buildSupabasePayload(
  type: StorageItem['type'],
  content: any,
  userId: string,
  timestamp: string,
) {
  const baseId = content.id;

  if (type === 'quiz') {
    return {
      id: baseId,
      user_id: userId,
      title: content.title,
      description: content.description,
      type: content.type,
      questions: content.questions,
      responses: content.responses,
      canGoBack: content.canGoBack,
      showScore: content.showScore,
      hasTimer: content.hasTimer,
      correctOption: content.correctOption,
      correctOptionDes: content.correctOptionDes,
      randomizeOptions: content.randomizeOptions,
      randomizeQuestions: content.randomizeQuestions,
      allowRetry: content.allowRetry,
      enforceSecurity: content.enforceSecurity,
      enforceIdentity: content.enforceIdentity,
      askDetails: content.askDetails,
      endScreen: content.endScreen,
      updated_at: timestamp,
    };
  } else if (type === 'link') {
    return {
      id: baseId,
      creator_id: userId, // Schema uses creator_id
      original_url: content.originalUrl || content.original_url,
      clicks: content.clicks || 0,
      // updated_at does not exist on short_links
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
  if (!isOnline()) return;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Prevent anonymous full-table scans for private data
    if (type !== 'quiz' && !session) return;

    // Projection map: avoid fetching entire table width for list syncs
    const projections: Record<StorageItem['type'], string> = {
      quiz: 'id,user_id,title,description,type,updated_at',
      message: 'id,recipient_id,content,is_seen,created_at,expires_at',
      link: 'id,creator_id,original_url,clicks',
      games: 'id,user_id,name,teams,updated_at',
      post: 'id,updated_at', // Not currently used but satisfying type mapping
    };

    let query = supabase
      .from(tableName(type))
      .select(projections[type] || '*')
      .order('updated_at', { ascending: false })
      .limit(50); // Safety limit

    if (session) {
      // Authenticated: fetch own data using correct column
      const userCol =
        type === 'link' ? 'creator_id'
        : type === 'message' ? 'recipient_id'
        : 'user_id';
      query = query.eq(userCol, session.user.id) as any;
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const merged = mergeIntoLocal(type, data);
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
  if (!isOnline()) return;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const local = readLocal(type);
    const unsynced = local.filter((i) => !i.is_synced);
    if (unsynced.length === 0) return;

    for (const item of unsynced) {
      try {
        const payload = buildSupabasePayload(
          type,
          item.content,
          session.user.id,
          new Date().toISOString(),
        );

        let { error } = await supabase.from(tableName(type)).upsert(payload);

        // Auto-heal missing profile if trigger failed
        if (error?.code === '23503' && error.message.includes('profiles')) {
          await supabase.from('profiles').upsert({
            id: session.user.id,
            username: 'user_' + session.user.id.substring(0, 8),
            display_name: session.user.email?.split('@')[0] || 'User',
          });
          // Retry original upsert
          const retry = await supabase.from(tableName(type)).upsert(payload);
          error = retry.error;
        }

        if (!error) {
          item.is_synced = true;
        }
      } catch (e) {
        console.error(`[HybridStorage] Failed to push item ${item.id}:`, e);
      }
    }

    writeLocal(type, local);
  } catch (e) {
    console.warn('[HybridStorage] Push failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Listen for connectivity restoration → auto-sync all types
// ---------------------------------------------------------------------------

const ALL_TYPES: StorageItem['type'][] = [
  'quiz',
  'message',
  'post',
  'link',
  'games',
];

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[HybridStorage] Connection restored — syncing…');
    ALL_TYPES.forEach((t) => {
      pushUnsyncedItems(t);
      syncFromRemote(t);
    });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const HybridStorage = {
  /**
   * Save a resource.
   * 1. Writes to local cache IMMEDIATELY (no network wait).
   * 2. Pushes to Supabase in the background if online.
   */
  async save(key: string, content: any, type: StorageItem['type']) {
    const timestamp = new Date().toISOString();
    const item: StorageItem = {
      id: content.id || key || Math.random().toString(36).substr(2, 9),
      type,
      content,
      updated_at: timestamp,
      is_synced: false,
    };

    // 1. Write to local immediately
    const local = readLocal(type);
    const idx = local.findIndex((i) => i.id === item.id);
    if (idx >= 0) local[idx] = item;
    else local.unshift(item);
    writeLocal(type, local);

    // 2. Push to remote in background (non-blocking)
    if (isOnline()) {
      (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;

          const payload = buildSupabasePayload(
            type,
            content,
            session.user.id,
            timestamp,
          );

          let { error } = await supabase.from(tableName(type)).upsert(payload);

          // Auto-heal missing profile if trigger failed
          if (error?.code === '23503' && error.message.includes('profiles')) {
            await supabase.from('profiles').upsert({
              id: session.user.id,
              username: 'user_' + session.user.id.substring(0, 8),
              display_name: session.user.email?.split('@')[0] || 'User',
            });
            // Retry original upsert
            const retry = await supabase.from(tableName(type)).upsert(payload);
            error = retry.error;
          }

          if (!error) {
            // Mark as synced locally
            const refreshed = readLocal(type);
            const i = refreshed.findIndex((r) => r.id === item.id);
            if (i >= 0) refreshed[i].is_synced = true;
            writeLocal(type, refreshed);
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
    // 1. Return local immediately
    const local = readLocal(type);
    const localFlat = flattenItems(local);

    // 2. Background sync if online
    if (isOnline()) {
      syncFromRemote(type, onUpdate);
    }

    return localFlat;
  },

  async saveResponse(quizId: string, response: any) {
    const quizzes = await this.getAll('quiz');
    const index = quizzes.findIndex(
      (q: any) => String(q.id) === String(quizId),
    );

    if (index === -1) return null;

    const quiz = quizzes[index];
    if (!quiz.responses) quiz.responses = [];
    quiz.responses.push({ ...response, timestamp: new Date().toISOString() });

    // 1. Save locally instantly
    await this.save(quizId, quiz, 'quiz');

    // 2. Fire RPC if online (bypasses RLS so anyone can submit)
    if (isOnline()) {
      (async () => {
        try {
          await supabase.rpc('submit_quiz_response', {
            p_quiz_id: quizId,
            p_response: { ...response, timestamp: new Date().toISOString() },
          });
        } catch (e) {
          console.warn('[HybridStorage] Remote response push failed:', e);
        }
      })();
    }

    return true;
  },

  /**
   * Delete an item from local and remote.
   */
  async delete(id: string, type: StorageItem['type']) {
    // 1. Delete locally first
    const local = readLocal(type).filter((i) => i.id !== id);
    writeLocal(type, local);

    // 2. Background remote delete
    if (isOnline()) {
      (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;
          await supabase.from(tableName(type)).delete().eq('id', id);
        } catch (e) {
          console.error('[HybridStorage] Remote delete failed:', e);
        }
      })();
    }

    return true;
  },

  /**
   * Manually trigger a push of all unsynced local items to remote.
   * Call this after detecting connectivity is available.
   */
  async syncLocalToRemote(type: StorageItem['type']) {
    return pushUnsyncedItems(type);
  },

  /**
   * jules edit: Clean up any expired quizzes or messages from local storage to align with database expirations.
   */
  async cleanupExpiredItems() {
    if (typeof window === 'undefined') return;
    try {
      const types: ('quiz' | 'message')[] = ['quiz', 'message'];
      for (const t of types) {
        const key = `pingworld_${t === 'quiz' ? 'quizzes' : 'messages'}`;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) continue;

        const filtered = list.filter((item: any) => {
          const expiresAt = item.content?.expires_at || item.expires_at;
          if (!expiresAt) return true;
          return new Date(expiresAt).getTime() > Date.now();
        });

        if (filtered.length !== list.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.warn('[HybridStorage] Failed to cleanup expired local items:', e);
    }
  },
};
