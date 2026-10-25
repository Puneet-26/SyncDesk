from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.api.deps import get_current_user, require_officer
from app.models.user import User
from app.models.case import ComplaintCase, ActionHistory
from app.models.coordination import CoordinationRecord, CoordinationCase
from app.schemas.coordination import (
    CoordinationRecordCreate, CoordinationRecordUpdate,
    CoordinationRecordResponse, AddCaseToCoordinationRequest
)

router = APIRouter()

@router.get("/")
def list_coordination_records(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CoordinationRecord)
    if status_filter and status_filter != "All":
        query = query.filter(CoordinationRecord.coordination_status == status_filter)

    records = query.order_by(CoordinationRecord.created_at.desc()).offset(skip).limit(limit).all()
    return [r.to_dict() for r in records]

@router.post("/")
def create_coordination_record(
    req: CoordinationRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    coord = CoordinationRecord(
        title=req.title,
        description=req.description,
        coordination_status="Open",
        responsible_officer_id=current_user.id,
        target_review_date=req.target_review_date,
        resolution_summary=None
    )
    db.add(coord)
    db.flush()

    for cid in req.case_ids:
        case = db.query(ComplaintCase).filter(ComplaintCase.id == cid).first()
        if case:
            db.add(CoordinationCase(
                coordination_id=coord.id,
                case_id=case.id,
                bureau=case.current_bureau
            ))
            # Action history
            action = ActionHistory(
                case_id=case.id,
                actor_user_id=current_user.id,
                bureau=case.current_bureau,
                action_type="COORDINATION",
                remarks=f"Linked to Joint Coordination Workspace '{req.title}' (ID: #{coord.id}).",
                from_bureau=case.current_bureau,
                to_bureau=case.current_bureau,
                previous_status=case.status,
                new_status=case.status
            )
            db.add(action)

    db.commit()
    db.refresh(coord)
    return coord.to_dict()

@router.get("/{id}")
def get_coordination_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    coord = db.query(CoordinationRecord).filter(CoordinationRecord.id == id).first()
    if not coord:
        raise HTTPException(status_code=404, detail="Coordination record not found")
    return coord.to_dict()

@router.put("/{id}")
def update_coordination_record(
    id: int,
    req: CoordinationRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    coord = db.query(CoordinationRecord).filter(CoordinationRecord.id == id).first()
    if not coord:
        raise HTTPException(status_code=404, detail="Coordination record not found")

    if req.title:
        coord.title = req.title
    if req.description:
        coord.description = req.description
    if req.coordination_status:
        coord.coordination_status = req.coordination_status
    if req.target_review_date:
        coord.target_review_date = req.target_review_date
    if req.resolution_summary:
        coord.resolution_summary = req.resolution_summary

    coord.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(coord)
    return coord.to_dict()

@router.post("/{id}/cases")
def add_case_to_coordination(
    id: int,
    req: AddCaseToCoordinationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    coord = db.query(CoordinationRecord).filter(CoordinationRecord.id == id).first()
    if not coord:
        raise HTTPException(status_code=404, detail="Coordination record not found")

    case = db.query(ComplaintCase).filter(ComplaintCase.id == req.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    existing = db.query(CoordinationCase).filter(
        CoordinationCase.coordination_id == id,
        CoordinationCase.case_id == req.case_id
    ).first()

    if not existing:
        db.add(CoordinationCase(
            coordination_id=id,
            case_id=case.id,
            bureau=case.current_bureau
        ))
        action = ActionHistory(
            case_id=case.id,
            actor_user_id=current_user.id,
            bureau=case.current_bureau,
            action_type="COORDINATION",
            remarks=f"Added to Joint Coordination record '{coord.title}'.",
            from_bureau=case.current_bureau,
            to_bureau=case.current_bureau,
            previous_status=case.status,
            new_status=case.status
        )
        db.add(action)
        db.commit()

    db.refresh(coord)
    return coord.to_dict()
