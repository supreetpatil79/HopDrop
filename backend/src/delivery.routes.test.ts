import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from './config/env';
import { createDeliveryRequest, getRequestMatches } from './services/delivery.service';

jest.mock('./services/delivery.service', () => ({
  cancelRequest: jest.fn(),
  confirmDeliveryPay: jest.fn(),
  createDeliveryPaymentOrder: jest.fn(),
  createDeliveryRequest: jest.fn(),
  getRequestById: jest.fn(),
  getRequestMatches: jest.fn(),
  listAllRequests: jest.fn(),
  listMyRequests: jest.fn(),
  updateRequest: jest.fn()
}));

import app from './app';

const mockedCreateDeliveryRequest = jest.mocked(createDeliveryRequest);
const mockedGetRequestMatches = jest.mocked(getRequestMatches);

function authHeader(overrides: Partial<{ id: string; phone: string; roles: string[] }> = {}) {
  const token = jwt.sign(
    {
      id: overrides.id || 'user_sender_1',
      phone: overrides.phone || '9876543210',
      roles: overrides.roles || ['sender']
    },
    env.JWT_ACCESS_SECRET
  );

  return `Bearer ${token}`;
}

describe('Delivery routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a delivery request for an authenticated sender', async () => {
    mockedCreateDeliveryRequest.mockResolvedValue({
      _id: 'del_123',
      status: 'pending',
      paymentStatus: 'unpaid'
    } as any);

    const response = await request(app)
      .post('/api/v1/deliveries')
      .set('authorization', authHeader())
      .set('x-request-id', 'req-delivery-create-1')
      .send({
        origin: {
          city: 'Bengaluru',
          state: 'Karnataka',
          coordinates: { type: 'Point', coordinates: [77.5946, 12.9716] },
          placeId: 'DEMO_BLR'
        },
        destination: {
          city: 'Mumbai',
          state: 'Maharashtra',
          coordinates: { type: 'Point', coordinates: [72.8777, 19.076] },
          placeId: 'DEMO_BOM'
        },
        package: {
          description: 'Legal documents',
          category: 'documents',
          weightKg: 1.25,
          isFragile: false,
          declaredValue: 5000
        },
        recipient: {
          name: 'Aarav Shah',
          phone: '9988776655',
          address: 'Andheri East, Mumbai'
        },
        preferredDeliveryWindow: {
          earliest: '2026-04-12T08:00:00.000Z',
          latest: '2026-04-12T15:00:00.000Z'
        }
      });

    expect(response.status).toBe(201);
    expect(response.headers['x-request-id']).toBe('req-delivery-create-1');
    expect(mockedCreateDeliveryRequest).toHaveBeenCalledWith(
      'user_sender_1',
      expect.objectContaining({
        origin: expect.objectContaining({ city: 'Bengaluru', placeId: 'DEMO_BLR' }),
        destination: expect.objectContaining({ city: 'Mumbai', placeId: 'DEMO_BOM' }),
        package: expect.objectContaining({
          description: 'Legal documents',
          category: 'documents',
          weightKg: 1.25
        }),
        recipient: expect.objectContaining({
          name: 'Aarav Shah'
        }),
        preferredDeliveryWindow: expect.objectContaining({
          earliest: expect.any(Date),
          latest: expect.any(Date)
        })
      })
    );
    expect(response.body).toEqual({
      success: true,
      message: 'Delivery request created',
      data: {
        _id: 'del_123',
        status: 'pending',
        paymentStatus: 'unpaid'
      }
    });
  });

  it('rejects invalid delivery creation payloads before reaching the service layer', async () => {
    const response = await request(app)
      .post('/api/v1/deliveries')
      .set('authorization', authHeader())
      .send({
        origin: { city: 'Bengaluru' }
      });

    expect(response.status).toBe(400);
    expect(mockedCreateDeliveryRequest).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
  });

  it('returns matches for a sender delivery request', async () => {
    mockedGetRequestMatches.mockResolvedValue([
      {
        _id: 'match_123',
        status: 'proposed',
        trip: 'trip_123'
      }
    ] as any);

    const response = await request(app)
      .get('/api/v1/deliveries/del_123/matches')
      .set('authorization', authHeader({ id: 'sender_42' }));

    expect(response.status).toBe(200);
    expect(mockedGetRequestMatches).toHaveBeenCalledWith('sender_42', 'del_123');
    expect(response.body).toEqual({
      success: true,
      message: 'Delivery matches fetched',
      data: [
        {
          _id: 'match_123',
          status: 'proposed',
          trip: 'trip_123'
        }
      ]
    });
  });

  it('rejects unauthenticated requests with 401', async () => {
    const response = await request(app).get('/api/v1/deliveries/del_123/matches');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(mockedGetRequestMatches).not.toHaveBeenCalled();
  });
});
