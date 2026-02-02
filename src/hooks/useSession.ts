import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TempoItem, Person } from '@/types/session';
import { getPeopleBySessionId, getTempoItemsBySessionId } from '@/lib/secure-api';
import { PublicSession } from '@/lib/secure-api';

// Session info we can retrieve without exposing sensitive data
export interface SessionInfo extends PublicSession {
  has_pin?: boolean;
}

export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<SessionInfo | null>(null);
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
      
      // Get session info via RPC (doesn't expose sensitive fields)
      const { data: sessionData, error: sessionError } = await supabase.rpc('verify_session_pin', {
        p_session_id: sessionId,
        p_pin_code: '', // Empty PIN just to get session info
      });

      if (sessionError) throw sessionError;

      if (sessionData && sessionData.length > 0) {
        const s = sessionData[0];
        setSession({
          id: s.id,
          name: s.name,
          share_code: s.share_code,
          created_at: s.created_at,
        });
      } else {
        setSession(null);
      }

      // Get people and tempo items (read is allowed)
      const [peopleData, tempoData] = await Promise.all([
        getPeopleBySessionId(sessionId),
        getTempoItemsBySessionId(sessionId),
      ]);

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
