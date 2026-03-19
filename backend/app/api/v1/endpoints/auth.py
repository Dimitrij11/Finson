from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.core.security import (
    SCOPE_FULL_ACCESS,
    SCOPE_READ_ONLY,
    SCOPE_VERIFICATION_PENDING,
    create_access_token,
    token_expiration,
)
from app.schemas import LoginRequest, Token, UserCreate, UserRead
from app.services import user_service
from app.services.email_service import (
    create_verification_token,
    send_verification_email,
    verify_email_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_ip_attempts: dict[str, list[datetime]] = {}


def _is_ip_rate_limited(client_ip: str) -> bool:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=settings.AUTH_LOCKOUT_MINUTES)
    attempts = [ts for ts in _ip_attempts.get(
        client_ip, []) if ts >= window_start]
    _ip_attempts[client_ip] = attempts
    return len(attempts) >= settings.AUTH_MAX_FAILED_ATTEMPTS


def _record_ip_failure(client_ip: str) -> None:
    now = datetime.now(timezone.utc)
    attempts = _ip_attempts.get(client_ip, [])
    attempts.append(now)
    window_start = now - timedelta(minutes=settings.AUTH_LOCKOUT_MINUTES)
    _ip_attempts[client_ip] = [ts for ts in attempts if ts >= window_start]


def _clear_ip_failures(client_ip: str) -> None:
    _ip_attempts.pop(client_ip, None)


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(*, db: Session = Depends(deps.get_db), user_in: UserCreate) -> UserRead:
    existing = user_service.get_by_email(db, user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    try:
        user = user_service.create(db, user_in)
        # Send verification email
        token = create_verification_token(user.email)
        send_verification_email(user.email, token)
        return user
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again.",
        ) from exc


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(*, db: Session = Depends(deps.get_db), request: VerifyEmailRequest):
    """Verify user's email address using the token sent to their email."""
    email = verify_email_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невалиден или истечен токен за верификација",
        )

    user = user_service.get_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Корисникот не е пронајден",
        )

    if user.is_email_verified:
        return {"message": "Email-от е веќе потврден"}

    user.is_email_verified = True
    db.commit()
    return {"message": "Email-от е успешно потврден"}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
def resend_verification(*, db: Session = Depends(deps.get_db), request: ResendVerificationRequest):
    """Resend verification email."""
    user = user_service.get_by_email(db, request.email)
    if not user:
        # Don't reveal if email exists
        return {"message": "Ако email-от постои, ќе добиете нов линк за верификација"}

    if user.is_email_verified:
        return {"message": "Email-от е веќе потврден"}

    token = create_verification_token(user.email)
    send_verification_email(user.email, token)
    return {"message": "Ако email-от постои, ќе добиете нов линк за верификација"}


@router.post("/login", response_model=Token)
def login(*, request: Request, db: Session = Depends(deps.get_db), credentials: LoginRequest) -> Token:
    client_ip = request.client.host if request.client else "unknown"
    if _is_ip_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
        )

    user = user_service.get_by_email(db, credentials.email.lower())
    if user and user_service.is_user_locked(user):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked due to failed login attempts.",
        )

    auth_user = user_service.authenticate(
        db, credentials.email, credentials.password)
    if not auth_user:
        if user:
            user_service.register_failed_login(db, user)
        _record_ip_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )

    user_service.reset_login_failures(db, auth_user)
    _clear_ip_failures(client_ip)

    if auth_user.is_email_verified:
        scopes = [SCOPE_FULL_ACCESS, SCOPE_READ_ONLY]
        expires = token_expiration(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        requires_verification = False
    else:
        scopes = [SCOPE_READ_ONLY, SCOPE_VERIFICATION_PENDING]
        expires = token_expiration(
            minutes=settings.UNVERIFIED_ACCESS_TOKEN_EXPIRE_MINUTES)
        requires_verification = True

    access_token = create_access_token(
        auth_user.id,
        expires,
        scopes=scopes,
        email_verified=auth_user.is_email_verified,
    )
    return Token(
        access_token=access_token,
        scopes=scopes,
        requires_verification=requires_verification,
    )
