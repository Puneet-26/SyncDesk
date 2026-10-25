from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class ComplaintCase(Base):
    __tablename__ = "complaint_cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)
    raw_institution_name = Column(String(255), nullable=False)
    external_reference = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    date_received = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    status = Column(String(50), default="Pending", nullable=False, index=True)  # Pending, Under Process, Disposed, Transferred, Escalated
    current_bureau = Column(String(100), nullable=False, index=True)  # Regulation Bureau (RB), Public Grievance Redressal Cell (PGRC), Regional Office (RO), Approval Bureau
    assigned_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_action = Column(String(255), default="Complaint Logged in System", nullable=False)
    next_action = Column(String(255), default="Initial Review & Bureau Verification", nullable=False)
    last_action_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expected_disposal_date = Column(Date, nullable=True)
    sla_due_date = Column(Date, nullable=False, index=True)
    sla_days = Column(Integer, default=30, nullable=False)
    closure_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    institution = relationship("Institution", back_populates="cases")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    action_history = relationship("ActionHistory", back_populates="case", cascade="all, delete-orphan", order_by="ActionHistory.timestamp.desc()")

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "institution_id": self.institution_id,
            "institution_name": self.institution.official_name if self.institution else self.raw_institution_name,
            "aicte_permanent_id": self.institution.aicte_permanent_id if self.institution else None,
            "raw_institution_name": self.raw_institution_name,
            "external_reference": self.external_reference,
            "category": self.category,
            "description": self.description,
            "priority": self.priority,
            "date_received": self.date_received.isoformat() if self.date_received else None,
            "status": self.status,
            "current_bureau": self.current_bureau,
            "assigned_officer_id": self.assigned_officer_id,
            "assigned_officer_name": self.assigned_officer.name if self.assigned_officer else None,
            "last_action": self.last_action,
            "next_action": self.next_action,
            "last_action_date": self.last_action_date.isoformat() if self.last_action_date else None,
            "expected_disposal_date": self.expected_disposal_date.isoformat() if self.expected_disposal_date else None,
            "sla_due_date": self.sla_due_date.isoformat() if self.sla_due_date else None,
            "sla_days": self.sla_days,
            "closure_remarks": self.closure_remarks,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class ActionHistory(Base):
    __tablename__ = "action_histories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    bureau = Column(String(100), nullable=False)
    action_type = Column(String(50), nullable=False)  # CREATION, STATUS_CHANGE, ASSIGNMENT, TRANSFER, ESCALATION, OVERLAP_DECISION, DISPOSAL, REOPEN, ACTION_NOTE
    remarks = Column(Text, nullable=False)
    attachment_reference = Column(String(255), nullable=True)
    from_bureau = Column(String(100), nullable=True)
    to_bureau = Column(String(100), nullable=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    case = relationship("ComplaintCase", back_populates="action_history")
    actor = relationship("User", foreign_keys=[actor_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "actor_user_id": self.actor_user_id,
            "actor_name": self.actor.name if self.actor else "System",
            "bureau": self.bureau,
            "action_type": self.action_type,
            "remarks": self.remarks,
            "attachment_reference": self.attachment_reference,
            "from_bureau": self.from_bureau,
            "to_bureau": self.to_bureau,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
