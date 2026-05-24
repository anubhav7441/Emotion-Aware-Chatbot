import uuid
import time
import os
from pathlib import Path

AUDIO_DIR = Path("audio/output")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Emotion → TTS voice profile
SETTINGS = {
    "happy":       {"lang": "en", "tld": "com.au", "slow": False},
    "joyful":      {"lang": "en", "tld": "com.au", "slow": False},
    "excited":     {"lang": "en", "tld": "com.au", "slow": False},
    "sad":         {"lang": "en", "tld": "co.uk",  "slow": True },
    "melancholic": {"lang": "en", "tld": "co.uk",  "slow": True },
    "angry":       {"lang": "en", "tld": "com",    "slow": False},
    "frustrated":  {"lang": "en", "tld": "com",    "slow": False},
    "anxious":     {"lang": "en", "tld": "co.uk",  "slow": True },
    "fear":        {"lang": "en", "tld": "co.uk",  "slow": True },
    "calm":        {"lang": "en", "tld": "co.uk",  "slow": True },
    "neutral":     {"lang": "en", "tld": "com",    "slow": False},
}

def _cleanup_old_audio(max_files: int = 100):
    """Remove old TTS files to prevent disk fill-up."""
    try:
        files = sorted(AUDIO_DIR.glob("*.mp3"), key=os.path.getmtime)
        while len(files) > max_files:
            files.pop(0).unlink(missing_ok=True)
    except Exception:
        pass

def text_to_speech(text: str, emotion: str = "neutral") -> str | None:
    try:
        from gtts import gTTS
        s        = SETTINGS.get(emotion.lower(), SETTINGS["neutral"])
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = AUDIO_DIR / filename
        gTTS(text=text, lang=s["lang"], tld=s["tld"], slow=s["slow"]).save(str(filepath))
        _cleanup_old_audio()
        return f"/audio/{filename}"
    except Exception as e:
        print(f"[tts] error: {e}")
        return None  # chat continues even without audio