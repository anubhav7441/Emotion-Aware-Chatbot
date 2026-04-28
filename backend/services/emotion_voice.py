import librosa
import numpy as np
from pathlib import Path

def detect_voice_emotion(audio_path: str) -> dict:
    try:
        y, sr   = librosa.load(audio_path, sr=22050)
        energy  = float(np.mean(librosa.feature.rms(y=y)))
        pitches, mags = librosa.piptrack(y=y, sr=sr)
        pitch   = float(np.mean(pitches[pitches > 0])) if pitches[pitches > 0].size else 0

        if energy > 0.1 and pitch > 300:
            return {"emotion": "angry",   "confidence": 0.6}
        elif energy < 0.02:
            return {"emotion": "sad",     "confidence": 0.55}
        elif pitch > 250 and energy > 0.06:
            return {"emotion": "happy",   "confidence": 0.58}
        else:
            return {"emotion": "neutral", "confidence": 0.65}
    except Exception:
        return {"emotion": "neutral", "confidence": 0.5}