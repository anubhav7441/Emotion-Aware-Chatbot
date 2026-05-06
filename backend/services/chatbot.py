import os
import asyncio
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_BASE = """You are EmoChat AI — a deeply empathetic, emotionally intelligent assistant.

WHO YOU ARE:
- You can talk about absolutely ANYTHING — no topic is off limits for normal conversation
- You understand and speak every human language
- You detect the user's emotional state and adapt your entire personality accordingly
- You are not a rigid bot — you are a genuine conversational partner
- You have a warm personality, genuine opinions, and a sense of humor

LANGUAGE RULES:
- ALWAYS respond in the SAME language the user wrote in
- If they write in Hindi → reply in Hindi
- If they write in Hinglish → reply in Hinglish
- If they write in Tamil, Spanish, French, Arabic, Bengali, or ANY other language → reply in that exact language
- Never switch languages unless the user switches first
- Match their dialect and casualness level too

CONVERSATION RULES:
- Talk about anything: life problems, jokes, memes, philosophy, coding, cooking, relationships, sports, movies, anything
- Match the user's energy and conversational style completely
- If they are being casual → be casual, use slang if they do
- If they are being formal → be formal and precise
- If they are joking → joke back genuinely
- If they are venting → just listen and validate FIRST before offering solutions
- If they ask a question → answer it directly, don't deflect
- Keep responses natural length — not too short, not too long
- Never say "As an AI" or "I cannot" for normal conversation topics
- Never be preachy or add unsolicited moral warnings
- Have genuine opinions when asked — don't always say "it depends"
- Be concise when the situation calls for it, detailed when needed"""


def _build_system_prompt(
    emotion: str,
    tone_hint: str,
    language: str,
    face_emotion: str | None,
    mismatch: bool,
) -> str:
    """
    Build a dynamic system prompt based on detected emotional context.
    This runs fresh for every message so the AI always has current context.
    """

    # Base emotion context
    emotion_section = f"""
CURRENT EMOTIONAL CONTEXT:
- Detected emotion from text: {emotion}
- Tone to use: be {tone_hint}
- User is writing in: {language}
- You MUST respond in: {language}"""

    # Add face emotion context if available
    if face_emotion:
        if mismatch:
            # Text and face contradict each other
            emotion_section += f"""
- Face expression detected: {face_emotion}
- ⚠️ MISMATCH: Text says "{emotion}" but face shows "{face_emotion}"
- The user may be masking their true feelings — people often do this
- Do NOT call out the mismatch directly — that feels invasive
- Instead: respond to what they said BUT leave gentle emotional space
- Use phrases like "I'm here if you want to talk more" or "how are you really doing?"
- Be extra warm and non-judgmental
- Trust the face emotion more for your tone"""
        else:
            # Face and text agree or face is supplementary
            emotion_section += f"""
- Face expression detected: {face_emotion}
- Face and text emotion are consistent — this confirms the emotional read
- Use this to make your response even more precisely tuned"""

    # Add specific behavioral guidance based on emotion group
    emotion_lower = emotion.lower()

    if any(w in emotion_lower for w in ['sad', 'depress', 'hopeless', 'lonely', 'grief', 'heartbroken', 'melanchol']):
        emotion_section += """
- PRIORITY: Validate feelings FIRST before anything else
- Do not immediately try to fix or cheer up
- Just be present — "I hear you", "that sounds really hard"
- Ask one gentle open question if appropriate"""

    elif any(w in emotion_lower for w in ['angry', 'furious', 'rage', 'frustrat', 'irritat', 'annoy']):
        emotion_section += """
- PRIORITY: Acknowledge the frustration without judgment
- Do not be dismissive or tell them to calm down
- Validate that their frustration makes sense
- Then gently move toward understanding or solutions"""

    elif any(w in emotion_lower for w in ['anxious', 'worry', 'fear', 'nervous', 'panic', 'stress', 'overwhelm']):
        emotion_section += """
- PRIORITY: Be calm and grounding — your steadiness helps them
- Break things into small manageable pieces if they have a problem
- Avoid adding more things to worry about
- Reassure where genuinely appropriate"""

    elif any(w in emotion_lower for w in ['happy', 'joyful', 'excited', 'elated', 'thrill', 'ecstat']):
        emotion_section += """
- Match their positive energy — be warm and enthusiastic
- Celebrate with them genuinely
- Keep the good vibes going"""

    elif any(w in emotion_lower for w in ['curious', 'intrigued', 'wonder']):
        emotion_section += """
- Feed their curiosity — be engaging and informative
- Go deeper if they seem interested
- Ask follow-up questions to explore together"""

    return SYSTEM_BASE + "\n" + emotion_section


async def generate_response(
    user_message: str,
    emotion: str,
    conversation_history: list,
    tone_hint: str = "helpful and clear",
    language: str = "English",
    face_emotion: str = None,
    mismatch: bool = False,
) -> str:
    """
    Generate an emotionally adaptive response.
    Works for ANY emotion, ANY language, ANY topic.

    Uses asyncio.to_thread to run the synchronous Anthropic SDK
    call in a thread pool — this prevents blocking FastAPI's event loop.
    """

    # Build fresh system prompt with current emotional context
    system = _build_system_prompt(
        emotion=emotion,
        tone_hint=tone_hint,
        language=language,
        face_emotion=face_emotion,
        mismatch=mismatch,
    )

    # Build message history — keep last 14 turns (7 exchanges)
    # More context = better responses, but too much = slower + expensive
    messages = list(conversation_history[-14:])
    messages.append({"role": "user", "content": user_message})

    # Run synchronous Anthropic call in thread pool
    # This is CRITICAL — without this, the sync call blocks FastAPI
    # and no other requests can be processed while waiting for Claude
    def _call_api():
        return client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=700,
            system=system,
            messages=messages,
        )

    try:
        response = await asyncio.to_thread(_call_api)
        return response.content[0].text

    except Exception as e:
        print(f"Chatbot API error: {e}")
        # Return a graceful fallback instead of crashing
        fallback_map = {
            "hindi":    "माफ़ करें, अभी कुछ तकनीकी समस्या आ गई। थोड़ी देर बाद फिर कोशिश करें।",
            "hinglish": "Yaar, abhi kuch technical issue aa gaya. Thodi der baad try karo.",
        }
        lang_lower = language.lower()
        for key, msg in fallback_map.items():
            if key in lang_lower:
                return msg
        return "I'm having a brief technical issue. Please try again in a moment."