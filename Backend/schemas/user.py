"""
Pydantic Schemas — User & Auth
"""
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: str
    role: str = "admin"               # "admin" or "student"
    student_uid: Optional[str] = None # required when role=student


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    student_uid: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool
    student_uid: Optional[str] = None

    class Config:
        from_attributes = True
