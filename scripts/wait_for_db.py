"""
Aurix - Block until the database accepts TCP connections.

Pure-stdlib so it runs before the Django/psycopg dependency chain is
ready. Keeps the entrypoint script free of bash-isms.
"""
from __future__ import annotations

import os
import socket
import sys
import time
from urllib.parse import urlparse

TIMEOUT_SECONDS = 60
SLEEP_SECONDS = 1


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("[wait_for_db] DATABASE_URL not set; skipping wait.")
        return 0

    parsed = urlparse(url)
    host = parsed.hostname or "db"
    port = parsed.port or 5432

    deadline = time.monotonic() + TIMEOUT_SECONDS
    attempt = 0
    while time.monotonic() < deadline:
        attempt += 1
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"[wait_for_db] {host}:{port} reachable after {attempt}s.")
                return 0
        except OSError:
            time.sleep(SLEEP_SECONDS)

    print(
        f"[wait_for_db] {host}:{port} still not reachable after {TIMEOUT_SECONDS}s.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
