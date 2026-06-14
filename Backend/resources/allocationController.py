"""
Allocation Controller
APIs for triggering and viewing allocation results.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from models import get_db
from services.allocation_service import (
    process_allocation, get_allocations, reset_allocation
)
from schemas.allocation import AllocationProcessResponse, AllocationListResponse, AllocationLogResponse

router = APIRouter()


# =============================================
# POST /allocation/process
# =============================================
@router.post(
    "/process",
    response_model=AllocationProcessResponse,
    status_code=status.HTTP_200_OK,
    summary="Run the allocation algorithm",
)
def run_allocation(
    db: Session = Depends(get_db),
):
    """
    Trigger the full allocation process.

    **Business Rules Applied:**
    1. Students sorted by marks (descending) → application_date (ascending) for ties
    2. Category-based seat reservation (General / OBC / SC / ST)
    3. Preference fallback: tries 1 → 2 → 3
    4. Each student allocated to at most one course
    5. All previous allocations are cleared before re-running

    Returns the complete allocation results with a summary.
    """
    try:
        result = process_allocation(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Allocation processing failed: {str(e)}"
        )
    return result


# =============================================
# GET /allocation
# =============================================
@router.get(
    "",
    response_model=AllocationListResponse,
    summary="Get all allocation records",
)
def list_allocations(
    status_filter: Optional[str] = Query(
        None, alias="status",
        description="Filter by status: Allocated / Not Allocated / Waitlisted"
    ),
    course_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Retrieve allocation results with optional filters."""
    return get_allocations(
        db=db,
        status=status_filter,
        course_id=course_id,
        category=category,
        skip=skip,
        limit=limit,
    )


# =============================================
# DELETE /allocation/reset
# =============================================
@router.delete(
    "/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset all allocations",
)
def reset_all_allocations(
    db: Session = Depends(get_db),
):
    """
    Clear all allocation records and reset seat counters.
    All students revert to 'Pending' status.
    """
    return reset_allocation(db)


# =============================================
# GET /allocation/logs
# =============================================
@router.get(
    "/logs",
    response_model=list[AllocationLogResponse],
    summary="Get allocation audit logs",
)
def get_allocation_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Retrieve execution log details of the allocation engine (oldest first for tracing)."""
    from models.models import AllocationLog
    from sqlalchemy.orm import joinedload
    
    logs = db.query(AllocationLog).options(
        joinedload(AllocationLog.student),
        joinedload(AllocationLog.course)
    ).order_by(AllocationLog.id.asc()).offset(skip).limit(limit).all()
    
    return [AllocationLogResponse.from_orm_obj(l) for l in logs]

