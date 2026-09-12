import os
from datetime import datetime, timedelta, timezone

import jwt
import psycopg2
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

load_dotenv()

password_hasher = PasswordHash.recommended()

# --- JWT configuration -------------------------------------------------
# JWT_SECRET_KEY should always be set via an environment variable in real
# deployments. The fallback below only exists so the app doesn't crash on a
# fresh checkout; it is NOT safe for production.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-insecure-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24h

security_scheme = HTTPBearer(auto_error=False)


def _get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def create_access_token(user: dict) -> str:
    """Issue a signed JWT for the given user dict (must contain id/username/role)."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user["id"]),
        "username": user["username"],
        "role": user.get("role", "user"),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT, returning its payload.

    Raises jwt.ExpiredSignatureError / jwt.InvalidTokenError on failure.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def login_user(username: str, password: str):
    conn = _get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, username, email, password_hash, role
        FROM users
        WHERE username = %s;
        """,
        (username,),
    )

    user = cur.fetchone()

    cur.close()
    conn.close()

    if user is None:
        return None

    password_is_correct = password_hasher.verify(password, user[4])

    if not password_is_correct:
        return None

    return {
        "id": user[0],
        "name": user[1],
        "username": user[2],
        "email": user[3],
        "role": user[5],
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    """FastAPI dependency: validates the Bearer token and returns the
    identity encoded in it as {"id": int, "username": str, "role": str}.

    Raises 401 if the token is missing, malformed, or expired.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=401,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    return {
        "id": int(user_id),
        "username": payload.get("username"),
        "role": payload.get("role", "user"),
    }


def require_self_or_admin(user_id: int, current_user: dict) -> None:
    """Raise 403 unless the authenticated user IS user_id or is an admin."""
    if current_user["id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to perform this action.",
        )


def require_admin(current_user: dict) -> None:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
