from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.db import get_db
from database.models import Message
from models.schemas import ChatRequest, ChatResponse
from services.emotion_text import detect_text_emotion
from services.chatbot import generate_response
from services.tts import text_to_speech

router = APIRouter(prefix="/api", tags=["chat"])

# ── Emotion grouping for mismatch detection ──────────────────
# These word lists cover any free-form emotion Claude might return
POSITIVE_WORDS = [
    'happy', 'joyful', 'excited', 'grateful', 'playful', 'amused',
    'cheerful', 'elated', 'content', 'proud', 'hopeful', 'confident',
    'enthusiastic', 'optimistic', 'love', 'affection', 'romantic',
    'tender', 'delight', 'ecstatic', 'blissful', 'thrilled',
]
NEGATIVE_WORDS = [
    'sad', 'angry', 'fear', 'frustrated', 'anxious', 'melancholic',
    'upset', 'overwhelmed', 'distressed', 'hopeless', 'lonely',
    'disappointed', 'worried', 'furious', 'terrified', 'grief',
    'rage', 'bitter', 'hostile', 'depressed', 'heartbroken',
    'stressed', 'panicked', 'nervous', 'scared', 'exhausted',
    'miserable', 'devastated', 'helpless', 'insecure',
]

def get_emotion_group(emotion: str) -> str:
    """
    Classify any free-form emotion string into positive / negative / neutral.
    Works by checking if any known word appears inside the emotion string.
    Example: 'deeply melancholic' → negative
    """
    if not emotion:
        return 'neutral'
    e = emotion.lower().strip()
    if any(word in e for word in POSITIVE_WORDS):
        return 'positive'
    if any(word in e for word in NEGATIVE_WORDS):
        return 'negative'
    return 'neutral'

def detect_mismatch(text_emotion: str, face_emotion: str) -> tuple[bool, str | None]:
    """
    Compare text emotion vs face emotion.
    Returns (mismatch: bool, message: str | None)
    Only flags mismatch when both sides are clearly opposite — not neutral.
    """
    if not face_emotion or not text_emotion:
        return False, None

    text_group = get_emotion_group(text_emotion)
    face_group = get_emotion_group(face_emotion)

    # Only flag when clearly opposite
    if text_group == face_group:
        return False, None
    if text_group == 'neutral' or face_group == 'neutral':
        return False, None

    # Generate mismatch message
    if text_group == 'positive' and face_group == 'negative':
        msg = (
            f"The user's words suggest they feel {text_emotion}, "
            f"but their face shows {face_emotion}. "
            f"They may be masking their true feelings. "
            f"Gently acknowledge both — validate without forcing. "
            f"Be extra compassionate."
        )
    elif text_group == 'negative' and face_group == 'positive':
        msg = (
            f"The user's words suggest {text_emotion}, "
            f"but their face shows {face_emotion}. "
            f"Perhaps things are looking up without them realising. "
            f"Be warm and gently encouraging."
        )
    else:
        msg = (
            f"There's a mix of {text_emotion} (from text) "
            f"and {face_emotion} (from face). "
            f"Respond with empathy to both."
        )

    return True, msg

def decide_final_emotion(
    text_emotion: str,
    face_emotion: str | None,
    face_confidence: float | None,
    mismatch: bool,
) -> str:
    """
    Decide which emotion to use for the response tone.
    Rules:
    - No face data → use text emotion
    - Face confidence high (>0.6) → trust face
    - Mismatch detected → trust face (harder to fake expressions)
    - Otherwise → use text emotion
    """
    if not face_emotion or not face_confidence:
        return text_emotion

    if mismatch:
        # Face wins on mismatch — expressions are harder to fake
        return face_emotion

    if face_confidence > 0.6:
        return face_emotion

    # Face confidence too low — fall back to text
    return text_emotion


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):

    # ── Step 1: Detect emotion from text ─────────────────────
    # Returns free-form emotion, language, tone_hint — not a fixed list
    emotion_result = detect_text_emotion(request.message)
    text_emotion   = emotion_result.get("emotion",   "neutral")
    tone_hint      = emotion_result.get("tone_hint", "helpful and clear")
    language       = emotion_result.get("language",  "English")
    confidence     = emotion_result.get("confidence", 0.75)

    # ── Step 2: Detect mismatch between text and face ─────────
    mismatch, mismatch_context = detect_mismatch(
        text_emotion,
        request.face_emotion,
    )

    # ── Step 3: Decide final emotion ──────────────────────────
    final_emotion = decide_final_emotion(
        text_emotion,
        request.face_emotion,
        request.face_confidence,
        mismatch,
    )

    # ── Step 4: Build augmented message for chatbot ───────────
    # We never modify what the user wrote — we append a system note
    # that tells the AI about the emotional context
    augmented_message = request.message

    if mismatch and mismatch_context:
        augmented_message = (
            f"{request.message}\n\n"
            f"[SYSTEM EMOTION NOTE: {mismatch_context}]"
        )
    elif request.face_emotion and request.face_confidence and request.face_confidence > 0.4:
        # No mismatch but face data is available — pass it as context
        augmented_message = (
            f"{request.message}\n\n"
            f"[SYSTEM EMOTION NOTE: User's face expression shows "
            f"{request.face_emotion} "
            f"(confidence: {int(request.face_confidence * 100)}%). "
            f"Use this as additional emotional context.]"
        )

    # ── Step 5: Generate AI response ─────────────────────────
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
        raise HTTPException(
            status_code=500,
            detail=f"LLM error: {str(e)}"
        )

    # ── Step 6: Text to speech ────────────────────────────────
    audio_url = text_to_speech(reply, final_emotion)

    # ── Step 7: Save to database ──────────────────────────────
    if request.user_id:
        try:
            db.add(Message(
                user_id=request.user_id,
                role="user",
                content=request.message,   # save original, not augmented
                emotion=text_emotion,
                emotion_conf=confidence,
                input_type="text",
            ))
            db.add(Message(
                user_id=request.user_id,
                role="assistant",
                content=reply,
                emotion=final_emotion,
                emotion_conf=confidence,
                input_type="text",
            ))
            await db.commit()
        except Exception as e:
            # DB errors should not break the chat response
            print(f"DB save error: {e}")
            await db.rollback()

    # ── Step 8: Return response ───────────────────────────────
    return ChatResponse(
        reply=reply,
        emotion=final_emotion,
        confidence=confidence,
        audio_url=audio_url,
    )


@router.get("/history/{user_id}")
async def get_history(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message)
        .where(Message.user_id == user_id)
        .order_by(Message.timestamp.asc())
        .limit(100)
    )
    messages = result.scalars().all()
    return [
        {
            "role":      m.role,
            "content":   m.content,
            "emotion":   m.emotion,
            "timestamp": str(m.timestamp),
        }
        for m in messages
    ]


@router.get("/analytics/{user_id}")
async def get_analytics(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message).where(
            Message.user_id == user_id,
            Message.role == "user",
        )
    )
    messages = result.scalars().all()

    counts        = {}
    total         = len(messages)
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