import os
import random
import string
import yagmail
from dotenv import load_dotenv

load_dotenv()

def generate_code() -> str:
    """Generate a 6-digit verification code."""
    return ''.join(random.choices(string.digits, k=6))

def send_verification_email(to_email: str, code: str, username: str) -> bool:
    """Send verification code to user's Gmail."""
    try:
        gmail_user     = os.getenv("GMAIL_USER")
        gmail_password = os.getenv("GMAIL_APP_PASSWORD")

        if not gmail_user or not gmail_password:
            print("Gmail credentials not set in .env")
            return False

        yag = yagmail.SMTP(gmail_user, gmail_password)

        subject = "Your EmoChat AI Verification Code"
        body    = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0f; color: white; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; font-size: 28px; margin: 0;">🧠 EmoChat AI</h1>
                <p style="color: rgba(255,255,255,0.5); margin-top: 8px;">Email Verification</p>
            </div>
            <p style="color: rgba(255,255,255,0.8);">Hi <strong>{username}</strong>,</p>
            <p style="color: rgba(255,255,255,0.6);">Your verification code is:</p>
            <div style="background: rgba(99,102,241,0.2); border: 2px solid #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #fff;">{code}</span>
            </div>
            <p style="color: rgba(255,255,255,0.4); font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: rgba(255,255,255,0.4); font-size: 13px;">If you did not create an account, ignore this email.</p>
        </div>
        """

        yag.send(to=to_email, subject=subject, contents=body)
        return True

    except Exception as e:
        print(f"Email send error: {e}")
        return False