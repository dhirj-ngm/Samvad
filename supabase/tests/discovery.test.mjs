import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';

const db = new PGlite({ extensions: { citext } });
const A = '40000000-0000-4000-8000-000000000001';
const B = '40000000-0000-4000-8000-000000000002';
const KEY = '40000000-0000-4000-8000-000000000003';
const fixtures = [];

before(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  const migrations = (await readdir(new URL('../migrations/', import.meta.url)))
    .filter(file => file.endsWith('.sql')).sort();
  for (const file of migrations) {
    await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)',
    [A, 'a@fixture.invalid', B, 'b@fixture.invalid']);
  await db.query("insert into public.profiles(user_id,handle) values ($1,'discovery_a'),($2,'discovery_b')", [A, B]);
  // Fixture setup only. Test assertions below use ordinary roles.
  for (let n = 1; n <= 3; n++) {
    const row = await db.query(`insert into public.posts(author_id,request_id,request_fingerprint,body,
      language,moderation_state,is_fixture,created_at) values ($1,gen_random_uuid(),'fixture',$2,
      'en','allowed',true,'2026-10-24T00:00:00Z') returning id`, [A, `Demo fixture ${n}`]);
    fixtures.push(row.rows[0].id);
  }
});
after(async () => db.close());

async function as(role, uid, action) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? '']);
    return await action();
  } finally { await db.exec('rollback'); }
}
async function submit(key = KEY, body = 'നമസ്കാരം भारत 👋', language = 'ml') {
  return (await db.query('select public.submit_post($1,$2,$3) value', [key, body, language])).rows[0].value;
}
async function feed(topic = null, limit = 20, cursor = null) {
  return (await db.query('select * from public.get_discovery_feed($1,$2,$3)', [topic, limit, cursor])).rows;
}
const cursorOf = row => ({ matched: row.interest_match, at: row.sort_at.toISOString(), id: row.id, kind: row.kind });

test('anonymous cold-start feed has six real sourced stories and labeled fixture posts', async () => {
  await as('anon', null, async () => {
    const rows = await feed();
    assert.equal(rows.length, 9);
    assert.equal(rows.filter(r => r.kind === 'news').length, 6);
    assert.equal(rows.filter(r => r.kind === 'post' && r.post.is_fixture).length, 3);
    for (const row of rows.filter(r => r.kind === 'news')) {
      assert.match(row.news.source_url, /^https:\/\//);
      assert.ok(row.conversation_id);
    }
  });
});

test('submission is durable, Unicode-safe, pending and visible only to its author', async () => {
  await as('authenticated', A, async () => {
    const saved = await submit();
    assert.equal(saved.moderation_state, 'pending');
    assert.ok(saved.conversation_id);
    assert.equal((await db.query('select body from public.posts where id=$1', [saved.id])).rows[0].body,
      'നമസ്കാരം भारत 👋');
    assert.ok(!(await feed()).some(row => row.id === saved.id));
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [B]);
    assert.equal((await db.query('select body from public.posts where id=$1', [saved.id])).rows.length, 0);
    assert.equal((await db.query('select id from public.conversations where id=$1', [saved.conversation_id])).rows.length, 0);
  });
});

test('retries reuse post and conversation IDs; changed payload conflicts', async () => {
  await as('authenticated', A, async () => {
    const first = await submit();
    assert.deepEqual(await submit(), first);
    assert.deepEqual(await submit(), first);
    assert.equal((await db.query('select id from public.conversations where root_post_id=$1', [first.id])).rows.length, 1);
    await assert.rejects(submit(KEY, 'different'), { code: 'PT409' });
  });
});

test('request IDs are scoped to the authenticated author', async () => {
  await as('authenticated', A, async () => {
    const first = await submit();
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [B]);
    const second = await submit();
    assert.notEqual(first.id, second.id);
    const owner = (await db.query('select author_id from public.posts where id=$1', [second.id])).rows[0];
    assert.equal(owner.author_id, B);
  });
});

for (const [body, language] of [['  \n\t', 'en'], ['a'.repeat(2001), 'en'], ['hello', 'ta'], [null, 'en']]) {
  test(`invalid input rejected (${language}, length ${body?.length ?? 'null'})`, async () => {
    await as('authenticated', A, () => assert.rejects(submit(KEY, body, language), { code: '22023' }));
  });
}
test('2000 emoji code points are valid without truncating surrogate pairs', async () => {
  await as('authenticated', A, async () => {
    const body = '😀'.repeat(2000);
    const saved = await submit(KEY, body, 'en');
    assert.equal((await db.query('select char_length(body) count from public.posts where id=$1', [saved.id])).rows[0].count, 2000);
  });
});

test('no ordinary client can forge author, publication, fixture state or timestamps', async () => {
  for (const sql of [
    "update public.posts set moderation_state='allowed'",
    "update public.posts set is_fixture=true",
    `insert into public.posts(author_id,request_id,request_fingerprint,body,language)
      values ('${B}','${KEY}','fake','forged','en')`,
    'select request_fingerprint from public.posts',
    "insert into public.news_items(title) values ('forged')",
    'delete from public.posts',
  ]) {
    await as('authenticated', A, () => assert.rejects(db.query(sql), { code: '42501' }));
  }
});

test('only the owner can soft-delete; tombstones prevent duplicate replay and body exposure', async () => {
  await as('authenticated', A, async () => {
    const saved = await submit();
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [B]);
    assert.equal((await db.query('select public.delete_own_post($1) deleted', [saved.id])).rows[0].deleted, false);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [A]);
    assert.equal((await db.query('select public.delete_own_post($1) deleted', [saved.id])).rows[0].deleted, true);
    assert.equal((await db.query('select body from public.posts where id=$1', [saved.id])).rows.length, 0);
    const retry = await submit();
    assert.equal(retry.id, saved.id);
    assert.equal(retry.deleted, true);
    assert.ok(!(await feed()).some(row => row.id === saved.id));
    await assert.rejects(submit(KEY, 'new text'), { code: 'PT409' });
  });
});

test('interests reorder news deterministically; topic selection keeps original posts', async () => {
  await as('authenticated', B, async () => {
    await db.query(`insert into public.user_interests(user_id,interest_id)
      select $1,id from public.interests where slug='culture'`, [B]);
    const rows = await feed();
    assert.equal(rows[0].news.topic, 'culture');
    assert.equal(rows[0].interest_match, true);
    const topic = await feed('culture');
    assert.equal(topic.filter(row => row.kind === 'news').length, 1);
    assert.equal(topic.filter(row => row.kind === 'post').length, 3);
  });
});

test('keyset pagination has no duplicates or omissions with tied timestamps', async () => {
  await as('anon', null, async () => {
    const expected = await feed();
    const collected = [];
    let cursor = null;
    for (let page = 0; page < 10; page++) {
      const rows = await feed(null, 2, cursor);
      collected.push(...rows);
      if (!rows.length) break;
      cursor = cursorOf(rows.at(-1));
    }
    assert.deepEqual(collected.map(row => row.id), expected.map(row => row.id));
    assert.equal(new Set(collected.map(row => row.id)).size, expected.length);
  });
});

for (const args of [['missing', 20, null], [null, 51, null], [null, 0, null],
  [null, 20, {}], [null, 20, {matched: true, at: 'bad', id: KEY, kind: 'post'}]]) {
  test(`feed rejects invalid parameters ${JSON.stringify(args)}`, async () => {
    await as('anon', null, () => assert.rejects(feed(...args), { code: '22023' }));
  });
}
test('anonymous writes and subjectless authenticated writes fail', async () => {
  await as('anon', null, () => assert.rejects(submit(), { code: '42501' }));
  await as('authenticated', null, () => assert.rejects(submit(), { code: '42501' }));
});
