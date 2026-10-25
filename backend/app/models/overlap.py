import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class OverlapAssessment(Base):
    __tablename__ = "overlap_assessments"
    __table_args__ = (
        UniqueConstraint("case_a_id", "case_b_id", name="uq_overlap_case_pair"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_a_id = Column(Integer, ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    case_b_id = Column(Integer, ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_identity_score = Column(Float, nullable=False, default=1.0)
    category_similarity_score = Column(Float, nullable=False, default=0.0)
    text_similarity_score = Column(Float, nullable=False, default=0.0)
    overall_score = Column(Float, nullable=False, default=0.0)
    classification = Column(String(50), nullable=False)  # 'Institution Overlap', 'Potential Issue Overlap', 'Potential Duplicate'
    reasons = Column(Text, nullable=False)  # JSON-encoded explainability payload
    status = Column(String(50), default="Suggested", nullable=False, index=True)  # Suggested, Confirmed, Dismissed
    dismissed_reason = Column(Text, nullable=True)
    dismissed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assessment_version = Column(String(20), default="v1.0", nullable=False)
    last_assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    case_a = relationship("ComplaintCase", foreign_keys=[case_a_id])
    case_b = relationship("ComplaintCase", foreign_keys=[case_b_id])
    dismissed_user = relationship("User", foreign_keys=[dismissed_by])
    confirmed_user = relationship("User", foreign_keys=[confirmed_by])

    def get_parsed_reasons(self):
        try:
            return json.loads(self.reasons) if self.reasons else {}
        except Exception:
            return {"raw": self.reasons}

    def to_dict(self):
        return {
            "id": self.id,
            "case_a_id": self.case_a_id,
            "case_b_id": self.case_b_id,
            "case_a": self.case_a.to_dict() if self.case_a else None,
            "case_b": self.case_b.to_dict() if self.case_b else None,
            "institution_identity_score": self.institution_identity_score,
            "category_similarity_score": self.category_similarity_score,
            "text_similarity_score": self.text_similarity_score,
            "overall_score": self.overall_score,
            "classification": self.classification,
            "reasons": self.get_parsed_reasons(),
            "status": self.status,
            "dismissed_reason": self.dismissed_reason,
            "dismissed_by": self.dismissed_by,
            "dismissed_by_name": self.dismissed_user.name if self.dismissed_user else None,
            "confirmed_by": self.confirmed_by,
            "confirmed_by_name": self.confirmed_user.name if self.confirmed_user else None,
            "assessment_version": self.assessment_version,
            "last_assessed_at": self.last_assessed_at.isoformat() if self.last_assessed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
