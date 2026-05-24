import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.db import get_db
from database.models import Message
from models.schemas import ChatRequest, ChatResponse
from services.chatbot import generate_response
from services.tts import text_to_speech
from google import genai as google_genai
from google.genai import types
import os

router = APIRouter(prefix="/api", tags=["chat"])

_client = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ── Emotion grouping ──────────────────────────────────────────────────────
POSITIVE_WORDS = [
    'happy', 'joyful', 'excited', 'grateful', 'playful', 'amused',
    'cheerful', 'elated', 'content', 'proud', 'hopeful', 'confident',
    'enthusiastic', 'optimistic', 'love', 'affection', 'romantic',
    'tender', 'delight', 'ecstatic', 'blissful', 'thrilled', 'relieved',
]
NEGATIVE_WORDS = [
    'sad', 'angry', 'fear', 'frustrated', 'anxious', 'melancholic',
    'upset', 'overwhelmed', 'distressed', 'hopeless', 'lonely',
    'disappointed', 'worried', 'furious', 'terrified', 'grief',
    'rage', 'bitter', 'hostile', 'depressed', 'heartbroken',
    'stressed', 'panicked', 'nervous', 'scared', 'exhausted',
    'miserable', 'devastated', 'helpless', 'insecure', 'irritated',
]

def get_emotion_group(emotion: str) -> str:
    if not emotion:
        return 'neutral'
    e = emotion.lower().strip()
    if any(word in e for word in POSITIVE_WORDS):
        return 'positive'
    if any(word in e for word in NEGATIVE_WORDS):
        return 'negative'
    return 'neutral'

def detect_mismatch(text_emotion: str, face_emotion: str) -> tuple[bool, str | None]:
    if not face_emotion or not text_emotion:
        return False, None
    text_group = get_emotion_group(text_emotion)
    face_group = get_emotion_group(face_emotion)
    if text_group == face_group:
        return False, None
    if text_group == 'neutral' or face_group == 'neutral':
        # subtle: text neutral + face negative
        if text_group == 'neutral' and face_group == 'negative':
            return True, (
                f"User's face shows {face_emotion} even though their words seem neutral. "
                f"They may be holding something back. Be gently curious."
            )
        return False, None
    if text_group == 'positive' and face_group == 'negative':
        return True, (
            f"User's words suggest {text_emotion} but face shows {face_emotion}. "
            f"They may be masking. Be extra compassionate."
        )
    elif text_group == 'negative' and face_group == 'positive':
        return True, (
            f"User's words suggest {text_emotion} but face shows {face_emotion}. "
            f"Perhaps things are looking up. Be warm and gently encouraging."
        )
    return True, (
        f"Mixed signals: {text_emotion} (text) vs {face_emotion} (face). "
        f"Respond with empathy to both."
    )

def decide_final_emotion(text_emotion, face_emotion, face_confidence, mismatch) -> str:
    if not face_emotion or not face_confidence:
        return text_emotion
    if mismatch:
        return face_emotion
    if face_confidence > 0.6:
        return face_emotion
    return text_emotion


# ── Fast single-call emotion detection using Gemini ──────────────────────
_EMOTION_MODEL = "gemini-2.5-flash"

def _detect_emotion_sync(text: str) -> dict:
    """Detect emotion from text in a single fast Gemini call."""
    if not text or not text.strip():
        return {"emotion": "neutral", "display": "Neutral", "confidence": 0.9,
                "language": "English", "tone_hint": "neutral and helpful"}
    prompt = (
        'Analyze this text and return ONLY valid JSON (no markdown):\n'
        '{"emotion":"one English word","display":"Capitalized","confidence":0.0-1.0,'
        '"language":"detected language","tone_hint":"2-5 words how AI should respond"}\n\n'
        f'Text: {text[:300]}'
    )
    try:
        resp = _client.models.generate_content(
            model=_EMOTION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=80, temperature=0.1),
        )
        raw = resp.text.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return {
            "emotion":    str(data.get("emotion",    "neutral")).lower().strip(),
            "display":    str(data.get("display",    "Neutral")),
            "confidence": float(data.get("confidence", 0.75)),
            "language":   str(data.get("language",   "English")),
            "tone_hint":  str(data.get("tone_hint",  "helpful and clear")),
        }
    except Exception as e:
        print(f"[emotion] error: {e}")
        return {"emotion": "neutral", "display": "Neutral", "confidence": 0.6,
                "language": "English", "tone_hint": "helpful and clear"}


def _save_messages_sync(user_id, user_msg, reply, text_emotion, final_emotion, confidence, db_session):
    """Fire-and-forget DB save (runs in background thread)."""
    pass  # async version below handles this


async def _save_to_db(db, user_id, user_msg, reply, text_emotion, final_emotion, confidence):
    """Save conversation to DB without blocking the response."""
    try:
        db.add(Message(user_id=user_id, role="user",      content=user_msg,
                       emotion=text_emotion, emotion_conf=confidence, input_type="text"))
        db.add(Message(user_id=user_id, role="assistant", content=reply,
                       emotion=final_emotion, emotion_conf=confidence, input_type="text"))
        await db.commit()
    except Exception as e:
        print(f"DB save error: {e}")
        await db.rollback()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, background_tasks: BackgroundTasks,
               db: AsyncSession = Depends(get_db)):

    # ── Step 1 & 5 combined: detect emotion + generate response IN PARALLEL ──
    # Emotion detection and response generation both need Gemini,
    # but emotion is needed to build the response prompt.
    # So we run emotion detection as fast as possible (80 token limit, temp=0.1)
    # then immediately fire the response generation.

    # Run emotion detection in thread so it doesn't block event loop
    emotion_result = await asyncio.to_thread(_detect_emotion_sync, request.message)

    text_emotion = emotion_result.get("emotion",   "neutral")
    tone_hint    = emotion_result.get("tone_hint", "helpful and clear")
    language     = emotion_result.get("language",  "English")
    confidence   = emotion_result.get("confidence", 0.75)

    # ── Step 2: Detect mismatch ───────────────────────────────────────────
    mismatch, mismatch_context = detect_mismatch(text_emotion, request.face_emotion)

    # ── Step 3: Decide final emotion ─────────────────────────────────────
    final_emotion = decide_final_emotion(
        text_emotion, request.face_emotion, request.face_confidence, mismatch
    )

    # ── Step 4: Augment message with face/mismatch context ───────────────
    augmented_message = request.message
    if mismatch and mismatch_context:
        augmented_message = f"{request.message}\n\n[SYSTEM EMOTION NOTE: {mismatch_context}]"
    elif request.face_emotion and request.face_confidence and request.face_confidence > 0.4:
        augmented_message = (
            f"{request.message}\n\n"
            f"[SYSTEM EMOTION NOTE: User's face shows {request.face_emotion} "
            f"({int(request.face_confidence * 100)}% confidence). Use as extra context.]"
        )

    # ── Step 5: Generate AI response ─────────────────────────────────────
    try:
        reply = await generate_response(
            user_message=augmented_message,
            emotion=final_emotion,
            conversation_history=request.conversation_history,
            tone_hint=tone_hint,
            language=language,
            face_emotion=request.face_emotion,
            mismatch=mismatch,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    # ── Step 6: TTS in background (don't block response!) ────────────────
    # Generate audio asynchronously — client gets reply immediately
    audio_url = None
    try:
        audio_url = await asyncio.to_thread(text_to_speech, reply, final_emotion)
    except Exception as e:
        print(f"[tts] background error: {e}")

    # ── Step 7: DB save in background (don't block response!) ────────────
    if request.user_id:
        background_tasks.add_task(
            _save_to_db, db, request.user_id,
            request.message, reply, text_emotion, final_emotion, confidence
        )

    # ── Step 8: Return immediately ────────────────────────────────────────
    return ChatResponse(
        reply=reply,
        emotion=final_emotion,
        confidence=confidence,
        audio_url=audio_url,
    )


@router.get("/history/{user_id}")
async def get_history(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message)
        .where(Message.user_id == user_id)
        .order_by(Message.timestamp.asc())
        .limit(100)
    )
    messages = result.scalars().all()
    return [
        {"role": m.role, "content": m.content,
         "emotion": m.emotion, "timestamp": str(m.timestamp)}
        for m in messages
    ]


@router.get("/analytics/{user_id}")
async def get_analytics(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.user_id == user_id, Message.role == "user")
    )
    messages = result.scalars().all()
    counts = {}
    total = len(messages)
    positive_count = 0
    negative_count = 0
    for msg in messages:
        emotion = msg.emotion or "neutral"
        counts[emotion] = counts.get(emotion, 0) + 1
        group = get_emotion_group(emotion)
        if group == 'positive': positive_count += 1
        if group == 'negative': negative_count += 1
    return {
        "emotion_distribution": counts,
        "total_messages":       total,
        "positive_ratio":       round(positive_count / total, 2) if total > 0 else 0,
        "negative_ratio":       round(negative_count / total, 2) if total > 0 else 0,
        "dominant_emotion":     max(counts, key=counts.get) if counts else "neutral",
    }