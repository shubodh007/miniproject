import logging
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List
from app.core.database import get_supabase_client

logger = logging.getLogger("schemeconnect")
router = APIRouter()

@router.get("/history", status_code=status.HTTP_200_OK)
def get_user_activity_history():
    """
    Exposes unified dashboard activity statistics.
    Gathers search histories, chat logs, and analyzed documents.
    """
    logger.info("API request activity timeline audit logs.")
    try:
        supabase = get_supabase_client()
        
        # 1. Fetch Search Logs
        try:
            searches = supabase.table("search_history").select("*").order("created_at", desc=True).limit(10).execute()
            search_data = searches.data or []
        except Exception:
            search_data = []

        # 2. Fetch Document Analysis history
        try:
            documents = supabase.table("documents").select("id, title, category, risk_score, created_at").order("created_at", desc=True).limit(10).execute()
            docs_data = documents.data or []
        except Exception:
            docs_data = []

        # 3. Fetch Active Chat Conversations
        try:
            sessions = supabase.table("chat_sessions").select("id, title, created_at").order("updated_at", desc=True).limit(10).execute()
            sessions_data = sessions.data or []
        except Exception:
            sessions_data = []

        return {
            "searches": search_data,
            "documents": docs_data,
            "chat_sessions": sessions_data
        }

    except Exception as e:
        logger.error(f"Error compiling active dashboard history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB History consolidation pipeline failed: {str(e)}"
        )
