import logging
from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form
from typing import Optional
from app.models.ingest import BaseSchemeIngest, IngestSuccessResponse
from app.services.rag import rag_service

logger = logging.getLogger("schemeconnect")
router = APIRouter()

@router.post("/ingest", response_model=IngestSuccessResponse, status_code=status.HTTP_201_CREATED)
def ingest_scheme_policy(payload: BaseSchemeIngest):
    """
    Ingests, chunks, embeds, and saves a welfare policy inside Supabase PGVector.
    Allows easy dynamic registry expansion.
    """
    logger.info(f"Received API request to ingest scheme: {payload.name}")
    try:
        result = rag_service.ingest_scheme(payload)
        return IngestSuccessResponse(
            success=True,
            scheme_id=result["scheme_id"],
            message=f"Policy '{payload.name}' successfully ingested, vectorized, and registered.",
            chunks_created=result["chunks_count"]
        )
    except Exception as e:
        logger.error(f"Failed scheme ingestion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion pipeline failure: {str(e)}"
        )

@router.post("/ingest/file", response_model=IngestSuccessResponse, status_code=status.HTTP_201_CREATED)
async def ingest_scheme_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("General Welfare"),
    state: str = Form("Andhra Pradesh"),
    district: Optional[str] = Form(None),
    external_url: Optional[str] = Form(None)
):
    """
    Uploads a scheme document (PDF, DOCX, TXT, PNG, JPG), runs optical character extraction (OCR),
    segments content, constructs vector embeddings, and links the chunks to the scheme record.
    """
    logger.info(f"Received file upload ingestion request: name='{name}', file='{file.filename}'")
    try:
        file_bytes = await file.read()
        result = rag_service.ingest_scheme_document(
            file_bytes=file_bytes,
            file_name=file.filename,
            scheme_name=name,
            category=category,
            state=state,
            district=district,
            external_url=external_url
        )
        return IngestSuccessResponse(
            success=True,
            scheme_id=result["scheme_id"],
            message=f"Document file '{file.filename}' for scheme '{name}' successfully processed and indexed.",
            chunks_created=result["chunks_count"]
        )
    except Exception as e:
        logger.error(f"Failed file upload document ingestion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File ingestion pipeline failure: {str(e)}"
        )
