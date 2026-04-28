from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database.db import Base        # ← NO dots

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String(50), unique=True, index=True)
    email      = Column(String(100), unique=True, index=True)
    hashed_pw  = Column(String(200))
    is_verified   = Column(Boolean, default=False)
    verify_code   = Column(String(6), nullable=True)
    code_expires  = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    messages   = relationship("Message", back_populates="user")

class Message(Base):
    __tablename__ = "messages"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"))
    role         = Column(String(10))
    content      = Column(Text)
    emotion      = Column(String(20))
    emotion_conf = Column(Float)
    input_type   = Column(String(10))
    timestamp    = Column(DateTime, default=datetime.utcnow)
    user         = relationship("User", back_populates="messages")