from fastapi import Request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

http_requests_total = Counter(
    "hopdrop_routing_search_http_requests_total",
    "Total HTTP requests processed by routing-search",
    labelnames=("method", "route", "status_code"),
)

http_request_duration_seconds = Histogram(
    "hopdrop_routing_search_http_request_duration_seconds",
    "HTTP request duration in seconds for routing-search",
    labelnames=("method", "route", "status_code"),
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)

http_errors_total = Counter(
    "hopdrop_routing_search_http_errors_total",
    "HTTP errors returned by routing-search",
    labelnames=("method", "route", "status_code"),
)


def metrics_payload() -> bytes:
    return generate_latest()


def metrics_content_type() -> str:
    return CONTENT_TYPE_LATEST


def get_metrics_route(request: Request) -> str:
    route = request.scope.get("route")
    route_path = getattr(route, "path", None)
    if route_path:
        return route_path
    return request.url.path


def record_http_request(request: Request, status_code: int, duration_seconds: float) -> None:
    route = get_metrics_route(request)
    labels = {
        "method": request.method,
        "route": route,
        "status_code": str(status_code),
    }

    http_requests_total.labels(**labels).inc()
    http_request_duration_seconds.labels(**labels).observe(duration_seconds)

    if status_code >= 500:
        http_errors_total.labels(**labels).inc()
