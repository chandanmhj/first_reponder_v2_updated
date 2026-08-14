from datetime import datetime

from pydantic import BaseModel


class ChatResponse(BaseModel):
    reply: str
    is_emergency: bool
    scenario: str | None = None
    step: int | None = None
    media_url: str | None = None
    media_type: str | None = None  # "image" or "video"
    is_handover_summary: bool = False  # True when this reply is a paramedic handover, not normal guidance


class HistoryEntry(BaseModel):
    id: int
    session_id: str
    username: str
    message: str
    reply: str
    scenario: str | None
    step: int | None
    is_emergency: bool
    created_at: datetime
