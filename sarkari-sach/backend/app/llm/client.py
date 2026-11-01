from __future__ import annotations
import os
from typing import Protocol, Any
from app.settings import settings


class LLMClient(Protocol):
    def json(
        self,
        system: str,
        user: str | list,
        schema: dict,
        *,
        images: list[bytes] | None = None
    ) -> dict[str, Any]:
        ...

    def text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 400
    ) -> str:
        ...


def get_llm_client() -> LLMClient:
    """
    Returns the configured LLM client:
    1. Google Gemini 1.5/2.0 Flash (if GEMINI_API_KEY set or LLM_PROVIDER="gemini")
    2. Anthropic Claude 3.5 Sonnet (if ANTHROPIC_API_KEY set or LLM_PROVIDER="anthropic")
    3. OpenAI GPT-4o (if OPENAI_API_KEY set or LLM_PROVIDER="openai")
    4. Deterministic Grounded Engine (100% offline, zero-hallucination baseline)
    """
    # 1. Google Gemini (Native Ecosystem)
    gemini_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")
    if settings.LLM_PROVIDER == "gemini" or gemini_key:
        from app.llm.gemini_client import GeminiClient
        return GeminiClient(api_key=gemini_key)

    # 2. Anthropic Claude (if key available)
    if settings.LLM_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
        from app.llm.anthropic_client import AnthropicClient
        return AnthropicClient()

    # 3. OpenAI / GPT-4o / Compatible (if key available)
    if settings.LLM_PROVIDER == "openai" or os.getenv("OPENAI_API_KEY"):
        from app.llm.openai_client import OpenAIClient
        return OpenAIClient()

    # Default: Live Google Gemini API (Strict Realtime Pipeline)
    from app.llm.gemini_client import GeminiClient
    return GeminiClient(api_key=gemini_key)
