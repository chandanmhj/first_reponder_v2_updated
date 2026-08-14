"""
Ranks hospitals for a given distress description + live coordinates by
combining two signals:

1. Specialty relevance — TF-IDF cosine similarity between the distress
   description and each hospital's specialty text (expanded via
   specialty_keywords.py so there's real lexical overlap to match against).
2. Proximity — haversine distance from the caller's live lat/lng.

The vectorizer is fit once over all 1789 hospitals at first use and cached,
so repeated requests don't re-fit it.
"""
import math

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .hospitals_data import get_hospitals
from .specialty_keywords import specialty_text

EARTH_RADIUS_KM = 6371.0
# Raw TF-IDF cosine similarity typically maxes out around 0.2-0.5 even for a
# strong match (short, sparse specialty documents), while proximity_score
# approaches 1.0 for anything under ~1km. A naive 50/50 blend of the raw
# numbers means proximity always wins and specialty relevance is close to
# meaningless — verified this empirically: a pediatric-emergency query
# failed to surface ANY pediatric-specialty hospital in the top 3, even
# though one existed with the highest relevance score in the entire
# dataset, simply because a generic nearby hospital's proximity score
# numerically dwarfed it. Fix: normalize relevance against the best
# relevance found for THIS query, so the top specialty match is on the same
# 0-1 scale as proximity before they're combined.
WEIGHT_RELEVANCE = 0.6
WEIGHT_PROXIMITY = 0.4
EMERGENCY_CAPABLE_BONUS = 0.05  # small tiebreaker, not a dominant factor

_vectorizer: TfidfVectorizer | None = None
_hospital_matrix = None
_hospitals_cache: list[dict] | None = None


def ensure_ready() -> None:
    """Forces the TF-IDF index to be built now. Called at app startup so the
    fit cost (fast, but non-zero) happens once at boot rather than on
    whoever sends the first request."""
    _get_index()


def _get_index():
    global _vectorizer, _hospital_matrix, _hospitals_cache
    if _vectorizer is None:
        hospitals = get_hospitals()
        docs = [specialty_text(h.get("specialties", [])) for h in hospitals]
        _vectorizer = TfidfVectorizer()
        _hospital_matrix = _vectorizer.fit_transform(docs)
        _hospitals_cache = hospitals
    return _vectorizer, _hospital_matrix, _hospitals_cache


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def find_nearest(description: str, lat: float, lng: float, top_n: int = 5) -> list[dict]:
    vectorizer, hospital_matrix, hospitals = _get_index()
    query_vec = vectorizer.transform([description])
    relevance_scores = cosine_similarity(query_vec, hospital_matrix).flatten()

    max_relevance = float(relevance_scores.max()) if len(relevance_scores) else 0.0

    results = []
    for i, h in enumerate(hospitals):
        h_lat, h_lon = h.get("lat"), h.get("lon")
        if h_lat is None or h_lon is None:
            continue

        distance_km = haversine_km(lat, lng, h_lat, h_lon)
        proximity_score = 1.0 / (1.0 + distance_km)
        relevance = float(relevance_scores[i])
        # Normalized to this query's own best match so it's on a comparable
        # 0-1 scale to proximity_score — see WEIGHT_RELEVANCE comment above.
        # Falls back to 0 (pure proximity ranking) if nothing in the whole
        # dataset had any lexical overlap with the query at all.
        normalized_relevance = (relevance / max_relevance) if max_relevance > 0 else 0.0
        bonus = EMERGENCY_CAPABLE_BONUS if h.get("emergency") == "yes" else 0.0
        combined = (WEIGHT_RELEVANCE * normalized_relevance) + (WEIGHT_PROXIMITY * proximity_score) + bonus

        results.append({
            "name": h.get("name"),
            "lat": h_lat,
            "lng": h_lon,
            "type": h.get("type"),
            "specialties": h.get("specialties", []),
            "emergency": h.get("emergency"),
            "operator_type": h.get("operator_type"),
            "phone": h.get("phone") or None,
            "distance_km": round(distance_km, 2),
            "relevance_score": round(relevance, 4),  # raw cosine similarity, for transparency
            "combined_score": round(combined, 4),
        })

    results.sort(key=lambda r: r["combined_score"], reverse=True)
    return results[:top_n]
