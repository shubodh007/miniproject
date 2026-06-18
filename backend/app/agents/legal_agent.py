import logging
from app.agents.state import AgentState
from app.services.ocr import ocr_service
from app.services.rag import rag_service
from app.routers.legal import process_legal_analysis

logger = logging.getLogger("schemeconnect")

async def run_legal_agent(state: AgentState) -> AgentState:
    """
    Legal Analysis Agent Node:
    1. If file_bytes and file_name are provided, run OCR text extraction.
    2. Fall back to user_query text if file_bytes is empty.
    3. Retrieve any matching legal chunks from RAG to augment audit insights.
    4. Compile diagnostic assessment reports via the legal analyzer.
    """
    logger.info("Legal Agent activated...")
    try:
        document_text = state.get("extracted_text") or ""
        
        # 1. OCR Extraction if document bytes are present
        if not document_text and state.get("file_bytes") and state.get("file_name"):
            logger.info(f"Extracting agreement text from file: '{state['file_name']}'...")
            extracted = ocr_service.process_document_extract(state["file_bytes"], state["file_name"])
            if extracted:
                document_text = extracted
                state["extracted_text"] = extracted
                logger.info(f"Successfully extracted {len(document_text)} characters via OCR.")
                
        # 2. Fallback to user_query if no document was uploaded
        if not document_text and state.get("user_query"):
            document_text = state["user_query"]
            logger.info("Operating legal audit directly on user query plain text...")
            
        if not document_text or len(document_text.strip()) < 10:
            state["response"] = "Please upload a valid legal document or paste your contract text to run a compliance risk audit."
            state["sources"] = []
            return state
            
        # 3. Incorporate RAG Context to check compliance boundaries against actual schemas
        legal_regulations = ""
        rag_sources = []
        try:
            # Query for general policy rules or templates matching the main keywords in document text
            snippet = document_text[:300].strip()
            rag_hits = rag_service.retrieve_context(
                query=f"legal rules or guidelines for: {snippet}",
                top_k=2,
                similarity_threshold=0.22
            )
            for hit in rag_hits:
                legal_regulations += f"\n- {hit.chunk_text}"
                rag_sources.append({
                    "title": hit.scheme_name,
                    "chunk_id": hit.id,
                    "source": "State Welfare Legislation & Regs",
                    "similarity_score": hit.similarity
                })
        except Exception as r_err:
            logger.warning(f"Legal agent RAG context lookup skipped: {str(r_err)}")

        # 4. Invoke LLM Auditor with standard contract audit prompts
        # Let's clean the draft text limit to prevent extreme chunk overflows
        trimmed_document = document_text[:5000]
        
        logger.info("Invoking Gemini contract audits model...")
        report = process_legal_analysis(trimmed_document, category="Legal Compliance Review")
        
        # 5. Format structured results
        reasons_summary = [
            f"Overall Risk Score: {report.overall_risk_score}/100",
            f"Diagnosed Risk Level: {report.risk_assessment_summary}"
        ]
        
        clause_diagnoses = []
        for index, clause in enumerate(report.clauses):
            clause_diagnoses.append(
                f"**Clause {index+1} [{clause.risk_level} Risk]:**\n"
                f"- *Quote:* \"{clause.clause_quote}\"\n"
                f"- *Diagnosis:* {clause.diagnosis}\n"
                f"- *Remedy:* {clause.remedy_text}\n"
            )
            
        response_body = (
            f"### National & State Legal Compliance Audit Report\n\n"
            f"**Agreement Name:** {report.document_title}\n"
            f"**Overall Risk Index Score:** {report.overall_risk_score} / 100\n"
            f"**Summary:** {report.risk_assessment_summary}\n\n"
            f"**Audited Clauses:**\n" + "\n".join(clause_diagnoses) + "\n"
            f"**Key Recommendations:**\n" + "\n".join([f"- {s}" for s in report.structural_suggestions])
        )
        
        state["response"] = response_body
        state["structured_data"] = report.model_dump()
        state["sources"] = rag_sources
        state["confidence"] = 1.0 - (report.overall_risk_score / 100.0)
        state["error"] = None
        
    except Exception as e:
        logger.error(f"Legal Agent crashed: {str(e)}")
        state["error"] = str(e)
        state["response"] = f"An issues occurred white compiling technical legal audits: {str(e)}"
        
    return state
