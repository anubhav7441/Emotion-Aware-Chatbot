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
    # Check email duplicate
    existing_email = await db.execute(
        select(User).where(User.email == user.email)
    )
    if existing_email.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    # Check username duplicate
    existing_user = await db.execute(
        select(User).where(User.username == user.username)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(400, "Username already taken")

    # Try to send verification email
    email_sent = False
    code       = None

    try:
        from services.email_service import generate_code, send_verification_email
        code       = generate_code()
        expires    = datetime.utcnow() + timedelta(minutes=10)
        email_sent = send_verification_email(user.email, code, user.username)
    except Exception as e:
        print(f"Email service error (non-fatal): {e}")
        email_sent = False

    # Create user
    # If email failed → auto-verify so user can still use the app
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_pw=pwd_ctx.hash(user.password),
        is_verified=not email_sent,  # auto-verify if no email
        verify_code=code if email_sent else None,
        code_expires=datetime.utcnow() + timedelta(minutes=10) if email_sent else None,
    )
    db.add(db_user)

    try:
        await db.commit()
        await db.refresh(db_user)
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")

    # If email was sent → ask for verification
    if email_sent:
        return {
            "message":    "Account created! Check your email for the verification code.",
            "user_id":    db_user.id,
            "email_sent": True,
            "verified":   False,
        }
    else:
        # No email → auto login immediately
        token = create_token({
            "sub":      str(db_user.id),
            "username": db_user.username,
        })
        return {
            "message":      "Account created successfully!",
            "user_id":      db_user.id,
            "email_sent":   False,
            "verified":     True,
            "access_token": token,
            "token_type":   "bearer",
        }

@router.post("/verify-email")
async def verify_email(data: VerifyEmail, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == data.user_id))
    user   = result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found")
    if user.is_verified:
        # Already verified — just return token
        token = create_token({"sub": str(user.id), "username": user.username})
        return {"access_token": token, "token_type": "bearer", "username": user.username}
    if user.verify_code != data.code:
        raise HTTPException(400, "Invalid verification code")
    if user.code_expires and user.code_expires < datetime.utcnow():
        raise HTTPException(400, "Code expired. Please register again.")

    user.is_verified  = True
    user.verify_code  = None
    user.code_expires = None

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")

    token = create_token({"sub": str(user.id), "username": user.username})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "username":     user.username,
    }

@router.post("/resend-code")
async def resend_code(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    try:
        from services.email_service import generate_code, send_verification_email
        code              = generate_code()
        user.verify_code  = code
        user.code_expires = datetime.utcnow() + timedelta(minutes=10)
        await db.commit()
        send_verification_email(user.email, code, user.username)
        return {"message": "New code sent"}
    except Exception as e:
        raise HTTPException(500, f"Could not send code: {str(e)}")

@router.post("/login", response_model=Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.username == form.username)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(401, "Incorrect username or password")
    if not pwd_ctx.verify(form.password, user.hashed_pw):
        raise HTTPException(401, "Incorrect username or password")
    if not user.is_verified:
        raise HTTPException(403, "Please verify your email first")

    token = create_token({"sub": str(user.id), "username": user.username})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/guest-token")
async def guest_token():
    token = create_token(
        {"sub": "guest", "username": "Guest", "is_guest": True},
        expires_minutes=120,
    )
    return {"access_token": token, "token_type": "bearer", "username": "Guest"}