import { api } from './client';

export const deliveryApi = {
  createRequest: (payload: any) => api.post('/deliveries', payload),
  getMyRequests: () => api.get('/deliveries/my'),
  getRequestById: (requestId: string) => api.get(`/deliveries/${requestId}`),
  updateRequest: (requestId: string, payload: any) => api.put(`/deliveries/${requestId}`, payload),
  deleteRequest: (requestId: string) => api.delete(`/deliveries/${requestId}`),
  payRequest: (requestId: string) => api.post(`/deliveries/${requestId}/pay`),
  confirmPay: (requestId: string, payload: any) => api.post(`/deliveries/${requestId}/confirm-pay`, payload),
  getMatches: (requestId: string) => api.get(`/deliveries/${requestId}/matches`)
};
