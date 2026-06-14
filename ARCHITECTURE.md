# Architecture Document — CourseFlow AI

---

## 1. Architecture Design

CourseFlow AI follows a **decoupled three-tier architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│  React 19 SPA · Vite · TanStack Query · React Hook Form  │
│  Pages: Dashboard, Students, Courses, Allocation, AI     │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP/REST (JSON)
                            │ JWT Bearer Token
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                      │
│  FastAPI (Python 3.11)                                   │
│  ┌──────────┬──────────┬──────────┬──────────┬───────┐  │
│  │  Auth    │ Students │ Courses  │Allocation│  AI   │  │
│  │Controller│Controller│Controller│Controller│Controller│ │
│  └──────────┴──────────┴──────────┴──────────┴───────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Services (Business Logic Layer)            │  │
│  │  AllocationService · AIService                     │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │    SQLAlchemy ORM · Pydantic Schemas               │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │ SQLAlchemy / psycopg2
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     DATA LAYER                           │
│  PostgreSQL (Supabase cloud)                            │
│  Tables: students, courses, course_category_seats,      │
│          student_preferences, allocations,              │
│          allocation_logs, ai_chat_history, users        │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
            Google Gemini AI    JWT Auth
            (ADK 0.3+)          (python-jose)
```

### Key Design Principles

- **Separation of Concerns** — Controllers handle HTTP layer only; business logic lives in services.
- **Single Responsibility** — Each controller owns one resource domain.
- **Stateless API** — All state carried in JWT tokens; no server-side sessions.
- **Soft Deletes** — Students and courses use `is_active` flag; data is never hard deleted.
- **IST Timestamps** — All datetime responses serialized to Indian Standard Time (UTC+5:30).

---

## 2. Database Design Decisions

### Why PostgreSQL?
- Native ENUM types map cleanly to Python enums (CategoryEnum, AllocationStatusEnum).
- ACID compliance ensures allocation counter consistency under concurrent writes.
- Supabase provides managed PostgreSQL with connection pooling and SSL.

### Seat Counter Strategy
Instead of computing available seats via JOIN on every request, we maintain **denormalized counters**:
- `courses.allocated_seats` — total seats filled across all categories
- `course_category_seats.allocated_seats` — seats filled from each category's reserved pool

This makes availability checks O(1) during the allocation loop.

**Trade-off:** Counters must be kept consistent. The allocation service resets and rebuilds them atomically on each run.

### Cascade Deletes
- `student_preferences` → CASCADE on student delete (preferences have no meaning without a student)
- `allocation_logs` → CASCADE on student delete (audit trail cleaned up)
- `course_id` in `allocations` → SET NULL (preserve allocation record even if course is deleted)

### Unique Constraints
- `(student_id, preference_order)` — prevents two entries at the same preference slot
- `(student_id, course_id)` — prevents the same course appearing twice in preferences
- `(course_id, category)` — one reservation row per category per course

### Separation of `students` and `users`
Students and user accounts are deliberately separate tables:
- A student can exist without a login (registered by admin, no self-service portal yet)
- The link is `users.student_uid → students.student_id` (string FK, not integer)
- This allows admin accounts that have no corresponding student record

---

## 3. AI Integration Approach

### Technology: Google Gemini 2.0 Flash via ADK

The AI assistant uses **Google ADK (Agent Development Kit)** which wraps the Gemini API with tool-calling and session management capabilities.

### How It Works

```
User Question
     │
     ▼
AIService.chat_with_ai()
     │
     ├── 1. Build database schema context
     │        (table names, columns, enums)
     │
     ├── 2. Send to Gemini with system prompt:
     │        "You are a SQL expert. Given this schema,
     │         generate a SELECT query to answer: {question}"
     │
     ├── 3. Execute generated SQL against PostgreSQL
     │        (read-only, SELECT only)
     │
     ├── 4. Send SQL results back to Gemini:
     │        "Here are the results: {data}. Answer the question naturally."
     │
     ├── 5. Return final natural language response
     │
     └── 6. Store in ai_chat_history (question + sql + response)
```

### Safety Measures
- Only `SELECT` statements are executed — INSERT/UPDATE/DELETE are rejected
- SQL is parsed before execution to verify it's read-only
- Query results are capped to prevent context window overflow
- API key is stored in `.env`, never exposed to the frontend

### Session Management
Each chat session has a `session_id` (UUID generated client-side). History is stored per-session allowing context-aware follow-up questions.

---

## 4. Security Considerations

### Authentication
- **JWT (JSON Web Tokens)** — signed with HS256, configurable expiry (default 60 min)
- **bcrypt** password hashing — cost factor auto-managed by passlib
- Tokens stored in `localStorage` on the client (suitable for this admin-only tool)

### Authorization
- **Role-based access control** — `admin` vs `student` roles
- `require_admin` FastAPI dependency — applied to all write endpoints
- Students can only view their own profile via `/students/me`

### Bootstrap Security
- First user registration requires no token (bootstrapping an empty system)
- All subsequent registrations require an admin token

### CORS
- Currently `allow_origins=["*"]` for development
- **Production:** restrict to the frontend's domain only

### Input Validation
- All request bodies validated by Pydantic schemas with field constraints
- SQL injection prevented — all database queries use SQLAlchemy ORM parameterization
- AI-generated SQL is validated before execution (SELECT-only policy)

### Sensitive Data
- Passwords are never returned in API responses (hashed_password excluded from UserResponse)
- `.env` contains all secrets and is in `.gitignore`

### Production Checklist
- [ ] Change `SECRET_KEY` to a random 64-character string
- [ ] Set `allow_origins` to specific frontend domain
- [ ] Enable HTTPS on the backend
- [ ] Rotate `GOOGLE_API_KEY` periodically
- [ ] Use connection pooling (PgBouncer or Supabase connection pooler)

---

## 5. Challenges Faced and Solutions Implemented

### Challenge 1: Tailwind v4 Breaking Select Element Styling

**Problem:** Tailwind CSS v4 rewrites CSS custom properties and resets `color: inherit` on form elements via its preflight. Native `<select>` elements showed blank text despite having explicit color styles.

**Solution:** Replaced all filter/form `<select>` elements with pure inline styles (no Tailwind class for color). For the category picker inside the course form, built a fully custom dropdown using `<div>` + `<button>` elements that have zero CSS framework interference.

---

### Challenge 2: React Hook Form Field Array Not Showing Selected Values

**Problem:** `useFieldArray` with `register()` on a `<select>` inside the edit modal showed blank — the existing category value wasn't pre-selected even though defaultValues was correct.

**Root Cause:** `register()` creates uncontrolled inputs. The browser's native select needs `defaultValue` to pre-select on render, but react-hook-form's `useForm` only reads `defaultValues` once on mount. The edit modal was reusing the same component instance.

**Solution:**
1. Added `key={modal.data.id}` on the form component to force remount when editing a different record
2. Switched from `register()` to `Controller` for selects — this makes them fully controlled (value + onChange), so the selected option is always driven by form state

---

### Challenge 3: Allocation Counter Consistency

**Problem:** When running the allocation algorithm, course seat counters could become inconsistent if the process was interrupted partway through.

**Solution:** The allocation service:
1. Resets all counters to 0 at the start of every run
2. Processes all students in a single transaction
3. Commits only at the end — if anything fails, the whole run rolls back
4. This makes the process **idempotent** — safe to re-run anytime

---

### Challenge 4: Category Seat Pool vs Open Pool Calculation

**Problem:** Determining whether a student should use the reserved category pool or the open (unreserved) pool required careful accounting to avoid double-counting.

**Solution:** Defined a clear formula:
```
open_pool_size = total_seats - SUM(all category reserved_seats)
allocated_in_open = course.allocated_seats - SUM(all category allocated_seats)
open_available = open_pool_size - allocated_in_open
```
This correctly accounts for students who overflowed into the open pool from exhausted category pools.

---

### Challenge 5: IST Timestamp Serialization

**Problem:** FastAPI's default datetime serialization outputs UTC ISO strings. All timestamps needed to be in IST (UTC+5:30) for Indian users.

**Solution:** Replaced FastAPI's default datetime encoder using `ENCODERS_BY_TYPE[datetime]` with a custom function that converts all datetimes to IST before serialization. This is applied globally without touching individual endpoint code.

---

### Challenge 6: Equal Column Widths in the Data Table

**Problem:** The HTML table was rendering with uneven column widths — the name/course column took excessive space while numeric columns were cramped.

**Solution:** Used `table-layout: fixed` with explicit `<colgroup>` column width definitions. Fixed columns (`#` = 48px, Actions = 96px), remaining columns split equally by percentage. All sizing via inline styles to prevent Tailwind from interfering.
