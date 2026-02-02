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

interface EditTokenStore {
  [sessionId: string]: string;
}

export function saveEditToken(sessionId: string, token: string): void {
  const stored = localStorage.getItem(EDIT_TOKENS_KEY);
  const tokens: EditTokenStore = stored ? JSON.parse(stored) : {};
  tokens[sessionId] = token;
  localStorage.setItem(EDIT_TOKENS_KEY, JSON.stringify(tokens));
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
