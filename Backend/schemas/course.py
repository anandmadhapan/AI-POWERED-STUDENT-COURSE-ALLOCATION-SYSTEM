"""
Pydantic Schemas — Course
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


VALID_CATEGORIES = {"General", "OBC", "SC", "ST"}


# =============================================
# Category Seats Sub-schema
# =============================================
class CourseCategorySeatsCreate(BaseModel):
    category: str = Field(..., description="General / OBC / SC / ST")
    reserved_seats: int = Field(..., ge=0)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"category must be one of {VALID_CATEGORIES}")
        return v


class CourseCategorySeatsResponse(BaseModel):
    id: int
    course_id: int
    category: str
    reserved_seats: int
    allocated_seats: int
    available_seats: int

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_obj(cls, obj) -> "CourseCategorySeatsResponse":
        cat = obj.category.value if hasattr(obj.category, "value") else str(obj.category)
        return cls(
            id=obj.id,
            course_id=obj.course_id,
            category=cat,
            reserved_seats=obj.reserved_seats,
            allocated_seats=obj.allocated_seats,
            available_seats=obj.reserved_seats - obj.allocated_seats,
        )


# =============================================
# Course Create
# =============================================
class CourseCreate(BaseModel):
    course_name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    total_seats: int = Field(..., ge=1)
    category_seats: List[CourseCategorySeatsCreate] = Field(
        default=[],
        description="Reserved seats per category. Sum must not exceed total_seats."
    )

    def validate_seat_totals(self):
        total_reserved = sum(cs.reserved_seats for cs in self.category_seats)
        if total_reserved > self.total_seats:
            raise ValueError(
                f"Total reserved seats ({total_reserved}) exceed total_seats ({self.total_seats})."
            )


# =============================================
# Course Update
# =============================================
class CourseUpdate(BaseModel):
    course_name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    total_seats: Optional[int] = Field(None, ge=1)
    category_seats: Optional[List[CourseCategorySeatsCreate]] = None
    is_active: Optional[bool] = None


# =============================================
# Course Response
# =============================================
class CourseResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    description: Optional[str] = None
    total_seats: int
    allocated_seats: int
    available_seats: int
    is_active: bool
    category_seats: List[CourseCategorySeatsResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_obj(cls, obj) -> "CourseResponse":
        cat_seats = [
            CourseCategorySeatsResponse.from_orm_obj(cs)
            for cs in (obj.category_seats or [])
        ]
        return cls(
            id=obj.id,
            course_code=obj.course_code,
            course_name=obj.course_name,
            description=obj.description,
            total_seats=obj.total_seats,
            allocated_seats=obj.allocated_seats,
            available_seats=obj.total_seats - obj.allocated_seats,
            is_active=obj.is_active,
            category_seats=cat_seats,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )


# =============================================
# Course List Response
# =============================================
class CourseListResponse(BaseModel):
    total: int
    courses: List[CourseResponse]
