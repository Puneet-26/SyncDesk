from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter()

@router.get("/data")
def get_report_data(
    report_type: str = Query("detailed_cases"),
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ReportService.generate_report_data(
        db=db,
        report_type=report_type,
        bureau=bureau,
        region=region,
        status=status,
        category=category,
        date_from=date_from,
        date_to=date_to
    )

@router.get("/export/csv")
def export_report_csv(
    report_type: str = Query("detailed_cases"),
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report_data = ReportService.generate_report_data(
        db=db,
        report_type=report_type,
        bureau=bureau,
        region=region,
        status=status,
        category=category,
        date_from=date_from,
        date_to=date_to
    )
    csv_content = ReportService.export_csv(report_data)
    filename = f"aicte_report_{report_type}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
def export_report_pdf(
    report_type: str = Query("detailed_cases"),
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report_data = ReportService.generate_report_data(
        db=db,
        report_type=report_type,
        bureau=bureau,
        region=region,
        status=status,
        category=category,
        date_from=date_from,
        date_to=date_to
    )
    pdf_bytes = ReportService.export_pdf(report_data)
    filename = f"aicte_report_{report_type}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
