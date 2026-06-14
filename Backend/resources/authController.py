"""
Authentication Controller
Login, register, user management, role-based access.
Roles: "admin" (full access) | "student" (own profile only)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from configs import Configuration
from models import get_db
from models.models import User, Student
from schemas.user import UserLogin, UserCreate, UserUpdate, Token, UserResponse

router = APIRouter()

# ─── Password hashing ────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# ─── JWT ─────────────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=Configuration.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, Configuration.SECRET_KEY, algorithm=Configuration.ALGORITHM)


# ─── Security dependency ──────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, Configuration.SECRET_KEY, algorithms=[Configuration.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise exc
    except JWTError:
        raise exc
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise exc
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency — raises 403 if the caller is not an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


# =============================================
# Pydantic model for register-student payload
# =============================================
class RegisterStudentPayload(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    marks: float
    category: str
    application_date: Optional[str] = None
    preferences: list = []
    login_username: Optional[str] = ""
    login_password: Optional[str] = ""


# =============================================
# POST /auth/login
# =============================================
@router.post("/login", response_model=Token, summary="Login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = (
        db.query(User).filter(User.username == payload.username).first()
        or db.query(User).filter(User.email == payload.username).first()
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is inactive.")
    return {"access_token": create_access_token({"sub": user.username}), "token_type": "bearer"}


# =============================================
# GET /auth/me
# =============================================
@router.get("/me", response_model=UserResponse, summary="Current user")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# =============================================
# POST /auth/register
# - No auth required if NO users exist (bootstrap)
# - Admin token required once any user exists
# =============================================
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (open for first user, then admin only)",
)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)),
):
    user_count = db.query(User).count()

    if user_count > 0:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            from jose import jwt as _jwt
            payload_jwt = _jwt.decode(token, Configuration.SECRET_KEY, algorithms=[Configuration.ALGORITHM])
            username = payload_jwt.get("sub")
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
        caller = db.query(User).filter(User.username == username, User.is_active == True).first()
        if not caller or caller.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    if payload.role not in ("admin", "student"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="role must be 'admin' or 'student'.")

    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Username '{payload.username}' already exists.")

    student_uid = payload.student_uid
    if payload.role == "student":
        if not student_uid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="student_uid is required for role=student.")
        if not db.query(Student).filter(Student.student_id == student_uid, Student.is_active == True).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Student '{student_uid}' not found.")

    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        student_uid=student_uid,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# =============================================
# POST /auth/register-student  (admin only)
# Creates student record + login account in one shot
# =============================================
@router.post(
    "/register-student",
    status_code=status.HTTP_201_CREATED,
    summary="Register student + create login account (admin only)",
)
def register_student_with_account(
    payload: RegisterStudentPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from resources.studentController import _generate_student_id, _build_student_response
    from models.models import Student, StudentPreference, Course
    from sqlalchemy.exc import IntegrityError

    login_username = (payload.login_username or "").strip()
    login_password = (payload.login_password or "").strip()
    create_account = bool(login_username and login_password)

    # Validate username uniqueness
    if create_account and db.query(User).filter(User.username == login_username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Username '{login_username}' already exists.")

    student_id = _generate_student_id(db)
    email = payload.email or None

    if email and db.query(Student).filter(Student.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Email '{email}' already exists.")

    prefs_raw = payload.preferences or []
    for pref in prefs_raw:
        course_id = int(pref["course_id"]) if isinstance(pref, dict) else int(pref.course_id)
        if not db.query(Course).filter(Course.id == course_id, Course.is_active == True).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Course id={course_id} not found.")

    app_date_raw = payload.application_date
    try:
        app_date = (
            datetime.fromisoformat(app_date_raw.replace("Z", "+00:00"))
            if app_date_raw else datetime.now(timezone.utc)
        )
    except Exception:
        app_date = datetime.now(timezone.utc)

    student = Student(
        student_id=student_id,
        name=payload.name,
        email=email,
        phone=payload.phone or None,
        marks=float(payload.marks or 0),
        category=payload.category,
        application_date=app_date,
        allocation_status="Pending",
        is_active=True,
    )
    db.add(student)
    db.flush()

    sorted_prefs = sorted(
        prefs_raw,
        key=lambda p: int(p.get("preference_order", 99)) if isinstance(p, dict) else int(p.preference_order)
    )
    for idx, pref in enumerate(sorted_prefs, start=1):
        course_id = int(pref["course_id"]) if isinstance(pref, dict) else int(pref.course_id)
        pref_order = int(pref.get("preference_order", idx)) if isinstance(pref, dict) else int(pref.preference_order)
        db.add(StudentPreference(
            student_id=student.id,
            course_id=course_id,
            preference_order=pref_order,
        ))

    if create_account:
        db.add(User(
            username=login_username,
            email=email,
            full_name=payload.name,
            hashed_password=get_password_hash(login_password),
            role="student",
            student_uid=student_id,
            is_active=True,
        ))

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Data integrity error: {str(e.orig)}")

    from sqlalchemy.orm import joinedload
    student = db.query(Student).options(
        joinedload(Student.preferences).joinedload(StudentPreference.course)
    ).filter(Student.id == student.id).first()

    return {
        "student": _build_student_response(student),
        "account_created": create_account,
        "username": login_username if create_account else None,
    }


# =============================================
# GET /auth/users  (admin only)
# =============================================
@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="List all users (admin only)",
)
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id).all()


# =============================================
# PUT /auth/users/{user_id}  (admin only)
# =============================================
@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update a user (admin only)",
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)
    if payload.email is not None:
        user.email = payload.email
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        if payload.role not in ("admin", "student"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="role must be 'admin' or 'student'.")
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.student_uid is not None:
        user.student_uid = payload.student_uid

    db.commit()
    db.refresh(user)
    return user


# =============================================
# DELETE /auth/users/{user_id}  (admin only)
# =============================================
@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a user (admin only)",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot delete your own account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    db.delete(user)
    db.commit()
    return {"message": f"User '{user.username}' deleted."}
