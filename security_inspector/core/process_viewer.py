import psutil
import os
import win32api
import win32con
import win32security
from typing import List, Dict

class ProcessAnalyzer:
    @staticmethod
    def get_running_processes() -> List[Dict]:
        """Returns a list of running processes with basic security info."""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'exe', 'username']):
            try:
                info = proc.info
                exe_path = info.get('exe')
                
                # Check for publisher (simplified approach)
                publisher = "Unknown"
                signed = False
                if exe_path and os.path.exists(exe_path):
                    publisher, signed = ProcessAnalyzer.get_file_info(exe_path)

                processes.append({
                    "pid": info['pid'],
                    "name": info['name'],
                    "path": exe_path or "N/A",
                    "publisher": publisher,
                    "signed": signed,
                    "user": info.get('username', 'N/A')
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return processes

    @staticmethod
    def get_file_info(path):
        """Extract publisher info from file metadata (Simplified)."""
        # In a real-world app, we'd use win32api.GetFileVersionInfo
        # For this example, we'll mark as signed if we can extract version info
        # Full digital signature verification usually requires WinVerifyTrust API
        try:
            language, codepage = win32api.GetFileVersionInfo(path, '\\VarFileInfo\\Translation')[0]
            string_file_info = u'\\StringFileInfo\\%04X%04X\\%s' % (language, codepage, 'CompanyName')
            publisher = win32api.GetFileVersionInfo(path, string_file_info)
            return publisher, True
        except:
            return "Unsigned / Unknown", False
