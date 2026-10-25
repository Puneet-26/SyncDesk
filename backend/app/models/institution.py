from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    aicte_permanent_id = Column(String(50), unique=True, index=True, nullable=True)
    official_name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), index=True, nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)  # Northern, Western, Southern, Eastern, Central, etc.
    institution_type = Column(String(100), nullable=False, default="Engineering & Technology")
    identity_verification_status = Column(String(50), nullable=False, default="VERIFIED")  # VERIFIED, PROBABLE, UNRESOLVED, CONFLICTING
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    aliases = relationship("InstitutionAlias", back_populates="institution", cascade="all, delete-orphan")
    cases = relationship("ComplaintCase", back_populates="institution")

    def to_dict(self):
        return {
            "id": self.id,
            "aicte_permanent_id": self.aicte_permanent_id,
            "official_name": self.official_name,
            "normalized_name": self.normalized_name,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "region": self.region,
            "institution_type": self.institution_type,
            "identity_verification_status": self.identity_verification_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class InstitutionAlias(Base):
    __tablename__ = "institution_aliases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    alias = Column(String(255), nullable=False)
    normalized_alias = Column(String(255), index=True, nullable=False)
    source = Column(String(100), default="PORTAL_FILING", nullable=False)
    verification_status = Column(String(50), default="VERIFIED", nullable=False)  # VERIFIED, PENDING_REVIEW, REJECTED
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    institution = relationship("Institution", back_populates="aliases")

    def to_dict(self):
        return {
            "id": self.id,
            "institution_id": self.institution_id,
            "alias": self.alias,
            "normalized_alias": self.normalized_alias,
            "source": self.source,
            "verification_status": self.verification_status,
            "verified_by": self.verified_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
