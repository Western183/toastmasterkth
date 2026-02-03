import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TempoItem, Person } from '@/types/session';
import { getPeopleBySessionId, getTempoItemsBySessionId } from '@/lib/secure-api';
import { PublicSession } from '@/lib/secure-api';

// Session info we can retrieve without exposing sensitive data
export interface SessionInfo extends PublicSession {
  has_pin?: boolean;
}

// Sort and normalize order_index to always be 1..N
function normalizeOrder(items: TempoItem[]): TempoItem[] {
  return [...items]
    .sort((a, b) => a.order_index - b.order_index)
    .map((item, index) => ({ ...item, order_index: index + 1 }));
}

export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [tempoItems, setTempoItems] = useState<TempoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Track pending optimistic updates to avoid reverting them on realtime events
  const pendingUpdatesRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      setTempoItems(normalizeOrder(tempoData));
      setLastSyncTime(new Date());
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

  // Optimistic update helper - marks an item as pending
  const markPending = useCallback((itemId: string) => {
    pendingUpdatesRef.current.add(itemId);
    // Auto-clear after 5 seconds (safety net)
    setTimeout(() => {
      pendingUpdatesRef.current.delete(itemId);
    }, 5000);
  }, []);

  // Clear pending status for an item
  const clearPending = useCallback((itemId: string) => {
    pendingUpdatesRef.current.delete(itemId);
  }, []);

  // Update a single tempo item optimistically
  const optimisticUpdate = useCallback((itemId: string, updates: Partial<TempoItem>) => {
    markPending(itemId);
    setTempoItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      return normalizeOrder(updated);
    });
  }, [markPending]);

  // Revert optimistic update on error
  const revertUpdate = useCallback((itemId: string, original: TempoItem) => {
    clearPending(itemId);
    setTempoItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? original : item
      );
      return normalizeOrder(updated);
    });
  }, [clearPending]);

  // Optimistic delete
  const optimisticDelete = useCallback((itemId: string) => {
    markPending(itemId);
    setTempoItems((prev) => normalizeOrder(prev.filter((item) => item.id !== itemId)));
  }, [markPending]);

  // Optimistic add
  const optimisticAdd = useCallback((newItem: TempoItem) => {
    markPending(newItem.id);
    setTempoItems((prev) => normalizeOrder([...prev, newItem]));
  }, [markPending]);

  // Optimistic reorder - update multiple items
  const optimisticReorder = useCallback((reorderedItems: TempoItem[]) => {
    // Mark all as pending
    reorderedItems.forEach((item) => markPending(item.id));
    setTempoItems(normalizeOrder(reorderedItems));
  }, [markPending]);

  // Clear all pending on successful sync
  const confirmSync = useCallback((itemIds: string[]) => {
    itemIds.forEach(clearPending);
    setLastSyncTime(new Date());
  }, [clearPending]);

  // Set up realtime subscription with robust handling
  useEffect(() => {
    if (!sessionId) return;

    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`session-realtime-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tempo_items',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // Skip if this is a pending optimistic update
          const itemId = (payload.new as TempoItem)?.id || (payload.old as { id?: string })?.id;
          if (itemId && pendingUpdatesRef.current.has(itemId)) {
            // Clear the pending flag since we received confirmation
            pendingUpdatesRef.current.delete(itemId);
            return;
          }

          if (payload.eventType === 'INSERT') {
            setTempoItems((prev) => {
              // Avoid duplicates
              if (prev.some((item) => item.id === (payload.new as TempoItem).id)) {
                return prev;
              }
              return normalizeOrder([...prev, payload.new as TempoItem]);
            });
          } else if (payload.eventType === 'UPDATE') {
            setTempoItems((prev) =>
              normalizeOrder(
                prev.map((item) =>
                  item.id === (payload.new as TempoItem).id
                    ? (payload.new as TempoItem)
                    : item
                )
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTempoItems((prev) =>
              normalizeOrder(prev.filter((item) => item.id !== (payload.old as { id: string }).id))
            );
          }
          setLastSyncTime(new Date());
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
            setPeople((prev) => {
              if (prev.some((p) => p.id === (payload.new as Person).id)) {
                return prev;
              }
              return [...prev, payload.new as Person];
            });
          } else if (payload.eventType === 'UPDATE') {
            setPeople((prev) =>
              prev.map((p) => (p.id === (payload.new as Person).id ? (payload.new as Person) : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPeople((prev) => prev.filter((p) => p.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSyncing(false);
        } else if (status === 'CHANNEL_ERROR') {
          setIsSyncing(true);
          // Try to reconnect after a delay
          setTimeout(() => {
            fetchData();
          }, 2000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, fetchData]);

  return {
    session,
    people,
    tempoItems,
    loading,
    error,
    isSyncing,
    lastSyncTime,
    refetch: fetchData,
    // Optimistic update helpers
    optimisticUpdate,
    revertUpdate,
    optimisticDelete,
    optimisticAdd,
    optimisticReorder,
    confirmSync,
  };
}
