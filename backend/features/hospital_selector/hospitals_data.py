"""
Loads hospitals.json once and caches it in memory (1789 hospitals is small
enough that re-reading from disk per request would just be wasted I/O).
"""
import json

from shared.config import get_settings

_hospitals: list[dict] | None = None


def get_hospitals() -> list[dict]:
    global _hospitals
    if _hospitals is None:
        path = get_settings().hospital_data_path
        with open(path, "r", encoding="utf-8") as f:
            _hospitals = json.load(f)
    return _hospitals
