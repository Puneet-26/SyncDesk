import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.api.deps import get_current_user, require_officer
from app.models.user import User
from app.models.case import ComplaintCase
from app.models.overlap import OverlapAssessment
from app.schemas.overlap import (
    OverlapAssessmentResponse, ConfirmOverlapRequest,
    DismissOverlapRequest, ManualLinkRequest
)
from app.services.overlap_engine import ExplainableOverlapEngine
from app.services.workflow_service import WorkflowService

router = APIRouter()

@router.get("/")
def list_overlaps(
    status_filter: Optional[str] = "Suggested",
    classification: Optional[str] = None,
    bureau: Optional[str] = None,
    institution_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(OverlapAssessment)

    if status_filter and status_filter != "All":
        query = query.filter(OverlapAssessment.status == status_filter)

    if classification and classification != "All":
        query = query.filter(OverlapAssessment.classification == classification)

    if institution_id:
        query = query.join(OverlapAssessment.case_a).filter(ComplaintCase.institution_id == institution_id)

    total = query.count()
    items = query.order_by(OverlapAssessment.overall_score.desc()).offset(skip).limit(limit).all()

    # Filter by bureau if requested
    results = []
    for item in items:
        d = item.to_dict()
        if bureau and bureau != "All":
            b_a = d["case_a"]["current_bureau"] if d["case_a"] else None
            b_b = d["case_b"]["current_bureau"] if d["case_b"] else None
            if bureau != b_a and bureau != b_b:
                continue
        results.append(d)

    return {
        "total": total,
        "items": results
    }

@router.get("/{id}")
def get_overlap_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(OverlapAssessment).filter(OverlapAssessment.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Overlap assessment not found.")
    return item.to_dict()

@router.post("/reassess-all")
def trigger_batch_reassessment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    count = ExplainableOverlapEngine.batch_reassess_all(db)
    return {
        "message": f"Batch reassessment completed. Evaluated {count} relationships across active cases.",
        "evaluations_count": count
    }

@router.post("/{id}/confirm")
def confirm_overlap(
    id: int,
    req: ConfirmOverlapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    updated = WorkflowService.confirm_overlap(
        db=db,
        actor=current_user,
        overlap_id=id,
        remarks=req.remarks,
        create_coordination_record=req.create_coordination_record,
        coordination_title=req.coordination_title,
        target_review_date=req.target_review_date
    )
    return updated.to_dict()

@router.post("/{id}/dismiss")
def dismiss_overlap(
    id: int,
    req: DismissOverlapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    updated = WorkflowService.dismiss_overlap(
        db=db,
        actor=current_user,
        overlap_id=id,
        reason=req.reason
    )
    return updated.to_dict()

@router.post("/manual-link")
def manually_link_cases(
    req: ManualLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    case_a_id = min(req.case_a_id, req.case_b_id)
    case_b_id = max(req.case_a_id, req.case_b_id)

    case_a = db.query(ComplaintCase).filter(ComplaintCase.id == case_a_id).first()
    case_b = db.query(ComplaintCase).filter(ComplaintCase.id == case_b_id).first()
    if not case_a or not case_b:
        raise HTTPException(status_code=404, detail="One or both cases not found.")

    assessment_data = ExplainableOverlapEngine.assess_case_pair(case_a, case_b)
    assessment_data["classification"] = req.classification
    assessment_data["reasons"]["manual_override"] = {
        "linked_by": current_user.name,
        "remarks": req.remarks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    existing = db.query(OverlapAssessment).filter(
        OverlapAssessment.case_a_id == case_a_id,
        OverlapAssessment.case_b_id == case_b_id
    ).first()

    if existing:
        existing.status = "Confirmed"
        existing.confirmed_by = current_user.id
        existing.classification = req.classification
        existing.reasons = json.dumps(assessment_data["reasons"])
        db.commit()
        db.refresh(existing)
        return existing.to_dict()

    new_assessment = OverlapAssessment(
        case_a_id=case_a_id,
        case_b_id=case_b_id,
        institution_identity_score=assessment_data["institution_identity_score"],
        category_similarity_score=assessment_data["category_similarity_score"],
        text_similarity_score=assessment_data["text_similarity_score"],
        overall_score=assessment_data["overall_score"],
        classification=req.classification,
        reasons=json.dumps(assessment_data["reasons"]),
        status="Confirmed",
        confirmed_by=current_user.id,
        assessment_version="v1.0-manual"
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    return new_assessment.to_dict()
