from datetime import date, timedelta
from app.models.case import ComplaintCase
from app.models.alert import Alert
from app.services.sla_service import SLAService

def test_sla_breached_alert_generation(db_session, test_users):
    # Create an overdue active case
    overdue_case = ComplaintCase(
        case_id="AICTE-RB-TEST-OVERDUE-1",
        institution_id=None,
        raw_institution_name="Test Engineering Academy",
        category="Capitation Fees",
        description="Overdue complaint description.",
        status="Under Process",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() - timedelta(days=5),  # Breached 5 days ago!
        sla_days=30
    )
    db_session.add(overdue_case)
    db_session.commit()

    # Run check
    SLAService.run_sla_and_alert_checks(db_session)

    # Check alert was generated
    alert = db_session.query(Alert).filter(Alert.case_id == overdue_case.id, Alert.type == "SLA Breached").first()
    assert alert is not None
    assert alert.severity == "CRITICAL"
    assert "SLA BREACHED" in alert.title

def test_idempotency_prevents_duplicate_alerts(db_session):
    approaching_case = ComplaintCase(
        case_id="AICTE-PGRC-TEST-IDEM-2",
        institution_id=None,
        raw_institution_name="Test Polytechnic Institute",
        category="Faculty Deficiencies",
        description="Approaching SLA complaint description.",
        status="Under Process",
        current_bureau="Public Grievance Redressal Cell (PGRC)",
        sla_due_date=date.today() + timedelta(days=3),  # 3 days left
        sla_days=30
    )
    db_session.add(approaching_case)
    db_session.commit()

    # Run check 1st time
    SLAService.run_sla_and_alert_checks(db_session)
    count_1 = db_session.query(Alert).filter(Alert.case_id == approaching_case.id).count()
    assert count_1 == 1

    # Run check 2nd and 3rd time (scheduler interval simulations)
    SLAService.run_sla_and_alert_checks(db_session)
    SLAService.run_sla_and_alert_checks(db_session)

    count_after = db_session.query(Alert).filter(Alert.case_id == approaching_case.id).count()
    # Must still be exactly 1 due to deduplication key!
    assert count_after == 1
