import logging
from app.agents.state import AgentState
from app.services.rag import rag_service

logger = logging.getLogger("schemeconnect")

async def run_rag_chat_agent(state: AgentState) -> AgentState:
    """
    RAG Chat Agent Node:
    1. Runs hybrid context retrieval on user query.
    2. Uses RAG service to synthesize a grounded response with tracked citations.
    3. Persists chunk metrics, sources, and final answer to the state.
    """
    logger.info("RAG Chat Agent activated...")
    try:
        query = state.get("user_query")
        if not query:
            state["response"] = "Query text is empty. How can I assist you with welfares today?"
            state["sources"] = []
            return state
        
        # State or regional boundary hints to isolate search
        state_bound = None
        if state.get("profile"):
            state_bound = state["profile"].get("state")
            
        # 1. Retrieve matching chunks from Supabase vector db
        search_hits = rag_service.retrieve_context(
            query=query,
            state_filter=state_bound,
            top_k=5,
            similarity_threshold=0.28
        )
        
        # 2. Synthesize output under strict grounding rules
        response_model = rag_service.generate_grounded_response(
            query=query,
            context_hits=search_hits
        )
        
        # 3. Apply state mutations
        state["response"] = response_model.get("answer", "")
        state["sources"] = response_model.get("sources", [])
        state["confidence"] = response_model.get("confidence", 0.0)
        state["error"] = None
        
        # Format structured JSON data payload in addition to plaintext response
        state["structured_data"] = {
            "answer": response_model.get("answer", ""),
            "sources": response_model.get("sources", []),
            "confidence": response_model.get("confidence", 0.0),
            "chunks_retrieved_count": len(search_hits)
        }
        
    except Exception as e:
        logger.error(f"RAG Chat Agent crashed: {str(e)}")
        state["error"] = str(e)
        state["response"] = f"An issue occurred while consulting the policy guidelines database: {str(e)}"
        
    return state
