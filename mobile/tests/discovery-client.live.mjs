// Opt-in smoke check of the same Supabase SDK adapter used by both native apps.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { asFeedItem, loadFeed, loadOwnPosts, submitPost } from '../lib/discovery.ts';

const env = process.env;
function publicKey(value = '') {
  if (value.startsWith('sb_publishable_')) return true;
  try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role === 'anon'; }
  catch { return false; }
}
if (env.SAMVAD_P1_ALLOW_WRITES !== 'true' || !env.SAMVAD_P1_TEST_URL || !env.SAMVAD_P1_PUBLIC_KEY ||
    !publicKey(env.SAMVAD_P1_PUBLIC_KEY) || !env.SAMVAD_P1_EMAIL_A || !env.SAMVAD_P1_PASSWORD_A) {
  console.log('BLOCKED: dedicated development configuration/write opt-in required');
  process.exit(2);
}
const client = createClient(env.SAMVAD_P1_TEST_URL, env.SAMVAD_P1_PUBLIC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let savedId;
try {
  const { data, error } = await client.auth.signInWithPassword({ email: env.SAMVAD_P1_EMAIL_A, password: env.SAMVAD_P1_PASSWORD_A });
  if (error || !data.user) throw new Error('Sign-in failed');
  const actor = data.user.id;
  const feed = await loadFeed(client, null, null);
  if (!feed.some(row => row.kind === 'news') || !feed.some(row => row.kind === 'post')) throw new Error('Mixed feed missing');
  feed.forEach(asFeedItem);
  const draft = { requestId: randomUUID(), body: 'SDK development verification: हिन्दी മലയാളം 👋', language: 'ml', attempted: true };
  const copies = await Promise.all(Array.from({ length: 4 }, () => submitPost(client, draft, actor)));
  savedId = copies[0].id;
  if (copies.some(row => row.id !== savedId || row.moderation_state !== 'pending')) throw new Error('Retry failed');
  const own = await loadOwnPosts(client, actor);
  if (own.filter(post => post.id === savedId && post.body === draft.body).length !== 1) throw new Error('Round-trip failed');
  let refused = false;
  try { await submitPost(client, draft, randomUUID()); } catch { refused = true; }
  if (!refused) throw new Error('Account mismatch accepted');
  console.log('PASS: native shared SDK adapter loads mixed feed, persists Unicode, deduplicates four retries and rejects an account mismatch');
} catch {
  console.log('FAIL: SDK adapter smoke check did not complete; no credentials or response bodies logged');
  process.exitCode = 1;
} finally {
  if (savedId) await client.rpc('delete_own_post', { p_post_id: savedId });
  await client.auth.signOut({ scope: 'local' });
}
