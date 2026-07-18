from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Append these to your existing app/schemas/user.py ---
# (UserRegister, UserLogin, UserOut, TokenResponse stay exactly as they are)

from typing import Optional


class UserUpdate(BaseModel):
    """PATCH /auth/me — all fields optional so a client can send just what changed."""
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """PATCH /auth/me/password"""
    current_password: str
    # Matches the >=8 char rule enforced in the Settings UI. Your UserRegister
    # schema currently allows a 6-char password on signup — worth bumping
    # that to min_length=8 too so signup and change-password agree.
    new_password: str = Field(..., min_length=8)