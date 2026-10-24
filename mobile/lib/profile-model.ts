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
