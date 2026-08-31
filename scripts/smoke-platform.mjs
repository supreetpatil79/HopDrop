const DEFAULT_TIMEOUT_MS = 8000;

const checks = [
  { name: 'nginx', url: 'http://127.0.0.1/ready', kind: 'ready' },
  { name: 'backend', url: 'http://127.0.0.1:5001/ready', kind: 'ready' },
  { name: 'realtime-gateway', url: 'http://127.0.0.1:5002/ready', kind: 'ready' },
  { name: 'search-indexer', url: 'http://127.0.0.1:5003/ready', kind: 'ready' },
  { name: 'matching-orchestrator', url: 'http://127.0.0.1:5004/ready', kind: 'ready' },
  { name: 'notification-consumer', url: 'http://127.0.0.1:5005/ready', kind: 'ready' },
  { name: 'analytics-pipeline', url: 'http://127.0.0.1:5006/ready', kind: 'ready' },
  { name: 'routing-search', url: 'http://127.0.0.1:8010/ready', kind: 'ready' },
  { name: 'sender-portal', url: 'http://127.0.0.1:3001/', kind: 'html' },
  { name: 'carrier-portal', url: 'http://127.0.0.1:3002/carrier/', kind: 'html' }
];

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow'
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyReadyCheck(check) {
  const response = await fetchWithTimeout(check.url);
  if (!response.ok) {
    throw new Error(`returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.status !== 'ready' && payload?.status !== 'ok' && payload?.success !== true) {
    throw new Error(`returned unexpected readiness payload: ${JSON.stringify(payload)}`);
  }

  const dependencySummary =
    payload?.dependencies && typeof payload.dependencies === 'object'
      ? ` (${Object.entries(payload.dependencies)
          .map(([name, status]) => `${name}:${status}`)
          .join(', ')})`
      : '';

  console.log(`✓ ${check.name} ready${dependencySummary}`);
}

async function verifyHtmlCheck(check) {
  const response = await fetchWithTimeout(check.url);
  if (!response.ok) {
    throw new Error(`returned HTTP ${response.status}`);
  }

  const body = (await response.text()).toLowerCase();
  if (!body.includes('<!doctype html') && !body.includes('<html')) {
    throw new Error('did not return HTML');
  }

  console.log(`✓ ${check.name} served HTML`);
}

async function main() {
  let failed = false;

  for (const check of checks) {
    try {
      if (check.kind === 'ready') {
        await verifyReadyCheck(check);
      } else {
        await verifyHtmlCheck(check);
      }
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${check.name} failed: ${message}`);
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log(`Platform smoke check passed for ${checks.length} endpoints.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
