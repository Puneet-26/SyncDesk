from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.db.session import get_db
from app.api.deps import get_current_user, require_admin, require_officer
from app.models.user import User
from app.models.institution import Institution, InstitutionAlias
from app.models.case import ComplaintCase
from app.schemas.institution import (
    InstitutionCreate, InstitutionUpdate, InstitutionResponse,
    InstitutionAliasBase, InstitutionAliasCreate, InstitutionAliasResponse,
    ResolveInstitutionRequest
)
from app.services.institution_service import InstitutionResolutionService, normalize_institution_name

router = APIRouter()

@router.get("/", response_model=List[InstitutionResponse])
def list_institutions(
    search: Optional[str] = None,
    region: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Institution)

    if search:
        search_norm = normalize_institution_name(search)
        query = query.filter(
            or_(
                Institution.official_name.ilike(f"%{search}%"),
                Institution.aicte_permanent_id.ilike(f"%{search}%"),
                Institution.normalized_name.ilike(f"%{search_norm}%"),
                Institution.city.ilike(f"%{search}%")
            )
        )

    if region and region != "All":
        query = query.filter(Institution.region == region)

    if status_filter and status_filter != "All":
        query = query.filter(Institution.identity_verification_status == status_filter)

    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=InstitutionResponse)
def create_institution(
    inst_in: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if inst_in.aicte_permanent_id:
        existing = db.query(Institution).filter(Institution.aicte_permanent_id == inst_in.aicte_permanent_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="AICTE Permanent ID already registered.")

    norm_name = normalize_institution_name(inst_in.official_name)
    inst = Institution(
        aicte_permanent_id=inst_in.aicte_permanent_id,
        official_name=inst_in.official_name,
        normalized_name=norm_name,
        address=inst_in.address,
        city=inst_in.city,
        state=inst_in.state,
        region=inst_in.region,
        institution_type=inst_in.institution_type,
        identity_verification_status=inst_in.identity_verification_status
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst

@router.get("/{id}", response_model=InstitutionResponse)
def get_institution_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst

@router.put("/{id}", response_model=InstitutionResponse)
def update_institution(
    id: int,
    inst_in: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    if inst_in.official_name:
        inst.official_name = inst_in.official_name
        inst.normalized_name = normalize_institution_name(inst_in.official_name)
    if inst_in.aicte_permanent_id is not None:
        inst.aicte_permanent_id = inst_in.aicte_permanent_id
    if inst_in.address is not None:
        inst.address = inst_in.address
    if inst_in.city is not None:
        inst.city = inst_in.city
    if inst_in.state is not None:
        inst.state = inst_in.state
    if inst_in.region is not None:
        inst.region = inst_in.region
    if inst_in.institution_type is not None:
        inst.institution_type = inst_in.institution_type
    if inst_in.identity_verification_status is not None:
        inst.identity_verification_status = inst_in.identity_verification_status

    db.commit()
    db.refresh(inst)
    return inst

@router.post("/{id}/aliases", response_model=InstitutionAliasResponse)
def add_institution_alias(
    id: int,
    alias_in: InstitutionAliasBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    norm = normalize_institution_name(alias_in.alias)
    alias = InstitutionAlias(
        institution_id=inst.id,
        alias=alias_in.alias,
        normalized_alias=norm,
        source=alias_in.source,
        verification_status=alias_in.verification_status,
        verified_by=current_user.id
    )
    db.add(alias)
    db.commit()
    db.refresh(alias)
    return alias

@router.get("/{id}/cases")
def get_institution_consolidated_cases(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    cases = db.query(ComplaintCase).filter(ComplaintCase.institution_id == id).order_by(ComplaintCase.date_received.desc()).all()
    return [c.to_dict() for c in cases]

@router.post("/resolve")
def resolve_institution_mapping(
    req: ResolveInstitutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    success = InstitutionResolutionService.manual_resolve(
        db=db,
        case_id=req.case_id,
        institution_id=req.institution_id,
        resolved_by_user_id=current_user.id,
        remarks=req.remarks
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to resolve institution for the specified case.")
    return {"message": "Institution identity successfully resolved and linked to case."}
