"""
Pydantic Schemas — Student
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator


# =============================================
# Preference In (nested)
# =============================================
class PreferenceIn(BaseModel):
    course_id: int = Field(..., description="Course DB ID")
    preference_order: int = Field(..., ge=1, le=3, description="1=first, 2=second, 3=third")


# =============================================
# Student Create
# =============================================
class StudentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    marks: float = Field(..., ge=0, le=100)
    category: str = Field(..., description="General / OBC / SC / ST")
    application_date: datetime
    preferences: List[PreferenceIn] = Field(..., min_length=1, max_length=3)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {"General", "OBC", "SC", "ST"}
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v

    @field_validator("preferences")
    @classmethod
    def validate_preferences(cls, v: List[PreferenceIn]) -> List[PreferenceIn]:
        orders = [p.preference_order for p in v]
        if len(orders) != len(set(orders)):
            raise ValueError("Duplicate preference orders are not allowed.")
        course_ids = [p.course_id for p in v]
        if len(course_ids) != len(set(course_ids)):
            raise ValueError("Cannot add the same course twice in preferences.")
        return v


# =============================================
# Student Update
# =============================================
class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    marks: Optional[float] = Field(None, ge=0, le=100)
    category: Optional[str] = None
    application_date: Optional[datetime] = None
    preferences: Optional[List[PreferenceIn]] = Field(None, max_length=3)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"General", "OBC", "SC", "ST"}
            if v not in allowed:
                raise ValueError(f"category must be one of {allowed}")
        return v


# =============================================
# Preference Response (nested)
# =============================================
class PreferenceResponse(BaseModel):
    id: int
    course_id: int
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    preference_order: int

    model_config = {"from_attributes": True}


# =============================================
# Student Response
# =============================================
class StudentResponse(BaseModel):
    id: int
    student_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    marks: float
    category: str
    application_date: datetime
    allocation_status: str
    preferences: List[PreferenceResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# =============================================
# Student List Response (paginated)
# =============================================
class StudentListResponse(BaseModel):
    total: int
    students: List[StudentResponse]
