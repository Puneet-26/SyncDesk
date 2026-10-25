from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.case import ComplaintCase
from app.models.alert import Alert
from app.models.overlap import OverlapAssessment
from app.core.config import settings
from apscheduler.schedulers.background import BackgroundScheduler
import logging

logger = logging.getLogger(__name__)

class SLAService:
    @staticmethod
    def run_sla_and_alert_checks(db: Session = None):
        """
        Idempotent SLA and case monitoring check.
        Repeated runs will NOT create duplicate alerts for the same underlying condition.
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            today = datetime.now(timezone.utc).date()
            approaching_threshold = today + timedelta(days=settings.SLA_APPROACHING_DAYS)

            active_cases = db.query(ComplaintCase).filter(
                ComplaintCase.status.in_(["Pending", "Under Process", "Escalated", "Transferred"])
            ).all()

            for case in active_cases:
                if not case.sla_due_date:
                    continue

                # 1. Check SLA Breached
                if case.sla_due_date < today:
                    days_overdue = (today - case.sla_due_date).days
                    dedup = f"SLA_BREACHED_{case.case_id}_{case.sla_due_date.isoformat()}"
                    existing = db.query(Alert).filter(Alert.deduplication_key == dedup).first()
                    if not existing:
                        alert = Alert(
                            type="SLA Breached",
                            severity="CRITICAL",
                            case_id=case.id,
                            institution_id=case.institution_id,
                            recipient_user_id=case.assigned_officer_id,
                            title=f"SLA BREACHED: Case {case.case_id} ({days_overdue} days overdue)",
                            message=f"Case {case.case_id} under {case.current_bureau} has breached its prescribed SLA deadline of {case.sla_due_date.isoformat()}. Immediate escalation required.",
                            deduplication_key=dedup
                        )
                        db.add(alert)

                # 2. Check SLA Approaching
                elif case.sla_due_date <= approaching_threshold:
                    days_left = (case.sla_due_date - today).days
                    dedup = f"SLA_APPROACHING_{case.case_id}_{case.sla_due_date.isoformat()}"
                    existing = db.query(Alert).filter(Alert.deduplication_key == dedup).first()
                    if not existing:
                        alert = Alert(
                            type="SLA Approaching",
                            severity="HIGH" if days_left <= 3 else "MEDIUM",
                            case_id=case.id,
                            institution_id=case.institution_id,
                            recipient_user_id=case.assigned_officer_id,
                            title=f"SLA Approaching: Case {case.case_id} ({days_left} days remaining)",
                            message=f"Case {case.case_id} under {case.current_bureau} will breach SLA on {case.sla_due_date.isoformat()}. Next action: '{case.next_action}'.",
                            deduplication_key=dedup
                        )
                        db.add(alert)

                # 3. Check Pending Reminder (No action for > 7 days on Pending case)
                if case.status == "Pending":
                    days_idle = (today - case.date_received).days
                    if days_idle >= 7:
                        dedup = f"PENDING_REMINDER_{case.case_id}_{today.strftime('%Y%W')}"  # Weekly reminder
                        existing = db.query(Alert).filter(Alert.deduplication_key == dedup).first()
                        if not existing:
                            alert = Alert(
                                type="Pending Reminder",
                                severity="MEDIUM",
                                case_id=case.id,
                                institution_id=case.institution_id,
                                recipient_user_id=case.assigned_officer_id,
                                title=f"Pending Case Reminder: {case.case_id} ({days_idle} days pending)",
                                message=f"Case {case.case_id} received on {case.date_received.isoformat()} remains in 'Pending' status. Officer review needed.",
                                deduplication_key=dedup
                            )
                            db.add(alert)

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error in run_sla_and_alert_checks: {e}")
        finally:
            if close_db:
                db.close()

# Global background scheduler
scheduler = BackgroundScheduler()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            SLAService.run_sla_and_alert_checks,
            "interval",
            minutes=10,
            id="sla_alert_checker",
            replace_existing=True
        )
        scheduler.start()
        logger.info("Background SLA scheduler started successfully.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background SLA scheduler stopped.")
