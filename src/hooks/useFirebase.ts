'use client';

import { useEffect, useState, useCallback } from 'react';
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
}

interface FirebaseGetOptions<T extends keyof FirebaseTables> {
  eq?: Partial<FirebaseTables[T]>;
  limit?: number;
}

/**
 * useFirebase Hook Skeleton
 *
 * Implements a matching interface to useSupabase but routes requests to Firebase firestore/realtime DB
 * for high-frequency low-latency updates (e.g., live message replies, game leaderboards).
 *
 * TODO: Integrate Firebase SDK. Set up Firebase Project in console.firebase.google.com and define:
 * NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_DATABASE_URL etc.
 */
export function useFirebase() {
  // Firebase Firestore instance — typed as unknown until SDK specific import is available
  const [db, setDb] = useState<unknown>(null);

  useEffect(() => {
    // Scaffold initial Firebase connection here once environment keys are established
    // e.g.:
    // import { initializeApp } from "firebase/app";
    // import { getFirestore } from "firebase/firestore";
    // const app = initializeApp(firebaseConfig);
    // setDb(getFirestore(app));
    console.info('[useFirebase] Firebase initialized in standby mode.');
  }, []);

  const get = useCallback(
    async <T extends keyof FirebaseTables>(
      table: T,
      options?: FirebaseGetOptions<T>,
    ): Promise<FirebaseTables[T][] | null> => {
      // TODO: Implement Firestore get queries with limit/where conditions
      console.info(
        `[useFirebase] Stub: fetching from Firestore table: ${table}`,
        options,
      );
      return [];
    },
    [],
  );

  const save = useCallback(
    async <T extends keyof FirebaseTables>(
      table: T,
      payload: Partial<FirebaseTables[T]>,
    ): Promise<boolean> => {
      // TODO: Implement Firestore doc set/add
      console.info(
        `[useFirebase] Stub: saving to Firestore table: ${table}`,
        payload,
      );
      toast.success(`[Firebase Standby] Saved entry in ${table}`);
      return true;
    },
    [],
  );

  const remove = useCallback(
    async <T extends keyof FirebaseTables>(
      table: T,
      id: string,
    ): Promise<boolean> => {
      // TODO: Implement Firestore doc delete
      console.info(
        `[useFirebase] Stub: deleting doc ${id} from table ${table}`,
      );
      return true;
    },
    [],
  );

  const listen = useCallback(
    <T extends keyof FirebaseTables>(
      table: T,
      onUpdate: (payload: Record<string, unknown>) => void,
      eq?: { column: string; value: string | number },
    ) => {
      // TODO: Implement Firestore onSnapshot subscription or Realtime Database listening
      console.info(
        `[useFirebase] Stub: listening to edits on table: ${table} keyed to ${eq?.column}=${eq?.value}`,
      );

      // Return unsubscribe mock
      return () => {
        console.info(
          `[useFirebase] Stub: unregistered socket listener on ${table}`,
        );
      };
    },
    [],
  );

  return {
    get,
    save,
    remove,
    listen,
  };
}
