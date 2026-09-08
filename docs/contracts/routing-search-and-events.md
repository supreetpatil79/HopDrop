# Routing Search API And Event Contracts

## Purpose
This document defines the internal contract between `core-api`, `routing-search`, and Kafka consumers.

The goal is:
- keep transactional ownership in `core-api`
- move heavy search and matching to `routing-search`
- use Kafka for durable fanout

## Service Ownership

### `core-api`
Owns:
- canonical `Trip`
- canonical `DeliveryRequest`
- canonical `Match`
- payments and OTP lifecycle

### `routing-search`
Owns:
- location normalization
- place suggestion
- route corridor retrieval
- candidate trip scoring
- rank explanation metadata

`routing-search` must not create `Match` documents directly.

## HTTP Contracts

## `POST /internal/v1/resolve-address`
Used by:
- `core-api`
- admin tooling
- future ingestion pipelines

### Request
```json
{
  "query": "Bangalore city railway station",
  "region": "IND",
  "country_code": "IN",
  "preferred_city": "Bengaluru",
  "correlation_id": "req_01"
}
```

### Response
```json
{
  "query": "Bangalore city railway station",
  "normalized_query": "bengaluru city railway station",
  "result": {
    "place_id": "MMI_123",
    "place_name": "Bengaluru City Railway Station",
    "place_address": "Karnataka, India",
    "latitude": 12.9762,
    "longitude": 77.5703,
    "confidence": 0.96,
    "source": "bm25_then_provider"
  },
  "trace_id": "trace_01"
}
```

## `POST /internal/v1/search/locations`
Autocomplete and ranked location suggestions.

### Request
```json
{
  "query": "mum",
  "region": "IND",
  "limit": 10,
  "correlation_id": "req_02"
}
```

### Response
```json
{
  "suggestions": [
    {
      "place_id": "MMI_BOM",
      "place_name": "Mumbai",
      "place_address": "Maharashtra, India",
      "latitude": 19.076,
      "longitude": 72.8777,
      "score": 14.82,
      "source": "bm25_cache"
    }
  ],
  "trace_id": "trace_02"
}
```

## `POST /internal/v1/match/candidates`
Returns ranked candidates for either:
- a delivery request looking for carrier trips
- a carrier trip looking for pending delivery requests

### Request
```json
{
  "delivery_request": {
    "delivery_request_id": "del_123",
    "sender_id": "user_sender_1",
    "origin": {
      "city": "Bengaluru",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "place_id": "MMI_BLR"
    },
    "destination": {
      "city": "Mumbai",
      "latitude": 19.076,
      "longitude": 72.8777,
      "place_id": "MMI_BOM"
    },
    "pickup_window": {
      "earliest": "2026-04-05T10:00:00Z",
      "latest": "2026-04-05T15:00:00Z"
    },
    "package": {
      "weight_kg": 1.2,
      "category": "documents",
      "is_fragile": false
    }
  },
  "trip_candidates": [
    {
      "trip_id": "trip_001",
      "carrier_id": "user_001",
      "origin": {
        "city": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946
      },
      "destination": {
        "city": "Mumbai",
        "latitude": 19.076,
        "longitude": 72.8777
      },
      "departure_time": "2026-04-05T12:15:00Z",
      "estimated_arrival_time": "2026-04-06T04:30:00Z",
      "price_per_kg": 80,
      "available_capacity_weight_kg": 5,
      "allowed_categories": ["documents", "medicine"],
      "carrier_rating_average": 4.8,
      "carrier_total_deliveries": 42
    }
  ],
  "limit": 10,
  "correlation_id": "req_03"
}
```

### Response
```json
{
  "anchor_id": "del_123",
  "anchor_kind": "delivery_request",
  "candidates": [
    {
      "candidate_id": "trip_001",
      "candidate_kind": "trip",
      "trip_id": "trip_001",
      "carrier_id": "user_001",
      "score": 0.94,
      "quote": {
        "carrier_payout_paise": 9600,
        "platform_fee_paise": 1152,
        "total_charge_paise": 10752
      },
      "reasons": [
        "same_city_pair",
        "route_corridor_overlap_high",
        "capacity_sufficient",
        "high_carrier_rating"
      ]
    }
  ],
  "correlation_id": "req_03"
}
```

## `POST /internal/v1/index/trip-upsert`
Used by Kafka index consumers when trip state changes.

### Request
```json
{
  "trip_id": "trip_001",
  "carrier_id": "user_001",
  "origin": {
    "city": "Bengaluru",
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "destination": {
    "city": "Mumbai",
    "latitude": 19.076,
    "longitude": 72.8777
  },
  "departure_time": "2026-04-05T18:30:00Z",
  "capacity_weight_kg": 5,
  "allowed_categories": ["documents", "medicine"],
  "route_geometry": {
    "type": "LineString",
    "coordinates": [[77.5946, 12.9716], [72.8777, 19.076]]
  },
  "status": "active"
}
```

### Response
```json
{
  "trip_id": "trip_001",
  "indexed": true,
  "trace_id": "trace_04"
}
```

## `POST /internal/v1/index/location-upsert`
Used to persist new provider results into the local lexical index.

## Error Contract
Every error response must include:
```json
{
  "error": {
    "code": "ROUTE_PROVIDER_TIMEOUT",
    "message": "Map provider request timed out"
  },
  "trace_id": "trace_05"
}
```

## Kafka Event Envelope
All topics use the same top-level envelope.

```json
{
  "event_id": "evt_01JABC",
  "event_type": "delivery.requested",
  "event_version": 1,
  "occurred_at": "2026-04-04T16:30:00Z",
  "producer": "core-api",
  "correlation_id": "req_03",
  "trace_id": "trace_03",
  "partition_key": "delivery_request_id:del_123",
  "data": {}
}
```

## Topic Catalog

### `trip.lifecycle.v1`
Events:
- `trip.posted`
- `trip.updated`
- `trip.cancelled`
- `trip.deposit_confirmed`
- `trip.departed`
- `trip.completed`

### `delivery.lifecycle.v1`
Events:
- `delivery.requested`
- `delivery.updated`
- `delivery.cancelled`
- `delivery.payment_created`
- `delivery.payment_confirmed`

### `match.lifecycle.v1`
Events:
- `match.proposed`
- `match.carrier_accepted`
- `match.sender_confirmed`
- `match.activated`
- `match.pickup_otp_generated`
- `match.pickup_verified`
- `match.delivery_otp_generated`
- `match.delivered`
- `match.cancelled`

### `location.updates.v1`
Events:
- `carrier.location_updated`

Use short retention here compared with lifecycle topics.

## Event Schemas

### `delivery.requested`
```json
{
  "delivery_request_id": "del_123",
  "sender_id": "user_111",
  "origin": {
    "city": "Bengaluru",
    "place_id": "MMI_BLR",
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "destination": {
    "city": "Mumbai",
    "place_id": "MMI_BOM",
    "latitude": 19.076,
    "longitude": 72.8777
  },
  "pickup_window": {
    "earliest": "2026-04-05T10:00:00Z",
    "latest": "2026-04-05T15:00:00Z"
  },
  "package": {
    "weight_kg": 1.2,
    "category": "documents",
    "is_fragile": false
  }
}
```

### `trip.posted`
```json
{
  "trip_id": "trip_001",
  "carrier_id": "user_001",
  "origin": {
    "city": "Bengaluru",
    "place_id": "MMI_BLR",
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "destination": {
    "city": "Mumbai",
    "place_id": "MMI_BOM",
    "latitude": 19.076,
    "longitude": 72.8777
  },
  "departure_time": "2026-04-05T18:30:00Z",
  "capacity_weight_kg": 5,
  "allowed_categories": ["documents", "medicine"],
  "price_per_kg_paise": 8000,
  "status": "active"
}
```

### `match.proposed`
```json
{
  "match_id": "match_001",
  "trip_id": "trip_001",
  "delivery_request_id": "del_123",
  "carrier_id": "user_001",
  "sender_id": "user_111",
  "agreed_price_paise": 10752,
  "carrier_payout_paise": 9600,
  "score": 0.94,
  "reasons": [
    "same_city_pair",
    "route_corridor_overlap_high"
  ]
}
```

### `carrier.location_updated`
```json
{
  "match_id": "match_001",
  "carrier_id": "user_001",
  "latitude": 18.6421,
  "longitude": 73.7614,
  "recorded_at": "2026-04-05T21:15:00Z"
}
```

## Delivery Creation Flow
Current state in this repo:
- [backend/src/controllers/delivery.controller.ts](backend/src/controllers/delivery.controller.ts)
- [backend/src/services/delivery.service.ts](backend/src/services/delivery.service.ts)

Target flow:
1. `core-api` writes `DeliveryRequest`.
2. `core-api` writes outbox event `delivery.requested`.
3. outbox relay publishes to Kafka.
4. matching consumer calls `routing-search /internal/v1/match/candidates`.
5. `core-api` creates canonical `Match` records.
6. websocket and notification consumers react to `match.proposed`.

This keeps match writes inside `core-api` while moving heavy retrieval and scoring outside it.

## BM25 Integration Contract
The FastAPI service should call a local Python adapter:
- `bm25_adapter.search_locations(query, limit)`
- `bm25_adapter.search_trips(request_features, limit)`

The adapter should be backed by a C++ module exposed with `pybind11`.

### Native module inputs
- tokenized query
- normalized aliases
- prefiltered candidate document IDs

### Native module outputs
- sorted document IDs
- BM25 scores

## Operational Rules
1. `routing-search` must be stateless and horizontally scalable.
2. Event consumers must be idempotent.
3. Event version changes require additive evolution first.
4. `core-api` remains the source of truth for business objects.
