import pytest
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy import text

from app.db.session import engine
from app.models.case import ComplaintCase
from app.models.institution import Institution, InstitutionAlias
from app.models.user import User
from app.services.institution_service import InstitutionResolutionService, normalize_institution_name
from app.services.report_service import ReportService
from app.services.sla_service import SLAService
from app.api.v1.cases import verify_case_modify_permission
from app.core.security import get_password_hash

def test_sqlite_foreign_keys_enforced(db_session):
    with engine.connect() as conn:
        fk_status = conn.execute(text("PRAGMA foreign_keys;")).scalar()
        assert fk_status == 1

def test_conflicting_identity_with_verified_alias(db_session):
    # Inst A: VESIT (ID: 1-10023451)
    inst_a = Institution(
        aicte_permanent_id="1-10023451",
        official_name="Vivekanand Education Society's Institute of Technology",
        normalized_name=normalize_institution_name("Vivekanand Education Society's Institute of Technology"),
        city="Mumbai",
        state="Maharashtra",
        region="Western"
    )
    # Inst B: COEP (ID: 1-10023452, Alias: COEP)
    inst_b = Institution(
        aicte_permanent_id="1-10023452",
        official_name="College of Engineering Pune Technological University",
        normalized_name=normalize_institution_name("College of Engineering Pune Technological University"),
        city="Pune",
        state="Maharashtra",
        region="Western"
    )
    db_session.add(inst_a)
    db_session.add(inst_b)
    db_session.flush()

    alias_b = InstitutionAlias(
        institution_id=inst_b.id,
        alias="COEP",
        normalized_alias=normalize_institution_name("COEP"),
        verification_status="VERIFIED"
    )
    db_session.add(alias_b)
    db_session.flush()

    # Query with raw_name='COEP' and aicte_permanent_id='1-10023451' (VESIT's ID)
    inst, status, score, candidates = InstitutionResolutionService.resolve_institution(
        db=db_session,
        raw_name="COEP",
        aicte_permanent_id="1-10023451"
    )
    assert status == "CONFLICTING"
    assert inst is None
    assert len(candidates) > 0
    assert "CONFLICTING_ID" in candidates[0]["match_type"]

def test_report_service_region_filter(db_session):
    inst_w = Institution(
        aicte_permanent_id="1-REG-WEST-01",
        official_name="Western Institute of Tech",
        normalized_name=normalize_institution_name("Western Institute of Tech"),
        city="Mumbai",
        state="Maharashtra",
        region="Western"
    )
    inst_n = Institution(
        aicte_permanent_id="1-REG-NORTH-01",
        official_name="Northern Institute of Tech",
        normalized_name=normalize_institution_name("Northern Institute of Tech"),
        city="Delhi",
        state="Delhi",
        region="Northern"
    )
    db_session.add(inst_w)
    db_session.add(inst_n)
    db_session.flush()

    case_w = ComplaintCase(
        case_id="AICTE-RB-2026-WEST01",
        institution_id=inst_w.id,
        raw_institution_name=inst_w.official_name,
        category="Faculty Deficiencies",
        description="Western region case description",
        priority="HIGH",
        status="Under Process",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() + timedelta(days=20),
        sla_days=30
    )
    case_n = ComplaintCase(
        case_id="AICTE-RB-2026-NORTH01",
        institution_id=inst_n.id,
        raw_institution_name=inst_n.official_name,
        category="Faculty Deficiencies",
        description="Northern region case description",
        priority="HIGH",
        status="Under Process",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() + timedelta(days=20),
        sla_days=30
    )
    db_session.add(case_w)
    db_session.add(case_n)
    db_session.flush()

    # Query report filtered by region="Western"
    report_western = ReportService.generate_report_data(
        db=db_session,
        report_type="detailed_cases",
        region="Western"
    )
    case_ids = [item["Case ID"] for item in report_western["data"]]
    assert "AICTE-RB-2026-WEST01" in case_ids
    assert "AICTE-RB-2026-NORTH01" not in case_ids

def test_unauthorized_cross_bureau_case_modification_rejected(db_session):
    pgrc_officer = User(
        name="Smt. PGRC Officer",
        email="pgrc.test@aicte.gov.in",
        password_hash=get_password_hash("Password@123"),
        role="PGRC Officer",
        bureau="Public Grievance Redressal Cell (PGRC)",
        region="All"
    )
    db_session.add(pgrc_officer)
    db_session.flush()

    rb_case = ComplaintCase(
        case_id="AICTE-RB-2026-RBTEST01",
        raw_institution_name="Test Inst",
        category="Capitation Fees",
        description="Testing RB case",
        priority="MEDIUM",
        status="Under Process",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() + timedelta(days=15),
        sla_days=30
    )
    db_session.add(rb_case)
    db_session.flush()

    with pytest.raises(HTTPException) as excinfo:
        verify_case_modify_permission(pgrc_officer, rb_case)
    assert excinfo.value.status_code == 403
    assert "Cross-bureau modification not permitted" in excinfo.value.detail

def test_regional_officer_jurisdiction_enforced(db_session):
    ro_officer = User(
        name="Shri Regional Officer",
        email="ro.west.test@aicte.gov.in",
        password_hash=get_password_hash("Password@123"),
        role="Regional Officer",
        bureau="Regional Office (RO)",
        region="Western"
    )
    db_session.add(ro_officer)

    inst_north = Institution(
        aicte_permanent_id="1-RO-TEST-N01",
        official_name="Northern College",
        normalized_name=normalize_institution_name("Northern College"),
        city="Jaipur",
        state="Rajasthan",
        region="Northern"
    )
    db_session.add(inst_north)
    db_session.flush()

    north_case = ComplaintCase(
        case_id="AICTE-RO-2026-NORTH02",
        institution_id=inst_north.id,
        raw_institution_name=inst_north.official_name,
        category="Harassment",
        description="Northern case under RO",
        priority="HIGH",
        status="Under Process",
        current_bureau="Regional Office (RO)",
        sla_due_date=date.today() + timedelta(days=10),
        sla_days=30
    )
    db_session.add(north_case)
    db_session.flush()

    with pytest.raises(HTTPException) as excinfo:
        verify_case_modify_permission(ro_officer, north_case)
    assert excinfo.value.status_code == 403
    assert "Regional jurisdiction error" in excinfo.value.detail

def test_sla_service_handles_null_due_date_safely(db_session):
    # Test that SLAService checks for null due date without raising TypeError
    case_active = ComplaintCase(
        case_id="AICTE-TEST-SLA-01",
        raw_institution_name="Test College",
        category="Harassment",
        description="Testing SLA null safety",
        status="Under Process",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() + timedelta(days=5),
        sla_days=30
    )
    db_session.add(case_active)
    db_session.flush()

    # In Python memory, set sla_due_date to None to test null safety branch
    case_active.sla_due_date = None

    # Run check - should skip gracefully without unhandled exception
    SLAService.run_sla_and_alert_checks(db_session)
