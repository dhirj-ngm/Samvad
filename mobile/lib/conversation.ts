import type { SupabaseClient } from '@supabase/supabase-js';
import type { Reply } from '../types/contracts';
import type { ConversationDraft, ReportTarget } from './conversation-model';
import { screenSubmission } from './ai-client.ts';

export async function loadReplies(client: SupabaseClient, conversation: string, after: { at: string; id: string } | null) {
  const { data, error } = await client.rpc('get_replies', { p_conversation_id: conversation, p_limit: 30, p_after: after });
  if (error) throw new Error('Replies could not be loaded. Refresh to retry.');
  return data as Reply[];
}
export async function actorRpc(client: SupabaseClient, actor: string, name: string, payload: Record<string, unknown>) {
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session || session.user.id !== actor) throw new Error('Sign in again before saving. Your draft is kept.');
  const { data, error } = await client.rpc(name,payload).setHeader('Authorization',`Bearer ${session.access_token}`);
  if (error) {
    if (error.code === 'PT429') throw new Error('Too many submissions. Wait a minute, then retry this same draft.');
    if (error.code === 'PT409') throw new Error('This request was already used for different content. Your draft is kept.');
    if (error.code === 'PT404') throw new Error('This content is no longer available. Your draft is kept.');
    throw new Error('Save was not confirmed. Your draft is kept; retry the same submission.');
  }
  return data;
}
export async function submitReply(client: SupabaseClient, actor: string, conversation: string, parent: string | null, draft: ConversationDraft) {
  const data = await actorRpc(client,actor,'submit_reply',{
    p_request_id: draft.requestId, p_conversation_id: conversation, p_parent_reply_id: parent,
    p_body: draft.body, p_language: draft.language,
  });
  if (!data || typeof data.id !== 'string' || data.conversation_id !== conversation ||
      typeof data.deleted !== 'boolean' || !['pending','allowed','flagged','blocked'].includes(data.moderation_state))
    throw new Error('Save was not confirmed. Retry the same draft.');
  if (!data.deleted && data.moderation_state === 'pending') {
    const state = await screenSubmission(client, actor, 'reply', data.id);
    if (state) data.moderation_state = state;
  }
  return data as { id: string; deleted: boolean; moderation_state: string };
}
export async function submitReport(client: SupabaseClient, actor: string, target: ReportTarget, draft: ConversationDraft) {
  const data = await actorRpc(client,actor,'submit_report',{
    p_request_id: draft.requestId, p_entity_type: target.type, p_entity_id: target.id,
    p_reason: draft.reason, p_details: draft.body,
  });
  if (!data || typeof data.id !== 'string' || !['submitted','reviewing','resolved','dismissed'].includes(data.status) ||
      typeof data.already_reported !== 'boolean') throw new Error('Report was not confirmed. Retry the same draft.');
  return data as { id: string; status: string; already_reported: boolean };
}
