import { expect, type APIRequestContext } from '@playwright/test';

export type DemoPersona = 'carrier' | 'sender_priya';

export interface DemoSession {
  accessToken: string;
  refreshToken: string;
  user: {
    _id: string;
    name: string;
    phone: string;
    role: string[];
  };
}

export type RouteSeed = {
  destination?: {
    city: string;
    coordinates: [number, number];
    placeId: string;
  };
  origin?: {
    city: string;
    coordinates: [number, number];
    placeId: string;
  };
};

const DEFAULT_ORIGIN = {
  city: 'Delhi',
  coordinates: [77.209, 28.6139] as [number, number],
  placeId: 'DEMO_DEL'
};

const DEFAULT_DESTINATION = {
  city: 'Dehradun',
  coordinates: [78.0322, 30.3165] as [number, number],
  placeId: 'DEMO_DDN'
};

function createLocation(route: RouteSeed['origin'] | RouteSeed['destination']) {
  return {
    city: route?.city ?? DEFAULT_ORIGIN.city,
    placeId: route?.placeId ?? DEFAULT_ORIGIN.placeId,
    coordinates: {
      type: 'Point',
      coordinates: route?.coordinates ?? DEFAULT_ORIGIN.coordinates
    }
  };
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function addHours(days: number, hours: number) {
  return new Date(Date.now() + (days * 24 + hours) * 60 * 60 * 1000);
}

async function api<T>(
  request: APIRequestContext,
  path: string,
  options: {
    data?: unknown;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    token?: string;
  } = {}
): Promise<T> {
  const response = await request.fetch(path, {
    method: options.method ?? 'GET',
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
    data: options.data
  });

  const rawBody = await response.text();
  let payload: any;

  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = { success: false, rawBody };
  }

  expect(response.ok(), `${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.success, `API success flag missing for ${path}: ${JSON.stringify(payload)}`).toBe(true);
  return payload.data as T;
}

export async function ensureStackHealthy(request: APIRequestContext) {
  const health = await request.get('/health');
  const ready = await request.get('/ready');
  const routing = await request.get('http://127.0.0.1:8010/health');

  expect(health.ok()).toBeTruthy();
  expect(ready.ok()).toBeTruthy();
  expect(routing.ok()).toBeTruthy();
}

export async function demoLogin(request: APIRequestContext, persona: DemoPersona): Promise<DemoSession> {
  return api<DemoSession>(request, '/api/v1/auth/demo-login', {
    method: 'POST',
    data: { persona }
  });
}

export async function createDemoSessions(request: APIRequestContext) {
  const [sender, carrier] = await Promise.all([
    demoLogin(request, 'sender_priya'),
    demoLogin(request, 'carrier')
  ]);

  return { carrier, sender };
}

export async function createCarrierTrip(
  request: APIRequestContext,
  accessToken: string,
  input: RouteSeed & {
    departureDaysFromNow?: number;
    descriptionSuffix?: string;
    pricePerKg?: number;
  } = {}
) {
  const origin = input.origin ?? DEFAULT_ORIGIN;
  const destination = input.destination ?? DEFAULT_DESTINATION;
  const departureDaysFromNow = input.departureDaysFromNow ?? 2;
  const descriptionSuffix = input.descriptionSuffix ?? Date.now().toString(36);

  const depositOrder = await api<{ amount: number; currency: string; order?: { id: string }; orderId?: string }>(
    request,
    '/api/v1/trips/deposit-order',
    {
      method: 'POST',
      token: accessToken
    }
  );

  const trip = await api<{ _id: string }>(request, '/api/v1/trips', {
    method: 'POST',
    token: accessToken,
    data: {
      origin: createLocation(origin),
      destination: {
        city: destination.city,
        placeId: destination.placeId,
        coordinates: {
          type: 'Point',
          coordinates: destination.coordinates
        }
      },
      departureTime: addDays(departureDaysFromNow).toISOString(),
      estimatedArrivalTime: addHours(departureDaysFromNow, 6).toISOString(),
      modeOfTransport: 'train',
      transportDetails: {
        name: `Playwright Express ${descriptionSuffix}`,
        pnr: `PW${descriptionSuffix.slice(-6).toUpperCase()}`
      },
      availableCapacity: {
        weightKg: 5,
        allowedCategories: ['documents', 'electronics']
      },
      pricePerKg: input.pricePerKg ?? 80,
      pickupInstructions: 'Platform 1',
      dropoffInstructions: 'Near station exit'
    }
  });

  await api<{ success: boolean }>(request, `/api/v1/trips/${trip._id}/confirm-deposit`, {
    method: 'POST',
    token: accessToken,
    data: {
      razorpayOrderId: depositOrder.orderId ?? depositOrder.order?.id,
      razorpayPaymentId: `mock_pay_${descriptionSuffix}`,
      razorpaySignature: 'mock_signature'
    }
  });

  return trip;
}

export async function createDeliveryRequest(
  request: APIRequestContext,
  accessToken: string,
  input: RouteSeed & {
    description?: string;
  } = {}
) {
  const origin = input.origin ?? DEFAULT_ORIGIN;
  const destination = input.destination ?? DEFAULT_DESTINATION;

  return api<{ _id: string }>(request, '/api/v1/deliveries', {
    method: 'POST',
    token: accessToken,
    data: {
      origin: createLocation(origin),
      destination: {
        city: destination.city,
        placeId: destination.placeId,
        coordinates: {
          type: 'Point',
          coordinates: destination.coordinates
        }
      },
      package: {
        description: input.description ?? `Playwright package ${Date.now().toString(36)}`,
        category: 'documents',
        weightKg: 2,
        isFragile: false,
        declaredValue: 1000
      },
      recipient: {
        name: 'Playwright Receiver',
        phone: '9876543210',
        address: 'Clock Tower, Dehradun'
      },
      preferredDeliveryWindow: {
        earliest: addDays(1).toISOString(),
        latest: addDays(3).toISOString()
      }
    }
  });
}

export async function payForDeliveryRequest(request: APIRequestContext, accessToken: string, requestId: string) {
  const order = await api<{ amount: number; order?: { id: string }; orderId?: string }>(
    request,
    `/api/v1/deliveries/${requestId}/pay`,
    {
      method: 'POST',
      token: accessToken
    }
  );

  await api<{ success: boolean }>(request, `/api/v1/deliveries/${requestId}/confirm-pay`, {
    method: 'POST',
    token: accessToken,
    data: {
      razorpayOrderId: order.orderId ?? order.order?.id,
      razorpayPaymentId: `mock_pay_delivery_${requestId}`,
      razorpaySignature: 'mock_signature'
    }
  });
}

export async function getDeliveryMatches(request: APIRequestContext, accessToken: string, requestId: string) {
  return api<Array<{ _id: string; status: string }>>(request, `/api/v1/deliveries/${requestId}/matches`, {
    token: accessToken
  });
}

export async function getMatch(request: APIRequestContext, accessToken: string, matchId: string) {
  return api<{ _id: string; status: string }>(request, `/api/v1/matches/${matchId}`, {
    token: accessToken
  });
}

export async function createPaidMatchedFlow(
  request: APIRequestContext,
  sessions: { carrier: DemoSession; sender: DemoSession },
  input: RouteSeed & {
    description: string;
  }
) {
  const delivery = await createDeliveryRequest(request, sessions.sender.accessToken, input);
  await payForDeliveryRequest(request, sessions.sender.accessToken, delivery._id);
  await createCarrierTrip(request, sessions.carrier.accessToken, {
    descriptionSuffix: input.description.replace(/[^a-z0-9]+/gi, '').slice(-8),
    destination: input.destination,
    origin: input.origin
  });

  const matches = await getDeliveryMatches(request, sessions.sender.accessToken, delivery._id);
  expect(matches.length, 'Expected the paid delivery request to have at least one proposed match').toBeGreaterThan(0);

  return {
    deliveryId: delivery._id,
    matchId: matches[0]._id
  };
}
