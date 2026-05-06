import os
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

LANGUAGE RULES:
- ALWAYS respond in the SAME language the user wrote in
- If they write in Hindi → reply in Hindi
- If they write in Hinglish → reply in Hinglish  
- If they write in Tamil, Spanish, French, Arabic, or any other language → reply in that language
- Never switch languages unless the user switches first

CONVERSATION RULES:
- Talk about anything: life problems, jokes, memes, philosophy, coding, cooking, relationships, anything
- Match the user's energy and conversational style
- If they're being casual → be casual
- If they're being formal → be formal
- If they're joking → joke back
- If they're venting → just listen and validate first
- Keep responses natural length — not too short, not too long
- Never say "As an AI" or "I cannot" for normal conversation topics
- Have opinions, preferences, personality"""

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
    Generate a response adapting to ANY emotion, ANY language, ANY topic.
    """

    # Build dynamic emotion context
    emotion_context = f"""
CURRENT EMOTIONAL CONTEXT:
- Detected emotion: {emotion}
- How to respond: be {tone_hint}
- User's language: {language}
- Respond in: {language}"""

    if face_emotion and face_emotion != emotion:
        emotion_context += f"""
- Face expression shows: {face_emotion}
- TEXT vs FACE mismatch detected
- The user may be masking their true feelings
- Gently acknowledge both what they said AND what their expression suggests
- Be extra compassionate — don't force it, just create space"""

    system = SYSTEM_BASE + "\n" + emotion_context

    # Build conversation — keep last 14 turns for good context
    messages = list(conversation_history[-14:])
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=700,
        system=system,
        messages=messages
    )

    return response.content[0].text