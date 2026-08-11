import os
from dotenv import load_dotenv

load_dotenv()

ML_SERVICE_KEY = os.getenv("ML_SERVICE_KEY")

MODEL_NAME = os.getenv("MODEL_NAME", "small")
DEVICE = os.getenv("DEVICE", "cpu")
HF_TOKEN = os.getenv("HF_TOKEN", "")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
SENTRY_DSN = os.getenv("SENTRY_DSN")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "")