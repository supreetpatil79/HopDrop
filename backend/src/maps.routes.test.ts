import request from 'supertest';
import { getRouteGeometry, recordSuggestionSelection, suggestCities } from './services/maps.service';

jest.mock('./services/maps.service', () => ({
  suggestCities: jest.fn(),
  recordSuggestionSelection: jest.fn(),
  getRouteGeometry: jest.fn()
}));

import app from './app';

const mockedSuggestCities = jest.mocked(suggestCities);
const mockedRecordSuggestionSelection = jest.mocked(recordSuggestionSelection);
const mockedGetRouteGeometry = jest.mocked(getRouteGeometry);

describe('Maps routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns location suggestions from the gateway', async () => {
    mockedSuggestCities.mockResolvedValue({
      suggestions: [
        {
          placeName: 'Bengaluru',
          placeAddress: 'Karnataka, India',
          eLoc: 'DEMO_BLR',
          latitude: 12.9716,
          longitude: 77.5946
        }
      ],
      meta: {
        normalizedQuery: 'ben',
        strategy: 'hybrid_lexical_ctr_rerank',
        actor: 'sender',
        field: 'origin',
        region: 'IND'
      }
    });

    const response = await request(app)
      .get('/api/v1/maps/suggest')
      .query({ q: 'ben', region: 'IND', actor: 'sender', field: 'origin', limit: 8 })
      .set('x-request-id', 'req-maps-suggest-1');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-maps-suggest-1');
    expect(mockedSuggestCities).toHaveBeenCalledWith('ben', 'IND', {
      actor: 'sender',
      field: 'origin',
      limit: 8
    });
    expect(response.body).toEqual({
      success: true,
      message: 'Suggestions fetched',
      data: {
        suggestions: [
          {
            placeName: 'Bengaluru',
            placeAddress: 'Karnataka, India',
            eLoc: 'DEMO_BLR',
            latitude: 12.9716,
            longitude: 77.5946
          }
        ],
        meta: {
          normalizedQuery: 'ben',
          strategy: 'hybrid_lexical_ctr_rerank',
          actor: 'sender',
          field: 'origin',
          region: 'IND'
        }
      }
    });
  });

  it('records suggestion feedback for reranking', async () => {
    mockedRecordSuggestionSelection.mockResolvedValue({ accepted: true });

    const response = await request(app)
      .post('/api/v1/maps/select')
      .send({
        query: 'ben',
        region: 'IND',
        actor: 'sender',
        field: 'origin',
        suggestion: {
          placeName: 'Bengaluru',
          placeAddress: 'Karnataka, India',
          eLoc: 'DEMO_BLR',
          latitude: 12.9716,
          longitude: 77.5946,
          city: 'Bengaluru',
          state: 'Karnataka'
        }
      });

    expect(response.status).toBe(200);
    expect(mockedRecordSuggestionSelection).toHaveBeenCalledWith({
      query: 'ben',
      region: 'IND',
      actor: 'sender',
      field: 'origin',
      suggestion: {
        placeName: 'Bengaluru',
        placeAddress: 'Karnataka, India',
        eLoc: 'DEMO_BLR',
        latitude: 12.9716,
        longitude: 77.5946,
        city: 'Bengaluru',
        state: 'Karnataka'
      }
    });
    expect(response.body).toEqual({
      success: true,
      message: 'Selection recorded',
      data: {
        accepted: true
      }
    });
  });

  it('returns route geometry from the gateway', async () => {
    mockedGetRouteGeometry.mockResolvedValue({
      distanceKm: 842.4,
      durationHours: 15.3,
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.5946, 12.9716],
          [72.8777, 19.076]
        ]
      }
    });

    const response = await request(app).get('/api/v1/maps/route').query({
      originLng: 77.5946,
      originLat: 12.9716,
      destLng: 72.8777,
      destLat: 19.076
    });

    expect(response.status).toBe(200);
    expect(mockedGetRouteGeometry).toHaveBeenCalledWith({
      originLng: 77.5946,
      originLat: 12.9716,
      destLng: 72.8777,
      destLat: 19.076
    });
    expect(response.body).toMatchObject({
      success: true,
      message: 'Route fetched',
      data: {
        distanceKm: 842.4,
        durationHours: 15.3,
        geometry: {
          type: 'LineString'
        }
      }
    });
  });

  it('returns a 400 for invalid suggest queries', async () => {
    const response = await request(app).get('/api/v1/maps/suggest').query({ q: 'a' });

    expect(response.status).toBe(400);
    expect(mockedSuggestCities).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors.q).toEqual(expect.any(Array));
    expect(response.body.requestId).toEqual(expect.any(String));
  });
});
