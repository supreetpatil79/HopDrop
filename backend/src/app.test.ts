import request from 'supertest';
import app from './app';

describe('Health check', () => {
  it('returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('returns 503 when the process reaches its in-flight request limit', async () => {
    app.set('hopdrop.inFlight', 1000);

    const response = await request(app).get('/api/v1/users/me');

    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBe('1');

    app.set('hopdrop.inFlight', 0);
  });
});
