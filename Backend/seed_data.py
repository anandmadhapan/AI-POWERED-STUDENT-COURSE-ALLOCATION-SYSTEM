"""
Sample Data Seeder
Run this script to populate the database with test data.
Usage: python seed_data.py
"""
import os
import pathlib
from dotenv import load_dotenv

load_dotenv(pathlib.Path(__file__).parent / '.env')

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import sessionmaker
from models import engine, init_tables
from models.models import Student, Course, CourseCategorySeats, StudentPreference, CategoryEnum, User
from resources.authController import get_password_hash

init_tables()

Session = sessionmaker(bind=engine)
db = Session()

print("Seeding database...")

# =============================================
# Users
# =============================================
existing_admin = db.query(User).filter(User.username == "admin").first()
if not existing_admin:
    admin = User(
        username="admin",
        email="admin@courseflow.com",
        hashed_password=get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    print("  [OK] Created default admin user: admin@courseflow.com / admin123")
else:
    print("  [Skip] Admin user already exists, skipping.")

# =============================================
# Courses
# =============================================
courses_data = [
    {
        "course_code": "CS101",
        "course_name": "Computer Science & Engineering",
        "description": "Core CS program covering algorithms, data structures, and software engineering.",
        "total_seats": 60,
        "category_seats": [
            {"category": CategoryEnum.OBC, "reserved_seats": 16},
            {"category": CategoryEnum.SC, "reserved_seats": 9},
            {"category": CategoryEnum.ST, "reserved_seats": 5},
        ],
    },
    {
        "course_code": "EC101",
        "course_name": "Electronics & Communication Engineering",
        "description": "Program covering electronics, circuits, and communication systems.",
        "total_seats": 60,
        "category_seats": [
            {"category": CategoryEnum.OBC, "reserved_seats": 16},
            {"category": CategoryEnum.SC, "reserved_seats": 9},
            {"category": CategoryEnum.ST, "reserved_seats": 5},
        ],
    },
    {
        "course_code": "ME101",
        "course_name": "Mechanical Engineering",
        "description": "Core mechanical engineering program.",
        "total_seats": 60,
        "category_seats": [
            {"category": CategoryEnum.OBC, "reserved_seats": 16},
            {"category": CategoryEnum.SC, "reserved_seats": 9},
            {"category": CategoryEnum.ST, "reserved_seats": 5},
        ],
    },
    {
        "course_code": "CE101",
        "course_name": "Civil Engineering",
        "description": "Civil and structural engineering program.",
        "total_seats": 40,
        "category_seats": [
            {"category": CategoryEnum.OBC, "reserved_seats": 11},
            {"category": CategoryEnum.SC, "reserved_seats": 6},
            {"category": CategoryEnum.ST, "reserved_seats": 3},
        ],
    },
    {
        "course_code": "BBA101",
        "course_name": "Business Administration",
        "description": "Undergraduate business and management program.",
        "total_seats": 80,
        "category_seats": [
            {"category": CategoryEnum.OBC, "reserved_seats": 21},
            {"category": CategoryEnum.SC, "reserved_seats": 12},
            {"category": CategoryEnum.ST, "reserved_seats": 7},
        ],
    },
]

course_objs = {}
for cdata in courses_data:
    existing = db.query(Course).filter(Course.course_code == cdata["course_code"]).first()
    if existing:
        course_objs[cdata["course_code"]] = existing
        print(f"  [Skip] Course {cdata['course_code']} already exists, skipping.")
        continue

    course = Course(
        course_code=cdata["course_code"],
        course_name=cdata["course_name"],
        description=cdata["description"],
        total_seats=cdata["total_seats"],
        allocated_seats=0,
        is_active=True,
    )
    db.add(course)
    db.flush()

    for cs_data in cdata["category_seats"]:
        cs = CourseCategorySeats(
            course_id=course.id,
            category=cs_data["category"],
            reserved_seats=cs_data["reserved_seats"],
            allocated_seats=0,
        )
        db.add(cs)

    course_objs[cdata["course_code"]] = course
    print(f"  [OK] Created course: {cdata['course_name']}")

db.commit()

# =============================================
# Students
# =============================================
base_date = datetime(2026, 1, 1, tzinfo=timezone.utc)

students_data = [
    # High scorers - General
    {"student_id": "STU001", "name": "Arjun Sharma", "email": "arjun@example.com", "marks": 98.5, "category": CategoryEnum.GENERAL, "app_day": 1, "prefs": ["CS101", "EC101", "ME101"]},
    {"student_id": "STU002", "name": "Priya Patel", "email": "priya@example.com", "marks": 97.0, "category": CategoryEnum.GENERAL, "app_day": 2, "prefs": ["CS101", "BBA101", "EC101"]},
    {"student_id": "STU003", "name": "Rohit Kumar", "email": "rohit@example.com", "marks": 95.5, "category": CategoryEnum.GENERAL, "app_day": 1, "prefs": ["EC101", "CS101", "ME101"]},
    {"student_id": "STU004", "name": "Sneha Reddy", "email": "sneha@example.com", "marks": 94.0, "category": CategoryEnum.GENERAL, "app_day": 3, "prefs": ["BBA101", "CS101", "CE101"]},
    {"student_id": "STU005", "name": "Vikram Singh", "email": "vikram@example.com", "marks": 92.5, "category": CategoryEnum.GENERAL, "app_day": 5, "prefs": ["CS101", "ME101", "CE101"]},
    # OBC students
    {"student_id": "STU006", "name": "Anita Joshi", "email": "anita@example.com", "marks": 89.0, "category": CategoryEnum.OBC, "app_day": 2, "prefs": ["CS101", "EC101", "BBA101"]},
    {"student_id": "STU007", "name": "Manoj Yadav", "email": "manoj@example.com", "marks": 85.5, "category": CategoryEnum.OBC, "app_day": 4, "prefs": ["ME101", "CS101", "CE101"]},
    {"student_id": "STU008", "name": "Divya Gupta", "email": "divya@example.com", "marks": 82.0, "category": CategoryEnum.OBC, "app_day": 3, "prefs": ["BBA101", "EC101", "CS101"]},
    {"student_id": "STU009", "name": "Ravi Tiwari", "email": "ravi@example.com", "marks": 78.5, "category": CategoryEnum.OBC, "app_day": 6, "prefs": ["EC101", "ME101", "BBA101"]},
    {"student_id": "STU010", "name": "Pooja Mishra", "email": "pooja@example.com", "marks": 75.0, "category": CategoryEnum.OBC, "app_day": 7, "prefs": ["CS101", "BBA101", "CE101"]},
    # SC students
    {"student_id": "STU011", "name": "Suresh Babu", "email": "suresh@example.com", "marks": 88.0, "category": CategoryEnum.SC, "app_day": 1, "prefs": ["CS101", "EC101", "ME101"]},
    {"student_id": "STU012", "name": "Kavitha Devi", "email": "kavitha@example.com", "marks": 83.5, "category": CategoryEnum.SC, "app_day": 2, "prefs": ["BBA101", "CS101", "CE101"]},
    {"student_id": "STU013", "name": "Rajesh Nair", "email": "rajesh@example.com", "marks": 79.0, "category": CategoryEnum.SC, "app_day": 5, "prefs": ["ME101", "CE101", "BBA101"]},
    {"student_id": "STU014", "name": "Meena Pillai", "email": "meena@example.com", "marks": 74.5, "category": CategoryEnum.SC, "app_day": 8, "prefs": ["EC101", "CS101", "ME101"]},
    {"student_id": "STU015", "name": "Arun Kumar", "email": "arun@example.com", "marks": 70.0, "category": CategoryEnum.SC, "app_day": 10, "prefs": ["CE101", "BBA101", "ME101"]},
    # ST students
    {"student_id": "STU016", "name": "Pradeep Oram", "email": "pradeep@example.com", "marks": 86.0, "category": CategoryEnum.ST, "app_day": 2, "prefs": ["CS101", "ME101", "BBA101"]},
    {"student_id": "STU017", "name": "Sunita Murmu", "email": "sunita@example.com", "marks": 80.0, "category": CategoryEnum.ST, "app_day": 4, "prefs": ["EC101", "BBA101", "CS101"]},
    {"student_id": "STU018", "name": "Dilip Soren", "email": "dilip@example.com", "marks": 73.5, "category": CategoryEnum.ST, "app_day": 6, "prefs": ["ME101", "CE101", "EC101"]},
    # Equal marks — tie breaking by application_date
    {"student_id": "STU019", "name": "Neha Saxena", "email": "neha@example.com", "marks": 91.0, "category": CategoryEnum.GENERAL, "app_day": 3, "prefs": ["CS101", "EC101", "BBA101"]},
    {"student_id": "STU020", "name": "Karan Mehta", "email": "karan@example.com", "marks": 91.0, "category": CategoryEnum.GENERAL, "app_day": 5, "prefs": ["CS101", "ME101", "CE101"]},
]

for sdata in students_data:
    existing = db.query(Student).filter(Student.student_id == sdata["student_id"]).first()
    if existing:
        print(f"  [Skip] Student {sdata['student_id']} already exists, skipping.")
        continue

    student = Student(
        student_id=sdata["student_id"],
        name=sdata["name"],
        email=sdata["email"],
        phone=None,
        marks=sdata["marks"],
        category=sdata["category"],
        application_date=base_date + timedelta(days=sdata["app_day"]),
        allocation_status="Pending",
        is_active=True,
    )
    db.add(student)
    db.flush()

    for idx, course_code in enumerate(sdata["prefs"], start=1):
        course = course_objs.get(course_code)
        if not course:
            continue
        pref = StudentPreference(
            student_id=student.id,
            course_id=course.id,
            preference_order=idx,
        )
        db.add(pref)

    print(f"  [OK] Added student: {sdata['name']} ({sdata['category'].value}, marks={sdata['marks']})")

db.commit()
db.close()

print("\nSeeding complete! Run allocation via: POST /allocation/process")
