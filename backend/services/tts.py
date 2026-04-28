import uuid
from gtts import gTTS
from pathlib import Path

AUDIO_DIR = Path("audio/output")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

SETTINGS = {
    "happy":   {"lang": "en", "tld": "com.au", "slow": False},
    "sad":     {"lang": "en", "tld": "co.uk",  "slow": True},
    "angry":   {"lang": "en", "tld": "com",    "slow": False},
    "fear":    {"lang": "en", "tld": "com",    "slow": True},
    "neutral": {"lang": "en", "tld": "com",    "slow": False},
}

def text_to_speech(text: str, emotion: str = "neutral") -> str:
    s        = SETTINGS.get(emotion, SETTINGS["neutral"])
    filename = f"{uuid.uuid4().hex}.mp3"
    filepath = AUDIO_DIR / filename
    gTTS(text=text, lang=s["lang"], tld=s["tld"], slow=s["slow"]).save(str(filepath))
    return f"/audio/{filename}"