import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def detect_text_emotion(text: str, voice_energy: float = None, voice_pitch: float = None) -> dict:
    """
    Detect emotion from ANY text in ANY language, optionally fusing raw voice acoustics.
    Returns free-form emotion label — not restricted to a fixed list.
    """
    if not text or not text.strip():
        return {
            "emotion":      "neutral",
            "display":      "Neutral",
            "confidence":   0.9,
            "language":     "unknown",
            "tone_hint":    "neutral and helpful",
        }

    try:
        system_prompt = """You are an expert multilingual emotion analyst.
Analyze ANY text in ANY language and return a JSON object.

Return ONLY valid JSON with these fields:
{
  "emotion": "one word emotion in English (can be anything: joyful, melancholic, nostalgic, overwhelmed, playful, etc.)",
  "display": "same emotion but properly capitalized",
  "confidence": 0.0 to 1.0,
  "language": "detected language name in English",
  "tone_hint": "2-5 words describing how AI should respond (e.g. warm and encouraging, calm and grounding, playful and fun)"
}

Rules:
- emotion can be ANY human emotion — not just happy/sad/angry
- Works for all languages: English, Hindi, Hinglish, Spanish, French, Arabic, Tamil, etc.
- Works for all content: jokes, poetry, complaints, questions, compliments, gibberish, slang
- If text is unclear, use: neutral, Neutral, 0.7, English, clear and helpful
- Return ONLY the JSON object. No markdown, no explanation."""

        acoustic_context = ""
        if voice_energy is not None and voice_pitch is not None:
            acoustic_context = f"\n\nAdditional Voice Acoustics (for context):\nEnergy (volume/intensity): {voice_energy:.3f}\nPitch (Hz): {voice_pitch:.1f}\nNote: High energy/pitch usually means excitement, anger, or panic. Low means sadness, calmness, or exhaustion. Use this to refine your text analysis."

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=120,
            system=system_prompt + acoustic_context,
            messages=[{"role": "user", "content": text[:500]}]
        )

        raw  = response.content[0].text.strip()

        # Clean any accidental markdown
        raw  = raw.replace('```json', '').replace('```', '').strip()
        data = json.loads(raw)

        return {
            "emotion":    data.get("emotion",    "neutral").lower().strip(),
            "display":    data.get("display",    "Neutral"),
            "confidence": float(data.get("confidence", 0.75)),
            "language":   data.get("language",   "English"),
            "tone_hint":  data.get("tone_hint",  "helpful and clear"),
        }

    except json.JSONDecodeError:
        # If JSON parsing fails extract emotion word directly
        text_lower = response.content[0].text.lower()
        for word in text_lower.split():
            clean = word.strip('",{}(): ')
            if len(clean) > 2 and clean.isalpha():
                return {
                    "emotion":    clean,
                    "display":    clean.capitalize(),
                    "confidence": 0.65,
                    "language":   "unknown",
                    "tone_hint":  "empathetic and helpful",
                }
        return {
            "emotion":    "neutral",
            "display":    "Neutral",
            "confidence": 0.5,
            "language":   "unknown",
            "tone_hint":  "helpful and clear",
        }

    except Exception as e:
        print(f"Emotion detection error: {e}")
        return {
            "emotion":    "neutral",
            "display":    "Neutral",
            "confidence": 0.5,
            "language":   "unknown",
            "tone_hint":  "helpful and clear",
        }