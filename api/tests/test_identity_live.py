import pytest

from tools.check_identity import load_config, run_checks


@pytest.mark.integration
def test_two_real_development_accounts():
    config = load_config()
    if config is None:
        pytest.skip("Development Supabase access and two real account credentials are not configured")
    run_checks(config)
