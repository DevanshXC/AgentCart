import httpx
import json
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class LLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict], model: str) -> str:
        pass

    @abstractmethod
    async def health(self) -> bool:
        pass

    @abstractmethod
    async def list_models(self) -> list[str]:
        pass

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.timeout = httpx.Timeout(10.0, read=30.0)

    async def chat(self, messages: list[dict], model: str) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            try:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "")
            except Exception as e:
                import logging
                logging.error(f"Ollama chat error: {e}")
                raise

    async def health(self) -> bool:
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
            except Exception:
                return False

    async def list_models(self) -> list[str]:
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return [m.get("name") for m in data.get("models", [])]
            except Exception:
                return []
