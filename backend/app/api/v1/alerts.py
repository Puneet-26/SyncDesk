from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alert import AlertResponse, ResolveAlertRequest

router = APIRouter()

@router.get("/")
def list_alerts(
    type_filter: Optional[str] = None,
    severity: Optional[str] = None,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)

    if type_filter and type_filter != "All":
        query = query.filter(Alert.type == type_filter)

    if severity and severity != "All":
        query = query.filter(Alert.severity == severity)

    if unread_only:
        query = query.filter(Alert.read_at.is_(None))

    total = query.count()
    alerts = query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "unread_count": db.query(Alert).filter(Alert.read_at.is_(None)).count(),
        "items": [a.to_dict() for a in alerts]
    }

@router.post("/{id}/read")
def mark_alert_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Alert marked as read.", "id": id}

@router.post("/read-all")
def mark_all_alerts_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Alert).filter(Alert.read_at.is_(None)).update({"read_at": datetime.now(timezone.utc)})
    db.commit()
    return {"message": "All alerts marked as read."}

@router.post("/{id}/resolve")
def resolve_alert(
    id: int,
    req: ResolveAlertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved_at = datetime.now(timezone.utc)
    if alert.read_at is None:
        alert.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Alert marked as resolved.", "id": id}
