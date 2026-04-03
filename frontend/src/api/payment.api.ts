import { api } from './client';

export const paymentApi = {
  transactions: () => api.get('/payments/transactions')
};
