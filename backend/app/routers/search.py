import logging
from fastapi import APIRouter, HTTPException, status, Request
from typing import List
from app.models.ingest import SearchQueryRequest, SearchHit
from app.services.rag import rag_service
from app.core.limiter import limiter, get_rate_limit

logger = logging.getLogger("schemeconnect")
router = APIRouter()

@router.post("/search", response_model=List[SearchHit], status_code=status.HTTP_200_OK)
@limiter.limit(get_rate_limit("30/minute"))
def search_scheme_vault(request: Request, payload: SearchQueryRequest):
    """
    Performs hybrid context retrieval. Uses semantic similarity
    backed up by lexical check failovers to return raw details.
    """
    logger.info(f"API Search request: query='{payload.query}', state={payload.state_filter}")
    try:
        hits = rag_service.retrieve_context(
            query=payload.query,
            state_filter=payload.state_filter,
            category_filter=payload.category_filter,
            top_k=payload.top_k
        )
        return hits
    except Exception as e:
        logger.error(f"Search endpoint breakdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retrieval engine failed search compilation: {str(e)}"
        )
