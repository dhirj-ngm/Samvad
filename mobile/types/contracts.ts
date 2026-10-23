/** Draft client shapes. Confirm exact persistence fields with Developer B in docs/contracts.md. */
export type LanguageCode = 'en' | 'hi' | 'ml';
export type UUID = string;
export type EntityType = 'post' | 'reply';
export type ModerationState = 'pending' | 'allowed' | 'flagged' | 'blocked';

export interface PublicProfile {
  user_id: UUID;
  handle: string;
  display_name: string | null;
  bio: string | null;
  preferred_language: LanguageCode;
}
export interface Interest { id: string; slug: string; label: string }
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
}
export interface Reply extends Omit<PublicPost, 'conversation_id'> {
  conversation_id: UUID;
  parent_reply_id: UUID | null;
}
export type FeedItem =
  | { kind: 'news'; id: UUID; news: NewsItem; conversation_id: UUID }
  | { kind: 'post'; id: UUID; post: PublicPost };

export interface TranslateRequest { entity_type: EntityType; entity_id: UUID; target_language: LanguageCode }
export interface TranslateResponse { translated_text: string; original_language: LanguageCode; target_language: LanguageCode; is_cached: boolean; label: 'Translated by AI' }
export interface SummarizeNewsRequest { news_item_id: UUID; target_language: LanguageCode }
export interface SummarizeNewsResponse { lines: [string, string, string]; source_url: string; generated_by_ai: boolean; is_cached: boolean }
export interface ModerateRequest { entity_type: EntityType; entity_id: UUID }
export interface ModerateResponse { status: 'allowed' | 'flagged' | 'blocked'; reason_code: string; needs_review: boolean }
export interface ApiError { error: { code: string; message: string } } // Proposed; B agreement pending.
