"""
Maps scenario + step number to a media file (image/video) for that BCLS step.

Filenames are ported from the original bot's media/ folder. That folder was
dropped from this repo (being rebuilt with new photos/videos), and Railway's
filesystem is ephemeral anyway (the original bot's own README flagged this
same problem on Koyeb's free tier), so media is served from an external host
via MEDIA_BASE_URL rather than local disk — set it to wherever the new media
actually ends up (Cloudinary, S3, a Netlify /public folder, etc.).
"""
from shared.config import get_settings

MEDIA_MAP: dict[tuple[str, int], str] = {
    # Scene Safety & Primary Assessment
    ("scene_safety_primary_assessment", 4): "scene_safety_avpu_scale.png",
    ("scene_safety_primary_assessment", 6): "scene_safety_carotid_pulse.mp4",
    ("scene_safety_primary_assessment", 7): "scene_safety_recovery_position.mp4",

    # Heart Attack
    ("heart_attack", 1): "heart_attack_recognize_signs.jpg",
    ("heart_attack", 7): "heart_attack_cpr_start.mp4",

    # Stroke
    ("stroke", 1): "stroke_befast_mnemonic.jpg",

    # Fits / Seizures
    ("fits_seizures", 5): "seizure_recovery_position.jpg",

    # Snake Bite
    ("snake_bite", 3): "snake_bite_splint_limb.webp",

    # Trauma / Road Accident
    ("trauma_road_accident", 2): "trauma_rice_method.png",
    ("trauma_road_accident", 4): "trauma_tourniquet_apply.mp4",
    ("trauma_road_accident", 6): "trauma_neck_stabilization.mp4",
    ("trauma_road_accident", 7): "trauma_log_roll.mp4",
    ("trauma_road_accident", 8): "trauma_helmet_removal.mp4",

    # Burns
    ("burns", 2): "burns_cool_running_water.mp4",
    ("burns", 3): "burns_fire_blanket_roll.mp4",

    # Cardiac Arrest / CPR
    ("cardiac_arrest_cpr", 8): "cpr_aed_usage.mp4",

    # Choking
    ("choking", 2): "choking_back_slaps.mp4",
    ("choking", 3): "choking_heimlich_maneuver.mp4",
    ("choking", 7): "choking_self_heimlich.mp4",

    # Infections / Animal Bites
    ("infections_animal_bites", 2): "animal_bite_wound_wash.jpg",
}


def get_media(scenario: str, step: int) -> tuple[str | None, str | None]:
    """Returns (media_url, media_type) or (None, None) if no media is mapped
    for this scenario+step. media_type is 'image' or 'video'."""
    filename = MEDIA_MAP.get((scenario, step))
    if not filename:
        return None, None

    base_url = get_settings().media_base_url.rstrip("/")
    ext = filename.rsplit(".", 1)[-1].lower()
    media_type = "video" if ext in ("mp4", "webm", "mov") else "image"
    return f"{base_url}/{filename}", media_type
