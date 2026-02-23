import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
VERSION = "1.0.0"
APP_NAME = "Local Security Inspector"

# API Keys (Placeholders)
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "YOUR_API_KEY_HERE")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
QUARANTINE_DIR = os.path.join(BASE_DIR, "data", "quarantine")
LOG_DIR = os.path.join(BASE_DIR, "data", "logs")

# Ensure directories exist
os.makedirs(QUARANTINE_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# Risk Thresholds
RISK_THRESHOLD_HIGH = 3  # VT detections
