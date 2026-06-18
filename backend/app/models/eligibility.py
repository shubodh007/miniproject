from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any

class CitizenProfilePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Full legal name of the citizen")
    age: int = Field(..., ge=0, le=120, description="Age of the applicant in years")
    gender: str = Field(..., description="Gender identifier (Male/Female/Other)")
    state: str = Field(..., description="Applicable state residency ('Andhra Pradesh' or 'Telangana')")
    district: str = Field(..., description="Home district of the applicant")
    income_annual: float = Field(..., ge=0, description="Cumulative yearly household income in Indian Rupees")
    occupation: str = Field(..., description="Current primary occupation category")
    land_acres: float = Field(0.0, ge=0.0, description="Agricultural land holding in acres")
    bpl_card: str = Field("None", description="Ration/BPL Card classification status (e.g., White, Pink, None)")
    caste_category: str = Field("General", description="Social caste/category list (General, OBC, SC, ST, Minority)")
    sub_caste: Optional[str] = None
    class_enrolled: Optional[int] = Field(None, ge=1, le=12, description="Currently enrolled class level for students")
    disability_status: bool = Field(False, description="Whether the applicant qualifies with certified physical disability")

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        valid_states = ["Andhra Pradesh", "Telangana"]
        if v not in valid_states:
            raise ValueError(f"State must be one of {valid_states}")
        return v

class EligibilityReason(BaseModel):
    criteria: str
    passed: bool
    description: str

class SchemeMatchScore(BaseModel):
    scheme_id: str
    scheme_name: str
    scheme_name_te: Optional[str] = None
    category: str
    status: str = Field(..., description="Eligible / Marginally Eligible / Ineligible")
    match_score: float = Field(..., description="Normalized alignment score between 0.0 and 1.0")
    explanation: str
    missing_docs: List[str] = []
    eligible_reasons: List[EligibilityReason] = []
    source_citation: Optional[str] = None

class EligibilityReportResponse(BaseModel):
    citizen_name: str
    state_matching_grid: str
    total_eligible_count: int
    matches: List[SchemeMatchScore]


class EligibilityIntelligenceInput(BaseModel):
    age: int
    state: str
    district: str
    income: float
    occupation: str
    gender: str
    category: str


class MatchedSchemeIntelligence(BaseModel):
    scheme_name: str
    eligible: bool
    confidence: float
    explanation: str
    benefits_summary: str
    reasons: List[str]
    required_documents: List[str]
    sources: List[Dict[str, Any]] = []


class EligibilityIntelligenceOutput(BaseModel):
    matched_schemes: List[MatchedSchemeIntelligence]
    eligible: bool
    confidence: float
    reasons: List[str]
    required_documents: List[str]
    sources: List[Dict[str, Any]] = []

