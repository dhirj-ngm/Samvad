"""Legacy disabled P0 adapter, retained for bootstrap regressions.

P4 uses app.ai.AIService with authenticated source reads, shared SQL quotas and
the Groq HTTP boundary. This legacy adapter never produces inference results.
"""

from dataclasses import dataclass
from typing import Literal, Protocol

Task = Literal["translation", "summary", "moderation"]


@dataclass(frozen=True)
class InferenceRequest:
    task: Task
    text: str
    target_language: Literal["en", "hi", "ml"]


@dataclass(frozen=True)
class InferenceResult:
    text: str
    provider: str
    model_id: str
    prompt_version: str
    provenance: Literal["live", "cache", "fixture"]


class AIUnavailable(RuntimeError):
    pass


class AIProvider(Protocol):
    async def generate(self, request: InferenceRequest) -> InferenceResult: ...


class GroqProviderSkeleton:
    async def generate(self, request: InferenceRequest) -> InferenceResult:
        raise AIUnavailable("Live inference is not implemented in P0")
