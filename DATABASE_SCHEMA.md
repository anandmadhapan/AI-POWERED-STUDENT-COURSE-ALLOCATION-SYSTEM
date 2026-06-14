# Database Schema — CourseFlow AI

**Database:** PostgreSQL  
**ORM:** SQLAlchemy 2.x

---

## Entity Relationship Overview

```
users ──────────────────────────────────────────────────────────────────┐
                                                                         │ (student_uid → student_id)
students ─────────────────┬──────────────────────────────────────────────┘
    │                     │
    │ 1:N                 │ 1:N
    ▼                     ▼
student_preferences    allocations ──────── courses ──── course_category_seats
    │                     │                    │
    │ N:1                 │ N:1                │ 1:N
    └──────► courses      └──────► courses     └──────► course_category_seats

students ─── 1:N ──► allocation_logs
students ─── 1:N ──► ai_chat_history (session-based)
```

---

## Tables

### `students`

| Column              | Type                | Constraints               | Description                          |
|---------------------|---------------------|---------------------------|--------------------------------------|
| `id`                | INTEGER             | PK, AUTO                  | Internal primary key                 |
| `student_id`        | VARCHAR(50)         | UNIQUE, NOT NULL, INDEX   | Human-readable ID (e.g. STU001)      |
| `name`              | VARCHAR(255)        | NOT NULL                  | Full name                            |
| `email`             | VARCHAR(255)        | UNIQUE, NULLABLE, INDEX   | Email address                        |
| `phone`             | VARCHAR(20)         | NULLABLE                  | Phone number                         |
| `marks`             | FLOAT               | NOT NULL                  | Percentage marks (0–100)             |
| `category`          | ENUM(category_enum) | NOT NULL, INDEX           | General / OBC / SC / ST              |
| `application_date`  | TIMESTAMPTZ         | NOT NULL                  | Date of application (used for tiebreaking) |
| `allocation_status` | VARCHAR(50)         | NOT NULL, INDEX           | Pending / Allocated / Not Allocated  |
| `is_active`         | BOOLEAN             | NOT NULL, DEFAULT true    | Soft delete flag                     |
| `created_at`        | TIMESTAMPTZ         | server_default now()      | Record creation timestamp            |
| `updated_at`        | TIMESTAMPTZ         | onupdate now()            | Last update timestamp                |

**Indexes:** `student_id`, `email`, `category`, `allocation_status`

---

### `courses`

| Column            | Type         | Constraints             | Description                        |
|-------------------|--------------|-------------------------|------------------------------------|
| `id`              | INTEGER      | PK, AUTO                | Internal primary key               |
| `course_code`     | VARCHAR(50)  | UNIQUE, NOT NULL, INDEX | Short code (e.g. CS101)            |
| `course_name`     | VARCHAR(255) | NOT NULL                | Full course name                   |
| `description`     | TEXT         | NULLABLE                | Optional course description        |
| `total_seats`     | INTEGER      | NOT NULL                | Total capacity                     |
| `allocated_seats` | INTEGER      | NOT NULL, DEFAULT 0     | Counter: seats filled              |
| `is_active`       | BOOLEAN      | NOT NULL, DEFAULT true  | Soft delete flag                   |
| `created_at`      | TIMESTAMPTZ  | server_default now()    |                                    |
| `updated_at`      | TIMESTAMPTZ  | onupdate now()          |                                    |

**Computed property:** `available_seats = total_seats - allocated_seats`

---

### `course_category_seats`

| Column            | Type                | Constraints                              | Description                        |
|-------------------|---------------------|------------------------------------------|------------------------------------|
| `id`              | INTEGER             | PK, AUTO                                 |                                    |
| `course_id`       | INTEGER             | FK → courses.id CASCADE, NOT NULL, INDEX |                                    |
| `category`        | ENUM(category_enum) | NOT NULL, INDEX                          | OBC / SC / ST (General = open pool)|
| `reserved_seats`  | INTEGER             | NOT NULL                                 | Reserved quota for this category   |
| `allocated_seats` | INTEGER             | NOT NULL, DEFAULT 0                      | Counter: filled from this quota    |
| `created_at`      | TIMESTAMPTZ         | server_default now()                     |                                    |
| `updated_at`      | TIMESTAMPTZ         | onupdate now()                           |                                    |

**Unique constraint:** `(course_id, category)` — one row per category per course  
**Computed property:** `available_seats = reserved_seats - allocated_seats`

---

### `student_preferences`

| Column             | Type    | Constraints                               | Description                     |
|--------------------|---------|-------------------------------------------|---------------------------------|
| `id`               | INTEGER | PK, AUTO                                  |                                 |
| `student_id`       | INTEGER | FK → students.id CASCADE, NOT NULL, INDEX |                                 |
| `course_id`        | INTEGER | FK → courses.id CASCADE, NOT NULL, INDEX  |                                 |
| `preference_order` | INTEGER | NOT NULL                                  | 1 = first choice, 2, 3, etc.    |
| `created_at`       | TIMESTAMPTZ | server_default now()                  |                                 |

**Unique constraints:**
- `(student_id, preference_order)` — one entry per preference slot
- `(student_id, course_id)` — student cannot list same course twice

---

### `allocations`

| Column                | Type                        | Constraints                               | Description                             |
|-----------------------|-----------------------------|-------------------------------------------|-----------------------------------------|
| `id`                  | INTEGER                     | PK, AUTO                                  |                                         |
| `student_id`          | INTEGER                     | FK → students.id CASCADE, UNIQUE, INDEX   | One allocation per student              |
| `course_id`           | INTEGER                     | FK → courses.id SET NULL, NULLABLE, INDEX | NULL if not allocated                   |
| `allocated_preference`| INTEGER                     | NULLABLE                                  | Which preference was satisfied (1/2/3)  |
| `allocation_status`   | ENUM(allocation_status_enum)| NOT NULL, INDEX                           | Allocated / Not Allocated / Waitlisted  |
| `allocated_marks`     | FLOAT                       | NOT NULL                                  | Marks at time of allocation             |
| `allocated_category`  | ENUM(category_enum)         | NOT NULL                                  | Student category at allocation time     |
| `allocated_at`        | TIMESTAMPTZ                 | server_default now()                      |                                         |
| `updated_at`          | TIMESTAMPTZ                 | onupdate now()                            |                                         |

**Composite index:** `(course_id, allocation_status)`

---

### `allocation_logs`

| Column             | Type                        | Constraints                               | Description                        |
|--------------------|-----------------------------|-------------------------------------------|------------------------------------|
| `id`               | INTEGER                     | PK, AUTO                                  |                                    |
| `student_id`       | INTEGER                     | FK → students.id CASCADE, NOT NULL, INDEX |                                    |
| `course_id`        | INTEGER                     | FK → courses.id SET NULL, NULLABLE, INDEX |                                    |
| `preference_order` | INTEGER                     | NULLABLE                                  |                                    |
| `action`           | ENUM(allocation_action_enum)| NOT NULL                                  | Allocated / Rejected / Waitlisted / Skipped |
| `remarks`          | TEXT                        | NULLABLE                                  | Human-readable reason              |
| `created_at`       | TIMESTAMPTZ                 | server_default now()                      |                                    |

---

### `ai_chat_history`

| Column          | Type    | Constraints          | Description                        |
|-----------------|---------|----------------------|------------------------------------|
| `id`            | INTEGER | PK, AUTO             |                                    |
| `session_id`    | VARCHAR(100) | NULLABLE, INDEX | Groups messages in a session       |
| `question`      | TEXT    | NOT NULL             | User's question                    |
| `generated_sql` | TEXT    | NULLABLE             | SQL generated by AI                |
| `response`      | TEXT    | NULLABLE             | AI's natural language answer       |
| `created_at`    | TIMESTAMPTZ | server_default now() |                                |

---

### `users`

| Column            | Type         | Constraints             | Description                         |
|-------------------|--------------|-------------------------|-------------------------------------|
| `id`              | INTEGER      | PK, AUTO                |                                     |
| `username`        | VARCHAR(50)  | UNIQUE, NOT NULL, INDEX |                                     |
| `email`           | VARCHAR(255) | UNIQUE, NULLABLE, INDEX |                                     |
| `full_name`       | VARCHAR(255) | NULLABLE                |                                     |
| `hashed_password` | VARCHAR(255) | NOT NULL                | bcrypt hash                         |
| `role`            | VARCHAR(50)  | NOT NULL, DEFAULT admin | admin / student                     |
| `student_uid`     | VARCHAR(50)  | NULLABLE, INDEX         | Links to students.student_id        |
| `is_active`       | BOOLEAN      | NOT NULL, DEFAULT true  |                                     |
| `created_at`      | TIMESTAMPTZ  | server_default now()    |                                     |

---

## Enums

```sql
-- category_enum
CREATE TYPE category_enum AS ENUM ('General', 'OBC', 'SC', 'ST');

-- allocation_status_enum
CREATE TYPE allocation_status_enum AS ENUM ('Allocated', 'Waitlisted', 'Not Allocated');

-- allocation_action_enum
CREATE TYPE allocation_action_enum AS ENUM ('Allocated', 'Rejected', 'Waitlisted', 'Skipped');
```

---

## Seat Allocation Logic

```
For each course:
  open_pool = total_seats - SUM(reserved_seats for OBC + SC + ST)

For a student of category X applying to a course:
  1. Check course_category_seats WHERE category = X
     → If available_seats > 0: allocate from reserved pool
  2. Else check open_pool:
     → If open_pool available_seats > 0: allocate from open pool
  3. Else: REJECTED for this preference → try next preference
```

General category students **always** use the open pool (no reserved seats for General).
