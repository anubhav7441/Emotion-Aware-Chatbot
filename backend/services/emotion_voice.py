import librosa
import numpy as np
from pathlib import Path

def detect_voice_emotion(audio_path: str) -> dict:
    try:
        y, sr   = librosa.load(audio_path, sr=22050)
        energy  = float(np.mean(librosa.feature.rms(y=y)))
        pitches, mags = librosa.piptrack(y=y, sr=sr)
        pitch   = float(np.mean(pitches[pitches > 0])) if pitches[pitches > 0].size else 0

        return {"energy": energy, "pitch": pitch}
    except Exception:
        return {"energy": 0.0, "pitch": 0.0}