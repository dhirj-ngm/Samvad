from tools.prepare_p5_review import render_review


def test_offline_review_escapes_source_and_output_and_excludes_private_fields():
    manifest = {'threads': [{'key': 'T1', 'root': {'body': 'Hello @demo_ananya <script>bad</script>'},
                             'replies': []}]}
    outputs = [{'task': 'T1', 'response': {'translated_text': '<img src="https://bad"> नमस्ते',
                                          'provenance': 'cache', 'token': 'DO-NOT-EXPORT'}}]
    result = render_review(manifest, outputs, {'demo_ananya': 'reader'})
    assert '@reader' in result
    assert '<script>' not in result and '&lt;script&gt;' in result
    assert '<img' not in result
    assert 'DO-NOT-EXPORT' not in result
    assert "default-src 'none'" in result
    assert 'PENDING' in result and 'not recorded' in result


def test_offline_summary_review_keeps_both_languages_and_source():
    manifest = {'threads': [{'key': 'T2', 'root': {'body': 'Original proposal'}, 'replies': []}]}
    outputs = [{'task': 'summary-ml', 'response': {'english_lines': ['English'],
                'native_lines': ['മലയാളം'], 'native_status': 'available', 'provenance': 'live'}}]
    result = render_review(manifest, outputs, {})
    assert all(text in result for text in ['Original proposal', 'English', 'മലയാളം', 'available', 'live'])
