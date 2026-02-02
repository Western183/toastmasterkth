import { supabase } from '@/integrations/supabase/client';
import { Session, Person, TempoItem } from '@/types/session';
import { generateShareCode, generateEditToken, saveEditToken, addToMySessions } from '@/lib/session-utils';

export async function createSession(name: string, people: { name: string; color: string }[]): Promise<Session> {
  const shareCode = generateShareCode();
  const editToken = generateEditToken();

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      name,
      share_code: shareCode,
      edit_token: editToken,
    })
    .select()
    .single();

  if (error) throw error;

  let firstPersonId: string | null = null;

  // Insert people
  if (people.length > 0) {
    const { data: insertedPeople, error: peopleError } = await supabase
      .from('people')
      .insert(
        people.map((p) => ({
          session_id: session.id,
          name: p.name,
          color: p.color,
        }))
      )
      .select();

    if (peopleError) throw peopleError;
    
    // Get the first person's ID for default tempo assignment
    if (insertedPeople && insertedPeople.length > 0) {
      firstPersonId = insertedPeople[0].id;
    }
  }

  // Create default tempo items
  const defaultTempos = [
    { order_index: 0, title: 'Porthos visa', page: 's. 52', note: 'Välkomna', person_id: firstPersonId },
    { order_index: 1, title: 'Theodor', page: 's. 76', note: 'Presentera förätt + spec', person_id: firstPersonId },
    { order_index: 2, title: 'En liten blå förgätmigej', page: 's. 90', note: 'Tacka personalen', person_id: firstPersonId },
  ];

  const { error: tempoError } = await supabase
    .from('tempo_items')
    .insert(
      defaultTempos.map((t) => ({
        session_id: session.id,
        ...t,
      }))
    );

  if (tempoError) throw tempoError;

  // Save edit token locally (this also adds to my sessions)
  saveEditToken(session.id, editToken);

  return session as Session;
}

export async function getSessionsByIds(ids: string[]): Promise<Session[]> {
  if (ids.length === 0) return [];
  
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data as Session[];
}

export async function getAllSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data as Session[];
}

export async function getSessionByCode(code: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('share_code', code.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as Session;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Session;
}

export async function getPeopleBySessionId(sessionId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data as Person[];
}

export async function getTempoItemsBySessionId(sessionId: string): Promise<TempoItem[]> {
  const { data, error } = await supabase
    .from('tempo_items')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true });

  if (error) throw error;

  return data as TempoItem[];
}

export async function updateTempoItemDone(itemId: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('tempo_items')
    .update({ done })
    .eq('id', itemId);

  if (error) throw error;
}

export async function createTempoItem(
  sessionId: string,
  item: Omit<TempoItem, 'id' | 'session_id' | 'created_at' | 'updated_at'>
): Promise<TempoItem> {
  const { data, error } = await supabase
    .from('tempo_items')
    .insert({
      session_id: sessionId,
      ...item,
    })
    .select()
    .single();

  if (error) throw error;

  return data as TempoItem;
}

export async function updateTempoItem(
  itemId: string,
  updates: Partial<Omit<TempoItem, 'id' | 'session_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('tempo_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw error;
}

export async function deleteTempoItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('tempo_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function updateTempoItemsOrder(items: { id: string; order_index: number }[]): Promise<void> {
  // Update all items in parallel
  const updates = items.map((item) =>
    supabase
      .from('tempo_items')
      .update({ order_index: item.order_index })
      .eq('id', item.id)
  );

  const results = await Promise.all(updates);
  const error = results.find((r) => r.error)?.error;
  if (error) throw error;
}

export async function addPerson(sessionId: string, name: string, color: string): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .insert({
      session_id: sessionId,
      name,
      color,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Person;
}

export async function deletePerson(personId: string): Promise<void> {
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', personId);

  if (error) throw error;
}
