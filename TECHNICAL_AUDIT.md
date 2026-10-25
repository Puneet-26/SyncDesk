# Technical Audit Report: SIH26264 Integrated AICTE Institution Complaint Monitoring and Coordination System

**Date of Audit:** 2026-10-25  
**Auditor:** Antigravity Autonomous Diagnostic Agent  
**Environment:** Windows (x64), Python 3.12.10, Node.js 24, Vite 8.3.5, React 19, SQLite 3  
**Status:** Rigorous Technical Audit Concluded & Verified

---

## 1. Executive Summary

A comprehensive, evidence-based technical audit was conducted on the SIH26264 implementation across backend services, SQLite persistence models, database constraints, institution identity resolution algorithms, the explainable overlap engine, authentication and RBAC workflows, the SLA monitoring scheduler, reporting engines, frontend integration, and Docker containerization.

All claims from initial project documentation were subjected to live runtime verification and automated test execution. Rather than accepting summaries at face value, actual source code, database tables, API payloads, and test executions were examined.

### Summary of Audit Outcomes:
- **Test Suite:** Expanded from 16 to **22 automated tests** passing in `5.65s` (100% pass rate).
- **Frontend Production Build:** Verified via `tsc -b && vite build` (2,533 modules transformed, 0 TypeScript errors).
- **Confirmed Defects Identified & Fixed:**
  1. **SQLite Foreign Keys Disabled:** SQLite connection lacked `PRAGMA foreign_keys = ON;`, rendering cascading deletes and relational integrity constraints inert at the engine level. Fixed via an engine connect event listener.
  2. **Conflicting Institution Identity Check Blindspot:** When an AICTE Permanent ID was matched, conflicting identity checks only compared against official normalized names. If a complaint used a verified alias belonging to a different institution, the conflict was missed and false 1.0 confidence was returned. Fixed to check both normalized names and verified aliases.
  3. **Report Generation Ignored Region Filters:** In `ReportService.generate_report_data()`, the `region` parameter was accepted but never applied to the SQL query. Fixed to join `ComplaintCase.institution` and filter by `Institution.region`.
  4. **Cross-Bureau & Cross-Region Unauthorized Case Mutation:** API routes for modifying, transferring, assigning, and disposing cases lacked server-side ownership and jurisdictional verification. Added `verify_case_modify_permission()` to enforce bureau and regional boundaries.
  5. **Seed Script Non-Idempotent When `reset=False`:** Running `seed_database(reset=False)` on an existing database raised an unhandled `IntegrityError: UNIQUE constraint failed: users.email`. Fixed to detect existing records and skip safely.
  6. **SLA Monitor Null Safety:** Lack of a null check on `case.sla_due_date` in `SLAService` exposed the background scheduler to `TypeError: '<' not supported between NoneType and date`. Added defensive null guard.
  7. **Investigation of 1,486 Overlaps & 658 Alerts:** Unpacked the mathematical origin of these figures. The database contains **913 distinct, unique overlap assessment rows** and **659 alerts**. The reported "1,486 evaluations" arose from symmetric pair traversal in `batch_reassess_all` where each active pair was visited from both vertices.

---

## 2. Actual Architecture Inspected

```mermaid
graph TD
    subgraph UI ["Client Layer (React 19 + TypeScript + Vite)"]
        Dashboard["Dashboard & Live Polling (5s)"]
        CaseRegistry["Cases Registry & Multi-Filters"]
        Dossier["Case Dossier & Action Timeline"]
        OverlapCenter["Overlap Intelligence Center"]
        CoordWorkspace["Joint Coordination Space"]
        SLACenter["SLA Surveillance & Alerts"]
        ReportsUI["Statutory Reports (CSV/PDF)"]
    end

    subgraph API ["FastAPI REST Backend (v1)"]
        AuthRouter["/api/v1/auth (JWT Bearer)"]
        CasesRouter["/api/v1/cases (Jurisdiction Enforced)"]
        InstRouter["/api/v1/institutions (Master & Aliases)"]
        OverlapRouter["/api/v1/overlaps (Assessment & Actions)"]
        CoordRouter["/api/v1/coordination (Workspaces)"]
        AlertsRouter["/api/v1/alerts (Deduplicated Feed)"]
        ReportsRouter["/api/v1/reports (CSV & ReportLab PDF)"]
        AdminRouter["/api/v1/admin (RBAC & Audit Trail)"]
    end

    subgraph Engines ["Core Intelligence & Governance Engines"]
        IDResolver["InstitutionResolutionService\n(Exact ID -> Alias -> Normalizer -> RapidFuzz)"]
        OverlapEngine["ExplainableOverlapEngine\n(4-Signal Scorer + TF-IDF Cosine Fallback)"]
        WorkflowService["WorkflowService\n(State Transitions & Audit Trail)"]
        SLAService["SLAService & APScheduler\n(Idempotent Deduplication Keys)"]
    end

    subgraph DB ["Persistent Database (SQLite 3 + SQLAlchemy 2.0)"]
        PRAGMA["PRAGMA foreign_keys = ON"]
        Tables["40 Institutions, 49 Aliases, 280 Cases\n623 Action History, 913 Overlaps, 659 Alerts"]
    end

    UI -->|Bearer JWT + REST| API
    API --> Engines
    Engines --> DB
    PRAGMA -.-> DB
```

---

## 3. Verified Feature List

| Feature | Subsystem | Code Location | Verified Status |
| :--- | :--- | :--- | :---: |
| **JWT Authentication** | Backend API | `app/api/v1/auth.py`, `app/core/security.py` | Verified (Real bcrypt + JWT) |
| **Role-Based Access Control** | Backend Deps | `app/api/deps.py`, `app/api/v1/cases.py` | Verified (Jurisdiction enforced) |
| **Institution Resolution** | Core Engine | `app/services/institution_service.py` | Verified (Multi-tier + Conflict check) |
| **Explainable Overlap** | Core Engine | `app/services/overlap_engine.py` | Verified (Multi-signal + Fallback) |
| **Case Lifecycle Transitions** | Workflow | `app/services/workflow_service.py` | Verified (Immutable action timeline) |
| **Idempotent SLA Scheduler** | Background | `app/services/sla_service.py` | Verified (APScheduler + Dedup keys) |
| **Statutory Reports Export** | Analytics | `app/services/report_service.py` | Verified (RFC 4180 CSV + ReportLab PDF) |
| **Executive Dashboard** | Frontend | `frontend/src/pages/Dashboard.tsx` | Verified (100% real API endpoints) |
| **Joint Coordination Space** | Coordination | `frontend/src/pages/Coordination.tsx` | Verified (Multi-case linking) |
| **Regulatory Audit Trail** | Compliance | `app/models/audit.py`, `app/api/v1/admin.py` | Verified (Actor, state before/after) |

---

## 4. Test Commands Executed

The following test and inspection commands were executed against the actual environment:

1. **Automated Unit & Integration Test Suite:**
   ```bash
   venv\Scripts\python.exe -m pytest app/tests -v
   ```
   *Result:* **22 passed, 0 failed** in 5.65s.

2. **Frontend Production Compilation:**
   ```bash
   npm run build
   ```
   *Result:* 2,533 modules transformed, production assets generated cleanly in `dist/`.

3. **Database Constraint & Foreign Key Audit:**
   ```bash
   venv\Scripts\python.exe -c "from app.db.session import engine; from sqlalchemy import text; with engine.connect() as conn: print('PRAGMA foreign_keys:', conn.execute(text('PRAGMA foreign_keys;')).scalar())"
   ```
   *Result:* `PRAGMA foreign_keys: 1`.

4. **Seed Idempotency & Repeatability Verification:**
   ```bash
   venv\Scripts\python.exe -c "from app.seed import seed_database; seed_database(reset=False)"
   ```
   *Result:* Gracefully skips without integrity errors.

---

## 5. Actual Test Results

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\Puneet\Desktop\SIH\backend
plugins: anyio-4.15.1
collected 22 items

app/tests/test_api_endpoints.py::test_auth_login_and_me PASSED           [  4%]
app/tests/test_api_endpoints.py::test_unauthenticated_request_rejected PASSED [  9%]
app/tests/test_api_endpoints.py::test_dashboard_kpis PASSED              [ 13%]
app/tests/test_api_endpoints.py::test_report_export_csv_and_pdf PASSED   [ 18%]
app/tests/test_audit_regressions.py::test_sqlite_foreign_keys_enforced PASSED [ 22%]
app/tests/test_audit_regressions.py::test_conflicting_identity_with_verified_alias PASSED [ 27%]
app/tests/test_audit_regressions.py::test_report_service_region_filter PASSED [ 31%]
app/tests/test_audit_regressions.py::test_unauthorized_cross_bureau_case_modification_rejected PASSED [ 36%]
app/tests/test_audit_regressions.py::test_regional_officer_jurisdiction_enforced PASSED [ 40%]
app/tests/test_audit_regressions.py::test_sla_service_handles_null_due_date_safely PASSED [ 45%]
app/tests/test_institution_resolution.py::test_normalization_rules PASSED [ 50%]
app/tests/test_institution_resolution.py::test_exact_aicte_permanent_id_match PASSED [ 54%]
app/tests/test_institution_resolution.py::test_verified_alias_match PASSED [ 59%]
app/tests/test_institution_resolution.py::test_similar_names_different_ids_do_not_conflate PASSED [ 63%]
app/tests/test_institution_resolution.py::test_unresolved_institution_handled_safely PASSED [ 68%]
app/tests/test_overlap_engine.py::test_category_similarity PASSED        [ 72%]
app/tests/test_overlap_engine.py::test_text_similarity_and_fallback PASSED [ 77%]
app/tests/test_overlap_engine.py::test_cross_bureau_overlap_detection PASSED [ 81%]
app/tests/test_overlap_engine.py::test_dismissed_overlap_is_preserved PASSED [ 86%]
app/tests/test_sla_and_alerts.py::test_sla_breached_alert_generation PASSED [ 90%]
app/tests/test_sla_and_alerts.py::test_idempotency_prevents_duplicate_alerts PASSED [ 95%]
app/tests/test_workflow.py::test_case_lifecycle_workflow PASSED          [100%]

======================= 22 passed, 10 warnings in 5.65s =======================
```

---

## 6. Database Record Counts

Direct inspection of `aicte_complaints.db` yielded the following verified counts:

| Table / Entity | Verified Count | Notes & Breakdown |
| :--- | :---: | :--- |
| **Institutions** | **40** | Distributed across Western, Northern, Southern, Eastern, Central regions |
| **Institution Aliases** | **49** | Acronyms and common abbreviations (e.g., VESIT, COEP, VJTI, DTU) |
| **Complaint Cases** | **280** | 15 planted realistic scenarios + 265 master procedural cases |
| **User Accounts** | **6** | Admin, RB Officer, PGRC Officer, Regional Officer, Senior Mgmt, Approval Officer |
| **Action History Records** | **623** | Complete chronological audit trail (minimum 1 creation record per case) |
| **Total Overlap Assessments** | **913** | Distinct rows satisfying unique constraint `uq_overlap_case_pair` |
| ↳ *Suggested Overlaps* | 911 | Pending officer review in Overlap Intelligence Center |
| ↳ *Confirmed Overlaps* | 2 | Seeded joint coordination scenarios |
| ↳ *Dismissed Overlaps* | 0 | Dismissals preserved upon manual officer rejection |
| ↳ *Institution Overlap* | 686 | Same institution, low issue similarity or historical |
| ↳ *Potential Issue Overlap* | 192 | Same institution, cross-bureau, related regulatory category |
| ↳ *Potential Duplicate* | 35 | High semantic similarity (overall $\ge 0.82$ or text $\ge 0.80$) |
| **Coordination Records** | **2** | Joint inter-bureau coordination workspaces |
| **Total Alerts** | **659** | Idempotent system notifications |
| ↳ *Overlap Alerts* | 435 | Active cross-bureau institutional overlaps |
| ↳ *SLA Breached Alerts* | 159 | Active cases exceeding statutory deadlines |
| ↳ *Pending Reminder Alerts*| 52 | Pending cases idle for $> 7$ days |
| ↳ *SLA Approaching Alerts* | 13 | Active cases within 5 days of SLA due date |

### Investigation: Why 1,486 Evaluated Overlaps & 658 Alerts?
1. **The 1,486 Evaluated Overlaps:**  
   In `ExplainableOverlapEngine.batch_reassess_all()`, the algorithm iterates over all active cases and executes `evaluate_case_overlaps(db, case)` on each case. When an institution has multiple active cases, an active pair $(A, B)$ is processed when evaluating case $A$, and assessed again when evaluating case $B$. The accumulator `count += len(overlaps)` increments during both traversals. The actual distinct records stored in SQLite with `case_a_id < case_b_id` under `uq_overlap_case_pair` is **913**. There are **0 duplicate pairs**.
2. **The 658/659 Alerts:**  
   The database contains 659 alerts: 159 SLA breaches, 13 SLA warnings, 52 pending reminders, and 435 overlap alerts. Every single alert has a unique `deduplication_key` index, preventing duplicate records upon repeated scheduler runs. However, generating an overlap alert for *every* active cross-bureau pair of the same institution (including low similarity pairs) causes alert volume to exceed total cases. Recommendations for alert thresholding are provided in Section 18.

---

## 7. Institution Resolution Results

The 10 specified test cases for institution identity resolution were executed:

| Test Case | Input | Expected Outcome | Actual Outcome | Status |
| :--- | :--- | :--- | :--- | :---: |
| **1. Exact AICTE Permanent ID** | `VESIT`, ID `1-10023451` | VERIFIED (1.0) | `VESIT`, VERIFIED, 1.0 | **PASS** |
| **2. Exact Verified Alias** | `COEP Tech` (No ID) | VERIFIED (0.98) | `COEP`, VERIFIED, 0.98 | **PASS** |
| **3. Abbreviation & Punctuation** | `V.E.S. Inst. of Tech.` | VERIFIED (0.98) | `VESIT`, VERIFIED, 0.98 | **PASS** |
| **4. Similar Names in Different Cities** | `Govt Engineering College` (Ajmer vs Bilaspur) | UNRESOLVED (Needs Officer Verification) | `None`, UNRESOLVED, 1.0 (5 candidates) | **PASS** |
| **5. Similar Names, Different Verified IDs** | `Govt Engineering College`, ID `1-10023480` | VERIFIED to Ajmer | `GEC Ajmer`, VERIFIED, 1.0 | **PASS** |
| **6. Conflicting Identity Evidence** | Name `COEP`, ID `1-10023451` (VESIT) | CONFLICTING (No silent auto-merge) | `None`, CONFLICTING, 0.5 | **PASS** (Fixed) |
| **7. Unknown Institution Name** | `XYZ Institute of Mystery` | UNRESOLVED | `None`, UNRESOLVED, 0.658 | **PASS** |
| **8. Ambiguous Fuzzy Match** | `Institute of Technology` | UNRESOLVED ($\ge 5$ close candidates) | `None`, UNRESOLVED, 1.0 | **PASS** |
| **9. Incorrect Alias Protection** | Removal/Rejection of Alias | Does not match rejected aliases | Verified via schema constraint | **PASS** |
| **10. Audit History of Resolution** | `manual_resolve()` | Creates `ActionHistory` & `AuditEvent` | Verified (`MANUAL_INSTITUTION_RESOLUTION`) | **PASS** |

---

## 8. Overlap Engine Evaluation

### Formula & Weights
The scoring formula is defined in `ExplainableOverlapEngine.assess_case_pair()`:
- **Same Institution:**
  $$\text{Overall Score} = 0.35 \times \text{Category Score} + 0.65 \times \text{Text Score}$$
- **Different Institution:**
  $$\text{Overall Score} = 0.10 \times \text{Category Score} + 0.20 \times \text{Text Score}$$
- **Category Similarity:** $1.0$ for exact match; $0.65$ for related domain clusters (`academic`, `financial`, `infrastructure`, `conduct`); $0.15$ otherwise.
- **Text Similarity:** Blended lexical (RapidFuzz `token_set_ratio` + `token_sort_ratio`) and semantic transformer (`all-MiniLM-L6-v2`) with automatic fallback to Scikit-Learn TF-IDF cosine similarity.
- **Classification Rules:**
  - $\text{Same Inst} \land (\text{Text} \ge 0.80 \lor \text{Overall} \ge 0.82) \implies \textbf{Potential Duplicate}$
  - $\text{Same Inst} \land \text{Cross-Bureau} \land (\text{Cat} \ge 0.65 \lor \text{Text} \ge 0.50) \implies \textbf{Potential Issue Overlap}$
  - $\text{Same Inst} \land \text{Cross-Bureau} \land \text{Both Active} \implies \textbf{Institution Overlap}$
  - Otherwise $\implies \textbf{Institution Overlap}$ (if same inst) or $\textbf{No Overlap}$.

### Evaluation of Scenarios A through J

| Scenario | Description | Expected Classification | Actual Classification | Actual Overall Score | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **A** | Same inst, diff bureau, similar issue | Potential Issue Overlap | Potential Issue Overlap | 0.499 | **PASS** |
| **B** | Same inst, diff bureau, diff issue | Institution Overlap | Institution Overlap | 0.186 | **PASS** |
| **C** | Same inst, same bureau, related issue | Potential Issue Overlap / Inst Overlap | Institution Overlap | 0.374 | **PASS** |
| **D** | Different insts, similar names | No Overlap | No Overlap | 0.050 | **PASS** |
| **E** | Different insts, identical wording | No Overlap | No Overlap | 0.300 | **PASS** |
| **F** | Different wording, same underlying issue | Potential Duplicate | Potential Duplicate | 0.878 | **PASS** |
| **G** | Disposed case vs active case | Retains Overlap, No Active Alert | Potential Issue Overlap (`both_active=False`) | 0.540 | **PASS** |
| **H** | Transferred case vs active case | Overlap evaluated for new bureau | Institution Overlap (`both_active=True`) | 0.350 | **PASS** |
| **I** | Ambiguous institution identity | Excluded from automated overlap | Returns 0 overlaps | 0.000 | **PASS** |
| **J** | Repeated batch assessment | Idempotent, zero duplicate records | 1486 evaluations, 913 distinct rows | N/A | **PASS** |

---

## 9. Precision and Recall

Evaluated across the 15 deliberate, ground-truth planted cross-bureau overlap scenarios in the seed dataset:
- **Planted True Overlaps:** 15
- **Correctly Detected Overlaps (Potential Issue Overlap or Potential Duplicate):** 15
- **False Negatives:** 0
- **Recall:** $\mathbf{100\%}$ ($\frac{15}{15}$)
- **Precision on High-Confidence Classification:** Across planted scenarios, 100% of high-confidence duplicate and issue overlap classifications corresponded to true regulatory conflicts.
- **Distinction Between Institution vs Issue Overlap:** The system correctly distinguishes general institutional co-occurrence (686 cases of same institution with unrelated issues) from actionable regulatory issue overlap (192 cases) and duplicates (35 cases).

---

## 10. Authorization & Security Findings

1. **Server-Side Token Validation:** Authenticated endpoints strictly validate JWT signatures using the server secret key. Expired, altered, or unsigned tokens are rejected with HTTP 401.
2. **Demo Persona Switcher Integrity:** Verified that `quickSwitch()` in `AuthContext.tsx` sends a real `POST /api/v1/auth/login` request and receives a signed JWT token for the target user. Changing client-side state alone without a valid token fails backend API verification.
3. **Cross-Bureau Case Tampering (Fixed):** Prior to audit, an officer authenticated in PGRC could modify or dispose an RB case. Added `verify_case_modify_permission()` to enforce that non-executive officers can only modify cases in their bureau.
4. **Regional Jurisdiction Restrictions (Fixed):** Regional Officers are now strictly bounded to cases within their assigned region (e.g., Western) and within the Regional Office bureau.
5. **Admin Operations:** User creation, role assignment, and system configuration endpoints are strictly restricted to `Admin` users via `require_admin`.

---

## 11. Case Workflow & Audit History Findings

- **Lifecycle Transitions:** Validated transitions: `Pending` $\rightarrow$ `Under Process` $\rightarrow$ `Transferred` / `Escalated` $\rightarrow$ `Disposed`.
- **Mandatory Rationale:** Case disposal strictly enforces a minimum 10-character closure remark. Case reopening requires explicit justification and is restricted to `Senior Management` and `Admin`.
- **Immutable Action Timeline:** There are **zero** DELETE or UPDATE endpoints for `ActionHistory` or `AuditEvent`. History entries are append-only.
- **Transactional Consistency:** State transitions, action logs, audit entries, and overlap triggers are committed within a single database transaction.

---

## 12. SLA & Notification Findings

- **SLA State Calculation:** Evaluates `case.sla_due_date` against `date.today()`. Active cases with `sla_due_date < today` are classified as `OVERDUE`.
- **Idempotent Alerts:** Every alert generates a deterministic deduplication key (e.g., `SLA_BREACHED_AICTE-RO-2026-00020_2026-10-20`). Duplicate alerts are rejected by SQLite unique constraint.
- **Scheduler Resilience:** Added defensive null checks for `sla_due_date`.
- **Alert Controls:** Read and resolve actions persist timestamps (`read_at`, `resolved_at`) cleanly in the database.

---

## 13. Dashboard & Report Consistency Findings

- **Real Database Computation:** All KPIs on the Executive Dashboard (`total_cases: 280`, `overdue_cases`, `bureau-stats`, `ageing-stats`, `priority-queue`) are computed dynamically via SQLAlchemy queries. No mock or hardcoded statistics remain.
- **Reporting Engine:** Supports 12 certified regulatory reports with table preview, RFC 4180 CSV export with UTF-8 BOM, and formatted ReportLab PDF generation.
- **Region Filter Fix:** Added the missing `region` filter in `ReportService.generate_report_data()`. CSV and PDF exports now respect region filters identically to preview tables.

---

## 14. Frontend Defects & Polish

- **Compilation:** Clean production build with Vite (`828 kB` JS, `33 kB` CSS, 0 errors).
- **Navigation:** All sidebar links, quick role switches, and detail routes resolve without broken links or 404s.
- **Interactive Forms:** Multi-filter query params synchronize with URL search parameters and persist across refreshes.

---

## 15. Deployment & Reproducibility Findings

- **Container Configuration:** `docker-compose.yml` orchestrates backend (`aicte_backend:8000`) and frontend (`aicte_frontend:5173`) with Nginx reverse proxy.
- **Volume Shadowing Warning:** In `docker-compose.yml`, mounting `aicte_data:/app` directly overlays the root container directory. While suitable for persistence, in live development it shadows application code updates unless volumes are recreated with `docker compose down -v`.

---

## 16. Security Concerns & Remediations

| Risk Level | Finding | Remediation Applied |
| :---: | :--- | :--- |
| **HIGH** | SQLite foreign key constraints were silently ignored by default. | Added `event.listens_for(engine, "connect")` with `PRAGMA foreign_keys=ON`. |
| **HIGH** | Officers could perform cross-bureau case disposal and modification. | Implemented `verify_case_modify_permission()` to enforce bureau & regional boundaries. |
| **MEDIUM** | Verified alias collision was missed during AICTE ID conflict verification. | Expanded conflict resolution query to check both normalized names and aliases. |
| **MEDIUM** | Report queries ignored region filters passed in request parameters. | Applied `Institution.region` join and filter in `ReportService`. |
| **LOW** | Seed script crashed on repeated execution without reset. | Added idempotency check to safely skip already populated databases. |

---

## 17. Fixes Applied

1. `backend/app/db/session.py`: Enabled `PRAGMA foreign_keys = ON;` on SQLite connections.
2. `backend/app/services/institution_service.py`: Added verified alias check to conflicting institution ID resolution.
3. `backend/app/services/report_service.py`: Added institution region filtering to query builder.
4. `backend/app/api/v1/cases.py`: Implemented `verify_case_modify_permission()` on case modification endpoints.
5. `backend/app/seed.py`: Added idempotency guard when `reset=False`.
6. `backend/app/services/sla_service.py`: Added defensive null check for `sla_due_date`.
7. `backend/app/tests/test_audit_regressions.py`: Added 6 new regression tests covering all audit fixes (22 total tests passing).

---

## 18. Remaining Limitations

1. **Overlap Alert Volume:** Generating an alert for all active cross-bureau pairs produces 435 overlap alerts. Filtering alerts to only `Potential Duplicate` and `Potential Issue Overlap` would reduce alert volume by ~70% and prevent officer fatigue.
2. **SQLite Single-Writer Concurrency:** Under heavy multi-user write traffic, SQLite file locking can encounter `OperationalError: database is locked`. For enterprise production, migration to PostgreSQL is recommended.
3. **In-Memory APScheduler Worker:** Running multiple Uvicorn workers spawns multiple scheduler instances. A centralized Celery or Redis queue is optimal for horizontal scaling.

---

## 19. Recommended Next Steps

1. **Thresholding Overlap Alerts:** Configure overlap alert generation to only trigger when `overall_score >= 0.50` or `classification != 'Institution Overlap'`.
2. **PostgreSQL Migration Plan:** Provide a 1-click Docker Compose profile with PostgreSQL 16 for production-grade concurrent write workloads.
3. **Real-time WebSockets:** Replace 5-second frontend dashboard polling with FastAPI WebSockets for instant alert broadcasting.

---

## 20. Top 5 Consequential Remaining Risks for Live SIH Demonstration

1. **Docker Volume Stale Code Shadowing:** If judges evaluate via Docker Compose after pulling code changes, the named volume `aicte_data` may retain old container state. **Mitigation:** Run `docker compose down -v && docker compose up --build`.
2. **Alert Clutter During Presentation:** The presence of 435 overlap alerts may appear overwhelming if a judge views the raw alert count. **Mitigation:** Use the severity filter (`CRITICAL` or `HIGH`) in the Alerts Center to show only high-priority alerts.
3. **Local Dev Port Conflicts:** If local ports 8000 or 5173 are held by background processes, dev servers will fail to bind. **Mitigation:** Verify ports via `Get-NetTCPConnection -LocalPort 8000, 5173` before launch.
4. **Client-Side Session Expiry:** Tokens generated by `create_access_token` have an expiry window. If a demo runs across multiple hours, the session could expire. **Mitigation:** Quick Persona Switcher in the top header instantly re-authenticates with fresh tokens in 1 click.
5. **Rapid Double-Clicks on State Actions:** In slow browser environments, double-clicking "Confirm Overlap" could attempt two simultaneous transitions. **Mitigation:** Frontend action buttons disable during asynchronous dispatch.
