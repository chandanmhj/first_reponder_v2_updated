from fastapi import APIRouter, Depends, Form, UploadFile

from shared.session import get_current_user

from . import db
from .groq_requesting import analyze_patient_image, build_paramedic_summary, get_bot_reply
from .image_processing import read_and_validate_image
from .media_map import get_media
from .models import ChatResponse, HistoryEntry
from .rag import ensure_ready

router = APIRouter(prefix="/first-responder", tags=["first-responder"])

# Ported from the original bot: phrases that mean professional help has
# arrived, which trigger a paramedic handover summary instead of normal
# step-by-step guidance, and reset the conversation.
ARRIVAL_KEYWORDS = [
    "ambulance arrived", "ambulance is here", "help arrived", "paramedics arrived",
    "doctor arrived", "rescue arrived", "emergency team arrived", "ambulance reached",
    "108 arrived", "they arrived", "rescue team is here", "medics arrived",
]


async def startup():
    await db.init_db()
    # Best-effort: try to ingest the BCLS knowledge base at boot so the first
    # real user isn't the one who pays the embedding-model download/ingest
    # latency. But this must NEVER take down the whole app — NutriScan,
    # Auth, and Hospital Selector have nothing to do with RAG, and a
    # transient network hiccup fetching the embedding model shouldn't kill
    # every feature. If this fails, query_knowledge_base() will retry lazily
    # on the next chat request and degrade to ungrounded replies with a
    # logged error if it keeps failing (see rag.py's query error handling).
    try:
        ensure_ready()
    except Exception as e:
        print(f"[FIRST RESPONDER STARTUP WARNING] RAG ingestion failed at boot, "
              f"will retry lazily on first request: {e}")


def _is_arrival_message(text: str) -> bool:
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in ARRIVAL_KEYWORDS)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: str = Form(...),
    image: UploadFile | None = None,
    user: dict = Depends(get_current_user),
):
    """
    Send a message (and optionally a patient photo) to Jeeva, the First
    Responder assistant. Grounds every reply in retrieved BCLS protocol
    text via RAG. is_emergency is True whenever the model tags a specific
    scenario/step (same signal used to decide whether to surface the
    Call 112 / Navigate to Hospital buttons on the frontend) — there's no
    separate classifier; the tag IS the emergency signal.

    If the message reports that help has arrived (e.g. "ambulance arrived"),
    returns a paramedic handover summary instead, and clears chat history.
    """
    user_id = user["user_id"]
    username = user["username"]

    if _is_arrival_message(message):
        history = await db.get_recent_messages(user_id)
        summary = build_paramedic_summary(history)
        await db.clear_history(user_id)
        handover_text = (
            "Paramedic Handover Summary\n\n"
            f"{summary}\n\n"
            "Professional help has arrived. You did great! "
            "The patient is now in safe hands — stay calm and cooperate with the paramedics."
        )
        return ChatResponse(reply=handover_text, is_emergency=False, is_handover_summary=True)

    image_description = ""
    if image is not None:
        data_url = await read_and_validate_image(image)
        image_description = analyze_patient_image(data_url)

    history = await db.get_recent_messages(user_id)
    reply, scenario, step = get_bot_reply(message, history, image_description)

    media_url, media_type = (None, None)
    if scenario and step:
        media_url, media_type = get_media(scenario, step)

    await db.add_turn(user_id, username, message, reply, scenario, step)

    return ChatResponse(
        reply=reply,
        is_emergency=scenario is not None,
        scenario=scenario,
        step=step,
        media_url=media_url,
        media_type=media_type,
    )


@router.get("/history", response_model=list[HistoryEntry])
async def history(user: dict = Depends(get_current_user), limit: int = 50):
    return await db.get_history(user["user_id"], limit=limit)
