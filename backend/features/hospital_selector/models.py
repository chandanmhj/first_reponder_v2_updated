from pydantic import BaseModel, Field


class NearestHospitalRequest(BaseModel):
    description: str = Field(min_length=1, description="Distress/symptom description, e.g. 'chest pain and breathless'")
    lat: float
    lng: float
    top_n: int = Field(default=5, ge=1, le=20)


class HospitalResult(BaseModel):
    name: str
    lat: float
    lng: float
    type: str | None = None
    specialties: list[str]
    emergency: str | None = None
    operator_type: str | None = None
    phone: str | None = None
    distance_km: float
    relevance_score: float
    combined_score: float


class NearestHospitalResponse(BaseModel):
    results: list[HospitalResult]
