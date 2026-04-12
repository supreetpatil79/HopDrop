# Routing Search Service

This service is the first planned extraction from the current HopDrop backend.

It owns:
- address normalization
- place suggestion
- route corridor lookup
- candidate trip retrieval
- AI-assisted reranking
- BM25-based lexical retrieval

It does not own:
- canonical trip writes
- canonical delivery request writes
- canonical match writes
- payments
- OTP state

## Why this service exists
The current backend still contains maps and matching logic inside the Node service:
- [backend/src/services/maps.service.ts](/Users/supreetpatil/uber/hopdrop/backend/src/services/maps.service.ts)
- [backend/src/services/matching.service.ts](/Users/supreetpatil/uber/hopdrop/backend/src/services/matching.service.ts)

This service is the dedicated place to move that high-compute, read-heavy logic.

## Planned layout
```text
services/routing-search/
  app/
    main.py
    config.py
    schemas.py
  native/
    bm25/
      README.md
  pyproject.toml
```

## First endpoints
- `GET /health`
- `GET /ready`
- `POST /internal/v1/resolve-address`
- `POST /internal/v1/search/locations`
- `POST /internal/v1/match/candidates`
- `POST /internal/v1/index/trip-upsert`
- `POST /internal/v1/index/location-upsert`

## Runtime notes
Start with:
- FastAPI
- Redis cache
- MapMyIndia provider client
- `pybind11` BM25 bridge

Keep this service stateless. All authoritative business writes stay in `core-api`.
