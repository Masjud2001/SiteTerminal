import os
import subprocess
import winreg
import ctypes

class SystemAuditor:
    @staticmethod
    def get_uac_status():
        """Checks if User Account Control (UAC) is enabled."""
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System")
            value, _ = winreg.QueryValueEx(key, "EnableLUA")
            winreg.CloseKey(key)
            return "Enabled" if value == 1 else "Disabled (High Risk)"
        except Exception:
            return "Unknown"

    @staticmethod
    def get_firewall_status():
        """Checks if Windows Firewall is active using netsh."""
        try:
            output = subprocess.check_output("netsh advfirewall show allprofiles state", shell=True).decode()
            if "ON" in output:
                return "Active"
            return "Inactive (Risk)"
        except Exception:
            return "Unknown"

    @staticmethod
    def is_admin():
        """Checks if the application is running with administrative privileges."""
        try:
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except:
            return False

    @staticmethod
    def get_windows_update_status():
        """Placeholder for Windows Update status."""
        # Querying Windows Update via COM can be slow/complex, 
        # using a simple check for the service status as a proxy.
        try:
            output = subprocess.check_output("sc query wuauserv", shell=True).decode()
            if "RUNNING" in output:
                return "Service Running"
            return "Service Stopped"
        except Exception:
            return "Unknown"

    @staticmethod
    def run_full_audit():
        """Returns a list of security audit items."""
        return [
            {"check": "UAC Status", "value": SystemAuditor.get_uac_status(), "risk": "Low" if "Enabled" in SystemAuditor.get_uac_status() else "High"},
            {"check": "Firewall Status", "value": SystemAuditor.get_firewall_status(), "risk": "Low" if "Active" in SystemAuditor.get_firewall_status() else "Medium"},
            {"check": "Admin Privileges", "value": "Yes" if SystemAuditor.is_admin() else "No (Limited Scan)", "risk": "Info"},
            {"check": "Update Service", "value": SystemAuditor.get_windows_update_status(), "risk": "Low" if "Running" in SystemAuditor.get_windows_update_status() else "Medium"},
        ]
