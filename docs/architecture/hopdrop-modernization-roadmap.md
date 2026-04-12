# HopDrop Modernization Roadmap

## Purpose
This document turns the current HopDrop codebase into a staged migration plan for a production-grade platform that can scale beyond the current modular monolith.

The plan is intentionally incremental:

1. Stabilize the existing Node backend and two React portals.
2. Extract a dedicated `routing-search` microservice in Python + FastAPI.
3. Introduce Kafka and the outbox pattern.
4. Convert the current workspaces into a cleaner app and package monorepo.
5. Split realtime and other workloads only after observability and eventing are in place.

## Current State In This Repo

### Runtime topology
- Core API: [backend/src/app.ts](/Users/supreetpatil/uber/hopdrop/backend/src/app.ts)
- Server bootstrap: [backend/src/server.ts](/Users/supreetpatil/uber/hopdrop/backend/src/server.ts)
- Docker topology: [docker-compose.yml](/Users/supreetpatil/uber/hopdrop/docker-compose.yml)

### Existing extraction seam
- Maps HTTP surface: [backend/src/routes/maps.routes.ts](/Users/supreetpatil/uber/hopdrop/backend/src/routes/maps.routes.ts)
- Maps provider and caching logic: [backend/src/services/maps.service.ts](/Users/supreetpatil/uber/hopdrop/backend/src/services/maps.service.ts)
- Matching logic: [backend/src/services/matching.service.ts](/Users/supreetpatil/uber/hopdrop/backend/src/services/matching.service.ts)
- Delivery creation and queue trigger: [backend/src/services/delivery.service.ts](/Users/supreetpatil/uber/hopdrop/backend/src/services/delivery.service.ts)

### Frontend duplication hotspots
- Sender UI primitives: [sender-portal/src/components/ui](/Users/supreetpatil/uber/hopdrop/sender-portal/src/components/ui)
- Carrier UI primitives: [carrier-portal/src/components/ui](/Users/supreetpatil/uber/hopdrop/carrier-portal/src/components/ui)
- Sender hooks: [sender-portal/src/hooks](/Users/supreetpatil/uber/hopdrop/sender-portal/src/hooks)
- Carrier hooks: [carrier-portal/src/hooks](/Users/supreetpatil/uber/hopdrop/carrier-portal/src/hooks)
- Sender APIs: [sender-portal/src/api](/Users/supreetpatil/uber/hopdrop/sender-portal/src/api)
- Carrier APIs: [carrier-portal/src/api](/Users/supreetpatil/uber/hopdrop/carrier-portal/src/api)
- Shared package already exists: [shared](/Users/supreetpatil/uber/hopdrop/shared)

## Target Repo Shape
```text
hopdrop/
  apps/
    sender-web/
    carrier-web/
  services/
    core-api/
    routing-search/
    realtime-gateway/
  packages/
    ui/
    domain/
    api-client/
    auth/
    maps/
    realtime/
    config-eslint/
    config-ts/
  infra/
    helm/
    k8s/
    terraform/
  docs/
    architecture/
    contracts/
```

## Service Boundaries

### `core-api`
Owns authoritative writes for:
- users
- auth
- trips
- delivery requests
- matches
- OTP verification
- payments
- payouts
- webhooks

This service remains the system of record.

### `routing-search`
Owns:
- address normalization
- place search
- route corridor resolution
- candidate trip retrieval
- AI-assisted reranking
- local lexical index and BM25 integration

This service should not own transactional writes for trips or matches.

### `realtime-gateway`
Owns:
- websocket connection handling
- room subscriptions
- live location fanout
- status fanout

In the current repo, this logic still lives in the backend bootstrap via Socket.IO. Keep it there until Kafka and Redis-backed fanout are ready.

## Folder-By-Folder Migration

### Backend to `services/core-api`
Move these folders with minimal changes first:
- `backend/src/config`
- `backend/src/controllers`
- `backend/src/middleware`
- `backend/src/models`
- `backend/src/routes`
- `backend/src/services`
- `backend/src/utils`
- `backend/src/validators`
- `backend/src/queues`

Rename target:
- `backend/` -> `services/core-api/`

### First extraction to `services/routing-search`
Move or copy logic from these files into the new FastAPI service:
- [backend/src/routes/maps.routes.ts](/Users/supreetpatil/uber/hopdrop/backend/src/routes/maps.routes.ts)
- [backend/src/services/maps.service.ts](/Users/supreetpatil/uber/hopdrop/backend/src/services/maps.service.ts)
- [backend/src/services/matching.service.ts](/Users/supreetpatil/uber/hopdrop/backend/src/services/matching.service.ts)

Recommended target modules:
```text
services/routing-search/app/
  main.py
  config.py
  schemas.py
  services/
    map_provider.py
    route_cache.py
    candidate_retrieval.py
    rerank.py
    quote.py
    index_writer.py
    bm25_adapter.py
  api/
    routes/
      health.py
      locations.py
      matching.py
      indexing.py
```

### Sender and carrier portals into `apps/`
Move:
- `sender-portal/` -> `apps/sender-web/`
- `carrier-portal/` -> `apps/carrier-web/`

Do not merge the apps. Keep separate entrypoints and routes.

### Shared frontend code into `packages/`

#### `packages/ui`
Move shared presentational components from both portals:
- `components/ui/*`
- layout primitives that are identical

#### `packages/auth`
Move:
- `store/authStore.ts`
- `hooks/useAuth.ts`
- auth guards with per-app storage key injection

#### `packages/api-client`
Move:
- `api/client.ts`
- `api/auth.api.ts`
- `api/trip.api.ts`
- `api/delivery.api.ts`
- `api/match.api.ts`
- `api/payment.api.ts`

#### `packages/maps`
Move:
- `hooks/useMMI.ts`
- `components/map/*`

#### `packages/realtime`
Move:
- `hooks/useSocket.ts`
- websocket event types
- shared channel naming

#### `packages/domain`
Move:
- shared Zod schemas
- enums
- status mappings
- shared types from `shared/`

## Phase Plan

## Phase 0: Stabilize The Current Monolith
Goal: Make the existing stack observable and safe before service extraction.

### Tasks
1. Replace console-only logging with structured JSON logging in the backend.
2. Add request IDs and propagate them to frontend clients.
3. Add OpenTelemetry instrumentation for HTTP, MongoDB, Redis, and outbound HTTP.
4. Add Sentry to both portals and the backend.
5. Add contract tests around:
   - `POST /api/v1/deliveries`
   - `GET /api/v1/deliveries/:requestId/matches`
   - `POST /api/v1/matches/:matchId/carrier-accept`
   - `POST /api/v1/matches/:matchId/sender-confirm`
   - `GET /api/v1/maps/suggest`
   - `GET /api/v1/maps/route`

### Exit criteria
- p95 latency visible
- all 5xx errors traceable
- silent frontend failures show in Sentry

## Phase 1: Extract `routing-search`
Goal: Move maps and candidate retrieval behind an internal FastAPI service.

### Tasks
1. Scaffold `services/routing-search`.
2. Move address suggestion and route lookup logic out of the Node backend.
3. Keep gateway paths stable:
   - `GET /api/v1/maps/suggest`
   - `GET /api/v1/maps/route`
4. Change the Node backend to proxy internally to `routing-search`.
5. Move candidate retrieval from `matching.service.ts` into `routing-search`.
6. Keep match creation itself in `core-api`.

### New split
- `routing-search` returns ranked candidate trip IDs and scores
- `core-api` creates `Match` records transactionally

### Exit criteria
- no direct MapMyIndia calls from sender or carrier apps
- no inline expensive matching logic in delivery creation path

## Phase 2: Add BM25 + geospatial corridor retrieval
Goal: Make address and route matching fast under load.

### Tasks
1. Add local place and trip index documents.
2. Build a C++ BM25 retrieval module with `pybind11`.
3. Add H3 route corridor cells to each indexed trip.
4. Retrieval order:
   - H3 corridor prefilter
   - BM25 lexical search
   - business rules filter
   - rerank
5. Index updates become asynchronous consumers of domain events.

### Exit criteria
- address resolution avoids provider calls for hot queries
- matching does not scan Mongo collections directly under load

## Phase 3: Introduce Kafka and outbox
Goal: Make request spikes survivable and remove inline fanout work.

### Tasks
1. Add an outbox collection to `core-api`.
2. Write business changes and outbox entries in the same transaction.
3. Add an outbox relay process that publishes to Kafka.
4. Replace direct side effects with consumers:
   - notifications
   - search index upserts
   - analytics
   - match recomputation

### First topics
- `trip.lifecycle.v1`
- `delivery.lifecycle.v1`
- `match.lifecycle.v1`
- `payment.lifecycle.v1`
- `location.updates.v1`

### Exit criteria
- delivery creation returns quickly even under load
- matching and notifications no longer block request threads

## Phase 4: Split realtime
Goal: Scale websocket connections independently from API writes.

### Tasks
1. Add Redis adapter to Socket.IO.
2. Move websocket connection handling into `realtime-gateway`.
3. Publish status and location updates through Redis pub/sub or Kafka consumers.
4. Keep room names stable:
   - `user:{userId}`
   - `match:{matchId}`
   - `trip:{tripId}`

### Exit criteria
- websocket scale no longer depends on API process count

## Phase 5: Complete frontend package extraction
Goal: eliminate sender and carrier duplication without merging the products.

### Move order
1. `packages/ui`
2. `packages/domain`
3. `packages/api-client`
4. `packages/auth`
5. `packages/maps`
6. `packages/realtime`

### Rules
- share primitives, not whole page flows
- keep sender-only and carrier-only pages app-local
- keep app-local router trees and branding

## Phase 6: Production CI/CD and Kubernetes rollout
Goal: move from Docker Compose to environment-based deployment.

### Tasks
1. Build images per app and service.
2. Deploy via Helm and ArgoCD.
3. Add canary rollout for `core-api` and `routing-search`.
4. Autoscale:
   - HPA for CPU/memory
   - KEDA for Kafka lag
5. Add runbooks for:
   - payment reconciliation failures
   - lag spikes
   - search degradation
   - websocket fanout failure

## Non-Negotiable Design Rules
1. `core-api` remains the only transactional writer for orders, trips, matches, and payments.
2. `routing-search` is read-heavy and stateless from a business ownership perspective.
3. Every Kafka consumer must be idempotent.
4. Every externally visible request must carry a correlation ID.
5. LLM-based logic must not sit on the critical synchronous booking path.
6. Match creation must never rely on scanning Mongo directly once the search service is live.

## First Three Implementation Tickets
1. Add outbox infrastructure to `core-api`.
2. Proxy current `/maps` requests through `routing-search`.
3. Extract shared frontend `ui`, `auth`, and `api-client` packages.
