import json

import pytest

from tools import demo_accounts, start_ai_demo


def test_fresh_mapping_is_private_unique_and_never_overwrites_existing(tmp_path, monkeypatch):
    path = tmp_path / '.local' / 'accounts.json'
    monkeypatch.setattr(demo_accounts, 'PRIVATE', path)
    demo_accounts.initialize_mapping()
    original = path.read_bytes()
    data = json.loads(original)
    accounts = data['accounts'] + [data['existing']]
    assert len({a['email'] for a in accounts}) == 4
    assert len({a['password'] for a in accounts}) == 4
    assert all(len(a['password']) >= 24 for a in accounts)
    assert {a['language'] for a in accounts} == {'en', 'hi', 'ml'}
    with pytest.raises(FileExistsError):
        demo_accounts.initialize_mapping()
    assert path.read_bytes() == original


def test_cache_only_cannot_approve_publication():
    with pytest.raises(ValueError, match='cannot approve'):
        start_ai_demo.start('192.168.1.2', review_approved=True, cache_only=True)


def test_cache_only_launcher_disables_inference_without_keys(tmp_path, monkeypatch):
    (tmp_path / 'api').mkdir()
    monkeypatch.setattr(start_ai_demo, 'ROOT', tmp_path)
    monkeypatch.setattr(start_ai_demo, 'local_status', lambda: {
        'API_URL': 'http://127.0.0.1:54321', 'ANON_KEY': 'public', 'SERVICE_ROLE_KEY': 'private'})
    class Probe:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def bind(self, address):
            pass
        def connect_ex(self, address):
            return 1
    monkeypatch.setattr(start_ai_demo.socket, 'socket', Probe)
    captured = {}
    class Child:
        pid = 123
    def launch(command, **kwargs):
        captured.update(kwargs['env'])
        return Child()
    monkeypatch.setattr(start_ai_demo.subprocess, 'Popen', launch)
    monkeypatch.setattr(start_ai_demo.subprocess, 'CREATE_NO_WINDOW', 0, raising=False)
    start_ai_demo.start('192.168.1.2', cache_only=True)
    assert captured['AI_ENABLED'] == 'false'
    assert captured['SARVAM_ACCOUNT_USE_AUTHORIZED'] == 'false'
    assert captured['AI_LANGUAGE_REVIEW_PASSED'] == 'false'
    assert captured['SUPABASE_URL'] == 'http://127.0.0.1:54321'
