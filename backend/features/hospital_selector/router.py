from fastapi import APIRouter, Depends

from shared.session import get_current_user_id

from .matcher import ensure_ready, find_nearest
from .models import NearestHospitalRequest, NearestHospitalResponse

router = APIRouter(prefix="/hospital-selector", tags=["hospital-selector"])


async def startup():
    ensure_ready()  # build the TF-IDF index now, not on the first request


@router.post("/nearest", response_model=NearestHospitalResponse)
async def nearest(payload: NearestHospitalRequest, user_id: str = Depends(get_current_user_id)):
    """
    Given a distress description and live coordinates, ranks hospitals by a
    blend of specialty relevance (TF-IDF) and proximity (haversine), with a
    small bonus for hospitals flagged emergency-capable. Called internally
    by First Responder's Navigate to Hospital button, and also exposed
    directly here.
    """
    results = find_nearest(payload.description, payload.lat, payload.lng, top_n=payload.top_n)
    return NearestHospitalResponse(results=results)
