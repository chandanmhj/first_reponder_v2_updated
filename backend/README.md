# First Responder v2 — Backend

Unified emergency-health platform backend: **NutriScan** (food/label nutrition
scanning), **First Responder** (RAG-grounded BCLS first-aid chat), and
**Hospital Selector** (specialty + proximity hospital matching), sitting
behind a shared **Auth** system. Built feature-by-feature, each one tested
end-to-end (Postman + automated integration tests) before the next was
started.

## Architecture

```
backend/
  main.py                 -> FastAPI app, mounts every feature router, CORS
  requirements.txt
  Procfile                -> Railway start command
  runtime.txt              -> pinned Python version
  .env.example              -> copy to .env and fill in real values
  data/
    hospitals.json          -> real hospital dataset (1789 entries), committed
    *.db, chroma_db/         -> generated at runtime, gitignored
  shared/
    config.py               -> loads .env once; every feature reads settings from here
    security.py              -> password hashing (PBKDF2) + JWT issue/verify
    users_db.py               -> the users table (SQLite), shared by every feature
    session.py                 -> get_current_user() / get_current_user_id() — the
                                   auth dependency every protected route uses
  features/
    auth/                    -> POST /auth/signup, POST /auth/login
    nutriscan/                -> meal photo + nutrition label scanning, advisory engine
    first_responder/           -> RAG-grounded BCLS chat, paramedic handover
    hospital_selector/          -> TF-IDF + haversine hospital matching
```

Every feature owns its own router, database logic, and (where relevant)
Groq-calling logic — independently testable, matching the build-one-feature-
at-a-time workflow this project was built with.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
- `GROQ_API_KEY` — your real Groq key
- `JWT_SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- Everything else has a sensible default for local dev

```bash
uvicorn main:app --reload --port 8000
```

Docs at `http://127.0.0.1:8000/docs`.

## Environment variables

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Groq API key (NutriScan + First Responder) |
| `GROQ_VISION_MODEL` | Default `qwen/qwen3.6-27b` — image analysis |
| `GROQ_TEXT_MODEL` | Default `openai/gpt-oss-120b` — First Responder chat |
| `ALLOWED_ORIGINS` | Comma-separated frontend origin(s) for CORS |
| `NUTRISCAN_DB_PATH` | SQLite path for meal logs |
| `FIRST_RESPONDER_DB_PATH` | SQLite path for chat history |
| `CHROMA_DB_PATH` | ChromaDB persistence path (RAG) |
| `MEDIA_BASE_URL` | Where BCLS step images/video are hosted — **see Known Limitations** |
| `JWT_SECRET_KEY` | Signs auth tokens — must be long and random in production |
| `JWT_EXPIRE_SECONDS` | Token lifetime, default 7 days |
| `USERS_DB_PATH` | SQLite path for accounts |
| `HOSPITAL_DATA_PATH` | Path to `hospitals.json` |

## Authentication

All feature endpoints except `/auth/*` and `/health` require:

```
Authorization: Bearer <token>
```

Get a token from `POST /auth/signup` or `POST /auth/login`
(`{"username": "...", "password": "..."}`).

## Endpoints

| Feature | Method | Path |
|---|---|---|
| Auth | POST | `/auth/signup` |
| Auth | POST | `/auth/login` |
| NutriScan | POST | `/nutriscan/analyze` (meal photo, multipart `file`) |
| NutriScan | POST | `/nutriscan/analyze-label` (nutrition label photo) |
| NutriScan | POST | `/nutriscan/log` |
| NutriScan | GET | `/nutriscan/history` |
| NutriScan | GET | `/nutriscan/daily-summary` |
| NutriScan | DELETE | `/nutriscan/entry/{id}` |
| First Responder | POST | `/first-responder/chat` (multipart: `message` + optional `image`) |
| First Responder | GET | `/first-responder/history` |
| Hospital Selector | POST | `/hospital-selector/nearest` |
| — | GET | `/health` |

## Deployment (Railway + Netlify)

- **Backend → Railway**: set all `.env` variables in Railway's dashboard
  (never commit `.env`). `Procfile` and `runtime.txt` are already set up.
  If this backend lives inside a monorepo alongside a frontend folder, set
  Railway's **Root Directory** to `backend/` so it finds `main.py` and the
  relative `data/` paths correctly.
- **Frontend → Netlify**: needs HTTPS (Netlify's default) for the browser's
  live-geolocation API used by First Responder's Navigate button to work.

## Known limitations / follow-ups

- **BCLS step media** (`MEDIA_BASE_URL`): the original media files aren't
  included (being rebuilt with new photos/video). Filenames in
  `features/first_responder/media_map.py` are ported from the original bot
  as placeholders — point `MEDIA_BASE_URL` at wherever the new media
  actually ends up hosted (Railway's own disk is ephemeral, so an external
  host like Cloudinary/S3 is recommended, same issue the original bot's
  README already flagged).
- **NutriScan personalization**: the original Telegram bot collected age,
  height, weight, BMI, and diabetes status to personalize advice and daily
  calorie goals. The current advisory engine only compares against general
  WHO population guidelines (sugar, sodium) — not yet reintroduced as a user
  profile here.
- **RAG embedding model download**: `features/first_responder/rag.py` uses
  ChromaDB's built-in `DefaultEmbeddingFunction` (all-MiniLM-L6-v2 via ONNX),
  downloaded on first use if not cached. This requires outbound network
  access to ChromaDB's model host. If that download fails, First Responder
  chat degrades gracefully to ungrounded replies (logged, not crashed) — see
  the comments in `rag.py` and `features/first_responder/router.py`'s
  startup handler — but retrieval quality won't be at its best until the
  download succeeds.

## Testing

Every feature was verified with real requests (Postman during development)
plus automated integration tests covering: auth rejection paths, multipart
file upload/validation, the NutriScan analyze→log→history→daily-summary
flow, First Responder's arrival-detection/handover flow, and Hospital
Selector's TF-IDF + proximity ranking against the real 1789-hospital
dataset. Groq-dependent output itself (model quality) can only be verified
with a real `GROQ_API_KEY` against Groq's live API.
