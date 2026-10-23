import type { FeedItem, Interest } from '../types/contracts';

/** Fictional local fixtures. Never present these as live news, people, or engagement. */
export const sampleInterests: Interest[] = [
  { id: 'sports', slug: 'sports', label: 'Sports' },
  { id: 'technology', slug: 'technology', label: 'Technology' },
  { id: 'culture', slug: 'culture', label: 'Culture' },
];

export const sampleFeed: FeedItem[] = [
  {
    kind: 'news', id: 'sample-news', conversation_id: 'sample-conversation',
    news: {
      id: 'sample-news', title: 'Sample story card for layout review',
      source_name: 'Design fixture — no publisher', source_url: '',
      excerpt: 'Real attributed news will appear here after backend integration.',
      language: 'en', published_at: '2026-10-23T00:00:00Z', topic: 'technology',
    },
  },
  {
    kind: 'post', id: 'sample-post',
    post: {
      id: 'sample-post', conversation_id: 'sample-post-conversation',
      author: { user_id: 'sample-user', handle: 'sample_voice', display_name: 'Sample voice', bio: null, preferred_language: 'ml' },
      body: 'നമസ്കാരം! This is a sample post to check mixed-script reading.',
      language: 'ml', created_at: '2026-10-23T00:00:00Z', moderation_state: 'allowed',
    },
  },
];
