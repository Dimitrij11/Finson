from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models import User
from app.schemas import AdviceRead, AdviceRequest, ConversationSummary
from app.services import advice_service

router = APIRouter(prefix="/advice", tags=["advice"])


@router.get("", response_model=list[AdviceRead])
def list_advice(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user), limit: int = 20
) -> list[AdviceRead]:
    return advice_service.list_advice(db, current_user.id, limit)


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)
) -> list[ConversationSummary]:
    """Get list of all conversations for the current user."""
    return advice_service.list_conversations(db, current_user.id)


@router.get("/conversations/{conversation_id}", response_model=list[AdviceRead])
def get_conversation(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    conversation_id: str
) -> list[AdviceRead]:
    """Get all messages in a specific conversation."""
    return advice_service.get_conversation(db, current_user.id, conversation_id)


@router.post("", response_model=AdviceRead, status_code=status.HTTP_201_CREATED)
def create_advice(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    advice_in: AdviceRequest,
) -> AdviceRead:
    return advice_service.generate_advice(db, current_user, advice_in)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_full_access_user),
    conversation_id: str
) -> None:
    """Delete a specific conversation."""
    advice_service.delete_conversation(db, current_user.id, conversation_id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_advice_history(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_full_access_user)
) -> None:
    """Clear all advice history for the current user."""
    advice_service.clear_advice(db, current_user.id)
