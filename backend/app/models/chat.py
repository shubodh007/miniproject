from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class ChatMessagePayload(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., description="Message text content")

class ChatSessionRequest(BaseModel):
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    user_message: str = Field(..., description="Current query from the citizen")
    profile_snapshot: Optional[Dict[str, Any]] = None  # Send active profile parameters for context-aware RAG
    streaming: bool = True

class SourceNode(BaseModel):
    title: str
    snippet: str
    url: Optional[str] = None
    similarity_score: Optional[float] = None

class ChatMessageResponse(BaseModel):
    session_id: str
    message_id: str
    role: str = "assistant"
    content: str
    widgets: Optional[List[Dict[str, Any]]] = None  # List of custom cards (checklist, benefits, math check)
    sources: List[SourceNode] = []
    confidence: float = 1.0
