import pytest

from tools.check_discovery import run_checks
from tools.check_identity import load_config


@pytest.mark.integration
def test_two_real_accounts_discovery_and_publishing():
    config = load_config()
    if config is None:
        pytest.skip("Dedicated Supabase development credentials are not configured")
    run_checks(config)
