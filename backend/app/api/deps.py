from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import SCOPE_FULL_ACCESS, decode_access_token
from app.models import User
from app.schemas import TokenPayload
from app.services import user_service

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = decode_access_token(token)
        token_data = TokenPayload(**payload)
    except JWTError as exc:  # pragma: no cover - FastAPI handles response
        raise _credentials_exception() from exc
    if token_data.sub is None:
        raise _credentials_exception()
    user = user_service.get(db, int(token_data.sub))
    if not user:
        raise _credentials_exception()
    return user


def get_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    try:
        payload = decode_access_token(token)
        return TokenPayload(**payload)
    except JWTError as exc:  # pragma: no cover
        raise _credentials_exception() from exc


def get_current_full_access_user(
    current_user: User = Depends(get_current_user),
    token_payload: TokenPayload = Depends(get_token_payload),
) -> User:
    if SCOPE_FULL_ACCESS not in token_payload.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required for this action",
        )
    return current_user
