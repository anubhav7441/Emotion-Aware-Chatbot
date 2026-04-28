import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))



def detect_text_emotion(text: str) -> dict:
    """
    Detect emotion from ANY text — any language, any topic, any length.
    Uses Claude to dynamically output a single descriptive word for the emotion.
    """
    if not text or not text.strip():
        return {"emotion": "neutral", "confidence": 0.9, "raw": "neutral"}

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            system="""You are an emotion classifier that works for ANY language and ANY topic.
Analyze the emotional tone of the message and respond with exactly ONE descriptive word for the emotion (e.g. curious, joyful, frustrated, pensive, sarcastic, angry, neutral, nostalgic, etc.).

Rules:
- Works for English, Hindi, Hinglish, any language
- Works for any topic
- If unclear, respond: neutral
- Respond with ONLY the single emotion word in English. No punctuation, no explanation.""",
            messages=[{"role": "user", "content": text}]
        )

        raw = response.content[0].text.strip().lower().rstrip('.')

        return {
            "emotion":    raw,
            "raw":        raw,
            "confidence": 0.88,
        }

    except Exception as e:
        print(f"Emotion detection error: {e}")
        return {"emotion": "neutral", "confidence": 0.5, "raw": "neutral"}