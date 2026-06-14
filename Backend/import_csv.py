"""
CSV Data Importer
Reads courses.csv and students.csv from the data/ folder and seeds the database.

Usage:
    python import_csv.py                    # import both
    python import_csv.py --courses          # courses only
    python import_csv.py --students         # students only
    python import_csv.py --clear            # clear all data first, then import
"""
import os
import sys
import csv
import argparse
import pathlib
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(pathlib.Path(__file__).parent / '.env')

from sqlalchemy.orm import sessionmaker
from models import engine, init_tables
from models.models import (
    Student, Course, CourseCategorySeats, StudentPreference,
    CategoryEnum, User, Allocation, AllocationLog
)
from resources.authController import get_password_hash

# ── Paths ─────────────────────────────────────────────────
BASE_DIR   = pathlib.Path(__file__).parent
DATA_DIR   = BASE_DIR / 'data'
COURSES_CSV = DATA_DIR / 'courses.csv'
STUDENTS_CSV = DATA_DIR / 'students.csv'

# ── Category mapping (CSV value → Enum) ───────────────────
CATEGORY_MAP = {
    'general': CategoryEnum.GENERAL,
    'obc':     CategoryEnum.OBC,
    'sc':      CategoryEnum.SC,
    'st':      CategoryEnum.ST,
}


def clear_data(db):
    """Delete all students, courses, allocations, and logs (keeps admin user)."""
    print("  Clearing existing data…")
    db.query(AllocationLog).delete()
    db.query(Allocation).delete()
    db.query(StudentPreference).delete()
    db.query(CourseCategorySeats).delete()
    db.query(Student).delete()
    db.query(Course).delete()
    db.commit()
    print("  [OK] All student/course data cleared.")


def import_courses(db):
    """Import courses from data/courses.csv"""
    if not COURSES_CSV.exists():
        print(f"  [ERROR] File not found: {COURSES_CSV}")
        return {}

    course_objs = {}
    added = skipped = 0

    with open(COURSES_CSV, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row['course_code'].strip()

            existing = db.query(Course).filter(Course.course_code == code).first()
            if existing:
                course_objs[code] = existing
                skipped += 1
                continue

            course = Course(
                course_code=code,
                course_name=row['course_name'].strip(),
                description=row.get('description', '').strip() or None,
                total_seats=int(row['total_seats']),
                allocated_seats=0,
                is_active=True,
            )
            db.add(course)
            db.flush()

            # Category seats from CSV columns: obc_seats, sc_seats, st_seats
            seat_map = {
                CategoryEnum.OBC: int(row.get('obc_seats') or 0),
                CategoryEnum.SC:  int(row.get('sc_seats') or 0),
                CategoryEnum.ST:  int(row.get('st_seats') or 0),
            }
            for cat, seats in seat_map.items():
                if seats > 0:
                    db.add(CourseCategorySeats(
                        course_id=course.id,
                        category=cat,
                        reserved_seats=seats,
                        allocated_seats=0,
                    ))

            course_objs[code] = course
            added += 1
            print(f"    [+] {code} — {row['course_name'].strip()} ({row['total_seats']} seats)")

    db.commit()
    print(f"  Courses: {added} added, {skipped} already existed.\n")
    return course_objs


def import_students(db, course_objs):
    """Import students from data/students.csv"""
    if not STUDENTS_CSV.exists():
        print(f"  [ERROR] File not found: {STUDENTS_CSV}")
        return

    # Reload any existing courses not passed in
    all_courses = {c.course_code: c for c in db.query(Course).all()}
    all_courses.update(course_objs)

    added = skipped = errors = 0

    with open(STUDENTS_CSV, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row['student_id'].strip()

            existing = db.query(Student).filter(Student.student_id == sid).first()
            if existing:
                skipped += 1
                continue

            # Parse category
            cat_raw = row['category'].strip().lower()
            category = CATEGORY_MAP.get(cat_raw)
            if category is None:
                print(f"    [WARN] Unknown category '{row['category']}' for {sid}, skipping.")
                errors += 1
                continue

            # Parse application date
            try:
                app_date = datetime.fromisoformat(row['application_date'].strip())
                if app_date.tzinfo is None:
                    app_date = app_date.replace(tzinfo=timezone.utc)
            except ValueError:
                app_date = datetime.now(timezone.utc)

            # Parse marks
            try:
                marks = float(row['marks'])
            except ValueError:
                print(f"    [WARN] Invalid marks for {sid}, skipping.")
                errors += 1
                continue

            student = Student(
                student_id=sid,
                name=row['name'].strip(),
                email=row.get('email', '').strip() or None,
                phone=row.get('phone', '').strip() or None,
                marks=marks,
                category=category,
                application_date=app_date,
                allocation_status="Pending",
                is_active=True,
            )
            db.add(student)
            db.flush()

            # Add preferences (pref1, pref2, pref3)
            pref_order = 1
            for pref_col in ['pref1', 'pref2', 'pref3']:
                course_code = row.get(pref_col, '').strip()
                if not course_code:
                    continue
                course = all_courses.get(course_code)
                if not course:
                    print(f"    [WARN] Course '{course_code}' not found for {sid}, skipping preference.")
                    continue
                db.add(StudentPreference(
                    student_id=student.id,
                    course_id=course.id,
                    preference_order=pref_order,
                ))
                pref_order += 1

            added += 1
            print(f"    [+] {sid} — {row['name'].strip()} ({category.value}, {marks})")

    db.commit()
    print(f"  Students: {added} added, {skipped} already existed, {errors} errors.\n")


def ensure_admin(db):
    """Create default admin if not present."""
    if not db.query(User).filter(User.username == 'admin').first():
        db.add(User(
            username='admin',
            email='admin@courseflow.com',
            hashed_password=get_password_hash('admin123'),
            role='admin',
            is_active=True,
        ))
        db.commit()
        print("  [OK] Created default admin: admin@courseflow.com / admin123\n")


def main():
    parser = argparse.ArgumentParser(description='Import CSV data into the database.')
    parser.add_argument('--courses',  action='store_true', help='Import courses only')
    parser.add_argument('--students', action='store_true', help='Import students only')
    parser.add_argument('--clear',    action='store_true', help='Clear existing data before importing')
    args = parser.parse_args()

    # Default: import both
    do_courses  = args.courses  or not (args.courses or args.students)
    do_students = args.students or not (args.courses or args.students)

    init_tables()
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print("=" * 50)
        print("  CSV Data Importer")
        print("=" * 50)

        if args.clear:
            clear_data(db)

        ensure_admin(db)

        course_objs = {}
        if do_courses:
            print("Importing courses…")
            course_objs = import_courses(db)

        if do_students:
            print("Importing students…")
            import_students(db, course_objs)

        print("=" * 50)
        print("  Import complete!")
        print("  Run allocation: POST /allocation/process")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Import failed: {e}")
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()
