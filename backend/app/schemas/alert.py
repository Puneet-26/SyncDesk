from pydantic import BaseModel
from typing import Optional

class AlertResponse(BaseModel):
    id: int
    type: str
    severity: str
    case_id: Optional[int] = None
    case_number: Optional[str] = None
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None
    related_overlap_id: Optional[int] = None
    recipient_user_id: Optional[int] = None
    title: str
    message: str
    deduplication_key: str
    created_at: Optional[str] = None
    read_at: Optional[str] = None
    resolved_at: Optional[str] = None
    is_read: bool
    is_resolved: bool

    class Config:
        from_attributes = True

class ResolveAlertRequest(BaseModel):
    resolution_notes: Optional[str] = None
