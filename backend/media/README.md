Drop BCLS step images/videos here using the exact filenames listed in
features/first_responder/media_map.py.

Served automatically at http://localhost:8000/media/<filename> for local
dev (see main.py's StaticFiles mount) — no extra config needed once a file
with the right name lands here.

For production on Railway, point MEDIA_BASE_URL (in .env) at an external
host instead (Railway's disk is ephemeral) — see README.md's Known
Limitations section.
