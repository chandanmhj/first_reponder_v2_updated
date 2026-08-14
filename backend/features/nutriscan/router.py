from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from shared.session import get_current_user, get_current_user_id

from . import db
from .advisory import build_advisory
from .groq_requesting import analyze_label_image, analyze_meal_image
from .image_processing import read_and_validate_image, to_base64_data_url
from .models import AnalyzeResponse, DailySummaryResponse, LogEntryRequest, LogEntryResponse

router = APIRouter(prefix="/nutriscan", tags=["nutriscan"])


async def startup():
    await db.init_db()


def _sum_optional(items: list[dict], key: str) -> float | None:
    """Sums a field across items, but only if at least one item actually has it
    (so a meal-photo response with no sugar data returns None, not 0)."""
    values = [i[key] for i in items if i.get(key) is not None]
    if not values:
        return None
    return round(sum(values), 1)


async def _build_analyze_response(parsed: dict, source: str, user_id: str) -> AnalyzeResponse:
    items = parsed.get("items", [])
    total_calories = sum(i["calories"] for i in items)
    total_protein_g = sum(i["protein_g"] for i in items)
    total_carbs_g = sum(i["carbs_g"] for i in items)
    total_fat_g = sum(i["fat_g"] for i in items)
    total_sugar_g = _sum_optional(items, "sugar_g")
    total_sodium_mg = _sum_optional(items, "sodium_mg")
    total_fiber_g = _sum_optional(items, "fiber_g")

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_totals = await db.get_daily_summary(user_id, today_str)
    advisory = build_advisory(
        today_totals=today_totals,
        item_calories=round(total_calories, 1),
        item_sugar_g=total_sugar_g,
        item_sodium_mg=total_sodium_mg,
    )

    return AnalyzeResponse(
        items=items,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein_g, 1),
        total_carbs_g=round(total_carbs_g, 1),
        total_fat_g=round(total_fat_g, 1),
        total_sugar_g=total_sugar_g,
        total_sodium_mg=total_sodium_mg,
        total_fiber_g=total_fiber_g,
        confidence_note=parsed.get("confidence_note", ""),
        source=source,
        advisory=advisory,
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile, user_id: str = Depends(get_current_user_id)):
    """
    Upload a meal photo -> Groq vision ESTIMATES food items + nutrition from
    general food knowledge. Use this for photos of actual food, not labels.
    Does NOT save anything yet — frontend shows this to the user to confirm,
    then calls /nutriscan/log to actually persist it. Response includes an
    'advisory' string comparing this item against what the user already
    logged today.
    """
    raw, content_type = await read_and_validate_image(file)
    data_url = to_base64_data_url(raw, content_type)

    try:
        parsed = analyze_meal_image(data_url)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # Groq/network errors
        raise HTTPException(status_code=502, detail=f"Groq request failed: {exc}") from exc

    return await _build_analyze_response(parsed, source="meal_photo", user_id=user_id)


@router.post("/analyze-label", response_model=AnalyzeResponse)
async def analyze_label(file: UploadFile, user_id: str = Depends(get_current_user_id)):
    """
    Upload a photo of a packaged food's printed nutrition facts label ->
    Groq vision EXTRACTS the exact printed values (no estimation). Same
    response shape as /analyze, so the frontend and /log flow are identical
    regardless of which mode was used.
    """
    raw, content_type = await read_and_validate_image(file)
    data_url = to_base64_data_url(raw, content_type)

    try:
        parsed = analyze_label_image(data_url)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # Groq/network errors
        raise HTTPException(status_code=502, detail=f"Groq request failed: {exc}") from exc

    return await _build_analyze_response(parsed, source="nutrition_label", user_id=user_id)


@router.post("/log", response_model=LogEntryResponse)
async def log_entry(payload: LogEntryRequest, user: dict = Depends(get_current_user)):
    """Persist a confirmed meal entry (called after the user reviews /analyze output).
    Stores the username directly on the row so each record is self-contained."""
    saved = await db.insert_entry(
        session_id=user["user_id"],
        username=user["username"],
        meal_type=payload.meal_type,
        total_calories=payload.total_calories,
        total_protein_g=payload.total_protein_g,
        total_carbs_g=payload.total_carbs_g,
        total_fat_g=payload.total_fat_g,
        total_sugar_g=payload.total_sugar_g,
        total_sodium_mg=payload.total_sodium_mg,
        total_fiber_g=payload.total_fiber_g,
        items=[item.model_dump() for item in payload.items],
    )
    return saved


@router.get("/history", response_model=list[LogEntryResponse])
async def history(user_id: str = Depends(get_current_user_id), limit: int = 50):
    return await db.get_history(user_id, limit=limit)


@router.get("/daily-summary", response_model=DailySummaryResponse)
async def daily_summary(user_id: str = Depends(get_current_user_id), date: str | None = None):
    date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    summary = await db.get_daily_summary(user_id, date_str)
    return DailySummaryResponse(date=date_str, **summary)


@router.delete("/entry/{entry_id}")
async def delete_entry(entry_id: int, user_id: str = Depends(get_current_user_id)):
    deleted = await db.delete_entry(user_id, entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found for this account.")
    return {"deleted": True, "id": entry_id}
