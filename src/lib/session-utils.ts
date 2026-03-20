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
const UNLOCKED_SESSIONS_KEY = 'sittning_unlocked_sessions';

// Token expiry: 7 days
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenEntry {
  token: string;
  expiresAt: number;
}

interface EditTokenStore {
  [sessionId: string]: TokenEntry | string; // string for legacy format migration
}

function isTokenEntry(value: TokenEntry | string): value is TokenEntry {
  return typeof value === 'object' && value !== null && 'token' in value && 'expiresAt' in value;
}

export function saveEditToken(sessionId: string, token: string): void {
  const stored = localStorage.getItem(EDIT_TOKENS_KEY);
  const tokens: EditTokenStore = stored ? JSON.parse(stored) : {};
  tokens[sessionId] = {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  localStorage.setItem(EDIT_TOKENS_KEY, JSON.stringify(tokens));
  
  // Also save to my sessions list and mark as unlocked
  addToMySessions(sessionId);
  unlockSession(sessionId);
}

export function getEditToken(sessionId: string): string | null {
  const stored = localStorage.getItem(EDIT_TOKENS_KEY);
  if (!stored) return null;
  const tokens: EditTokenStore = JSON.parse(stored);
  const entry = tokens[sessionId];
  if (!entry) return null;

  // Migrate legacy plain-string tokens (give them a fresh TTL)
  if (typeof entry === 'string') {
    saveEditToken(sessionId, entry);
    return entry;
  }

  if (isTokenEntry(entry)) {
    if (Date.now() > entry.expiresAt) {
      // Token expired — remove it
      delete tokens[sessionId];
      localStorage.setItem(EDIT_TOKENS_KEY, JSON.stringify(tokens));
      return null;
    }
    return entry.token;
  }

  return null;
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

// PIN unlock tracking - once unlocked, user never needs to enter PIN again
export function unlockSession(sessionId: string): void {
  const unlocked = getUnlockedSessions();
  if (!unlocked.includes(sessionId)) {
    unlocked.push(sessionId);
    localStorage.setItem(UNLOCKED_SESSIONS_KEY, JSON.stringify(unlocked));
  }
}

export function getUnlockedSessions(): string[] {
  const stored = localStorage.getItem(UNLOCKED_SESSIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function isSessionUnlocked(sessionId: string): boolean {
  const unlocked = getUnlockedSessions();
  return unlocked.includes(sessionId);
}
