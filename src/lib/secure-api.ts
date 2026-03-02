import { supabase } from '@/integrations/supabase/client';
import { Session, Person, TempoItem } from '@/types/session';
import { generateShareCode, generateEditToken, saveEditToken, saveSessionPin } from '@/lib/session-utils';

// Types for public session (without sensitive fields)
export interface PublicSession {
  id: string;
  name: string;
  share_code: string;
  created_at: string;
  has_pin?: boolean;
}

// =====================================================
// SESSION FUNCTIONS (Using secure RPCs)
// =====================================================

export async function getAllSessionsPublic(): Promise<PublicSession[]> {
  const { data, error } = await supabase.rpc('get_all_sessions_public');

  if (error) throw error;

  return (data || []) as PublicSession[];
}

export async function getSessionByShareCode(shareCode: string): Promise<PublicSession | null> {
  const { data, error } = await supabase.rpc('get_session_by_share_code', {
    p_share_code: shareCode.toUpperCase(),
  });

  if (error) throw error;

  if (!data || data.length === 0) return null;
  return data[0] as PublicSession;
}

export async function verifySessionPin(
  sessionId: string,
  pinCode: string
): Promise<{ valid: boolean; session?: PublicSession; editToken?: string }> {
  const { data, error } = await supabase.rpc('verify_session_pin_with_token', {
    p_session_id: sessionId,
    p_pin_code: pinCode,
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    return { valid: false };
  }

  const result = data[0];
  return {
    valid: result.pin_is_valid,
    session: result.pin_is_valid
      ? {
          id: result.id,
          name: result.name,
          share_code: result.share_code,
          created_at: result.created_at,
        }
      : undefined,
    editToken: result.edit_token || undefined,
  };
}

export async function verifyEditToken(sessionId: string, editToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_edit_token', {
    p_session_id: sessionId,
    p_edit_token: editToken,
  });

  if (error) throw error;

  return data === true;
}

// getSessionEditToken was removed for security - tokens are now only
// returned via verify_session_pin_with_token after PIN verification

export async function createSession(
  name: string,
  people: { name: string; color: string }[],
  pinCode: string
): Promise<Session> {
  const shareCode = generateShareCode();
  const editToken = generateEditToken();

  // Create session via secure RPC function
  const { data: sessionId, error } = await supabase.rpc('create_session_with_token', {
    p_name: name,
    p_share_code: shareCode,
    p_edit_token: editToken,
    p_pin_code: pinCode,
  });

  if (error) throw error;
  if (!sessionId) throw new Error('Failed to create session');

  // Build the session object
  const session: Session = {
    id: sessionId,
    name,
    share_code: shareCode,
    edit_token: editToken,
    pin_code: pinCode,
    created_at: new Date().toISOString(),
  };

  // Insert people using RPC
  if (people.length > 0) {
    for (const p of people) {
      const { error: personError } = await supabase.rpc('add_person_with_token', {
        p_session_id: session.id,
        p_edit_token: editToken,
        p_name: p.name,
        p_color: p.color,
      });

      if (personError) throw personError;
    }
  }

  // Create default tempo items using RPC — no person pre-assigned (20 items)
  const defaultTempos = [
    { order_index: 1, title: 'Porthos visa', page: '52', note: 'Välkomna', person_id: null },
    { order_index: 2, title: 'Theodor', page: '76', note: 'Presentera förätt + spec', person_id: null },
    { order_index: 3, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 4, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 5, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 6, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 7, title: 'Sång', page: null, note: 'Presentera Huvudrätt + Spec', person_id: null },
    { order_index: 8, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 9, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 10, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 11, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 12, title: 'Sång', page: null, note: 'Efterätt + spec', person_id: null },
    { order_index: 13, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 14, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 15, title: 'Punchen kommer', page: '80', note: null, person_id: null },
    { order_index: 16, title: 'Punschsång', page: null, note: null, person_id: null },
    { order_index: 17, title: 'Sista punschen', page: '88', note: null, person_id: null },
    { order_index: 18, title: 'En liten blå förgätmigej', page: '90', note: 'Tacka personalen', person_id: null },
    { order_index: 19, title: 'Sång', page: null, note: null, person_id: null },
    { order_index: 20, title: 'Sång', page: null, note: null, person_id: null },
  ];

  for (const t of defaultTempos) {
    const { error: tempoError } = await supabase.rpc('create_tempo_item_with_token', {
      p_session_id: session.id,
      p_edit_token: editToken,
      p_order_index: t.order_index,
      p_title: t.title,
      p_page: t.page,
      p_note: t.note,
      p_person_id: t.person_id,
    });

    if (tempoError) throw tempoError;
  }

  // Save edit token and PIN locally (this also adds to my sessions)
  saveEditToken(session.id, editToken, pinCode);
  saveSessionPin(session.id, pinCode);

  return session as Session;
}

export async function deleteSessionWithToken(sessionId: string, editToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_session_with_token', {
    p_session_id: sessionId,
    p_edit_token: editToken,
  });

  if (error) throw error;

  return data === true;
}

// =====================================================
// TEMPO ITEM FUNCTIONS (Using secure RPCs)
// =====================================================

export async function getTempoItemsBySessionId(sessionId: string): Promise<TempoItem[]> {
  // Use secure RPC function to read tempo items
  const { data, error } = await supabase.rpc('get_tempo_items_for_session', {
    p_session_id: sessionId,
  });

  if (error) throw error;

  return (data || []) as TempoItem[];
}

export async function updateTempoDone(itemId: string, done: boolean, editToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_tempo_done', {
    p_item_id: itemId,
    p_done: done,
    p_edit_token: editToken,
  });

  if (error) throw error;

  return data === true;
}

export async function createTempoItemWithToken(
  sessionId: string,
  editToken: string,
  item: Omit<TempoItem, 'id' | 'session_id' | 'created_at' | 'updated_at'>
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_tempo_item_with_token', {
    p_session_id: sessionId,
    p_edit_token: editToken,
    p_order_index: item.order_index,
    p_title: item.title,
    p_page: item.page,
    p_note: item.note,
    p_video_count: item.video_count,
    p_live_count: item.live_count,
    p_person_id: item.person_id,
  });

  if (error) throw error;

  return data as string | null;
}

// Sentinel values to signal "clear to NULL" in the SQL function
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export async function updateTempoItemWithToken(
  itemId: string,
  editToken: string,
  updates: Partial<Omit<TempoItem, 'id' | 'session_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  // Convert null values to sentinels so the SQL function knows to clear them
  const p_page = 'page' in updates ? (updates.page === null ? '' : updates.page) : null;
  const p_note = 'note' in updates ? (updates.note === null ? '' : updates.note) : null;
  const p_video_count = 'video_count' in updates ? (updates.video_count === null ? -1 : updates.video_count) : null;
  const p_live_count = 'live_count' in updates ? (updates.live_count === null ? -1 : updates.live_count) : null;
  const p_person_id = 'person_id' in updates ? (updates.person_id === null ? NIL_UUID : updates.person_id) : null;

  const { data, error } = await supabase.rpc('update_tempo_item_with_token', {
    p_item_id: itemId,
    p_edit_token: editToken,
    p_title: updates.title ?? null,
    p_page: p_page,
    p_note: p_note,
    p_video_count: p_video_count,
    p_live_count: p_live_count,
    p_person_id: p_person_id,
    p_order_index: updates.order_index ?? null,
    p_done: updates.done ?? null,
  });

  if (error) throw error;

  return data === true;
}

export async function deleteTempoItemWithToken(itemId: string, editToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_tempo_item_with_token', {
    p_item_id: itemId,
    p_edit_token: editToken,
  });

  if (error) throw error;

  return data === true;
}

export async function updateTempoOrderWithToken(
  sessionId: string,
  editToken: string,
  items: { id: string; order_index: number }[]
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_tempo_order_with_token', {
    p_session_id: sessionId,
    p_edit_token: editToken,
    p_items: items,
  });

  if (error) throw error;

  return data === true;
}

// =====================================================
// PEOPLE FUNCTIONS (Using secure RPCs)
// =====================================================

export async function getPeopleBySessionId(sessionId: string): Promise<Person[]> {
  // Use secure RPC function to read people
  const { data, error } = await supabase.rpc('get_people_for_session', {
    p_session_id: sessionId,
  });

  if (error) throw error;

  return (data || []) as Person[];
}

export async function addPersonWithToken(
  sessionId: string,
  editToken: string,
  name: string,
  color: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('add_person_with_token', {
    p_session_id: sessionId,
    p_edit_token: editToken,
    p_name: name,
    p_color: color,
  });

  if (error) throw error;

  return data as string | null;
}

export async function deletePersonWithToken(personId: string, editToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_person_with_token', {
    p_person_id: personId,
    p_edit_token: editToken,
  });

  if (error) throw error;

  return data === true;
}
