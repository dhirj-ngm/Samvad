import pytest

from tools.check_conversation import run_checks
from tools.check_identity import load_config


@pytest.mark.integration
def test_two_real_accounts_conversation_and_private_reports():
    config = load_config()
    if config is None:
        pytest.skip("Dedicated Supabase development credentials are not configured")
    run_checks(config)
