# HopDrop platform chart

This chart deploys the stateless HopDrop services only. MongoDB, Redis, Kafka,
the secret manager, ingress controller, cert-manager, metrics, logs, and traces
must be supplied as managed/platform services or separately operated charts.

## Required secret

Create `global.existingSecret` in the target namespace before installing. It
must contain the environment variables required by the services, including
`NODE_ENV=production`, `DEMO_MODE=false`, `REQUIRE_HTTPS=true`, JWT secrets,
database/Redis/Kafka URLs, internal service authentication, and provider keys.

Example install:

```sh
helm upgrade --install hopdrop ./infra/helm/hopdrop-platform \
  --namespace hopdrop-apps --create-namespace \
  -f ./infra/helm/hopdrop-platform/values-prod.yaml \
  --set images.registry=REGISTRY \
  --set images.backend=hopdrop-backend:SHA \
  --set images.sender=hopdrop-sender-portal:SHA \
  --set images.carrier=hopdrop-carrier-portal:SHA \
  --set global.domain=app.example.com
```

Do not put secret values in `values.yaml` or source control. Run `helm lint`
and `helm template` in CI, then deploy to staging before production approval.

For Kafka-backed consumer scaling, install KEDA and provide a
`TriggerAuthentication` named by `keda.kafka.authenticationRef`; then enable
`keda.enabled=true`. Keep the topic and consumer-group values aligned with the
Kafka topic contract before enabling it in production.
