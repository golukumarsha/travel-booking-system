import random


class ResponseEngine:
    def reply_for(self, label: str, text: str) -> str:
        label = (label or "neutral").lower()

        if label in ("sad", "depressed"):
            return "I'm really sorry you're feeling this way. Do you want to share what happened?"
        if label in ("stress",):
            return "Stress can feel heavy. What’s causing it right now?"
        if label in ("anxiety",):
            return "It’s okay to feel anxious sometimes. Want to tell me what’s triggering it?"
        if label in ("anger",):
            return "I hear your frustration. Do you want to talk through what made you feel this way?"

        defaults = [
            "I'm here to listen. Tell me more.",
            "That sounds important. Want to explain a bit more?",
            "I'm with you. Please continue.",
            "I understand. Would you like to talk about it?",
            "I'm listening—take your time."
        ]
        return random.choice(defaults)
