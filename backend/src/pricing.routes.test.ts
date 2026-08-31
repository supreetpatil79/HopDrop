import request from 'supertest';
import jwt from 'jsonwebtoken';
import { estimateCarrierEarnings, estimatePricing } from './services/pricing.service';
import { env } from './config/env';

jest.mock('./services/pricing.service', () => ({
  estimatePricing: jest.fn(),
  estimateCarrierEarnings: jest.fn()
}));

import app from './app';

const mockedEstimatePricing = jest.mocked(estimatePricing);
const mockedEstimateCarrierEarnings = jest.mocked(estimateCarrierEarnings);

function authHeader(overrides: Partial<{ id: string; phone: string; roles: string[] }> = {}) {
  const token = jwt.sign(
    {
      id: overrides.id || 'user_carrier_1',
      phone: overrides.phone || '9876543210',
      roles: overrides.roles || ['carrier']
    },
    env.JWT_ACCESS_SECRET
  );

  return `Bearer ${token}`;
}

describe('Pricing routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a cached pricing estimate payload', async () => {
    mockedEstimatePricing.mockResolvedValue({
      carrierCount: 2,
      route: {
        originCity: 'Bengaluru',
        destinationCity: 'Mumbai'
      },
      estimate: {
        totalCharge: 2240
      }
    } as any);

    const response = await request(app)
      .get('/api/v1/pricing/estimate')
      .query({
        originCity: 'Bengaluru',
        destinationCity: 'Mumbai',
        weightKg: 2,
        category: 'documents'
      })
      .set('x-request-id', 'req-pricing-estimate-1');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-pricing-estimate-1');
    expect(response.headers['x-cache']).toBe('MISS');
    expect(mockedEstimatePricing).toHaveBeenCalledWith({
      originCity: 'Bengaluru',
      destinationCity: 'Mumbai',
      weightKg: 2,
      category: 'documents',
      isFragile: false,
      declaredValue: undefined
    });
    expect(response.body).toEqual({
      success: true,
      message: 'Pricing estimate fetched',
      data: {
        carrierCount: 2,
        route: {
          originCity: 'Bengaluru',
          destinationCity: 'Mumbai'
        },
        estimate: {
          totalCharge: 2240
        }
      }
    });
  });

  it('returns validation errors for invalid query params', async () => {
    const response = await request(app).get('/api/v1/pricing/estimate').query({
      originCity: 'B',
      destinationCity: 'Mumbai',
      weightKg: 0
    });

    expect(response.status).toBe(400);
    expect(mockedEstimatePricing).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
  });

  it('returns carrier earning guidance for authenticated carriers', async () => {
    mockedEstimateCarrierEarnings.mockResolvedValue({
      strategy: {
        recommendedRatePerKg: 120
      },
      projection: {
        current: {
          carrierPayout: 48000
        }
      }
    } as any);

    const response = await request(app)
      .get('/api/v1/pricing/carrier-guidance')
      .query({
        originCity: 'Bengaluru',
        destinationCity: 'Mumbai',
        capacityKg: 6,
        pricePerKg: 100,
        modeOfTransport: 'train',
        categories: 'documents,electronics'
      })
      .set('authorization', authHeader({ id: 'carrier_42' }))
      .set('x-request-id', 'req-carrier-guidance-1');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-carrier-guidance-1');
    expect(mockedEstimateCarrierEarnings).toHaveBeenCalledWith({
      originCity: 'Bengaluru',
      destinationCity: 'Mumbai',
      capacityKg: 6,
      pricePerKg: 100,
      modeOfTransport: 'train',
      departureTime: undefined,
      categories: ['documents', 'electronics']
    });
    expect(response.body).toEqual({
      success: true,
      message: 'Carrier earning guidance fetched',
      data: {
        strategy: {
          recommendedRatePerKg: 120
        },
        projection: {
          current: {
            carrierPayout: 48000
          }
        }
      }
    });
  });

  it('rejects senders from carrier earning guidance', async () => {
    const response = await request(app)
      .get('/api/v1/pricing/carrier-guidance')
      .query({
        originCity: 'Bengaluru',
        destinationCity: 'Mumbai',
        capacityKg: 6
      })
      .set('authorization', authHeader({ roles: ['sender'] }));

    expect(response.status).toBe(403);
    expect(mockedEstimateCarrierEarnings).not.toHaveBeenCalled();
  });
});
