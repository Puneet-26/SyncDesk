import io
import csv
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.case import ComplaintCase
from app.models.institution import Institution
from app.models.overlap import OverlapAssessment

class ReportService:
    @staticmethod
    def generate_report_data(
        db: Session,
        report_type: str,
        bureau: Optional[str] = None,
        region: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict[str, Any]:
        query = db.query(ComplaintCase)
        if bureau and bureau != "All":
            query = query.filter(ComplaintCase.current_bureau == bureau)
        if region and region != "All":
            query = query.join(ComplaintCase.institution, isouter=True).filter(Institution.region == region)
        if status and status != "All":
            query = query.filter(ComplaintCase.status == status)
        if category and category != "All":
            query = query.filter(ComplaintCase.category == category)
        if date_from:
            query = query.filter(ComplaintCase.date_received >= date_from)
        if date_to:
            query = query.filter(ComplaintCase.date_received <= date_to)

        cases = query.all()
        now_str = datetime.now(timezone.utc).strftime("%d-%b-%Y %H:%M UTC")

        data: List[Dict[str, Any]] = []
        columns: List[str] = []

        if report_type == "bureau_workload":
            bureau_counts = {}
            for c in cases:
                bureau_counts[c.current_bureau] = bureau_counts.get(c.current_bureau, 0) + 1
            data = [{"Bureau": k, "Total Cases": v} for k, v in bureau_counts.items()]
            columns = ["Bureau", "Total Cases"]

        elif report_type == "status_distribution":
            status_counts = {}
            for c in cases:
                status_counts[c.status] = status_counts.get(c.status, 0) + 1
            data = [{"Status": k, "Case Count": v} for k, v in status_counts.items()]
            columns = ["Status", "Case Count"]

        elif report_type == "ageing_analysis":
            today = datetime.now(timezone.utc).date()
            buckets = {"0-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0}
            for c in cases:
                age = (today - c.date_received).days
                if age <= 30:
                    buckets["0-30 Days"] += 1
                elif age <= 60:
                    buckets["31-60 Days"] += 1
                elif age <= 90:
                    buckets["61-90 Days"] += 1
                else:
                    buckets["90+ Days"] += 1
            data = [{"Ageing Bracket": k, "Active Cases": v} for k, v in buckets.items()]
            columns = ["Ageing Bracket", "Active Cases"]

        elif report_type == "sla_compliance":
            today = datetime.now(timezone.utc).date()
            within_sla = 0
            breached = 0
            for c in cases:
                if c.status == "Disposed":
                    within_sla += 1
                elif c.sla_due_date < today:
                    breached += 1
                else:
                    within_sla += 1
            total = len(cases) or 1
            rate = round((within_sla / total) * 100, 1)
            data = [
                {"Metric": "Total Analyzed Cases", "Value": str(len(cases))},
                {"Metric": "Cases Within SLA", "Value": str(within_sla)},
                {"Metric": "Cases Breached SLA", "Value": str(breached)},
                {"Metric": "SLA Compliance Rate", "Value": f"{rate}%"}
            ]
            columns = ["Metric", "Value"]

        elif report_type == "cross_bureau_overlaps":
            overlaps = db.query(OverlapAssessment).all()
            for ov in overlaps:
                data.append({
                    "Assessment ID": f"OV-{ov.id:04d}",
                    "Case A": ov.case_a.case_id if ov.case_a else "N/A",
                    "Case B": ov.case_b.case_id if ov.case_b else "N/A",
                    "Bureau A": ov.case_a.current_bureau if ov.case_a else "N/A",
                    "Bureau B": ov.case_b.current_bureau if ov.case_b else "N/A",
                    "Classification": ov.classification,
                    "Similarity Score": f"{int(ov.overall_score * 100)}%",
                    "Status": ov.status
                })
            columns = ["Assessment ID", "Case A", "Case B", "Bureau A", "Bureau B", "Classification", "Similarity Score", "Status"]

        else:
            # Default detailed case list
            for c in cases[:100]:
                data.append({
                    "Case ID": c.case_id,
                    "Institution": c.institution.official_name if c.institution else c.raw_institution_name,
                    "Bureau": c.current_bureau,
                    "Category": c.category,
                    "Status": c.status,
                    "Priority": c.priority,
                    "Date Received": c.date_received.isoformat() if c.date_received else "N/A",
                    "SLA Due": c.sla_due_date.isoformat() if c.sla_due_date else "N/A",
                })
            columns = ["Case ID", "Institution", "Bureau", "Category", "Status", "Priority", "Date Received", "SLA Due"]

        return {
            "title": f"AICTE Regulatory Report: {report_type.replace('_', ' ').title()}",
            "generated_at": now_str,
            "total_records": len(data),
            "columns": columns,
            "data": data,
            "filters_applied": {
                "bureau": bureau or "All",
                "region": region or "All",
                "status": status or "All",
                "category": category or "All",
                "date_from": date_from.isoformat() if date_from else "N/A",
                "date_to": date_to.isoformat() if date_to else "N/A",
            }
        }

    @staticmethod
    def export_csv(report_data: Dict[str, Any]) -> str:
        output = io.StringIO()
        # Add UTF-8 BOM for Excel compatibility
        output.write("\ufeff")
        writer = csv.writer(output)

        writer.writerow(["# " + report_data["title"]])
        writer.writerow(["# Generated At", report_data["generated_at"]])
        writer.writerow(["# Total Records", report_data["total_records"]])
        writer.writerow([])

        columns = report_data.get("columns", [])
        writer.writerow(columns)

        for row in report_data.get("data", []):
            writer.writerow([row.get(col, "") for col in columns])

        return output.getvalue()

    @staticmethod
    def export_pdf(report_data: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "TitleStyle",
            parent=styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f2942")  # AICTE Navy
        )
        meta_style = ParagraphStyle(
            "MetaStyle",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4a5568")
        )

        story = []
        story.append(Paragraph(report_data["title"], title_style))
        story.append(Spacer(1, 6))
        story.append(Paragraph(f"Generated On: {report_data['generated_at']} | Total Records: {report_data['total_records']}", meta_style))
        story.append(Spacer(1, 12))

        columns = report_data.get("columns", [])
        table_data = [columns]

        for item in report_data.get("data", [])[:60]:  # Cap for clean PDF pages
            row = [str(item.get(col, ""))[:35] for col in columns]
            table_data.append(row)

        if table_data:
            col_width = (doc.width) / len(columns)
            t = Table(table_data, colWidths=[col_width] * len(columns))
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f2942")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]))
            story.append(t)

        doc.build(story)
        return buffer.getvalue()
