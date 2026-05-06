import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-1.5-flash")

def detect_text_emotion(text: str, voice_energy: float = None, voice_pitch: float = None) -> dict:
    """
    Detect emotion from ANY text in ANY language, optionally fusing raw voice acoustics.
    Returns free-form emotion label — not restricted to a fixed list.
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
            f"\n\nAdditional Voice Acoustics:\n"
            f"Energy (intensity): {voice_energy:.3f}\n"
            f"Pitch (Hz): {voice_pitch:.1f}\n"
            f"High energy/pitch = excitement, anger, or panic. "
            f"Low = sadness, calm, or exhaustion. Use this to refine your analysis."
        )

    prompt = f"""You are an expert multilingual emotion analyst.
Analyze the text below and return ONLY a valid JSON object with these exact fields:
{{
  "emotion": "one word emotion in English (can be anything: joyful, melancholic, nostalgic, overwhelmed, playful, curious, etc.)",
  "display": "same emotion but properly capitalized",
  "confidence": 0.0 to 1.0,
  "language": "detected language name in English",
  "tone_hint": "2-5 words describing how AI should respond (e.g. warm and encouraging, calm and grounding, playful and fun)"
}}

Rules:
- emotion can be ANY human emotion — not just happy/sad/angry
- Works for ALL languages: English, Hindi, Hinglish, Spanish, French, Arabic, Tamil, etc.
- Works for ALL content: jokes, poetry, complaints, questions, compliments, slang, gibberish
- If unclear, use: neutral, Neutral, 0.7, English, clear and helpful
- Return ONLY the JSON object. No markdown, no explanation.{acoustic_context}

Text to analyze: {text[:500]}"""

    try:
        response = _model.generate_content(prompt)
        raw = response.text.strip()
        # Clean markdown fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return {
            "emotion":    data.get("emotion",    "neutral").lower().strip(),
            "display":    data.get("display",    "Neutral"),
            "confidence": float(data.get("confidence", 0.75)),
            "language":   data.get("language",   "English"),
            "tone_hint":  data.get("tone_hint",  "helpful and clear"),
        }
    except json.JSONDecodeError:
        # Fallback: extract first alpha word from response
        raw_text = response.text.lower() if response else ""
        for word in raw_text.split():
            clean = word.strip('",{}(): ')
            if len(clean) > 2 and clean.isalpha():
                return {
                    "emotion":    clean,
                    "display":    clean.capitalize(),
                    "confidence": 0.65,
                    "language":   "unknown",
                    "tone_hint":  "empathetic and helpful",
                }
        return {"emotion": "neutral", "display": "Neutral", "confidence": 0.5, "language": "unknown", "tone_hint": "helpful and clear"}
    except Exception as e:
        print(f"Emotion detection error: {e}")
        return {"emotion": "neutral", "display": "Neutral", "confidence": 0.5, "language": "unknown", "tone_hint": "helpful and clear"}