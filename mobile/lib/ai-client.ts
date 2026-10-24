import type { SupabaseClient } from '@supabase/supabase-js';

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'');
export const aiDemoEnabled = process.env.EXPO_PUBLIC_AI_DEMO === 'true';
export function validAPIBase(base: string | undefined, localDemo = false): base is string {
  if (!base) return false;
  try { const url=new URL(base); const local = localDemo && url.protocol==='http:' && /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname); return (url.protocol==='https:'||local)&&!url.username&&!url.password&&!url.search&&!url.hash&&(url.pathname==='/'||url.pathname===''); }
  catch { return false; }
}
export async function requestAI(client: SupabaseClient, actor: string, route: 'translate'|'summarize-news'|'moderate'|'summarize'|'submit-and-screen'|'review-queue'|'review', payload: object, base = apiBase) {
  if (!validAPIBase(base, process.env.EXPO_PUBLIC_LOCAL_DEMO === 'true')) throw new Error('AI service is not configured. Original text remains available.');
  const { data: { session }, error } = await client.auth.getSession();
  if (error || !session || session.user.id !== actor) throw new Error('Sign in to use AI. Original text remains available.');
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), route==='submit-and-screen'||route==='summarize'?90000:30000);
  try {
    const response = await fetch(`${base}/v1/${route}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload),signal:controller.signal});
    if (!response.ok) {
      if (response.status===429) throw new Error('Free AI quota is busy or exhausted. Retry later; original text is available.');
      if (response.status===401) throw new Error('Sign in again to use AI.');
      if (response.status===404) throw new Error('This content is no longer available. Refresh the conversation.');
      if (response.status===400) {
        const result=await response.json().catch(()=>null);
        if(result?.error?.code==='insufficient_source')throw new Error('Not enough source text for a useful summary. Read the original.');
      }
      if (response.status===403) throw new Error('This account is not authorized for this action.');
      if (response.status===409) throw new Error('Content or request changed. Refresh before retrying; keep your original request ID.');
      throw new Error('AI is unavailable. Original text remains available. New submissions stay pending for review.');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name==='AbortError') throw new Error(route==='submit-and-screen'
      ? 'Save was not confirmed before timeout. Your draft is kept. Retry the same submission; do not start another copy.'
      : 'AI took too long. Original text remains available. Retry when your connection recovers.');
    if (error instanceof TypeError) throw new Error(route==='submit-and-screen'
      ? 'Save was not confirmed. Check your connection. Your draft is kept; retry the same submission.'
      : 'AI could not be reached. Check your connection and retry. Original text remains available.');
    throw error instanceof Error ? error : new Error('AI could not be reached. Original text remains available.');
  } finally { clearTimeout(timer); }
}
export async function screenSubmission(client: SupabaseClient, actor: string, entity_type: 'post'|'reply', entity_id: string) {
  try {
    const result = await requestAI(client,actor,'moderate',{entity_type,entity_id});
    return ['allowed','flagged','blocked'].includes(result?.status) ? result.status as 'allowed'|'flagged'|'blocked' : null;
  } catch { return null; } // A confirmed DB save remains successful; screening failure holds it.
}
