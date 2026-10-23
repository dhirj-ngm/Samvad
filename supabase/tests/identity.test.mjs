// PostgreSQL-in-WASM checks, NOT Supabase Auth or real-account evidence.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';

const A = '20000000-0000-4000-8000-000000000001';
const B = '20000000-0000-4000-8000-000000000002';
const C = '20000000-0000-4000-8000-000000000003';
const SPORT = '10000000-0000-4000-8000-000000000001';
const TECH = '10000000-0000-4000-8000-000000000003';
const db = new PGlite({ extensions: { citext } });

// Minimal Auth catalog shim so real SQL/RLS can execute without a running Auth
// server. Only setup is privileged; each authorization assertion SET ROLEs to
// ordinary anon/authenticated roles. No assertion pretends these are real JWTs.
before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users (id,email) values ('${A}','a@fixture.invalid');
  `);
  const migration = await readFile(
    new URL('../migrations/202610230001_identity_interests.sql', import.meta.url), 'utf8',
  );
  await db.exec(migration);
  await db.query('insert into auth.users (id,email) values ($1,$2),($3,$4)',
    [B, 'b@fixture.invalid', C, 'c@fixture.invalid']);
});
after(async () => db.close());

async function asUser(role, user, action, commit = false) {
  await db.exec('begin');
  let completed = false;
  try {
    await db.exec(`set local role ${role}`); // Internal constant, never user input.
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
    const result = await action();
    completed = true;
    return result;
  } finally {
    await db.exec(commit && completed ? 'commit' : 'rollback');
  }
}

async function insertProfile(user, handle, language = 'en') {
  return db.query(`insert into public.profiles (user_id,handle,display_name,preferred_language)
    values ($1,$2,'പേര് 👋',$3) returning *`, [user, handle, language]);
}

test('two independent owners create profiles; canonical handles and Unicode survive', async () => {
  for (const [id, handle, language] of [[A, 'Reader_A', 'ml'], [B, 'Reader_B', 'hi']]) {
    await asUser('authenticated', id, async () => {
      const { rows } = await insertProfile(id, handle, language);
      assert.equal(rows[0].handle, handle.toLowerCase());
      assert.equal(rows[0].display_name, 'പേര് 👋');
      assert.equal(rows[0].preferred_language, language);
      assert.equal(rows[0].user_id, id);
    });
  }
});

test('same-user profile upsert is retry-safe and preserves created_at', async () => {
  try {
    // Separate transactions matter: now() is constant within one transaction.
    const first = await asUser('authenticated', A, async () =>
      (await insertProfile(A, 'reader_a')).rows[0], true);
    await new Promise(resolve => setTimeout(resolve, 20));
    await asUser('authenticated', A, async () => {
      for (let retry = 0; retry < 3; retry++) {
        const result = await db.query(`insert into public.profiles
          (user_id,handle,display_name,bio,preferred_language) values ($1,'reader_a','नाम','','hi')
          on conflict (user_id) do update set user_id=excluded.user_id, handle=excluded.handle,
          display_name=excluded.display_name, bio=excluded.bio,
          preferred_language=excluded.preferred_language returning *`, [A]);
        assert.equal(result.rows[0].created_at.getTime(), first.created_at.getTime());
      }
      assert.equal((await db.query('select * from public.profiles')).rows.length, 1);
    });
  } finally {
    // Privileged fixture cleanup only, never used as authorization evidence.
    await db.query('delete from public.profiles where user_id=$1', [A]);
  }
});

test('same and case-variant duplicate handles both fail database uniqueness', async () => {
  for (const candidate of ['reader_a', 'READER_A']) {
    await asUser('authenticated', A, async () => {
      await insertProfile(A, 'reader_a');
      await db.exec('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [B]);
      await assert.rejects(insertProfile(B, candidate), { code: '23505' });
    });
  }
});

for (const [handle, language] of [
  ['ab', 'en'], ['bad-handle', 'en'], ['नाम', 'hi'],
  ['admin', 'en'], ['SYSTEM', 'en'], ['valid_reader', 'ta'],
]) {
  test(`invalid handle/language is rejected (${handle}/${language})`, async () => {
    await asUser('authenticated', A, () =>
      assert.rejects(insertProfile(A, handle, language), { code: '23514' }));
  });
}

test('B cannot insert A profile; row owner cannot be reassigned', async () => {
  await asUser('authenticated', B, () =>
    assert.rejects(insertProfile(A, 'reader_a'), { code: '42501' }));
  await asUser('authenticated', A, async () => {
    await insertProfile(A, 'reader_a');
    await assert.rejects(db.query('update public.profiles set user_id=$1 where user_id=$2', [B, A]),
      { code: '42501' });
  });
});

test('B cannot alter A public fields, including via upsert', async () => {
  await asUser('authenticated', A, async () => {
    await insertProfile(A, 'reader_a');
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [B]);
    assert.equal((await db.query("update public.profiles set bio='attack' where user_id=$1 returning *",
      [A])).rows.length, 0);
    await assert.rejects(db.query(`insert into public.profiles (user_id,handle) values ($1,'attack')
      on conflict (user_id) do update set handle=excluded.handle`, [A]), { code: '42501' });
  });
});

test('created_at and profile DELETE are never granted to clients', async () => {
  await asUser('authenticated', A, async () => {
    await insertProfile(A, 'reader_a');
    await assert.rejects(db.query('update public.profiles set created_at=now() where user_id=$1', [A]),
      { code: '42501' });
  });
  await asUser('authenticated', A, () =>
    assert.rejects(db.query('delete from public.profiles where user_id=$1', [A]), { code: '42501' }));
});

test('private identity backfill and Auth-owned verification sync work without metadata trust', async () => {
  const before = await db.query('select * from public.private_identities where user_id=$1', [A]);
  assert.equal(before.rows.length, 1);
  assert.equal(before.rows[0].verification_status, 'unverified');
  await db.query(`update auth.users set raw_user_meta_data='{"verification_status":"email_verified"}'
    where id=$1`, [A]);
  assert.equal((await db.query('select verification_status from public.private_identities where user_id=$1',
    [A])).rows[0].verification_status, 'unverified');
  await db.query("update auth.users set email='changed@fixture.invalid',email_confirmed_at=now() where id=$1", [A]);
  const updated = (await db.query('select * from public.private_identities where user_id=$1', [A])).rows[0];
  assert.equal(updated.verification_status, 'email_verified');
  assert.equal(updated.email, 'changed@fixture.invalid');
  assert.equal(updated.created_at.getTime(), before.rows[0].created_at.getTime());
  assert.equal((await db.query('select * from public.private_identities where user_id=$1', [B])).rows.length, 1);
});

test('no ordinary user or anon can select, write, or RPC around private identities', async () => {
  for (const [role, id] of [['anon', null], ['authenticated', A], ['authenticated', B]]) {
    for (const sql of [
      'select * from public.private_identities',
      "update public.private_identities set verification_status='email_verified'",
      'select public.samvad_sync_private_identity()',
    ]) {
      await asUser(role, id, () => assert.rejects(db.query(sql), { code: '42501' }));
    }
  }
});

test('public SELECT exposes only intended profile columns', async () => {
  await asUser('authenticated', A, async () => {
    await insertProfile(A, 'reader_a');
    await db.exec('set local role anon');
    await db.query("select set_config('request.jwt.claim.sub', '', true)");
    const row = (await db.query('select * from public.profiles')).rows[0];
    assert.deepEqual(Object.keys(row).sort(),
      ['user_id', 'handle', 'display_name', 'bio', 'preferred_language', 'created_at'].sort());
  });
});

test('six seeded interests are public; ordinary clients cannot seed or edit them', async () => {
  await asUser('anon', null, async () => {
    assert.equal((await db.query('select * from public.interests')).rows.length, 6);
  });
  await asUser('authenticated', A, () =>
    assert.rejects(db.query("update public.interests set label='attack'"), { code: '42501' }));
});

test('interest selections are owner-only and duplicate retries add no rows', async () => {
  await asUser('authenticated', A, async () => {
    await insertProfile(A, 'reader_a');
    for (let retry = 0; retry < 3; retry++) {
      await db.query(`insert into public.user_interests (user_id,interest_id) values ($1,$2),($1,$3)
        on conflict (user_id,interest_id) do nothing`, [A, SPORT, TECH]);
    }
    assert.equal((await db.query('select * from public.user_interests')).rows.length, 2);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [B]);
    assert.equal((await db.query('select * from public.user_interests')).rows.length, 0);
    assert.equal((await db.query('delete from public.user_interests where user_id=$1 returning *', [A])).rows.length, 0);
    await assert.rejects(db.query('insert into public.user_interests values ($1,$2)', [A, SPORT]),
      { code: '42501' });
  });
});

test('owner can delete selection; invalid interest foreign key fails', async () => {
  await asUser('authenticated', A, async () => {
    await insertProfile(A, 'reader_a');
    await db.query('insert into public.user_interests values ($1,$2)', [A, SPORT]);
    assert.equal((await db.query('delete from public.user_interests where user_id=$1 returning *', [A])).rows.length, 1);
    await assert.rejects(db.query('insert into public.user_interests values ($1,$2)', [A, C]), { code: '23503' });
  });
});

test('anon can browse public rows but cannot write profiles or read private interests', async () => {
  await asUser('anon', null, () =>
    assert.rejects(insertProfile(A, 'reader_a'), { code: '42501' }));
  await asUser('anon', null, () =>
    assert.rejects(db.query('select * from public.user_interests'), { code: '42501' }));
});

test('authenticated role without a subject cannot create any profile', async () => {
  await asUser('authenticated', null, () =>
    assert.rejects(insertProfile(A, 'reader_a'), { code: '42501' }));
});

test('an email removal clears stale private data; Auth deletion cascades without public residue', async () => {
  await db.exec('begin');
  try {
    await db.query('update auth.users set email=null, email_confirmed_at=null where id=$1', [C]);
    assert.equal((await db.query('select * from public.private_identities where user_id=$1', [C])).rows.length, 0);
    await insertProfile(C, 'reader_c');
    await db.query('insert into public.user_interests values ($1,$2)', [C, SPORT]);
    await db.query('delete from auth.users where id=$1', [C]);
    assert.equal((await db.query('select * from public.profiles where user_id=$1', [C])).rows.length, 0);
    assert.equal((await db.query('select * from public.user_interests where user_id=$1', [C])).rows.length, 0);
  } finally {
    await db.exec('rollback');
  }
});

test('failed duplicate application rolls back instead of overwriting existing schema/data', async () => {
  const migration = await readFile(
    new URL('../migrations/202610230001_identity_interests.sql', import.meta.url), 'utf8',
  );
  try {
    await assert.rejects(db.exec(migration), { code: '42P07' });
  } finally {
    await db.exec('rollback');
  }
  assert.equal((await db.query('select * from public.interests')).rows.length, 6);
  assert.equal((await db.query('select * from public.private_identities')).rows.length, 3);
});
