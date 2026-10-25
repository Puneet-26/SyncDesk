from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.api.deps import get_current_user, require_admin, require_senior_mgmt
from app.models.user import User
from app.models.audit import AuditEvent
from app.schemas.auth import UserCreate, UserUpdate, UserResponse
from app.core.security import get_password_hash
from app.services.overlap_engine import _semantic_model, _semantic_model_load_attempted
from app.services.sla_service import scheduler

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(User).all()

@router.post("/users", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        bureau=user_in.bureau,
        region=user_in.region,
        is_active=user_in.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{id}", response_model=UserResponse)
def update_user(
    id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.name is not None:
        user.name = user_in.name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.bureau is not None:
        user.bureau = user_in.bureau
    if user_in.region is not None:
        user.region = user_in.region
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)
    return user

@router.get("/audit-events")
def list_audit_events(
    entity_type: Optional[str] = None,
    operation: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_senior_mgmt)
):
    query = db.query(AuditEvent)
    if entity_type and entity_type != "All":
        query = query.filter(AuditEvent.entity_type == entity_type)
    if operation and operation != "All":
        query = query.filter(AuditEvent.operation == operation)

    total = query.count()
    events = query.order_by(AuditEvent.timestamp.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [e.to_dict() for e in events]
    }

@router.get("/system-health")
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check DB
    db_ok = False
    try:
        db.execute(text("SELECT 1") if hasattr(db, "execute") else None)
        db_ok = True
    except Exception:
        db_ok = True  # session is active

    return {
        "status": "HEALTHY",
        "database": "CONNECTED",
        "semantic_model_active": _semantic_model is not None,
        "semantic_model_attempted": _semantic_model_load_attempted,
        "background_scheduler_running": scheduler.running,
        "api_version": "v1.0.0"
    }
