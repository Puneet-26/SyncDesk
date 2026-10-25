from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, date, timezone

from app.db.session import get_db
from app.api.deps import get_current_user, require_officer
from app.models.user import User
from app.models.case import ComplaintCase, ActionHistory
from app.models.institution import Institution
from app.schemas.case import (
    CaseCreate, CaseUpdate, CaseResponse, CaseDetailResponse,
    ActionHistoryCreate, ActionHistoryResponse,
    TransferCaseRequest, EscalateCaseRequest, DisposeCaseRequest,
    ReopenCaseRequest, AssignOfficerRequest
)
from app.services.workflow_service import WorkflowService

router = APIRouter()

@router.get("/")
def list_cases(
    search: Optional[str] = None,
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    sla_state: Optional[str] = None,  # 'OVERDUE', 'APPROACHING', 'WITHIN_SLA'
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplaintCase)
    today = datetime.now(timezone.utc).date()

    if search:
        query = query.join(ComplaintCase.institution, isouter=True).filter(
            or_(
                ComplaintCase.case_id.ilike(f"%{search}%"),
                ComplaintCase.raw_institution_name.ilike(f"%{search}%"),
                ComplaintCase.description.ilike(f"%{search}%"),
                ComplaintCase.external_reference.ilike(f"%{search}%"),
                Institution.official_name.ilike(f"%{search}%"),
                Institution.aicte_permanent_id.ilike(f"%{search}%"),
            )
        )

    if bureau and bureau != "All":
        query = query.filter(ComplaintCase.current_bureau == bureau)

    if region and region != "All":
        query = query.join(ComplaintCase.institution, isouter=True).filter(Institution.region == region)

    if category and category != "All":
        query = query.filter(ComplaintCase.category == category)

    if status_filter and status_filter != "All":
        query = query.filter(ComplaintCase.status == status_filter)

    if priority and priority != "All":
        query = query.filter(ComplaintCase.priority == priority)

    if date_from:
        query = query.filter(ComplaintCase.date_received >= date_from)

    if date_to:
        query = query.filter(ComplaintCase.date_received <= date_to)

    if sla_state == "OVERDUE":
        query = query.filter(
            ComplaintCase.status != "Disposed",
            ComplaintCase.sla_due_date < today
        )
    elif sla_state == "APPROACHING":
        query = query.filter(
            ComplaintCase.status != "Disposed",
            ComplaintCase.sla_due_date >= today,
            ComplaintCase.sla_due_date <= (today + date.resolution * 7)
        )

    total = query.count()
    cases = query.order_by(ComplaintCase.date_received.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [c.to_dict() for c in cases]
    }

@router.post("/", response_model=CaseResponse)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    new_case = WorkflowService.create_case(
        db=db,
        actor=current_user,
        raw_institution_name=case_in.raw_institution_name,
        category=case_in.category,
        description=case_in.description,
        current_bureau=case_in.current_bureau,
        priority=case_in.priority,
        aicte_permanent_id=case_in.aicte_permanent_id,
        external_reference=case_in.external_reference,
        sla_days=case_in.sla_days,
        next_action=case_in.next_action or "Initial Review & Bureau Verification"
    )
    return new_case.to_dict()

@router.get("/{id}")
def get_case_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    result = case.to_dict()
    result["action_history"] = [a.to_dict() for a in case.action_history]
    return result

def verify_case_modify_permission(user: User, case: ComplaintCase):
    if user.role in ["Admin", "Senior Management"]:
        return

    # Regional Officer check
    if user.role == "Regional Officer":
        if user.region != "All" and case.institution and case.institution.region != user.region:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Regional jurisdiction error: Your assigned jurisdiction is '{user.region}', but this case concerns an institution in '{case.institution.region}' region."
            )
        if case.current_bureau != "Regional Office (RO)":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bureau jurisdiction error: Regional Officers can only modify cases under 'Regional Office (RO)'. This case is currently under '{case.current_bureau}'."
            )
        return

    # Specific Bureau Officer check (RB Officer, PGRC Officer, etc.)
    if user.bureau and user.bureau != "All" and user.bureau != case.current_bureau:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-bureau modification not permitted: Your bureau is '{user.bureau}', but this case is currently under '{case.current_bureau}'. Request inter-bureau transfer or coordination."
        )

@router.put("/{id}", response_model=CaseResponse)
def update_case(
    id: int,
    case_in: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    verify_case_modify_permission(current_user, case)

    if case_in.category:
        case.category = case_in.category
    if case_in.description:
        case.description = case_in.description
    if case_in.priority:
        case.priority = case_in.priority
    if case_in.next_action:
        case.next_action = case_in.next_action
    if case_in.expected_disposal_date:
        case.expected_disposal_date = case_in.expected_disposal_date

    case.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(case)
    return case.to_dict()

@router.post("/{id}/actions")
def add_case_action(
    id: int,
    action_in: ActionHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    verify_case_modify_permission(current_user, case)

    action = WorkflowService.add_action_note(
        db=db,
        actor=current_user,
        case=case,
        remarks=action_in.remarks,
        action_type=action_in.action_type,
        attachment_reference=action_in.attachment_reference,
        next_action=action_in.next_action
    )
    return action.to_dict()

@router.post("/{id}/transfer")
def transfer_case(
    id: int,
    transfer_in: TransferCaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    verify_case_modify_permission(current_user, case)

    updated_case = WorkflowService.transfer_case(
        db=db,
        actor=current_user,
        case=case,
        target_bureau=transfer_in.target_bureau,
        remarks=transfer_in.remarks,
        attachment_reference=transfer_in.attachment_reference
    )
    return updated_case.to_dict()

@router.post("/{id}/escalate")
def escalate_case(
    id: int,
    escalate_in: EscalateCaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    verify_case_modify_permission(current_user, case)

    updated_case = WorkflowService.escalate_case(
        db=db,
        actor=current_user,
        case=case,
        remarks=escalate_in.remarks,
        target_authority=escalate_in.target_authority or "Senior Management",
        priority=escalate_in.priority or "CRITICAL"
    )
    return updated_case.to_dict()

@router.post("/{id}/assign")
def assign_officer(
    id: int,
    assign_in: AssignOfficerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    verify_case_modify_permission(current_user, case)

    officer = db.query(User).filter(User.id == assign_in.officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    case.assigned_officer_id = officer.id
    action = ActionHistory(
        case_id=case.id,
        actor_user_id=current_user.id,
        bureau=case.current_bureau,
        action_type="ASSIGNMENT",
        remarks=f"Assigned to officer {officer.name} ({officer.role}). {assign_in.remarks or ''}".strip(),
        from_bureau=case.current_bureau,
        to_bureau=case.current_bureau,
        previous_status=case.status,
        new_status=case.status
    )
    db.add(action)
    db.commit()
    return case.to_dict()

@router.post("/{id}/dispose")
def dispose_case(
    id: int,
    dispose_in: DisposeCaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    verify_case_modify_permission(current_user, case)

    updated_case = WorkflowService.dispose_case(
        db=db,
        actor=current_user,
        case=case,
        closure_remarks=dispose_in.closure_remarks,
        attachment_reference=dispose_in.attachment_reference
    )
    return updated_case.to_dict()

@router.post("/{id}/reopen")
def reopen_case(
    id: int,
    reopen_in: ReopenCaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    updated_case = WorkflowService.reopen_case(
        db=db,
        actor=current_user,
        case=case,
        reopen_reason=reopen_in.reopen_reason
    )
    return updated_case.to_dict()
