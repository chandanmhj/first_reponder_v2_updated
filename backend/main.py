import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from features.auth.router import router as auth_router
from features.auth.router import startup as auth_startup
from features.first_responder.router import router as first_responder_router
from features.first_responder.router import startup as first_responder_startup
from features.hospital_selector.router import router as hospital_router
from features.hospital_selector.router import startup as hospital_startup
from features.nutriscan.router import router as nutriscan_router
from features.nutriscan.router import startup as nutriscan_startup
from shared.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Single unified startup point for every feature, called exactly once
    each, in a controlled sequence — deliberately NOT using the deprecated
    per-router @router.on_event("startup") pattern. With four routers each
    registering their own on_event handler, FastAPI's include_router()
    wraps each one in a recursive merged_lifespan context manager; verified
    empirically (via stack-trace instrumentation during development) that
    this can cause a handler to fire more than once for certain include
    orderings. A single explicit lifespan here removes that entire class of
    bug rather than working around the symptom.
    """
    await auth_startup()
    await nutriscan_startup()
    await first_responder_startup()
    await hospital_startup()
    yield


app = FastAPI(title="First Responder v2 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(nutriscan_router)
app.include_router(first_responder_router)
app.include_router(hospital_router)

# Serves backend/media/ directly at /media so MEDIA_BASE_URL=/media (the
# default) works out of the box for local dev and demo — no external host
# needed yet. Still switch to Cloudinary/S3/etc. for real production
# deployment on Railway, since its filesystem is ephemeral (see README).
os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")


@app.get("/health")
async def health():
    return {"status": "ok"}
