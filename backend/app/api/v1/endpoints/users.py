import base64
import os
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models import User, Transaction, BudgetGoal
from app.schemas import PasswordChange, UserRead, UserUpdate
from app.services import user_service
from app.services.currency_service import convert_amount, get_supported_currencies

router = APIRouter(prefix="/users", tags=["users"])

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.dirname(__file__)))), "uploads", "avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ProfilePictureUpload(BaseModel):
    image_data: str  # Base64 encoded image


@router.get("/me", response_model=UserRead)
def read_current_user(
    *, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)
) -> UserRead:
    # Returning refreshed user ensures newest data after updates
    user = user_service.get(db, current_user.id)
    return user


@router.patch("/me", response_model=UserRead)
def update_current_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_full_access_user),
) -> UserRead:
    updated = user_service.update(db, current_user, user_in)
    return updated


@router.post("/me/profile-picture", response_model=UserRead)
def upload_profile_picture(
    *,
    db: Session = Depends(deps.get_db),
    upload: ProfilePictureUpload,
    current_user: User = Depends(deps.get_current_full_access_user),
) -> UserRead:
    """Upload a profile picture (base64 encoded)."""
    try:
        # Parse base64 data
        if "," in upload.image_data:
            # Remove data URL prefix like "data:image/png;base64,"
            header, encoded = upload.image_data.split(",", 1)
            # Determine file extension from header
            if "png" in header:
                ext = ".png"
            elif "gif" in header:
                ext = ".gif"
            else:
                ext = ".jpg"
        else:
            encoded = upload.image_data
            ext = ".jpg"

        # Decode image
        image_data = base64.b64decode(encoded)

        # Check size (max 2MB)
        if len(image_data) > 2 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Сликата е преголема. Максимум 2MB.",
            )

        # Generate unique filename
        filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        # Delete old profile picture if exists
        if current_user.profile_picture:
            old_path = os.path.join(
                UPLOAD_DIR, os.path.basename(current_user.profile_picture))
            if os.path.exists(old_path):
                os.remove(old_path)

        # Save new image
        with open(filepath, "wb") as f:
            f.write(image_data)

        # Update user record
        current_user.profile_picture = f"/uploads/avatars/{filename}"
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

        return current_user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Грешка при прикачување: {str(e)}",
        )


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    *,
    db: Session = Depends(deps.get_db),
    password_data: PasswordChange,
    current_user: User = Depends(deps.get_current_full_access_user),
):
    """Change the current user's password."""
    success = user_service.change_password(
        db, current_user, password_data.current_password, password_data.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Тековната лозинка е неточна",
        )
    return None


class CurrencyChangeRequest(BaseModel):
    new_currency: str
    convert_values: bool = True  # If True, convert all amounts to new currency


class CurrencyChangeResponse(BaseModel):
    success: bool
    old_currency: str
    new_currency: str
    transactions_converted: int
    budgets_converted: int
    message: str


@router.get("/me/supported-currencies")
def list_supported_currencies():
    """Get list of supported currencies."""
    return {"currencies": get_supported_currencies()}


@router.post("/me/change-currency", response_model=CurrencyChangeResponse)
def change_currency(
    *,
    db: Session = Depends(deps.get_db),
    request: CurrencyChangeRequest,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Change user's currency and optionally convert all transaction and budget values.
    """
    new_currency = request.new_currency.upper()
    old_currency = current_user.currency.upper()

    # Validate currency
    supported = get_supported_currencies()
    if new_currency not in supported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Валутата не е поддржана. Поддржани: {', '.join(supported)}",
        )

    if new_currency == old_currency:
        return CurrencyChangeResponse(
            success=True,
            old_currency=old_currency,
            new_currency=new_currency,
            transactions_converted=0,
            budgets_converted=0,
            message="Валутата е веќе поставена.",
        )

    transactions_converted = 0
    budgets_converted = 0

    if request.convert_values:
        # Convert all transactions
        transactions = db.query(Transaction).filter(
            Transaction.user_id == current_user.id).all()
        for tx in transactions:
            old_amount = Decimal(str(tx.amount))
            tx.amount = convert_amount(old_amount, old_currency, new_currency)
            tx.currency = new_currency
            transactions_converted += 1

        # Convert all budgets
        budgets = db.query(BudgetGoal).filter(
            BudgetGoal.user_id == current_user.id).all()
        for budget in budgets:
            old_amount = Decimal(str(budget.limit_amount))
            budget.limit_amount = convert_amount(
                old_amount, old_currency, new_currency)
            budgets_converted += 1

        # Convert monthly income
        if current_user.monthly_income:
            old_income = Decimal(str(current_user.monthly_income))
            current_user.monthly_income = convert_amount(
                old_income, old_currency, new_currency)

    # Update user's currency
    current_user.currency = new_currency
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return CurrencyChangeResponse(
        success=True,
        old_currency=old_currency,
        new_currency=new_currency,
        transactions_converted=transactions_converted,
        budgets_converted=budgets_converted,
        message=f"Валутата е променета од {old_currency} во {new_currency}.",
    )
