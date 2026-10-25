from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class CoordinationRecord(Base):
    __tablename__ = "coordination_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    coordination_status = Column(String(50), default="Open", nullable=False, index=True)  # Open, In Progress, Resolved, Closed
    responsible_officer_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    target_review_date = Column(Date, nullable=False)
    resolution_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    responsible_officer = relationship("User", foreign_keys=[responsible_officer_id])
    linked_cases = relationship("CoordinationCase", back_populates="coordination", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "coordination_status": self.coordination_status,
            "responsible_officer_id": self.responsible_officer_id,
            "responsible_officer_name": self.responsible_officer.name if self.responsible_officer else None,
            "target_review_date": self.target_review_date.isoformat() if self.target_review_date else None,
            "resolution_summary": self.resolution_summary,
            "linked_cases": [lc.to_dict() for lc in self.linked_cases],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class CoordinationCase(Base):
    __tablename__ = "coordination_cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    coordination_id = Column(Integer, ForeignKey("coordination_records.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    bureau = Column(String(100), nullable=False)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    coordination = relationship("CoordinationRecord", back_populates="linked_cases")
    case = relationship("ComplaintCase")

    def to_dict(self):
        return {
            "id": self.id,
            "coordination_id": self.coordination_id,
            "case_id": self.case_id,
            "case_number": self.case.case_id if self.case else None,
            "case_status": self.case.status if self.case else None,
            "category": self.case.category if self.case else None,
            "bureau": self.bureau,
            "added_at": self.added_at.isoformat() if self.added_at else None,
        }
