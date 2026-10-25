from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.case import ComplaintCase
from app.models.institution import Institution
from app.models.overlap import OverlapAssessment
from app.models.alert import Alert

router = APIRouter()

@router.get("/kpi-summary")
def get_kpi_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    
    total_cases = db.query(ComplaintCase).count()
    pending = db.query(ComplaintCase).filter(ComplaintCase.status == "Pending").count()
    under_process = db.query(ComplaintCase).filter(ComplaintCase.status == "Under Process").count()
    disposed = db.query(ComplaintCase).filter(ComplaintCase.status == "Disposed").count()
    transferred = db.query(ComplaintCase).filter(ComplaintCase.status == "Transferred").count()
    escalated = db.query(ComplaintCase).filter(ComplaintCase.status == "Escalated").count()

    # Overdue cases: active and sla_due_date < today
    overdue = db.query(ComplaintCase).filter(
        ComplaintCase.status.in_(["Pending", "Under Process", "Escalated", "Transferred"]),
        ComplaintCase.sla_due_date < today
    ).count()

    # Institutions with active cross-bureau overlaps
    active_overlap_assessments = db.query(OverlapAssessment).filter(
        OverlapAssessment.status.in_(["Suggested", "Confirmed"])
    ).all()

    inst_ids = set()
    for ov in active_overlap_assessments:
        if ov.case_a and ov.case_a.institution_id and ov.case_b and ov.case_b.institution_id:
            if ov.case_a.institution_id == ov.case_b.institution_id:
                # check if cross bureau and active
                if ov.case_a.current_bureau != ov.case_b.current_bureau:
                    if ov.case_a.status != "Disposed" and ov.case_b.status != "Disposed":
                        inst_ids.add(ov.case_a.institution_id)

    return {
        "total_cases": total_cases,
        "pending_cases": pending,
        "under_process_cases": under_process,
        "disposed_cases": disposed,
        "transferred_cases": transferred,
        "escalated_cases": escalated,
        "overdue_cases": overdue,
        "active_overlap_institutions": len(inst_ids),
        "sla_compliance_rate": round(((total_cases - overdue) / max(total_cases, 1)) * 100, 1)
    }

@router.get("/bureau-stats")
def get_bureau_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    all_cases = db.query(ComplaintCase).all()

    stats: Dict[str, Dict[str, int]] = {}
    for c in all_cases:
        b = c.current_bureau
        if b not in stats:
            stats[b] = {"total": 0, "pending": 0, "under_process": 0, "disposed": 0, "overdue": 0}
        stats[b]["total"] += 1
        if c.status == "Pending":
            stats[b]["pending"] += 1
        elif c.status == "Under Process":
            stats[b]["under_process"] += 1
        elif c.status == "Disposed":
            stats[b]["disposed"] += 1

        if c.status != "Disposed" and c.sla_due_date < today:
            stats[b]["overdue"] += 1

    result = [{"bureau": k, **v} for k, v in stats.items()]
    return result

@router.get("/status-distribution")
def get_status_distribution(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(ComplaintCase.status, func.count(ComplaintCase.id)).group_by(ComplaintCase.status).all()
    palette = {
        "Pending": "#f59e0b",
        "Under Process": "#3b82f6",
        "Disposed": "#10b981",
        "Transferred": "#8b5cf6",
        "Escalated": "#ef4444"
    }
    return [{"status": r[0], "count": r[1], "color": palette.get(r[0], "#64748b")} for r in rows]

@router.get("/region-stats")
def get_region_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    all_cases = db.query(ComplaintCase).all()
    region_counts: Dict[str, int] = {}
    for c in all_cases:
        reg = c.institution.region if c.institution else "Unassigned"
        region_counts[reg] = region_counts.get(reg, 0) + 1
    return [{"region": k, "count": v} for k, v in sorted(region_counts.items())]

@router.get("/ageing-stats")
def get_ageing_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    active_cases = db.query(ComplaintCase).filter(ComplaintCase.status != "Disposed").all()
    buckets = {"0-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0}
    for c in active_cases:
        age = (today - c.date_received).days
        if age <= 30:
            buckets["0-30 Days"] += 1
        elif age <= 60:
            buckets["31-60 Days"] += 1
        elif age <= 90:
            buckets["61-90 Days"] += 1
        else:
            buckets["90+ Days"] += 1
    return [{"bracket": k, "count": v} for k, v in buckets.items()]

@router.get("/disposal-trend")
def get_disposal_trend(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    # Past 6 months
    months_data = []
    for i in range(5, -1, -1):
        m_date = today.replace(day=1) - timedelta(days=i * 30)
        m_label = m_date.strftime("%b %Y")
        
        # Approximate monthly counts
        m_start = m_date.replace(day=1)
        next_m = (m_start + timedelta(days=32)).replace(day=1)
        
        intake = db.query(ComplaintCase).filter(
            ComplaintCase.date_received >= m_start,
            ComplaintCase.date_received < next_m
        ).count()

        disposed = db.query(ComplaintCase).filter(
            ComplaintCase.status == "Disposed",
            ComplaintCase.last_action_date >= datetime(m_start.year, m_start.month, 1),
            ComplaintCase.last_action_date < datetime(next_m.year, next_m.month, 1)
        ).count()

        months_data.append({
            "month": m_label,
            "intake": intake,
            "disposed": disposed
        })
    return months_data

@router.get("/priority-queue")
def get_priority_queue(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    approaching = today + timedelta(days=7)

    items = []

    # 1. Overdue cases
    overdue = db.query(ComplaintCase).filter(
        ComplaintCase.status.in_(["Pending", "Under Process", "Escalated", "Transferred"]),
        ComplaintCase.sla_due_date < today
    ).order_by(ComplaintCase.sla_due_date.asc()).limit(8).all()

    for c in overdue:
        days_late = (today - c.sla_due_date).days
        items.append({
            "id": f"overdue_{c.id}",
            "case_id": c.case_id,
            "internal_id": c.id,
            "title": f"SLA BREACHED: {c.case_id}",
            "type": "SLA_BREACHED",
            "severity": "CRITICAL",
            "institution": c.institution.official_name if c.institution else c.raw_institution_name,
            "bureau": c.current_bureau,
            "status": c.status,
            "priority": c.priority,
            "due_date": c.sla_due_date.isoformat(),
            "priority_reason": f"Case has exceeded its statutory SLA deadline by {days_late} days. Pending action: '{c.next_action}'."
        })

    # 2. SLA Approaching <= 7 days
    approaching_cases = db.query(ComplaintCase).filter(
        ComplaintCase.status.in_(["Pending", "Under Process", "Escalated", "Transferred"]),
        ComplaintCase.sla_due_date >= today,
        ComplaintCase.sla_due_date <= approaching
    ).order_by(ComplaintCase.sla_due_date.asc()).limit(6).all()

    for c in approaching_cases:
        days_left = (c.sla_due_date - today).days
        items.append({
            "id": f"approaching_{c.id}",
            "case_id": c.case_id,
            "internal_id": c.id,
            "title": f"SLA Approaching: {c.case_id}",
            "type": "SLA_APPROACHING",
            "severity": "HIGH",
            "institution": c.institution.official_name if c.institution else c.raw_institution_name,
            "bureau": c.current_bureau,
            "status": c.status,
            "priority": c.priority,
            "due_date": c.sla_due_date.isoformat(),
            "priority_reason": f"{days_left} days remaining before statutory breach. Action required: '{c.next_action}'."
        })

    # 3. Unresolved Cross-Bureau Coordination Requirements
    unconfirmed_overlaps = db.query(OverlapAssessment).filter(
        OverlapAssessment.status == "Suggested",
        OverlapAssessment.classification.in_(["Potential Duplicate", "Potential Issue Overlap"])
    ).limit(5).all()

    for ov in unconfirmed_overlaps:
        if ov.case_a and ov.case_b:
            items.append({
                "id": f"overlap_{ov.id}",
                "case_id": f"{ov.case_a.case_id} & {ov.case_b.case_id}",
                "internal_id": ov.case_a_id,
                "overlap_id": ov.id,
                "title": f"Cross-Bureau Overlap: {ov.classification}",
                "type": "CROSS_BUREAU_OVERLAP",
                "severity": "HIGH",
                "institution": ov.case_a.institution.official_name if ov.case_a.institution else ov.case_a.raw_institution_name,
                "bureau": f"{ov.case_a.current_bureau} & {ov.case_b.current_bureau}",
                "status": f"{ov.case_a.status} / {ov.case_b.status}",
                "priority": "HIGH",
                "due_date": ov.case_a.sla_due_date.isoformat(),
                "priority_reason": f"Cases across {ov.case_a.current_bureau} and {ov.case_b.current_bureau} share {int(ov.overall_score * 100)}% similarity. Cross-bureau review pending."
            })

    # 4. Unresolved Institution Identities
    unresolved_cases = db.query(ComplaintCase).filter(
        ComplaintCase.institution_id.is_(None)
    ).limit(4).all()

    for c in unresolved_cases:
        items.append({
            "id": f"unres_{c.id}",
            "case_id": c.case_id,
            "internal_id": c.id,
            "title": f"Unresolved Institution: {c.case_id}",
            "type": "UNRESOLVED_INSTITUTION",
            "severity": "MEDIUM",
            "institution": c.raw_institution_name,
            "bureau": c.current_bureau,
            "status": c.status,
            "priority": c.priority,
            "due_date": c.sla_due_date.isoformat(),
            "priority_reason": f"Complaint filed with non-standard name '{c.raw_institution_name}'. Identity confirmation needed in resolution queue."
        })

    return items

@router.get("/institution-status")
def get_institution_status_table(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    institutions = db.query(Institution).all()

    result = []
    for inst in institutions:
        cases = inst.cases
        if not cases:
            continue
        total = len(cases)
        active = sum(1 for c in cases if c.status != "Disposed")
        overdue = sum(1 for c in cases if c.status != "Disposed" and c.sla_due_date < today)
        bureaus = list(set(c.current_bureau for c in cases))

        # Check overlaps
        case_ids = [c.id for c in cases]
        overlaps_count = db.query(OverlapAssessment).filter(
            (OverlapAssessment.case_a_id.in_(case_ids)) | (OverlapAssessment.case_b_id.in_(case_ids)),
            OverlapAssessment.status.in_(["Suggested", "Confirmed"])
        ).count()

        latest_case = sorted(cases, key=lambda x: x.last_action_date, reverse=True)[0]

        result.append({
            "id": inst.id,
            "official_name": inst.official_name,
            "aicte_permanent_id": inst.aicte_permanent_id or "Pending Verification",
            "city": inst.city,
            "state": inst.state,
            "region": inst.region,
            "total_cases": total,
            "active_cases": active,
            "overdue_cases": overdue,
            "involved_bureaus": bureaus,
            "overlap_count": overlaps_count,
            "most_recent_action": latest_case.last_action,
            "last_action_date": latest_case.last_action_date.isoformat()
        })

    # Sort descending by active cases
    result.sort(key=lambda x: x["active_cases"], reverse=True)
    return result
