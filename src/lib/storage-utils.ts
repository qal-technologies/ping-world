import { supabase } from "./supabase";

export type StorageItem = {
  id: string;
  type: "quiz" | "message" | "post" | "link";
  content: any;
  updated_at: string;
  is_synced: boolean;
};

/**
 * Hybrid Storage Utility
 * Prioritizes Supabase if available and user is authenticated.
 * Falls back to LocalStorage for offline/guest use.
 */
export const HybridStorage = {
  /**
   * Save a resource to the available storage
   */
  async save(key: string, content: any, type: StorageItem['type']) {
    const timestamp = new Date().toISOString();
    const item: StorageItem = {
      id: content.id || Math.random().toString(36).substr(2, 9),
      type,
      content,
      updated_at: timestamp,
      is_synced: false,
    };

    // 1. Try Supabase if user is logged in
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const tableName = item.type === 'quiz' ? 'quizzes' : item.type + 's';
        // Save to Supabase (assuming tables are ready)
        const { error } = await supabase.from(tableName).upsert({
          id: item.id,
          user_id: session.user.id,
          ...content,
          updated_at: timestamp,
        });

        if (!error) {
          item.is_synced = true;
        }
      }
    } catch (e) {
      console.warn('Supabase save failed, falling back to local:', e);
    }

    // 2. Always save to LocalStorage as a local cache/draft
    const keyPrefix = item.type === 'quiz' ? 'quizzes' : item.type + 's';
    const saved = localStorage.getItem(`pingworld_${keyPrefix}`);
    const list = saved ? JSON.parse(saved) : [];
    const index = list.findIndex((i: any) => i.id === item.id);

    if (index >= 0) {
      list[index] = item;
    } else {
      list.unshift(item);
    }

    localStorage.setItem(`pingworld_${keyPrefix}`, JSON.stringify(list));
    return item;
  },

  /**
   * Retrieve all items of a certain type
   */
  async getAll(type: StorageItem['type']) {
    let remoteItems: any[] = [];

    // 1. Try to get from Supabase
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const tableName = type === 'quiz' ? 'quizzes' : type + 's';
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          remoteItems = data.map((i) => ({ ...i, is_synced: true }));
        }
      }
    } catch (e) {
      console.warn('Supabase fetch failed, relying on local:', e);
    }

    // 2. Get from LocalStorage
    const keyPrefix = type === 'quiz' ? 'quizzes' : type + 's';
    const saved = localStorage.getItem(`pingworld_${keyPrefix}`);
    const localItems = saved ? JSON.parse(saved) : [];

    // Merge logic: prefer remote if synced, otherwise use local drafts
    const merged = [...remoteItems];
    localItems.forEach((local: any) => {
      // Unwrap the content for local items
      const rawContent = local.content || local;
      if (!merged.find((remote) => remote.id === (rawContent.id || local.id))) {
        merged.push({ ...rawContent, is_synced: !!local.is_synced });
      }
    });

    return merged;
  },

  /**
   * Add a response to a quiz
   */
  async saveResponse(quizId: string, response: any) {
    const quizzes = await this.getAll('quiz');
    const index = quizzes.findIndex(
      (q: any) => String(q.id) === String(quizId),
    );

    if (index === -1) return null;

    const quiz = quizzes[index];
    if (!quiz.responses) quiz.responses = [];
    quiz.responses.push({
      ...response,
      timestamp: new Date().toISOString(),
    });

    return await this.save(quizId, quiz, 'quiz');
  },

  /**
   * Delete an item
   */
  async delete(id: string, type: StorageItem['type']) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const tableName = type === 'quiz' ? 'quizzes' : type + 's';
        await supabase.from(tableName).delete().eq('id', id);
      }
    } catch (e) {
      console.error('Remote delete failed:', e);
    }

    // 2. Local delete
    const keyPrefix = type === 'quiz' ? 'quizzes' : type + 's';
    const saved = localStorage.getItem(`pingworld_${keyPrefix}`);
    if (saved) {
      const list = JSON.parse(saved).filter((i: any) => i.id !== id);
      localStorage.setItem(`pingworld_${keyPrefix}`, JSON.stringify(list));
      return true;
    }
  },

  /**
   * Sync unsynced local items to remote
   */
  async syncLocalToRemote(type: StorageItem['type']) {
    const keyPrefix = type === 'quiz' ? 'quizzes' : type + 's';
    const saved = localStorage.getItem(`pingworld_${keyPrefix}`);
    if (!saved) return;

    const list = JSON.parse(saved);
    const unsynced = list.filter((i: any) => !i.is_synced);

    if (unsynced.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    for (const item of unsynced) {
      try {
        const tableName = item.type === 'quiz' ? 'quizzes' : item.type + 's';
        const { error } = await supabase.from(tableName).upsert({
          id: item.id,
          user_id: session.user.id,
          ...item.content,
          updated_at: new Date().toISOString(),
        });

        if (!error) {
          item.is_synced = true;
        }
      } catch (e) {
        console.error(`Failed to sync item ${item.id}:`, e);
      }
    }

    localStorage.setItem(`pingworld_${keyPrefix}`, JSON.stringify(list));
  },
};
