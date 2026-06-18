from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    user_query: str
    file_bytes: Optional[bytes]
    file_name: Optional[str]
    intent: Optional[str]  # "SCHEME_MATCH", "LEGAL_ANALYSIS", "CHAT", "TRANSLATION", "DOCUMENT_EXTRACTION"
    profile: Optional[Dict[str, Any]]  # Citizen Profile inputs
    extracted_text: Optional[str]
    response: Optional[str]  # Main response text
    structured_data: Optional[Dict[str, Any]]  # Structured outputs (JSON schema, etc.)
    sources: Optional[List[Dict[str, Any]]]  # Citation citations
    reasons: Optional[List[str]]  # Explanatory reasons
    required_documents: Optional[List[str]]  # Standard checklist documents
    eligible: Optional[bool]
    confidence: Optional[float]
    metadata: Optional[Dict[str, Any]]
    error: Optional[str]
    retry_count: int
