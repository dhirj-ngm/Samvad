import type {
  FeedItem, Interest, LanguageCode, NewsItem, PublicPost, PublicProfile, Reply,
  SummarizeNewsRequest, SummarizeNewsResponse, TranslateRequest, TranslateResponse, UUID,
} from './contracts';

/** P0 port only. Backend query details and write idempotency need Developer B agreement. */
export interface SamvadClient {
  getCurrentProfile(): Promise<PublicProfile | null>;
  listInterests(): Promise<Interest[]>;
  listFeed(input: { interestIds: string[]; cursor?: string }): Promise<{ items: FeedItem[]; nextCursor: string | null }>;
  getConversation(id: UUID): Promise<{ news: NewsItem | null; rootPost: PublicPost | null; replies: Reply[] }>;
  createPost(input: { body: string; language: LanguageCode; requestId: UUID }): Promise<PublicPost>;
  createReply(input: { conversationId: UUID; parentReplyId?: UUID; body: string; language: LanguageCode; requestId: UUID }): Promise<Reply>;
  report(input: { entityType: 'post' | 'reply'; entityId: UUID; reason: string }): Promise<void>;
  translate(input: TranslateRequest): Promise<TranslateResponse>;
  summarizeNews(input: SummarizeNewsRequest): Promise<SummarizeNewsResponse>;
}
