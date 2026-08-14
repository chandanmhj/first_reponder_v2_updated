from fastapi import APIRouter, HTTPException

from shared import users_db
from shared.security import create_access_token, hash_password, verify_password

from .models import LoginRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


async def startup():
    await users_db.init_db()


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: SignupRequest):
    existing = await users_db.get_user_by_username(payload.username)
    if existing:
        raise HTTPException(status_code=409, detail="That username is already taken.")

    password_hash = hash_password(payload.password)
    user_id = await users_db.create_user(payload.username, password_hash)
    token = create_access_token(user_id, payload.username)

    return TokenResponse(access_token=token, user_id=user_id, username=payload.username)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await users_db.get_user_by_username(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = create_access_token(user["id"], user["username"])
    return TokenResponse(access_token=token, user_id=user["id"], username=user["username"])
