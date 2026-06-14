# API Documentation — CourseFlow AI

**Base URL:** `http://localhost:8000/api`  
**Interactive Docs:** `http://localhost:8000/docs` (Swagger UI)  
**ReDoc:** `http://localhost:8000/redoc`

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Students](#2-students)
3. [Courses](#3-courses)
4. [Allocation](#4-allocation)
5. [Dashboard](#5-dashboard)
6. [AI Assistant](#6-ai-assistant)
7. [Error Responses](#7-error-responses)

---

## 1. Authentication

### POST `/api/auth/login`
Login and receive a JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### GET `/api/auth/me` 🔒
Get current authenticated user.

**Response `200`:**
```json
{
  "id": 1,
  "username": "admin",
  "email": null,
  "full_name": null,
  "role": "admin",
  "student_uid": null,
  "is_active": true,
  "created_at": "2026-01-01T00:00:00+05:30"
}
```

---

### POST `/api/auth/register` 🔒 (Admin)
Create a new user account.

**Request Body:**
```json
{
  "username": "john2026",
  "password": "secure123",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "student",
  "student_uid": "STU001"
}
```

---

### POST `/api/auth/register-student` 🔒 (Admin)
Register a student + optionally create their login account in one call.

**Request Body:**
```json
{
  "name": "Arjun Sharma",
  "email": "arjun@example.com",
  "phone": "9876543201",
  "marks": 98.5,
  "category": "General",
  "application_date": "2026-01-02T00:00:00",
  "preferences": [
    { "course_id": 1, "preference_order": 1 },
    { "course_id": 2, "preference_order": 2 }
  ],
  "login_username": "arjun2026",
  "login_password": "pass123"
}
```

**Response `201`:**
```json
{
  "student": { ... },
  "account_created": true,
  "username": "arjun2026"
}
```

---

### GET `/api/auth/users` 🔒 (Admin)
List all user accounts.

---

### PUT `/api/auth/users/{user_id}` 🔒 (Admin)
Update a user account.

**Request Body (all fields optional):**
```json
{
  "email": "new@example.com",
  "full_name": "New Name",
  "role": "admin",
  "is_active": true,
  "password": "newpassword"
}
```

---

### DELETE `/api/auth/users/{user_id}` 🔒 (Admin)
Delete a user account.

---

## 2. Students

### GET `/api/students` 🔒
List all students with optional filters.

**Query Parameters:**

| Parameter         | Type    | Description                           |
|-------------------|---------|---------------------------------------|
| `search`          | string  | Search by name or student ID          |
| `category`        | string  | Filter: General / OBC / SC / ST       |
| `allocation_status` | string | Filter: Pending / Allocated / Not Allocated |
| `skip`            | int     | Offset (default: 0)                   |
| `limit`           | int     | Max records (default: 50, max: 500)   |

**Response `200`:**
```json
{
  "total": 50,
  "students": [
    {
      "id": 1,
      "student_id": "STU001",
      "name": "Arjun Sharma",
      "email": "arjun@example.com",
      "phone": "9876543201",
      "marks": 98.5,
      "category": "General",
      "application_date": "2026-01-02T05:30:00+05:30",
      "allocation_status": "Allocated",
      "is_active": true,
      "preferences": [
        { "course_id": 1, "course_code": "CS101", "course_name": "Computer Science", "preference_order": 1 }
      ]
    }
  ]
}
```

---

### GET `/api/students/{student_id}` 🔒
Get a single student by ID.

---

### PUT `/api/students/{student_id}` 🔒 (Admin)
Update student details.

**Request Body (all optional):**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "9999999999",
  "marks": 95.0,
  "category": "OBC",
  "application_date": "2026-01-10T00:00:00",
  "preferences": [
    { "course_id": 2, "preference_order": 1 }
  ]
}
```

---

### DELETE `/api/students/{student_id}` 🔒 (Admin)
Soft-delete a student (sets `is_active = false`).

---

## 3. Courses

### GET `/api/courses` 🔒
List all courses.

**Query Parameters:**

| Parameter   | Type    | Description                        |
|-------------|---------|------------------------------------|
| `search`    | string  | Search by name or code             |
| `is_active` | boolean | Filter by active status            |
| `skip`      | int     | Offset                             |
| `limit`     | int     | Max records (max: 500)             |

**Response `200`:**
```json
{
  "total": 10,
  "courses": [
    {
      "id": 1,
      "course_code": "CS101",
      "course_name": "Computer Science & Engineering",
      "description": "Core CS program...",
      "total_seats": 60,
      "allocated_seats": 45,
      "available_seats": 15,
      "is_active": true,
      "category_seats": [
        {
          "id": 1,
          "course_id": 1,
          "category": "OBC",
          "reserved_seats": 16,
          "allocated_seats": 14,
          "available_seats": 2
        }
      ]
    }
  ]
}
```

---

### POST `/api/courses` 🔒 (Admin)
Create a new course.

**Request Body:**
```json
{
  "course_name": "Data Science",
  "description": "ML and data analytics program",
  "total_seats": 60,
  "category_seats": [
    { "category": "OBC", "reserved_seats": 16 },
    { "category": "SC",  "reserved_seats": 9  },
    { "category": "ST",  "reserved_seats": 5  }
  ]
}
```

---

### GET `/api/courses/{course_id}` 🔒
Get a single course by ID.

---

### PUT `/api/courses/{course_id}` 🔒 (Admin)
Update a course. Sending `category_seats` replaces all existing reservations.

---

### DELETE `/api/courses/{course_id}` 🔒 (Admin)
Soft-delete a course.

---

## 4. Allocation

### POST `/api/allocation/process` 🔒 (Admin)
Run the full allocation algorithm. Clears previous results and re-runs.

**Response `200`:**
```json
{
  "message": "Allocation process completed successfully.",
  "summary": {
    "total_students": 50,
    "allocated": 42,
    "not_allocated": 8,
    "first_preference_satisfied": 35,
    "second_preference_satisfied": 5,
    "third_preference_satisfied": 2
  },
  "allocations": [ ... ]
}
```

---

### GET `/api/allocation` 🔒
List all allocations.

**Query Parameters:**

| Parameter   | Type   | Description                           |
|-------------|--------|---------------------------------------|
| `status`    | string | Allocated / Not Allocated / Waitlisted |
| `course_id` | int    | Filter by course                      |
| `category`  | string | Filter by student category            |
| `skip`      | int    | Offset                                |
| `limit`     | int    | Max records                           |

---

### GET `/api/allocation/logs` 🔒
Get audit trail of allocation decisions.

---

### DELETE `/api/allocation/reset` 🔒 (Admin)
Reset all allocation data. Restores all students to Pending status and resets seat counters.

---

## 5. Dashboard

### GET `/api/dashboard/summary` 🔒
Overall system summary.

**Response `200`:**
```json
{
  "total_students": 50,
  "total_courses": 10,
  "allocated_students": 42,
  "not_allocated_students": 8,
  "pending_students": 0,
  "total_seats": 530,
  "total_allocated_seats": 42,
  "total_available_seats": 488
}
```

---

### GET `/api/dashboard/course-stats` 🔒
Per-course allocation statistics (seats used, available, fill rate).

---

### GET `/api/dashboard/category-wise` 🔒
Allocation breakdown by student category.

---

### GET `/api/dashboard/allocated-students` 🔒
List of allocated students, optionally filtered by course.

**Query Parameters:**
- `course_id` (optional) — filter by course

---

### GET `/api/dashboard/available-seats` 🔒
Available seat counts per course.

---

## 6. AI Assistant

### GET `/api/ai/status`
Check AI service availability.

**Response `200`:**
```json
{
  "model": "gemini-2.0-flash",
  "status": "online",
  "provider": "Google ADK"
}
```

---

### POST `/api/ai/chat` 🔒
Ask a natural language question about allocation data.

**Request Body:**
```json
{
  "question": "How many students were allocated to CS101?",
  "session_id": "session-abc-123"
}
```

**Response `200`:**
```json
{
  "question": "How many students were allocated to CS101?",
  "generated_sql": "SELECT COUNT(*) FROM allocations WHERE course_id = 1 AND allocation_status = 'Allocated'",
  "response": "45 students were allocated to CS101 (Computer Science & Engineering).",
  "session_id": "session-abc-123",
  "created_at": "2026-01-15T10:30:00+05:30"
}
```

**Example questions:**
- "How many students got their first preference?"
- "Which course has the most available seats?"
- "Show category-wise allocation summary"
- "Which students did not get allocated?"
- "What is the allocation rate for OBC students?"

---

### GET `/api/ai/chat/history` 🔒
Retrieve past AI conversations.

**Query Parameters:**
- `session_id` (optional)
- `skip`, `limit`

---

### DELETE `/api/ai/chat/history` 🔒
Clear AI chat history.

**Query Parameters:**
- `session_id` (optional — omit to clear all)

---

## 7. Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

| Status | Meaning                              |
|--------|--------------------------------------|
| `400`  | Bad request / validation error       |
| `401`  | Unauthorized — missing/invalid token |
| `403`  | Forbidden — insufficient permissions |
| `404`  | Resource not found                   |
| `409`  | Conflict — duplicate data            |
| `422`  | Unprocessable entity — schema error  |
| `500`  | Internal server error                |
