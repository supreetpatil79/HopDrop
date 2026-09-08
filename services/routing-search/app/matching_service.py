import math
from difflib import SequenceMatcher
from typing import Literal

from app.indexing_service import (
    list_candidate_delivery_request_documents,
    list_candidate_trip_documents,
)
from app.schemas import (
    CandidateQuote,
    DeliveryRequestCandidate,
    DeliveryRequestReference,
    MatchCandidateResult,
    MatchCandidatesRequest,
    MatchCandidatesResponse,
    TripCandidate,
    TripReference,
)

PLATFORM_FEE_RATE = 0.12


def normalize_city(city: str | None) -> str:
    if not city:
        return ""
    return " ".join(city.strip().lower().split())


def haversine_km(origin: tuple[float, float], destination: tuple[float, float]) -> float:
    lng1, lat1 = origin
    lng2, lat2 = destination
    earth_radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


def city_similarity(left: str | None, right: str | None) -> float:
    left_normalized = normalize_city(left)
    right_normalized = normalize_city(right)
    if not left_normalized or not right_normalized:
        return 0.0
    if left_normalized == right_normalized:
        return 1.0
    if left_normalized in right_normalized or right_normalized in left_normalized:
        return 0.92
    return SequenceMatcher(None, left_normalized, right_normalized).ratio()


def coordinate_bonus(
    left_lng: float | None,
    left_lat: float | None,
    right_lng: float | None,
    right_lat: float | None,
) -> float:
    if None in {left_lng, left_lat, right_lng, right_lat}:
        return 0.0

    distance = haversine_km((left_lng, left_lat), (right_lng, right_lat))
    if distance <= 15:
        return 0.15
    if distance <= 50:
        return 0.08
    if distance <= 120:
        return 0.03
    return 0.0


def quote_for_pair(trip: TripReference | TripCandidate, request: DeliveryRequestReference | DeliveryRequestCandidate) -> CandidateQuote:
    base_price = trip.price_per_kg * request.package.weight_kg * 100
    fragile_extra = base_price * 0.2 if request.package.is_fragile else 0
    carrier_payout_paise = round(base_price + fragile_extra)
    platform_fee_paise = round(carrier_payout_paise * PLATFORM_FEE_RATE)
    total_charge_paise = carrier_payout_paise + platform_fee_paise
    return CandidateQuote(
        carrier_payout_paise=carrier_payout_paise,
        platform_fee_paise=platform_fee_paise,
        total_charge_paise=total_charge_paise,
    )


def normalize_score(raw_score: float) -> float:
    return round(max(0.0, min(raw_score / 100, 0.9999)), 4)


def score_trip_candidate(reference: DeliveryRequestReference, candidate: TripCandidate) -> MatchCandidateResult:
    reasons: list[str] = []

    origin_similarity = city_similarity(reference.origin.city, candidate.origin.city)
    destination_similarity = city_similarity(reference.destination.city, candidate.destination.city)
    origin_similarity += coordinate_bonus(
        reference.origin.longitude,
        reference.origin.latitude,
        candidate.origin.longitude,
        candidate.origin.latitude,
    )
    destination_similarity += coordinate_bonus(
        reference.destination.longitude,
        reference.destination.latitude,
        candidate.destination.longitude,
        candidate.destination.latitude,
    )

    route_score = min(origin_similarity, 1.15) * 28 + min(destination_similarity, 1.15) * 28
    if origin_similarity >= 0.95 and destination_similarity >= 0.95:
        reasons.append("same_city_pair")
    elif origin_similarity >= 0.75 and destination_similarity >= 0.75:
        reasons.append("route_pair_close_match")

    departure = candidate.departure_time
    pickup_window = reference.pickup_window
    if pickup_window.earliest <= departure <= pickup_window.latest:
        schedule_score = 16
        reasons.append("pickup_window_aligned")
    else:
        hours_delta = min(abs((departure - pickup_window.latest).total_seconds()) / 3600, 24)
        schedule_score = max(0.0, 16 - hours_delta)

    if candidate.available_capacity_weight_kg >= reference.package.weight_kg:
        capacity_gap = candidate.available_capacity_weight_kg - reference.package.weight_kg
        capacity_score = min(10.0, 6 + capacity_gap)
        reasons.append("capacity_sufficient")
    else:
        capacity_score = 0.0

    category_score = 0.0
    if reference.package.category in candidate.allowed_categories:
        category_score = 10.0
        reasons.append("category_supported")

    rating_score = min(candidate.carrier_rating_average, 5) * 2.2
    if candidate.carrier_rating_average >= 4.7:
        reasons.append("high_carrier_rating")

    estimated_price = candidate.price_per_kg * reference.package.weight_kg
    price_score = max(0.0, 8 - min(estimated_price / 120, 8))
    if estimated_price <= 250:
        reasons.append("price_efficient")

    total_score = route_score + schedule_score + capacity_score + category_score + rating_score + price_score
    return MatchCandidateResult(
        candidate_id=candidate.trip_id,
        candidate_kind="trip",
        trip_id=candidate.trip_id,
        carrier_id=candidate.carrier_id,
        score=normalize_score(total_score),
        reasons=reasons,
        quote=quote_for_pair(candidate, reference),
    )


def score_request_candidate(reference: TripReference, candidate: DeliveryRequestCandidate) -> MatchCandidateResult:
    reasons: list[str] = []

    origin_similarity = city_similarity(reference.origin.city, candidate.origin.city)
    destination_similarity = city_similarity(reference.destination.city, candidate.destination.city)
    origin_similarity += coordinate_bonus(
        reference.origin.longitude,
        reference.origin.latitude,
        candidate.origin.longitude,
        candidate.origin.latitude,
    )
    destination_similarity += coordinate_bonus(
        reference.destination.longitude,
        reference.destination.latitude,
        candidate.destination.longitude,
        candidate.destination.latitude,
    )

    route_score = min(origin_similarity, 1.15) * 28 + min(destination_similarity, 1.15) * 28
    if origin_similarity >= 0.95 and destination_similarity >= 0.95:
        reasons.append("same_city_pair")
    elif origin_similarity >= 0.75 and destination_similarity >= 0.75:
        reasons.append("route_pair_close_match")

    departure = reference.departure_time
    pickup_window = candidate.pickup_window
    if pickup_window.earliest <= departure <= pickup_window.latest:
        schedule_score = 16
        reasons.append("pickup_window_aligned")
    else:
        hours_delta = min(abs((departure - pickup_window.latest).total_seconds()) / 3600, 24)
        schedule_score = max(0.0, 16 - hours_delta)

    if reference.available_capacity_weight_kg >= candidate.package.weight_kg:
        capacity_gap = reference.available_capacity_weight_kg - candidate.package.weight_kg
        capacity_score = min(10.0, 6 + capacity_gap)
        reasons.append("capacity_sufficient")
    else:
        capacity_score = 0.0

    category_score = 0.0
    if candidate.package.category in reference.allowed_categories:
        category_score = 10.0
        reasons.append("category_supported")

    trust_score = min(reference.carrier_rating_average, 5) * 2.2
    if reference.carrier_rating_average >= 4.7:
        reasons.append("high_carrier_rating")

    estimated_price = reference.price_per_kg * candidate.package.weight_kg
    price_score = max(0.0, 8 - min(estimated_price / 120, 8))
    if estimated_price <= 250:
        reasons.append("price_efficient")

    total_score = route_score + schedule_score + capacity_score + category_score + trust_score + price_score
    return MatchCandidateResult(
        candidate_id=candidate.delivery_request_id,
        candidate_kind="delivery_request",
        delivery_request_id=candidate.delivery_request_id,
        sender_id=candidate.sender_id,
        score=normalize_score(total_score),
        reasons=reasons,
        quote=quote_for_pair(reference, candidate),
    )


def match_candidates(payload: MatchCandidatesRequest) -> MatchCandidatesResponse:
    anchor_kind: Literal["delivery_request", "trip"]
    anchor_id: str
    candidates: list[MatchCandidateResult]

    def hydrated_trip_candidates(reference: DeliveryRequestReference) -> list[TripCandidate]:
        trip_documents = list_candidate_trip_documents(reference.model_dump(mode="json"), payload.limit)
        hydrated: list[TripCandidate] = []

        for document in trip_documents:
            capacity = document.get("available_capacity", {})
            hydrated.append(
                TripCandidate(
                    trip_id=document["trip_id"],
                    carrier_id=document.get("carrier_id") or "",
                    origin=document.get("origin") or {},
                    destination=document.get("destination") or {},
                    departure_time=document.get("departure_time"),
                    estimated_arrival_time=document.get("estimated_arrival_time"),
                    price_per_kg=document.get("price_per_kg") or 0,
                    available_capacity_weight_kg=capacity.get("weight_kg") or 0,
                    allowed_categories=capacity.get("allowed_categories") or [],
                    carrier_rating_average=document.get("carrier_rating_average") or 5.0,
                    carrier_total_deliveries=document.get("carrier_total_deliveries") or 0,
                )
            )

        return hydrated

    def hydrated_request_candidates(reference: TripReference) -> list[DeliveryRequestCandidate]:
        request_documents = list_candidate_delivery_request_documents(reference.model_dump(mode="json"), payload.limit)
        hydrated: list[DeliveryRequestCandidate] = []

        for document in request_documents:
            hydrated.append(
                DeliveryRequestCandidate(
                    delivery_request_id=document["delivery_request_id"],
                    sender_id=document.get("sender_id") or "",
                    origin=document.get("origin") or {},
                    destination=document.get("destination") or {},
                    pickup_window=document.get("pickup_window") or {},
                    package=document.get("package") or {},
                )
            )

        return hydrated

    if payload.delivery_request is not None:
        anchor_kind = "delivery_request"
        anchor_id = payload.delivery_request.delivery_request_id
        trip_candidates = payload.trip_candidates or hydrated_trip_candidates(payload.delivery_request)
        candidates = [score_trip_candidate(payload.delivery_request, trip) for trip in trip_candidates]
    else:
        anchor_kind = "trip"
        assert payload.trip is not None
        anchor_id = payload.trip.trip_id
        request_candidates = payload.delivery_request_candidates or hydrated_request_candidates(payload.trip)
        candidates = [score_request_candidate(payload.trip, request) for request in request_candidates]

    candidates.sort(key=lambda candidate: candidate.score, reverse=True)
    return MatchCandidatesResponse(
        anchor_id=anchor_id,
        anchor_kind=anchor_kind,
        candidates=candidates[: payload.limit],
        correlation_id=payload.correlation_id,
    )
