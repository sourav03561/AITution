import requests

API_KEY = "AIzaSyDck8jjiQKOs86EmTKCKbAm_VJReG9jU88"

url = "https://generativelanguage.googleapis.com//v1beta/models/gemini-2.5-flash:generateContent"

headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": "AIzaSyB53kVMWmg04B9cMqMxoGRLbfhzMCFO0XU",
}

payload = {
    "contents": [
        {
            "parts": [
                {"text": "Hello Gemini"}
            ]
        }
    ]
}

response = requests.post(url, headers=headers, json=payload)

print(response.status_code)
print(response.text)
