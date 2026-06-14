"""
Pydantic Schemas — AI Chat
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural language question")
    session_id: Optional[str] = Field(None, description="Optional session identifier for conversation grouping")


class AIChatResponse(BaseModel):
    question: str
    response: str
    generated_sql: Optional[str] = None
    session_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AIChatHistoryResponse(BaseModel):
    total: int
    history: List[AIChatResponse]
