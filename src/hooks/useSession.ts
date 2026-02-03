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
  
  // Track pending optimistic updates with timestamps for auto-expiry
  const pendingUpdatesRef = useRef<Map<string, number>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Check if an update is still pending (with 2 second expiry)
  const isPending = useCallback((itemId: string) => {
    const timestamp = pendingUpdatesRef.current.get(itemId);
    if (!timestamp) return false;
    // Expire pending status after 2 seconds
    if (Date.now() - timestamp > 2000) {
      pendingUpdatesRef.current.delete(itemId);
      return false;
    }
    return true;
  }, []);

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

  // Mark an item as pending update (will expire after 2s)
  const markPending = useCallback((itemId: string) => {
    pendingUpdatesRef.current.set(itemId, Date.now());
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

  // Set up realtime subscription - SIMPLIFIED AND ROBUST
  useEffect(() => {
    if (!sessionId) return;

    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`tempo-sync-${sessionId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tempo_items',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newItem = payload.new as TempoItem;
          const oldItem = payload.old as { id?: string };
          const itemId = newItem?.id || oldItem?.id;
          
          // Skip if this is a pending optimistic update from THIS device
          if (itemId && isPending(itemId)) {
            // Clear pending since DB confirmed the change
            clearPending(itemId);
            return;
          }

          // Handle different event types
          if (payload.eventType === 'INSERT') {
            setTempoItems((prev) => {
              // Avoid duplicates
              if (prev.some((item) => item.id === newItem.id)) {
                return prev;
              }
              return normalizeOrder([...prev, newItem]);
            });
          } else if (payload.eventType === 'UPDATE') {
            setTempoItems((prev) =>
              normalizeOrder(
                prev.map((item) =>
                  item.id === newItem.id ? newItem : item
                )
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTempoItems((prev) =>
              normalizeOrder(prev.filter((item) => item.id !== oldItem.id))
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
          const newPerson = payload.new as Person;
          const oldPerson = payload.old as { id?: string };
          
          if (payload.eventType === 'INSERT') {
            setPeople((prev) => {
              if (prev.some((p) => p.id === newPerson.id)) {
                return prev;
              }
              return [...prev, newPerson];
            });
          } else if (payload.eventType === 'UPDATE') {
            setPeople((prev) =>
              prev.map((p) => (p.id === newPerson.id ? newPerson : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPeople((prev) => prev.filter((p) => p.id !== oldPerson.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSyncing(false);
          console.log('[Realtime] Connected to session:', sessionId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsSyncing(true);
          console.warn('[Realtime] Connection issue, reconnecting...');
          // Reconnect after delay
          setTimeout(() => {
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            // Re-fetch to get latest state
            fetchData();
          }, 2000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Cleaning up channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, fetchData, isPending, clearPending]);

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
