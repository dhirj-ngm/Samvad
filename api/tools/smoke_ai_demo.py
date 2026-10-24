"""Exercise local HTTP authorization and durable submission without provider calls."""
import hashlib
import json
from contextlib import nullcontext
from uuid import uuid4

import httpx

from tools.demo_accounts import PRIVATE, local_status, session_for


def run(api_client=None):
    status = local_status()
    people = json.loads(PRIVATE.read_text(encoding='utf-8'))
    admin = {'apikey':status['SERVICE_ROLE_KEY'], 'Authorization':'Bearer '+status['SERVICE_ROLE_KEY']}
    sessions = []
    post = None
    with httpx.Client(base_url=status['API_URL'], headers={'apikey':status['ANON_KEY']},
                      timeout=25, trust_env=False) as db, (
                          nullcontext(api_client) if api_client is not None else httpx.Client(
                              base_url='http://127.0.0.1:8775', timeout=30, trust_env=False)) as api:
        try:
            author = session_for(db, people['accounts'][0], admin); sessions.append(author)
            reviewer = session_for(db, people['existing'], admin); sessions.append(reviewer)
            assert api.post('/v1/review-queue').status_code == 401
            assert api.post('/v1/review-queue', headers=author).status_code == 403
            assert api.post('/v1/review-queue', headers=reviewer).status_code == 200
            payload = {'entity_type':'post','request_id':str(uuid4()),
                       'body':'Local AI verification post; removed after this check.','language':'en'}
            first = api.post('/v1/submit-and-screen', headers=author, json=payload)
            assert first.status_code == 202
            result = first.json(); post = result['id']
            assert result['screening_status'] == 'evaluation_pending' and result['saved']
            again = api.post('/v1/submit-and-screen', headers=author, json=payload)
            assert again.status_code == 202 and again.json()['id'] == post
            private = db.get('/rest/v1/posts', params={'id':'eq.'+post,'select':'id'}, headers=reviewer)
            assert private.status_code == 200 and private.json() == []
            decision = {'entity_type':'post','entity_id':post,'request_id':str(uuid4()),
                        'source_hash':hashlib.sha256(payload['body'].encode()).hexdigest(),
                        'expected_state':'pending','action':'approve','reason':'Benign temporary local verification'}
            first_review = api.post('/v1/review', headers=reviewer, json=decision)
            assert first_review.status_code == 200 and first_review.json()['status'] == 'allowed'
            assert api.post('/v1/review', headers=reviewer, json=decision).json() == first_review.json()
            public = db.get('/rest/v1/posts', params={'id':'eq.'+post,'select':'id'}, headers=reviewer)
            assert public.status_code == 200 and len(public.json()) == 1
            print('PASS: actual local Auth, ordinary-user denial, private pending save, stable retry, reviewer approval/audit and public release.')
        finally:
            if post:
                removed = db.post('/rest/v1/rpc/delete_own_post',headers=author,json={'p_post_id':post})
                removed.raise_for_status()
            for headers in sessions:
                db.post('/auth/v1/logout',headers=headers,params={'scope':'local'})


if __name__ == '__main__':
    run()
