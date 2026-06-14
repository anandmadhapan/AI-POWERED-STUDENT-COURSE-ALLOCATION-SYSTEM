"""
SQLAlchemy ORM Models
AI-Powered Student Course Allocation System
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text,
    ForeignKey, Enum as SAEnum, Boolean, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models import Base


# =============================================
# Enums
# =============================================
class CategoryEnum(str, enum.Enum):
    GENERAL = "General"
    OBC = "OBC"
    SC = "SC"
    ST = "ST"


class AllocationStatusEnum(str, enum.Enum):
    ALLOCATED = "Allocated"
    WAITLISTED = "Waitlisted"
    NOT_ALLOCATED = "Not Allocated"


class StudentStatusEnum(str, enum.Enum):
    PENDING = "Pending"
    ALLOCATED = "Allocated"
    NOT_ALLOCATED = "Not Allocated"


class AllocationActionEnum(str, enum.Enum):
    ALLOCATED = "Allocated"
    REJECTED = "Rejected"
    WAITLISTED = "Waitlisted"
    SKIPPED = "Skipped"


# =============================================
# Student Table
# =============================================
class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, unique=True, index=True)
    phone = Column(String(20), nullable=True)

    marks = Column(Float, nullable=False)
    category = Column(
        SAEnum(CategoryEnum, name="category_enum", create_type=True),
        nullable=False,
        index=True
    )

    application_date = Column(DateTime(timezone=True), nullable=False)

    # Allocation status
    allocation_status = Column(
        String(50),
        nullable=False,
        default=StudentStatusEnum.PENDING.value,
        index=True
    )

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    preferences = relationship(
        "StudentPreference",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="StudentPreference.preference_order"
    )
    allocation = relationship(
        "Allocation",
        back_populates="student",
        uselist=False
    )
    logs = relationship(
        "AllocationLog",
        back_populates="student",
        cascade="all, delete-orphan"
    )


# =============================================
# Course Table
# =============================================
class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)

    course_code = Column(String(50), nullable=False, unique=True, index=True)
    course_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    total_seats = Column(Integer, nullable=False)
    allocated_seats = Column(Integer, nullable=False, default=0)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category_seats = relationship(
        "CourseCategorySeats",
        back_populates="course",
        cascade="all, delete-orphan"
    )
    preferences = relationship(
        "StudentPreference",
        back_populates="course"
    )
    allocations = relationship(
        "Allocation",
        back_populates="course"
    )

    @property
    def available_seats(self) -> int:
        return self.total_seats - self.allocated_seats


# =============================================
# Course Category Seats Table
# =============================================
class CourseCategorySeats(Base):
    __tablename__ = "course_category_seats"

    id = Column(Integer, primary_key=True, index=True)

    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(
        SAEnum(CategoryEnum, name="category_enum", create_type=False),
        nullable=False,
        index=True
    )

    reserved_seats = Column(Integer, nullable=False)
    allocated_seats = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    course = relationship("Course", back_populates="category_seats")

    __table_args__ = (
        UniqueConstraint("course_id", "category", name="uq_course_category"),
    )

    @property
    def available_seats(self) -> int:
        return self.reserved_seats - self.allocated_seats


# =============================================
# Student Preferences Table
# =============================================
class StudentPreference(Base):
    __tablename__ = "student_preferences"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)

    preference_order = Column(Integer, nullable=False)  # 1, 2, 3

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("Student", back_populates="preferences")
    course = relationship("Course", back_populates="preferences")

    __table_args__ = (
        UniqueConstraint("student_id", "preference_order", name="uq_student_preference_order"),
        UniqueConstraint("student_id", "course_id", name="uq_student_course"),
    )


# =============================================
# Allocation Table
# =============================================
class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True)

    allocated_preference = Column(Integer, nullable=True)     # Which preference was satisfied (1,2,3)
    allocation_status = Column(
        SAEnum(AllocationStatusEnum, name="allocation_status_enum", create_type=True),
        nullable=False,
        index=True
    )

    allocated_marks = Column(Float, nullable=False)
    allocated_category = Column(
        SAEnum(CategoryEnum, name="category_enum", create_type=False),
        nullable=False
    )

    allocated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("Student", back_populates="allocation")
    course = relationship("Course", back_populates="allocations")

    __table_args__ = (
        Index("ix_allocation_course_status", "course_id", "allocation_status"),
    )


# =============================================
# Allocation Log Table (Audit Trail)
# =============================================
class AllocationLog(Base):
    __tablename__ = "allocation_logs"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True)

    preference_order = Column(Integer, nullable=True)

    action = Column(
        SAEnum(AllocationActionEnum, name="allocation_action_enum", create_type=True),
        nullable=False
    )
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("Student", back_populates="logs")
    course  = relationship("Course")


# =============================================
# AI Chat History Table
# =============================================
class AIChatHistory(Base):
    __tablename__ = "ai_chat_history"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(String(100), nullable=True, index=True)
    question = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    response = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# =============================================
# User Table
# =============================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True, unique=True, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="admin")   # "admin" | "student"
    student_uid = Column(String(50), nullable=True, index=True)  # links to students.student_id
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())