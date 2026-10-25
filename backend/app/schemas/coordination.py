from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class CoordinationCaseItem(BaseModel):
    id: int
    coordination_id: int
    case_id: int
    case_number: Optional[str] = None
    case_status: Optional[str] = None
    category: Optional[str] = None
    bureau: str
    added_at: Optional[str] = None

class CoordinationRecordCreate(BaseModel):
    title: str
    description: str
    target_review_date: date
    case_ids: List[int]

class CoordinationRecordUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    coordination_status: Optional[str] = None  # Open, In Progress, Resolved, Closed
    target_review_date: Optional[date] = None
    resolution_summary: Optional[str] = None

class AddCaseToCoordinationRequest(BaseModel):
    case_id: int

class CoordinationRecordResponse(BaseModel):
    id: int
    title: str
    description: str
    coordination_status: str
    responsible_officer_id: int
    responsible_officer_name: Optional[str] = None
    target_review_date: Optional[str] = None
    resolution_summary: Optional[str] = None
    linked_cases: List[CoordinationCaseItem] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
