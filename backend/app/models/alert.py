from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type = Column(String(50), nullable=False, index=True)  # Overlap, Pending Reminder, Escalation, SLA Approaching, SLA Breached, Institution Resolution Required
    severity = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    case_id = Column(Integer, ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    related_overlap_id = Column(Integer, ForeignKey("overlap_assessments.id", ondelete="CASCADE"), nullable=True, index=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    deduplication_key = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    read_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    case = relationship("ComplaintCase")
    institution = relationship("Institution")
    related_overlap = relationship("OverlapAssessment")
    recipient = relationship("User", foreign_keys=[recipient_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "case_id": self.case_id,
            "case_number": self.case.case_id if self.case else None,
            "institution_id": self.institution_id,
            "institution_name": self.institution.official_name if self.institution else None,
            "related_overlap_id": self.related_overlap_id,
            "recipient_user_id": self.recipient_user_id,
            "title": self.title,
            "message": self.message,
            "deduplication_key": self.deduplication_key,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "is_read": self.read_at is not None,
            "is_resolved": self.resolved_at is not None,
        }
