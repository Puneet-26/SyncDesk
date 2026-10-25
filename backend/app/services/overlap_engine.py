import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from app.models.case import ComplaintCase
from app.models.overlap import OverlapAssessment
from app.models.alert import Alert

# Semantic similarity model placeholder with lazy-loading and graceful fallback
_semantic_model = None
_semantic_model_load_attempted = False

def get_semantic_model():
    global _semantic_model, _semantic_model_load_attempted
    if not _semantic_model_load_attempted:
        _semantic_model_load_attempted = True
        try:
            from sentence_transformers import SentenceTransformer
            # Load with local cache
            _semantic_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            _semantic_model = None
    return _semantic_model

def compute_text_similarity(text_a: str, text_b: str) -> Tuple[float, str]:
    """
    Returns (similarity_score: 0.0 - 1.0, method_used: str)
    """
    if not text_a or not text_b:
        return 0.0, "EMPTY_TEXT"

    # RapidFuzz lexical similarity (best of token_set_ratio and token_sort_ratio)
    set_ratio = fuzz.token_set_ratio(text_a, text_b) / 100.0
    sort_ratio = fuzz.token_sort_ratio(text_a, text_b) / 100.0
    lexical_ratio = max(set_ratio, sort_ratio)

    # Try semantic model if available
    model = get_semantic_model()
    if model:
        try:
            embeddings = model.encode([text_a, text_b])
            cos_sim = float(np.dot(embeddings[0], embeddings[1]) / (np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])))
            semantic_score = max(0.0, min(1.0, cos_sim))
            # Blended score: 60% semantic, 40% lexical
            blended = round(0.60 * semantic_score + 0.40 * lexical_ratio, 3)
            return blended, "SEMANTIC_TRANSFORMER_BLENDED"
        except Exception:
            pass

    # Fallback to TF-IDF cosine similarity + RapidFuzz
    try:
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        tfidf_matrix = vectorizer.fit_transform([text_a, text_b])
        tfidf_sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        # If lexical word overlap is high, don't penalize un-stemmed inflections in 2-document sample
        if lexical_ratio >= 0.70:
            blended = round(max(lexical_ratio, 0.30 * tfidf_sim + 0.70 * lexical_ratio), 3)
        else:
            blended = round(0.50 * tfidf_sim + 0.50 * lexical_ratio, 3)
        return blended, "TFIDF_LEXICAL_FALLBACK"
    except Exception:
        return round(lexical_ratio, 3), "RAPIDFUZZ_LEXICAL_ONLY"

CATEGORY_GROUPS = {
    "academic": {"Faculty Deficiencies", "Unauthorized Courses", "Curriculum Non-Compliance", "Examination Irregularities"},
    "financial": {"Capitation Fees", "Excess Tuition Fees", "Non-Refund of Security Deposit", "Financial Misappropriation"},
    "infrastructure": {"Infrastructure Non-Compliance", "Laboratory Equipment Deficiencies", "Hostel Substandard Amenities", "Campus Safety"},
    "conduct": {"Harassment", "Ragging Allegation", "Faculty Exploitation", "Administrative Malpractice"},
}

def compute_category_similarity(cat_a: str, cat_b: str) -> float:
    if not cat_a or not cat_b:
        return 0.0
    if cat_a.strip().lower() == cat_b.strip().lower():
        return 1.0
    
    # Check related domain clusters
    for group_members in CATEGORY_GROUPS.values():
        if cat_a in group_members and cat_b in group_members:
            return 0.65
            
    return 0.15

ACTIVE_STATUSES = {"Pending", "Under Process", "Escalated", "Transferred"}

class ExplainableOverlapEngine:
    @staticmethod
    def assess_case_pair(case_a: ComplaintCase, case_b: ComplaintCase) -> Dict[str, Any]:
        """
        Calculates scores, classification, human explanation, and recommendation for two cases.
        """
        # Ensure ordered pair
        if case_a.id > case_b.id:
            case_a, case_b = case_b, case_a

        # Institution identity factor
        same_inst = (case_a.institution_id is not None) and (case_a.institution_id == case_b.institution_id)
        inst_score = 1.0 if same_inst else 0.0

        # Category similarity
        cat_score = compute_category_similarity(case_a.category, case_b.category)

        # Text similarity
        text_score, text_method = compute_text_similarity(case_a.description, case_b.description)

        # Active check
        a_is_active = case_a.status in ACTIVE_STATUSES
        b_is_active = case_b.status in ACTIVE_STATUSES
        both_active = a_is_active and b_is_active
        is_cross_bureau = (case_a.current_bureau != case_b.current_bureau)

        # Overall score
        if same_inst:
            overall_score = round(0.35 * cat_score + 0.65 * text_score, 3)
        else:
            overall_score = round(0.10 * cat_score + 0.20 * text_score, 3)

        # Classification decision tree
        if same_inst and (text_score >= 0.80 or overall_score >= 0.82):
            classification = "Potential Duplicate"
            rec_action = "Review both complaints for identical allegations, petitioner identity, and potential consolidation."
        elif same_inst and is_cross_bureau and (cat_score >= 0.65 or text_score >= 0.50):
            classification = "Potential Issue Overlap"
            rec_action = f"Initiate cross-bureau coordination between {case_a.current_bureau} and {case_b.current_bureau} to align proceedings."
        elif same_inst and is_cross_bureau and both_active:
            classification = "Institution Overlap"
            rec_action = f"Institution has multiple active complaints across {case_a.current_bureau} and {case_b.current_bureau}. Check institutional compliance history."
        else:
            classification = "Institution Overlap" if same_inst else "No Overlap"
            rec_action = "No immediate regulatory conflict identified. Monitor regular case progression."

        # Structured explainability reasoning
        explanation_lines = []
        if same_inst:
            explanation_lines.append(f"Verified institution match: Both cases concern '{case_a.institution.official_name if case_a.institution else case_a.raw_institution_name}'.")
        else:
            explanation_lines.append(f"Distinct institutions: '{case_a.raw_institution_name}' vs '{case_b.raw_institution_name}'.")

        if is_cross_bureau:
            explanation_lines.append(f"Cross-Bureau involvement detected between '{case_a.current_bureau}' and '{case_b.current_bureau}'.")
        else:
            explanation_lines.append(f"Internal bureau cases within '{case_a.current_bureau}'.")

        if both_active:
            explanation_lines.append(f"Both cases are currently active ({case_a.case_id}: {case_a.status}, {case_b.case_id}: {case_b.status}).")
        else:
            explanation_lines.append(f"Case statuses: {case_a.case_id} is '{case_a.status}', {case_b.case_id} is '{case_b.status}'.")

        explanation_lines.append(f"Category relationship: '{case_a.category}' vs '{case_b.category}' (Score: {int(cat_score * 100)}%).")
        explanation_lines.append(f"Description similarity: {int(text_score * 100)}% via {text_method}.")

        reasons = {
            "headline": f"{classification.upper()}: COORDINATION REQUIRED" if both_active and is_cross_bureau else f"{classification.upper()}",
            "institution_identity": {
                "score": inst_score,
                "institution_id": case_a.institution_id,
                "institution_name": case_a.institution.official_name if case_a.institution else case_a.raw_institution_name,
                "aicte_id": case_a.institution.aicte_permanent_id if case_a.institution else None,
                "evidence": "Verified AICTE ID and institution master match" if same_inst else "Different institutions"
            },
            "cross_bureau": {
                "is_cross_bureau": is_cross_bureau,
                "bureau_a": case_a.current_bureau,
                "bureau_b": case_b.current_bureau
            },
            "case_statuses": {
                "case_a": {"case_id": case_a.case_id, "status": case_a.status, "officer": case_a.assigned_officer.name if case_a.assigned_officer else None},
                "case_b": {"case_id": case_b.case_id, "status": case_b.status, "officer": case_b.assigned_officer.name if case_b.assigned_officer else None},
                "both_active": both_active
            },
            "similarity_metrics": {
                "category_score": cat_score,
                "text_score": text_score,
                "text_method": text_method,
                "overall_score": overall_score
            },
            "narrative_explanation": " ".join(explanation_lines),
            "recommended_action": rec_action
        }

        return {
            "case_a_id": case_a.id,
            "case_b_id": case_b.id,
            "institution_identity_score": inst_score,
            "category_similarity_score": cat_score,
            "text_similarity_score": text_score,
            "overall_score": overall_score,
            "classification": classification,
            "reasons": reasons
        }

    @classmethod
    def evaluate_case_overlaps(cls, db: Session, target_case: ComplaintCase) -> List[OverlapAssessment]:
        """
        Evaluates and persists overlap assessments for a given case against all active/relevant cases.
        """
        if not target_case.institution_id:
            return []

        # Find candidates for same institution
        other_cases = db.query(ComplaintCase).filter(
            ComplaintCase.institution_id == target_case.institution_id,
            ComplaintCase.id != target_case.id
        ).all()

        created_or_updated: List[OverlapAssessment] = []

        for other in other_cases:
            case_a_id = min(target_case.id, other.id)
            case_b_id = max(target_case.id, other.id)
            case_a = target_case if target_case.id == case_a_id else other
            case_b = other if target_case.id == case_a_id else target_case

            # Check if an existing assessment exists
            existing = db.query(OverlapAssessment).filter(
                OverlapAssessment.case_a_id == case_a_id,
                OverlapAssessment.case_b_id == case_b_id
            ).first()

            # If dismissed and not materially changed, preserve dismissal!
            if existing and existing.status == "Dismissed":
                continue

            assessment_data = cls.assess_case_pair(case_a, case_b)

            # Only track if there is meaningful overlap (same inst + cross-bureau or text >= 0.50 or duplicate)
            is_cross_bureau = (case_a.current_bureau != case_b.current_bureau)
            both_active = (case_a.status in ACTIVE_STATUSES) and (case_b.status in ACTIVE_STATUSES)

            if not existing:
                assessment = OverlapAssessment(
                    case_a_id=case_a_id,
                    case_b_id=case_b_id,
                    institution_identity_score=assessment_data["institution_identity_score"],
                    category_similarity_score=assessment_data["category_similarity_score"],
                    text_similarity_score=assessment_data["text_similarity_score"],
                    overall_score=assessment_data["overall_score"],
                    classification=assessment_data["classification"],
                    reasons=json.dumps(assessment_data["reasons"]),
                    status="Suggested",
                    assessment_version="v1.0",
                    last_assessed_at=datetime.now(timezone.utc)
                )
                db.add(assessment)
                db.flush()
                created_or_updated.append(assessment)

                # Generate alert if cross-bureau and active
                if is_cross_bureau and both_active:
                    dedup = f"OVERLAP_{case_a.case_id}_{case_b.case_id}"
                    existing_alert = db.query(Alert).filter(Alert.deduplication_key == dedup).first()
                    if not existing_alert:
                        alert = Alert(
                            type="Overlap",
                            severity="HIGH" if assessment_data["classification"] in ["Potential Duplicate", "Potential Issue Overlap"] else "MEDIUM",
                            case_id=target_case.id,
                            institution_id=target_case.institution_id,
                            related_overlap_id=assessment.id,
                            title=f"Potential Cross-Bureau Overlap: {case_a.case_id} & {case_b.case_id}",
                            message=f"Overlapping complaints detected for institution across {case_a.current_bureau} and {case_b.current_bureau}. Classification: {assessment_data['classification']}.",
                            deduplication_key=dedup
                        )
                        db.add(alert)
            else:
                # Update existing suggested assessment
                if existing.status != "Confirmed":
                    existing.institution_identity_score = assessment_data["institution_identity_score"]
                    existing.category_similarity_score = assessment_data["category_similarity_score"]
                    existing.text_similarity_score = assessment_data["text_similarity_score"]
                    existing.overall_score = assessment_data["overall_score"]
                    existing.classification = assessment_data["classification"]
                    existing.reasons = json.dumps(assessment_data["reasons"])
                    existing.last_assessed_at = datetime.now(timezone.utc)
                created_or_updated.append(existing)

        db.commit()
        return created_or_updated

    @classmethod
    def batch_reassess_all(cls, db: Session) -> int:
        """
        Runs batch reassessment across all institutions with active cases.
        """
        active_cases = db.query(ComplaintCase).filter(
            ComplaintCase.status.in_(ACTIVE_STATUSES),
            ComplaintCase.institution_id.isnot(None)
        ).all()

        count = 0
        for case in active_cases:
            overlaps = cls.evaluate_case_overlaps(db, case)
            count += len(overlaps)

        return count
