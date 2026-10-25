from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InstitutionAliasBase(BaseModel):
    alias: str
    source: str = "PORTAL_FILING"
    verification_status: str = "VERIFIED"

class InstitutionAliasCreate(InstitutionAliasBase):
    institution_id: int

class InstitutionAliasResponse(InstitutionAliasBase):
    id: int
    institution_id: int
    normalized_alias: str
    verified_by: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InstitutionBase(BaseModel):
    aicte_permanent_id: Optional[str] = None
    official_name: str
    address: Optional[str] = None
    city: str
    state: str
    region: str
    institution_type: str = "Engineering & Technology"
    identity_verification_status: str = "VERIFIED"

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    official_name: Optional[str] = None
    aicte_permanent_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    institution_type: Optional[str] = None
    identity_verification_status: Optional[str] = None

class InstitutionResponse(InstitutionBase):
    id: int
    normalized_name: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    aliases: List[InstitutionAliasResponse] = []

    class Config:
        from_attributes = True

class InstitutionSearchCandidate(BaseModel):
    id: int
    aicte_permanent_id: Optional[str] = None
    official_name: str
    city: str
    state: str
    region: str
    score: float
    match_type: str  # EXACT_ID, EXACT_ALIAS, EXACT_NAME, FUZZY_NAME

class ResolveInstitutionRequest(BaseModel):
    case_id: int
    institution_id: int
    remarks: Optional[str] = None
