// Helpers for song / video links.
// Rule: never reject query parameters (?si=..., &utm_source=copy-link).
// We only clean up obviously broken input (missing protocol, spotify: URIs, stray whitespace).

const SPOTIFY_URI = /^spotify:track:([a-zA-Z0-9]+)$/;

export function normalizeLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().replace(/\s+/g, '');
  if (!value) return null;

  const uri = value.match(SPOTIFY_URI);
  if (uri) return `https://open.spotify.com/track/${uri[1]}`;

  // Bare domain pasted without protocol -> make it a real absolute URL
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value.replace(/^\/+/, '')}`;
  }

  return value;
}

/** Open a link in a new tab, working also inside the Lovable preview iframe. */
export const LINK_ERROR = 'Ange en giltig webblänk som börjar med https://';

/** Empty is always OK (fields are optional). Otherwise it must normalize to a valid http(s) URL. */
export function isValidWebLink(raw: string | null | undefined): boolean {
  if (!raw || !raw.trim()) return true;
  const normalized = normalizeLink(raw);
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}
