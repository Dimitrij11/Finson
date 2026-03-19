from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SCOPE_FULL_ACCESS = "full_access"
SCOPE_VERIFICATION_PENDING = "verification_pending"
SCOPE_READ_ONLY = "read_only"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
    *,
    scopes: list[str] | None = None,
    email_verified: bool = False,
    token_kind: str = "access",
) -> str:
    expire_delta = expires_delta or timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expire_delta
    to_encode: dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "scopes": scopes or [],
        "email_verified": email_verified,
        "token_kind": token_kind,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def token_expiration(minutes: int) -> timedelta:
    return timedelta(minutes=minutes)


class InvalidTokenError(Exception):
    pass


def extract_subject(token: str) -> str:
    try:
        payload = decode_access_token(token)
    except JWTError as exc:  # pragma: no cover - defensive guard
        raise InvalidTokenError from exc
    subject = payload.get("sub")
    if subject is None:
        raise InvalidTokenError
    return subject
