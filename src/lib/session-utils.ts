import { customAlphabet } from 'nanoid';

// Generate a short share code like "KTH-7F3A"
const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars like I, O
const generateCode = customAlphabet(alphabet, 4);

export function generateShareCode(): string {
  return `KTH-${generateCode()}`;
}

// Generate a longer edit token for security
const tokenAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateToken = customAlphabet(tokenAlphabet, 24);

export function generateEditToken(): string {
  return generateToken();
}

// Local storage keys
const EDIT_TOKENS_KEY = 'sittning_edit_tokens';
const MY_SESSIONS_KEY = 'sittning_my_sessions';

interface EditTokenStore {
  [sessionId: string]: string;
}

export function saveEditToken(sessionId: string, token: string): void {
  const stored = localStorage.getItem(EDIT_TOKENS_KEY);
  const tokens: EditTokenStore = stored ? JSON.parse(stored) : {};
  tokens[sessionId] = token;
  localStorage.setItem(EDIT_TOKENS_KEY, JSON.stringify(tokens));
  
  // Also save to my sessions list
  addToMySessions(sessionId);
}

export function getEditToken(sessionId: string): string | null {
  const stored = localStorage.getItem(EDIT_TOKENS_KEY);
  if (!stored) return null;
  const tokens: EditTokenStore = JSON.parse(stored);
  return tokens[sessionId] || null;
}

export function hasEditAccess(sessionId: string, actualToken: string): boolean {
  const storedToken = getEditToken(sessionId);
  return storedToken === actualToken;
}

// Track all sessions the user has access to (created or joined)
export function addToMySessions(sessionId: string): void {
  const sessions = getMySessions();
  if (!sessions.includes(sessionId)) {
    sessions.push(sessionId);
    localStorage.setItem(MY_SESSIONS_KEY, JSON.stringify(sessions));
  }
}

export function getMySessions(): string[] {
  const stored = localStorage.getItem(MY_SESSIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function removeFromMySessions(sessionId: string): void {
  const sessions = getMySessions().filter(id => id !== sessionId);
  localStorage.setItem(MY_SESSIONS_KEY, JSON.stringify(sessions));
}
