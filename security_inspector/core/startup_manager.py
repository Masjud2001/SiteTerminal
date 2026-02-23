import winreg
import os

class StartupAnalyzer:
    COMMON_KEYS = [
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run"),
        (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Run"),
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\RunOnce"),
        (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\RunOnce"),
    ]

    @staticmethod
    def get_startup_items():
        """List items from Windows Registry Run keys."""
        items = []
        for root, key_path in StartupAnalyzer.COMMON_KEYS:
            try:
                with winreg.OpenKey(root, key_path, 0, winreg.KEY_READ) as key:
                    for i in range(winreg.QueryInfoKey(key)[1]):
                        name, value, _ = winreg.EnumValue(key, i)
                        items.append({
                            "name": name,
                            "command": value,
                            "location": "Registry: " + ("HKCU" if root == winreg.HKEY_CURRENT_USER else "HKLM")
                        })
            except Exception:
                continue
        
        # Also check Startup Folder
        startup_folder = os.path.join(os.environ['APPDATA'], r"Microsoft\Windows\Start Menu\Programs\Startup")
        if os.path.exists(startup_folder):
            for file in os.listdir(startup_folder):
                items.append({
                    "name": file,
                    "command": os.path.join(startup_folder, file),
                    "location": "Startup Folder"
                })

        return items
