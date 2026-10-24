import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProfileLoader } from '../lib/profile-loader.ts';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function setup() {
  const auth = [], profiles = [], states = [];
  const client = {
    auth: { getUser() { const task = deferred(); auth.push(task); return task.promise; } },
    from() { return { select() { return this; }, eq(_field, id) { this.id = id; return this; },
      maybeSingle() { const task = deferred(); profiles.push({ ...task, actor: this.id }); return task.promise; } }; },
  };
  return { auth, profiles, states, loader: createProfileLoader(client, state => states.push(state)) };
}
test('slow profile refresh cannot overwrite a newer successful refresh', async () => {
  const s = setup(); s.loader.setActor('A');
  const old = s.loader.load(); s.auth[0].resolve({ data: { user: { id: 'A' } } });
  await Promise.resolve();
  const fresh = s.loader.load(); s.auth[1].resolve({ data: { user: { id: 'A' } } });
  await Promise.resolve();
  const profile = { user_id: 'A', handle: 'new_handle' };
  s.profiles[1].resolve({ data: profile });
  assert.deepEqual(await fresh, profile);
  s.profiles[0].resolve({ data: { user_id: 'A', handle: 'old_handle' } });
  assert.equal(await old, null);
  assert.equal(s.states.at(-1).profile.handle, 'new_handle');
});
test('late authentication failure cannot clear another account or a new login of the same account', async () => {
  const s = setup(); s.loader.setActor('A');
  const old = s.loader.load();
  s.loader.setActor(null); s.loader.setActor('A');
  const fresh = s.loader.load();
  s.auth[1].resolve({ data: { user: { id: 'A' } } }); await Promise.resolve();
  s.profiles[0].resolve({ data: { user_id: 'A', handle: 'current' } }); await fresh;
  s.auth[0].reject(new Error('stale failure'));
  assert.equal(await old, null);
  assert.equal(s.states.at(-1).profile.handle, 'current');
  s.loader.setActor('B');
  assert.equal(s.states.at(-1).profile, null);
});
test('offline refresh preserves the confirmed profile and exposes retryable error instead of onboarding', async () => {
  const s = setup(); s.loader.setActor('A');
  const first = s.loader.load(); s.auth[0].resolve({ data: { user: { id: 'A' } } }); await Promise.resolve();
  s.profiles[0].resolve({ data: { user_id: 'A', handle: 'saved' } }); await first;
  const offline = s.loader.load();
  s.auth[1].resolve({ data: { user: null }, error: new Error('offline') });
  await assert.rejects(offline, /Reconnect and retry/);
  assert.equal(s.states.at(-1).profile.handle, 'saved');
  assert.equal(s.states.at(-1).loading, false);
  assert.match(s.states.at(-1).error, /retry/);
});
test('unmounted or switched account drops a pending profile response', async () => {
  const s = setup(); s.loader.setActor('A');
  const task = s.loader.load(); s.auth[0].resolve({ data: { user: { id: 'A' } } }); await Promise.resolve();
  s.loader.invalidate(); const count = s.states.length;
  s.profiles[0].resolve({ data: { user_id: 'A' } });
  assert.equal(await task, null); assert.equal(s.states.length, count);
});
