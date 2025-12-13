import requests
import json

class LocalLLM:
    def __init__(self, model="deepseek-r1:8b", url="http://localhost:11434/api/chat"):
        self.model = model
        self.url = url

    def generate(self, prompt: str) -> str:
        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        response = requests.post(self.url, json=payload)
        response.raise_for_status()

        data = response.json()
        return data["message"]["content"]
