import random
import json
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.institution import Institution, InstitutionAlias
from app.models.case import ComplaintCase, ActionHistory
from app.models.overlap import OverlapAssessment
from app.models.coordination import CoordinationRecord, CoordinationCase
from app.models.alert import Alert
from app.models.audit import AuditEvent
from app.services.institution_service import normalize_institution_name
from app.services.overlap_engine import ExplainableOverlapEngine
from app.services.sla_service import SLAService

def seed_database(reset: bool = True):
    random.seed(42)
    db: Session = SessionLocal()

    try:
        if reset:
            print("[INFO] Resetting database tables...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        else:
            existing_user_count = db.query(User).count()
            existing_case_count = db.query(ComplaintCase).count()
            if existing_user_count > 0 and existing_case_count > 0:
                print(f"[INFO] Database already populated ({existing_user_count} users, {existing_case_count} cases). Skipping seed to preserve data.")
                return

        print("[INFO] Creating demo user accounts...")
        default_pwd_hash = get_password_hash("Password@123")
        users_data = [
            {"name": "System Administrator", "email": "admin@aicte.gov.in", "role": "Admin", "bureau": "Central", "region": "All"},
            {"name": "Dr. Rajesh Sharma", "email": "rb.officer@aicte.gov.in", "role": "RB Officer", "bureau": "Regulation Bureau (RB)", "region": "All"},
            {"name": "Smt. Sunita Verma", "email": "pgrc.officer@aicte.gov.in", "role": "PGRC Officer", "bureau": "Public Grievance Redressal Cell (PGRC)", "region": "All"},
            {"name": "Shri Arvind Kulkarni", "email": "regional.officer@aicte.gov.in", "role": "Regional Officer", "bureau": "Regional Office (RO)", "region": "Western"},
            {"name": "Prof. K. R. Ramanathan", "email": "senior.mgmt@aicte.gov.in", "role": "Senior Management", "bureau": "Central Executive", "region": "All"},
            {"name": "Dr. Ananya Sen", "email": "approval.officer@aicte.gov.in", "role": "RB Officer", "bureau": "Approval Bureau", "region": "Eastern"},
        ]

        created_users = []
        for u_info in users_data:
            user = User(
                name=u_info["name"],
                email=u_info["email"],
                password_hash=default_pwd_hash,
                role=u_info["role"],
                bureau=u_info["bureau"],
                region=u_info["region"],
                is_active=True
            )
            db.add(user)
            created_users.append(user)

        db.commit()
        for u in created_users:
            db.refresh(u)

        admin_user = created_users[0]
        rb_officer = created_users[1]
        pgrc_officer = created_users[2]
        ro_officer = created_users[3]
        senior_mgmt = created_users[4]

        print("[INFO] Seeding ~40 synthetic technical institutions across India...")
        institutions_master = [
            ("1-10023451", "Vivekanand Education Society's Institute of Technology", "Chembur", "Mumbai", "Maharashtra", "Western", "Engineering & Technology", ["VESIT", "V.E.S. Institute of Technology", "VES Inst of Tech"]),
            ("1-10023452", "College of Engineering Pune Technological University", "Shivajinagar", "Pune", "Maharashtra", "Western", "Engineering & Technology", ["COEP", "COEP Tech", "COEP Pune"]),
            ("1-10023453", "Sardar Patel Institute of Technology", "Andheri West", "Mumbai", "Maharashtra", "Western", "Engineering & Technology", ["SPIT", "S.P.I.T. Mumbai"]),
            ("1-10023454", "Veermata Jijabai Technological Institute", "Matunga", "Mumbai", "Maharashtra", "Western", "Engineering & Technology", ["VJTI", "V.J.T.I."]),
            ("1-10023455", "Delhi Technological University", "Bawana Road", "New Delhi", "Delhi", "Northern", "Engineering & Technology", ["DTU", "Delhi Tech Univ"]),
            ("1-10023456", "Indira Gandhi Delhi Technical University for Women", "Kashmere Gate", "New Delhi", "Delhi", "Northern", "Engineering & Technology", ["IGDTUW"]),
            ("1-10023457", "Netaji Subhas University of Technology", "Dwarka", "New Delhi", "Delhi", "Northern", "Engineering & Technology", ["NSUT"]),
            ("1-10023458", "Harcourt Butler Technical University", "Nawabganj", "Kanpur", "Uttar Pradesh", "Northern", "Engineering & Technology", ["HBTU"]),
            ("1-10023459", "Madan Mohan Malaviya University of Technology", "Gorakhpur", "Gorakhpur", "Uttar Pradesh", "Northern", "Engineering & Technology", ["MMMUT"]),
            ("1-10023460", "Jadavpur University Faculty of Engineering", "Jadavpur", "Kolkata", "West Bengal", "Eastern", "Engineering & Technology", ["JU Engineering"]),
            ("1-10023461", "Heritage Institute of Technology", "Anandapur", "Kolkata", "West Bengal", "Eastern", "Engineering & Technology", ["HIT Kolkata"]),
            ("1-10023462", "Kalyani Government Engineering College", "Kalyani", "Kalyani", "West Bengal", "Eastern", "Engineering & Technology", ["KGEC"]),
            ("1-10023463", "Institute of Chemical Technology", "Matunga", "Mumbai", "Maharashtra", "Western", "Engineering & Technology", ["ICT Mumbai"]),
            ("1-10023464", "Government College of Technology", "Thadagam Road", "Coimbatore", "Tamil Nadu", "Southern", "Engineering & Technology", ["GCT Coimbatore"]),
            ("1-10023465", "PSG College of Technology", "Peelamedu", "Coimbatore", "Tamil Nadu", "Southern", "Engineering & Technology", ["PSG Tech"]),
            ("1-10023466", "Thiagarajar College of Engineering", "Thiruparankundram", "Madurai", "Tamil Nadu", "Southern", "Engineering & Technology", ["TCE Madurai"]),
            ("1-10023467", "BMS College of Engineering", "Basavanagudi", "Bengaluru", "Karnataka", "South-Western", "Engineering & Technology", ["BMSCE"]),
            ("1-10023468", "MS Ramaiah Institute of Technology", "MSR Nagar", "Bengaluru", "Karnataka", "South-Western", "Engineering & Technology", ["MSRIT", "Ramaiah Institute of Technology"]),
            ("1-10023469", "RV College of Engineering", "Mysuru Road", "Bengaluru", "Karnataka", "South-Western", "Engineering & Technology", ["RVCE"]),
            ("1-10023470", "National Institute of Engineering", "Manandavadi Road", "Mysuru", "Karnataka", "South-Western", "Engineering & Technology", ["NIE Mysuru"]),
            ("1-10023471", "College of Engineering Guindy", "Sardar Patel Road", "Chennai", "Tamil Nadu", "Southern", "Engineering & Technology", ["CEG Anna Univ"]),
            ("1-10023472", "Chaitanya Bharathi Institute of Technology", "Gandipet", "Hyderabad", "Telangana", "South-Central", "Engineering & Technology", ["CBIT Hyderabad"]),
            ("1-10023473", "Vasavi College of Engineering", "Ibrahimbagh", "Hyderabad", "Telangana", "South-Central", "Engineering & Technology", ["VCE Hyderabad"]),
            ("1-10023474", "VNR Vignana Jyothi Institute of Engineering and Technology", "Bachupally", "Hyderabad", "Telangana", "South-Central", "Engineering & Technology", ["VNR VJIET"]),
            ("1-10023475", "L.D. College of Engineering", "Navrangpura", "Ahmedabad", "Gujarat", "Central", "Engineering & Technology", ["LDCE Ahmedabad"]),
            ("1-10023476", "Vishwakarma Government Engineering College", "Chandkheda", "Ahmedabad", "Gujarat", "Central", "Engineering & Technology", ["VGEC"]),
            ("1-10023477", "Shri Govindram Seksaria Institute of Technology and Science", "Park Road", "Indore", "Madhya Pradesh", "Central", "Engineering & Technology", ["SGSITS Indore"]),
            ("1-10023478", "Madhav Institute of Technology and Science", "Race Course Road", "Gwalior", "Madhya Pradesh", "Central", "Engineering & Technology", ["MITS Gwalior"]),
            ("1-10023479", "Malaviya National Institute of Technology", "Jawahar Lal Nehru Marg", "Jaipur", "Rajasthan", "North-Western", "Engineering & Technology", ["MNIT Jaipur"]),
            ("1-10023480", "Government Engineering College Ajmer", "Badliya Chouraha", "Ajmer", "Rajasthan", "North-Western", "Engineering & Technology", ["GEC Ajmer"]),
            ("1-10023481", "Guru Nanak Dev Engineering College", "Gill Park", "Ludhiana", "Punjab", "North-Western", "Engineering & Technology", ["GNDEC Ludhiana"]),
            ("1-10023482", "Thapar Institute of Engineering and Technology", "Bhadson Road", "Patiala", "Punjab", "North-Western", "Engineering & Technology", ["TIET Patiala", "Thapar"]),
            ("1-10023483", "Birla Institute of Technology Mesra", "Mesra", "Ranchi", "Jharkhand", "Eastern", "Engineering & Technology", ["BIT Mesra"]),
            ("1-10023484", "National Institute of Science and Technology", "Palur Hills", "Berhampur", "Odisha", "Eastern", "Engineering & Technology", ["NIST Berhampur"]),
            ("1-10023485", "Silicon Institute of Technology", "Bhubaneswar", "Bhubaneswar", "Odisha", "Eastern", "Engineering & Technology", ["Silicon Tech"]),
            ("1-10023486", "Assam Engineering College", "Jalukbari", "Guwahati", "Assam", "Eastern", "Engineering & Technology", ["AEC Guwahati"]),
            ("1-10023487", "Jorhat Engineering College", "Garmur", "Jorhat", "Assam", "Eastern", "Engineering & Technology", ["JEC Jorhat"]),
            ("1-10023488", "Government Engineering College Barton Hill", "Barton Hill", "Thiruvananthapuram", "Kerala", "South-Western", "Engineering & Technology", ["GEC Barton Hill"]),
            ("1-10023489", "Delhi Institute of Engineering and Technology - Delhi Campus", "Narela", "New Delhi", "Delhi", "Northern", "Engineering & Technology", ["DIET Delhi"]),
            ("1-10023490", "Delhi Institute of Engineering and Technology - Meerut Campus", "Partapur", "Meerut", "Uttar Pradesh", "Northern", "Engineering & Technology", ["DIET Meerut"]),
        ]

        created_institutions = []
        for aicte_id, name, addr, city, state, region, inst_type, aliases in institutions_master:
            inst = Institution(
                aicte_permanent_id=aicte_id,
                official_name=name,
                normalized_name=normalize_institution_name(name),
                address=addr,
                city=city,
                state=state,
                region=region,
                institution_type=inst_type,
                identity_verification_status="VERIFIED"
            )
            db.add(inst)
            db.flush()
            created_institutions.append(inst)

            for alias_str in aliases:
                al = InstitutionAlias(
                    institution_id=inst.id,
                    alias=alias_str,
                    normalized_alias=normalize_institution_name(alias_str),
                    source="OFFICIAL_ACCREDITATION",
                    verification_status="VERIFIED",
                    verified_by=admin_user.id
                )
                db.add(al)

        db.commit()
        for inst in created_institutions:
            db.refresh(inst)

        print(f"[INFO] Created {len(created_institutions)} verified institutions and their aliases.")

        # Bureaus and Categories
        bureaus = [
            "Regulation Bureau (RB)",
            "Public Grievance Redressal Cell (PGRC)",
            "Regional Office (RO)",
            "Approval Bureau"
        ]

        categories = [
            "Faculty Deficiencies",
            "Capitation Fees",
            "Infrastructure Non-Compliance",
            "Harassment",
            "Unauthorized Courses",
            "Excess Tuition Fees",
            "Laboratory Equipment Deficiencies",
            "Examination Irregularities",
            "Ragging Allegation",
            "Non-Refund of Security Deposit"
        ]

        today = datetime.now(timezone.utc).date()
        case_records = []
        planted_scenario_pairs = []

        print("[INFO] Planting 15 deliberate, explainable cross-bureau overlap scenarios...")

        # ----------------------------------------------------
        # SCENARIO 1: Central SIH Scenario (VESIT)
        # PGRC case under process + RB case where action has been initiated
        # Different complaint wording, no shared case reference, same institution
        # ----------------------------------------------------
        vesit = created_institutions[0]
        c1_pgrc = ComplaintCase(
            case_id="AICTE-PGRC-2026-00010",
            institution_id=vesit.id,
            raw_institution_name="VESIT Chembur",
            category="Faculty Deficiencies",
            description="Petition filed by second-year Computer Engineering students alleging acute shortage of qualified full-time professors in Artificial Intelligence courses and non-adherence to teacher-student ratios prescribed by AICTE.",
            priority="HIGH",
            date_received=today - timedelta(days=28),
            status="Under Process",
            current_bureau="Public Grievance Redressal Cell (PGRC)",
            assigned_officer_id=pgrc_officer.id,
            last_action="Inquiry notice issued to Principal regarding faculty cadre ratio.",
            next_action="Review institutional response submitted by Management.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=5),
            sla_due_date=today + timedelta(days=2),  # Approaching SLA
            sla_days=30
        )
        c1_rb = ComplaintCase(
            case_id="AICTE-RB-2026-00011",
            institution_id=vesit.id,
            raw_institution_name="Vivekanand Education Society's Institute of Technology",
            category="Faculty Deficiencies",
            description="Inspection report received highlighting gross non-compliance with AICTE Norms 2026 regarding professor and associate professor recruitment, cadre proportion, and ad-hoc adjunct appointments without approval.",
            priority="HIGH",
            date_received=today - timedelta(days=18),
            status="Under Process",
            current_bureau="Regulation Bureau (RB)",
            assigned_officer_id=rb_officer.id,
            last_action="Regulatory compliance notice issued under Section 10(k) of AICTE Act.",
            next_action="Committee hearing scheduled for compliance validation.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=2),
            sla_due_date=today + timedelta(days=12),
            sla_days=30
        )
        db.add(c1_pgrc)
        db.add(c1_rb)
        case_records.extend([c1_pgrc, c1_rb])
        planted_scenario_pairs.append((c1_pgrc, c1_rb, "Potential Issue Overlap"))

        # ----------------------------------------------------
        # SCENARIO 2: Potential Duplicate (Identical wording across PGRC & RO)
        # COEP Tech
        # ----------------------------------------------------
        coep = created_institutions[1]
        c2_ro = ComplaintCase(
            case_id="AICTE-RO-2026-00020",
            institution_id=coep.id,
            raw_institution_name="COEP Pune",
            category="Capitation Fees",
            description="Mandatory development fee of Rs. 45,000 being forcibly collected from M.Tech sponsored candidates without receipts under threat of withholding semester hall tickets.",
            priority="CRITICAL",
            date_received=today - timedelta(days=35),
            status="Under Process",
            current_bureau="Regional Office (RO)",
            assigned_officer_id=ro_officer.id,
            last_action="Fact-finding regional committee constituted.",
            next_action="Regional visit and collection of student bank transaction proof.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=4),
            sla_due_date=today - timedelta(days=5),  # Overdue!
            sla_days=30
        )
        c2_pgrc = ComplaintCase(
            case_id="AICTE-PGRC-2026-00021",
            institution_id=coep.id,
            raw_institution_name="College of Engineering Pune",
            category="Capitation Fees",
            description="Forcible collection of development fee of Rs. 45,000 from M.Tech candidates without official receipt under threat of withholding examination hall tickets.",
            priority="CRITICAL",
            date_received=today - timedelta(days=32),
            status="Under Process",
            current_bureau="Public Grievance Redressal Cell (PGRC)",
            assigned_officer_id=pgrc_officer.id,
            last_action="Explanation called from Finance Officer.",
            next_action="Await response from institutional audit desk.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=3),
            sla_due_date=today - timedelta(days=2),  # Overdue!
            sla_days=30
        )
        db.add(c2_ro)
        db.add(c2_pgrc)
        case_records.extend([c2_ro, c2_pgrc])
        planted_scenario_pairs.append((c2_ro, c2_pgrc, "Potential Duplicate"))

        # ----------------------------------------------------
        # SCENARIO 3: Same Institution, Distinct Issues (Institution Overlap)
        # SPIT Mumbai
        # ----------------------------------------------------
        spit = created_institutions[2]
        c3_rb = ComplaintCase(
            case_id="AICTE-RB-2026-00030",
            institution_id=spit.id,
            raw_institution_name="SPIT Andheri",
            category="Infrastructure Non-Compliance",
            description="Fire safety certification expired in August 2025; lack of adequate emergency evacuation ramps in new academic block housing high-voltage laboratories.",
            priority="HIGH",
            date_received=today - timedelta(days=14),
            status="Under Process",
            current_bureau="Regulation Bureau (RB)",
            assigned_officer_id=rb_officer.id,
            last_action="Structural safety documentation demanded.",
            next_action="Site inspection with Municipal fire officers.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=2),
            sla_due_date=today + timedelta(days=16),
            sla_days=30
        )
        c3_pgrc = ComplaintCase(
            case_id="AICTE-PGRC-2026-00031",
            institution_id=spit.id,
            raw_institution_name="Sardar Patel Institute of Technology",
            category="Non-Refund of Security Deposit",
            description="Grievance filed by parents of withdrawn candidate regarding non-refund of institutional caution money of Rs. 25,000 six months after official admission cancellation.",
            priority="LOW",
            date_received=today - timedelta(days=10),
            status="Pending",
            current_bureau="Public Grievance Redressal Cell (PGRC)",
            assigned_officer_id=pgrc_officer.id,
            last_action="Complaint registered and automated acknowledgment sent.",
            next_action="Forward to Registrar for financial clearance verification.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=10),
            sla_due_date=today + timedelta(days=35),
            sla_days=45
        )
        db.add(c3_rb)
        db.add(c3_pgrc)
        case_records.extend([c3_rb, c3_pgrc])
        planted_scenario_pairs.append((c3_rb, c3_pgrc, "Institution Overlap"))

        # ----------------------------------------------------
        # SCENARIO 4: Abbreviation / Verified Alias Matching
        # VJTI Matunga
        # ----------------------------------------------------
        vjti = created_institutions[3]
        c4_ro = ComplaintCase(
            case_id="AICTE-RO-2026-00040",
            institution_id=vjti.id,
            raw_institution_name="V.J.T.I. Matunga",
            category="Laboratory Equipment Deficiencies",
            description="Robotics and Mechatronics research laboratories operate with non-functional PLC simulation kits and uncalibrated oscilloscopes affecting post-graduate thesis experimentation.",
            priority="MEDIUM",
            date_received=today - timedelta(days=22),
            status="Under Process",
            current_bureau="Regional Office (RO)",
            assigned_officer_id=ro_officer.id,
            last_action="Physical verification team appointed.",
            next_action="Evaluate equipment purchase vouchers from 2024-25 grants.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=7),
            sla_due_date=today + timedelta(days=8),
            sla_days=30
        )
        c4_rb = ComplaintCase(
            case_id="AICTE-RB-2026-00041",
            institution_id=vjti.id,
            raw_institution_name="Veermata Jijabai Technological Institute",
            category="Laboratory Equipment Deficiencies",
            description="Audit observation on substandard machinery in mechanical workshop and obsolete equipment in computing lab violating AICTE Approval Process Handbook standards.",
            priority="MEDIUM",
            date_received=today - timedelta(days=19),
            status="Under Process",
            current_bureau="Regulation Bureau (RB)",
            assigned_officer_id=rb_officer.id,
            last_action="Scrutiny of AICTE equipment compliance declaration.",
            next_action="Joint review with Western Regional Officer.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=4),
            sla_due_date=today + timedelta(days=11),
            sla_days=30
        )
        db.add(c4_ro)
        db.add(c4_rb)
        case_records.extend([c4_ro, c4_rb])
        planted_scenario_pairs.append((c4_ro, c4_rb, "Potential Issue Overlap"))

        # ----------------------------------------------------
        # SCENARIO 5: Similar Names That MUST NOT Be Merged
        # Delhi Institute of Engg - Delhi vs Meerut Campus
        # ----------------------------------------------------
        diet_delhi = created_institutions[38]
        diet_meerut = created_institutions[39]
        c5_delhi = ComplaintCase(
            case_id="AICTE-RB-2026-00050",
            institution_id=diet_delhi.id,
            raw_institution_name="Delhi Institute of Engineering and Technology, Narela",
            category="Unauthorized Courses",
            description="Offering unapproved autonomous PG Diploma in Data Analytics without AICTE Council approval or University affiliation.",
            priority="CRITICAL",
            date_received=today - timedelta(days=40),
            status="Under Process",
            current_bureau="Regulation Bureau (RB)",
            assigned_officer_id=rb_officer.id,
            last_action="Show-cause notice served to Management.",
            next_action="Consider withdrawal of approval under Section 10.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=8),
            sla_due_date=today - timedelta(days=10),  # Overdue!
            sla_days=30
        )
        c5_meerut = ComplaintCase(
            case_id="AICTE-RO-2026-00051",
            institution_id=diet_meerut.id,
            raw_institution_name="Delhi Institute of Engineering and Technology, Meerut",
            category="Unauthorized Courses",
            description="Offering unapproved certificate program in Cloud Architecture without AICTE approval.",
            priority="HIGH",
            date_received=today - timedelta(days=15),
            status="Pending",
            current_bureau="Regional Office (RO)",
            assigned_officer_id=ro_officer.id,
            last_action="Complaint received from Regional Directorate.",
            next_action="Verify institutional affiliation with AKTU.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=15),
            sla_due_date=today + timedelta(days=15),
            sla_days=30
        )
        db.add(c5_delhi)
        db.add(c5_meerut)
        case_records.extend([c5_delhi, c5_meerut])
        # These are DIFFERENT institutions, must NOT be merged as duplicate/overlap!

        # ----------------------------------------------------
        # SCENARIO 6: Unresolved Institution Identity
        # Raw name with ambiguous match
        # ----------------------------------------------------
        c6_unres = ComplaintCase(
            case_id="AICTE-PGRC-2026-00060",
            institution_id=None,  # Unresolved!
            raw_institution_name="National Tech Engineering Academy",
            category="Excess Tuition Fees",
            description="Anonymous student petition alleging illegal Rs 1.2 Lakh hostel caution fees without providing receipt or mess amenities.",
            priority="HIGH",
            date_received=today - timedelta(days=12),
            status="Pending",
            current_bureau="Public Grievance Redressal Cell (PGRC)",
            assigned_officer_id=pgrc_officer.id,
            last_action="Awaiting institutional identification.",
            next_action="Administrative resolution of institution identity against AICTE Master database.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=12),
            sla_due_date=today + timedelta(days=18),
            sla_days=30
        )
        db.add(c6_unres)
        case_records.append(c6_unres)

        # ----------------------------------------------------
        # SCENARIO 7: External Cross-Reference (CPGRAMS)
        # DTU Delhi
        # ----------------------------------------------------
        dtu = created_institutions[4]
        c7_rb = ComplaintCase(
            case_id="AICTE-RB-2026-00070",
            institution_id=dtu.id,
            raw_institution_name="Delhi Technological University",
            external_reference="CPGRAMS/DARPG/2026/89412",
            category="Faculty Deficiencies",
            description="CPGRAMS escalation regarding ad-hoc contractual faculty in Mechanical department being denied maternity benefits and EPF contributions.",
            priority="HIGH",
            date_received=today - timedelta(days=20),
            status="Under Process",
            current_bureau="Regulation Bureau (RB)",
            assigned_officer_id=rb_officer.id,
            last_action="Action Taken Report (ATR) requested from Vice-Chancellor.",
            next_action="Submit interim response to Ministry of Education portal.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=6),
            sla_due_date=today + timedelta(days=10),
            sla_days=30
        )
        c7_pgrc = ComplaintCase(
            case_id="AICTE-PGRC-2026-00071",
            institution_id=dtu.id,
            raw_institution_name="DTU Delhi",
            external_reference="CPGRAMS/DARPG/2026/89412",
            category="Faculty Deficiencies",
            description="Contractual faculty complaint concerning non-extension of statutory benefits and arbitrary contract termination without notice.",
            priority="HIGH",
            date_received=today - timedelta(days=16),
            status="Under Process",
            current_bureau="Public Grievance Redressal Cell (PGRC)",
            assigned_officer_id=pgrc_officer.id,
            last_action="Consolidated grievance dossier submitted to Grievance Redressal Committee.",
            next_action="Coordinate with Regulation Bureau for common hearing.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=3),
            sla_due_date=today + timedelta(days=14),
            sla_days=30
        )
        db.add(c7_rb)
        db.add(c7_pgrc)
        case_records.extend([c7_rb, c7_pgrc])
        planted_scenario_pairs.append((c7_rb, c7_pgrc, "Potential Issue Overlap"))

        # ----------------------------------------------------
        # SCENARIO 8: Disposed Case vs Active Case
        # BMSCE Bengaluru
        # ----------------------------------------------------
        bmsce = created_institutions[16]
        c8_disp = ComplaintCase(
            case_id="AICTE-RB-2025-00080",
            institution_id=bmsce.id,
            raw_institution_name="BMS College of Engineering",
            category="Examination Irregularities",
            description="Allegation of delayed publication of third semester revaluation results affecting student placements.",
            priority="LOW",
            date_received=today - timedelta(days=120),
            status="Disposed",
            current_bureau="Regulation Bureau (RB)",
            assigned_officer_id=rb_officer.id,
            last_action="Disposed: Institutional Controller of Examinations verified that revaluation was concluded and grades revised.",
            next_action="Archived in regulatory records.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=60),
            expected_disposal_date=today - timedelta(days=60),
            sla_due_date=today - timedelta(days=75),
            sla_days=45,
            closure_remarks="The Controller of Examinations submitted authenticated revaluation logs demonstrating that re-evaluation was concluded within autonomous statutory limits. No further action needed."
        )
        c8_act = ComplaintCase(
            case_id="AICTE-PGRC-2026-00081",
            institution_id=bmsce.id,
            raw_institution_name="BMSCE Basavanagudi",
            category="Examination Irregularities",
            description="Fresh complaint from final year batch regarding repeated re-evaluation fee hikes and discrepancies in autonomous grading software.",
            priority="MEDIUM",
            date_received=today - timedelta(days=11),
            status="Under Process",
            current_bureau="Public Grievance Redressal Cell (PGRC)",
            assigned_officer_id=pgrc_officer.id,
            last_action="Registrar directed to furnish autonomous examination bylaws.",
            next_action="Review examination grievance committee minutes.",
            last_action_date=datetime.now(timezone.utc) - timedelta(days=3),
            sla_due_date=today + timedelta(days=19),
            sla_days=30
        )
        db.add(c8_disp)
        db.add(c8_act)
        case_records.extend([c8_disp, c8_act])

        # ----------------------------------------------------
        # SCENARIOS 9 - 15: Planted Scenarios across other regions
        # ----------------------------------------------------
        selected_inst_for_scenarios = [
            (created_institutions[5], "Harassment", "Hostel warden harassment of female postgraduate scholars.", "Public Grievance Redressal Cell (PGRC)", "Regulation Bureau (RB)", "Potential Issue Overlap"),
            (created_institutions[7], "Infrastructure Non-Compliance", "Hostel sanitary and drinking water filtration non-functional.", "Regional Office (RO)", "Regulation Bureau (RB)", "Potential Issue Overlap"),
            (created_institutions[9], "Faculty Deficiencies", "Over 40% guest lecturer quota in computer science department.", "Regulation Bureau (RB)", "Approval Bureau", "Potential Issue Overlap"),
            (created_institutions[11], "Ragging Allegation", "First year students harassed in university transit hostel.", "Public Grievance Redressal Cell (PGRC)", "Regional Office (RO)", "Potential Duplicate"),
            (created_institutions[14], "Capitation Fees", "Mandatory laptop fee of Rs 80,000 charged over and above approved fees.", "Regulation Bureau (RB)", "Public Grievance Redressal Cell (PGRC)", "Potential Duplicate"),
            (created_institutions[17], "Unauthorized Courses", "Off-campus executive diploma conducted without AICTE approval.", "Approval Bureau", "Regulation Bureau (RB)", "Potential Issue Overlap"),
            (created_institutions[21], "Excess Tuition Fees", "Transport fee levied even for students opting out of bus services.", "Regional Office (RO)", "Public Grievance Redressal Cell (PGRC)", "Potential Issue Overlap"),
        ]

        scen_counter = 90
        for inst_obj, cat, desc_text, bur_a, bur_b, expected_class in selected_inst_for_scenarios:
            c_a = ComplaintCase(
                case_id=f"AICTE-SCEN-2026-{scen_counter:05d}",
                institution_id=inst_obj.id,
                raw_institution_name=inst_obj.official_name,
                category=cat,
                description=desc_text,
                priority="HIGH",
                date_received=today - timedelta(days=random.randint(10, 40)),
                status="Under Process",
                current_bureau=bur_a,
                assigned_officer_id=rb_officer.id if "RB" in bur_a else pgrc_officer.id,
                last_action="Inquiry commenced by bureau desk.",
                next_action="Reconcile institutional explanation.",
                last_action_date=datetime.now(timezone.utc) - timedelta(days=3),
                sla_due_date=today + timedelta(days=random.randint(-10, 15)),
                sla_days=30
            )
            scen_counter += 1
            c_b = ComplaintCase(
                case_id=f"AICTE-SCEN-2026-{scen_counter:05d}",
                institution_id=inst_obj.id,
                raw_institution_name=inst_obj.official_name,
                category=cat,
                description=f"Regulatory report received: {desc_text} Verification initiated.",
                priority="HIGH",
                date_received=today - timedelta(days=random.randint(5, 30)),
                status="Under Process",
                current_bureau=bur_b,
                assigned_officer_id=pgrc_officer.id if "PGRC" in bur_b else ro_officer.id,
                last_action="Notice served to Head of Institution.",
                next_action="Coordinate cross-bureau review.",
                last_action_date=datetime.now(timezone.utc) - timedelta(days=2),
                sla_due_date=today + timedelta(days=random.randint(1, 25)),
                sla_days=30
            )
            scen_counter += 1
            db.add(c_a)
            db.add(c_b)
            case_records.extend([c_a, c_b])
            planted_scenario_pairs.append((c_a, c_b, expected_class))

        db.commit()

        # ----------------------------------------------------
        # Generate Remaining Synthetic Cases to reach ~300 cases
        # Spread across 6 months of historical activity
        # ----------------------------------------------------
        print("[INFO] Generating additional cases to reach ~300 total cases with realistic timelines...")
        existing_count = len(case_records)
        target_count = 280

        standard_descriptions = {
            "Faculty Deficiencies": [
                "Students report non-conduct of lectures in specialized elective courses due to sudden resignation of two assistant professors.",
                "Complaint regarding failure to implement 7th Central Pay Commission scales for ad-hoc faculty members.",
                "Grievance regarding irregular teacher-student ratios in mechanical engineering department during current academic year."
            ],
            "Capitation Fees": [
                "Parent representation regarding cash demand for management quota admission seat.",
                "Anonymous report alleging unreceipted development donation demanded at time of document verification.",
                "Allegation of excessive processing fees of Rs 15,000 for verification of sports quota certificates."
            ],
            "Infrastructure Non-Compliance": [
                "Hostel block sanitary facilities require urgent maintenance; unhygienic water storage tanks.",
                "Ramp access for differently-abled students missing in main administrative and examination complex.",
                "Auditorium and seminar halls do not comply with mandatory accessibility and fire suppression standards."
            ],
            "Harassment": [
                "Postgraduate researcher alleges intellectual property withholding and mental harassment by research supervisor.",
                "Grievance from non-teaching staff regarding arbitrary overtime allocation and workplace bias.",
                "Student representation alleging unfair internal assessment grading following constructive criticism of department management."
            ],
            "Unauthorized Courses": [
                "Institution advertising executive postgraduate diploma without approval from AICTE Approval Bureau.",
                "Collaborative dual-degree foreign university program conducted without requisite approval under AICTE Foreign Universities Regulations.",
                "Online certificate course launched in cyber security claiming official AICTE certification without council sanction."
            ],
            "Excess Tuition Fees": [
                "Students charged Rs 35,000 extra under heads of gymkhana, internet, and magazine fee despite lockdown/remote semester.",
                "Overcharging of examination fee exceeding state fee regulatory authority ceiling.",
                "Non-adherence to state-fixed fee structure for economically weaker section quota students."
            ],
            "Laboratory Equipment Deficiencies": [
                "Electrical machines laboratory has non-functioning alternator test rigs and open wiring.",
                "Chemistry and environmental engineering lab lacks functional fume hoods and acid storage safety lockers.",
                "Computer laboratory computers lack genuine operating system licenses and modern simulation toolkits."
            ],
            "Examination Irregularities": [
                "Delay of four months in revaluation result declaration causing loss of job offer opportunities.",
                "Question paper leak reported in third semester end-term mathematics examination.",
                "Evaluation errors and missing marks in external practical examination grade sheets."
            ],
            "Ragging Allegation": [
                "Senior students allegedly forcing freshers to perform menial tasks during evening study hours in college hostel.",
                "First-year engineering students subjected to late night physical tasks in boys hostel premises.",
                "Anonymous reporting on anti-ragging portal regarding psychological intimidation in campus canteen."
            ],
            "Non-Refund of Security Deposit": [
                "College management refuses to refund caution deposit of Rs 20,000 despite clearance form submission 8 months ago.",
                "Withdrawn student not provided full tuition fee refund as per AICTE refund guidelines 2025-26.",
                "Withholding of original degree certificates over disputed caution money deductions."
            ]
        }

        statuses_weights = ["Under Process"] * 12 + ["Pending"] * 6 + ["Disposed"] * 8 + ["Transferred"] * 3 + ["Escalated"] * 2

        for i in range(existing_count + 1, target_count + 1):
            inst = random.choice(created_institutions)
            cat = random.choice(categories)
            desc_template = random.choice(standard_descriptions[cat])
            bur = random.choice(bureaus)
            status_val = random.choice(statuses_weights)

            # Date received in past 180 days (6 months)
            days_ago = random.randint(1, 180)
            date_rec = today - timedelta(days=days_ago)

            sla_days_val = random.choice([15, 30, 45, 60])
            sla_due = date_rec + timedelta(days=sla_days_val)

            # Determine officer based on bureau
            if "RB" in bur:
                officer = rb_officer
            elif "PGRC" in bur:
                officer = pgrc_officer
            elif "RO" in bur:
                officer = ro_officer
            else:
                officer = admin_user

            closure_text = None
            if status_val == "Disposed":
                closure_text = f"Case investigated and resolved by {bur}. Institutional compliance report verified and found satisfactory on {date_rec + timedelta(days=random.randint(10, 30))}."

            case_obj = ComplaintCase(
                case_id=f"AICTE-{bur[:2].upper()}-2026-{i:05d}",
                institution_id=inst.id,
                raw_institution_name=inst.official_name,
                category=cat,
                description=desc_template,
                priority=random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
                date_received=date_rec,
                status=status_val,
                current_bureau=bur,
                assigned_officer_id=officer.id,
                last_action="Procedural review updated in regulatory journal.",
                next_action="Awaiting compliance submissions." if status_val != "Disposed" else "Archived",
                last_action_date=datetime.now(timezone.utc) - timedelta(days=random.randint(0, min(15, days_ago))),
                sla_due_date=sla_due,
                sla_days=sla_days_val,
                closure_remarks=closure_text
            )
            db.add(case_obj)
            case_records.append(case_obj)

        db.commit()
        print(f"[INFO] Total complaint cases in database: {len(case_records)}")

        # ----------------------------------------------------
        # Seed Action History for all cases
        # ----------------------------------------------------
        print("[INFO] Generating realistic chronological ActionHistory records for cases...")
        for case in case_records:
            # 1. Creation action
            db.add(ActionHistory(
                case_id=case.id,
                timestamp=datetime.combine(case.date_received, datetime.min.time(), tzinfo=timezone.utc),
                actor_user_id=case.assigned_officer_id,
                bureau=case.current_bureau,
                action_type="CREATION",
                remarks=f"Complaint lodged in {case.current_bureau} portal. Initial verification initiated.",
                from_bureau=None,
                to_bureau=case.current_bureau,
                previous_status=None,
                new_status="Pending"
            ))

            # 2. Subsequent actions
            if case.status in ["Under Process", "Escalated", "Transferred", "Disposed"]:
                mid_date = case.date_received + timedelta(days=2)
                db.add(ActionHistory(
                    case_id=case.id,
                    timestamp=datetime.combine(mid_date, datetime.min.time(), tzinfo=timezone.utc),
                    actor_user_id=case.assigned_officer_id,
                    bureau=case.current_bureau,
                    action_type="STATUS_CHANGE",
                    remarks="Institutional dossier retrieved and case moved to active examination.",
                    from_bureau=case.current_bureau,
                    to_bureau=case.current_bureau,
                    previous_status="Pending",
                    new_status="Under Process"
                ))

            if case.status == "Transferred":
                db.add(ActionHistory(
                    case_id=case.id,
                    timestamp=case.last_action_date,
                    actor_user_id=case.assigned_officer_id,
                    bureau=case.current_bureau,
                    action_type="TRANSFER",
                    remarks=f"Inter-bureau transfer executed to {case.current_bureau} for specialized regulatory purview.",
                    from_bureau="Public Grievance Redressal Cell (PGRC)",
                    to_bureau=case.current_bureau,
                    previous_status="Under Process",
                    new_status="Transferred"
                ))

            if case.status == "Escalated":
                db.add(ActionHistory(
                    case_id=case.id,
                    timestamp=case.last_action_date,
                    actor_user_id=senior_mgmt.id,
                    bureau=case.current_bureau,
                    action_type="ESCALATION",
                    remarks="Escalated to Senior Management due to acute non-compliance and statutory timeline concerns.",
                    from_bureau=case.current_bureau,
                    to_bureau=case.current_bureau,
                    previous_status="Under Process",
                    new_status="Escalated"
                ))

            if case.status == "Disposed":
                db.add(ActionHistory(
                    case_id=case.id,
                    timestamp=case.last_action_date,
                    actor_user_id=case.assigned_officer_id,
                    bureau=case.current_bureau,
                    action_type="DISPOSAL",
                    remarks=case.closure_remarks or "Disposal concluded.",
                    from_bureau=case.current_bureau,
                    to_bureau=case.current_bureau,
                    previous_status="Under Process",
                    new_status="Disposed"
                ))

        db.commit()

        # ----------------------------------------------------
        # Run Overlap Assessment Engine on Planted and Master Cases
        # ----------------------------------------------------
        print("[INFO] Running Overlap Assessment Engine across database...")
        assessed_count = ExplainableOverlapEngine.batch_reassess_all(db)
        print(f"[INFO] Evaluated {assessed_count} relationships.")

        # ----------------------------------------------------
        # Run SLA and Idempotent Alert Generator
        # ----------------------------------------------------
        print("[INFO] Running SLA and case monitoring alert generator...")
        SLAService.run_sla_and_alert_checks(db)
        alert_count = db.query(Alert).count()
        print(f"[INFO] Generated {alert_count} idempotent alerts.")

        # ----------------------------------------------------
        # Seed Coordination Records for demo
        # ----------------------------------------------------
        print("[INFO] Creating demo Coordination Records...")
        c1_overlap = db.query(OverlapAssessment).filter(
            OverlapAssessment.case_a_id == c1_pgrc.id,
            OverlapAssessment.case_b_id == c1_rb.id
        ).first()

        coord1 = CoordinationRecord(
            title="Joint AICTE-RB & PGRC Faculty Inquiry: VESIT Mumbai",
            description="Inter-bureau coordination established to conduct joint compliance hearing regarding faculty cadre proportion and AI elective appointments.",
            coordination_status="In Progress",
            responsible_officer_id=rb_officer.id,
            target_review_date=today + timedelta(days=10),
            resolution_summary=None
        )
        db.add(coord1)
        db.flush()
        db.add(CoordinationCase(coordination_id=coord1.id, case_id=c1_pgrc.id, bureau=c1_pgrc.current_bureau))
        db.add(CoordinationCase(coordination_id=coord1.id, case_id=c1_rb.id, bureau=c1_rb.current_bureau))

        # Confirm the overlap for this central scenario
        if c1_overlap:
            c1_overlap.status = "Confirmed"
            c1_overlap.confirmed_by = rb_officer.id

        db.commit()
        print("[SUCCESS] Synthetic seed data populated successfully!")
        print(f"[SUMMARY] Institutions: {len(created_institutions)}, Cases: {len(case_records)}, Alerts: {alert_count}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database(reset=True)
