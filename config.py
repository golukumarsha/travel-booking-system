import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    DB_PATH: str = os.getenv("DB_PATH", "mood.db")

    SYSTEM_PROMPT: str = os.getenv(
        "SYSTEM_PROMPT",
        "You are a helpful mental wellness assistant. Be empathetic, supportive, and concise. "
        "If user expresses self-harm thoughts, encourage reaching professional help immediately."
    )

settings = Settings()
