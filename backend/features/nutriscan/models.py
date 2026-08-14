from datetime import datetime

from pydantic import BaseModel, Field


class FoodItem(BaseModel):
    name: str
    estimated_quantity: str  # e.g. "1 medium bowl", "200g"
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    # Optional, only populated when the item came from a printed nutrition
    # label (via /analyze-label) rather than a meal-photo estimate.
    sugar_g: float | None = None
    sodium_mg: float | None = None
    fiber_g: float | None = None


class AnalyzeResponse(BaseModel):
    items: list[FoodItem]
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_sugar_g: float | None = None
    total_sodium_mg: float | None = None
    total_fiber_g: float | None = None
    confidence_note: str  # model's own caveat, e.g. "estimate, portion size approximate"
    source: str = "meal_photo"  # "meal_photo" or "nutrition_label"
    advisory: str  # rule-based verdict against today's already-logged totals


class LogEntryRequest(BaseModel):
    meal_type: str = Field(pattern="^(breakfast|lunch|dinner|snack)$")
    items: list[FoodItem]
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_sugar_g: float = 0.0
    total_sodium_mg: float = 0.0
    total_fiber_g: float = 0.0


class LogEntryResponse(BaseModel):
    id: int
    session_id: str
    username: str
    meal_type: str
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_sugar_g: float
    total_sodium_mg: float
    total_fiber_g: float
    items_json: str
    created_at: datetime


class DailySummaryResponse(BaseModel):
    date: str
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_sugar_g: float
    total_sodium_mg: float
    total_fiber_g: float
    entry_count: int
