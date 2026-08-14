"""
The hospital dataset's `specialties` field uses short codes (e.g.
"cardiology", "orthopedic"). A distress description like "chest pain and
can't breathe" shares almost no raw vocabulary with the word "cardiology",
so a naive TF-IDF over the specialty codes alone would barely discriminate
between hospitals. Expanding each specialty into a set of the symptoms and
conditions it actually treats gives TF-IDF real lexical overlap to work
with — the same idea as the keyword lists already used in the BCLS
knowledge base.
"""

SPECIALTY_KEYWORDS: dict[str, list[str]] = {
    "cardiology": [
        "heart attack", "chest pain", "cardiac arrest", "palpitations",
        "high blood pressure", "hypertension", "heart failure", "arrhythmia",
        "angina", "ecg", "cardiac", "heart",
    ],
    "ent": [
        "ear pain", "throat pain", "nose bleed", "hearing loss", "sinus",
        "tonsil", "sore throat", "ear infection", "nasal", "voice loss",
    ],
    "gastroenterology": [
        "stomach pain", "abdominal pain", "vomiting", "diarrhea",
        "food poisoning", "liver", "jaundice", "ulcer", "digestion",
        "gastric", "nausea", "bleeding stool",
    ],
    "general": [
        "fever", "general checkup", "flu", "cold", "cough", "weakness",
        "minor injury", "general illness", "body pain",
    ],
    "maternity": [
        "pregnancy", "labor", "delivery", "pregnant", "childbirth",
        "obstetric", "prenatal", "contractions", "maternity",
    ],
    "nephrology_urology": [
        "kidney pain", "urination", "kidney stone", "urinary infection",
        "kidney failure", "dialysis", "bladder", "prostate", "renal",
    ],
    "neurology": [
        "stroke", "seizure", "fits", "headache", "migraine", "paralysis",
        "unconscious", "numbness", "weakness one side", "slurred speech",
        "brain", "neurological",
    ],
    "oncology": [
        "cancer", "tumor", "chemotherapy", "radiation", "oncology",
        "lump", "malignant",
    ],
    "ophthalmology": [
        "eye pain", "vision loss", "blurred vision", "eye injury",
        "red eye", "eye infection", "blindness",
    ],
    "orthopedic": [
        "fracture", "broken bone", "joint pain", "back pain", "sprain",
        "dislocation", "trauma", "road accident", "bone injury",
        "limb injury", "spine",
    ],
    "pediatric": [
        "child", "infant", "baby", "newborn", "pediatric", "kid sick",
    ],
    "psychiatric": [
        "mental health", "anxiety", "depression", "panic attack",
        "suicidal", "psychiatric", "confusion", "hallucination",
    ],
    "pulmonology": [
        "breathing difficulty", "shortness of breath", "asthma", "cough",
        "chest infection", "pneumonia", "choking", "lung", "wheezing",
        "respiratory",
    ],
}


def specialty_text(specialties: list[str]) -> str:
    """Builds the TF-IDF document text for a hospital from its specialty codes."""
    words: list[str] = []
    for code in specialties:
        words.append(code)
        words.extend(SPECIALTY_KEYWORDS.get(code, []))
    return " ".join(words) if words else "general"
