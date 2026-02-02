import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TempoItem, Person, Session } from '@/types/session';
import { getSessionById, getPeopleBySessionId, getTempoItemsBySessionId } from '@/lib/api';

export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [tempoItems, setTempoItems] = useState<TempoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [sessionData, peopleData, tempoData] = await Promise.all([
        getSessionById(sessionId),
        getPeopleBySessionId(sessionId),
        getTempoItemsBySessionId(sessionId),
      ]);

      setSession(sessionData);
      setPeople(peopleData);
      setTempoItems(tempoData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tempo_items',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTempoItems((prev) => [...prev, payload.new as TempoItem].sort((a, b) => a.order_index - b.order_index));
          } else if (payload.eventType === 'UPDATE') {
            setTempoItems((prev) =>
              prev
                .map((item) => (item.id === payload.new.id ? (payload.new as TempoItem) : item))
                .sort((a, b) => a.order_index - b.order_index)
            );
          } else if (payload.eventType === 'DELETE') {
            setTempoItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'people',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPeople((prev) => [...prev, payload.new as Person]);
          } else if (payload.eventType === 'UPDATE') {
            setPeople((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Person) : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPeople((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return {
    session,
    people,
    tempoItems,
    loading,
    error,
    refetch: fetchData,
  };
}
