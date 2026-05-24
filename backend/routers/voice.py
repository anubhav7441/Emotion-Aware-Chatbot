import os
import uuid
import json
import asyncio
import speech_recognition as sr
from fastapi import APIRouter, UploadFile, File, Depends, Form
from pathlib import Path
from typing import Optional
from database.db import get_db
from services.emotion_voice import detect_voice_emotion
from routers.chat import _detect_emotion_sync   # reuse fast emotion detector
from services.chatbot import generate_response
from services.tts import text_to_speech

router     = APIRouter(prefix="/api", tags=["voice"])
UPLOAD_DIR = Path("audio/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _process_audio_sync(filepath: Path, wav_filepath: Path) -> str:
    """Convert + transcribe audio synchronously (runs in thread)."""
    from pydub import AudioSegment
    # Convert to WAV
    try:
        seg = AudioSegment.from_file(str(filepath))
        seg.export(str(wav_filepath), format="wav")
    except Exception as e:
        print(f"Audio conversion error: {e}")
        wav_filepath = filepath  # use original if conversion fails

    # Transcribe
    recognizer = sr.Recognizer()
    try:
        with sr.AudioFile(str(wav_filepath)) as source:
            audio_data = recognizer.record(source)
            return recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        return ""
    except Exception as e:
        print(f"Speech recognition error: {e}")
        return ""


@router.post("/voice")
async def process_voice(
    audio: UploadFile = File(...),
    user_id: int = Form(None),
    conversation_history: Optional[str] = Form(None),
    db = Depends(get_db),
):
    # Parse conversation history
    history = []
    if conversation_history:
        try:
            history = json.loads(conversation_history)
        except Exception:
            history = []

    # Save upload
    filename     = f"{uuid.uuid4().hex}"
    filepath     = UPLOAD_DIR / f"{filename}_orig"
    wav_filepath = UPLOAD_DIR / f"{filename}.wav"

    content = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # ── Run audio conversion + transcription in thread (blocking!) ──
    transcript = await asyncio.to_thread(_process_audio_sync, filepath, wav_filepath)

    # ── Run voice acoustics + emotion detection in parallel ──────────
    acoustics_task  = asyncio.to_thread(detect_voice_emotion, str(filepath))
    emotion_task    = asyncio.to_thread(_detect_emotion_sync, transcript or "")

    voice_acoustics, emotion_result = await asyncio.gather(acoustics_task, emotion_task)

    final_emotion = emotion_result.get("emotion",   "neutral")
    tone_hint     = emotion_result.get("tone_hint", "warm and empathetic")
    language      = emotion_result.get("language",  "English")

    # ── Generate response ────────────────────────────────────────────
    reply = await generate_response(
        user_message=transcript or "(inaudible audio)",
        emotion=final_emotion,
        conversation_history=history,
        tone_hint=tone_hint,
        language=language,
    )

    # ── TTS in thread (non-blocking) ─────────────────────────────────
    audio_url = None
    try:
        audio_url = await asyncio.to_thread(text_to_speech, reply, final_emotion)
    except Exception as e:
        print(f"[tts] error: {e}")

    # Cleanup
    try:
        filepath.unlink(missing_ok=True)
        wav_filepath.unlink(missing_ok=True)
    except Exception:
        pass

    return {
        "transcript":    transcript,
        "reply":         reply,
        "text_emotion":  final_emotion,
        "voice_emotion": final_emotion,
        "final_emotion": final_emotion,
        "language":      language,
        "audio_url":     audio_url,
    }