import request from 'supertest';
import { env } from './config/env';
import { findMatches, matchTripAgainstPendingRequests } from './services/matching.service';

jest.mock('./services/matching.service', () => ({
  findMatches: jest.fn(),
  matchTripAgainstPendingRequests: jest.fn()
}));

import app from './app';

const mockedFindMatches = jest.mocked(findMatches);
const mockedMatchTripAgainstPendingRequests = jest.mocked(matchTripAgainstPendingRequests);

describe('Internal matching routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthorized internal requests', async () => {
    const response = await request(app).post('/internal/v1/matching/delivery-requests/del_123');

    expect(response.status).toBe(401);
    expect(mockedFindMatches).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Unauthorized internal service request');
  });

  it('processes delivery-request matching when the internal token is present', async () => {
    mockedFindMatches.mockResolvedValue([{ _id: 'match_1' }] as any);

    const response = await request(app)
      .post('/internal/v1/matching/delivery-requests/del_123')
      .set('x-internal-service-token', env.INTERNAL_API_TOKEN)
      .set('x-request-id', 'req-internal-delivery-1');

    expect(response.status).toBe(202);
    expect(response.headers['x-request-id']).toBe('req-internal-delivery-1');
    expect(mockedFindMatches).toHaveBeenCalledWith('del_123');
    expect(response.body).toEqual({
      success: true,
      processed: 1,
      requestId: 'del_123'
    });
  });

  it('processes trip matching when the internal token is present', async () => {
    mockedMatchTripAgainstPendingRequests.mockResolvedValue([{ _id: 'match_2' }] as any);

    const response = await request(app)
      .post('/internal/v1/matching/trips/trip_123')
      .set('x-internal-service-token', env.INTERNAL_API_TOKEN);

    expect(response.status).toBe(202);
    expect(mockedMatchTripAgainstPendingRequests).toHaveBeenCalledWith('trip_123');
    expect(response.body).toEqual({
      success: true,
      processed: 1,
      tripId: 'trip_123'
    });
  });
});
