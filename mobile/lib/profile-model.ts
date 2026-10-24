import type { LanguageCode } from "../types/contracts";
export type OnboardingDraft = {
  handle: string;
  language: LanguageCode;
  interestIds: string[];
  displayName?: string;
  bio?: string;
  avatarPath?: string | null;
};
// Old P1 drafts are accepted; corrupt or incompatible drafts stay on disk and
// block a new save until the user can recover them, never silently reset.
export function parseProfileDraft(raw: string): OnboardingDraft {
  const d: unknown = JSON.parse(raw);
  if (!d || typeof d !== "object")
    throw new Error(
      "Saved profile draft is unreadable. It has been kept on this device.",
    );
  const p = d as Record<string, unknown>;
  if (
    typeof p.handle !== "string" ||
    !["en", "hi", "ml"].includes(String(p.language)) ||
    !Array.isArray(p.interestIds) ||
    !p.interestIds.every((id) => typeof id === "string") ||
    (p.displayName !== undefined && typeof p.displayName !== "string") ||
    (p.bio !== undefined && typeof p.bio !== "string") ||
    (p.avatarPath !== undefined &&
      p.avatarPath !== null &&
      typeof p.avatarPath !== "string")
  )
    throw new Error(
      "Saved profile draft is unreadable. It has been kept on this device.",
    );
  return d as OnboardingDraft;
}
export type ReviewDecision = {
  id: string;
  request_id: string;
  action: string;
  reason: string;
};
export function parseReviewDraft(raw: string): ReviewDecision {
  const d = JSON.parse(raw) as Record<string, unknown> | null;
  if (
    !d ||
    typeof d.id !== "string" ||
    typeof d.request_id !== "string" ||
    typeof d.reason !== "string" ||
    !["reviewed", "dismissed", "hide", "restore"].includes(String(d.action))
  )
    throw new Error(
      "Saved review request is unreadable. It has been kept for recovery.",
    );
  return d as ReviewDecision;
}

export type PublicationDecision = {
  entity_id: string;
  entity_type: 'post' | 'reply';
  request_id: string;
  action: 'approve' | 'reject';
  reason: string;
  source_hash: string;
  expected_state: 'pending' | 'flagged' | 'blocked';
};
const uuid = (value: unknown) => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function parsePublicationDraft(raw: string): PublicationDecision {
  const d = JSON.parse(raw) as Record<string, unknown> | null;
  if (!d || !uuid(d.entity_id) || !uuid(d.request_id) ||
      !['post', 'reply'].includes(String(d.entity_type)) ||
      !['approve', 'reject'].includes(String(d.action)) ||
      !['pending', 'flagged', 'blocked'].includes(String(d.expected_state)) ||
      typeof d.reason !== 'string' || !d.reason.trim() || Array.from(d.reason).length > 500 ||
      typeof d.source_hash !== 'string' || !/^[a-f0-9]{64}$/.test(d.source_hash) ||
      Object.keys(d).some(key => !['entity_id', 'entity_type', 'request_id', 'action', 'reason', 'source_hash', 'expected_state'].includes(key))) {
    throw new Error('Saved publication decision is unreadable. It has been kept for recovery.');
  }
  return d as PublicationDecision;
}

export function confirmPublicationDecision(value: unknown, decision: PublicationDecision) {
  const result = value as { id?: unknown; status?: unknown } | null;
  if (!result || !uuid(result.id) || result.status !== (decision.action === 'approve' ? 'allowed' : 'blocked'))
    throw new Error('Publication decision was not confirmed. Retry the exact saved decision.');
}
