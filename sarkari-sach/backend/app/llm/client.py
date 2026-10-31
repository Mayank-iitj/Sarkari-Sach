from __future__ import annotations
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
    if settings.LLM_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
        from app.llm.anthropic_client import AnthropicClient
        return AnthropicClient()
    from app.llm.fake_client import FakeClient
    return FakeClient()
