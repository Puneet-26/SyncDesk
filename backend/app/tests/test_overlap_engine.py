import pytest
from datetime import date, timedelta
from app.models.institution import Institution
from app.models.case import ComplaintCase
from app.models.overlap import OverlapAssessment
from app.services.overlap_engine import ExplainableOverlapEngine, compute_text_similarity, compute_category_similarity

def test_category_similarity():
    # Exact category
    assert compute_category_similarity("Faculty Deficiencies", "Faculty Deficiencies") == 1.0
    # Related academic cluster
    assert compute_category_similarity("Faculty Deficiencies", "Unauthorized Courses") == 0.65
    # Unrelated
    assert compute_category_similarity("Faculty Deficiencies", "Ragging Allegation") == 0.15

def test_text_similarity_and_fallback():
    # Paraphrased sentences tested in fallback TF-IDF + RapidFuzz mode
    text1 = "Shortage of full-time professors in computer engineering department."
    text2 = "Severe deficit of qualified professors in computer science faculty."
    score, method = compute_text_similarity(text1, text2)
    assert score >= 0.35
    assert method in ["SEMANTIC_TRANSFORMER_BLENDED", "TFIDF_LEXICAL_FALLBACK", "RAPIDFUZZ_LEXICAL_ONLY"]

    # Near-identical texts must score >= 0.75
    text_dup1 = "Mandatory development fee of Rs 45,000 forcibly collected without receipts."
    text_dup2 = "Forcible collection of development fee of Rs 45,000 without official receipts."
    dup_score, _ = compute_text_similarity(text_dup1, text_dup2)
    assert dup_score >= 0.75

def test_cross_bureau_overlap_detection(db_session):
    inst = Institution(
        aicte_permanent_id="1-55443322",
        official_name="Veermata Jijabai Technological Institute",
        normalized_name="veermata jijabai technological institute",
        city="Mumbai",
        state="Maharashtra",
        region="Western"
    )
    db_session.add(inst)
    db_session.flush()

    case_pgrc = ComplaintCase(
        case_id="AICTE-PGRC-TEST-001",
        institution_id=inst.id,
        raw_institution_name=inst.official_name,
        category="Faculty Deficiencies",
        description="Students complain about shortage of professors in computer department.",
        priority="HIGH",
        date_received=date.today(),
        status="Under Process",
        current_bureau="Public Grievance Redressal Cell (PGRC)",
        sla_due_date=date.today() + timedelta(days=20),
        sla_days=30
    )
    case_rb = ComplaintCase(
        case_id="AICTE-RB-TEST-002",
        institution_id=inst.id,
        raw_institution_name=inst.official_name,
        category="Faculty Deficiencies",
        description="Regulatory audit reports non-compliance with faculty cadre ratio in computer engineering.",
        priority="HIGH",
        date_received=date.today(),
        status="Under Process",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() + timedelta(days=20),
        sla_days=30
    )
    db_session.add_all([case_pgrc, case_rb])
    db_session.commit()

    assessment_data = ExplainableOverlapEngine.assess_case_pair(case_pgrc, case_rb)
    assert assessment_data["institution_identity_score"] == 1.0
    assert assessment_data["classification"] in ["Potential Issue Overlap", "Potential Duplicate"]
    assert "COORDINATION REQUIRED" in assessment_data["reasons"]["headline"]

def test_dismissed_overlap_is_preserved(db_session, test_users):
    inst = Institution(
        aicte_permanent_id="1-77889900",
        official_name="PSG College of Technology",
        normalized_name="psg college of technology",
        city="Coimbatore",
        state="Tamil Nadu",
        region="Southern"
    )
    db_session.add(inst)
    db_session.flush()

    c1 = ComplaintCase(
        case_id="AICTE-PGRC-DISM-1",
        institution_id=inst.id,
        raw_institution_name=inst.official_name,
        category="Capitation Fees",
        description="Student complaint on fee demand.",
        status="Under Process",
        current_bureau="Public Grievance Redressal Cell (PGRC)",
        sla_due_date=date.today() + timedelta(days=20),
        sla_days=30
    )
    c2 = ComplaintCase(
        case_id="AICTE-RB-DISM-2",
        institution_id=inst.id,
        raw_institution_name=inst.official_name,
        category="Capitation Fees",
        description="Fee audit report.",
        status="Under Process",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() + timedelta(days=20),
        sla_days=30
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    # Create assessment and dismiss it
    assessment = OverlapAssessment(
        case_a_id=min(c1.id, c2.id),
        case_b_id=max(c1.id, c2.id),
        institution_identity_score=1.0,
        category_similarity_score=1.0,
        text_similarity_score=0.8,
        overall_score=0.85,
        classification="Potential Duplicate",
        reasons="{}",
        status="Dismissed",
        dismissed_reason="Verified separate petitions from different academic years.",
        dismissed_by=test_users["rb_officer"].id
    )
    db_session.add(assessment)
    db_session.commit()

    # Re-evaluating should NOT revert dismissed status to Suggested!
    created_or_updated = ExplainableOverlapEngine.evaluate_case_overlaps(db_session, c1)
    rechecked = db_session.query(OverlapAssessment).filter(OverlapAssessment.id == assessment.id).first()
    assert rechecked.status == "Dismissed"
    assert rechecked.dismissed_reason == "Verified separate petitions from different academic years."
