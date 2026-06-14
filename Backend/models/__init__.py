from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from configs import Configuration

# =============================================
# Database Setup
# =============================================

SQLALCHEMY_DATABASE_URL = Configuration.DB_URI

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    poolclass=QueuePool,
    # Required for Supabase / cloud Postgres over SSL
    connect_args={"sslmode": "require"},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# =============================================
# Dependency
# =============================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================
# Init Tables
# =============================================
def init_tables():
    """Create all tables if they do not exist."""
    from models.models import (  # noqa: F401 – import triggers ORM registration
        Student,
        Course,
        CourseCategorySeats,
        StudentPreference,
        Allocation,
        AllocationLog,
        AIChatHistory,
        User,
    )
    Base.metadata.create_all(bind=engine)
    print("Success: All database tables created / verified.")
