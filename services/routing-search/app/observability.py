import logging
import time
import uuid
from collections.abc import Awaitable, Callable

import sentry_sdk
import structlog
from fastapi import Request, Response
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.config import settings
from app.metrics import record_http_request


def configure_logging() -> None:
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", level=log_level)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def init_sentry() -> None:
    if not settings.sentry_dsn:
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.env,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        integrations=[FastApiIntegration()],
    )


logger = structlog.get_logger("routing-search")


async def observe_request(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = request.headers.get("x-request-id") or request.headers.get("x-correlation-id") or str(uuid.uuid4())
    started_at = time.perf_counter()

    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        service=settings.service_name,
        env=settings.env,
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )

    try:
        response = await call_next(request)
    except Exception:
        duration_seconds = time.perf_counter() - started_at
        record_http_request(request, 500, duration_seconds)
        logger.exception("http_request_failed")
        raise

    duration_seconds = time.perf_counter() - started_at
    record_http_request(request, response.status_code, duration_seconds)
    latency_ms = round(duration_seconds * 1000, 2)
    response.headers["X-Request-Id"] = request_id
    logger.info(
        "http_request",
        status_code=response.status_code,
        latency_ms=latency_ms,
        client_host=request.client.host if request.client else None,
    )
    return response
