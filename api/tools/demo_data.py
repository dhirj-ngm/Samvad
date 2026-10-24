"""Repeatable local demo seed/verify/prewarm/reset. No personal identity in fixtures."""
import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid5

import httpx

from tools.demo_accounts import PRIVATE, ROOT, local_status, session_for

STATE = ROOT / 'api/.local/demo-state.json'
MANIFEST = ROOT / 'api/demo/manifest.json'


def local_sql(query):
    env = os.environ.copy()
    docker = Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs/DockerDesktop/resources/bin'
    env['PATH'] = str(docker) + os.pathsep + env.get('PATH', '')
    r = subprocess.run(['npx.cmd', '--yes', 'supabase@2.122.0', 'db', 'query', '--local', query],
                       cwd=ROOT, env=env, capture_output=True, text=True, timeout=60, check=False)
    if r.returncode:
        raise RuntimeError('Scoped local SQL operation failed')


def run(command='seed', apply=False, api='http://127.0.0.1:8775'):
    if api != 'http://127.0.0.1:8775':
        raise RuntimeError('Local gateway only')
    status = local_status()
    mapping = json.loads(PRIVATE.read_text(encoding='utf-8'))
    people = dict(zip('ABC', mapping['accounts'])) | {'D': mapping['existing']}
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest_hash = hashlib.sha256(MANIFEST.read_bytes()).hexdigest()
    state = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {
        'version': 1, 'manifest_hash': manifest_hash, 'origin': status['API_URL'], 'items': {}}
    if state['origin'] != status['API_URL'] or state['manifest_hash'] != manifest_hash:
        raise RuntimeError('Manifest/environment changed. Do not overwrite the prior rehearsal.')
    admin = {'apikey': status['SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + status['SERVICE_ROLE_KEY']}
    sessions = {}
    with httpx.Client(base_url=status['API_URL'], headers={'apikey': status['ANON_KEY']},
                      timeout=25, follow_redirects=False, trust_env=False) as client:
        def rpc(name, payload, role):
            r = client.post('/rest/v1/rpc/' + name, headers=sessions[role], json=payload)
            r.raise_for_status()
            return r.json()

        def persist():
            STATE.write_text(json.dumps(state, indent=2), encoding='utf-8')

        def body(text):
            for before, role in [('demo_ananya', 'A'), ('demo_aarav', 'B'), ('demo_meera', 'C'), ('demo_faiz', 'D')]:
                text = text.replace('@' + before, '@' + people[role]['handle'])
            return text

        def create(key, kind, role, text, language, conversation=None, parent=None, hold=False):
            request = str(uuid5(NAMESPACE_URL, 'samvad-ai-demo-v1:' + key))
            params = {'p_request_id': request, 'p_body': body(text), 'p_language': language}
            if kind == 'reply':
                params.update(p_conversation_id=conversation, p_parent_reply_id=parent)
            result = rpc('submit_' + kind, params, role)
            if result['deleted']:
                raise RuntimeError('A fixture was removed; it will not be resurrected')
            saved = {'id': result['id'], 'conversation_id': result['conversation_id'],
                     'kind': kind, 'role': role, 'hash': hashlib.sha256(body(text).encode()).hexdigest()}
            if key in state['items'] and state['items'][key] != saved:
                raise RuntimeError('Fixture identity changed; refusing to adopt unrelated data')
            state['items'][key] = saved
            persist()
            target, author = str(UUID(result['id'])), str(UUID(people[role]['id']))
            table = 'posts' if kind == 'post' else 'replies'
            # Only provenance tagging for an exact manifest-owned author/source.
            local_sql(f"update public.{table} set is_fixture=true where id='{target}' and author_id='{author}' "
                      f"and encode(sha256(convert_to(body,'UTF8')),'hex')='{saved['hash']}' and deleted_at is null")
            if result['moderation_state'] == 'pending':
                rpc('demo_review', {'p_action': 'decide', 'p_payload': {
                    'entity_type': kind, 'entity_id': result['id'],
                    'request_id': str(uuid5(NAMESPACE_URL, 'samvad-demo-review:' + key)),
                    'action': 'reject' if hold else 'approve',
                    'reason': 'Synthetic safety demo, held by operator' if hold else 'Operator-reviewed benign fictional conversation',
                    'source_hash': saved['hash'], 'expected_state': 'pending'}}, 'D')
            return result

        try:
            for role, account in people.items():
                sessions[role] = session_for(client, account, admin)
            if command == 'seed':
                for thread in manifest['threads']:
                    tag = thread['key']
                    if thread['root']:
                        r = thread['root']
                        root = create(tag, 'post', r['actor'], r['body'], r['language'])
                        conversation = root['conversation_id']
                    else:
                        if not state.get('news'):
                            feed = rpc('get_discovery_feed', {}, 'A')
                            news = next(item for item in feed if item['kind'] == 'news')
                            state['news'] = {'id': news['id'], 'conversation_id': news['conversation_id']}
                            persist()
                        conversation = state['news']['conversation_id']
                    previous = []
                    for i, reply in enumerate(thread['replies']):
                        parent = previous[0] if tag == 'T1' and i == 1 else previous[2] if tag == 'T1' and i == 3 else None
                        r = create(f'{tag}-reply-{i}', 'reply', reply['actor'], reply['body'],
                                   reply['language'], conversation, parent)
                        previous.append(r['id'])
                create('T4-held', 'reply', 'C', manifest['held_reply'], 'en',
                       state['items']['T1']['conversation_id'], hold=True)
                for source, target in [('A','B'),('B','C'),('C','D'),('D','A')]:
                    rpc('social', {'p_action': 'follow', 'p_payload': {'id': people[target]['id'], 'desired': True}}, source)
                for root, roles in [('T1','CD'),('T2','AB'),('news','AD')]:
                    convo = state['news']['conversation_id'] if root == 'news' else state['items'][root]['conversation_id']
                    for role in roles:
                        rpc('social', {'p_action':'like','p_payload':{'id':convo,'desired':True}}, role)
                for root, role in [('T1','B'),('news','D')]:
                    convo = state['news']['conversation_id'] if root == 'news' else state['items'][root]['conversation_id']
                    rpc('social', {'p_action':'repost','p_payload':{'id':convo,'desired':True}}, role)
                print('PASS: two original demo posts, one news thread, eleven replies, private safety example and social relationships seeded.')
            elif command == 'verify':
                if len(state['items']) != 14:
                    raise RuntimeError('Expected fourteen fixture entities')
                for key, item in state['items'].items():
                    table = 'posts' if item['kind'] == 'post' else 'replies'
                    response = client.get('/rest/v1/' + table, headers=sessions[item['role']],
                        params={'id': 'eq.'+item['id'], 'select': 'id,body,is_fixture,moderation_state'})
                    response.raise_for_status()
                    rows = response.json()
                    if not rows or hashlib.sha256(rows[0]['body'].encode()).hexdigest() != item['hash'] or not rows[0]['is_fixture']:
                        raise RuntimeError('Fixture missing/changed')
                    other = client.get('/rest/v1/' + table, headers=sessions['B'],
                        params={'id': 'eq.'+item['id'], 'select': 'id,body'})
                    other.raise_for_status()
                    if (key == 'T4-held') != (other.json() == []):
                        raise RuntimeError('Fixture visibility does not match the rehearsal baseline')
                print('PASS: all fourteen fixture hashes and public/private source boundaries verified.')
            elif command == 'prewarm':
                tasks = [('T1','en'),('T1-reply-0','en'),('T1-reply-1','hi')]
                report = []
                outputs = []
                for key, target in tasks:
                    item = state['items'][key]
                    r = httpx.post(api+'/v1/translate', headers=sessions['D'], timeout=60,
                        json={'entity_type':item['kind'],'entity_id':item['id'],'target_language':target}, trust_env=False)
                    report.append({'task':key,'http':r.status_code,'provenance':r.json().get('provenance')})
                    outputs.append({'task':key, 'target':target, 'response':r.json()})
                for target in ['en','hi','ml']:
                    r = httpx.post(api+'/v1/summarize', headers=sessions['D'], timeout=90,
                        json={'entity_type':'post','entity_id':state['items']['T2']['id'],'target_language':target},trust_env=False)
                    report.append({'task':'summary-'+target,'http':r.status_code,'provenance':r.json().get('provenance'),
                                   'native_status':r.json().get('native_status')})
                    outputs.append({'task':'summary-'+target,'response':r.json()})
                (ROOT/'api/.local/demo-prewarm.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
                (ROOT/'api/.local/demo-language-outputs.json').write_text(
                    json.dumps(outputs,indent=2,ensure_ascii=False),encoding='utf-8')
                print(json.dumps(report))
            elif command == 'reset':
                print('Scoped reset affects only manifest fixture publication/manual-hidden states; accounts, source text and audit are preserved.')
                if not apply:
                    print('DRY RUN: rerun reset --apply only when ready for another rehearsal.')
                    return
                statements = []
                for key, item in state['items'].items():
                    table = 'posts' if item['kind'] == 'post' else 'replies'
                    decision = 'blocked' if key == 'T4-held' else 'allowed'
                    statements.append(f"update public.{table} set moderation_state='{decision}',manual_hidden=false "
                        f"where id='{UUID(item['id'])}' and author_id='{UUID(people[item['role']]['id'])}' and is_fixture "
                        f"and deleted_at is null and encode(sha256(convert_to(body,'UTF8')),'hex')='{item['hash']}';")
                local_sql('begin;'+''.join(statements)+'commit;')
                print('PASS: only scoped fixture visibility restored. No quota/history reset or unrelated deletion.')
        finally:
            for headers in sessions.values():
                client.post('/auth/v1/logout', headers=headers, params={'scope':'local'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['seed','verify','prewarm','reset'])
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        run(args.command, args.apply)
    except (RuntimeError, ValueError, KeyError, httpx.HTTPError, subprocess.SubprocessError):
        print('BLOCKED: local demo operation incomplete; verify environment, credentials and exact manifest state.')
        raise SystemExit(1) from None
