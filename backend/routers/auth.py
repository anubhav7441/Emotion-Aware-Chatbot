from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from database.db import get_db
from database.models import User
from models.schemas import UserCreate, Token, VerifyEmail
from services.email_service import generate_code, send_verification_email

router     = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_ctx    = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM  = "HS256"

def create_token(data: dict, expires_minutes: int = 1440) -> str:
    payload        = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register")
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    existing_email = await db.execute(select(User).where(User.email == user.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    # Check if username already exists
    existing_user = await db.execute(select(User).where(User.username == user.username))
    if existing_user.scalar_one_or_none():
        raise HTTPException(400, "Username already taken")

    # Generate verification code
    code    = generate_code()
    expires = datetime.utcnow() + timedelta(minutes=10)

    db_user = User(
        username=user.username,
        email=user.email,
        hashed_pw=pwd_ctx.hash(user.password),
        is_verified=False,
        verify_code=code,
        code_expires=expires
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    # Send verification email
    sent = send_verification_email(user.email, code, user.username)
    if not sent:
        # Still create account but warn
        return {
            "message": "Account created. Email sending failed — check Gmail config in .env",
            "user_id": db_user.id,
            "email_sent": False
        }

    return {
        "message": "Account created. Check your email for the verification code.",
        "user_id": db_user.id,
        "email_sent": True
    }

@router.post("/verify-email")
async def verify_email(data: VerifyEmail, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == data.user_id))
    user   = result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found")
    if user.is_verified:
        raise HTTPException(400, "Email already verified")
    if user.verify_code != data.code:
        raise HTTPException(400, "Invalid verification code")
    if user.code_expires < datetime.utcnow():
        raise HTTPException(400, "Verification code expired. Please register again.")

    user.is_verified  = True
    user.verify_code  = None
    user.code_expires = None
    await db.commit()

    token = create_token({"sub": str(user.id), "username": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username}

@router.post("/resend-code")
async def resend_code(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    code             = generate_code()
    user.verify_code = code
    user.code_expires = datetime.utcnow() + timedelta(minutes=10)
    await db.commit()

    send_verification_email(user.email, code, user.username)
    return {"message": "New code sent"}

@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form.username))
    user   = result.scalar_one_or_none()

    if not user or not pwd_ctx.verify(form.password, user.hashed_pw):
        raise HTTPException(401, "Incorrect credentials")
    if not user.is_verified:
        raise HTTPException(403, "Please verify your email first")

    token = create_token({"sub": str(user.id), "username": user.username})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/guest-token")
async def guest_token():
    """Issue a temporary guest token — no account needed."""
    token = create_token({"sub": "guest", "username": "Guest", "is_guest": True}, expires_minutes=120)
    return {"access_token": token, "token_type": "bearer", "username": "Guest"}