import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from './config/env';
import { carrierAccept, senderConfirm } from './services/match.service';

jest.mock('./services/match.service', () => ({
  carrierAccept: jest.fn(),
  carrierReject: jest.fn(),
  disputeMatch: jest.fn(),
  generateDeliveryOtp: jest.fn(),
  generatePickupOtp: jest.fn(),
  getMatchById: jest.fn(),
  rateMatch: jest.fn(),
  requestRapidoForMatch: jest.fn(),
  senderConfirm: jest.fn(),
  senderReject: jest.fn(),
  verifyDeliveryOtpForMatch: jest.fn(),
  verifyPickupOtpForMatch: jest.fn()
}));

import app from './app';

const mockedCarrierAccept = jest.mocked(carrierAccept);
const mockedSenderConfirm = jest.mocked(senderConfirm);

function authHeader(overrides: Partial<{ id: string; phone: string; roles: string[] }> = {}) {
  const token = jwt.sign(
    {
      id: overrides.id || 'user_1',
      phone: overrides.phone || '9876543210',
      roles: overrides.roles || ['sender']
    },
    env.JWT_ACCESS_SECRET
  );

  return `Bearer ${token}`;
}

describe('Match route contracts', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows the carrier to accept a proposed match', async () => {
    mockedCarrierAccept.mockResolvedValue({
      _id: 'match_123',
      status: 'carrier_accepted'
    } as any);

    const response = await request(app)
      .post('/api/v1/matches/match_123/carrier-accept')
      .set('authorization', authHeader({ id: 'carrier_9', roles: ['carrier'] }))
      .set('x-request-id', 'req-match-carrier-accept-1');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-match-carrier-accept-1');
    expect(mockedCarrierAccept).toHaveBeenCalledWith('match_123', 'carrier_9');
    expect(response.body).toEqual({
      success: true,
      message: 'Match accepted by carrier',
      data: {
        _id: 'match_123',
        status: 'carrier_accepted'
      }
    });
  });

  it('allows the sender to confirm a carrier-accepted match', async () => {
    mockedSenderConfirm.mockResolvedValue({
      _id: 'match_123',
      status: 'sender_confirmed'
    } as any);

    const response = await request(app)
      .post('/api/v1/matches/match_123/sender-confirm')
      .set('authorization', authHeader({ id: 'sender_9', roles: ['sender'] }));

    expect(response.status).toBe(200);
    expect(mockedSenderConfirm).toHaveBeenCalledWith('match_123', 'sender_9');
    expect(response.body).toEqual({
      success: true,
      message: 'Match confirmed by sender',
      data: {
        _id: 'match_123',
        status: 'sender_confirmed'
      }
    });
  });

  it('rejects unauthenticated match actions', async () => {
    const response = await request(app).post('/api/v1/matches/match_123/carrier-accept');

    expect(response.status).toBe(401);
    expect(mockedCarrierAccept).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid or expired token');
  });
});
