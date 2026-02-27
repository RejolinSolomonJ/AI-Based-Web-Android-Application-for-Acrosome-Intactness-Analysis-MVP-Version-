"""
Generate a PDF report for a single image analysis.
Usage: python generate_report.py <image_path>
"""
import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fpdf import FPDF


class AcrosomeReport(FPDF):
    """Custom PDF with professional header and footer."""

    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(25, 60, 120)
        self.cell(0, 10, "Acrosome Intactness Analysis Report", align="C",
                  new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(25, 60, 120)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(
            0, 10,
            f"Page {self.page_no()}/{{nb}} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Acrosome AI Analysis System",
            align="C",
        )


def generate_report(image_path: str):
    """Analyze image and generate a professional PDF report."""

    # ── Step 1: Load model and run prediction ────────────────────
    print("[1/3] Loading model and running analysis...")
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    from app.ml.predict import predict_single, get_model_info
    result = predict_single(image_bytes)
    model_info = get_model_info()

    print(f"  Result: {result['classification'].upper()} ({result['confidence']*100:.1f}%)")

    # ── Step 2: Build PDF ────────────────────────────────────────
    print("[2/3] Generating PDF report...")

    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    pdf = AcrosomeReport()
    pdf.alias_nb_pages()
    pdf.add_page()

    # ═══ Section 1: Session Information ═══
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(25, 60, 120)
    pdf.cell(0, 10, "1. Session Information", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_text_color(0, 0, 0)
    info = [
        ("Session ID", session_id),
        ("Date & Time", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("Image File", os.path.basename(image_path)),
        ("Model", model_info.get("model_name", "AcrosomeMobileNet")),
        ("Model Status", model_info.get("status", "loaded")),
        ("Total Parameters", f"{model_info.get('total_params', 0):,}"),
    ]

    for label, value in info:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(55, 7, f"{label}:", new_x="END")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 7, str(value), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

    # ═══ Section 2: Analysis Result ═══
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(25, 60, 120)
    pdf.cell(0, 10, "2. Analysis Result", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Big classification result
    if result["classification"] == "intact":
        pdf.set_text_color(34, 139, 34)
        status_text = "INTACT"
        status_desc = "The acrosome appears intact and well-formed."
    else:
        pdf.set_text_color(200, 50, 50)
        status_text = "DAMAGED"
        status_desc = "The acrosome appears damaged or compromised."

    pdf.set_font("Helvetica", "B", 32)
    pdf.cell(0, 18, status_text, align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 8, f"Confidence: {result['confidence']*100:.1f}%", align="C",
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 7, status_desc, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Visual confidence bar
    bar_x = 30
    bar_y = pdf.get_y()
    bar_width = 150
    bar_height = 14

    # Labels above bar
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(34, 139, 34)
    pdf.set_x(bar_x)
    pdf.cell(bar_width / 2, 6, f"Intact: {result['intact_probability']*100:.1f}%", align="L")
    pdf.set_text_color(200, 50, 50)
    pdf.cell(bar_width / 2, 6, f"Damaged: {result['damaged_probability']*100:.1f}%", align="R",
             new_x="LMARGIN", new_y="NEXT")

    bar_y = pdf.get_y()

    # Background (damaged - red)
    pdf.set_fill_color(220, 80, 80)
    pdf.rect(bar_x, bar_y, bar_width, bar_height, "F")

    # Foreground (intact - green)
    intact_width = bar_width * result["intact_probability"]
    pdf.set_fill_color(50, 180, 80)
    pdf.rect(bar_x, bar_y, intact_width, bar_height, "F")

    # Border
    pdf.set_draw_color(100, 100, 100)
    pdf.rect(bar_x, bar_y, bar_width, bar_height, "D")

    pdf.ln(bar_height + 8)

    # Detailed metrics table
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(25, 60, 120)
    pdf.cell(0, 10, "3. Detailed Metrics", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    # Table header
    col_widths = [70, 60]
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(25, 60, 120)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(col_widths[0], 8, "Metric", border=1, fill=True, align="C", new_x="END")
    pdf.cell(col_widths[1], 8, "Value", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(0, 0, 0)

    metrics = [
        ("Classification", result["classification"].upper()),
        ("Confidence", f"{result['confidence']*100:.1f}%"),
        ("Intact Probability", f"{result['intact_probability']*100:.1f}%"),
        ("Damaged Probability", f"{result['damaged_probability']*100:.1f}%"),
        ("Processing Time", f"{result['processing_time_ms']:.1f} ms"),
    ]

    for i, (label, value) in enumerate(metrics):
        if i % 2 == 0:
            pdf.set_fill_color(240, 245, 255)
        else:
            pdf.set_fill_color(255, 255, 255)

        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(col_widths[0], 7, label, border=1, fill=True, new_x="END")
        pdf.set_font("Helvetica", "", 10)

        # Color code the classification value
        if label == "Classification":
            if value == "INTACT":
                pdf.set_text_color(34, 139, 34)
            else:
                pdf.set_text_color(200, 50, 50)

        pdf.cell(col_widths[1], 7, value, border=1, fill=True, align="C",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    pdf.ln(5)

    # ═══ Section 4: Analyzed Image ═══
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(25, 60, 120)
    pdf.cell(0, 10, "4. Analyzed Image", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    try:
        # Try to embed the image
        img_x = 30
        img_y = pdf.get_y()
        available_height = 260 - img_y  # Leave room for footer
        img_height = min(available_height, 100)

        pdf.image(image_path, x=img_x, y=img_y, w=150, h=0)
        pdf.ln(img_height + 5)
    except Exception as e:
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(128, 128, 128)
        pdf.cell(0, 7, f"[Image could not be embedded: {e}]",
                 new_x="LMARGIN", new_y="NEXT")

    # ═══ Section 5: Clinical Notes ═══
    if pdf.get_y() > 230:
        pdf.add_page()

    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(25, 60, 120)
    pdf.cell(0, 10, "5. Clinical Interpretation", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(0, 0, 0)

    if result["classification"] == "intact":
        interpretation = (
            "The AI model classified the sperm acrosome in this microscopy image as INTACT "
            f"with {result['confidence']*100:.1f}% confidence. "
            "The acrosomal cap appears complete and well-defined, with uniform staining pattern "
            "consistent with an intact acrosome membrane. "
            "An intact acrosome is essential for successful fertilization as it contains "
            "the enzymes needed to penetrate the zona pellucida of the oocyte."
        )
    else:
        interpretation = (
            "The AI model classified the sperm acrosome in this microscopy image as DAMAGED "
            f"with {result['confidence']*100:.1f}% confidence. "
            "The acrosomal region shows signs of compromise - the cap may appear irregular, "
            "patchy, or absent. "
            "A damaged acrosome may reduce the sperm's ability to penetrate the oocyte, "
            "potentially affecting fertilization outcomes."
        )

    pdf.multi_cell(0, 6, interpretation)
    pdf.ln(5)

    # ═══ Disclaimer ═══
    pdf.ln(5)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(128, 128, 128)
    pdf.multi_cell(0, 4, (
        "DISCLAIMER: This report was generated by an AI-based analysis system using a "
        "Convolutional Neural Network (MobileNetV2). Results are intended to assist clinical "
        "decision-making and should NOT be used as the sole basis for diagnosis or treatment. "
        "Always consult a qualified reproductive specialist for final assessment. "
        "Model accuracy is dependent on training data quality and quantity."
    ))

    # ── Save PDF ──────────────────────────────────────────────────
    reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
    os.makedirs(reports_dir, exist_ok=True)

    report_name = f"report_{session_id}_{uuid.uuid4().hex[:6]}.pdf"
    report_path = os.path.join(reports_dir, report_name)
    pdf.output(report_path)

    print(f"[3/3] Report saved to: {report_path}")
    print(f"\n[OK] Analysis complete! Open the PDF to view the full report.")
    return report_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_report.py <image_path>")
        sys.exit(1)

    generate_report(sys.argv[1])
