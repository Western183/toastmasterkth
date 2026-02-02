// Types for the Sittningsschema app

export interface Session {
  id: string;
  name: string;
  share_code: string;
  edit_token: string;
  created_at: string;
}

export interface Person {
  id: string;
  session_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TempoItem {
  id: string;
  session_id: string;
  order_index: number;
  title: string;
  page: string | null;
  note: string | null;
  video_count: number | null;
  person_id: string | null;
  done: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionWithData extends Session {
  people: Person[];
  tempo_items: TempoItem[];
}

// Available person colors
export const PERSON_COLORS = [
  { id: '1', name: 'Blå', class: 'person-color-1', border: 'person-border-1', hsl: 'hsl(215, 70%, 50%)' },
  { id: '2', name: 'Rosa', class: 'person-color-2', border: 'person-border-2', hsl: 'hsl(340, 75%, 55%)' },
  { id: '3', name: 'Grön', class: 'person-color-3', border: 'person-border-3', hsl: 'hsl(152, 60%, 45%)' },
  { id: '4', name: 'Amber', class: 'person-color-4', border: 'person-border-4', hsl: 'hsl(38, 85%, 55%)' },
  { id: '5', name: 'Lila', class: 'person-color-5', border: 'person-border-5', hsl: 'hsl(280, 65%, 55%)' },
  { id: '6', name: 'Cyan', class: 'person-color-6', border: 'person-border-6', hsl: 'hsl(180, 60%, 45%)' },
  { id: '7', name: 'Orange', class: 'person-color-7', border: 'person-border-7', hsl: 'hsl(25, 80%, 55%)' },
  { id: '8', name: 'Magenta', class: 'person-color-8', border: 'person-border-8', hsl: 'hsl(320, 60%, 55%)' },
] as const;

export type PersonColorId = typeof PERSON_COLORS[number]['id'];

export function getPersonColor(colorId: string) {
  return PERSON_COLORS.find(c => c.id === colorId) || PERSON_COLORS[0];
}
