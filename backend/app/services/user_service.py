from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import User
from app.schemas.user import AdminUserUpdate, UserCreate, UserUpdate


TIER_RANK: dict[str, int] = {
    "FREE": 1,
    "PRO": 2,
    "ELITE": 3,
}

TIER_LIMITS: dict[str, dict[str, int | None]] = {
    "FREE": {
        "max_budgets": 3,
        "max_savings_goals": 2,
        "max_advice_requests_per_day": 5,
        "max_transaction_page_limit": 50,
        "max_transaction_history_days": 90,
    },
    "PRO": {
        "max_budgets": 20,
        "max_savings_goals": 15,
        "max_advice_requests_per_day": 50,
        "max_transaction_page_limit": 200,
        "max_transaction_history_days": 730,
    },
    "ELITE": {
        "max_budgets": None,
        "max_savings_goals": None,
        "max_advice_requests_per_day": 300,
        "max_transaction_page_limit": 500,
        "max_transaction_history_days": None,
    },
}


def normalize_subscription_tier(tier: str | None) -> str:
    """Normalize stored tier value and keep legacy PREMIUM as ELITE."""
    normalized = (tier or "FREE").upper()
    if normalized == "PREMIUM":
        return "ELITE"
    return normalized if normalized in TIER_RANK else "FREE"


def user_has_min_tier(user: User, min_tier: str) -> bool:
    user_rank = TIER_RANK.get(
        normalize_subscription_tier(user.subscription_tier), 1)
    required_rank = TIER_RANK.get(normalize_subscription_tier(min_tier), 1)
    return user_rank >= required_rank


def get_tier_limits_for_user(user: User) -> dict[str, int | None]:
    tier = normalize_subscription_tier(user.subscription_tier)
    return TIER_LIMITS[tier]


def get(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    return db.scalars(statement).first()


def list_users(db: Session) -> list[User]:
    statement = select(User).order_by(User.created_at.desc())
    return list(db.scalars(statement).all())


def create(db: Session, user_in: UserCreate) -> User:
    user = User(
        email=user_in.email.lower(),
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        currency=user_in.currency.upper(),
        monthly_income=user_in.monthly_income,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = get_by_email(db, email.lower())
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def is_user_locked(user: User) -> bool:
    if user.locked_until is None:
        return False
    return user.locked_until > datetime.now(timezone.utc)


def register_failed_login(db: Session, user: User) -> User:
    now = datetime.now(timezone.utc)
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    user.last_failed_login_at = now
    if user.failed_login_attempts >= settings.AUTH_MAX_FAILED_ATTEMPTS:
        user.locked_until = now + \
            timedelta(minutes=settings.AUTH_LOCKOUT_MINUTES)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def reset_login_failures(db: Session, user: User) -> User:
    if not user.failed_login_attempts and user.locked_until is None:
        return user
    user.failed_login_attempts = 0
    user.last_failed_login_at = None
    user.locked_until = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def register_successful_login(db: Session, user: User) -> User:
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update(db: Session, user: User, user_in: UserUpdate) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    if "currency" in update_data and update_data["currency"]:
        update_data["currency"] = update_data["currency"].upper()
    for field, value in update_data.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
    """Change user's password. Returns True if successful, False if current password is wrong."""
    if not verify_password(current_password, user.hashed_password):
        return False
    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return True


def update_admin_fields(db: Session, user: User, user_in: AdminUserUpdate) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
