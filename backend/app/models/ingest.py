from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class BaseSchemeIngest(BaseModel):
    name: str = Field(..., description="Unique scheme name in English")
    name_te: Optional[str] = Field(None, description="Telugu representation of scheme name")
    description: str = Field(..., description="Full policy details")
    description_te: Optional[str] = None
    benefit_details: str = Field(..., description="What are the financial/resource benefits")
    benefit_details_te: Optional[str] = None
    eligibility_rules: Dict[str, Any] = Field(..., description="Zonal bounds on age, income, caste, etc.")
    docs_required: List[str] = Field(default=[], description="Required papers list in English")
    docs_required_te: List[str] = Field(default=[], description="Required papers list in Telugu")
    state: str = Field(..., description="AP, TS or Central")
    district: Optional[str] = None
    category: str = Field("General Welfare", description="Welfare category (Agriculture, Education, etc)")
    external_url: Optional[str] = None

class IngestSuccessResponse(BaseModel):
    success: bool = True
    scheme_id: str
    message: str
    chunks_created: int

class SearchQueryRequest(BaseModel):
    query: str = Field(..., description="Text criteria search query")
    state_filter: Optional[str] = None
    category_filter: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=20)

class SearchHit(BaseModel):
    id: str
    scheme_id: str
    chunk_text: str
    similarity: float
    scheme_name: str
    category: str
    state: str
