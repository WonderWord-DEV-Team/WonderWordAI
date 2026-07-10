import os
from pathlib import Path


def _load_env_file() -> None:
    env_path = Path(__file__).with_name(".env")

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


_load_env_file()

MODEL_NAME = os.getenv("MODEL_NAME", "small")
DEVICE = os.getenv("DEVICE", "cpu")
ML_SERVICE_KEY = os.getenv("ML_SERVICE_KEY")
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
