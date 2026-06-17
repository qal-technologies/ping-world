import { supabase } from './supabase';

export type StorageItem = {
  id: string;
  type: 'quiz' | 'message' | 'post' | 'link';
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

    // Public reads (quizzes) don't require a session
    let query = supabase
      .from(tableName(type))
      .select('*')
      .order('updated_at', { ascending: false });

    if (session) {
      // Authenticated: fetch own data
      query = query.eq('user_id', session.user.id) as any;
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
        const { error } = await supabase.from(tableName(type)).upsert({
          id: item.id,
          user_id: session.user.id,
          ...item.content,
          updated_at: new Date().toISOString(),
        });

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

const ALL_TYPES: StorageItem['type'][] = ['quiz', 'message', 'post', 'link'];

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

          const { error } = await supabase.from(tableName(type)).upsert({
            id: item.id,
            user_id: session.user.id,
            ...content,
            updated_at: timestamp,
          });

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

  /**
   * Save a quiz response.
   */
  async saveResponse(quizId: string, response: any) {
    const quizzes = await this.getAll('quiz');
    const index = quizzes.findIndex(
      (q: any) => String(q.id) === String(quizId),
    );
    if (index === -1) return null;

    const quiz = quizzes[index];
    if (!quiz.responses) quiz.responses = [];
    quiz.responses.push({ ...response, timestamp: new Date().toISOString() });

    return await this.save(quizId, quiz, 'quiz');
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
};
