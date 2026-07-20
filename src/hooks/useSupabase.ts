'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface SupabaseTables {
  quizzes: {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    type?: string;
    questions?: unknown[];
    responses?: unknown[];
    canGoBack?: boolean;
    showScore?: boolean;
    hasTimer?: boolean;
    correctOption?: boolean;
    correctOptionDes?: boolean;
    randomizeOptions?: boolean;
    randomizeQuestions?: boolean;
    allowRetry?: boolean;
    enforceSecurity?: boolean;
    enforceIdentity?: boolean;
    askDetails?: boolean;
    endScreen?: unknown;
    updated_at?: string;
  };
  short_links: {
    id: string;
    creator_id: string;
    original_url: string;
    clicks: number;
    expires_at?: string;
  };
  messages: {
    id: string;
    recipient_id: string;
    content: string;
    is_seen: boolean;
    created_at?: string;
    expires_at?: string;
  };
  tournaments: {
    id: string;
    user_id: string;
    name: string;
    teams: unknown[];
    updated_at?: string;
  };
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface GetOptions<T extends keyof SupabaseTables> {
  select?: string;
  eq?: Partial<SupabaseTables[T]>;
  limit?: number;
  range?: [number, number];
}

export function useSupabase() {
  // Session type from Supabase SDK — using import type would create circular — use unknown
  const [session, setSession] = useState<unknown | any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const get = useCallback(
    async <T extends keyof SupabaseTables>(
      table: T,
      options?: GetOptions<T>,
    ): Promise<SupabaseTables[T][] | null> => {
      try {
        let query = supabase.from(table).select(options?.select || '*');

        if (options?.eq) {
          Object.entries(options.eq).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              query = query.eq(key, val);
            }
          });
        }

        if (options?.range) {
          query = query.range(options.range[0], options.range[1]);
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return data as any;
      } catch (err: any) {
        console.error(`[useSupabase] Get error on table ${table}:`, err);
        toast.error(`Database read failed: ${err.message || err}`);
        return null;
      }
    },
    [],
  );

  const save = useCallback(
    async <T extends keyof SupabaseTables>(
      table: T,
      payload: Partial<SupabaseTables[T]>,
    ): Promise<boolean> => {
      try {
        // Auto-populate default fields if user is authenticated
        const user = session?.user;
        const dataToSave = {
          ...payload,
          updated_at: new Date().toISOString(),
        };

        if (user && table !== 'profiles') {
          if ('user_id' in dataToSave) {
            (dataToSave as any).user_id =
              (dataToSave as any).user_id || user.id;
          } else if ('creator_id' in dataToSave) {
            (dataToSave as any).creator_id =
              (dataToSave as any).creator_id || user.id;
          }
        }

        const { error } = await supabase.from(table).upsert(dataToSave);

        if (error) {
          // Auto-heal missing profile references if database triggers have a latency lapse
          if (
            error.code === '23503' &&
            error.message.includes('profiles') &&
            user
          ) {
            await supabase.from('profiles').upsert({
              id: user.id,
              username: 'user_' + user.id.substring(0, 8),
              display_name: user.email?.split('@')[0] || 'User',
            });

            // Retry saving original payload
            const { error: retryError } = await supabase
              .from(table)
              .upsert(dataToSave);
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }

        return true;
      } catch (err: any) {
        console.error(`[useSupabase] Save error on table ${table}:`, err);
        toast.error(`Database save failed: ${err.message || err}`);
        return false;
      }
    },
    [session],
  );

  const remove = useCallback(
    async <T extends keyof SupabaseTables>(
      table: T,
      id: string,
    ): Promise<boolean> => {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
      } catch (err: any) {
        console.error(`[useSupabase] Delete error on table ${table}:`, err);
        toast.error(`Database delete failed: ${err.message || err}`);
        return false;
      }
    },
    [],
  );

  const listen = useCallback(
    <T extends keyof SupabaseTables>(
      table: T,
      onUpdate: (payload: Record<string, unknown>) => void,
      eq?: { column: string; value: string | number },
    ) => {
      let filterString = '';
      if (eq) {
        filterString = `${eq.column}=eq.${eq.value}`;
      }

      const channel = supabase
        .channel(
          `realtime_${table}_changes_${Math.random().toString(36).substr(2, 9)}`,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filterString || undefined,
          },
          (payload: Record<string, unknown>) => {
            onUpdate(payload);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [],
  );

  return {
    session,
    get,
    save,
    remove,
    listen,
  };
}
