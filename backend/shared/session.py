"""
Real auth. Every protected request must send:
    Authorization: Bearer <token>
where <token> comes from POST /auth/signup or POST /auth/login.

get_current_user_id() returns the user id AS A STRING so it plugs directly
into the existing per-user SQLite storage functions in nutriscan/db.py
(which take a 'session_id' string param) without changing their signatures.

get_current_user() returns both id and username. The username comes straight
out of the JWT payload (it was embedded there at login/signup) so reading it
costs nothing extra — no additional DB lookup per request.
"""
import jwt
from fastapi import Header, HTTPException

from shared.security import decode_access_token


def _decode_bearer(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Expected 'Bearer <token>' "
                   "from POST /auth/login or /auth/signup.",
        )
    token = authorization.removeprefix("Bearer ").strip()

    try:
        return decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    return _decode_bearer(authorization)["sub"]


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Returns {"user_id": str, "username": str}."""
    payload = _decode_bearer(authorization)
    return {"user_id": payload["sub"], "username": payload["username"]}
