"""
Allocation Service
Core business logic for the AI-Powered Student Course Allocation System.

Business Rules:
  1. Students with higher marks receive higher priority.
  2. Reservation rules must be considered (General/OBC/SC/ST quotas).
  3. If marks are equal, earlier application_date receives priority.
  4. A student can be allocated only one course.
  5. If the first preference is unavailable, evaluate preference 2 then 3.

Seat Allocation Strategy:
  - Each course has a total_seats pool AND per-category reserved_seats pools.
  - A student from category X is first allocated from their category's reserved pool.
  - If the reserved pool for their category is exhausted, check the general (unreserved) pool.
  - Unreserved seats = total_seats - sum(reserved_seats for all categories)
    (these are open to any category that fills reserved seats first)
  - General category students always use the unreserved pool.
"""
from typing import List, Optional, Dict
from sqlalchemy.orm import Session, joinedload
from models.models import (
    Student, Course, CourseCategorySeats, StudentPreference,
    Allocation, AllocationLog,
    CategoryEnum, AllocationStatusEnum, AllocationActionEnum, StudentStatusEnum
)
from schemas.allocation import (
    AllocationResponse, AllocationListResponse,
    AllocationProcessResponse, AllocationProcessSummary
)


# =============================================
# Helper: Compute unreserved (open) seats
# =============================================
def _get_unreserved_available(course: Course) -> int:
    """
    Open/unreserved seats available in the course.
    unreserved = total_seats - sum(reserved_seats per category)
    available_unreserved = unreserved - (allocated_seats - sum(allocated from reserved))
    Simpler formula: total_seats - allocated_seats - sum(max(0, cat.reserved - cat.allocated)) 
    Actually simplest: total_available - sum(available_reserved_seats_per_cat)
    
    But we track this via course.allocated_seats (total allocated).
    So: open_available = (total_seats - sum(reserved)) - (allocated in open pool)
    
    We compute allocated_in_open = course.allocated_seats - sum(cat.allocated_seats)
    And open_pool = course.total_seats - sum(cat.reserved_seats)
    """
    total_reserved = sum(cs.reserved_seats for cs in course.category_seats)
    total_cat_allocated = sum(cs.allocated_seats for cs in course.category_seats)
    open_pool = course.total_seats - total_reserved
    allocated_in_open = course.allocated_seats - total_cat_allocated
    return max(0, open_pool - allocated_in_open)


# =============================================
# Helper: Try to allocate a seat for student
# =============================================
def _try_allocate_seat(student: Student, course: Course) -> Optional[str]:
    """
    Try to allocate a seat for `student` in `course`.
    Returns:
        None if allocation succeeded (modifies course/category in-place)
        A reason string if allocation failed
    """
    category = student.category

    # Find category-specific seat pool
    cat_seat: Optional[CourseCategorySeats] = next(
        (cs for cs in course.category_seats if cs.category == category), None
    )

    # Attempt 1: Use reserved category pool
    if cat_seat and (cat_seat.reserved_seats - cat_seat.allocated_seats) > 0:
        cat_seat.allocated_seats += 1
        course.allocated_seats += 1
        return None

    # Attempt 2: Use unreserved (open) pool
    unreserved_avail = _get_unreserved_available(course)
    if unreserved_avail > 0:
        course.allocated_seats += 1
        return None

    # No seats available
    return f"No seats available in course '{course.course_name}' for category {category.value}"


# =============================================
# Core: Process Allocation
# =============================================
def process_allocation(db: Session) -> AllocationProcessResponse:
    """
    Run the full allocation algorithm:
      1. Sort students by (marks DESC, application_date ASC)
      2. For each student, try preferences 1 → 2 → 3
      3. Update Allocation, AllocationLog, Student, Course records
    """
    # --- Step 1: Clear existing allocations ---
    db.query(Allocation).delete()
    db.query(AllocationLog).delete()

    # Reset seat counters
    db.query(CourseCategorySeats).update({CourseCategorySeats.allocated_seats: 0})
    db.query(Course).update({Course.allocated_seats: 0})
    db.query(Student).update({Student.allocation_status: StudentStatusEnum.PENDING.value})
    db.commit()

    # --- Step 2: Reload courses with category seats (fresh) ---
    courses: Dict[int, Course] = {
        c.id: c for c in db.query(Course)
        .options(joinedload(Course.category_seats))
        .filter(Course.is_active == True)
        .all()
    }

    # --- Step 3: Load students sorted by priority ---
    students: List[Student] = (
        db.query(Student)
        .options(
            joinedload(Student.preferences).joinedload(StudentPreference.course)
        )
        .filter(Student.is_active == True)
        .order_by(Student.marks.desc(), Student.application_date.asc())
        .all()
    )

    new_allocations: List[Allocation] = []
    logs: List[AllocationLog] = []
    summary = {
        "total_students": len(students),
        "allocated": 0,
        "not_allocated": 0,
        "first_preference_satisfied": 0,
        "second_preference_satisfied": 0,
        "third_preference_satisfied": 0,
    }

    for student in students:
        preferences_sorted = sorted(student.preferences, key=lambda p: p.preference_order)
        allocated = False

        for pref in preferences_sorted:
            course = courses.get(pref.course_id)
            if not course:
                # Course not found / inactive
                logs.append(AllocationLog(
                    student_id=student.id,
                    course_id=pref.course_id,
                    preference_order=pref.preference_order,
                    action=AllocationActionEnum.SKIPPED,
                    remarks=f"Course ID {pref.course_id} not found or inactive."
                ))
                continue

            fail_reason = _try_allocate_seat(student, course)

            if fail_reason is None:
                # SUCCESS — allocate
                alloc = Allocation(
                    student_id=student.id,
                    course_id=course.id,
                    allocated_preference=pref.preference_order,
                    allocation_status=AllocationStatusEnum.ALLOCATED,
                    allocated_marks=student.marks,
                    allocated_category=student.category,
                )
                new_allocations.append(alloc)

                logs.append(AllocationLog(
                    student_id=student.id,
                    course_id=course.id,
                    preference_order=pref.preference_order,
                    action=AllocationActionEnum.ALLOCATED,
                    remarks=(
                        f"Allocated to '{course.course_name}' "
                        f"(preference {pref.preference_order}) "
                        f"with marks {student.marks}."
                    )
                ))

                student.allocation_status = StudentStatusEnum.ALLOCATED.value
                summary["allocated"] += 1

                pref_key = {1: "first", 2: "second", 3: "third"}.get(pref.preference_order, "third")
                summary[f"{pref_key}_preference_satisfied"] += 1
                allocated = True
                break  # Stop trying further preferences

            else:
                # REJECTED for this preference
                logs.append(AllocationLog(
                    student_id=student.id,
                    course_id=course.id,
                    preference_order=pref.preference_order,
                    action=AllocationActionEnum.REJECTED,
                    remarks=fail_reason
                ))

        if not allocated:
            # NOT ALLOCATED
            alloc = Allocation(
                student_id=student.id,
                course_id=None,
                allocated_preference=None,
                allocation_status=AllocationStatusEnum.NOT_ALLOCATED,
                allocated_marks=student.marks,
                allocated_category=student.category,
            )
            new_allocations.append(alloc)
            student.allocation_status = StudentStatusEnum.NOT_ALLOCATED.value
            summary["not_allocated"] += 1

    # --- Step 4: Persist ---
    db.add_all(new_allocations)
    db.add_all(logs)
    db.commit()

    # --- Step 5: Build response ---
    # Reload allocations with relationships for response
    alloc_objs = (
        db.query(Allocation)
        .options(
            joinedload(Allocation.student),
            joinedload(Allocation.course),
        )
        .all()
    )

    return AllocationProcessResponse(
        message="Allocation process completed successfully.",
        summary=AllocationProcessSummary(**summary),
        allocations=[AllocationResponse.from_orm_obj(a) for a in alloc_objs],
    )


# =============================================
# Get All Allocations
# =============================================
def get_allocations(
    db: Session,
    status: Optional[str] = None,
    course_id: Optional[int] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> AllocationListResponse:
    query = (
        db.query(Allocation)
        .options(
            joinedload(Allocation.student),
            joinedload(Allocation.course),
        )
    )

    if status:
        query = query.filter(Allocation.allocation_status == status)
    if course_id:
        query = query.filter(Allocation.course_id == course_id)
    if category:
        query = query.filter(Allocation.allocated_category == category)

    total = query.count()
    objs = query.offset(skip).limit(limit).all()

    return AllocationListResponse(
        total=total,
        allocations=[AllocationResponse.from_orm_obj(a) for a in objs],
    )


# =============================================
# Reset Allocation
# =============================================
def reset_allocation(db: Session) -> dict:
    db.query(Allocation).delete()
    db.query(AllocationLog).delete()
    db.query(CourseCategorySeats).update({CourseCategorySeats.allocated_seats: 0})
    db.query(Course).update({Course.allocated_seats: 0})
    db.query(Student).update({Student.allocation_status: StudentStatusEnum.PENDING.value})
    db.commit()
    return {"message": "All allocations have been reset successfully."}
