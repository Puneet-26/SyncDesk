from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date

class ReportFilterParams(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    bureau: Optional[str] = None
    region: Optional[str] = None
    institution_id: Optional[int] = None
    status: Optional[str] = None
    category: Optional[str] = None

class ReportSummaryResponse(BaseModel):
    title: str
    generated_at: str
    total_records: int
    data: List[Dict[str, Any]]
    filters_applied: Dict[str, Any]
