"""
SQLite storage for First Responder chat history.

Replaces the original bot's in-memory session_store.py (a plain dict keyed
by Telegram chat_id, wiped on every restart) with persistent storage keyed
by the authenticated user's id — same isolation pattern as NutriScan's
meal_logs: every query is scoped to session_id (the user's id from their JWT).

One row per conversation turn (user message + assistant reply together).
When building the message list to send back to Groq for context, each row
expands into two entries so it matches the shape the original in-memory
session store produced.
"""
import os
from datetime import datetime, timezone

import aiosqlite

from shared.config import get_settings

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    scenario TEXT,
    step INTEGER,
    is_emergency INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
"""

CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_chat_history_session_created
ON chat_history (session_id, created_at);
"""

MAX_HISTORY_TURNS = 10  # matches the original bot's MAX_HISTORY=20 messages (10 turns)


def _db_path() -> str:
    return get_settings().first_responder_db_path


async def init_db() -> None:
    db_path = _db_path()
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
    async with aiosqlite.connect(db_path) as db:
        await db.execute(CREATE_TABLE_SQL)
        await db.execute(CREATE_INDEX_SQL)
        await db.commit()


async def add_turn(session_id: str, username: str, message: str, reply: str,
                    scenario: str | None, step: int | None) -> None:
    created_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(_db_path()) as db:
        await db.execute(
            """
            INSERT INTO chat_history
                (session_id, username, message, reply, scenario, step, is_emergency, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, username, message, reply, scenario, step, int(scenario is not None), created_at),
        )
        await db.commit()


async def get_recent_messages(session_id: str, max_turns: int = MAX_HISTORY_TURNS) -> list[dict]:
    """Returns the last `max_turns` conversation turns as an alternating
    user/assistant message list, oldest first — ready to feed straight into
    a Groq chat.completions call as prior context."""
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT message, reply FROM chat_history
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (session_id, max_turns),
        )
        rows = await cursor.fetchall()

    rows = list(reversed(rows))  # oldest first
    messages = []
    for row in rows:
        messages.append({"role": "user", "content": row["message"]})
        messages.append({"role": "assistant", "content": row["reply"]})
    return messages


async def get_history(session_id: str, limit: int = 50) -> list[dict]:
    """Full history rows for the /history endpoint (not the LLM-context shape)."""
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT * FROM chat_history
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (session_id, limit),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def clear_history(session_id: str) -> None:
    """Called after a paramedic handover summary — matches the original
    bot's clear_session(), which reset context once professional help arrived."""
    async with aiosqlite.connect(_db_path()) as db:
        await db.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
        await db.commit()
