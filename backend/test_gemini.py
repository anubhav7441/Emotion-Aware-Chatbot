from dotenv import load_dotenv
load_dotenv()

from services.emotion_text import detect_text_emotion
from services.chatbot import generate_response
import asyncio

tests = [
    "I am not feeling happy",
    "yaar aaj bahut bura lag raha hai",
    "tell me a joke",
    "I am so frustrated with everything",
    "what is the meaning of life?",
]

for msg in tests:
    e = detect_text_emotion(msg)
    r = asyncio.run(generate_response(msg, e["emotion"], [], e["tone_hint"], e["language"]))
    print("Q:", msg)
    print("Emotion:", e["emotion"], "| Lang:", e["language"])
    print("A:", r[:150])
    print("---")
