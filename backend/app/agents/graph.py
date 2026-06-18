import logging
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.eligibility_agent import run_eligibility_agent
from app.agents.rag_chat_agent import run_rag_chat_agent
from app.agents.legal_agent import run_legal_agent
from app.agents.translation_agent import run_translation_agent
from app.agents.extraction_agent import run_extraction_agent
from app.services.gemini import gemini_service

logger = logging.getLogger("schemeconnect")

async def classify_user_intent_node(state: AgentState) -> AgentState:
    """
    State Node: Intent Classifier
    Analyses query syntax and context attachments to classify intent.
    Supported labels: SCHEME_MATCH, LEGAL_ANALYSIS, CHAT, TRANSLATION, DOCUMENT_EXTRACTION
    """
    logger.info("Running intent classifier node...")
    query = state.get("user_query") or ""
    f_name = (state.get("file_name") or "").lower()
    
    # Prerequisite heuristic checks to bypass LLM latency and ensure 100% accuracy on standard signatures
    # 1. Translation triggers
    if "translate" in query.lower() or "తెలుగులో" in query.lower() or "translation" in query.lower():
        state["intent"] = "TRANSLATION"
        logger.info("Rule-based classifier matched intent: TRANSLATION")
        return state
        
    # 2. Legal files or queries
    if "clause" in query.lower() or "contract" in query.lower() or "agreement" in query.lower() or "lease" in query.lower() or any(term in f_name for term in ["lease", "agree", "contract", "legal"]):
        state["intent"] = "LEGAL_ANALYSIS"
        logger.info("Rule-based classifier matched intent: LEGAL_ANALYSIS")
        return state
        
    # 3. Document Extraction signatures
    if "extract" in query.lower() or "aadhaar" in query.lower() or "pan card" in query.lower() or "certificate" in query.lower() or any(term in f_name for term in ["aadhaar", "pan", "ration", "card", "cert"]):
        state["intent"] = "DOCUMENT_EXTRACTION"
        logger.info("Rule-based classifier matched intent: DOCUMENT_EXTRACTION")
        return state
        
    # 4. Eligibility Check patterns
    if "eligible" in query.lower() or "qualify" in query.lower() or "can i apply" in query.lower() or "amma vodi eligibility" in query.lower() or state.get("profile") is not None:
        state["intent"] = "SCHEME_MATCH"
        logger.info("Rule-based classifier matched intent: SCHEME_MATCH")
        return state

    # LLM-based zero-temperature classifier fallback
    classification_prompt = f"""
    Analyze the user request and classify its intent.
    You MUST output ONLY one of the five exact words:
    - SCHEME_MATCH (for questions about qualifying for a welfare scheme, checking criteria, or matching a profile)
    - LEGAL_ANALYSIS (for reviewing/auditing clauses in contracts, leases, and agreements or scanning legal text)
    - TRANSLATION (for converting words, questions, or articles between English and Telugu)
    - DOCUMENT_EXTRACTION (for scanning cards, PDFs, or ID receipts to extract metadata fields)
    - CHAT (for generic conversations, FAQs, welfare information lookups, or policy descriptions)

    User Request:
    "{query}"
    
    Intent Word:
    """
    
    try:
        raw_intent = gemini_service.generate_response(
            prompt=classification_prompt,
            temperature=0.0
        ).strip().upper()
        
        # Strip any surrounding noise if present
        for valid_intent in ["SCHEME_MATCH", "LEGAL_ANALYSIS", "TRANSLATION", "DOCUMENT_EXTRACTION", "CHAT"]:
            if valid_intent in raw_intent:
                state["intent"] = valid_intent
                logger.info(f"LLM classifier selected intent: {valid_intent}")
                return state
                
        # Default fallback
        state["intent"] = "CHAT"
        logger.info("LLM returned unknown answer. Safe matching to fallback: CHAT")
    except Exception as e:
        logger.error(f"Intent classification failed: {str(e)}. Defaulting to CHAT.")
        state["intent"] = "CHAT"
        
    return state

# Routing logic used by LangGraph StateGraph
def route_by_classified_intent(state: AgentState) -> str:
    intent = state.get("intent") or "CHAT"
    if intent == "SCHEME_MATCH":
        return "eligibility_agent"
    elif intent == "LEGAL_ANALYSIS":
        return "legal_agent"
    elif intent == "TRANSLATION":
        return "translation_agent"
    elif intent == "DOCUMENT_EXTRACTION":
        return "extraction_agent"
    else:
        return "rag_chat_agent"

# Build and compile Graph Structure
workflow = StateGraph(AgentState)

# Register Nodes
workflow.add_node("intent_classifier", classify_user_intent_node)
workflow.add_node("eligibility_agent", run_eligibility_agent)
workflow.add_node("rag_chat_agent", run_rag_chat_agent)
workflow.add_node("legal_agent", run_legal_agent)
workflow.add_node("translation_agent", run_translation_agent)
workflow.add_node("extraction_agent", run_extraction_agent)

# Configure Edge Triggers
workflow.add_edge(START, "intent_classifier")

workflow.add_conditional_edges(
    "intent_classifier",
    route_by_classified_intent,
    {
        "eligibility_agent": "eligibility_agent",
        "legal_agent": "legal_agent",
        "translation_agent": "translation_agent",
        "extraction_agent": "extraction_agent",
        "rag_chat_agent": "rag_chat_agent"
    }
)

# Connect Agent nodes directly to termination START/END structures
workflow.add_edge("eligibility_agent", END)
workflow.add_edge("legal_agent", END)
workflow.add_edge("translation_agent", END)
workflow.add_edge("extraction_agent", END)
workflow.add_edge("rag_chat_agent", END)

# Compile runnable LangGraph instance
agentic_orchestrator = workflow.compile()
