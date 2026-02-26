import hashlib
import requests
import os
from config import VIRUSTOTAL_API_KEY

class FileScanner:
    @staticmethod
    def get_sha256(file_path):
        """Generate SHA256 hash for a file."""
        sha256_hash = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            return f"Error: {str(e)}"

    @staticmethod
    def calculate_entropy(file_path):
        """Calculate Shannon entropy for a file (0-8). High entropy (>7.2) suggests packing/encryption."""
        import math
        try:
            with open(file_path, "rb") as f:
                data = f.read()
            if not data:
                return 0
            entropy = 0
            for x in range(256):
                p_x = float(data.count(x)) / len(data)
                if p_x > 0:
                    entropy += - p_x * math.log(p_x, 2)
            return round(entropy, 2)
        except Exception:
            return 0

    @staticmethod
    def check_virustotal(file_hash):
        """Check hash against VirusTotal API."""
        if not VIRUSTOTAL_API_KEY or VIRUSTOTAL_API_KEY == "YOUR_API_KEY_HERE":
            return {"status": "error", "message": "API key not configured"}

        url = f"https://www.virustotal.com/api/v3/files/{file_hash}"
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}

        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                stats = data['data']['attributes']['last_analysis_stats']
                return {
                    "status": "success",
                    "detections": stats['malicious'],
                    "total": sum(stats.values()),
                    "ratio": f"{stats['malicious']}/{sum(stats.values())}"
                }
            elif response.status_code == 404:
                return {"status": "not_found", "message": "Hash not found in VirusTotal"}
            else:
                return {"status": "error", "message": f"API Error {response.status_code}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
