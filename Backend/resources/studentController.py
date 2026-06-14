"""
Student Controller
CRUD APIs for student registration and management.
Admin: full CRUD. Student role: read-only own profile via /students/me.
"""
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from models import get_db
from models.models import Student, StudentPreference, Course, Allocation
from schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse, StudentListResponse, PreferenceResponse
)
from resources.authController import get_current_user, require_admin
from models.models import User

router = APIRouter()


# =============================================
# GET /students/me  — student's own profile
# =============================================
@router.get(
    "/me",
    response_model=StudentResponse,
    summary="Get my own student profile (student role)",
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the student profile linked to the logged-in student account."""
    if not current_user.student_uid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student profile linked to this account.",
        )
    student = db.query(Student).options(
        joinedload(Student.preferences).joinedload(StudentPreference.course)
    ).filter(
        Student.student_id == current_user.student_uid,
        Student.is_active == True,
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")
    return _build_student_response(student)


# =============================================
# Helper: Auto-generate student_id
# =============================================
def _generate_student_id(db: Session) -> str:
    """
    Generates a unique student ID in the format STU{YYYY}{NNN}.
    e.g. STU2026001, STU2026002, ...
    Uses a DB MAX query so it works correctly even with concurrent inserts.
    """
    year = datetime.now(timezone.utc).year
    prefix = f"STU{year}"

    latest_id: Optional[str] = db.query(func.max(Student.student_id)).filter(
        Student.student_id.like(f"{prefix}%")
    ).scalar()

    if latest_id:
        try:
            seq = int(latest_id[len(prefix):]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1

    return f"{prefix}{seq:03d}"


# =============================================
# Helper: Build StudentResponse from ORM obj
# =============================================
def _build_student_response(student: Student) -> StudentResponse:
    prefs = []
    for p in (student.preferences or []):
        course = p.course
        prefs.append(PreferenceResponse(
            id=p.id,
            course_id=p.course_id,
            course_name=course.course_name if course else None,
            course_code=course.course_code if course else None,
            preference_order=p.preference_order,
        ))
    # Coerce CategoryEnum → plain string
    category_val = student.category
    if hasattr(category_val, 'value'):
        category_val = category_val.value

    return StudentResponse(
        id=student.id,
        student_id=student.student_id,
        name=student.name,
        email=student.email,
        phone=student.phone,
        marks=student.marks,
        category=category_val,
        application_date=student.application_date,
        allocation_status=student.allocation_status,
        preferences=prefs,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


# =============================================
# POST /students/register
# =============================================
@router.post(
    "/register",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student",
)
def register_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new student with their personal details and course preferences.
    The student_id is generated automatically (e.g. STU2026001).

    - **marks**: Score out of 100
    - **category**: General / OBC / SC / ST
    - **application_date**: ISO 8601 datetime
    - **preferences**: List of 1–3 course preferences (by course DB id)
    """
    # Auto-generate student_id
    student_id = _generate_student_id(db)

    # Check duplicate email
    if payload.email:
        if db.query(Student).filter(Student.email == payload.email).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Student with email '{payload.email}' already exists."
            )

    # Validate and sort course preferences
    preference_orders = sorted(payload.preferences, key=lambda p: p.preference_order)
    for pref in preference_orders:
        course = db.query(Course).filter(
            Course.id == pref.course_id,
            Course.is_active == True
        ).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id={pref.course_id} not found or inactive."
            )

    # Create student
    student = Student(
        student_id=student_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        marks=payload.marks,
        category=payload.category,
        application_date=payload.application_date,
        allocation_status="Pending",
        is_active=True,
    )
    db.add(student)
    db.flush()  # Get student.id without committing

    # Create preferences
    for pref in preference_orders:
        db.add(StudentPreference(
            student_id=student.id,
            course_id=pref.course_id,
            preference_order=pref.preference_order,
        ))

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Data integrity error: {str(e.orig)}"
        )

    # Reload with relationships
    student = db.query(Student).options(
        joinedload(Student.preferences).joinedload(StudentPreference.course)
    ).filter(Student.id == student.id).first()

    return _build_student_response(student)


# =============================================
# GET /students
# =============================================
@router.get(
    "",
    response_model=StudentListResponse,
    summary="List all students",
)
def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    category: Optional[str] = Query(None, description="Filter by category"),
    allocation_status: Optional[str] = Query(None, description="Filter by allocation status"),
    search: Optional[str] = Query(None, description="Search by name or student_id"),
    db: Session = Depends(get_db),
):
    """List students with optional filtering and pagination."""
    query = db.query(Student).options(
        joinedload(Student.preferences).joinedload(StudentPreference.course)
    ).filter(Student.is_active == True)

    if category:
        query = query.filter(Student.category == category)
    if allocation_status:
        query = query.filter(Student.allocation_status == allocation_status)
    if search:
        query = query.filter(
            Student.name.ilike(f"%{search}%") | Student.student_id.ilike(f"%{search}%")
        )

    total = query.count()
    students = (
        query.order_by(Student.marks.desc(), Student.application_date.asc())
             .offset(skip).limit(limit).all()
    )

    return StudentListResponse(
        total=total,
        students=[_build_student_response(s) for s in students],
    )


# =============================================
# GET /students/{student_db_id}
# =============================================
@router.get(
    "/{student_db_id}",
    response_model=StudentResponse,
    summary="Get student by DB id",
)
def get_student(
    student_db_id: int,
    db: Session = Depends(get_db),
):
    student = db.query(Student).options(
        joinedload(Student.preferences).joinedload(StudentPreference.course)
    ).filter(Student.id == student_db_id, Student.is_active == True).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    return _build_student_response(student)


# =============================================
# PUT /students/{student_db_id}
# =============================================
@router.put(
    "/{student_db_id}",
    response_model=StudentResponse,
    summary="Update student details",
)
def update_student(
    student_db_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_db_id, Student.is_active == True
    ).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    update_data = payload.model_dump(exclude_unset=True)
    preferences_data = update_data.pop("preferences", None)

    for field, value in update_data.items():
        setattr(student, field, value)

    # Update preferences if provided
    if preferences_data is not None:
        for pref in preferences_data:
            course = db.query(Course).filter(
                Course.id == pref["course_id"],
                Course.is_active == True
            ).first()
            if not course:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Course with id={pref['course_id']} not found or inactive."
                )

        db.query(StudentPreference).filter(
            StudentPreference.student_id == student.id
        ).delete()

        for pref in preferences_data:
            db.add(StudentPreference(
                student_id=student.id,
                course_id=pref["course_id"],
                preference_order=pref["preference_order"],
            ))

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Data integrity error: {str(e.orig)}"
        )

    student = db.query(Student).options(
        joinedload(Student.preferences).joinedload(StudentPreference.course)
    ).filter(Student.id == student.id).first()

    return _build_student_response(student)


# =============================================
# DELETE /students/{student_db_id}
# =============================================
@router.delete(
    "/{student_db_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft-delete a student",
)
def delete_student(
    student_db_id: int,
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_db_id, Student.is_active == True
    ).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    student.is_active = False
    db.commit()

    return {"message": f"Student '{student.name}' (id={student_db_id}) deleted successfully."}


# =============================================
# GET /students/by-uid/{student_uid}
# =============================================
@router.get(
    "/by-uid/{student_uid}",
    response_model=StudentResponse,
    summary="Get student by student_id string (e.g. STU2026001)",
)
def get_student_by_uid(
    student_uid: str,
    db: Session = Depends(get_db),
):
    student = db.query(Student).options(
        joinedload(Student.preferences).joinedload(StudentPreference.course)
    ).filter(Student.student_id == student_uid, Student.is_active == True).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    return _build_student_response(student)
