"""
Route Aggregator
AI-Powered Student Course Allocation System
"""
from fastapi import APIRouter

from resources.studentController import router as studentRouter
from resources.courseController import router as courseRouter
from resources.allocationController import router as allocationRouter
from resources.dashboardController import router as dashboardRouter
from resources.aiController import router as aiRouter
from resources.authController import router as authRouter

router = APIRouter()

# =============================================
# Auth / Users
# =============================================
router.include_router(
    authRouter,
    prefix="/auth",
    tags=["Authentication"],
)

# =============================================
# Students
# =============================================
router.include_router(
    studentRouter,
    prefix="/students",
    tags=["Students"],
)

# =============================================
# Courses
# =============================================
router.include_router(
    courseRouter,
    prefix="/courses",
    tags=["Courses"],
)

# =============================================
# Allocation
# =============================================
router.include_router(
    allocationRouter,
    prefix="/allocation",
    tags=["Allocation"],
)

# =============================================
# Dashboard
# =============================================
router.include_router(
    dashboardRouter,
    prefix="/dashboard",
    tags=["Dashboard"],
)

# =============================================
# AI Assistant
# =============================================
router.include_router(
    aiRouter,
    prefix="/ai",
    tags=["AI Assistant"],
)
