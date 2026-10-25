import json
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.case import ComplaintCase, ActionHistory
from app.models.institution import Institution
from app.models.overlap import OverlapAssessment
from app.models.coordination import CoordinationRecord, CoordinationCase
from app.models.alert import Alert
from app.models.audit import AuditEvent
from app.models.user import User
from app.services.institution_service import InstitutionResolutionService
from app.services.overlap_engine import ExplainableOverlapEngine

class WorkflowService:
    @staticmethod
    def create_case(
        db: Session,
        actor: User,
        raw_institution_name: str,
        category: str,
        description: str,
        current_bureau: str,
        priority: str = "MEDIUM",
        aicte_permanent_id: Optional[str] = None,
        external_reference: Optional[str] = None,
        sla_days: int = 30,
        next_action: str = "Initial Review & Verification"
    ) -> ComplaintCase:
        # Determine institution resolution
        inst, res_status, score, candidates = InstitutionResolutionService.resolve_institution(
            db=db,
            raw_name=raw_institution_name,
            aicte_permanent_id=aicte_permanent_id
        )

        today = datetime.now(timezone.utc).date()
        sla_due = today + timedelta(days=sla_days)

        # Generate unique Case ID: AICTE-<BUREAU_ACRONYM>-YEAR-RANDOM/SEQ
        bureau_code = "RB" if "Regulation" in current_bureau else ("PGRC" if "Grievance" in current_bureau else "RO")
        count = db.query(ComplaintCase).count() + 1
        case_id_str = f"AICTE-{bureau_code}-{today.year}-{count:05d}"

        new_case = ComplaintCase(
            case_id=case_id_str,
            institution_id=inst.id if inst else None,
            raw_institution_name=raw_institution_name,
            external_reference=external_reference,
            category=category,
            description=description,
            priority=priority,
            date_received=today,
            status="Pending",
            current_bureau=current_bureau,
            assigned_officer_id=actor.id if actor.role in ["RB Officer", "PGRC Officer", "Regional Officer"] else None,
            last_action="Complaint registered in Centralized AICTE Portal",
            next_action=next_action,
            last_action_date=datetime.now(timezone.utc),
            sla_due_date=sla_due,
            sla_days=sla_days
        )
        db.add(new_case)
        db.flush()

        # Action history entry
        action = ActionHistory(
            case_id=new_case.id,
            actor_user_id=actor.id,
            bureau=current_bureau,
            action_type="CREATION",
            remarks=f"Complaint lodged by {actor.name} ({actor.role}). Institution match: {res_status} (Score: {score}).",
            from_bureau=None,
            to_bureau=current_bureau,
            previous_status=None,
            new_status="Pending"
        )
        db.add(action)

        # Audit event
        audit = AuditEvent(
            actor_user_id=actor.id,
            entity_type="CASE",
            entity_id=str(new_case.id),
            operation="CREATE",
            before_state=None,
            after_state=json.dumps({"case_id": new_case.case_id, "category": category, "institution_id": new_case.institution_id})
        )
        db.add(audit)

        # If institution is unresolved, create alert
        if not inst:
            alert = Alert(
                type="Institution Resolution Required",
                severity="HIGH",
                case_id=new_case.id,
                institution_id=None,
                title=f"Institution Resolution Required: {new_case.case_id}",
                message=f"Case lodged with raw institution '{raw_institution_name}'. Identity confidence is ambiguous ({res_status}). Requires administrative verification.",
                deduplication_key=f"INST_RES_{new_case.id}"
            )
            db.add(alert)
        else:
            # Run overlap assessment against existing cases
            ExplainableOverlapEngine.evaluate_case_overlaps(db, new_case)

        db.commit()
        db.refresh(new_case)
        return new_case

    @staticmethod
    def add_action_note(
        db: Session,
        actor: User,
        case: ComplaintCase,
        remarks: str,
        action_type: str = "ACTION_NOTE",
        attachment_reference: Optional[str] = None,
        next_action: Optional[str] = None
    ) -> ActionHistory:
        if next_action:
            case.next_action = next_action
        case.last_action = remarks[:200]
        case.last_action_date = datetime.now(timezone.utc)
        if case.status == "Pending":
            case.status = "Under Process"

        action = ActionHistory(
            case_id=case.id,
            actor_user_id=actor.id,
            bureau=case.current_bureau,
            action_type=action_type,
            remarks=remarks,
            attachment_reference=attachment_reference,
            from_bureau=case.current_bureau,
            to_bureau=case.current_bureau,
            previous_status=case.status,
            new_status=case.status
        )
        db.add(action)
        db.commit()
        db.refresh(case)
        return action

    @staticmethod
    def transfer_case(
        db: Session,
        actor: User,
        case: ComplaintCase,
        target_bureau: str,
        remarks: str,
        attachment_reference: Optional[str] = None
    ) -> ComplaintCase:
        from_bureau = case.current_bureau
        prev_status = case.status

        case.current_bureau = target_bureau
        case.status = "Transferred"
        case.last_action = f"Transferred from {from_bureau} to {target_bureau}: {remarks[:100]}"
        case.next_action = f"Acknowledge & review transfer in {target_bureau}"
        case.last_action_date = datetime.now(timezone.utc)

        action = ActionHistory(
            case_id=case.id,
            actor_user_id=actor.id,
            bureau=target_bureau,
            action_type="TRANSFER",
            remarks=remarks,
            attachment_reference=attachment_reference,
            from_bureau=from_bureau,
            to_bureau=target_bureau,
            previous_status=prev_status,
            new_status="Transferred"
        )
        db.add(action)

        audit = AuditEvent(
            actor_user_id=actor.id,
            entity_type="CASE",
            entity_id=str(case.id),
            operation="TRANSFER",
            before_state=json.dumps({"bureau": from_bureau, "status": prev_status}),
            after_state=json.dumps({"bureau": target_bureau, "status": "Transferred", "remarks": remarks})
        )
        db.add(audit)

        # Overlaps might change since bureau changed
        ExplainableOverlapEngine.evaluate_case_overlaps(db, case)

        db.commit()
        db.refresh(case)
        return case

    @staticmethod
    def escalate_case(
        db: Session,
        actor: User,
        case: ComplaintCase,
        remarks: str,
        target_authority: str = "Senior Management",
        priority: str = "CRITICAL"
    ) -> ComplaintCase:
        prev_status = case.status
        prev_prio = case.priority

        case.status = "Escalated"
        case.priority = priority
        case.last_action = f"Escalated to {target_authority}: {remarks[:100]}"
        case.next_action = f"Senior Management review & inter-bureau intervention"
        case.last_action_date = datetime.now(timezone.utc)

        action = ActionHistory(
            case_id=case.id,
            actor_user_id=actor.id,
            bureau=case.current_bureau,
            action_type="ESCALATION",
            remarks=f"Target Authority: {target_authority}. {remarks}",
            from_bureau=case.current_bureau,
            to_bureau=case.current_bureau,
            previous_status=prev_status,
            new_status="Escalated"
        )
        db.add(action)

        # Alert for Senior Management
        alert = Alert(
            type="Escalation",
            severity="CRITICAL",
            case_id=case.id,
            institution_id=case.institution_id,
            title=f"URGENT Escalation: Case {case.case_id}",
            message=f"Case {case.case_id} has been escalated to {target_authority} by {actor.name}. Remarks: {remarks}",
            deduplication_key=f"ESCALATION_{case.id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
        )
        db.add(alert)

        audit = AuditEvent(
            actor_user_id=actor.id,
            entity_type="CASE",
            entity_id=str(case.id),
            operation="ESCALATE",
            before_state=json.dumps({"status": prev_status, "priority": prev_prio}),
            after_state=json.dumps({"status": "Escalated", "priority": priority, "remarks": remarks})
        )
        db.add(audit)

        db.commit()
        db.refresh(case)
        return case

    @staticmethod
    def dispose_case(
        db: Session,
        actor: User,
        case: ComplaintCase,
        closure_remarks: str,
        attachment_reference: Optional[str] = None
    ) -> ComplaintCase:
        if not closure_remarks or len(closure_remarks.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Disposal requires mandatory detailed closure remarks (at least 10 characters)."
            )

        prev_status = case.status
        case.status = "Disposed"
        case.closure_remarks = closure_remarks
        case.last_action = f"Disposed: {closure_remarks[:100]}"
        case.next_action = "Case Closed - Archived in Regulatory Records"
        case.last_action_date = datetime.now(timezone.utc)

        action = ActionHistory(
            case_id=case.id,
            actor_user_id=actor.id,
            bureau=case.current_bureau,
            action_type="DISPOSAL",
            remarks=closure_remarks,
            attachment_reference=attachment_reference,
            from_bureau=case.current_bureau,
            to_bureau=case.current_bureau,
            previous_status=prev_status,
            new_status="Disposed"
        )
        db.add(action)

        audit = AuditEvent(
            actor_user_id=actor.id,
            entity_type="CASE",
            entity_id=str(case.id),
            operation="DISPOSE",
            before_state=json.dumps({"status": prev_status}),
            after_state=json.dumps({"status": "Disposed", "closure_remarks": closure_remarks})
        )
        db.add(audit)

        db.commit()
        db.refresh(case)
        return case

    @staticmethod
    def reopen_case(
        db: Session,
        actor: User,
        case: ComplaintCase,
        reopen_reason: str
    ) -> ComplaintCase:
        # Reopening restricted to Senior Management or Admin
        if actor.role not in ["Senior Management", "Admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Case reopening is restricted to Senior Management and Admin authorities."
            )

        if case.status != "Disposed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only disposed cases can be reopened."
            )

        prev_status = case.status
        case.status = "Under Process"
        case.last_action = f"Case Reopened: {reopen_reason[:100]}"
        case.next_action = "Re-investigation and procedural reassessment"
        case.last_action_date = datetime.now(timezone.utc)

        action = ActionHistory(
            case_id=case.id,
            actor_user_id=actor.id,
            bureau=case.current_bureau,
            action_type="REOPEN",
            remarks=f"AUTHORIZED REOPENING: {reopen_reason}",
            from_bureau=case.current_bureau,
            to_bureau=case.current_bureau,
            previous_status=prev_status,
            new_status="Under Process"
        )
        db.add(action)

        audit = AuditEvent(
            actor_user_id=actor.id,
            entity_type="CASE",
            entity_id=str(case.id),
            operation="REOPEN",
            before_state=json.dumps({"status": prev_status, "closure_remarks": case.closure_remarks}),
            after_state=json.dumps({"status": "Under Process", "reopen_reason": reopen_reason})
        )
        db.add(audit)

        # Re-evaluate overlaps for active state
        ExplainableOverlapEngine.evaluate_case_overlaps(db, case)

        db.commit()
        db.refresh(case)
        return case

    @staticmethod
    def confirm_overlap(
        db: Session,
        actor: User,
        overlap_id: int,
        remarks: Optional[str] = None,
        create_coordination_record: bool = True,
        coordination_title: Optional[str] = None,
        target_review_date: Optional[date] = None
    ) -> OverlapAssessment:
        overlap = db.query(OverlapAssessment).filter(OverlapAssessment.id == overlap_id).first()
        if not overlap:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Overlap assessment not found.")

        prev_status = overlap.status
        overlap.status = "Confirmed"
        overlap.confirmed_by = actor.id

        # Update action history on both cases
        for c in [overlap.case_a, overlap.case_b]:
            action = ActionHistory(
                case_id=c.id,
                actor_user_id=actor.id,
                bureau=c.current_bureau,
                action_type="OVERLAP_DECISION",
                remarks=f"Cross-bureau relationship CONFIRMED with Case #{overlap.case_b.case_id if c.id == overlap.case_a_id else overlap.case_a.case_id} ({overlap.classification}). Remarks: {remarks or 'None'}",
                from_bureau=c.current_bureau,
                to_bureau=c.current_bureau,
                previous_status=c.status,
                new_status=c.status
            )
            db.add(action)

        # Optionally create coordination record
        if create_coordination_record:
            today = datetime.now(timezone.utc).date()
            review_date = target_review_date or (today + timedelta(days=14))
            title = coordination_title or f"Joint Coordination: {overlap.case_a.case_id} & {overlap.case_b.case_id}"
            
            coord = CoordinationRecord(
                title=title,
                description=f"Automated joint coordination initiated following confirmed {overlap.classification}. {remarks or ''}".strip(),
                coordination_status="Open",
                responsible_officer_id=actor.id,
                target_review_date=review_date,
                resolution_summary=None
            )
            db.add(coord)
            db.flush()

            # Link both cases
            db.add(CoordinationCase(coordination_id=coord.id, case_id=overlap.case_a_id, bureau=overlap.case_a.current_bureau))
            db.add(CoordinationCase(coordination_id=coord.id, case_id=overlap.case_b_id, bureau=overlap.case_b.current_bureau))

        audit = AuditEvent(
            actor_user_id=actor.id,
            entity_type="OVERLAP",
            entity_id=str(overlap.id),
            operation="CONFIRM_OVERLAP",
            before_state=json.dumps({"status": prev_status}),
            after_state=json.dumps({"status": "Confirmed", "remarks": remarks})
        )
        db.add(audit)

        db.commit()
        db.refresh(overlap)
        return overlap

    @staticmethod
    def dismiss_overlap(
        db: Session,
        actor: User,
        overlap_id: int,
        reason: str
    ) -> OverlapAssessment:
        if not reason or len(reason.strip()) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dismissal requires a mandatory rationale of at least 8 characters."
            )

        overlap = db.query(OverlapAssessment).filter(OverlapAssessment.id == overlap_id).first()
        if not overlap:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Overlap assessment not found.")

        prev_status = overlap.status
        overlap.status = "Dismissed"
        overlap.dismissed_reason = reason
        overlap.dismissed_by = actor.id

        audit = AuditEvent(
            actor_user_id=actor.id,
            entity_type="OVERLAP",
            entity_id=str(overlap.id),
            operation="DISMISS_OVERLAP",
            before_state=json.dumps({"status": prev_status}),
            after_state=json.dumps({"status": "Dismissed", "reason": reason})
        )
        db.add(audit)

        db.commit()
        db.refresh(overlap)
        return overlap
