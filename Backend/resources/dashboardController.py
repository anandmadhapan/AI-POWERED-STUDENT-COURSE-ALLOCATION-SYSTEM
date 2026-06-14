"""
Dashboard Controller
Summary statistics and analytics for the allocation dashboard.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from models import get_db
from models.models import (
    Student, Course, CourseCategorySeats, StudentPreference,
    Allocation, AllocationLog,
    AllocationStatusEnum, AllocationActionEnum, CategoryEnum
)

router = APIRouter()


# =============================================
# GET /dashboard/summary
# =============================================
@router.get(
    "/summary",
    summary="Overall dashboard summary",
)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns high-level statistics:
    - Total students, courses
    - Allocation counts
    - Preference satisfaction rates
    """
    total_students = db.query(Student).filter(Student.is_active == True).count()
    total_courses = db.query(Course).filter(Course.is_active == True).count()

    total_allocated = db.query(Allocation).filter(
        Allocation.allocation_status == AllocationStatusEnum.ALLOCATED
    ).count()

    total_not_allocated = db.query(Allocation).filter(
        Allocation.allocation_status == AllocationStatusEnum.NOT_ALLOCATED
    ).count()

    first_pref = db.query(Allocation).filter(
        Allocation.allocation_status == AllocationStatusEnum.ALLOCATED,
        Allocation.allocated_preference == 1
    ).count()

    second_pref = db.query(Allocation).filter(
        Allocation.allocation_status == AllocationStatusEnum.ALLOCATED,
        Allocation.allocated_preference == 2
    ).count()

    third_pref = db.query(Allocation).filter(
        Allocation.allocation_status == AllocationStatusEnum.ALLOCATED,
        Allocation.allocated_preference == 3
    ).count()

    total_seats = db.query(func.sum(Course.total_seats)).filter(Course.is_active == True).scalar() or 0
    total_available = db.query(
        func.sum(Course.total_seats - Course.allocated_seats)
    ).filter(Course.is_active == True).scalar() or 0

    return {
        "total_students": total_students,
        "total_courses": total_courses,
        "total_seats": total_seats,
        "total_available_seats": int(total_available),
        "allocation": {
            "total_allocated": total_allocated,
            "total_not_allocated": total_not_allocated,
            "allocation_rate": round((total_allocated / total_students * 100), 2) if total_students > 0 else 0.0,
        },
        "preference_satisfaction": {
            "first_preference": first_pref,
            "second_preference": second_pref,
            "third_preference": third_pref,
            "first_preference_rate": round((first_pref / total_allocated * 100), 2) if total_allocated > 0 else 0.0,
        },
    }


# =============================================
# GET /dashboard/course-stats
# =============================================
@router.get(
    "/course-stats",
    summary="Per-course allocation statistics",
)
def get_course_stats(db: Session = Depends(get_db)):
    """
    Returns per-course breakdown:
    - Allocated / available seats
    - Rejection rate
    - Category-wise seat utilization
    """
    courses = db.query(Course).filter(Course.is_active == True).all()

    result = []
    for course in courses:
        allocated_count = db.query(Allocation).filter(
            Allocation.course_id == course.id,
            Allocation.allocation_status == AllocationStatusEnum.ALLOCATED
        ).count()

        # Total students who preferred this course at ANY preference
        total_applicants = db.query(StudentPreference).filter(
            StudentPreference.course_id == course.id
        ).count()

        # Rejection count = students who tried this course but got rejected (log records)
        rejected_count = db.query(AllocationLog).filter(
            AllocationLog.course_id == course.id,
            AllocationLog.action == AllocationActionEnum.REJECTED
        ).count()

        rejection_rate = round(
            (rejected_count / total_applicants * 100), 2
        ) if total_applicants > 0 else 0.0

        # Category seat breakdown
        cat_breakdown = []
        for cs in course.category_seats:
            cat_breakdown.append({
                "category": cs.category.value,
                "reserved_seats": cs.reserved_seats,
                "allocated_seats": cs.allocated_seats,
                "available_seats": cs.reserved_seats - cs.allocated_seats,
            })

        result.append({
            "course_id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
            "total_seats": course.total_seats,
            "allocated_seats": allocated_count,
            "available_seats": course.total_seats - allocated_count,
            "total_applicants": total_applicants,
            "rejected_count": rejected_count,
            "rejection_rate_percent": rejection_rate,
            "fill_rate_percent": round((allocated_count / course.total_seats * 100), 2) if course.total_seats > 0 else 0.0,
            "category_breakdown": cat_breakdown,
        })

    # Sort by rejection rate descending
    result.sort(key=lambda x: x["rejection_rate_percent"], reverse=True)
    return {"courses": result}


# =============================================
# GET /dashboard/category-wise
# =============================================
@router.get(
    "/category-wise",
    summary="Category-wise allocation summary",
)
def get_category_wise_summary(db: Session = Depends(get_db)):
    """
    Returns allocation summary broken down by student category.
    """
    categories = [cat.value for cat in CategoryEnum]
    result = []

    for cat in categories:
        total_students = db.query(Student).filter(
            Student.category == cat,
            Student.is_active == True
        ).count()

        allocated = db.query(Allocation).filter(
            Allocation.allocated_category == cat,
            Allocation.allocation_status == AllocationStatusEnum.ALLOCATED
        ).count()

        not_allocated = db.query(Allocation).filter(
            Allocation.allocated_category == cat,
            Allocation.allocation_status == AllocationStatusEnum.NOT_ALLOCATED
        ).count()

        first_pref = db.query(Allocation).filter(
            Allocation.allocated_category == cat,
            Allocation.allocation_status == AllocationStatusEnum.ALLOCATED,
            Allocation.allocated_preference == 1
        ).count()

        result.append({
            "category": cat,
            "total_students": total_students,
            "allocated": allocated,
            "not_allocated": not_allocated,
            "allocation_rate_percent": round((allocated / total_students * 100), 2) if total_students > 0 else 0.0,
            "first_preference_allocated": first_pref,
            "first_preference_rate_percent": round((first_pref / allocated * 100), 2) if allocated > 0 else 0.0,
        })

    return {"category_summary": result}


# =============================================
# GET /dashboard/allocated-students
# =============================================
@router.get(
    "/allocated-students",
    summary="List of allocated students with course details",
)
def get_allocated_students(
    course_id: int = None,
    db: Session = Depends(get_db),
):
    """Returns students who were successfully allocated."""
    from sqlalchemy.orm import joinedload
    from models.models import Allocation

    query = db.query(Allocation).filter(
        Allocation.allocation_status == AllocationStatusEnum.ALLOCATED
    ).options(
        joinedload(Allocation.student),
        joinedload(Allocation.course),
    )

    if course_id:
        query = query.filter(Allocation.course_id == course_id)

    allocations = query.all()

    return {
        "total": len(allocations),
        "students": [
            {
                "student_id": a.student.student_id,
                "student_name": a.student.name,
                "marks": a.student.marks,
                "category": a.student.category.value,
                "course_code": a.course.course_code if a.course else None,
                "course_name": a.course.course_name if a.course else None,
                "preference_satisfied": a.allocated_preference,
                "allocated_at": a.allocated_at,
            }
            for a in allocations
        ]
    }


# =============================================
# GET /dashboard/available-seats
# =============================================
@router.get(
    "/available-seats",
    summary="Available seats per course and category",
)
def get_available_seats(db: Session = Depends(get_db)):
    """Returns current seat availability for all active courses."""
    courses = db.query(Course).filter(Course.is_active == True).all()

    result = []
    for course in courses:
        total_reserved = sum(cs.reserved_seats for cs in course.category_seats)
        total_cat_allocated = sum(cs.allocated_seats for cs in course.category_seats)
        open_pool = course.total_seats - total_reserved
        allocated_in_open = course.allocated_seats - total_cat_allocated
        open_available = max(0, open_pool - allocated_in_open)

        result.append({
            "course_id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
            "total_seats": course.total_seats,
            "total_allocated": course.allocated_seats,
            "total_available": course.total_seats - course.allocated_seats,
            "open_pool": open_pool,
            "open_pool_available": open_available,
            "category_seats": [
                {
                    "category": cs.category.value,
                    "reserved": cs.reserved_seats,
                    "allocated": cs.allocated_seats,
                    "available": cs.reserved_seats - cs.allocated_seats,
                }
                for cs in course.category_seats
            ],
        })

    return {"courses": result}
