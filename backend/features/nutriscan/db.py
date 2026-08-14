"""
SQLite storage for NutriScan meal logs.

Isolation model: ONE shared table, not one file/table per user. Every row is
scoped by session_id (which holds the authenticated user's id, taken from
their JWT — the column name is historical, predating real auth). Every
query below filters on it, so a user can only ever read/modify their own
rows; there is no code path that lets a request see another user's data.

username is stored directly on each row (in addition to session_id) so a
record is self-contained and human-readable without joining back to the
users table — e.g. for exporting a user's log, or displaying "who logged
this" without an extra lookup.

Uses aiosqlite so it doesn't block the FastAPI event loop.
"""
import json
import os
from datetime import datetime, timezone

import aiosqlite

from shared.config import get_settings

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    meal_type TEXT NOT NULL,
    total_calories REAL NOT NULL,
    total_protein_g REAL NOT NULL,
    total_carbs_g REAL NOT NULL,
    total_fat_g REAL NOT NULL,
    total_sugar_g REAL NOT NULL DEFAULT 0,
    total_sodium_mg REAL NOT NULL DEFAULT 0,
    total_fiber_g REAL NOT NULL DEFAULT 0,
    items_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""

CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_meal_logs_session_created
ON meal_logs (session_id, created_at);
"""

# Columns added after the initial release. Applied defensively on startup so
# existing local dev databases created before this change don't need to be
# deleted by hand.
_MIGRATION_COLUMNS = [
    ("total_sugar_g", "REAL NOT NULL DEFAULT 0"),
    ("total_sodium_mg", "REAL NOT NULL DEFAULT 0"),
    ("total_fiber_g", "REAL NOT NULL DEFAULT 0"),
    ("username", "TEXT NOT NULL DEFAULT ''"),
]


async def init_db() -> None:
    db_path = get_settings().nutriscan_db_path
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
    async with aiosqlite.connect(db_path) as db:
        await db.execute(CREATE_TABLE_SQL)
        await db.execute(CREATE_INDEX_SQL)

        cursor = await db.execute("PRAGMA table_info(meal_logs)")
        existing_cols = {row[1] for row in await cursor.fetchall()}
        for col_name, col_def in _MIGRATION_COLUMNS:
            if col_name not in existing_cols:
                await db.execute(f"ALTER TABLE meal_logs ADD COLUMN {col_name} {col_def}")

        await db.commit()


async def insert_entry(session_id: str, username: str, meal_type: str, total_calories: float,
                        total_protein_g: float, total_carbs_g: float,
                        total_fat_g: float, items: list[dict],
                        total_sugar_g: float = 0.0, total_sodium_mg: float = 0.0,
                        total_fiber_g: float = 0.0) -> dict:
    db_path = get_settings().nutriscan_db_path
    created_at = datetime.now(timezone.utc).isoformat()
    items_json = json.dumps(items)

    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            """
            INSERT INTO meal_logs
                (session_id, username, meal_type, total_calories, total_protein_g,
                 total_carbs_g, total_fat_g, total_sugar_g, total_sodium_mg,
                 total_fiber_g, items_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, username, meal_type, total_calories, total_protein_g,
             total_carbs_g, total_fat_g, total_sugar_g, total_sodium_mg,
             total_fiber_g, items_json, created_at),
        )
        await db.commit()
        entry_id = cursor.lastrowid

    return {
        "id": entry_id,
        "session_id": session_id,
        "username": username,
        "meal_type": meal_type,
        "total_calories": total_calories,
        "total_protein_g": total_protein_g,
        "total_carbs_g": total_carbs_g,
        "total_fat_g": total_fat_g,
        "total_sugar_g": total_sugar_g,
        "total_sodium_mg": total_sodium_mg,
        "total_fiber_g": total_fiber_g,
        "items_json": items_json,
        "created_at": created_at,
    }


async def get_history(session_id: str, limit: int = 50) -> list[dict]:
    db_path = get_settings().nutriscan_db_path
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT * FROM meal_logs
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (session_id, limit),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_daily_summary(session_id: str, date_str: str) -> dict:
    """date_str in 'YYYY-MM-DD' format, matched against created_at prefix (UTC)."""
    db_path = get_settings().nutriscan_db_path
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT
                COALESCE(SUM(total_calories), 0) AS total_calories,
                COALESCE(SUM(total_protein_g), 0) AS total_protein_g,
                COALESCE(SUM(total_carbs_g), 0) AS total_carbs_g,
                COALESCE(SUM(total_fat_g), 0) AS total_fat_g,
                COALESCE(SUM(total_sugar_g), 0) AS total_sugar_g,
                COALESCE(SUM(total_sodium_mg), 0) AS total_sodium_mg,
                COALESCE(SUM(total_fiber_g), 0) AS total_fiber_g,
                COUNT(*) AS entry_count
            FROM meal_logs
            WHERE session_id = ? AND created_at LIKE ?
            """,
            (session_id, f"{date_str}%"),
        )
        row = await cursor.fetchone()
        return dict(row)


async def delete_entry(session_id: str, entry_id: int) -> bool:
    db_path = get_settings().nutriscan_db_path
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            "DELETE FROM meal_logs WHERE id = ? AND session_id = ?",
            (entry_id, session_id),
        )
        await db.commit()
        return cursor.rowcount > 0
