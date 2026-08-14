"""
Shared, root-level configuration.
Every feature imports its settings from here instead of reading os.environ
directly, so we only ever load the .env file once.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Groq
    groq_api_key: str
    groq_vision_model: str = "qwen/qwen3.6-27b"
    groq_text_model: str = "openai/gpt-oss-120b"

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # DB paths
    nutriscan_db_path: str = "data/nutriscan.db"
    first_responder_db_path: str = "data/first_responder.db"

    # First Responder RAG
    chroma_db_path: str = "data/chroma_db"
    # Where media files (images/video for BCLS steps) are actually hosted.
    # Railway's filesystem is ephemeral, so media should be hosted externally
    # (Cloudinary, S3, etc.) rather than served from local disk in production.
    # e.g. https://res.cloudinary.com/yourcloud/first-responder-media
    media_base_url: str = "/media"

    # Hospital data — real data is a JSON export (name, lat, lon, type,
    # specialties, emergency, operator_type, phone), not CSV as originally
    # assumed before the real dataset was available.
    hospital_data_path: str = "data/hospitals.json"

    # Auth
    jwt_secret_key: str
    jwt_expire_seconds: int = 60 * 60 * 24 * 7  # 7 days
    users_db_path: str = "data/users.db"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
