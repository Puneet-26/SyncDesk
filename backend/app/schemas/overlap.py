from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import date
from app.schemas.case import CaseResponse

class OverlapAssessmentResponse(BaseModel):
    id: int
    case_a_id: int
    case_b_id: int
    case_a: Optional[CaseResponse] = None
    case_b: Optional[CaseResponse] = None
    institution_identity_score: float
    category_similarity_score: float
    text_similarity_score: float
    overall_score: float
    classification: str
    reasons: Dict[str, Any]
    status: str
    dismissed_reason: Optional[str] = None
    dismissed_by: Optional[int] = None
    dismissed_by_name: Optional[str] = None
    confirmed_by: Optional[int] = None
    confirmed_by_name: Optional[str] = None
    assessment_version: str
    last_assessed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class ConfirmOverlapRequest(BaseModel):
    remarks: Optional[str] = None
    create_coordination_record: bool = True
    coordination_title: Optional[str] = None
    target_review_date: Optional[date] = None

class DismissOverlapRequest(BaseModel):
    reason: str = Field(..., min_length=8, description="Mandatory reason for dismissing suggested overlap")

class ManualLinkRequest(BaseModel):
    case_a_id: int
    case_b_id: int
    classification: str = "Potential Issue Overlap"
    remarks: str
