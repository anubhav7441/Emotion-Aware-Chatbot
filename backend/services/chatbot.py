import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_BASE = """You are EmoChat AI — an emotionally intelligent assistant that can talk about ANYTHING.

Core rules:
- Respond naturally to any topic: casual chat, serious problems, jokes, technical questions, life advice, anything
- Support multiple languages: English, Hindi, Hinglish — respond in the same language the user uses
- If user writes in Hindi, reply in Hindi. If Hinglish, reply in Hinglish. If English, reply in English
- Never refuse a normal conversation topic
- Keep responses concise but complete — not too short, not too long
- Be a real conversational partner, not just an information dispenser
- Show personality: be warm, witty when appropriate, empathetic always"""

async def generate_response(
    user_message: str,
    emotion: str,
    conversation_history: list
) -> str:
    system = f"{SYSTEM_BASE}\n\nEmotion guidance: The user's current detected emotion is {emotion.upper()}. Adjust your tone naturally to match, support, or empathize with this emotional state."

    messages = list(conversation_history[-12:])
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=600,
        system=system,
        messages=messages
    )
    return response.content[0].text