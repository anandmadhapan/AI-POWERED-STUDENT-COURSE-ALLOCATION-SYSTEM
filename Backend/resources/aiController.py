"""
AI Controller
Endpoints for the Gemini (Google ADK) AI assistant.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from models import get_db
from services.ai_service import chat_with_ai, get_chat_history
from schemas.ai_chat import AIChatRequest, AIChatResponse, AIChatHistoryResponse

router = APIRouter()


# =============================================
# GET /ai/status
# =============================================
@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="AI service status",
)
def ai_status():
    """Returns the current AI model in use."""
    return {
        "model":    "gemini-2.0-flash",
        "status":   "online",
        "provider": "Google ADK",
    }


# =============================================
# POST /ai/chat  (async — ADK runner is async)
# =============================================
@router.post(
    "/chat",
    response_model=AIChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask the AI assistant a question",
)
async def ask_ai(
    payload: AIChatRequest,
    db: Session = Depends(get_db),
):
    """
    Ask the Gemini AI assistant natural-language questions about allocation data.

    **Example questions:**
    - How many students were allocated to each course?
    - Which students did not receive their first preference?
    - Which course had the highest rejection rate?
    - Show category-wise allocation summary.
    - What is the total number of unallocated students?
    """
    try:
        result = await chat_with_ai(
            db=db,
            question=payload.question,
            session_id=payload.session_id,
        )
        return AIChatResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(exc)}",
        )


# =============================================
# GET /ai/chat/history
# =============================================
@router.get(
    "/chat/history",
    response_model=AIChatHistoryResponse,
    summary="Get AI chat history",
)
def list_chat_history(
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    skip:  int = Query(0,  ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve past AI conversations (most recent first)."""
    result = get_chat_history(db=db, session_id=session_id, skip=skip, limit=limit)
    return AIChatHistoryResponse(
        total=result["total"],
        history=[AIChatResponse(**h) for h in result["history"]],
    )


# =============================================
# DELETE /ai/chat/history
# =============================================
@router.delete(
    "/chat/history",
    status_code=status.HTTP_200_OK,
    summary="Clear AI chat history",
)
def clear_chat_history(
    session_id: Optional[str] = Query(None, description="Clear specific session (None = clear all)"),
    db: Session = Depends(get_db),
):
    """Clear AI chat history (optionally for a specific session)."""
    from models.models import AIChatHistory
    query = db.query(AIChatHistory)
    if session_id:
        query = query.filter(AIChatHistory.session_id == session_id)
    deleted = query.delete()
    db.commit()
    return {"message": f"Deleted {deleted} chat history record(s)."}
