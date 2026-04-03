import { api } from './client';

export const userApi = {
  me: () => api.get('/users/me'),
  updateMe: (payload: { name?: string; email?: string; profilePhoto?: string }) => api.put('/users/me', payload),
  verifyId: (payload: { governmentIdType: string; governmentIdNumber: string }) => api.post('/users/me/verify-id', payload),
  wallet: () => api.get('/users/me/wallet'),
  publicProfile: (userId: string) => api.get(`/users/${userId}/public`)
};
