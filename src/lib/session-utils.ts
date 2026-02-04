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
const SESSION_PINS_KEY = 'sittning_session_pins';

interface EditTokenStore {
  [sessionId: string]: string;
}

export function saveEditToken(sessionId: string, token: string, pin?: string): void {
  const stored = localStorage.getItem(EDIT_TOKENS_KEY);
  const tokens: EditTokenStore = stored ? JSON.parse(stored) : {};
  tokens[sessionId] = token;
  localStorage.setItem(EDIT_TOKENS_KEY, JSON.stringify(tokens));
  
  // Also save to my sessions list and mark as unlocked
  addToMySessions(sessionId);
  unlockSession(sessionId);
  
  // Save PIN if provided
  if (pin) {
    saveSessionPin(sessionId, pin);
  }
}

// PIN storage functions
interface PinStore {
  [sessionId: string]: string;
}

export function saveSessionPin(sessionId: string, pin: string): void {
  const stored = localStorage.getItem(SESSION_PINS_KEY);
  const pins: PinStore = stored ? JSON.parse(stored) : {};
  pins[sessionId] = pin;
  localStorage.setItem(SESSION_PINS_KEY, JSON.stringify(pins));
}

export function getSessionPin(sessionId: string): string | null {
  const stored = localStorage.getItem(SESSION_PINS_KEY);
  if (!stored) return null;
  const pins: PinStore = JSON.parse(stored);
  return pins[sessionId] || null;
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
