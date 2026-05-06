from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[int] = None
    conversation_history: Optional[List[dict]] = []
    face_emotion: Optional[str] = None
    face_confidence: Optional[float] = None

class ChatResponse(BaseModel):
    reply: str
    emotion: str
    confidence: float
    audio_url: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class VerifyEmail(BaseModel):
    user_id: int
    code: str

class Token(BaseModel):
    access_token: str
    token_type: str