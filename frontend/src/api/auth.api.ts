import { api } from './client';

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  register: (payload: { name: string; email: string; phone: string; otp: string }) => api.post('/auth/register', payload),
  login: (payload: { phone: string; otp: string }) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout')
};
