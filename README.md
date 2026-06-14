# CourseFlow AI

**Intelligent Student Course Allocation System** — merit-based seat allocation with category reservations, real-time analytics, and a natural-language AI assistant powered by Google Gemini.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Overview

CourseFlow AI automates the end-to-end student course allocation lifecycle:

- **Merit-based ranking** — students sorted by marks (descending), application date (ascending) as tiebreaker
- **Category reservation enforcement** — General / OBC / SC / ST quotas with open-pool overflow
- **Preference cascading** — up to 3 ranked course preferences per student; system tries each in order
- **One-shot allocation** — idempotent engine resets and re-runs cleanly at any time
- **AI assistant** — Gemini 2.0 Flash answers natural-language queries about allocation data
- **Role-based access** — `admin` (full CRUD) and `student` (own profile only) roles

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Configuration](#configuration)
7. [Database Setup](#database-setup)
8. [Running in Development](#running-in-development)
9. [Loading Sample Data](#loading-sample-data)
10. [Running Allocation](#running-allocation)
11. [API Reference](#api-reference)
12. [Default Credentials](#default-credentials)
13. [Production Checklist](#production-checklist)
14. [Known Limitations](#known-limitations)

---

## Architecture

```
┌─────────────────────────────────────┐
│  React 19 SPA  (Vite + TanStack)    │
│  localhost:5173                      │
└──────────────┬──────────────────────┘
               │ /api/*  (proxied by Vite)
               ▼
┌─────────────────────────────────────┐
│  FastAPI  (uvicorn)                 │
│  localhost:8000                      │
│                                     │
│  Controllers → Services → ORM       │
│  JWT Auth  ·  Pydantic Schemas      │
└──────────────┬──────────────────────┘
               │ SQLAlchemy / psycopg2
               ▼
┌─────────────────────────────────────┐
│  PostgreSQL  (Supabase)             │
│  8 tables  ·  ENUM types            │
└─────────────────────────────────────┘
               +
┌─────────────────────────────────────┐
│  Google Gemini 2.0 Flash (ADK)      │
│  NL → SQL → Result → NL             │
└─────────────────────────────────────┘
```

Full architecture, database design decisions, AI integration approach, security model, and engineering challenges are documented in [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Tech Stack

| Concern | Technology |
|---|---|
| Frontend framework | React 19, Vite 8 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form v7 |
| Backend framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.x |
| Database | PostgreSQL 16 (Supabase) |
| Authentication | JWT — python-jose, bcrypt via passlib |
| AI | Google Gemini 2.0 Flash via ADK 0.3+ |
| Styling | Tailwind CSS v4 + inline styles |
| HTTP client | Axios |

---

## Project Structure

```
.
├── Backend/
│   ├── main.py                   # FastAPI application entry point
│   ├── requirements.txt          # Python dependencies (pinned)
│   ├── seed_data.py              # Quick seeder — 5 courses, 20 students
│   ├── import_csv.py             # Bulk CSV importer with --clear, --courses, --students flags
│   ├── .env                      # Runtime secrets (never commit)
│   ├── .env.example              # Safe template to share
│   ├── configs/
│   │   ├── base_config.py        # JWT config, Gemini key
│   │   └── dev_config.py
│   ├── models/
│   │   ├── __init__.py           # SQLAlchemy engine + session factory
│   │   └── models.py             # ORM models (8 tables, 4 enums)
│   ├── schemas/                  # Pydantic v2 request/response models
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── course.py
│   │   ├── allocation.py
│   │   └── ai_chat.py
│   ├── resources/                # Route controllers (thin HTTP layer)
│   │   ├── authController.py
│   │   ├── studentController.py
│   │   ├── courseController.py
│   │   ├── allocationController.py
│   │   ├── dashboardController.py
│   │   └── aiController.py
│   ├── services/                 # Business logic (no HTTP concerns)
│   │   ├── allocation_service.py # Core allocation engine
│   │   └── ai_service.py        # Gemini NL→SQL→NL pipeline
│   ├── routes/
│   │   └── __init__.py          # Aggregates all routers under /api
│   └── data/
│       ├── courses.csv           # 10 courses with category seat configs
│       └── students.csv         # 50 students across all categories
│
├── Frontend/
│   ├── index.html
│   ├── vite.config.js            # Proxy: /api → localhost:8000
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css             # Global styles, Tailwind import, animations
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── Courses.jsx
│   │   │   ├── Allocation.jsx
│   │   │   ├── AIAssistant.jsx
│   │   │   ├── UserManagement.jsx
│   │   │   └── StudentProfile.jsx
│   │   ├── components/ui/        # Table, Badge, Button, Modal, Input, Card, Toast
│   │   ├── layouts/AppLayout.jsx # Collapsible sidebar + topbar
│   │   ├── services/api.js       # Axios client — all API calls
│   │   ├── store/                # Auth store, Toast store
│   │   ├── routes/AppRoutes.jsx  # Protected + public routes
│   │   └── utils/helpers.js      # Date formatters, error extractor, chart colours
│   └── package.json
│
├── README.md                     # This file
├── ARCHITECTURE.md               # Design decisions, challenges, solutions
├── API_DOCUMENTATION.md          # Full endpoint reference with examples
├── DATABASE_SCHEMA.md            # Schema, constraints, indexes, seat logic
└── .gitignore
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11+ | Earlier versions untested |
| Node.js | 18+ | 20 LTS recommended |
| npm | 9+ | Comes with Node |
| PostgreSQL | 14+ | Supabase free tier works |
| Google AI Studio key | — | Free at [aistudio.google.com](https://aistudio.google.com/app/apikey) |

---

## Quick Start

```bash
# Clone
git clone <repository-url>
cd "Anand Task-1"

# Backend
cd Backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
cp .env.example .env           # then edit .env with your credentials
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd Frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the Vite proxy routes `/api/*` to the FastAPI server automatically.

---

## Configuration

Edit `Backend/.env`:

```env
# Environment
ASCEND_ENV=dev

# PostgreSQL — replace with your actual credentials
DB_HOST=your-host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# Google Gemini AI
# Get a free key: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your-key-here

# JWT — generate strong random values for production:
# python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=change-this-in-production
SESSION_SECRET_KEY=change-this-in-production
```

> `.env` is listed in `.gitignore`. Use `.env.example` as the committed template.

---

## Database Setup

Tables are created automatically on first startup via `init_tables()` in the FastAPI lifespan handler. No manual migration step required.

If you need to inspect or recreate the schema manually, refer to [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

---

## Running in Development

```bash
# Backend — with hot reload
uvicorn main:app --reload --port 8000

# Swagger UI (interactive API docs)
open http://localhost:8000/docs

# ReDoc
open http://localhost:8000/redoc

# Frontend
npm run dev   # from Frontend/

# Production build
npm run build
npm run preview
```

---

## Loading Sample Data

### Option A — Python seeder (5 courses · 20 students)

```bash
cd Backend
python seed_data.py
```

### Option B — CSV bulk import (10 courses · 50 students)

```bash
cd Backend

# Import everything
python import_csv.py

# Import courses only
python import_csv.py --courses

# Import students only
python import_csv.py --students

# Wipe existing data and reimport cleanly
python import_csv.py --clear
```

CSV source files: `Backend/data/courses.csv`, `Backend/data/students.csv`

Both scripts are idempotent — re-running skips records that already exist.

---

## Running Allocation

Once students and courses are loaded, trigger the allocation engine:

```bash
# Via curl (get the token first)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:8000/api/allocation/process \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

Or use the **Allocation** page in the UI — click **Run Allocation**.

The engine:
1. Resets all counters and clears previous results
2. Sorts students by marks desc, application date asc
3. For each student, attempts preference 1 → 2 → 3 using reserved + open seat pools
4. Persists allocations and a full audit log
5. Returns a summary (total, allocated, not-allocated, preference satisfaction breakdown)

---

## API Reference

Full endpoint documentation with request/response examples: [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)

Summary of available routes:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Obtain JWT token |
| GET | `/api/auth/me` | ✓ | Current user info |
| POST | `/api/auth/register-student` | Admin | Register student + login account |
| GET | `/api/students` | ✓ | List students (search, category, status filters) |
| PUT | `/api/students/{id}` | Admin | Update student |
| DELETE | `/api/students/{id}` | Admin | Soft-delete student |
| GET | `/api/courses` | ✓ | List courses |
| POST | `/api/courses` | Admin | Create course with category seats |
| PUT | `/api/courses/{id}` | Admin | Update course |
| POST | `/api/allocation/process` | Admin | Run allocation engine |
| GET | `/api/allocation` | ✓ | List allocation results |
| DELETE | `/api/allocation/reset` | Admin | Reset all allocations |
| GET | `/api/dashboard/summary` | ✓ | System-wide stats |
| POST | `/api/ai/chat` | ✓ | Ask AI a question |
| GET | `/api/ai/chat/history` | ✓ | Retrieve chat history |

---

## Default Credentials

| Role | Username / Email | Password |
|---|---|---|
| Admin | admin@courseflow.com | admin123 |

> Change the default password before any public deployment.

---

## Production Checklist

- [ ] Set `SECRET_KEY` and `SESSION_SECRET_KEY` to cryptographically random 64-byte hex strings
- [ ] Restrict `allow_origins` in `main.py` CORS middleware to your frontend domain
- [ ] Enable HTTPS on the API server (reverse proxy via nginx / caddy)
- [ ] Set `ASCEND_ENV=production` and disable `/docs` and `/redoc` endpoints
- [ ] Rotate `GOOGLE_API_KEY` and restrict it to your server's IP in Google Cloud Console
- [ ] Use Supabase connection pooler (Transaction mode) for high-concurrency workloads
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES` to a shorter window (15–30 min) for sensitive environments
- [ ] Add rate limiting middleware (e.g. `slowapi`) on auth endpoints
- [ ] Store secrets in an environment secret manager (AWS Secrets Manager, Doppler, etc.) — not in `.env` files on disk

---

## Known Limitations

- Allocation does not support waitlisting — students either get a seat or are marked Not Allocated
- No email notifications on allocation result
- AI assistant is read-only (SELECT queries only); it cannot modify data
- JWT tokens are not revocable before expiry (no token blacklist)
- The frontend is an SPA with no SSR; crawlability is limited without a meta-tag strategy
#   A I - P O W E R E D - S T U D E N T - C O U R S E - A L L O C A T I O N - S Y S T E M  
 #   A I - P O W E R E D - S T U D E N T - C O U R S E - A L L O C A T I O N - S Y S T E M  
 