from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os, sys
from dotenv import load_dotenv

load_dotenv()

# This fixes all import errors
sys.path.insert(0, os.path.dirname(__file__))

from database.db import init_db
from routers import chat, voice, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Emotion-Aware Chatbot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("audio/output", exist_ok=True)
os.makedirs("audio/uploads", exist_ok=True)

app.mount("/audio", StaticFiles(directory="audio/output"), name="audio")

app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(auth.router)

@app.get("/health")
async def health():
    return {"status": "ok"}