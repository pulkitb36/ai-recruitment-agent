import json
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

REPORTS_DIR = "./generated_reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

def generate_pdf_report(candidate, report, session):
    filename = f"{REPORTS_DIR}/report_{candidate['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    doc    = SimpleDocTemplate(filename, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    title_style = ParagraphStyle("Title", parent=styles["Title"], fontSize=20, textColor=colors.HexColor("#1a1a2e"))
    head_style  = ParagraphStyle("Head",  parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#16213e"))
    body_style  = ParagraphStyle("Body",  parent=styles["Normal"],   fontSize=10, leading=14)

    story.append(Paragraph("AI Recruitment Report", title_style))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(f"Candidate: {candidate.get('name', 'N/A')}", head_style))
    story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", body_style))
    story.append(Paragraph(f"Duration: {session.get('duration_secs', 0) // 60} minutes", body_style))
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("Scores", head_style))
    score_data = [
        ["Category", "Score"],
        ["Overall", f"{report.get('overall_score', 0):.0f}/100"],
        ["Technical Skills", f"{report.get('technical_score', 0):.0f}/100"],
        ["Communication", f"{report.get('communication_score', 0):.0f}/100"],
        ["Problem Solving", f"{report.get('problem_solving', 0):.0f}/100"],
        ["Confidence", f"{report.get('confidence_score', 0):.0f}/100"],
        ["Role Fit", f"{report.get('role_fit_score', 0):.0f}/100"],
    ]
    table = Table(score_data, colWidths=[10*cm, 5*cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#16213e")),
        ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
        ("FONTSIZE",   (0,0), (-1,-1), 10),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f0f4ff"), colors.white]),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#cccccc")),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("Strengths", head_style))
    for s in json.loads(report.get("strengths", "[]")) if isinstance(report.get("strengths"), str) else report.get("strengths", []):
        story.append(Paragraph(f"- {s}", body_style))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Weaknesses", head_style))
    for w in json.loads(report.get("weaknesses", "[]")) if isinstance(report.get("weaknesses"), str) else report.get("weaknesses", []):
        story.append(Paragraph(f"- {w}", body_style))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Areas for Improvement", head_style))
    for i in json.loads(report.get("improvements", "[]")) if isinstance(report.get("improvements"), str) else report.get("improvements", []):
        story.append(Paragraph(f"- {i}", body_style))
    story.append(Spacer(1, 0.5*cm))

    rec   = report.get("recommendation", "Consider")
    color = {"Strong Hire": "#1a7a4a", "Hire": "#2e86ab", "Consider": "#e07b39", "Reject": "#c0392b"}.get(rec, "#333333")
    rec_style = ParagraphStyle("Rec", parent=styles["Normal"], fontSize=14, fontName="Helvetica-Bold", textColor=colors.HexColor(color))

    story.append(Paragraph("Hiring Recommendation", head_style))
    story.append(Paragraph(rec, rec_style))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(report.get("explanation", ""), body_style))

    doc.build(story)
    return filename