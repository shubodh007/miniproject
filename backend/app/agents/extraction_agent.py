import logging
import json
import re
from app.agents.state import AgentState
from app.services.ocr import ocr_service
from app.services.gemini import gemini_service

logger = logging.getLogger("schemeconnect")

def clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n", "", text)
        text = re.sub(r"\n```$", "", text)
    return text.strip()

async def run_extraction_agent(state: AgentState) -> AgentState:
    """
    Document Extraction Agent Node:
    1. Runs OCR text extraction from document bytes (Aadhaar cards, Income certs, Ration profiles).
    2. Uses structured document extraction system instructions.
    3. Runs semantic model parsing to return clear JSON mapped key-value pairs matching citizen schemas.
    """
    logger.info("Document Extraction Agent activated...")
    try:
        document_text = state.get("extracted_text") or ""
        
        # 1. OCR Extraction if document bytes are present
        if not document_text and state.get("file_bytes") and state.get("file_name"):
            logger.info(f"Extracting document text from file: '{state['file_name']}'...")
            extracted = ocr_service.process_document_extract(state["file_bytes"], state["file_name"])
            if extracted:
                document_text = extracted
                state["extracted_text"] = extracted
                logger.info(f"Successfully processed {len(document_text)} text characters via OCR.")
                
        # 2. Fallback to user_query if no document bytes were uploaded
        if not document_text and state.get("user_query"):
            document_text = state["user_query"]
            logger.info("Extracting values directly from query text context...")
            
        if not document_text or len(document_text.strip()) < 5:
            state["response"] = "Please upload a document file (PDF/Image) or paste the raw contents to extract profile fields."
            state["sources"] = []
            return state

        # 3. Dynamic Parser Prompt to build structured JSON outputs
        prompt = f"""
        You are a high-speed civic Document Metadata Extractor. 
        Read the following document text and extract all relevant fields such as candidate name, UID, income, location, occupation, and date of birth.
        You MUST compile your answers strictly as a valid JSON block without formatting fences.

        EXPECTED JSON STRUCTURE:
        {{
            "document_type": "Aadhaar Card | Income Certificate | Ration Card | Unknown",
            "extracted_fields": {{
                "full_name": "extracted name value or null",
                "uid_number": "Aadhaar or certificate index reference or null",
                "income_level": 120000.0,
                "occupation": "Farmer / Laborer / etc. or null",
                "state": "Andhra Pradesh / etc. or null",
                "district": "district name or null",
                "birth_year": 1990
            }},
            "confidence_score": 0.95,
            "verification_status": "VERIFIED_VALID"
        }}

        Extracted raw text to parse:
        "{document_text[:4000]}"
        """

        logger.info("Executing structured metadata extractor model call...")
        raw_json_res = gemini_service.generate_response(
            prompt=prompt,
            system_instruction_file="document_extraction.txt",
            temperature=0.1
        )

        clean_res = clean_json_text(raw_json_res)
        structured_data = json.loads(clean_res)

        # Build a neat markdown presentation for human reading
        fields = structured_data.get("extracted_fields", {})
        markdown_lines = [
            f"### Document Extraction Results",
            f"**Processed Document Type:** {structured_data.get('document_type', 'Unknown')}",
            f"**Verification status:** {structured_data.get('verification_status', 'UNVERIFIED')}",
            f"**Extraction Confidence:** {structured_data.get('confidence_score', 0.0) * 100:.1f}%\n",
            f"**Extracted Metadata Fields:**"
        ]
        for key, value in fields.items():
            nice_key = key.replace("_", " ").title()
            markdown_lines.append(f"- **{nice_key}:** {value}")

        response_body = "\n".join(markdown_lines)
        
        state["response"] = response_body
        state["structured_data"] = structured_data
        state["sources"] = []
        state["confidence"] = float(structured_data.get("confidence_score", 0.0))
        state["error"] = None

    except Exception as e:
        logger.error(f"Document Extraction Agent crashed: {str(e)}")
        state["error"] = str(e)
        state["response"] = f"Extraction service temporary failure: {str(e)}"

    return state
