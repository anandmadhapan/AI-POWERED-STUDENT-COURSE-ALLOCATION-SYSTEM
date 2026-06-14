"""
Course Controller
CRUD APIs for course management including category seat configuration.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
import re

from models import get_db
from models.models import Course, CourseCategorySeats
from schemas.course import (
    CourseCreate, CourseUpdate, CourseResponse, CourseListResponse,
    CourseCategorySeatsResponse
)

router = APIRouter()


# =============================================
# Helper: Auto-generate course_code
# =============================================
def _generate_course_code(course_name: str, db: Session) -> str:
    """
    Generate a unique course code from the course name.
    Strategy: take initials of each word (up to 4 chars), uppercase, then append
    a numeric suffix if a collision exists.
    Examples:
      "Computer Science" → "CS"
      "Computer Science" (2nd) → "CS001"
      "Business Administration" → "BA"
      "Bachelor of Business Administration" → "BBA"
    """
    words = re.findall(r'[A-Za-z]+', course_name)
    # Build abbreviation from first letter of each word (max 5 words)
    abbr = ''.join(w[0].upper() for w in words[:5])
    if not abbr:
        abbr = "CRS"

    # Check if base code is available
    if not db.query(Course).filter(Course.course_code == abbr).first():
        return abbr

    # Find the next available numeric suffix
    latest = db.query(func.max(Course.course_code)).filter(
        Course.course_code.like(f"{abbr}%")
    ).scalar()

    seq = 1
    if latest and latest != abbr:
        suffix = latest[len(abbr):]
        try:
            seq = int(suffix) + 1
        except ValueError:
            seq = 1

    return f"{abbr}{seq:03d}"


# =============================================
# Helper: Build CourseResponse
# =============================================
def _build_course_response(course: Course) -> CourseResponse:
    return CourseResponse.from_orm_obj(course)


# =============================================
# POST /courses
# =============================================
@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course",
)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new course with optional per-category seat reservations.
    The course_code is generated automatically from the course name (e.g. CS, BA, ECE).

    - **course_name**: Full course name
    - **total_seats**: Total available seats
    - **category_seats**: Reserved seats per category (sum must not exceed total_seats)
    """
    # Validate seat totals
    try:
        payload.validate_seat_totals()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Auto-generate course_code
    course_code = _generate_course_code(payload.course_name, db)

    course = Course(
        course_code=course_code,
        course_name=payload.course_name,
        description=payload.description,
        total_seats=payload.total_seats,
        allocated_seats=0,
        is_active=True,
    )
    db.add(course)
    db.flush()

    for cs_data in payload.category_seats:
        db.add(CourseCategorySeats(
            course_id=course.id,
            category=cs_data.category,
            reserved_seats=cs_data.reserved_seats,
            allocated_seats=0,
        ))

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Data integrity error: {str(e.orig)}"
        )

    course = db.query(Course).options(
        joinedload(Course.category_seats)
    ).filter(Course.id == course.id).first()

    return _build_course_response(course)


# =============================================
# GET /courses
# =============================================
@router.get(
    "",
    response_model=CourseListResponse,
    summary="List all courses",
)
def list_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all courses with optional filtering."""
    query = db.query(Course).options(joinedload(Course.category_seats))

    if is_active is not None:
        query = query.filter(Course.is_active == is_active)
    if search:
        query = query.filter(
            Course.course_name.ilike(f"%{search}%") |
            Course.course_code.ilike(f"%{search}%")
        )

    total = query.count()
    courses = query.order_by(Course.course_code).offset(skip).limit(limit).all()

    return CourseListResponse(
        total=total,
        courses=[_build_course_response(c) for c in courses],
    )


# =============================================
# GET /courses/{course_id}
# =============================================
@router.get(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Get course by ID",
)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
):
    course = db.query(Course).options(
        joinedload(Course.category_seats)
    ).filter(Course.id == course_id).first()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    return _build_course_response(course)


# =============================================
# PUT /courses/{course_id}
# =============================================
@router.put(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Update course",
)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
):
    course = db.query(Course).options(
        joinedload(Course.category_seats)
    ).filter(Course.id == course_id).first()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    update_data = payload.model_dump(exclude_unset=True)
    category_seats_data = update_data.pop("category_seats", None)

    for field, value in update_data.items():
        setattr(course, field, value)

    # Validate total_seats >= allocated_seats
    if course.total_seats < course.allocated_seats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reduce total_seats below currently allocated seats ({course.allocated_seats})."
        )

    if category_seats_data is not None:
        # Validate reserved sum
        total_reserved = sum(cs["reserved_seats"] for cs in category_seats_data)
        if total_reserved > course.total_seats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total reserved seats ({total_reserved}) exceed total_seats ({course.total_seats})."
            )

        # Delete old category seats and re-create
        db.query(CourseCategorySeats).filter(CourseCategorySeats.course_id == course_id).delete()
        for cs_data in category_seats_data:
            cs = CourseCategorySeats(
                course_id=course.id,
                category=cs_data["category"],
                reserved_seats=cs_data["reserved_seats"],
                allocated_seats=0,  # Reset on update
            )
            db.add(cs)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Data integrity error: {str(e.orig)}"
        )

    course = db.query(Course).options(
        joinedload(Course.category_seats)
    ).filter(Course.id == course.id).first()

    return _build_course_response(course)


# =============================================
# DELETE /courses/{course_id}
# =============================================
@router.delete(
    "/{course_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft-delete a course",
)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    course.is_active = False
    db.commit()

    return {"message": f"Course '{course.course_name}' deleted successfully."}
