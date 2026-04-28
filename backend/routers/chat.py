from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.db import get_db          # ← NO dots
from database.models import Message     # ← NO dots
from models.schemas import ChatRequest, ChatResponse   # ← NO dots
from services.emotion_text import detect_text_emotion  # ← NO dots
from services.chatbot import generate_response         # ← NO dots
from services.tts import text_to_speech                # ← NO dots

router = APIRouter(prefix="/api", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    emotion_result = detect_text_emotion(request.message)
    emotion        = emotion_result["emotion"]
    confidence     = emotion_result["confidence"]

    try:
        reply = await generate_response(
            user_message=request.message,
            emotion=emotion,
            conversation_history=request.conversation_history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    audio_url = text_to_speech(reply, emotion)

    if request.user_id:
        user_msg = Message(
            user_id=request.user_id, role="user",
            content=request.message, emotion=emotion,
            emotion_conf=confidence, input_type="text"
        )
        bot_msg = Message(
            user_id=request.user_id, role="assistant",
            content=reply, emotion=emotion,
            emotion_conf=confidence, input_type="text"
        )
        db.add(user_msg)
        db.add(bot_msg)
        await db.commit()

    return ChatResponse(
        reply=reply,
        emotion=emotion,
        confidence=confidence,
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
            "role": m.role, "content": m.content,
            "emotion": m.emotion, "timestamp": str(m.timestamp)
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
    emotion_counts = {}
    for msg in messages:
        emotion_counts[msg.emotion] = emotion_counts.get(msg.emotion, 0) + 1
    return {"emotion_distribution": emotion_counts, "total_messages": len(messages)}