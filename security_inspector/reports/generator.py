from fpdf import FPDF
import datetime

class SecurityReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Local Security Inspector - Audit Report', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_report(data: dict, output_path: str):
    """
    Generates a PDF report from scan data.
    data structure: {
        'processes': [],
        'ports': [],
        'startup': [],
        'files': []
    }
    """
    pdf = SecurityReport()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    pdf.cell(0, 10, f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
    pdf.ln(5)

    # Section: Processes
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "1. Unsigned / Suspicious Processes", ln=True)
    pdf.set_font("Arial", size=10)
    for p in data.get('processes', []):
        if not p.get('signed'):
            pdf.cell(0, 10, f"- {p['name']} (PID: {p['pid']}) Path: {p['path']}", ln=True)

    # Section: Startup Items
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "3. Startup Programs", ln=True)
    pdf.set_font("Arial", size=10)
    for item in data.get('startup', []):
        pdf.cell(0, 10, f"- {item['name']} ({item['location']})", ln=True)
        pdf.set_font("Arial", 'I', 8)
        pdf.cell(0, 5, f"  Cmd: {item['command']}", ln=True)
        pdf.set_font("Arial", size=10)

    # Section: Quarantine History
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "4. Quarantined Files", ln=True)
    pdf.set_font("Arial", size=10)
    q_items = data.get('quarantine', {})
    if not q_items:
        pdf.cell(0, 10, "No files currently in quarantine.", ln=True)
    for name, info in q_items.items():
        pdf.cell(0, 10, f"- {name} (Original: {info['original_path']})", ln=True)

    # Disclaimer
    pdf.ln(10)
    pdf.set_font("Arial", 'I', 8)
    pdf.multi_cell(0, 5, "DISCLAIMER: This report is for informational purposes only. "
                         "Local Security Inspector is an analysis tool and does not guarantee "
                         "the removal of all threats.")

    pdf.output(output_path)
    return output_path
