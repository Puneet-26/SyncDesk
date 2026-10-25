import pytest
from app.models.institution import Institution, InstitutionAlias
from app.services.institution_service import InstitutionResolutionService, normalize_institution_name

def test_normalization_rules():
    assert normalize_institution_name("V.E.S. Institute of Technology") == "ves institute of technology"
    assert normalize_institution_name("Govt. Coll. of Engg. & Tech.") == "government college of engineering technology" or "college of engineering" in normalize_institution_name("Govt. Coll. of Engg. & Tech.")
    assert normalize_institution_name("I.I.T. Bombay") == "iit bombay"
    assert normalize_institution_name("Inst. of Tech.") == "institute of technology"

def test_exact_aicte_permanent_id_match(db_session):
    inst = Institution(
        aicte_permanent_id="1-99887711",
        official_name="Vivekanand Education Society's Institute of Technology",
        normalized_name=normalize_institution_name("Vivekanand Education Society's Institute of Technology"),
        city="Mumbai",
        state="Maharashtra",
        region="Western"
    )
    db_session.add(inst)
    db_session.commit()

    resolved, status_res, score, candidates = InstitutionResolutionService.resolve_institution(
        db=db_session,
        raw_name="VESIT Chembur",
        aicte_permanent_id="1-99887711"
    )
    assert resolved is not None
    assert resolved.id == inst.id
    assert status_res == "VERIFIED"
    assert score == 1.0

def test_verified_alias_match(db_session):
    inst = Institution(
        aicte_permanent_id="1-88776622",
        official_name="College of Engineering Pune",
        normalized_name=normalize_institution_name("College of Engineering Pune"),
        city="Pune",
        state="Maharashtra",
        region="Western"
    )
    db_session.add(inst)
    db_session.flush()

    alias = InstitutionAlias(
        institution_id=inst.id,
        alias="COEP Tech",
        normalized_alias=normalize_institution_name("COEP Tech"),
        source="ACCREDITATION",
        verification_status="VERIFIED"
    )
    db_session.add(alias)
    db_session.commit()

    resolved, status_res, score, candidates = InstitutionResolutionService.resolve_institution(
        db=db_session,
        raw_name="COEP Tech"
    )
    assert resolved is not None
    assert resolved.id == inst.id
    assert status_res == "VERIFIED"
    assert score >= 0.95

def test_similar_names_different_ids_do_not_conflate(db_session):
    inst_delhi = Institution(
        aicte_permanent_id="1-11110001",
        official_name="Delhi Institute of Engineering and Technology, Delhi",
        normalized_name=normalize_institution_name("Delhi Institute of Engineering and Technology, Delhi"),
        city="New Delhi",
        state="Delhi",
        region="Northern"
    )
    inst_meerut = Institution(
        aicte_permanent_id="1-11110002",
        official_name="Delhi Institute of Engineering and Technology, Meerut",
        normalized_name=normalize_institution_name("Delhi Institute of Engineering and Technology, Meerut"),
        city="Meerut",
        state="Uttar Pradesh",
        region="Northern"
    )
    db_session.add_all([inst_delhi, inst_meerut])
    db_session.commit()

    # Query with Meerut ID
    res_m, status_m, score_m, _ = InstitutionResolutionService.resolve_institution(
        db=db_session,
        raw_name="Delhi Institute of Engineering and Technology",
        aicte_permanent_id="1-11110002"
    )
    assert res_m.id == inst_meerut.id
    assert res_m.id != inst_delhi.id

def test_unresolved_institution_handled_safely(db_session):
    resolved, status_res, score, candidates = InstitutionResolutionService.resolve_institution(
        db=db_session,
        raw_name="Nonexistent Random Fictitious Polytechnic College 9999"
    )
    assert resolved is None
    assert status_res == "UNRESOLVED"
