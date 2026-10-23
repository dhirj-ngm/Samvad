import type { DiscoveryRow, FeedCursor, LanguageCode } from '../types/contracts';

export type PostDraft = { requestId: string; body: string; language: LanguageCode; attempted: boolean };
export const postDraftKey = (userId: string) => `samvad-post-draft:${userId}`;
export const codePointLength = (text: string) => Array.from(text).length;
export function validPost(text: string) {
  return text.trim().length > 0 && codePointLength(text) <= 2000;
}
export function parseDraft(value: string | null): PostDraft | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const draft = parsed as Record<string, unknown>;
    if (typeof draft.body !== 'string' || typeof draft.attempted !== 'boolean' ||
        !['en', 'hi', 'ml'].includes(String(draft.language)) ||
        typeof draft.requestId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.requestId)) return null;
    return draft as PostDraft;
  } catch { return null; }
}
export function feedCursor(row: DiscoveryRow): FeedCursor {
  return { matched: row.interest_match, at: row.sort_at, id: row.id, kind: row.kind };
}
export function appendFeed(previous: DiscoveryRow[], incoming: DiscoveryRow[]) {
  const seen = new Set(previous.map(row => `${row.kind}:${row.id}`));
  return [...previous, ...incoming.filter(row => {
    const key = `${row.kind}:${row.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  })];
}
