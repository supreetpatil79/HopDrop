import { api } from './client';

export const tripApi = {
  createTrip: (payload: any) => api.post('/trips', payload),
  getTrips: (params: Record<string, unknown>) => api.get('/trips', { params }),
  getTripById: (tripId: string) => api.get(`/trips/${tripId}`),
  updateTrip: (tripId: string, payload: any) => api.put(`/trips/${tripId}`, payload),
  deleteTrip: (tripId: string) => api.delete(`/trips/${tripId}`),
  getMyTrips: () => api.get('/trips/my'),
  payDeposit: (tripId: string) => api.post(`/trips/${tripId}/pay-deposit`),
  confirmDeposit: (tripId: string, payload: any) => api.post(`/trips/${tripId}/confirm-deposit`, payload)
};
