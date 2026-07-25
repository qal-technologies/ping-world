// jules edit: Complete Firebase SDK Firestore CRUD algorithms for high-frequency updates
'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit as firestoreLimit,
  onSnapshot,
} from 'firebase/firestore';
import { toast } from 'sonner';

// Replicate matching database schema structures
export interface FirebaseTables {
  quizzes: {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    questions?: unknown[];
    responses?: unknown[];
    updated_at?: string;
  };
  live_leaderboard: {
    id: string;
    quiz_id: string;
    username: string;
    score: number;
    played_at: string;
  };
  live_replies: {
    id: string;
    message_id: string;
    content: string;
    sender_name?: string;
    created_at: string;
  };
  tournaments: {
    id: string;
    user_id: string;
    name: string;
    teams: unknown[];
    updated_at?: string;
  };
}

interface FirebaseGetOptions<T extends keyof FirebaseTables> {
  eq?: Partial<FirebaseTables[T]>;
  limit?: number;
}

export function useFirebase() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (db) {
      setInitialized(true);
      console.info('[useFirebase] Firebase Firestore connection initialized.');
    }
  }, []);

  const get = useCallback(
    async <T extends keyof FirebaseTables>(
      table: T,
      options?: FirebaseGetOptions<T>,
    ): Promise<FirebaseTables[T][] | null> => {
      try {
        const colRef = collection(db, table);
        let q = query(colRef);

        if (options?.eq) {
          Object.entries(options.eq).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              q = query(q, where(key, '==', val));
            }
          });
        }

        if (options?.limit) {
          q = query(q, firestoreLimit(options.limit));
        }

        const querySnapshot = await getDocs(q);
        const results: FirebaseTables[T][] = [];
        querySnapshot.forEach((docSnap) => {
          results.push(docSnap.data() as FirebaseTables[T]);
        });

        return results;
      } catch (err: any) {
        console.error(`[useFirebase] Firestore GET error on table ${table}:`, err);
        toast.error(`Firebase read failed: ${err.message || err}`);
        return null;
      }
    },
    [],
  );

  const save = useCallback(
    async <T extends keyof FirebaseTables>(
      table: T,
      payload: Partial<FirebaseTables[T]>,
    ): Promise<boolean> => {
      try {
        const id = payload.id || Math.random().toString(36).substring(2, 11);
        const docRef = doc(db, table, id);

        const dataToSave = {
          ...payload,
          id,
          updated_at: new Date().toISOString(),
        };

        await setDoc(docRef, dataToSave, { merge: true });
        return true;
      } catch (err: any) {
        console.error(`[useFirebase] Firestore SAVE error on table ${table}:`, err);
        toast.error(`Firebase save failed: ${err.message || err}`);
        return false;
      }
    },
    [],
  );

  const remove = useCallback(
    async <T extends keyof FirebaseTables>(
      table: T,
      id: string,
    ): Promise<boolean> => {
      try {
        const docRef = doc(db, table, id);
        await deleteDoc(docRef);
        return true;
      } catch (err: any) {
        console.error(`[useFirebase] Firestore DELETE error on table ${table}:`, err);
        toast.error(`Firebase delete failed: ${err.message || err}`);
        return false;
      }
    },
    [],
  );

  const listen = useCallback(
    <T extends keyof FirebaseTables>(
      table: T,
      onUpdate: (payload: Record<string, unknown> | any) => void,
      eq?: { column: string; value: string | number },
    ) => {
      const colRef = collection(db, table);
      let q = query(colRef);

      if (eq) {
        q = query(q, where(eq.column, '==', eq.value));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs: any[] = [];
          snapshot.forEach((docSnap) => {
            docs.push(docSnap.data());
          });
          onUpdate({ docs, size: snapshot.size });
        },
        (err) => {
          console.error(`[useFirebase] Realtime listener error on ${table}:`, err);
        }
      );

      return unsubscribe;
    },
    [],
  );

  return {
    initialized,
    get,
    save,
    remove,
    listen,
  };
}
