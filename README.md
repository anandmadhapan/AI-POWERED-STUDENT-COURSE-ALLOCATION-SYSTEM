<div align="center">

# CourseFlow AI
### AI-Powered Student Course Allocation System

<p align="center">
  Merit-based course allocation with category reservations, preference cascading,<br/>
  real-time analytics dashboard, and a natural-language AI assistant.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#api-reference">API Docs</a> •
  <a href="ARCHITECTURE.md">Architecture</a> •
  <a href="DATABASE_SCHEMA.md">Schema</a>
</p>

</div>

---

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Loading Sample Data](#loading-sample-data)
- [Running Allocation Engine](#running-allocation-engine)
- [API Reference](#api-reference)
- [Development Credentials](#development-credentials)
- [Production Checklist](#production-checklist)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Feature | Description |
|---|---|
| **Merit-based Ranking** | Students ranked by marks (desc) · application date as tiebreaker |
| **Category Reservations** | General / OBC / SC / ST quotas with automatic open-pool overflow |
| **Preference Cascading** | Up to 3 ranked course preferences tried in order per student |
| **One-shot Allocation** | Idempotent engine — reset and re-run at any time, always consistent |
| **AI Assistant** | Gemini 2.0 Flash answers natural-language questions about allocation data (read-only SQL) |
| **Real-time Dashboard** | Live seat counters, category breakdown, course fill rates |
| **Role-based Access** | `admin` (full CRUD) · `student` (own profile only) |
| **Audit Trail** | Every allocation decision logged with reason |
| **CSV Import** | Bulk-import students and courses from CSV files |
| **REST API** | Fully documented OpenAPI/Swagger spec at `/docs` |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│                                                              │
│   React 19 SPA  ·  Vite 8  ·  TanStack Query v5             │
│   React Hook Form  ·  Recharts  ·  Tailwind CSS v4           │
│   http://localhost:5173                                       │
└────────────────────────┬─────────────────────────────────────┘
                         │  HTTP/REST  ·  JWT Bearer
                         │  /api/* → proxied by Vite
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                         │
│                                                              │
│   FastAPI 0.111  ·  uvicorn  ·  http://localhost:8000        │
│                                                              │
│   ┌──────────┬──────────┬────────────┬──────────┬────────┐  │
│   │  /auth   │/students │  /courses  │/allocation│  /ai  │  │
│   └────┬─────┴────┬─────┴─────┬──────┴────┬─────┴───┬────┘  │
│        │          │           │           │         │        │
│   ┌────▼──────────▼───────────▼───────────▼─────────▼────┐  │
│   │              Services (Business Logic)                │  │
│   │   AllocationService  ·  AIService (NL→SQL→NL)        │  │
│   └────────────────────────┬──────────────────────────────┘  │
│                            │  SQLAlchemy ORM · Pydantic v2   │
└────────────────────────────┼─────────────────────────────────┘
                             │  psycopg2 / SQLAlchemy
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                       DATA LAYER                              │
│   PostgreSQL 16  (Supabase)                                  │
│   8 tables  ·  4 ENUM types  ·  12+ indexes                  │
└──────────────────────────────────────────────────────────────┘
                             +
┌──────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                         │
│   Google Gemini 2.0 Flash  ·  ADK 0.3+                      │
│   NL Question → SQL Generation → Execution → NL Answer       │
└──────────────────────────────────────────────────────────────┘
```

> Deep-dive: [`ARCHITECTURE.md`](ARCHITECTURE.md) covers design decisions, AI integration approach, security model, and all engineering challenges with solutions.

---

## Tech Stack

**Backend**

| Package | Version | Role |
|---|---|---|
| FastAPI | 0.111+ | REST API framework |
| uvicorn | 0.29+ | ASGI server |
| SQLAlchemy | 2.x | ORM + query builder |
| psycopg2-binary | 2.9+ | PostgreSQL driver |
| Pydantic | 2.7+ | Schema validation |
| python-jose | 3.3+ | JWT encode/decode |
| passlib[bcrypt] | 1.7+ | Password hashing |
| google-adk | 0.3+ | Gemini AI agent framework |
| python-dotenv | 1.x | Environment management |

**Frontend**

| Package | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool + dev server |
| TanStack Query | 5 | Server state management |
| React Hook Form | 7 | Form state + validation |
| Recharts | 3 | Dashboard charts |
| Axios | 1.x | HTTP client |
| React Router | 7 | Client-side routing |
| Tailwind CSS | 4 | Utility-first styling |
| Lucide React | 1.x | Icon set |

---

## Project Structure

```
AI-POWERED-STUDENT-COURSE-ALLOCATION-SYSTEM/
│
├── 📂 Backend/
│   ├── main.py                     # FastAPI app · lifespan · CORS · IST datetime encoding
│   ├── requirements.txt            # All Python dependencies
│   ├── seed_data.py                # Quick seeder — 5 courses, 20 students
│   ├── import_csv.py               # Bulk CSV importer (--courses / --students / --clear)
│   ├── .env                        # ⚠️  Runtime secrets — never commit
│   ├── .env.example                # ✅  Safe template — commit this
│   │
│   ├── 📂 configs/
│   │   ├── base_config.py          # JWT settings, token expiry, Gemini key
│   │   └── dev_config.py           # Dev overrides
│   │
│   ├── 📂 models/
│   │   ├── __init__.py             # Engine, SessionLocal, get_db, init_tables
│   │   └── models.py               # 8 ORM models · 4 ENUMs · all relationships
│   │
│   ├── 📂 schemas/                 # Pydantic v2 request / response models
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── course.py
│   │   ├── allocation.py
│   │   └── ai_chat.py
│   │
│   ├── 📂 resources/               # Route controllers — thin HTTP layer only
│   │   ├── authController.py       # Login, register, user CRUD, JWT
│   │   ├── studentController.py    # Student CRUD + auto student_id generation
│   │   ├── courseController.py     # Course CRUD + category seat management
│   │   ├── allocationController.py # Trigger engine, list results, reset
│   │   ├── dashboardController.py  # Aggregated analytics endpoints
│   │   └── aiController.py         # Gemini chat, history, clear
│   │
│   ├── 📂 services/                # Business logic — no HTTP concerns
│   │   ├── allocation_service.py   # Core allocation algorithm
│   │   └── ai_service.py           # NL → SQL → Result → NL pipeline
│   │
│   ├── 📂 routes/
│   │   └── __init__.py             # Mounts all routers under /api prefix
│   │
│   └── 📂 data/
│       ├── courses.csv             # 10 sample courses with seat configs
│       └── students.csv            # 50 sample students across all categories
│
├── 📂 Frontend/
│   ├── index.html
│   ├── vite.config.js              # /api proxy → localhost:8000
│   ├── package.json
│   │
│   └── 📂 src/
│       ├── main.jsx                # React root · QueryClient · Router
│       ├── App.jsx
│       ├── index.css               # Tailwind import · CSS variables · animations
│       │
│       ├── 📂 pages/
│       │   ├── Login.jsx           # JWT auth form
│       │   ├── Dashboard.jsx       # KPI cards · charts · stats
│       │   ├── Students.jsx        # CRUD · search · category filter
│       │   ├── Courses.jsx         # CRUD · category seat config
│       │   ├── Allocation.jsx      # Run engine · view results · audit log
│       │   ├── AIAssistant.jsx     # Chat UI · session history
│       │   ├── UserManagement.jsx  # Admin-only user CRUD
│       │   └── StudentProfile.jsx  # Student self-service view
│       │
│       ├── 📂 components/ui/       # Table · Badge · Button · Modal · Input · Card · Toast
│       ├── 📂 layouts/
│       │   └── AppLayout.jsx       # Collapsible sidebar · topbar · route guards
│       ├── 📂 services/
│       │   └── api.js              # Axios client · JWT interceptor · 401 redirect
│       ├── 📂 store/
│       │   ├── authStore.jsx       # Auth state (login, logout, persist)
│       │   └── toastStore.jsx      # Global toast notifications
│       ├── 📂 routes/
│       │   └── AppRoutes.jsx       # Protected + public route definitions
│       └── 📂 utils/
│           └── helpers.js          # Date formatters · error extractor · chart colours
│
├── README.md                       # This file
├── ARCHITECTURE.md                 # Architecture · DB design · AI approach · challenges
├── API_DOCUMENTATION.md            # Full endpoint reference with examples
├── DATABASE_SCHEMA.md              # Schema · constraints · indexes · seat pool logic
└── .gitignore
```

---

## Prerequisites

| Requirement | Min Version | Recommended | Notes |
|---|---|---|---|
| Python | 3.11 | 3.12 | f-strings, match statements used |
| Node.js | 18 | 20 LTS | ESM support required |
| npm | 9 | 10 | Ships with Node |
| PostgreSQL | 14 | 16 | Supabase free tier sufficient |
| Google AI Studio key | — | — | Free at [aistudio.google.com](https://aistudio.google.com/app/apikey) |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/anandmadhapan/AI-POWERED-STUDENT-COURSE-ALLOCATION-SYSTEM.git
cd AI-POWERED-STUDENT-COURSE-ALLOCATION-SYSTEM
```

**Terminal 1 — Backend**

```bash
cd Backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DB credentials and Google API key

# Start API server (hot reload)
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**

```bash
cd Frontend
npm install
npm run dev
```

**Open** → http://localhost:5173

> The Vite dev server proxies all `/api/*` requests to `localhost:8000` automatically. No CORS configuration needed in development.

---

## Environment Configuration

Copy `Backend/.env.example` to `Backend/.env` and fill in your values. If `SECRET_KEY` is not set, the backend generates a temporary key at startup and logged-in sessions end whenever it restarts.

```env
# ── Application ──────────────────────────────────
ASCEND_ENV=dev

# ── PostgreSQL (Supabase or self-hosted) ─────────
DB_HOST=your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-database-password

# ── Google Gemini AI ──────────────────────────────
# Free key: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your-api-key-here

# ── JWT Security ─────────────────────────────────
# Generate: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=replace-with-64-char-random-hex

# ── Optional: SELECT-only role for the AI assistant ──
# READONLY_DATABASE_URL=postgresql+psycopg2://ai_readonly:password@localhost:5432/postgres
# AI_SQL_TIMEOUT_MS=10000
```

> ⚠️ `.env` is in `.gitignore` and must never be committed. Only `.env.example` belongs in source control.

---

## Database Setup

Tables, indexes, and ENUM types are created automatically on first server startup — no manual migration required.

```
FastAPI lifespan → init_tables() → SQLAlchemy create_all()
```

To inspect the schema, constraints, and seat pool logic in detail: [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)

---

## Loading Sample Data

### Option A — Python seeder `(5 courses · 20 students)`

```bash
cd Backend
python seed_data.py
```

### Option B — CSV bulk import `(10 courses · 50 students)`

```bash
cd Backend

# Import both courses and students
python import_csv.py

# Selective import
python import_csv.py --courses      # courses only
python import_csv.py --students     # students only

# Hard reset and reimport from scratch
python import_csv.py --clear
```

Both scripts are **idempotent** — re-running skips records that already exist.

Source files: `Backend/data/courses.csv` · `Backend/data/students.csv`

---

## Running Allocation Engine

**Via the UI:** Navigate to the **Allocation** page → click **Run Allocation**

**Via curl:**

```bash
# Step 1 — Get token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@courseflow.com","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Step 2 — Run allocation
curl -s -X POST http://localhost:8000/allocation/process \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

**What the engine does:**

1. Resets all seat counters and clears previous allocation records
2. Sorts all active students: `marks DESC`, `application_date ASC` (tiebreaker)
3. For each student, attempts preferences 1 → 2 → 3:
   - First tries the student's reserved category pool
   - Falls back to the open (unreserved) pool if the reserved pool is exhausted
4. Persists allocations + a full audit log of every decision
5. Returns a summary: total · allocated · not-allocated · preference satisfaction breakdown

---

## API Reference

Interactive docs: **http://localhost:8000/docs** (Swagger UI)  
Alternative: **http://localhost:8000/redoc**  
Full reference: [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)

**Endpoint Summary**

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/auth/login` | — | Obtain JWT access token |
| `GET` | `/auth/me` | ✓ | Current authenticated user |
| `POST` | `/auth/register-student` | 🔑 | Register student + create login account |
| `GET` | `/auth/users` | 🔑 | List all user accounts |
| `PUT` | `/auth/users/{id}` | 🔑 | Update user account |
| `DELETE` | `/auth/users/{id}` | 🔑 | Delete user account |
| `GET` | `/students` | ✓ | List students with search · category · status filters |
| `PUT` | `/students/{id}` | 🔑 | Update student record |
| `DELETE` | `/students/{id}` | 🔑 | Soft-delete student |
| `GET` | `/courses` | ✓ | List courses with seat breakdown |
| `POST` | `/courses` | 🔑 | Create course with category seat config |
| `PUT` | `/courses/{id}` | 🔑 | Update course |
| `DELETE` | `/courses/{id}` | 🔑 | Soft-delete course |
| `POST` | `/allocation/process` | 🔑 | Run allocation engine |
| `GET` | `/allocation` | ✓ | List allocation results |
| `GET` | `/allocation/logs` | ✓ | Allocation audit trail |
| `DELETE` | `/allocation/reset` | 🔑 | Reset all allocations |
| `GET` | `/dashboard/summary` | ✓ | System-wide KPIs |
| `GET` | `/dashboard/course-stats` | ✓ | Per-course fill rates |
| `GET` | `/dashboard/category-wise` | ✓ | Category allocation breakdown |
| `POST` | `/ai/chat` | ✓ | Ask AI a natural language question |
| `GET` | `/ai/chat/history` | ✓ | Retrieve conversation history |
| `DELETE` | `/ai/chat/history` | ✓ | Clear chat history |

> ✓ = JWT required · 🔑 = Admin role required

---

## Development Credentials

**For local development only.** `seed_data.py` and `import_csv.py` create this admin account so you can log in after seeding. It is not a real user and the login page only shows it in development builds (`npm run dev`).

| Role | Email | Password |
|---|---|---|
| Admin | `admin@courseflow.com` | `admin123` |

Never seed a shared or public database with this account. If you already have, change the password from User Management straight away.

---

## Production Checklist

**Security**
- [ ] Set your own `SECRET_KEY` — generate one with `secrets.token_hex(32)`
- [ ] Restrict `allow_origins` in CORS middleware to your frontend domain
- [ ] Disable Swagger UI — remove or guard `/docs` and `/redoc` in production
- [ ] Rotate and IP-restrict `GOOGLE_API_KEY` in Google Cloud Console
- [ ] Store all secrets in a secrets manager (AWS Secrets Manager, Doppler, Vault)
- [ ] Shorten `ACCESS_TOKEN_EXPIRE_MINUTES` to 15–30 minutes

**Infrastructure**
- [ ] Terminate TLS at the reverse proxy (nginx / Caddy / AWS ALB)
- [ ] Set `ASCEND_ENV=production`
- [ ] Enable Supabase connection pooler (Transaction mode) for concurrent workloads
- [ ] Add rate limiting on auth endpoints (`slowapi` or API Gateway)
- [ ] Set up structured logging and ship logs to a centralised sink

**Frontend**
- [ ] Run `npm run build` and serve `dist/` as static files
- [ ] Proxy `/api` to the backend in your web server (the Vite dev proxy only works in development)
- [ ] Configure a CDN with caching headers for static assets

---

## Read-only SQL

The AI assistant writes SQL from a user's question, so `Backend/services/sql_guard.py` treats it as untrusted. Any one of these layers stops a write:

1. **Static check.** One `SELECT` or `WITH` statement only; no write keywords; no access to the `users` table or password hashes.
2. **Read-only transaction.** The query runs after `SET TRANSACTION READ ONLY` with a statement timeout, and the transaction is always rolled back. PostgreSQL then refuses writes, including data-modifying CTEs, `SELECT ... INTO` and `nextval()`.
3. **Read-only role (optional).** Create it with [`docs/readonly_role.sql`](./docs/readonly_role.sql) and set `READONLY_DATABASE_URL`. It can read the allocation tables only, not `users` or `ai_chat_history`.

The `/ai/chat` and `/ai/chat/history` endpoints require a logged-in user.

### Tests

```bash
pip install pytest
cd Backend
pytest tests                                   # static checks only
TEST_DATABASE_URL=postgresql+psycopg2://postgres@localhost:5432/test pytest tests   # adds database tests
```

The database tests need a disposable PostgreSQL database; they create and drop a table called `t_sales`.

---

## Known Limitations

- Allocation does not implement a waitlist — outcome is binary: **Allocated** or **Not Allocated**
- No email / SMS notification on allocation result
- The AI assistant can only read data: see [Read-only SQL](#read-only-sql)
- JWT tokens cannot be individually revoked before expiry (no token blacklist / blocklist)
- No automated database migration tooling (Alembic) — schema changes require manual intervention
- Single-region deployment only — no multi-region support

---

## Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "feat: add your feature"`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

MIT. See [LICENSE](LICENSE).
