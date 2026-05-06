import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# frontend/backend/ is parents[2] of this file (app/core/config.py)
_backend_root = Path(__file__).resolve().parents[2]

MODE       = os.getenv("MODE", "live")
OUTPUT_DIR = (_backend_root / Path(os.getenv("OUTPUT_DIR", "../../output"))).resolve()
MODEL_PATH = str((_backend_root / Path(os.getenv("MODEL_PATH", "../../models/squat_model.pt"))).resolve())

if not OUTPUT_DIR.exists():
    logging.warning(f"[config] OUTPUT_DIR does not exist: {OUTPUT_DIR}")
