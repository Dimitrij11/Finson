from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models import User
from app.schemas import SavingsGoalCreate, SavingsGoalRead, SavingsGoalUpdate
from app.services import savings_goal_service

router = APIRouter(prefix="/savings-goals", tags=["savings-goals"])


@router.get("", response_model=list[SavingsGoalRead])
def list_savings_goals(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)
) -> list[SavingsGoalRead]:
    return savings_goal_service.list_savings_goals(db, current_user.id)


@router.post("", response_model=SavingsGoalRead, status_code=status.HTTP_201_CREATED)
def create_savings_goal(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    goal_in: SavingsGoalCreate,
) -> SavingsGoalRead:
    return savings_goal_service.create_savings_goal(db, current_user.id, goal_in)


@router.patch("/{goal_id}", response_model=SavingsGoalRead)
def update_savings_goal(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    goal_id: int,
    goal_in: SavingsGoalUpdate,
) -> SavingsGoalRead:
    return savings_goal_service.update_savings_goal(db, current_user.id, goal_id, goal_in)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_savings_goal(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_full_access_user), goal_id: int
) -> None:
    savings_goal_service.delete_savings_goal(db, current_user.id, goal_id)
