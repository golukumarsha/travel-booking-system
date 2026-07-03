from openai import OpenAI
from config import settings

class OpenAIChat:
    def __init__(self, api_key: str, model: str, system_prompt: str):
        if not api_key:
            raise ValueError("OPENAI_API_KEY is missing. Put it in .env")
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.system_prompt = system_prompt

    def reply(self, text: str, emotion: str = None, score: float = None) -> str:
        emotion_info = ""
        if emotion:
            emotion_info = f"\n\n(Detected emotion: {emotion}, confidence: {score:.2f})"

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": text + emotion_info}
        ]

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7
        )

        return resp.choices[0].message.content.strip()
