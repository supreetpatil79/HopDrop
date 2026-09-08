import json
import re
from datetime import UTC, datetime
from typing import Any

import h3

from app.maps_service import get_cache, haversine_km

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
TRIP_SET_KEY = "idx:trips"
DELIVERY_REQUEST_SET_KEY = "idx:delivery_requests"
H3_RESOLUTIONS = (5, 6, 7)


def _indexed_at() -> str:
    return datetime.now(UTC).isoformat()


def trip_index_key(trip_id: str) -> str:
    return f"idx:trip:{trip_id}"


def delivery_request_index_key(request_id: str) -> str:
    return f"idx:delivery_request:{request_id}"


def location_index_key(location_id: str) -> str:
    return f"idx:location:{location_id}"


def _token_key(kind: str, token: str) -> str:
    return f"idx:token:{kind}:{token}"


def _h3_key(kind: str, cell: str) -> str:
    return f"idx:h3:{kind}:{cell}"


def _load_document(key: str) -> dict[str, Any]:
    cache = get_cache()
    raw = cache.hget(key, "document")
    if not raw:
        return {}

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _normalize_location(payload: dict[str, Any] | None, fallback: dict[str, Any] | None = None) -> dict[str, Any]:
    source = payload or fallback or {}
    coordinates = source.get("coordinates") or {}
    point = coordinates.get("coordinates") if isinstance(coordinates, dict) else None

    longitude = source.get("longitude")
    latitude = source.get("latitude")
    if isinstance(point, list) and len(point) >= 2:
        longitude = longitude if longitude is not None else point[0]
        latitude = latitude if latitude is not None else point[1]

    return {
        "city": source.get("city") or (fallback or {}).get("city"),
        "state": source.get("state") or (fallback or {}).get("state"),
        "place_id": source.get("place_id") or source.get("placeId") or (fallback or {}).get("place_id"),
        "latitude": latitude if latitude is not None else (fallback or {}).get("latitude"),
        "longitude": longitude if longitude is not None else (fallback or {}).get("longitude"),
    }


def _normalize_package(payload: dict[str, Any] | None, fallback: dict[str, Any] | None = None) -> dict[str, Any]:
    source = payload or fallback or {}
    return {
        "weight_kg": source.get("weight_kg") or source.get("weightKg") or (fallback or {}).get("weight_kg") or 0,
        "category": source.get("category") or (fallback or {}).get("category"),
        "is_fragile": source.get("is_fragile")
        if "is_fragile" in source
        else source.get("isFragile", (fallback or {}).get("is_fragile", False)),
        "declared_value": source.get("declared_value")
        or source.get("declaredValue")
        or (fallback or {}).get("declared_value"),
    }


def _normalize_capacity(payload: dict[str, Any] | None, fallback: dict[str, Any] | None = None) -> dict[str, Any]:
    source = payload or fallback or {}
    return {
        "weight_kg": source.get("weight_kg") or source.get("weightKg") or (fallback or {}).get("weight_kg") or 0,
        "allowed_categories": source.get("allowed_categories")
        or source.get("allowedCategories")
        or (fallback or {}).get("allowed_categories")
        or [],
    }


def _normalize_window(payload: dict[str, Any] | None, fallback: dict[str, Any] | None = None) -> dict[str, Any]:
    source = payload or fallback or {}
    return {
        "earliest": source.get("earliest") or (fallback or {}).get("earliest"),
        "latest": source.get("latest") or (fallback or {}).get("latest"),
    }


def _tokenize(parts: list[str | None]) -> list[str]:
    tokens: set[str] = set()
    for part in parts:
        if not part:
            continue

        normalized = str(part).strip().lower()
        for token in TOKEN_PATTERN.findall(normalized):
            if len(token) >= 2:
                tokens.add(token)

    return sorted(tokens)


def _interpolated_points(origin: dict[str, Any], destination: dict[str, Any]) -> list[tuple[float, float]]:
    origin_lng = origin.get("longitude")
    origin_lat = origin.get("latitude")
    dest_lng = destination.get("longitude")
    dest_lat = destination.get("latitude")

    if None in {origin_lng, origin_lat, dest_lng, dest_lat}:
        return []

    distance_km = haversine_km((origin_lng, origin_lat), (dest_lng, dest_lat))
    steps = max(2, min(16, int(distance_km // 75) + 2))
    points: list[tuple[float, float]] = []

    for step in range(steps + 1):
        ratio = step / steps
        lng = origin_lng + (dest_lng - origin_lng) * ratio
        lat = origin_lat + (dest_lat - origin_lat) * ratio
        points.append((lat, lng))

    return points


def _h3_cells(location: dict[str, Any]) -> list[str]:
    longitude = location.get("longitude")
    latitude = location.get("latitude")
    if longitude is None or latitude is None:
        return []

    cells = {h3.latlng_to_cell(latitude, longitude, resolution) for resolution in H3_RESOLUTIONS}
    return sorted(cells)


def _route_cells(origin: dict[str, Any], destination: dict[str, Any]) -> list[str]:
    cells: set[str] = set()
    for lat, lng in _interpolated_points(origin, destination):
        for resolution in H3_RESOLUTIONS:
            cells.add(h3.latlng_to_cell(lat, lng, resolution))
    return sorted(cells)


def _remove_memberships(kind: str, document_id: str, document: dict[str, Any]) -> None:
    if not document:
        return

    cache = get_cache()
    pipe = cache.pipeline()

    for token in document.get("lexical_terms", []):
        pipe.srem(_token_key(kind, token), document_id)

    for cell in document.get("route_cells", []):
        pipe.srem(_h3_key(kind, cell), document_id)

    pipe.execute()


def _add_memberships(kind: str, document_id: str, document: dict[str, Any]) -> None:
    cache = get_cache()
    pipe = cache.pipeline()

    for token in document.get("lexical_terms", []):
        pipe.sadd(_token_key(kind, token), document_id)

    for cell in document.get("route_cells", []):
        pipe.sadd(_h3_key(kind, cell), document_id)

    pipe.execute()


def _candidate_ids(kind: str, anchor: dict[str, Any], limit: int) -> list[str]:
    cache = get_cache()
    scores: dict[str, float] = {}

    for token in anchor.get("lexical_terms", []):
        for candidate_id in cache.smembers(_token_key(kind, token)):
            scores[candidate_id] = scores.get(candidate_id, 0.0) + 2.0

    for cell in anchor.get("origin_cells", []):
        for candidate_id in cache.smembers(_h3_key(kind, cell)):
            scores[candidate_id] = scores.get(candidate_id, 0.0) + 5.0

    for cell in anchor.get("destination_cells", []):
        for candidate_id in cache.smembers(_h3_key(kind, cell)):
            scores[candidate_id] = scores.get(candidate_id, 0.0) + 5.0

    for cell in anchor.get("route_cells", []):
        for candidate_id in cache.smembers(_h3_key(kind, cell)):
            scores[candidate_id] = scores.get(candidate_id, 0.0) + 1.0

    if not scores:
        seed_ids = cache.smembers(TRIP_SET_KEY if kind == "trip" else DELIVERY_REQUEST_SET_KEY)
        return sorted(seed_ids)[: max(limit * 8, 32)]

    ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    return [candidate_id for candidate_id, _ in ordered[: max(limit * 8, 48)]]


def _normalize_trip_document(payload: dict[str, Any], existing: dict[str, Any]) -> dict[str, Any]:
    origin = _normalize_location(payload.get("origin"), existing.get("origin"))
    destination = _normalize_location(payload.get("destination"), existing.get("destination"))
    capacity = _normalize_capacity(payload.get("available_capacity") or payload.get("availableCapacity"), existing.get("available_capacity"))
    lexical_terms = _tokenize([origin.get("city"), destination.get("city"), origin.get("place_id"), destination.get("place_id")])
    origin_cells = _h3_cells(origin)
    destination_cells = _h3_cells(destination)

    return {
        **existing,
        **payload,
        "trip_id": str(payload.get("trip_id") or payload.get("tripId") or payload.get("aggregate_id") or existing.get("trip_id") or ""),
        "carrier_id": payload.get("carrier_id") or payload.get("carrierId") or existing.get("carrier_id"),
        "origin": origin,
        "destination": destination,
        "departure_time": payload.get("departure_time") or payload.get("departureTime") or existing.get("departure_time"),
        "estimated_arrival_time": payload.get("estimated_arrival_time")
        or payload.get("estimatedArrivalTime")
        or existing.get("estimated_arrival_time"),
        "price_per_kg": payload.get("price_per_kg") or payload.get("pricePerKg") or existing.get("price_per_kg") or 0,
        "available_capacity": capacity,
        "status": payload.get("status") or existing.get("status"),
        "safety_deposit_paid": payload.get("safety_deposit_paid")
        if "safety_deposit_paid" in payload
        else payload.get("safetyDepositPaid", existing.get("safety_deposit_paid", False)),
        "carrier_rating_average": payload.get("carrier_rating_average")
        or payload.get("carrierRatingAverage")
        or existing.get("carrier_rating_average")
        or 5.0,
        "carrier_total_deliveries": payload.get("carrier_total_deliveries")
        or payload.get("carrierTotalDeliveries")
        or existing.get("carrier_total_deliveries")
        or 0,
        "lexical_terms": lexical_terms,
        "origin_cells": origin_cells,
        "destination_cells": destination_cells,
        "route_cells": _route_cells(origin, destination),
        "indexed_at": _indexed_at(),
    }


def _normalize_delivery_request_document(payload: dict[str, Any], existing: dict[str, Any]) -> dict[str, Any]:
    origin = _normalize_location(payload.get("origin"), existing.get("origin"))
    destination = _normalize_location(payload.get("destination"), existing.get("destination"))
    package = _normalize_package(payload.get("package"), existing.get("package"))
    pickup_window = _normalize_window(
        payload.get("pickup_window") or payload.get("preferredDeliveryWindow"),
        existing.get("pickup_window"),
    )
    lexical_terms = _tokenize([origin.get("city"), destination.get("city"), origin.get("place_id"), destination.get("place_id")])
    origin_cells = _h3_cells(origin)
    destination_cells = _h3_cells(destination)

    return {
        **existing,
        **payload,
        "delivery_request_id": str(
            payload.get("delivery_request_id")
            or payload.get("requestId")
            or payload.get("aggregate_id")
            or existing.get("delivery_request_id")
            or ""
        ),
        "sender_id": payload.get("sender_id") or payload.get("senderId") or payload.get("userId") or existing.get("sender_id"),
        "origin": origin,
        "destination": destination,
        "pickup_window": pickup_window,
        "package": package,
        "status": payload.get("status") or existing.get("status"),
        "payment_status": payload.get("payment_status")
        or payload.get("paymentStatus")
        or existing.get("payment_status"),
        "total_charge": payload.get("total_charge") or payload.get("totalCharge") or existing.get("total_charge"),
        "lexical_terms": lexical_terms,
        "origin_cells": origin_cells,
        "destination_cells": destination_cells,
        "route_cells": _route_cells(origin, destination),
        "indexed_at": _indexed_at(),
    }


def upsert_trip_document(payload: dict[str, Any]) -> dict[str, Any]:
    trip_id = str(payload.get("trip_id") or payload.get("tripId") or payload.get("aggregate_id") or "")
    existing = _load_document(trip_index_key(trip_id))
    document = _normalize_trip_document(payload, existing)

    cache = get_cache()
    _remove_memberships("trip", trip_id, existing)
    cache.hset(trip_index_key(trip_id), mapping={"document": json.dumps(document)})
    cache.sadd(TRIP_SET_KEY, trip_id)
    _add_memberships("trip", trip_id, document)

    return {
        "accepted": True,
        "indexed": True,
        "kind": "trip",
        "trip_id": trip_id,
    }


def upsert_delivery_request_document(payload: dict[str, Any]) -> dict[str, Any]:
    request_id = str(payload.get("delivery_request_id") or payload.get("requestId") or payload.get("aggregate_id") or "")
    existing = _load_document(delivery_request_index_key(request_id))
    document = _normalize_delivery_request_document(payload, existing)

    cache = get_cache()
    _remove_memberships("delivery_request", request_id, existing)
    cache.hset(delivery_request_index_key(request_id), mapping={"document": json.dumps(document)})
    cache.sadd(DELIVERY_REQUEST_SET_KEY, request_id)
    _add_memberships("delivery_request", request_id, document)

    return {
        "accepted": True,
        "indexed": True,
        "kind": "delivery_request",
        "delivery_request_id": request_id,
    }


def upsert_location_document(payload: dict[str, Any]) -> dict[str, Any]:
    location_id = str(
        payload.get("location_id")
        or payload.get("place_id")
        or payload.get("entity_id")
        or payload.get("city")
        or ""
    )
    document = {
        **payload,
        "location_id": location_id,
        "indexed_at": _indexed_at(),
    }

    cache = get_cache()
    cache.hset(location_index_key(location_id), mapping={"document": json.dumps(document)})
    cache.sadd("idx:locations", location_id)

    return {
        "accepted": True,
        "indexed": True,
        "kind": "location",
        "location_id": location_id,
    }


def list_candidate_trip_documents(anchor: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    normalized_anchor = _normalize_delivery_request_document(anchor, {})
    candidate_ids = _candidate_ids("trip", normalized_anchor, limit)
    return [_load_document(trip_index_key(candidate_id)) for candidate_id in candidate_ids if _load_document(trip_index_key(candidate_id))]


def list_candidate_delivery_request_documents(anchor: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    normalized_anchor = _normalize_trip_document(anchor, {})
    candidate_ids = _candidate_ids("delivery_request", normalized_anchor, limit)
    return [
        _load_document(delivery_request_index_key(candidate_id))
        for candidate_id in candidate_ids
        if _load_document(delivery_request_index_key(candidate_id))
    ]
