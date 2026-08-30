import urllib.request
import json
import urllib.error

try:
    req = urllib.request.Request("http://localhost:11434/api/tags")
    with urllib.request.urlopen(req) as response:
        print("Ollama Tags HTTP Status:", response.status)
        print("Models:", json.loads(response.read().decode())["models"])
except urllib.error.URLError as e:
    print("Ollama connection failed:", e.reason)

try:
    data = json.dumps({"model": "qwen2.5:7b", "messages": [{"role": "user", "content": "hi"}], "stream": False}).encode("utf-8")
    req = urllib.request.Request("http://localhost:11434/api/chat", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as response:
        print("Ollama Chat HTTP Status:", response.status)
except urllib.error.HTTPError as e:
    print("Ollama Chat HTTP Error:", e.code, e.read().decode())
except urllib.error.URLError as e:
    print("Ollama Chat Connection failed:", e.reason)
