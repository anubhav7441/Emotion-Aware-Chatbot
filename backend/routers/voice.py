import os
import uuid
import json
import speech_recognition as sr
from fastapi import APIRouter, UploadFile, File, Depends, Form
from pathlib import Path
from typing import Optional
from database.db import get_db              # ← NO dots
from services.emotion_voice import detect_voice_emotion  # ← NO dots
from services.emotion_text import detect_text_emotion    # ← NO dots
from services.chatbot import generate_response           # ← NO dots
from services.tts import text_to_speech                  # ← NO dots

router     = APIRouter(prefix="/api", tags=["voice"])
UPLOAD_DIR = Path("audio/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/voice")
async def process_voice(
    audio: UploadFile = File(...),
    user_id: int = Form(None),
    conversation_history: Optional[str] = Form(None),  # JSON-encoded history
    db = Depends(get_db)
):
    # Parse conversation history from JSON string
    history = []
    if conversation_history:
        try:
            history = json.loads(conversation_history)
        except Exception:
            history = []

    filename  = f"{uuid.uuid4().hex}.wav"
    filepath  = UPLOAD_DIR / filename
    content   = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)

    from pydub import AudioSegment
    wav_filepath = UPLOAD_DIR / f"conv_{filename}"
    try:
        audio_segment = AudioSegment.from_file(str(filepath))
        audio_segment.export(str(wav_filepath), format="wav")
    except Exception as e:
        print(f"Error converting audio: {e}")
        wav_filepath = filepath

    recognizer = sr.Recognizer()
    transcript = ""
    try:
        with sr.AudioFile(str(wav_filepath)) as source:
            audio_data = recognizer.record(source)
            transcript = recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        print("Speech recognition: could not understand audio")
        transcript = ""
    except Exception as e:
        print(f"Speech recognition error: {e}")
        transcript = ""

    voice_acoustics = detect_voice_emotion(str(filepath))
    
    emotion_result = detect_text_emotion(
        transcript if transcript else "",
        voice_energy=voice_acoustics.get("energy"),
        voice_pitch=voice_acoustics.get("pitch")
    )
    final_emotion = emotion_result["emotion"]
    tone_hint     = emotion_result.get("tone_hint", "warm and empathetic")
    language      = emotion_result.get("language", "English")

    # Generate response with full conversation context
    reply     = await generate_response(
        user_message=transcript or "(inaudible audio)",
        emotion=final_emotion,
        conversation_history=history,
        tone_hint=tone_hint,
        language=language,
    )
    audio_url = text_to_speech(reply, final_emotion)

    # Cleanup temp files
    try:
        os.remove(filepath)
        if wav_filepath != filepath and wav_filepath.exists():
            os.remove(wav_filepath)
    except Exception:
        pass

    return {
        "transcript":    transcript,
        "reply":         reply,
        "text_emotion":  final_emotion,
        "voice_emotion": final_emotion,
        "final_emotion": final_emotion,
        "language":      language,
        "audio_url":     audio_url
    }