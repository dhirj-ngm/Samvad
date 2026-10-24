/** Planned client shapes from docs/contracts.md; P0 has no live data client. */
export type LanguageCode = "en" | "hi" | "ml";
export type UUID = string;
export type EntityType = "post" | "reply";
export type ModerationState = "pending" | "allowed" | "flagged" | "blocked";
export type Provenance = "live" | "cache" | "fixture" | "original";
export type ReportReason =
  | "threat"
  | "harassment"
  | "hate"
  | "doxxing"
  | "impersonation"
  | "scam"
  | "spam"
  | "other";

export interface PublicProfile {
  avatar_path?: string | null;
  user_id: UUID;
  handle: string;
  display_name: string | null;
  bio: string | null;
  preferred_language: LanguageCode;
}
export interface ProfileState {
  profile: PublicProfile;
  followers: number;
  following: number;
  is_following: boolean;
}
export interface InteractionState {
  id: string;
  likes: number;
  reposts: number;
  liked: boolean;
  reposted: boolean;
}
export interface SocialRow {
  item: FeedItem;
  at: string;
  id: string;
  reposter: PublicProfile | null;
}
export interface Mention {
  entity_id: string;
  handle: string;
  target_id: string;
}
export interface ReviewReport {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  content: string | null;
}
export interface Interest {
  id: UUID;
  slug: string;
  label: string;
}
export interface NewsItem {
  id: UUID;
  title: string;
  source_name: string;
  source_url: string;
  excerpt: string | null;
  language: LanguageCode;
  published_at: string;
  topic: string;
}
export interface PublicPost {
  id: UUID;
  author: PublicProfile;
  body: string;
  language: LanguageCode;
  created_at: string;
  moderation_state: ModerationState;
  conversation_id: UUID;
  is_fixture?: boolean;
}
export interface FeedCursor {
  matched: boolean;
  at: string;
  id: UUID;
  kind: "news" | "post";
}
export interface DiscoveryRow {
  kind: "news" | "post";
  id: UUID;
  sort_at: string;
  interest_match: boolean;
  conversation_id: UUID;
  news: NewsItem | null;
  post: PublicPost | null;
}
export interface OwnPost {
  manual_hidden?: boolean;
  id: UUID;
  body: string;
  language: LanguageCode;
  created_at: string;
  moderation_state: ModerationState;
  is_fixture: boolean;
}
export interface Reply extends Omit<PublicPost, "conversation_id"> {
  conversation_id: UUID;
  parent_reply_id: UUID | null;
  deleted_at: string | null;
}
export type FeedItem =
  | { kind: "news"; id: UUID; news: NewsItem; conversation_id: UUID }
  | { kind: "post"; id: UUID; post: PublicPost };

export interface TranslateRequest {
  entity_type: EntityType;
  entity_id: UUID;
  target_language: LanguageCode;
}
export interface TranslateResponse {
  translated_text: string;
  original_language: LanguageCode;
  target_language: LanguageCode;
  is_cached: boolean;
  label: string;
  provenance: Provenance;
}
export interface SummarizeNewsRequest {
  news_item_id: UUID;
  target_language: LanguageCode;
}
export interface SummarizeNewsResponse {
  lines: [string, string, string];
  source_url: string;
  generated_by_ai: boolean;
  is_cached: boolean;
  provenance: Provenance;
  basis: "headline_excerpt" | "licensed_article";
  label: string;
}
export interface ModerateRequest {
  entity_type: EntityType;
  entity_id: UUID;
}
export interface ModerateResponse {
  status: "allowed" | "flagged" | "blocked";
  reason_code: string;
  needs_review: boolean;
  provenance: Provenance;
}
export interface ApiError {
  error: { code: string; message: string; retryable: boolean };
}
