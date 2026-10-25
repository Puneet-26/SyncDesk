from datetime import date, timedelta
from app.models.institution import Institution
from app.models.case import ComplaintCase

def test_auth_login_and_me(client, test_users):
    # Valid login
    res = client.post("/api/v1/auth/login", json={
        "email": "rb@test.gov.in",
        "password": "TestPassword123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "RB Officer"

    # Current user profile
    token = data["access_token"]
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "rb@test.gov.in"

def test_unauthenticated_request_rejected(client):
    res = client.get("/api/v1/dashboard/kpi-summary")
    assert res.status_code == 401

def test_dashboard_kpis(client, db_session, test_users):
    inst = Institution(
        aicte_permanent_id="1-44332211",
        official_name="Thiagarajar College of Engineering",
        normalized_name="thiagarajar college of engineering",
        city="Madurai",
        state="Tamil Nadu",
        region="Southern"
    )
    db_session.add(inst)
    db_session.flush()

    case = ComplaintCase(
        case_id="AICTE-RB-2026-TEST1",
        institution_id=inst.id,
        raw_institution_name=inst.official_name,
        category="Faculty Deficiencies",
        description="Faculty test issue.",
        status="Pending",
        current_bureau="Regulation Bureau (RB)",
        sla_due_date=date.today() + timedelta(days=15),
        sla_days=30
    )
    db_session.add(case)
    db_session.commit()

    token = test_users["rb_token"]
    res = client.get("/api/v1/dashboard/kpi-summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_cases"] >= 1
    assert data["pending_cases"] >= 1

def test_report_export_csv_and_pdf(client, test_users):
    token = test_users["rb_token"]

    # CSV Export
    csv_res = client.get("/api/v1/reports/export/csv?report_type=status_distribution", headers={"Authorization": f"Bearer {token}"})
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Case Count" in csv_res.text

    # PDF Export
    pdf_res = client.get("/api/v1/reports/export/pdf?report_type=sla_compliance", headers={"Authorization": f"Bearer {token}"})
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert len(pdf_res.content) > 500  # valid PDF binary stream
