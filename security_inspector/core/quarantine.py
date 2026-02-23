import os
import shutil
import json
from config import QUARANTINE_DIR

class QuarantineManager:
    DB_PATH = os.path.join(QUARANTINE_DIR, "quarantine_db.json")

    def __init__(self):
        if not os.path.exists(self.DB_PATH):
            self._save_db({})

    def _load_db(self):
        with open(self.DB_PATH, 'r') as f:
            return json.load(f)

    def _save_db(self, data):
        with open(self.DB_PATH, 'w') as f:
            json.dump(data, f, indent=4)

    def quarantine_file(self, file_path):
        """Move file to quarantine and store original path."""
        if not os.path.exists(file_path):
            return False, "File not found"

        file_name = os.path.basename(file_path)
        dest_path = os.path.join(QUARANTINE_DIR, file_name + ".locked")
        
        try:
            shutil.move(file_path, dest_path)
            db = self._load_db()
            db[file_name] = {
                "original_path": file_path,
                "quarantine_path": dest_path
            }
            self._save_db(db)
            return True, "File quarantined"
        except Exception as e:
            return False, str(e)

    def restore_file(self, file_name):
        """Restore file from quarantine."""
        db = self._load_db()
        if file_name not in db:
            return False, "File not in quarantine"

        info = db[file_name]
        try:
            shutil.move(info['quarantine_path'], info['original_path'])
            del db[file_name]
            self._save_db(db)
            return True, "File restored"
        except Exception as e:
            return False, str(e)

    def list_quarantine(self):
        return self._load_db()
