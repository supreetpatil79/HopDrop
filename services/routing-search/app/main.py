from fastapi import FastAPI, Response

from app.config import settings
from app.indexing_service import (
    upsert_delivery_request_document,
    upsert_location_document,
    upsert_trip_document,
)
from app.maps_service import (
    record_search_selection,
    resolve_address as resolve_address_payload,
    route_geometry,
    suggest_cities,
)
from app.matching_service import match_candidates as match_candidates_payload
from app.metrics import metrics_content_type, metrics_payload
from app.observability import configure_logging, init_sentry, observe_request
from app.schemas import (
    AddressResolveRequest,
    HealthResponse,
    MatchCandidatesRequest,
    MatchCandidatesResponse,
    RouteGeometryRequest,
    SearchLocationsRequest,
    SearchSelectionFeedbackRequest,
)

configure_logging()
init_sentry()

app = FastAPI(
    title="HopDrop Routing Search",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.middleware("http")(observe_request)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(service=settings.service_name, status="ok")


@app.get("/ready", response_model=HealthResponse)
def ready() -> HealthResponse:
    return HealthResponse(service=settings.service_name, status="ok")


@app.get("/metrics")
def metrics() -> Response:
    return Response(content=metrics_payload(), media_type=metrics_content_type())


@app.post("/internal/v1/resolve-address")
def resolve_address_handler(payload: AddressResolveRequest) -> dict:
    return resolve_address_payload(payload.query, payload.region)


@app.post("/internal/v1/search/locations")
def search_locations(payload: SearchLocationsRequest) -> dict:
    return suggest_cities(payload.query, payload.region, payload.limit, payload.actor, payload.field)


@app.post("/internal/v1/search/feedback/select")
def search_selection_feedback(payload: SearchSelectionFeedbackRequest) -> dict:
    return record_search_selection(
        query=payload.query,
        region=payload.region,
        actor=payload.actor,
        field=payload.field,
        suggestion={
            "place_id": payload.place_id,
            "place_name": payload.place_name,
            "place_address": payload.place_address,
            "city": payload.city,
            "state": payload.state,
        },
    )


@app.post("/internal/v1/route-geometry")
def search_route_geometry(payload: RouteGeometryRequest) -> dict:
    return route_geometry(payload.origin_lng, payload.origin_lat, payload.dest_lng, payload.dest_lat)


@app.post("/internal/v1/match/candidates", response_model=MatchCandidatesResponse)
def match_candidates(payload: MatchCandidatesRequest) -> MatchCandidatesResponse:
    return match_candidates_payload(payload)


@app.post("/internal/v1/index/trip-upsert")
def trip_upsert_index(payload: dict) -> dict:
    return upsert_trip_document(payload)


@app.post("/internal/v1/index/location-upsert")
def location_upsert_index(payload: dict) -> dict:
    return upsert_location_document(payload)


@app.post("/internal/v1/index/delivery-request-upsert")
def delivery_request_upsert_index(payload: dict) -> dict:
    return upsert_delivery_request_document(payload)
