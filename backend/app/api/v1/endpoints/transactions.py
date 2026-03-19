from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Query, Depends, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models import TransactionType, User
from app.schemas import CategoryBreakdown, MonthlyInsight, TransactionCreate, TransactionRead, TransactionUpdate
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionRead])
def list_my_transactions(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    category: str | None = None,
    transaction_type: TransactionType | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[TransactionRead]:
    return transaction_service.list_transactions(
        db,
        current_user.id,
        start_at=start_at,
        end_at=end_at,
        category=category,
        transaction_type=transaction_type,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    tx_in: TransactionCreate,
) -> TransactionRead:
    return transaction_service.create_transaction(db, current_user.id, tx_in)


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user), transaction_id: int
) -> TransactionRead:
    return transaction_service.get_transaction(db, current_user.id, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    transaction_id: int,
    tx_in: TransactionUpdate,
) -> TransactionRead:
    return transaction_service.update_transaction(db, current_user.id, transaction_id, tx_in)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_full_access_user), transaction_id: int
) -> None:
    transaction_service.delete_transaction(db, current_user.id, transaction_id)


@router.get("/insights/monthly", response_model=MonthlyInsight)
def monthly_insight(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    reference_date: date | None = None,
) -> MonthlyInsight:
    from decimal import Decimal
    from dateutil.relativedelta import relativedelta

    reference = reference_date or date.today()
    reference_dt = datetime.combine(reference, time.min, tzinfo=timezone.utc)

    # Current month data
    total_income, total_expense = transaction_service.monthly_summary(
        db, current_user.id, reference_dt)
    categories = transaction_service.top_expense_categories(
        db, current_user.id, reference_dt)
    balance = total_income - total_expense

    # Previous month data for trends and carryover
    prev_month_date = reference - relativedelta(months=1)
    prev_month_dt = datetime.combine(
        prev_month_date, time.min, tzinfo=timezone.utc)
    prev_total_income, prev_total_expense = transaction_service.monthly_summary(
        db, current_user.id, prev_month_dt)
    carryover = prev_total_income - prev_total_expense  # Previous month's leftover

    return MonthlyInsight(
        month=reference.strftime("%Y-%m"),
        total_income=total_income,
        total_expense=total_expense,
        balance=balance,
        top_expense_categories=[
            CategoryBreakdown(category=category, amount=amount) for category, amount in categories
        ],
        prev_total_income=prev_total_income,
        prev_total_expense=prev_total_expense,
        carryover=carryover,
    )
