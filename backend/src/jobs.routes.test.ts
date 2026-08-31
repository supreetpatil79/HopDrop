import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from './config/env';
import { listAvailableJobs } from './services/job.service';

jest.mock('./services/job.service', () => ({
  listAvailableJobs: jest.fn()
}));

import app from './app';

const mockedListAvailableJobs = jest.mocked(listAvailableJobs);

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

describe('Jobs routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns available jobs for authenticated carriers', async () => {
    mockedListAvailableJobs.mockResolvedValue([
      {
        _id: 'match_1',
        status: 'proposed'
      }
    ] as any);

    const response = await request(app)
      .get('/api/v1/jobs/available')
      .set('authorization', authHeader({ id: 'carrier_42' }))
      .set('x-request-id', 'req-jobs-available-1');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-jobs-available-1');
    expect(response.headers['x-cache']).toBe('MISS');
    expect(mockedListAvailableJobs).toHaveBeenCalledWith('carrier_42');
    expect(response.body).toEqual({
      success: true,
      message: 'Available jobs fetched',
      data: [
        {
          _id: 'match_1',
          status: 'proposed'
        }
      ]
    });
  });

  it('rejects senders from reading carrier jobs', async () => {
    const response = await request(app)
      .get('/api/v1/jobs/available')
      .set('authorization', authHeader({ roles: ['sender'] }));

    expect(response.status).toBe(403);
    expect(mockedListAvailableJobs).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
  });
});
