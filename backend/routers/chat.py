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



@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):

    # Step 1 — detect emotion from text (free-form, any language)
    emotion_result = detect_text_emotion(request.message)
    text_emotion   = emotion_result["emotion"]
    tone_hint      = emotion_result.get("tone_hint", "helpful and clear")
    language       = emotion_result.get("language", "English")



    # Step 3 — decide final emotion
    # If face detected with good confidence → trust face more
    if request.face_emotion and request.face_confidence and request.face_confidence > 0.55:
        final_emotion = request.face_emotion
    else:
        final_emotion = text_emotion

    # Step 4 — generate response
    try:
        reply = await generate_response(
            user_message=request.message,
            emotion=final_emotion,
            conversation_history=request.conversation_history,
            tone_hint=tone_hint,
            language=language,
            face_emotion=request.face_emotion,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    # Step 5 — text to speech
    audio_url = text_to_speech(reply, final_emotion)

    # Step 6 — save to DB
    if request.user_id:
        db.add(Message(
            user_id=request.user_id, role="user",
            content=request.message, emotion=final_emotion,
            emotion_conf=emotion_result["confidence"],
            input_type="text"
        ))
        db.add(Message(
            user_id=request.user_id, role="assistant",
            content=reply, emotion=final_emotion,
            emotion_conf=emotion_result["confidence"],
            input_type="text"
        ))
        await db.commit()

    return ChatResponse(
        reply=reply,
        emotion=final_emotion,
        confidence=emotion_result["confidence"],
        audio_url=audio_url
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
        {
            "role":      m.role,
            "content":   m.content,
            "emotion":   m.emotion,
            "timestamp": str(m.timestamp),
        }
        for m in messages
    ]

@router.get("/analytics/{user_id}")
async def get_analytics(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(
            Message.user_id == user_id,
            Message.role == "user"
        )
    )
    messages = result.scalars().all()
    counts = {}
    for msg in messages:
        counts[msg.emotion] = counts.get(msg.emotion, 0) + 1
    return {
        "emotion_distribution": counts,
        "total_messages": len(messages)
    }