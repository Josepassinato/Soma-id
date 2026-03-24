"""
JWT Authentication module for SOMA-ID Backend.
- create_access_token: gera JWT com expiração configurável
- verify_token: valida e decodifica JWT
- get_current_user: dependency para proteger endpoints com Depends()
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

ALGORITHM = "HS256"
DEFAULT_EXPIRE_HOURS = 24

security = HTTPBearer()


def _get_secret_key() -> str:
    key = os.environ.get("JWT_SECRET")
    if not key:
        raise RuntimeError("JWT_SECRET environment variable is not set")
    return key


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=DEFAULT_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _get_secret_key(), algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _get_secret_key(), algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """FastAPI dependency — extracts and validates JWT from Authorization header."""
    return verify_token(credentials.credentials)
