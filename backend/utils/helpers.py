import os
from pathlib import Path

def ensure_dirs():
    """Create required directories if they don't exist."""
    Path("audio/output").mkdir(parents=True, exist_ok=True)
    Path("audio/uploads").mkdir(parents=True, exist_ok=True)

def allowed_audio_file(filename: str) -> bool:
    """Check if uploaded file is a valid audio format."""
    allowed = {'.wav', '.mp3', '.webm', '.ogg', '.m4a'}
    return Path(filename).suffix.lower() in allowed