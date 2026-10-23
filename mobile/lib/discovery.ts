import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiscoveryRow, FeedCursor, FeedItem, OwnPost } from '../types/contracts';
import type { PostDraft } from './post-model';
import { screenSubmission } from './ai-client.ts';

export async function loadFeed(client: SupabaseClient, topic: string | null, after: FeedCursor | null) {
  const { data, error } = await client.rpc('get_discovery_feed', { p_topic: topic, p_limit: 20, p_after: after });
  if (error) throw error;
  return data as DiscoveryRow[];
}
export function asFeedItem(row: DiscoveryRow): FeedItem {
  if (row.kind === 'news' && row.news) return { kind: 'news', id: row.id, news: row.news, conversation_id: row.conversation_id };
  if (row.kind === 'post' && row.post) return { kind: 'post', id: row.id, post: row.post };
  throw new Error('This feed item could not be loaded. Refresh to try again.');
}
export async function loadOwnPosts(client: SupabaseClient, actor: string) {
  const { data, error } = await client.from('posts')
    .select('id,body,language,created_at,moderation_state,is_fixture')
    .eq('author_id', actor).order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return data as OwnPost[];
}
export async function submitPost(client: SupabaseClient, draft: PostDraft, actor: string) {
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session || session.user.id !== actor) throw new Error('Sign in again to save your post.');
  const { data, error } = await client.rpc('submit_post', {
    p_request_id: draft.requestId, p_body: draft.body, p_language: draft.language,
  }).setHeader('Authorization', `Bearer ${session.access_token}`);
  if (error) {
    if (error.code === 'PT409') throw new Error('This submission was already used with different text. Check your submissions before starting a new draft.');
    throw new Error('Your save was not confirmed. Your draft is kept; retry the same submission.');
  }
  if (!data || typeof data.id !== 'string' || typeof data.conversation_id !== 'string' ||
      typeof data.deleted !== 'boolean' || !['pending', 'allowed', 'flagged', 'blocked'].includes(data.moderation_state)) {
    throw new Error('Your save was not confirmed. Your draft is kept; retry the same submission.');
  }
  if (!data.deleted && data.moderation_state === 'pending') {
    const state = await screenSubmission(client, actor, 'post', data.id);
    if (state) data.moderation_state = state;
  }
  return data as { id: string; conversation_id: string; moderation_state: string; deleted: boolean };
}
