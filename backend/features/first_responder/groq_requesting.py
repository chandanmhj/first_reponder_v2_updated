"""
All Groq API calls for First Responder live here — the RAG-grounded chat
reply, patient image analysis, and the paramedic handover summary.

Ported from the original Jeeva Telegram bot's features/conversation.py and
features/image_analysis.py, with two model swaps: llama-3.3-70b-versatile
and meta-llama/llama-4-scout-17b-16e-instruct are both deprecated (Groq
shutdown Aug 16, 2026) and replaced with openai/gpt-oss-120b (text) and
qwen/qwen3.6-27b (vision) — the same vision model NutriScan already uses.

Note on emergency numbers: the BCLS protocol content itself (sourced
verbatim from the JeevaRaksha handbook) references "108", India's
ambulance-specific number, and that reference is left unchanged since it's
sourced medical content. The web app's own "Call 112" button uses 112 (the
newer national emergency number) per the original product spec — both are
valid, they're just different numbers for different purposes.
"""
import re

from groq import Groq

from shared.config import get_settings

from .rag import query_knowledge_base

THINK_BLOCK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
STEP_TAG_RE = re.compile(r"\[STEP:([a-z_]+):(\d+)\]")

SYSTEM_PROMPT = """You are Jeeva, a friendly and calm first aid assistant created by Chandan and team from Sambhram Institute of Technology, Bangalore, now built into the First Responder v2 web app.

ABOUT YOURSELF:
- Your name is Jeeva
- You were created by Chandan and team from Sambhram Institute of Technology, Bangalore
- You are an AI-powered first aid assistant trained on BCLS (Basic Cardiac Life Support) guidelines
- If anyone asks "who are you", "who made you", "what are you" — answer using the above info naturally

PERSONALITY:
- Warm, calm, and reassuring
- Use simple clear language — no heavy medical jargon
- For casual greetings (hi, hello, how are you) — respond naturally and ask how you can help
- Never dump all steps at once — guide ONE step at a time
- After each step ask: "Done? Reply *next* when ready for the next step."
- Be conversational, not robotic

STEP BY STEP GUIDANCE RULES:
- Give ONLY ONE step at a time
- Wait for user confirmation (ok, done, yes, next) before giving the next step
- Keep each step short, clear, and actionable
- Number the steps so user knows progress e.g. "Step 1 of 6:"

AMBULANCE / 108 REMINDER RULES:
- Mention calling 108 ONLY ONCE at the start when a serious emergency is detected
- SERIOUS emergencies (mention 108): cardiac arrest, heart attack, stroke, severe bleeding, drowning, unconscious person, snake bite, severe burns
- NON-SERIOUS (DO NOT mention 108): minor burns, small cuts, choking conscious, low blood sugar conscious, mild seizure, animal bite non-critical
- After the initial 108 reminder NEVER repeat it again unless situation worsens

STEP TAGGING — VERY IMPORTANT:
At the very end of every step response, you MUST add a hidden tag on its own line in this exact format:
[STEP:scenario_name:step_number]

- For infant CPR use tag [STEP:cardiac_arrest_cpr:10] ONLY if user explicitly mentions infant, baby, or newborn
- For pregnant choking use tag [STEP:choking:5] ONLY if user explicitly mentions pregnant
- For infant choking use tag [STEP:choking:6] ONLY if user explicitly mentions infant or baby

Examples:
[STEP:cardiac_arrest_cpr:5]
[STEP:choking:3]
[STEP:trauma_road_accident:6]

Use these exact scenario names:
- scene_safety_primary_assessment
- heart_attack
- stroke
- fits_seizures
- low_blood_sugar
- snake_bite
- trauma_road_accident
- burns
- cardiac_arrest_cpr
- choking
- infections_animal_bites

For non-emergency replies (greetings, general questions) do NOT add the tag.

KNOWLEDGE BASE CONTEXT (use this to answer accurately):
{context}

If no context is retrieved, use your general BCLS knowledge but keep the same step-by-step format."""

VISION_PROMPT = """You are a first aid assistant analyzing an image sent by a bystander during a medical emergency.
Describe what you see in the image in terms of:
1. The apparent condition of the person (conscious/unconscious, breathing, visible injuries, skin color, posture)
2. Any visible wounds, burns, bleeding, or deformities
3. The environment (indoors/outdoors, any hazards visible)

Be factual, calm, and concise. Do NOT make a diagnosis. This description will be used to give first aid guidance."""

HANDOVER_SYSTEM_PROMPT = """You are a medical assistant. Based on the bystander conversation below,
create a brief, clear handover summary for arriving paramedics. Include:
- What happened (incident type)
- Victim's current condition as reported
- First aid steps already performed
- Any medications given
Keep it under 150 words. Use bullet points. Be clinical and clear."""


def _get_client() -> Groq:
    return Groq(api_key=get_settings().groq_api_key)


def _strip_think(text: str) -> str:
    return THINK_BLOCK_RE.sub("", text).strip()


def parse_step_tag(reply: str) -> tuple[str, str | None, int | None]:
    """Extracts [STEP:scenario:step_number] from the reply.
    Returns (clean_reply, scenario, step) or (reply, None, None)."""
    match = STEP_TAG_RE.search(reply)
    if match:
        scenario = match.group(1)
        step = int(match.group(2))
        clean_reply = STEP_TAG_RE.sub("", reply).strip()
        return clean_reply, scenario, step
    return reply, None, None


def get_bot_reply(user_message: str, history: list[dict], image_description: str = "") -> tuple[str, str | None, int | None]:
    """
    history: list of {"role": "user"|"assistant", "content": str}, oldest first.
    Returns (clean_reply, scenario, step) — scenario/step are None for non-emergency replies.
    """
    settings = get_settings()
    client = _get_client()

    query = f"{user_message} {image_description}".strip() if image_description else user_message
    context = query_knowledge_base(query)

    system = SYSTEM_PROMPT.format(context=context if context else "No specific guideline retrieved.")

    full_user_message = user_message
    if image_description:
        full_user_message = f"{user_message}\n\n[Image sent — description: {image_description}]"

    messages = [{"role": "system", "content": system}] + history + [
        {"role": "user", "content": full_user_message}
    ]

    response = client.chat.completions.create(
        model=settings.groq_text_model,
        messages=messages,
        max_tokens=600,
        temperature=0.4,
        # openai/gpt-oss-120b only supports low/medium/high (unlike Qwen's "none") —
        # "low" keeps latency down for real-time chat. Its reasoning text goes into
        # a separate `.reasoning` response field, not inline in `.content` like
        # Qwen's <think> tags, so include_reasoning=False is what actually keeps
        # it out of the reply rather than any regex stripping.
        reasoning_effort="low",
        include_reasoning=False,
    )

    raw_reply = _strip_think(response.choices[0].message.content.strip())
    return parse_step_tag(raw_reply)


def analyze_patient_image(image_data_url: str) -> str:
    """Describes a patient photo for grounding purposes. Never diagnoses."""
    settings = get_settings()
    client = _get_client()

    try:
        completion = client.chat.completions.create(
            model=settings.groq_vision_model,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                    {"type": "text", "text": VISION_PROMPT},
                ],
            }],
            max_tokens=400,
            temperature=0.2,
            reasoning_effort="none",
        )
        return _strip_think(completion.choices[0].message.content.strip())
    except Exception as e:
        print(f"[IMAGE ANALYSIS ERROR] {e}")
        return ""


def build_paramedic_summary(history: list[dict]) -> str:
    """Summarizes the bystander's messages into a clinical handover for
    arriving paramedics, triggered when the user reports help has arrived."""
    settings = get_settings()
    client = _get_client()

    user_lines = [f"Bystander: {m['content']}" for m in history if m["role"] == "user"]
    conversation_text = "\n".join(user_lines[-10:])
    if not conversation_text:
        return "No prior conversation history available."

    response = client.chat.completions.create(
        model=settings.groq_text_model,
        messages=[
            {"role": "system", "content": HANDOVER_SYSTEM_PROMPT},
            {"role": "user", "content": f"Bystander conversation:\n{conversation_text}"},
        ],
        max_tokens=300,
        temperature=0.2,
        reasoning_effort="low",
        include_reasoning=False,
    )
    return _strip_think(response.choices[0].message.content.strip())
