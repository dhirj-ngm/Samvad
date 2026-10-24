"""Build an offline human review sheet from existing local outputs. No inference."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def render_review(manifest, outputs, handles):
    sources = {}
    for thread in manifest['threads']:
        if thread['root']:
            sources[thread['key']] = thread['root']['body']
        for index, reply in enumerate(thread['replies']):
            sources[f"{thread['key']}-reply-{index}"] = reply['body']
    for key, text in sources.items():
        for alias, handle in handles.items():
            text = text.replace('@' + alias, '@' + handle)
        sources[key] = text

    def block(title, text):
        return '<h3>' + html.escape(title) + '</h3><pre>' + html.escape(text) + '</pre>'

    sections = []
    for item in outputs:
        task = item['task']
        response = item['response']
        source = sources.get('T2' if task.startswith('summary-') else task)
        if source is None:
            raise ValueError('Output source does not match the demo manifest')
        result = block('Original source', source)
        if task.startswith('summary-'):
            result += block('English summary', '\n'.join(response.get('english_lines', [])))
            result += block('Native summary', '\n'.join(response.get('native_lines', [])))
            result += block('Native status', response.get('native_status', 'not recorded'))
        else:
            result += block('Translation', response.get('translated_text', 'No successful output recorded'))
        result += block('Recorded response provenance', response.get('provenance', 'not recorded'))
        result += '<p>Meaning / negation / names / numbers / tone / native script / source grounding:</p>'
        result += '<p>Reviewer: __________ Date: __________ PASS / FAIL: __________</p><p>Corrections: ____________________</p>'
        sections.append('<section><h2>' + html.escape(task) + '</h2>' + result + '</section>')
    return '''<!doctype html><html lang="en"><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Samvad P5 human review — pending</title>
<style>body{font:18px system-ui;max-width:960px;margin:32px auto;padding:0 20px;color:#172c2a}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.7;background:#f5f5f0;padding:16px}
section{border-top:1px solid #aaa;margin-top:30px;break-inside:avoid}</style>
<h1>P5 human language review — PENDING</h1>
<p>Existing saved provider responses; no new generation or provider request. A human must compare
each output with its original. This page does not grant publication approval.</p>
<p>Exact model/prompt versions at generation: not recorded by the legacy output file.
Record verified generation metadata separately; do not infer it from current settings.</p>
<p>Fixture source text comes from the manifest with public mention handles substituted.
Run tools.demo_data verify to confirm the deployed fixtures still match.</p>
<p>This sheet covers prepared translation/summary examples only. The separate EN/HI/ML,
code-mixed and abuse-policy matrix in docs/AI_LANGUAGE_REVIEW.md is still required.</p>
''' + ''.join(sections) + '</html>'


def run():
    local = ROOT / 'api/.local'
    manifest = json.loads((ROOT / 'api/demo/manifest.json').read_text(encoding='utf-8'))
    outputs = json.loads((local / 'demo-language-outputs.json').read_text(encoding='utf-8'))
    people = json.loads((local / 'demo-accounts.json').read_text(encoding='utf-8'))
    accounts = people['accounts'] + [people['existing']]
    handles = dict(zip(['demo_ananya', 'demo_aarav', 'demo_meera', 'demo_faiz'],
                       [account['handle'] for account in accounts], strict=True))
    destination = local / 'p5-language-review.html'
    destination.write_text(render_review(manifest, outputs, handles), encoding='utf-8')
    print('Prepared ignored api/.local/p5-language-review.html. Human review is PENDING; no inference.')


if __name__ == '__main__':
    try:
        run()
    except (OSError, ValueError, KeyError, TypeError):
        print('BLOCKED: existing local outputs/manifest/account mapping are missing or incompatible. '
              'No content was generated; private values omitted.')
        raise SystemExit(1) from None
