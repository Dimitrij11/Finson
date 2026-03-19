from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models import User
from app.schemas import BudgetCreate, BudgetRead, BudgetUpdate
from app.services import budget_service

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetRead])
def list_budgets(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)
) -> list[BudgetRead]:
    return budget_service.list_budgets(db, current_user.id)


@router.post("", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_budget(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    budget_in: BudgetCreate,
) -> BudgetRead:
    return budget_service.create_budget(db, current_user.id, budget_in)


@router.patch("/{budget_id}", response_model=BudgetRead)
def update_budget(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    budget_id: int,
    budget_in: BudgetUpdate,
) -> BudgetRead:
    return budget_service.update_budget(db, current_user.id, budget_id, budget_in)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_full_access_user), budget_id: int
) -> None:
    budget_service.delete_budget(db, current_user.id, budget_id)
