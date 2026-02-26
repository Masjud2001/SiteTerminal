import sys
import os
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QTabWidget, QPushButton, QTableWidget, 
                             QTableWidgetItem, QLabel, QFileDialog, QMessageBox,
                             QHeaderView)
from PyQt6.QtCore import Qt, QSize, QThread, pyqtSignal
from PyQt6.QtGui import QIcon

from core.process_viewer import ProcessAnalyzer
from core.port_scanner import PortScanner
from core.startup_manager import StartupAnalyzer
from core.scanner import FileScanner
from core.quarantine import QuarantineManager
from core.audit import SystemAuditor
from core.network_monitor import NetworkMonitor
from reports.generator import generate_report

class ScanThread(QThread):
    finished = pyqtSignal(dict)
    
    def run(self):
        """Perform a quick initial system scan."""
        data = {
            'processes': ProcessAnalyzer.get_running_processes(),
            'ports': PortScanner.get_listening_ports(),
            'startup': StartupAnalyzer.get_startup_items(),
            'quarantine': QuarantineManager().list_quarantine()
        }
        self.finished.emit(data)

class SecurityDashboard(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Local Security Inspector")
        self.setMinimumSize(1000, 700)
        
        # Load Styles
        style_path = os.path.join(os.path.dirname(__file__), "styles.css")
        if os.path.exists(style_path):
            with open(style_path, "r") as f:
                self.setStyleSheet(f.read())

        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.layout = QVBoxLayout(self.central_widget)

        # Header Section
        header_layout = QHBoxLayout()
        self.header = QLabel("Local Security Inspector")
        self.header.setObjectName("title")
        header_layout.addWidget(self.header)
        
        self.health_label = QLabel("Initial Scan in progress...")
        self.health_label.setStyleSheet("color: #94a3b8; font-style: italic;")
        header_layout.addWidget(self.health_label)
        
        btn_report = QPushButton("Generate Audit PDF")
        btn_report.clicked.connect(self.export_report)
        header_layout.addWidget(btn_report)
        
        self.layout.addLayout(header_layout)

        # Tabs
        self.tabs = QTabWidget()
        self.layout.addWidget(self.tabs)

        self.init_process_tab()
        self.init_port_tab()
        self.init_network_tab()
        self.init_audit_tab()
        self.init_startup_tab()
        self.init_file_tab()
        self.init_quarantine_tab()
        self.init_privacy_tab()

        # Start Background Initial Scan
        self.scan_thread = ScanThread()
        self.scan_thread.finished.connect(self.handle_scan_results)
        self.scan_thread.start()

    def handle_scan_results(self, data):
        """Processes the results of the initial background scan."""
        unsigned_count = sum(1 for p in data['processes'] if not p['signed'])
        risky_ports = sum(1 for p in data['ports'] if p['risk'] != "Low / Standard")
        
        status_text = f"Health check: {unsigned_count} unsigned processes, {risky_ports} risky ports found."
        self.health_label.setText(status_text)
        if unsigned_count > 0 or risky_ports > 0:
            self.health_label.setStyleSheet("color: #fbbf24; font-weight: bold;")
        else:
            self.health_label.setStyleSheet("color: #4ade80; font-weight: bold;")
            self.health_label.setText("System status: Good")

    def export_report(self):
        """Gathers data and exports a PDF report."""
        save_path, _ = QFileDialog.getSaveFileName(self, "Save Report", "Security_Audit.pdf", "PDF Files (*.pdf)")
        if save_path:
            data = {
                'processes': ProcessAnalyzer.get_running_processes(),
                'ports': PortScanner.get_listening_ports(),
                'startup': StartupAnalyzer.get_startup_items(),
                'quarantine': QuarantineManager().list_quarantine(),
                'audit': SystemAuditor.run_full_audit()
            }
            try:
                generate_report(data, save_path)
                QMessageBox.information(self, "Report Export", f"Report successfully saved to:\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Export Error", f"Failed to generate report: {str(e)}")

    def init_privacy_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        notice = QLabel(
            "<h1>Privacy & Ethical Notice</h1>"
            "<p><b>Data Collection:</b> This application only scans your local system. No data is sent to external servers except "
            "for file hashes sent to VirusTotal if you choose to scan a file.</p>"
            "<p><b>File Integrity:</b> This tool does not delete files automatically. Quarantined files are moved to a restricted "
            "folder and can be restored at any time.</p>"
            "<p><b>Compliance:</b> This tool is for personal security inspection and does NOT include any hacking or "
            "malicious features. It follows the principle of least privilege.</p>"
            "<p><b>Legal:</b> Only use this on systems you own or have explicit permission to audit.</p>"
        )
        notice.setWordWrap(True)
        notice.setTextFormat(Qt.TextFormat.RichText)
        
        layout.addWidget(notice)
        layout.addStretch()
        self.tabs.addTab(tab, "Privacy Notice")

    def init_process_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        self.proc_table = QTableWidget(0, 5)
        self.proc_table.setHorizontalHeaderLabels(["Name", "PID", "Publisher", "Signed", "Path"])
        self.proc_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        btn_refresh = QPushButton("Refresh Processes")
        btn_refresh.clicked.connect(self.refresh_processes)
        
        layout.addWidget(self.proc_table)
        layout.addWidget(btn_refresh)
        self.tabs.addTab(tab, "Running Processes")
        self.refresh_processes()

    def refresh_processes(self):
        procs = ProcessAnalyzer.get_running_processes()
        self.proc_table.setRowCount(0)
        for p in procs:
            row = self.proc_table.rowCount()
            self.proc_table.insertRow(row)
            self.proc_table.setItem(row, 0, QTableWidgetItem(p['name']))
            self.proc_table.setItem(row, 1, QTableWidgetItem(str(p['pid'])))
            self.proc_table.setItem(row, 2, QTableWidgetItem(p['publisher']))
            sign_item = QTableWidgetItem("Yes" if p['signed'] else "No")
            if not p['signed']: sign_item.setForeground(Qt.GlobalColor.red)
            self.proc_table.setItem(row, 3, sign_item)
            self.proc_table.setItem(row, 4, QTableWidgetItem(p['path']))

    def init_port_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        self.port_table = QTableWidget(0, 4)
        self.port_table.setHorizontalHeaderLabels(["Port", "Type", "PID", "Risk Level"])
        self.port_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        btn_refresh = QPushButton("Scan Local Ports")
        btn_refresh.clicked.connect(self.refresh_ports)
        
        layout.addWidget(self.port_table)
        layout.addWidget(btn_refresh)
        self.tabs.addTab(tab, "Network Audit")
        self.refresh_ports()

    def refresh_ports(self):
        ports = PortScanner.get_listening_ports()
        self.port_table.setRowCount(0)
        for p in ports:
            row = self.port_table.rowCount()
            self.port_table.insertRow(row)
            self.port_table.setItem(row, 0, QTableWidgetItem(str(p['port'])))
            self.port_table.setItem(row, 1, QTableWidgetItem(p['type']))
            self.port_table.setItem(row, 2, QTableWidgetItem(str(p['pid'])))
            risk_item = QTableWidgetItem(p['risk'])
            if p['risk'] != "Low / Standard": risk_item.setForeground(Qt.GlobalColor.yellow)
            self.port_table.setItem(row, 3, risk_item)

    def init_network_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        self.net_table = QTableWidget(0, 5)
        self.net_table.setHorizontalHeaderLabels(["Process", "PID", "Local Address", "Remote Address", "Status"])
        self.net_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        btn_refresh = QPushButton("Refresh Connections")
        btn_refresh.clicked.connect(self.refresh_connections)
        
        layout.addWidget(self.net_table)
        layout.addWidget(btn_refresh)
        self.tabs.addTab(tab, "Network Monitor")
        self.refresh_connections()

    def refresh_connections(self):
        conns = NetworkMonitor.get_active_connections()
        self.net_table.setRowCount(0)
        for c in conns:
            row = self.net_table.rowCount()
            self.net_table.insertRow(row)
            self.net_table.setItem(row, 0, QTableWidgetItem(c['process']))
            self.net_table.setItem(row, 1, QTableWidgetItem(str(c['pid'])))
            self.net_table.setItem(row, 2, QTableWidgetItem(c['local']))
            self.net_table.setItem(row, 3, QTableWidgetItem(c['remote']))
            self.net_table.setItem(row, 4, QTableWidgetItem(c['status']))

    def init_audit_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        self.audit_table = QTableWidget(0, 3)
        self.audit_table.setHorizontalHeaderLabels(["Security Check", "Status", "Risk Level"])
        self.audit_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        btn_refresh = QPushButton("Run System Audit")
        btn_refresh.clicked.connect(self.refresh_audit)
        
        layout.addWidget(self.audit_table)
        layout.addWidget(btn_refresh)
        self.tabs.addTab(tab, "System Audit")
        self.refresh_audit()

    def refresh_audit(self):
        checks = SystemAuditor.run_full_audit()
        self.audit_table.setRowCount(0)
        for c in checks:
            row = self.audit_table.rowCount()
            self.audit_table.insertRow(row)
            self.audit_table.setItem(row, 0, QTableWidgetItem(c['check']))
            self.audit_table.setItem(row, 1, QTableWidgetItem(c['value']))
            risk_item = QTableWidgetItem(c['risk'])
            if c['risk'] == "High": risk_item.setForeground(Qt.GlobalColor.red)
            elif c['risk'] == "Medium": risk_item.setForeground(Qt.GlobalColor.yellow)
            self.audit_table.setItem(row, 2, risk_item)

    def init_startup_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        self.startup_table = QTableWidget(0, 3)
        self.startup_table.setHorizontalHeaderLabels(["Name", "Location", "Command"])
        self.startup_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        btn_refresh = QPushButton("List Startup Items")
        btn_refresh.clicked.connect(self.refresh_startup)
        
        layout.addWidget(self.startup_table)
        layout.addWidget(btn_refresh)
        self.tabs.addTab(tab, "Startup Manager")
        self.refresh_startup()

    def refresh_startup(self):
        items = StartupAnalyzer.get_startup_items()
        self.startup_table.setRowCount(0)
        for itm in items:
            row = self.startup_table.rowCount()
            self.startup_table.insertRow(row)
            self.startup_table.setItem(row, 0, QTableWidgetItem(itm['name']))
            self.startup_table.setItem(row, 1, QTableWidgetItem(itm['location']))
            self.startup_table.setItem(row, 2, QTableWidgetItem(itm['command']))

    def init_file_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        self.file_label = QLabel("Select a file to analyze...")
        btn_select = QPushButton("Select File")
        btn_select.clicked.connect(self.scan_file)
        
        self.result_label = QLabel("")
        self.result_label.setWordWrap(True)
        
        layout.addWidget(self.file_label)
        layout.addWidget(btn_select)
        layout.addWidget(self.result_label)
        layout.addStretch()
        self.tabs.addTab(tab, "File Scanner")

    def scan_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Open File", "", "All Files (*)")
        if file_path:
            self.file_label.setText(f"File: {file_path}")
            sha256 = FileScanner.get_sha256(file_path)
            entropy = FileScanner.calculate_entropy(file_path)
            entropy_msg = f"Entropy: {entropy} " + ("(Suspiciously High)" if entropy > 7.2 else "(Normal)")
            
            self.result_label.setText(f"SHA256: {sha256}\n{entropy_msg}\nChecking VirusTotal...")
            
            # API Call (In real app, use a background thread)
            vt_res = FileScanner.check_virustotal(sha256)
            if vt_res['status'] == 'success':
                self.result_label.setText(f"SHA256: {sha256}\n{entropy_msg}\n\nVirusTotal Result: {vt_res['ratio']} detections.")
            else:
                self.result_label.setText(f"SHA256: {sha256}\n{entropy_msg}\n\nVirusTotal: {vt_res['message']}")

    def init_quarantine_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        self.q_manager = QuarantineManager()
        
        self.q_table = QTableWidget(0, 2)
        self.q_table.setHorizontalHeaderLabels(["Filename", "Original Path"])
        self.q_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        btn_refresh = QPushButton("Refresh Quarantine")
        btn_refresh.clicked.connect(self.refresh_quarantine)
        
        btn_restore = QPushButton("Restore Selected")
        btn_restore.clicked.connect(self.restore_selected)
        
        layout.addWidget(self.q_table)
        layout.addWidget(btn_refresh)
        layout.addWidget(btn_restore)
        self.tabs.addTab(tab, "Quarantine")
        self.refresh_quarantine()

    def refresh_quarantine(self):
        items = self.q_manager.list_quarantine()
        self.q_table.setRowCount(0)
        for name, info in items.items():
            row = self.q_table.rowCount()
            self.q_table.insertRow(row)
            self.q_table.setItem(row, 0, QTableWidgetItem(name))
            self.q_table.setItem(row, 1, QTableWidgetItem(info['original_path']))

    def restore_selected(self):
        curr = self.q_table.currentRow()
        if curr >= 0:
            name = self.q_table.item(curr, 0).text()
            success, msg = self.q_manager.restore_file(name)
            QMessageBox.information(self, "Restore", msg)
            self.refresh_quarantine()

def main():
    app = QApplication(sys.argv)
    window = SecurityDashboard()
    window.show()
    sys.exit(app.exec())
