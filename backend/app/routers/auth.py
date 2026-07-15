from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import users_collection
from app.schemas.user import UserRegister, UserLogin, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.helpers import serialize_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    user_doc = {
        "name": payload.name,
        "email": payload.email.lower(),
        "hashed_password": hash_password(payload.password),
    }

    try:
        result = await users_collection.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_doc["_id"] = result.inserted_id
    token = create_access_token({"sub": str(result.inserted_id)})

    return TokenResponse(access_token=token, user=serialize_user(user_doc))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await users_collection.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": str(user["_id"])})
    return TokenResponse(access_token=token, user=serialize_user(user))