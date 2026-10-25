import re
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy.orm import Session
from rapidfuzz import fuzz
from app.models.institution import Institution, InstitutionAlias
from app.models.audit import AuditEvent

ABBREVIATIONS = {
    r"\binst\b": "institute",
    r"\binst\.\b": "institute",
    r"\btech\b": "technology",
    r"\btech\.\b": "technology",
    r"\bengg\b": "engineering",
    r"\bengg\.\b": "engineering",
    r"\beng\b": "engineering",
    r"\beng\.\b": "engineering",
    r"\bcoll\b": "college",
    r"\bcoll\.\b": "college",
    r"\bclg\b": "college",
    r"\bpoly\b": "polytechnic",
    r"\bpoly\.\b": "polytechnic",
    r"\buniv\b": "university",
    r"\buniv\.\b": "university",
    r"\bmgmt\b": "management",
    r"\bmgmt\.\b": "management",
    r"\bmgt\b": "management",
    r"\bmgt\.\b": "management",
    r"\bdept\b": "department",
    r"\bsci\b": "science",
    r"\bres\b": "research",
}

def normalize_institution_name(name: str) -> str:
    if not name:
        return ""
    # Lowercase
    cleaned = name.lower()
    # Replace dots in acronyms like V.E.S.I.T. or I.I.T. -> vesit, iit
    cleaned = re.sub(r"([a-z])\.(?=[a-z]\b|\s|$)", r"\1", cleaned)
    # Replace punctuation with spaces
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    # Standardize abbreviations
    for pattern, replacement in ABBREVIATIONS.items():
        cleaned = re.sub(pattern, replacement, cleaned)
    # Normalize whitespaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

class InstitutionResolutionService:
    @staticmethod
    def resolve_institution(
        db: Session,
        raw_name: str,
        aicte_permanent_id: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> Tuple[Optional[Institution], str, float, List[Dict[str, Any]]]:
        """
        Resolution outcomes:
        - ('VERIFIED', 1.0, candidate_list)
        - ('PROBABLE', score, candidate_list)
        - ('UNRESOLVED', score, candidate_list)
        - ('CONFLICTING', score, candidate_list)
        """
        candidates: List[Dict[str, Any]] = []

        # 1. Exact AICTE Permanent ID match
        if aicte_permanent_id:
            cleaned_id = aicte_permanent_id.strip()
            inst_by_id = db.query(Institution).filter(Institution.aicte_permanent_id == cleaned_id).first()
            if inst_by_id:
                # Check if raw_name matches or differs
                norm_raw = normalize_institution_name(raw_name)
                # If there's another verified institution with exact same name or alias but different ID, flag conflict
                conflict = None
                if norm_raw:
                    conflict = db.query(Institution).filter(
                        Institution.normalized_name == norm_raw,
                        Institution.aicte_permanent_id != cleaned_id,
                        Institution.aicte_permanent_id.isnot(None)
                    ).first()
                    if not conflict:
                        conflict_alias = db.query(InstitutionAlias).join(InstitutionAlias.institution).filter(
                            InstitutionAlias.normalized_alias == norm_raw,
                            InstitutionAlias.verification_status == "VERIFIED",
                            Institution.aicte_permanent_id != cleaned_id,
                            Institution.aicte_permanent_id.isnot(None)
                        ).first()
                        if conflict_alias:
                            conflict = conflict_alias.institution

                if conflict:
                    candidates.append({
                        "institution": conflict.to_dict(),
                        "score": 0.9,
                        "match_type": "CONFLICTING_ID",
                        "notes": f"Name or alias matches '{conflict.official_name}' (ID: {conflict.aicte_permanent_id}) but provided ID is {cleaned_id}"
                    })
                    return None, "CONFLICTING", 0.5, candidates

                return inst_by_id, "VERIFIED", 1.0, [{
                    "institution": inst_by_id.to_dict(),
                    "score": 1.0,
                    "match_type": "EXACT_AICTE_ID",
                    "notes": f"Exact AICTE Permanent ID match: {cleaned_id}"
                }]

        if not raw_name or not raw_name.strip():
            return None, "UNRESOLVED", 0.0, []

        norm_input = normalize_institution_name(raw_name)

        # 2. Exact Verified Alias match
        alias_match = db.query(InstitutionAlias).filter(
            InstitutionAlias.normalized_alias == norm_input,
            InstitutionAlias.verification_status == "VERIFIED"
        ).first()
        if alias_match and alias_match.institution:
            inst = alias_match.institution
            return inst, "VERIFIED", 0.98, [{
                "institution": inst.to_dict(),
                "score": 0.98,
                "match_type": "EXACT_VERIFIED_ALIAS",
                "notes": f"Matched verified alias '{alias_match.alias}'"
            }]

        # 3. Exact Normalized Official Name match
        inst_by_name = db.query(Institution).filter(Institution.normalized_name == norm_input).first()
        if inst_by_name:
            return inst_by_name, "VERIFIED", 0.95, [{
                "institution": inst_by_name.to_dict(),
                "score": 0.95,
                "match_type": "EXACT_NORMALIZED_NAME",
                "notes": f"Exact match on normalized name '{norm_input}'"
            }]

        # 4. Fuzzy Name Search across all Institutions and Aliases
        all_institutions = db.query(Institution).all()
        scored_candidates = []

        for inst in all_institutions:
            # Score against official normalized name
            score_official = fuzz.token_set_ratio(norm_input, inst.normalized_name)
            sort_score = fuzz.token_sort_ratio(norm_input, inst.normalized_name)
            best_score = max(score_official, sort_score)
            best_match_label = "OFFICIAL_NAME"

            # Score against aliases
            for al in inst.aliases:
                al_score = max(
                    fuzz.token_set_ratio(norm_input, al.normalized_alias),
                    fuzz.token_sort_ratio(norm_input, al.normalized_alias)
                )
                if al_score > best_score:
                    best_score = al_score
                    best_match_label = f"ALIAS:{al.alias}"

            # Supporting geographic evidence
            geo_bonus = 0
            if city and inst.city and city.lower().strip() == inst.city.lower().strip():
                geo_bonus += 5
            if state and inst.state and state.lower().strip() == inst.state.lower().strip():
                geo_bonus += 3

            adjusted_score = min(100.0, best_score + geo_bonus)

            if adjusted_score >= 65.0:
                scored_candidates.append({
                    "institution": inst,
                    "score": round(adjusted_score / 100.0, 3),
                    "match_type": f"FUZZY_{best_match_label}",
                    "notes": f"Fuzzy similarity: {best_score}%, Geo bonus: +{geo_bonus}%"
                })

        # Sort candidates descending by score
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)

        candidate_dicts = [
            {
                "institution": c["institution"].to_dict(),
                "score": c["score"],
                "match_type": c["match_type"],
                "notes": c["notes"]
            }
            for c in scored_candidates[:5]
        ]

        if not scored_candidates:
            return None, "UNRESOLVED", 0.0, []

        top_candidate = scored_candidates[0]
        top_score = top_candidate["score"]
        top_inst = top_candidate["institution"]

        # If top score >= 0.88 with significant separation from second candidate
        second_score = scored_candidates[1]["score"] if len(scored_candidates) > 1 else 0.0

        if top_score >= 0.88 and (top_score - second_score >= 0.08):
            return top_inst, "PROBABLE", top_score, candidate_dicts
        elif top_score >= 0.70:
            return None, "UNRESOLVED", top_score, candidate_dicts
        else:
            return None, "UNRESOLVED", top_score, candidate_dicts

    @staticmethod
    def manual_resolve(
        db: Session,
        case_id: int,
        institution_id: int,
        resolved_by_user_id: int,
        remarks: Optional[str] = None
    ) -> bool:
        from app.models.case import ComplaintCase, ActionHistory
        case = db.query(ComplaintCase).filter(ComplaintCase.id == case_id).first()
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        if not case or not inst:
            return False

        old_inst_id = case.institution_id
        case.institution_id = inst.id

        # Record action history
        action = ActionHistory(
            case_id=case.id,
            actor_user_id=resolved_by_user_id,
            bureau=case.current_bureau,
            action_type="INSTITUTION_RESOLUTION",
            remarks=f"Institution resolved manually to '{inst.official_name}' (ID: {inst.aicte_permanent_id or 'N/A'}). {remarks or ''}".strip(),
            from_bureau=case.current_bureau,
            to_bureau=case.current_bureau,
            previous_status=case.status,
            new_status=case.status
        )
        db.add(action)

        # Audit event
        audit = AuditEvent(
            actor_user_id=resolved_by_user_id,
            entity_type="CASE",
            entity_id=str(case.id),
            operation="MANUAL_INSTITUTION_RESOLUTION",
            before_state=str({"institution_id": old_inst_id}),
            after_state=str({"institution_id": inst.id, "official_name": inst.official_name})
        )
        db.add(audit)
        db.commit()
        return True
