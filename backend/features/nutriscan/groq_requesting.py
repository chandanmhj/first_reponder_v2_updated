"""
All Groq API calls for NutriScan live here. Keeps the router thin and makes
it trivial to swap the model or provider later.
"""
import json
import re

from groq import Groq

from shared.config import get_settings

THINK_BLOCK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)

SYSTEM_PROMPT = (
    "You are a nutrition estimation engine. You will be shown a photo of a meal. "
    "Identify each distinct food item, estimate its portion size, and estimate its "
    "nutrition. Respond with ONLY a JSON object, no preamble, no markdown fences, "
    "matching exactly this shape:\n"
    "{\n"
    '  "items": [\n'
    "    {\n"
    '      "name": string,\n'
    '      "estimated_quantity": string,\n'
    '      "calories": number,\n'
    '      "protein_g": number,\n'
    '      "carbs_g": number,\n'
    '      "fat_g": number\n'
    "    }\n"
    "  ],\n"
    '  "confidence_note": string\n'
    "}\n"
    "Base nutrition values on standard reference data for the identified food and "
    "estimated portion. If you cannot identify any food in the image, return an "
    "empty items list and explain why in confidence_note."
)


LABEL_SYSTEM_PROMPT = (
    "You are a nutrition label reader. You will be shown a photo of a packaged food's "
    "printed nutrition facts label. Read the EXACT printed numbers off the label — do "
    "NOT estimate or guess values that aren't visible. If a value is genuinely not "
    "visible or not printed on the label, use null for that field rather than guessing. "
    "Multiply per-serving values by nothing — report the per-serving values exactly as "
    "printed alongside the serving size, so downstream code can scale if needed. "
    "Respond with ONLY a JSON object, no preamble, no markdown fences, matching exactly "
    "this shape:\n"
    "{\n"
    '  "items": [\n'
    "    {\n"
    '      "name": string,               // product name as printed, or "Unknown product" if not visible\n'
    '      "estimated_quantity": string, // the printed serving size, e.g. "1 cup (240ml)"\n'
    '      "calories": number,\n'
    '      "protein_g": number,\n'
    '      "carbs_g": number,\n'
    '      "fat_g": number,\n'
    '      "sugar_g": number or null,\n'
    '      "sodium_mg": number or null,\n'
    '      "fiber_g": number or null\n'
    "    }\n"
    "  ],\n"
    '  "confidence_note": string  // note anything blurry, cropped, or not fully legible\n'
    "}\n"
    "If no nutrition label is visible in the image at all, return an empty items list "
    "and explain in confidence_note."
)


def _get_client() -> Groq:
    return Groq(api_key=get_settings().groq_api_key)


def _call_vision_json(system_prompt: str, user_text: str, image_data_url: str) -> dict:
    client = _get_client()
    settings = get_settings()

    completion = client.chat.completions.create(
        model=settings.groq_vision_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            },
        ],
        temperature=0.1,
        max_tokens=1024,
        # qwen3.6 is a hybrid reasoning model — "none" turns off its <think> block
        # so we get straight JSON back. Harmless to pass for non-Qwen models too
        # (the SDK/Groq will just ignore an unsupported param).
        reasoning_effort="none",
    )

    raw_text = completion.choices[0].message.content.strip()
    # Defensive: strip a <think>...</think> block if one still slips through
    # (e.g. if the model is swapped for one that doesn't honor reasoning_effort).
    raw_text = THINK_BLOCK_RE.sub("", raw_text).strip()
    raw_text = raw_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Groq returned non-JSON response: {raw_text[:300]}") from exc


def analyze_label_image(image_data_url: str) -> dict:
    """Reads a printed nutrition facts label and extracts exact values (no estimation)."""
    return _call_vision_json(
        LABEL_SYSTEM_PROMPT,
        "Read the nutrition facts label in this photo and extract the values exactly as printed.",
        image_data_url,
    )


def analyze_meal_image(image_data_url: str) -> dict:
    return _call_vision_json(SYSTEM_PROMPT, "Analyze this meal photo.", image_data_url)
