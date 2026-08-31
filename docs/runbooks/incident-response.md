# HopDrop Incident Response Runbook

Use this document during production incidents. Every incident should capture the request ID, affected services, first bad timestamp, mitigation, and rollback decision.

## 1. Core API Unavailable

### Symptoms

- `/ready` on `backend` returns non-200.
- `HopDropCoreApiDown` or `HopDropCoreApiHigh5xxRate` fires.
- Sender or carrier flows fail for auth, trips, deliveries, payments, or matches.

### Immediate checks

- Check container or deployment health for `backend`.
- Inspect `backend` logs for MongoDB, Redis cache, Redis queue, or Kafka failures.
- Open `/ready`, `/health`, and `/metrics`.
- Confirm MongoDB primary availability and Redis connectivity.

### Mitigation

- Roll back to the last healthy image if the current rollout introduced the regression.
- If only one dependency is degraded, restore that dependency first before recycling the API.
- Pause new deploys until the `/ready` endpoint is stable.

## 2. Routing Search Degraded

### Symptoms

- `HopDropRoutingSearchDown`, `HopDropRoutingSearchHighLatency`, or `HopDropRoutingSearchHigh5xxRate` fires.
- Maps suggestions or route previews fail or time out.
- `search-indexer` may remain healthy while query latency spikes.

### Immediate checks

- Check `routing-search` `/ready` and `/metrics`.
- Inspect application logs for upstream geocoding or routing provider failures.
- Compare p95 latency and 5xx rate before and after the bad timestamp.
- Verify Redis cache connectivity for routing-search.

### Mitigation

- Fail back to a previous image if the issue started after deployment.
- Reduce traffic by disabling expensive route-heavy experiments first.
- If the upstream maps provider is degraded, switch to fallback/demo mode only if the environment policy allows it.

## 3. Queue Backlog Or Worker Failures

### Symptoms

- `HopDropCoreApiQueueBacklogHigh` or `HopDropCoreApiQueueFailuresDetected` fires.
- BullMQ dashboard at `/admin/queues` shows waiting or failed jobs climbing.
- Match proposals, reminders, OTP cleanup, or payouts are delayed.

### Immediate checks

- Open `/admin/queues` and note which queue is growing:
  - `match`
  - `otp_cleanup`
  - `payout`
  - `reminder`
- Check `hopdrop_core_api_queue_jobs` and `hopdrop_core_api_queue_job_outcomes_total`.
- Inspect backend logs for worker exceptions and downstream dependency failures.

### Mitigation

- If failures started right after deploy, roll back the backend first.
- If backlog is isolated to `payout`, stop release activity and validate payment state before replaying work.
- If backlog is isolated to `match` or `reminder`, restore downstream dependencies and allow workers to drain before manual replay.
- Never purge failed payout jobs until payment and reconciliation status are understood.

## 4. Kafka Consumer Disconnected Or Lagging

### Symptoms

- `HopDropSearchIndexerConsumerDisconnected`
- `HopDropMatchingOrchestratorConsumerDisconnected`
- `HopDropNotificationConsumerDisconnected`
- `HopDropAnalyticsPipelineConsumerDisconnected`
- Event-driven side effects stop appearing even though `backend` still accepts writes.

### Immediate checks

- Confirm Kafka/Redpanda cluster health.
- Check each sidecar `/ready` and `/metrics`.
- Inspect logs for auth, broker, or deserialization errors.
- Compare processed-message counters before and after the incident window.

### Mitigation

- Restart only the affected consumer if Kafka is healthy and the issue is isolated.
- Roll back the affected consumer if the disconnect started with a new image.
- If multiple consumers disconnect at once, treat Kafka or network reachability as the primary incident.

## 5. Portal Unavailable

### Symptoms

- `sender-portal` or `carrier-portal` stops returning HTML.
- `nginx` is down or proxying 5xx.
- Users report blank pages, asset failures, or websocket boot issues.

### Immediate checks

- Check `nginx`, `sender-portal`, and `carrier-portal` container health.
- Verify `http://localhost/`, `/carrier/`, and `/ready` in the equivalent production entrypoints.
- Inspect nginx logs for upstream failures.
- Inspect browser console, release metadata, and asset paths if only one portal is broken.

### Mitigation

- Roll back the affected portal image if the issue is build or asset related.
- If nginx routing is the issue, restore the last known-good config immediately.
- If the backend is healthy but websocket setup fails, inspect `realtime-gateway` before blaming the portals.

## 6. Payment Reconciliation Failures

### Symptoms

- Payouts do not release on schedule.
- Delivery completes but payment state or transaction records do not align.
- Queue failures cluster in `payout`.

### Immediate checks

- Check payout worker logs and `payout` queue state.
- Inspect payment, transaction, and match records for one affected request ID.
- Verify outbound webhook and Razorpay event handling around the incident time.

### Mitigation

- Freeze automated replay until duplicate payout risk is understood.
- Reconcile against the payment provider before retrying failed payout jobs.
- Escalate to finance or operations ownership if any payout state is ambiguous.
