"""
Aurix - Cache helpers.

Thin wrappers over Django's cache so the rest of the codebase doesn't need
to know whether we're on Redis or locmem.
"""
from __future__ import annotations

from typing import Any, Callable, TypeVar

from django.core.cache import cache

T = TypeVar("T")


def get_or_set(key: str, producer: Callable[[], T], ttl_seconds: int) -> T:
    """
    Read `key` from cache, or call `producer()` to populate it.

    Note: We use Django's built-in `get_or_set`, which is atomic at the
    cache level for Redis. For locmem in dev, a small race is acceptable.
    """
    return cache.get_or_set(key, producer, timeout=ttl_seconds)


def invalidate(key: str) -> None:
    cache.delete(key)
