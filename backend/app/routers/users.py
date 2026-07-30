from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.auth import get_current_user
from app.database import get_session
from app.models.user import UserRead, UserUpdate
from app.schemas.user_schema import UserTable

router = APIRouter(tags=["User"])


@router.get("/user", response_model=UserRead)
@router.get("/api/user", response_model=UserRead)
async def get_user_data(user: UserTable = Depends(get_current_user)):
    return user


@router.put("/user", response_model=UserRead)
@router.put("/api/user", response_model=UserRead)
async def put_user_data(
    update: UserUpdate,
    user: UserTable = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
