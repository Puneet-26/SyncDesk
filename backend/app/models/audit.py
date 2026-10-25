import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    entity_type = Column(String(50), nullable=False, index=True)  # CASE, INSTITUTION, OVERLAP, COORDINATION, USER
    entity_id = Column(String(100), nullable=False, index=True)
    operation = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, TRANSFER, ESCALATE, DISPOSE, REOPEN, CONFIRM_OVERLAP, DISMISS_OVERLAP
    before_state = Column(Text, nullable=True)  # JSON
    after_state = Column(Text, nullable=True)  # JSON
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    actor = relationship("User", foreign_keys=[actor_user_id])

    def to_dict(self):
        before = None
        after = None
        try:
            if self.before_state:
                before = json.loads(self.before_state)
        except Exception:
            before = self.before_state
        try:
            if self.after_state:
                after = json.loads(self.after_state)
        except Exception:
            after = self.after_state

        return {
            "id": self.id,
            "actor_user_id": self.actor_user_id,
            "actor_name": self.actor.name if self.actor else "System",
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "operation": self.operation,
            "before_state": before,
            "after_state": after,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
