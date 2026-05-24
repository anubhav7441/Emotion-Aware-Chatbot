import os
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Use new google-genai SDK
from google import genai as google_genai
_client = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
_MODEL_CHAIN = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]


def detect_text_emotion(text: str, voice_energy: float = None, voice_pitch: float = None) -> dict:
    """
    Detect emotion from ANY text in ANY language.
    Returns a free-form emotion label — not restricted to any fixed list.
    """
    if not text or not text.strip():
        return {
            "emotion":    "neutral",
            "display":    "Neutral",
            "confidence": 0.9,
            "language":   "unknown",
            "tone_hint":  "neutral and helpful",
        }

    acoustic_context = ""
    if voice_energy is not None and voice_pitch is not None:
        acoustic_context = (
            f"\n\nVoice Acoustics (extra context):\n"
            f"Energy/intensity: {voice_energy:.3f}\n"
            f"Pitch Hz: {voice_pitch:.1f}\n"
            "High energy+pitch = excitement/anger/panic. Low = sadness/calm/exhaustion."
        )

    prompt = f"""You are an expert multilingual emotion analyst.
Analyze the text and return ONLY a valid JSON object:
{{
  "emotion": "one English word for the emotion (anything: joyful, melancholic, nostalgic, overwhelmed, curious, etc.)",
  "display": "same emotion properly capitalized",
  "confidence": 0.0 to 1.0,
  "language": "detected language in English",
  "tone_hint": "2-5 words: how AI should respond (e.g. warm and encouraging, calm and grounding)"
}}

Rules:
- emotion = ANY human emotion, not just happy/sad/angry
- Works for ALL languages: English, Hindi, Hinglish, Spanish, Arabic, Tamil, etc.
- Works for ALL content: jokes, poetry, complaints, questions, slang, gibberish
- If unclear → neutral, Neutral, 0.7, English, clear and helpful
- Return ONLY raw JSON, no markdown fences, no explanation.{acoustic_context}

Text: {text[:400]}"""

    import time
    resp = None
    for attempt, model in enumerate(_MODEL_CHAIN):
        try:
            resp = _client.models.generate_content(model=model, contents=prompt)
            raw  = resp.text.strip().replace("```json", "").replace("```", "").strip()
            data = json.loads(raw)
            return {
                "emotion":    str(data.get("emotion",    "neutral")).lower().strip(),
                "display":    str(data.get("display",    "Neutral")),
                "confidence": float(data.get("confidence", 0.75)),
                "language":   str(data.get("language",   "English")),
                "tone_hint":  str(data.get("tone_hint",  "helpful and clear")),
            }
        except json.JSONDecodeError:
            # Model responded but not valid JSON — extract first word
            raw_text = resp.text.lower() if resp else ""
            for word in raw_text.split():
                clean = word.strip('",{}(): ')
                if len(clean) > 2 and clean.isalpha():
                    return {"emotion": clean, "display": clean.capitalize(), "confidence": 0.65,
                            "language": "English", "tone_hint": "empathetic and helpful"}
            break
        except Exception as e:
            err_str = str(e)
            if ('503' in err_str or 'UNAVAILABLE' in err_str) and attempt < len(_MODEL_CHAIN) - 1:
                wait = 2 ** attempt
                print(f"[emotion] {model} unavailable, retrying in {wait}s...")
                time.sleep(wait)
                continue
            print(f"[emotion_text] error: {e}")
            break

    return {"emotion": "neutral", "display": "Neutral", "confidence": 0.5,
            "language": "English", "tone_hint": "helpful and clear"}