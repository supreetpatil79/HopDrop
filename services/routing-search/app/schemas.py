from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class HealthResponse(BaseModel):
    service: str
    status: Literal["ok"]


class Coordinates(BaseModel):
    city: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    place_id: str | None = None


class AddressResolveRequest(BaseModel):
    query: str = Field(min_length=2)
    region: str = "IND"
    country_code: str = "IN"
    preferred_city: str | None = None
    correlation_id: str | None = None


class SearchLocationsRequest(BaseModel):
    query: str = Field(min_length=2)
    region: str = "IND"
    limit: int = Field(default=10, ge=1, le=12)
    actor: Literal["sender", "carrier"] | None = None
    field: Literal["origin", "destination"] | None = None
    correlation_id: str | None = None


class SearchSelectionFeedbackRequest(BaseModel):
    query: str = Field(min_length=2)
    region: str = "IND"
    actor: Literal["sender", "carrier"] | None = None
    field: Literal["origin", "destination"] | None = None
    place_id: str = Field(min_length=2)
    place_name: str = Field(min_length=1)
    place_address: str | None = None
    city: str | None = None
    state: str | None = None


class PackageRequest(BaseModel):
    weight_kg: float
    category: str
    is_fragile: bool = False
    declared_value: float | None = None


class TimeWindow(BaseModel):
    earliest: datetime
    latest: datetime


class DeliveryRequestReference(BaseModel):
    delivery_request_id: str
    sender_id: str
    origin: Coordinates
    destination: Coordinates
    pickup_window: TimeWindow
    package: PackageRequest


class TripReference(BaseModel):
    trip_id: str
    carrier_id: str
    origin: Coordinates
    destination: Coordinates
    departure_time: datetime
    estimated_arrival_time: datetime | None = None
    price_per_kg: float
    available_capacity_weight_kg: float
    allowed_categories: list[str] = Field(default_factory=list)
    carrier_rating_average: float = 5.0
    carrier_total_deliveries: int = 0


class DeliveryRequestCandidate(DeliveryRequestReference):
    pass


class TripCandidate(TripReference):
    pass


class CandidateQuote(BaseModel):
    carrier_payout_paise: int
    platform_fee_paise: int
    total_charge_paise: int


class MatchCandidatesRequest(BaseModel):
    delivery_request: DeliveryRequestReference | None = None
    trip: TripReference | None = None
    trip_candidates: list[TripCandidate] = Field(default_factory=list)
    delivery_request_candidates: list[DeliveryRequestCandidate] = Field(default_factory=list)
    limit: int = 10
    correlation_id: str | None = None

    @model_validator(mode="after")
    def validate_anchor_and_candidates(self):
        has_delivery_anchor = self.delivery_request is not None
        has_trip_anchor = self.trip is not None

        if has_delivery_anchor == has_trip_anchor:
            raise ValueError("Provide exactly one anchor: delivery_request or trip")

        return self


class MatchCandidateResult(BaseModel):
    candidate_id: str
    candidate_kind: Literal["trip", "delivery_request"]
    trip_id: str | None = None
    delivery_request_id: str | None = None
    carrier_id: str | None = None
    sender_id: str | None = None
    score: float
    reasons: list[str] = Field(default_factory=list)
    quote: CandidateQuote | None = None


class MatchCandidatesResponse(BaseModel):
    anchor_id: str
    anchor_kind: Literal["delivery_request", "trip"]
    candidates: list[MatchCandidateResult]
    correlation_id: str | None = None


class RouteGeometryRequest(BaseModel):
    origin_lng: float
    origin_lat: float
    dest_lng: float
    dest_lat: float
