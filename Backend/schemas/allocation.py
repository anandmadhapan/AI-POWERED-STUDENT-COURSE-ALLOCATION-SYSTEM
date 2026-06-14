"""
Pydantic Schemas — Allocation
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# =============================================
# Single Allocation Response
# =============================================
class AllocationResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_uid: Optional[str] = None
    course_id: Optional[int] = None
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    allocated_preference: Optional[int] = None
    allocation_status: str          # plain string — avoids Enum serialisation issues
    allocated_marks: float
    allocated_category: str         # plain string
    allocated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_obj(cls, obj) -> "AllocationResponse":
        return cls(
            id=obj.id,
            student_id=obj.student_id,
            student_name=obj.student.name if obj.student else None,
            student_uid=obj.student.student_id if obj.student else None,
            course_id=obj.course_id,
            course_name=obj.course.course_name if obj.course else None,
            course_code=obj.course.course_code if obj.course else None,
            allocated_preference=obj.allocated_preference,
            # Coerce enums → string
            allocation_status=obj.allocation_status.value if hasattr(obj.allocation_status, "value") else str(obj.allocation_status),
            allocated_marks=obj.allocated_marks,
            allocated_category=obj.allocated_category.value if hasattr(obj.allocated_category, "value") else str(obj.allocated_category),
            allocated_at=obj.allocated_at,
        )


# =============================================
# Allocation List Response
# =============================================
class AllocationListResponse(BaseModel):
    total: int
    allocations: List[AllocationResponse]


# =============================================
# Allocation Process Response
# =============================================
class AllocationProcessSummary(BaseModel):
    total_students: int
    allocated: int
    not_allocated: int
    first_preference_satisfied: int
    second_preference_satisfied: int
    third_preference_satisfied: int


class AllocationProcessResponse(BaseModel):
    message: str
    summary: AllocationProcessSummary
    allocations: List[AllocationResponse]


# =============================================
# Allocation Log Response
# =============================================
class AllocationLogResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_uid: Optional[str] = None
    course_id: Optional[int] = None
    course_code: Optional[str] = None
    preference_order: Optional[int] = None
    action: str
    remarks: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_obj(cls, obj) -> "AllocationLogResponse":
        return cls(
            id=obj.id,
            student_id=obj.student_id,
            student_name=obj.student.name if obj.student else None,
            student_uid=obj.student.student_id if obj.student else None,
            course_id=obj.course_id,
            course_code=obj.course.course_code if obj.course else None,
            preference_order=obj.preference_order,
            action=obj.action.value if hasattr(obj.action, "value") else str(obj.action),
            remarks=obj.remarks,
            created_at=obj.created_at,
        )
