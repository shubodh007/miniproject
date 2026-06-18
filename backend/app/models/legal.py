from pydantic import BaseModel, Field
from typing import List, Optional

class LegalAnalysisRequest(BaseModel):
    document_text: str = Field(..., min_length=20, description="Raw text of the legal agreement/deed")
    category: str = Field("Rental Agreement", description="Classification of contract (Rental Agreement, Land Lease Deed, Affidavit, Custom)")

class ClauseRiskRecord(BaseModel):
    clause_quote: str = Field(..., description="The highly specific text excerpt flagged for risk")
    risk_level: str = Field(..., description="HIGH, MEDIUM, or LOW severity")
    diagnosis: str = Field(..., description="Regulatory analysis explaining the trap in plain terms")
    remedy_text: str = Field(..., description="Safe, pre-drafted alternative clause text ready for insertion")
    governing_legal_reference: str = Field(..., description="Applicable Indian law section, state regulation, or precedent code")

class LegalAnalysisReport(BaseModel):
    document_title: str
    overall_risk_score: int = Field(..., ge=0, le=100, description="100 represents pristine contract; 0 represents severe unmitigated entrapment")
    risk_assessment_summary: str
    flags_by_level: dict = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    clauses: List[ClauseRiskRecord] = []
    structural_suggestions: List[str] = []
