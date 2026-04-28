import os
import uuid
import speech_recognition as sr
from fastapi import APIRouter, UploadFile, File, Depends, Form
from pathlib import Path
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
    db = Depends(get_db)
):
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
    try:
        with sr.AudioFile(str(wav_filepath)) as source:
            audio_data = recognizer.record(source)
            transcript = recognizer.recognize_google(audio_data)
    except Exception as e:
        print(f"Speech recognition error: {e}")
        transcript = ""

    text_emotion  = detect_text_emotion(transcript) if transcript else {"emotion": "neutral", "confidence": 0.5}
    voice_emotion = detect_voice_emotion(str(filepath))

    final_emotion = (
        voice_emotion["emotion"]
        if voice_emotion["confidence"] > text_emotion["confidence"]
        else text_emotion["emotion"]
    )

    reply     = await generate_response(
        user_message=transcript or "(inaudible audio)",
        emotion=final_emotion,
        conversation_history=[]
    )
    audio_url = text_to_speech(reply, final_emotion)

    try:
        os.remove(filepath)
        if 'wav_filepath' in locals() and wav_filepath != filepath:
            os.remove(wav_filepath)
    except Exception:
        pass

    return {
        "transcript":    transcript,
        "reply":         reply,
        "text_emotion":  text_emotion["emotion"],
        "voice_emotion": voice_emotion["emotion"],
        "final_emotion": final_emotion,
        "audio_url":     audio_url
    }