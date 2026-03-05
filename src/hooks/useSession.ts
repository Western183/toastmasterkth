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
  const [realtimeRetry, setRealtimeRetry] = useState(0);
  
  // Track pending optimistic updates - VERY short expiry for done status
  const pendingUpdatesRef = useRef<Map<string, { timestamp: number; field: string }>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  
  // Check if an update is still pending (500ms expiry for done, 2s for others)
  const isPending = useCallback((itemId: string, field?: string) => {
    const pending = pendingUpdatesRef.current.get(itemId);
    if (!pending) return false;
    
    // Very short expiry for done status (500ms), longer for other fields
    const expiryMs = pending.field === 'done' ? 500 : 2000;
    if (Date.now() - pending.timestamp > expiryMs) {
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

  // Mark an item as pending update
  const markPending = useCallback((itemId: string, field: string = 'other') => {
    pendingUpdatesRef.current.set(itemId, { timestamp: Date.now(), field });
  }, []);

  // Clear pending status for an item
  const clearPending = useCallback((itemId: string) => {
    pendingUpdatesRef.current.delete(itemId);
  }, []);

  // Broadcast done status change to other clients immediately
  const broadcastDoneChange = useCallback((itemId: string, done: boolean) => {
    const ch = channelRef.current;
    if (!ch) return;
    // With ack:true on the channel config, this rejects when not subscribed.
    void ch.send({
      type: 'broadcast',
      event: 'done_changed',
      payload: { itemId, done, timestamp: Date.now() },
    });
  }, []);

  // Update a single tempo item optimistically
  const optimisticUpdate = useCallback((itemId: string, updates: Partial<TempoItem>) => {
    const field = 'done' in updates ? 'done' : 'other';
    markPending(itemId, field);
    
    // If updating done status, broadcast immediately to other clients
    if ('done' in updates) {
      broadcastDoneChange(itemId, updates.done!);
    }
    
    setTempoItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      return normalizeOrder(updated);
    });
  }, [markPending, broadcastDoneChange]);

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
    markPending(itemId, 'delete');
    setTempoItems((prev) => normalizeOrder(prev.filter((item) => item.id !== itemId)));
  }, [markPending]);

  // Optimistic add
  const optimisticAdd = useCallback((newItem: TempoItem) => {
    markPending(newItem.id, 'add');
    setTempoItems((prev) => normalizeOrder([...prev, newItem]));
  }, [markPending]);

  // Optimistic reorder - update multiple items
  const optimisticReorder = useCallback((reorderedItems: TempoItem[]) => {
    // Mark all as pending
    reorderedItems.forEach((item) => markPending(item.id, 'order'));
    setTempoItems(normalizeOrder(reorderedItems));
  }, [markPending]);

  // Clear all pending on successful sync
  const confirmSync = useCallback((itemIds: string[]) => {
    itemIds.forEach(clearPending);
    setLastSyncTime(new Date());
  }, [clearPending]);

  // Set up broadcast channel for instant done-status sync + polling for other changes
  // NOTE: postgres_changes removed to prevent unauthorized realtime data exposure.
  // Data syncs via polling through secure RPCs instead.
  useEffect(() => {
    if (!sessionId) return;

    // Clean up existing channels first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setIsSyncing(true);

    // Broadcast-only channel for instant done-status sync between clients.
    // Using ack:true makes send() reject when not SUBSCRIBED (avoids silent drops).
    const channel = supabase
      .channel(`tempo-${sessionId}`, {
        config: {
          broadcast: { self: false, ack: true },
        },
      })
      .on('broadcast', { event: 'done_changed' }, (payload) => {
        const { itemId, done } = payload.payload as { itemId: string; done: boolean; timestamp: number };

        // Skip if item is being updated locally
        if (isPending(itemId)) return;

        setTempoItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, done } : item)));
        setLastSyncTime(new Date());
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSyncing(false);
          setLastSyncTime(new Date());
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsSyncing(true);
          if (!retryTimerRef.current) {
            retryTimerRef.current = window.setTimeout(() => {
              retryTimerRef.current = null;
              fetchData();
              setRealtimeRetry((n) => n + 1);
            }, 1000);
          }
        }
      });

    channelRef.current = channel;

    // Poll for data changes via secure RPCs every 5 seconds
    const pollInterval = window.setInterval(() => {
      fetchData();
    }, 5000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      window.clearInterval(pollInterval);
    };
  }, [sessionId, fetchData, isPending, realtimeRetry]);

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
