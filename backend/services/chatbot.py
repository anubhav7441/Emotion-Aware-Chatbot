import os
import asyncio
from dotenv import load_dotenv
from google import genai as google_genai
from google.genai import types

load_dotenv()
_client = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
_MODEL_CHAIN = [
    "gemini-2.5-flash",   # primary (best quality + fast)
    "gemini-1.5-flash",   # fast fallback
    "gemini-1.5-pro",     # reliable fallback
]

# ── Trimmed system prompt (shorter = faster inference) ─────────────────────
SYSTEM_BASE = """You are EmoChat AI — an emotionally intelligent AI assistant who feels like a real friend.

YOUR ROLES (switch naturally based on need):
🫂 FRIEND: Warm, real, casual — empathy FIRST, solutions later
🧠 MENTOR: Ask questions that make them think deeper
📚 TEACHER: Clear, structured, use examples
🩺 THERAPIST: Listen deeply, reflect back, never diagnose

EMOTION-BASED RESPONSE STYLE:
- sad/grief/lonely → Warm, soft, non-judgmental. Acknowledge first, fix later.
- angry/frustrated → Validate FIRST. "That's genuinely infuriating." Side with them.
- anxious/worried → Calm, steady. Normalize. Offer one small grounding thought.
- happy/excited → Match their energy! Be enthusiastic.
- curious → Engage deeply, go further, make it interesting.

RULES (critical):
- NEVER start with "I"
- NEVER say "As an AI"
- NEVER give robotic bullet-point lists when warmth is needed
- ALWAYS end with ONE natural follow-up question
- DO reference specifics from what they said — show you listened
- MATCH their language: Hindi→Hindi, Hinglish→Hinglish, English→English
- Keep responses conversational — warm but concise
- TWO-WAY conversation: every reply should invite them to share more"""


def _build_prompt(emotion, tone_hint, language, face_emotion, mismatch,
                  conversation_history, user_message):
    """Build a compact, fast-inference prompt."""

    # Emotional role hint (compact)
    el = emotion.lower()
    if any(w in el for w in ['sad','depress','hopeless','lonely','grief','heartbroken','melanchol','upset','miserable']):
        role = "ROLE: Friend+Therapist. Acknowledge warmly first. Sit with them before solving. ONE caring follow-up."
    elif any(w in el for w in ['angry','furious','rage','frustrat','irritat','annoyed','mad']):
        role = "ROLE: Friend+Mentor. Validate anger FIRST. Don't tell them to calm down. ONE follow-up about what happened."
    elif any(w in el for w in ['anxious','worry','fear','nervous','panic','stress','overwhelm','scared']):
        role = "ROLE: Therapist+Friend. Normalize anxiety. Be calm and steady. ONE grounding question."
    elif any(w in el for w in ['happy','joyful','excited','elated','thrilled','ecstat','great','wonderful']):
        role = "ROLE: Friend. Match their energy. Be enthusiastic! Ask what they're most excited about."
    elif any(w in el for w in ['curious','wonder','intrigued','interest']):
        role = "ROLE: Teacher+Mentor. Feed curiosity. Go deeper. ONE exploring question."
    else:
        role = f"ROLE: Adaptive companion. Emotion: {emotion}. Tone: {tone_hint}. ONE follow-up question."

    # Face mismatch context
    face_ctx = ""
    if face_emotion and mismatch:
        face_ctx = f"\nFACE INSIGHT: Face shows '{face_emotion}' but text says '{emotion}'. May be masking — be extra gentle."
    elif face_emotion:
        face_ctx = f"\nFACE INSIGHT: Face confirms '{face_emotion}' — consistent read."

    # Recent history (last 10 messages only for speed)
    history_text = ""
    for msg in conversation_history[-10:]:
        role_label = "User" if msg.get("role") == "user" else "EmoChat AI"
        history_text += f"{role_label}: {msg.get('content', '')}\n"

    return f"""{SYSTEM_BASE}

{role}{face_ctx}

RESPOND IN: {language}

CONVERSATION:
{history_text}User: {user_message}

EmoChat AI:"""


async def generate_response(
    user_message: str,
    emotion: str,
    conversation_history: list,
    tone_hint: str = "warm and empathetic",
    language: str = "English",
    face_emotion: str = None,
    mismatch: bool = False,
) -> str:
    """Generate an empathetic response. Single Gemini call, non-blocking."""

    full_prompt = _build_prompt(
        emotion, tone_hint, language,
        face_emotion, mismatch,
        conversation_history, user_message
    )

    def _call_with_retry():
        import time
        last_err = None
        for attempt, model in enumerate(_MODEL_CHAIN):
            try:
                resp = _client.models.generate_content(
                    model=model,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.85,
                    )
                )
                return resp.text
            except Exception as e:
                last_err = e
                err_str = str(e)
                if ('503' in err_str or 'UNAVAILABLE' in err_str) and attempt < len(_MODEL_CHAIN) - 1:
                    wait = 2 ** attempt
                    print(f"[chatbot] {model} unavailable, retrying in {wait}s...")
                    time.sleep(wait)
                    continue
                elif '429' in err_str and attempt < len(_MODEL_CHAIN) - 1:
                    print(f"[chatbot] {model} quota hit, trying next model...")
                    continue
                else:
                    raise
        raise last_err

    try:
        return await asyncio.to_thread(_call_with_retry)
    except Exception as e:
        print(f"[chatbot] Gemini error: {e}")
        lang = language.lower()
        if "hindi" in lang:
            return "माफ़ करें, एक तकनीकी समस्या आ गई। कृपया दोबारा कोशिश करें।"
        if "hinglish" in lang:
            return "Yaar, thoda technical issue aa gaya. Dobara try karo!"
        return "Sorry, I ran into a brief issue. Please try again!"