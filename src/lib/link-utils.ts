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
export function openLinkInNewTab(url: string) {
  const target = normalizeLink(url);
  if (!target) return;
  const win = window.open(target, '_blank', 'noopener,noreferrer');
  if (!win) {
    // Popup blocked (e.g. sandboxed iframe) - fall back to top-level navigation
    try {
      (window.top ?? window).location.href = target;
    } catch {
      window.location.href = target;
    }
  }
}
