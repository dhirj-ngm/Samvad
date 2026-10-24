import json

import pytest

from tools import prepare_p6
from tools.prepare_p6 import (
    check_bundle,
    check_ledger,
    check_manifest,
    private_host,
    validate_config,
)


@pytest.mark.parametrize('host', ['127.0.0.1', '8.8.8.8', '169.254.1.1', '::1',
                                 '192.168.1.2/24', '192.168.1.2:8086'])
def test_release_preflight_rejects_non_lan_or_ambiguous_host(host):
    with pytest.raises(ValueError):
        private_host(host)


@pytest.mark.parametrize('host', ['10.0.0.1', '172.16.1.2', '192.168.40.199'])
def test_release_preflight_accepts_private_ipv4(host):
    assert private_host(host) == host


def test_migration_gate_rejects_missing_or_unknown_versions():
    assert check_ledger([{'version': '1'}, {'version': '2'}], ['2', '1']) == 2
    for rows in [[{'version': '1'}], [{'version': '1'}, {'version': '3'}]]:
        with pytest.raises(ValueError):
            check_ledger(rows, ['1', '2'])


@pytest.mark.parametrize('url', ['http://192.168.1.3:8086/index.bundle',
                               'https://public.example/index.bundle',
                               'http://user:pass@192.168.1.2:8086/index.bundle'])
def test_release_preflight_rejects_wrong_bundle_destination(url):
    data = {'extra': {'expoClient': {'hostUri': '192.168.1.2:8086'}},
            'launchAsset': {'url': url}}
    with pytest.raises(ValueError):
        check_manifest(data, '192.168.1.2')


def test_release_preflight_requires_current_manifest_host():
    data = {'extra': {'expoClient': {'hostUri': '192.168.1.2:8086'}},
            'launchAsset': {'url': 'http://192.168.1.2:8086/index.bundle?platform=ios'}}
    check_manifest(data, '192.168.1.2')
    with pytest.raises(ValueError):
        check_manifest(data, '192.168.1.3')


def test_correct_manifest_cannot_mask_stale_compiled_backend():
    content = b'http://192.168.1.2:54321 http://192.168.1.2:8775'
    check_bundle(content, '192.168.1.2')
    with pytest.raises(ValueError, match='Compiled mobile backend'):
        check_bundle(content, '192.168.1.3')
    with pytest.raises(ValueError):
        check_bundle(b'http://192.168.1.2:54321 https://old.example', '192.168.1.2')


def test_release_preflight_never_treats_publication_enabled_as_approved(tmp_path, monkeypatch):
    # Pin environment to isolate this test from any operator settings.
    for name in ['LOCAL_DEMO_MODE', 'AI_DEMO_ENABLED', 'AI_LANGUAGE_REVIEW_PASSED',
                 'SUPABASE_URL', 'SUPABASE_JWKS_URL']:
        monkeypatch.delenv(name, raising=False)
    path = tmp_path / 'local.env'
    values = {'LOCAL_DEMO_MODE': True, 'AI_DEMO_ENABLED': True,
              'SUPABASE_URL': 'http://127.0.0.1:54321'}
    def save():
        path.write_text('\n'.join(k + '=' + json.dumps(v) for k, v in values.items()))
    save()
    assert 'OFF' in validate_config(path)
    values['AI_LANGUAGE_REVIEW_PASSED'] = True
    save()
    with pytest.raises(ValueError, match='publication OFF'):
        validate_config(path)


def test_source_snapshot_allows_templates_but_refuses_private_configuration(tmp_path, monkeypatch):
    monkeypatch.setattr(prepare_p6, 'ROOT', tmp_path)
    (tmp_path / '.env.example').write_text('NAME=placeholder\n')
    visible = ['.env.example']
    def git(args):
        if args[1] == 'ls-files':
            return '\0'.join(visible) + '\0'
        return 'test'
    monkeypatch.setattr(prepare_p6, 'command', git)
    assert list(prepare_p6.source_snapshot()['files']) == visible
    visible.append('.env.private')
    with pytest.raises(RuntimeError, match='private artifact'):
        prepare_p6.source_snapshot()


def test_source_snapshot_changes_when_source_changes(tmp_path, monkeypatch):
    monkeypatch.setattr(prepare_p6, 'ROOT', tmp_path)
    monkeypatch.setattr(prepare_p6, 'command', lambda args:
                        'source.py\0' if args[1] == 'ls-files' else 'test')
    path = tmp_path / 'source.py'
    path.write_text('first')
    before = prepare_p6.source_snapshot()['source_sha256']
    path.write_text('second')
    assert prepare_p6.source_snapshot()['source_sha256'] != before
    path.unlink()
    assert prepare_p6.source_snapshot()['files']['source.py'] == 'MISSING'
