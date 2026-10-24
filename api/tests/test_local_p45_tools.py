import struct
import zlib

import pytest

from tools.check_social import PNG, PUBLIC
from tools.prepare_local_p45 import local_origin


@pytest.mark.parametrize("url", ["http://127.0.0.1:54321", "http://localhost:54321/"])
def test_local_fixture_tools_accept_only_loopback(url):
    assert local_origin(url) == url.rstrip("/")


@pytest.mark.parametrize("url", [
    "https://mtgsyjqcoyzijicpydee.supabase.co", "http://192.168.1.2:54321",
    "http://localhost.evil.test", "http://user:password@localhost:54321",
    "http://localhost:54321/rest/v1", "http://localhost:54321?remote=true",
])
def test_local_fixture_tools_reject_hosted_or_ambiguous_targets(url):
    with pytest.raises(ValueError, match="Only loopback"):
        local_origin(url)


def test_storage_probe_is_an_actual_png_and_public_projection_excludes_identity():
    assert PNG.startswith(b"\x89PNG\r\n\x1a\n")
    offset = 8
    while offset < len(PNG):
        size = struct.unpack(">I", PNG[offset:offset + 4])[0]
        chunk = PNG[offset + 4:offset + 8 + size]
        checksum = struct.unpack(">I", PNG[offset + 8 + size:offset + 12 + size])[0]
        assert zlib.crc32(chunk) & 0xffffffff == checksum
        offset += 12 + size
    assert "email" not in PUBLIC
    assert "verification_status" not in PUBLIC
