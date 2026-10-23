"""P0 configuration only; no network requests or implicit inference."""

from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="forbid", hide_input_in_errors=True)

    supabase_url: str = ""
    supabase_jwks_url: str = ""
    supabase_jwt_audience: Literal["authenticated"] = "authenticated"
    ai_provider: Literal["groq"] = "groq"
    ai_base_url: Literal["https://api.groq.com/openai/v1"] = "https://api.groq.com/openai/v1"
    groq_api_key: SecretStr = SecretStr("")
    # Intentionally unset until the operator selects verified account-visible IDs.
    ai_translation_model: str = ""
    ai_summary_model: str = ""
    ai_moderation_model: str = ""
    ai_free_tier_only: bool = True
    ai_allow_paid_fallback: bool = False
    ai_max_requests_per_minute: int = Field(default=10, ge=1, le=10)
    ai_max_requests_per_day: int = Field(default=100, ge=1, le=100)
    ai_max_tokens_per_minute: int = Field(default=4000, ge=1, le=4000)
    ai_max_tokens_per_day: int = Field(default=50000, ge=1, le=50000)
    ai_max_concurrent_requests: int = Field(default=1, ge=1, le=1)
    ai_max_input_chars: int = Field(default=6000, ge=1, le=6000)
    ai_max_output_tokens: int = Field(default=512, ge=1, le=512)
    ai_request_timeout_seconds: float = Field(default=20, gt=0, le=20)
    demo_mode: bool = False
    allowed_origins: list[str] = Field(default_factory=list)

    @field_validator("supabase_url", "supabase_jwks_url")
    @classmethod
    def https_url(cls, value: str) -> str:
        if not value:
            return value
        parts = urlsplit(value)
        if (parts.scheme != "https" or not parts.hostname or parts.username
                or parts.password or parts.query or parts.fragment):
            raise ValueError("Expected HTTPS URL without credentials, query or fragment")
        return value.rstrip("/")

    @field_validator("allowed_origins")
    @classmethod
    def explicit_origins(cls, values: list[str]) -> list[str]:
        for value in values:
            parts = urlsplit(value)
            if (parts.scheme not in {"https", "http"} or not parts.hostname
                    or parts.path or parts.query or parts.fragment or parts.username
                    or parts.password):
                raise ValueError("Use explicit origins without paths or credentials")
            if parts.scheme == "http" and parts.hostname not in {"localhost", "127.0.0.1"}:
                raise ValueError("Non-loopback origins must use HTTPS")
        return values

    @model_validator(mode="after")
    def consistent_limits_and_jwks(self) -> "Settings":
        if not self.ai_free_tier_only or self.ai_allow_paid_fallback:
            raise ValueError("Free-tier only is mandatory; paid fallback is prohibited")
        if self.supabase_jwks_url and not self.supabase_url:
            raise ValueError("SUPABASE_JWKS_URL requires SUPABASE_URL")
        if self.supabase_url:
            if urlsplit(self.supabase_url).path:
                raise ValueError("SUPABASE_URL must be the project origin")
            expected = self.supabase_url + "/auth/v1/.well-known/jwks.json"
            if self.supabase_jwks_url and self.supabase_jwks_url != expected:
                raise ValueError("JWKS must belong to the configured Supabase project")
        if self.ai_max_requests_per_minute > self.ai_max_requests_per_day:
            raise ValueError("Minute request budget exceeds daily budget")
        if self.ai_max_tokens_per_minute > self.ai_max_tokens_per_day:
            raise ValueError("Minute token budget exceeds daily budget")
        if self.ai_max_output_tokens > self.ai_max_tokens_per_minute:
            raise ValueError("Output token cap exceeds minute token budget")
        return self
