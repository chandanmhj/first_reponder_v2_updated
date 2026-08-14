"""
Validates and encodes an optional patient photo attached to a chat message.
Deliberately duplicated (not imported from nutriscan) so this feature stays
self-contained, per the project's feature-folder architecture.
"""
import base64

from fastapi import HTTPException, UploadFile

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


async def read_and_validate_image(file: UploadFile) -> str:
    """Returns a base64 data: URL ready for the Groq vision API."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{file.content_type}'. "
                   f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 8 MB).")

    encoded = base64.b64encode(raw).decode("utf-8")
    return f"data:{file.content_type};base64,{encoded}"
