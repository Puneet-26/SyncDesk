from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class ActionHistoryResponse(BaseModel):
    id: int
    case_id: int
    timestamp: Optional[str] = None
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = "System"
    bureau: str
    action_type: str
    remarks: str
    attachment_reference: Optional[str] = None
    from_bureau: Optional[str] = None
    to_bureau: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    created_at: Optional[str] = None

class ActionHistoryCreate(BaseModel):
    remarks: str
    action_type: str = "ACTION_NOTE"
    attachment_reference: Optional[str] = None
    next_action: Optional[str] = None

class CaseBase(BaseModel):
    raw_institution_name: str
    aicte_permanent_id: Optional[str] = None
    external_reference: Optional[str] = None
    category: str
    description: str
    priority: str = "MEDIUM"
    current_bureau: str
    sla_days: int = 30
    next_action: Optional[str] = "Initial Review & Verification"

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    next_action: Optional[str] = None
    expected_disposal_date: Optional[date] = None

class TransferCaseRequest(BaseModel):
    target_bureau: str
    remarks: str
    attachment_reference: Optional[str] = None

class EscalateCaseRequest(BaseModel):
    remarks: str
    target_authority: Optional[str] = "Senior Management"
    priority: Optional[str] = "CRITICAL"

class DisposeCaseRequest(BaseModel):
    closure_remarks: str = Field(..., min_length=10, description="Mandatory detailed closure remarks")
    attachment_reference: Optional[str] = None

class ReopenCaseRequest(BaseModel):
    reopen_reason: str = Field(..., min_length=15, description="Authorized rationale for reopening disposed complaint")

class AssignOfficerRequest(BaseModel):
    officer_id: int
    remarks: Optional[str] = None

class CaseResponse(BaseModel):
    id: int
    case_id: str
    institution_id: Optional[int] = None
    institution_name: str
    aicte_permanent_id: Optional[str] = None
    raw_institution_name: str
    external_reference: Optional[str] = None
    category: str
    description: str
    priority: str
    date_received: Optional[str] = None
    status: str
    current_bureau: str
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    last_action: str
    next_action: str
    last_action_date: Optional[str] = None
    expected_disposal_date: Optional[str] = None
    sla_due_date: Optional[str] = None
    sla_days: int
    closure_remarks: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class CaseDetailResponse(CaseResponse):
    action_history: List[ActionHistoryResponse] = []
