import re

class EmotionModel:
    """
    Baseline rule-based emotion detector.
    Replace this with your real ML model if available.
    """
    def __init__(self, mode='baseline'):
        self.mode = mode

    def predict_emotion(self, text: str):
        t = text.lower()

        sadness = ["sad", "depressed", "alone", "cry", "hopeless"]
        anxiety = ["anxious", "anxiety", "panic", "nervous", "overthinking"]
        stress = ["stress", "tension", "pressure", "burnout"]
        anger = ["angry", "rage", "furious", "irritated"]

        def contains(words):
            return any(w in t for w in words)

        if contains(sadness):
            return "sad", 0.82
        if contains(anxiety):
            return "anxiety", 0.80
        if contains(stress):
            return "stress", 0.78
        if contains(anger):
            return "anger", 0.76

        return "neutral", 0.60
