from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    email: str
    password: str = Field(..., min_length=8, max_length=256)
    remember_me: bool = False

class GoogleAuthRequest(BaseModel):
    """Google OAuth token exchange. In sandbox mode the credential is treated as a mock token."""
    credential: str
    remember_me: bool = False

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserResponse

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
