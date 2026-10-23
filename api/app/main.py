from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.ai import AIService, EntityRequest, Failure, SummaryRequest, TranslateRequest
from app.config import Settings


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["samvad-api"] = "samvad-api"
    phase: Literal["P4"] = "P4"
    checks: dict[str, str]


def create_app(settings: Settings | None = None, transport=None) -> FastAPI:
    config = settings if settings is not None else Settings()
    service = AIService(config, transport=transport)

    @asynccontextmanager
    async def lifespan(app):
        yield
        await service.close()

    app = FastAPI(title="Samvad API", version="0.4.0", lifespan=lifespan)
    app.state.ai = service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        # Liveness only: configured values never imply verified connectivity.
        return HealthResponse(checks={
            "settings": "valid",
            "supabase": "not_checked" if config.supabase_url else "not_configured",
            "ai": "configured_not_verified" if service.ready() else "disabled_or_missing_configuration",
        })

    @app.exception_handler(Failure)
    async def failure_handler(request, exc):
        return JSONResponse(status_code=exc.status, content={"error": {
            "code": exc.code, "message": exc.message, "retryable": exc.status in {429, 503},
        }}, headers={"Retry-After": "60"} if exc.status == 429 else {})

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request, exc):
        return JSONResponse(status_code=400, content={"error": {
            "code": "invalid_request", "message": "Check content ID, type and language.", "retryable": False,
        }})

    async def identity(request: Request):
        return await service.authenticate(request)

    @app.post('/v1/translate')
    async def translate(payload: TranslateRequest, actor: Annotated[tuple[str, str], Depends(identity)]):
        return await service.process('translation', payload, actor)

    @app.post('/v1/summarize-news')
    async def summarize(payload: SummaryRequest, actor: Annotated[tuple[str, str], Depends(identity)]):
        return await service.process('summary', payload, actor)

    @app.post('/v1/moderate')
    async def moderate(payload: EntityRequest, actor: Annotated[tuple[str, str], Depends(identity)]):
        return await service.process('moderation', payload, actor)

    return app
