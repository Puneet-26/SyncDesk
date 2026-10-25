import pytest
from fastapi import HTTPException
from app.models.case import ComplaintCase
from app.models.institution import Institution
from app.services.workflow_service import WorkflowService

def test_case_lifecycle_workflow(db_session, test_users):
    rb_officer = test_users["rb_officer"]
    admin = test_users["admin"]

    # 1. Create Institution
    inst = Institution(
        aicte_permanent_id="1-33221100",
        official_name="Harcourt Butler Technical University",
        normalized_name="harcourt butler technical university",
        city="Kanpur",
        state="Uttar Pradesh",
        region="Northern"
    )
    db_session.add(inst)
    db_session.commit()

    # 2. Create Case via Workflow
    case = WorkflowService.create_case(
        db=db_session,
        actor=rb_officer,
        raw_institution_name="Harcourt Butler Technical University",
        category="Infrastructure Non-Compliance",
        description="Hostel water filtration plant and safety non-functional.",
        current_bureau="Regulation Bureau (RB)",
        priority="HIGH"
    )
    assert case.id is not None
    assert case.institution_id == inst.id
    assert case.status == "Pending"
    assert len(case.action_history) == 1
    assert case.action_history[0].action_type == "CREATION"

    # 3. Add Action Note
    action = WorkflowService.add_action_note(
        db=db_session,
        actor=rb_officer,
        case=case,
        remarks="Field inspector assigned to review water facilities.",
        action_type="ACTION_NOTE"
    )
    assert case.status == "Under Process"
    assert len(case.action_history) == 2

    # 4. Transfer Case
    transferred = WorkflowService.transfer_case(
        db=db_session,
        actor=rb_officer,
        case=case,
        target_bureau="Regional Office (RO)",
        remarks="Transferred for regional physical inspection."
    )
    assert transferred.current_bureau == "Regional Office (RO)"
    assert transferred.status == "Transferred"

    # 5. Escalate Case
    escalated = WorkflowService.escalate_case(
        db=db_session,
        actor=rb_officer,
        case=case,
        remarks="Urgent student health hazard requires immediate intervention."
    )
    assert escalated.status == "Escalated"
    assert escalated.priority == "CRITICAL"

    # 6. Dispose Case - Validation failure with too short remarks
    with pytest.raises(HTTPException) as excinfo:
        WorkflowService.dispose_case(
            db=db_session,
            actor=rb_officer,
            case=case,
            closure_remarks="Too short"
        )
    assert excinfo.value.status_code == 400

    # 7. Dispose Case - Success with full closure remarks
    disposed = WorkflowService.dispose_case(
        db=db_session,
        actor=rb_officer,
        case=case,
        closure_remarks="Sanitation and reverse osmosis plant fully repaired and certified by health authority."
    )
    assert disposed.status == "Disposed"

    # 8. Reopening by non-authorized officer must fail (e.g. RB Officer)
    with pytest.raises(HTTPException) as exc_reopen:
        WorkflowService.reopen_case(
            db=db_session,
            actor=rb_officer,
            case=case,
            reopen_reason="Re-investigation demanded by petitioner."
        )
    assert exc_reopen.value.status_code == 403

    # 9. Reopening by authorized Senior Management must succeed
    senior = test_users["senior_mgmt"]
    reopened = WorkflowService.reopen_case(
        db=db_session,
        actor=senior,
        case=case,
        reopen_reason="Fresh photographic evidence of recurrence received at AICTE Executive Council."
    )
    assert reopened.status == "Under Process"
