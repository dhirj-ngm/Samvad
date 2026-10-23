from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import Settings


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["samvad-api"] = "samvad-api"
    phase: Literal["P0"] = "P0"
    checks: dict[str, str]


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else Settings()
    app = FastAPI(title="Samvad API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        # Liveness only: configured values never imply verified connectivity.
        return HealthResponse(checks={
            "settings": "valid",
            "supabase": "not_checked" if config.supabase_url else "not_configured",
            "ai": "disabled_p0",
        })

    return app
