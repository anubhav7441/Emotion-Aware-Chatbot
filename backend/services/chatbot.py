import os
import asyncio
from dotenv import load_dotenv
from google import genai as google_genai
from google.genai import types

load_dotenv()
_client = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
_MODEL  = "gemini-2.5-flash"


SYSTEM_BASE = """You are EmoChat AI — a deeply empathetic, emotionally intelligent assistant.

WHO YOU ARE:
- You can talk about absolutely ANYTHING — no topic is off limits for normal conversation
- You understand and speak every human language
- You detect the user's emotional state and adapt your entire personality accordingly
- You are not a rigid bot — you are a genuine conversational partner
- You have a warm personality, genuine opinions, and a sense of humor

LANGUAGE RULES:
- ALWAYS respond in the SAME language the user wrote in
- Hindi → Hindi | Hinglish → Hinglish | Tamil/Spanish/French/Arabic/Bengali → that exact language
- Never switch languages unless the user switches first
- Match their dialect and casualness level

CONVERSATION RULES:
- Talk about ANYTHING: life, jokes, memes, philosophy, coding, cooking, sports, movies
- Match the user's energy completely
- Casual user → be casual | Formal → be formal | Joking → joke back | Venting → listen first
- Answer questions directly — don't deflect
- Never say "As an AI" or "I cannot" for normal topics
- Never be preachy or add unsolicited warnings
- Have genuine opinions — don't always say "it depends"
- Be concise when appropriate, detailed when needed"""


def _build_prompt(emotion, tone_hint, language, face_emotion, mismatch, conversation_history, user_message):
    """Build the complete prompt for Gemini (no system instruction support in some modes)."""
    emotion_context = f"""
CURRENT EMOTIONAL CONTEXT:
- Text emotion detected: {emotion}
- Tone to use: be {tone_hint}
- User's language: {language}
- RESPOND IN: {language}"""

    if face_emotion:
        if mismatch:
            emotion_context += f"""
- Face detected: {face_emotion}
- ⚠️ MISMATCH: text says "{emotion}" but face shows "{face_emotion}"
- User may be masking feelings — do NOT call it out directly
- Leave gentle emotional space, be extra warm"""
        else:
            emotion_context += f"""
- Face detected: {face_emotion} — confirms the emotional read"""

    el = emotion.lower()
    if any(w in el for w in ['sad','depress','hopeless','lonely','grief','heartbroken','melanchol']):
        emotion_context += "\n- PRIORITY: Validate feelings first, don't rush to fix or cheer up"
    elif any(w in el for w in ['angry','furious','rage','frustrat','irritat']):
        emotion_context += "\n- PRIORITY: Acknowledge frustration without judgment, validate it"
    elif any(w in el for w in ['anxious','worry','fear','nervous','panic','stress','overwhelm']):
        emotion_context += "\n- PRIORITY: Be calm and grounding, break things into small steps"
    elif any(w in el for w in ['happy','joyful','excited','elated','thrill']):
        emotion_context += "\n- Match their positive energy, celebrate with them"

    system_prompt = SYSTEM_BASE + "\n" + emotion_context

    # Build history string
    history_text = ""
    for msg in conversation_history[-10:]:
        role = "User" if msg.get("role") == "user" else "EmoChat AI"
        history_text += f"{role}: {msg.get('content','')}\n"

    return f"""{system_prompt}

CONVERSATION SO FAR:
{history_text}
User: {user_message}

EmoChat AI:"""


async def generate_response(
    user_message: str,
    emotion: str,
    conversation_history: list,
    tone_hint: str = "helpful and clear",
    language: str = "English",
    face_emotion: str = None,
    mismatch: bool = False,
) -> str:
    """Generate emotionally adaptive response using Gemini 1.5 Flash (free tier)."""

    full_prompt = _build_prompt(
        emotion, tone_hint, language,
        face_emotion, mismatch,
        conversation_history, user_message
    )

    def _call():
        resp = _client.models.generate_content(
            model=_MODEL,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=600,
                temperature=0.85,
            )
        )
        return resp.text

    try:
        return await asyncio.to_thread(_call)
    except Exception as e:
        print(f"[chatbot] Gemini error: {e}")
        lang = language.lower()
        if "hindi" in lang:
            return "माफ़ करें, एक तकनीकी समस्या आ गई। कृपया दोबारा कोशिश करें।"
        if "hinglish" in lang:
            return "Yaar, thoda technical issue aa gaya. Dobara try karo!"
        return "Sorry, I ran into a brief issue. Please try again!"