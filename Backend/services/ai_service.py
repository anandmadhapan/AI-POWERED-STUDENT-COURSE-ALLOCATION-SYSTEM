"""
AI Service
Google Gemini (google-genai SDK) powered natural language assistant.
Uses direct API calls — no ADK threading/OpenTelemetry complexity.
"""
import re
import os
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from google import genai
from google.genai import types as genai_types

from models.models import AIChatHistory

# =============================================
# Gemini client (singleton)
# =============================================
_client: Optional[genai.Client] = None

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_API_KEY", "")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set in environment.")
        _client = genai.Client(api_key=api_key)
    return _client

# =============================================
# Model — pick the best available
# =============================================
_MODEL = "gemini-2.0-flash"

# =============================================
# DB Schema context
# =============================================
_DB_SCHEMA = """
Database tables:
- students: student_id, name, email, marks, category (General/OBC/SC/ST),
            allocation_status (Pending/Allocated/Not Allocated), application_date
- courses: course_code, course_name, total_seats, allocated_seats
- course_category_seats: course_id, category, reserved_seats, allocated_seats
- student_preferences: student_id, course_id, preference_order (1/2/3)
- allocations: student_id, course_id, allocated_preference, allocation_status,
               allocated_marks, allocated_category
- allocation_logs: student_id, course_id, preference_order, action, remarks
"""

_SYSTEM_PROMPT = """You are a helpful AI assistant for a University Course Allocation System.

STRICT RULES:
1. Always answer in clear, friendly plain English.
2. NEVER show SQL code in your response — not even inside code blocks.
3. NEVER use markdown code fences (```).
4. Present data as natural sentences or bullet points (use • for bullets).
5. Use **bold** only for important numbers or names.
6. Keep answers concise — under 150 words unless listing many items.
7. If you don't have data, say so politely.

""" + _DB_SCHEMA

_SUMMARISE_PROMPT = """You are a helpful assistant converting database results into friendly answers.

STRICT RULES:
1. Write in plain, friendly English — no technical terms.
2. NEVER show SQL, code blocks, or raw table data.
3. Use bullet points (•) for lists, **bold** for key numbers.
4. Be concise and conversational.
5. If results are empty, say so politely.
"""

# =============================================
# Strip any accidental code blocks
# =============================================
def _clean(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", "", text, flags=re.IGNORECASE)
    text = re.sub(r"`([^`\n]{1,60})`", r"\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# =============================================
# Safe SQL executor
# =============================================
def _run_sql(db: Session, sql: str) -> Optional[str]:
    clean = sql.strip().rstrip(";")
    if not clean.upper().lstrip().startswith(("SELECT", "WITH")):
        return None
    try:
        with db.begin_nested():
            result = db.execute(text(clean))
            rows = result.fetchall()
            if not rows:
                return "No results found."
            cols = list(result.keys())
            lines = [" | ".join(cols), "-" * 40]
            lines += [" | ".join(str(v) for v in row) for row in rows[:30]]
            if len(rows) > 30:
                lines.append(f"... and {len(rows) - 30} more rows")
            return "\n".join(lines)
    except Exception as e:
        return f"SQL error: {e}"

# =============================================
# Extract SQL from response
# =============================================
def _extract_sql(text: str) -> Optional[str]:
    m = re.search(r"```(?:sql)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    return m.group(1).strip() if m else None

# =============================================
# Call Gemini directly (sync, simple)
# =============================================
def _ask_gemini(prompt: str, system: str) -> str:
    client = _get_client()
    response = client.models.generate_content(
        model=_MODEL,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.3,
            max_output_tokens=1024,
        ),
    )
    return response.text or ""

# =============================================
# Public: chat_with_ai  (async wrapper)
# =============================================
async def chat_with_ai(
    db: Session,
    question: str,
    session_id: Optional[str] = None,
) -> dict:
    import asyncio

    loop = asyncio.get_event_loop()

    # ── Step 1: Ask Gemini for an answer (+ optional SQL internally) ──
    internal_prompt = (
        f"{question}\n\n"
        "If you need database data to answer this, include a SQL SELECT query "
        "in a ```sql code block. I will run it and give you the results. "
        "Keep your text answer friendly and in plain English."
    )

    try:
        raw_response = await loop.run_in_executor(
            None, _ask_gemini, internal_prompt, _SYSTEM_PROMPT
        )
    except Exception as exc:
        exc_str = str(exc)
        if "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str or "limit: 0" in exc_str:
            msg = (
                "⚠️ **API quota exceeded.**\n\n"
                "The Gemini API key has reached its daily limit or has no quota enabled.\n\n"
                "**To fix:**\n"
                "• Go to https://console.cloud.google.com/billing and enable billing on your project\n"
                "• Then get a fresh API key from https://aistudio.google.com/app/apikey\n"
                "• Update GOOGLE_API_KEY in Backend/.env and restart the server"
            )
        elif "API_KEY" in exc_str or "invalid" in exc_str.lower():
            msg = "⚠️ **Invalid API key.** Please check GOOGLE_API_KEY in your .env file."
        else:
            msg = f"⚠️ AI service error. Please try again shortly."
        return _persist_and_return(db, question, None, msg, session_id)

    # ── Step 2: Extract SQL if present, execute, summarise ──────────
    generated_sql = _extract_sql(raw_response)
    final_response = _clean(raw_response)

    if generated_sql:
        sql_result = _run_sql(db, generated_sql)
        if sql_result and not sql_result.startswith("SQL error"):
            summarise_prompt = (
                f'The user asked: "{question}"\n\n'
                f"Database returned:\n{sql_result}\n\n"
                "Write a clear, friendly answer using this data. "
                "No SQL, no code blocks, no raw tables. "
                "Use bullet points (•) for lists, **bold** for numbers."
            )
            try:
                summary = await loop.run_in_executor(
                    None, _ask_gemini, summarise_prompt, _SUMMARISE_PROMPT
                )
                if summary and len(summary.strip()) > 10:
                    final_response = _clean(summary)
            except Exception:
                pass  # keep cleaned raw response

    # ── Step 3: Final clean pass ─────────────────────────────────────
    final_response = _clean(final_response)

    return _persist_and_return(db, question, generated_sql, final_response, session_id)


def _persist_and_return(db, question, generated_sql, response_text, session_id):
    entry = AIChatHistory(
        session_id=session_id,
        question=question,
        generated_sql=generated_sql,
        response=response_text,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "question":      question,
        "response":      response_text,
        "generated_sql": generated_sql,
        "session_id":    session_id,
        "created_at":    entry.created_at,
    }

# =============================================
# Public: get_chat_history
# =============================================
def get_chat_history(
    db: Session,
    session_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> dict:
    query = db.query(AIChatHistory)
    if session_id:
        query = query.filter(AIChatHistory.session_id == session_id)
    total = query.count()
    entries = (
        query.order_by(AIChatHistory.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return {
        "total": total,
        "history": [
            {
                "question":      e.question,
                "response":      e.response,
                "generated_sql": e.generated_sql,
                "session_id":    e.session_id,
                "created_at":    e.created_at,
            }
            for e in entries
        ],
    }
