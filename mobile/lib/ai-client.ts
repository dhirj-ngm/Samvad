import type { SupabaseClient } from '@supabase/supabase-js';

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'');
export function validAPIBase(base: string | undefined): base is string {
  if (!base) return false;
  try { const url=new URL(base);return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&(url.pathname==='/'||url.pathname===''); }
  catch { return false; }
}
export async function requestAI(client: SupabaseClient, actor: string, route: 'translate'|'summarize-news'|'moderate', payload: object, base = apiBase) {
  if (!validAPIBase(base)) throw new Error('AI service is not configured. Original text remains available.');
  const { data: { session }, error } = await client.auth.getSession();
  if (error || !session || session.user.id !== actor) throw new Error('Sign in to use AI. Original text remains available.');
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),30000);
  try {
    const response = await fetch(`${base}/v1/${route}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload),signal:controller.signal});
    if (!response.ok) {
      if (response.status===429) throw new Error('Free AI quota is busy or exhausted. Retry later; original text is available.');
      if (response.status===401) throw new Error('Sign in again to use AI.');
      if (response.status===404) throw new Error('This content is no longer available. Refresh the conversation.');
      throw new Error('AI is unavailable. Original text remains available. New submissions stay pending for review.');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name==='AbortError') throw new Error('AI took too long. Original text remains available.');
    throw error instanceof Error ? error : new Error('AI could not be reached. Original text remains available.');
  } finally { clearTimeout(timer); }
}
export async function screenSubmission(client: SupabaseClient, actor: string, entity_type: 'post'|'reply', entity_id: string) {
  try {
    const result = await requestAI(client,actor,'moderate',{entity_type,entity_id});
    return ['allowed','flagged','blocked'].includes(result?.status) ? result.status as 'allowed'|'flagged'|'blocked' : null;
  } catch { return null; } // A confirmed DB save remains successful; screening failure holds it.
}
