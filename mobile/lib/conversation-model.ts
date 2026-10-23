import { parseDraft, type PostDraft } from './post-model.ts';
import type { Reply, ReportReason } from '../types/contracts';

export const reportReasons: ReportReason[] = ['threat','harassment','hate','doxxing','impersonation','scam','spam','other'];
export type ConversationDraft = PostDraft & { reason: ReportReason };
export type ReportTarget = { type: 'post' | 'reply' | 'profile' | 'news'; id: string };
export const replyDraftKey = (actor: string, conversation: string, parent: string | null) =>
  `samvad-reply-draft:${actor}:${conversation}:${parent ?? 'root'}`;
export const reportDraftKey = (actor: string, target: ReportTarget) => `samvad-report-draft:${actor}:${target.type}:${target.id}`;
export function parseConversationDraft(raw: string | null): ConversationDraft | null {
  const draft = parseDraft(raw);
  if (!draft || !raw) return null;
  const reason = JSON.parse(raw).reason;
  return reportReasons.includes(reason) ? { ...draft, reason } : null;
}
export function appendReplies(previous: Reply[], incoming: Reply[]) {
  const merged = new Map(previous.map(row => [row.id,row]));
  for (const row of incoming) merged.set(row.id,row);
  return [...merged.values()];
}
export const replyCursor = (row: Reply) => ({ at: row.created_at, id: row.id });
