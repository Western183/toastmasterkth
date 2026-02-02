import { supabase } from '@/integrations/supabase/client';
import { Session, Person, TempoItem } from '@/types/session';
import { generateShareCode, generateEditToken, saveEditToken } from '@/lib/session-utils';

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

export async function getSessionEditToken(sessionId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_session_edit_token', {
    p_session_id: sessionId,
  });

  if (error) throw error;

  return data as string | null;
}

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

  let firstPersonId: string | null = null;

  // Insert people using RPC
  if (people.length > 0) {
    for (const p of people) {
      const { data: personId, error: personError } = await supabase.rpc('add_person_with_token', {
        p_session_id: session.id,
        p_edit_token: editToken,
        p_name: p.name,
        p_color: p.color,
      });

      if (personError) throw personError;

      if (!firstPersonId && personId) {
        firstPersonId = personId;
      }
    }
  }

  // Create default tempo items using RPC
  const defaultTempos = [
    { order_index: 1, title: 'Porthos visa', page: '52', note: 'Välkomna', person_id: firstPersonId },
    { order_index: 2, title: 'Theodor', page: '76', note: 'Presentera förätt + spec', person_id: firstPersonId },
    { order_index: 3, title: 'En liten blå förgätmigej', page: '90', note: 'Tacka personalen', person_id: firstPersonId },
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

  // Save edit token locally (this also adds to my sessions)
  saveEditToken(session.id, editToken);

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

export async function updateTempoDone(itemId: string, done: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_tempo_done', {
    p_item_id: itemId,
    p_done: done,
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

export async function updateTempoItemWithToken(
  itemId: string,
  editToken: string,
  updates: Partial<Omit<TempoItem, 'id' | 'session_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_tempo_item_with_token', {
    p_item_id: itemId,
    p_edit_token: editToken,
    p_title: updates.title ?? null,
    p_page: updates.page ?? null,
    p_note: updates.note ?? null,
    p_video_count: updates.video_count ?? null,
    p_live_count: updates.live_count ?? null,
    p_person_id: updates.person_id ?? null,
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
