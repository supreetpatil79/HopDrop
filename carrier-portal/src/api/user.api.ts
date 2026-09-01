import { createUserApi } from 'hopdrop-shared';
import { api } from './client';

export const userApi = {
  ...createUserApi(api),
  getCarrierSetupStatus: () => api.get('/users/carrier/setup-status'),
  verifyCarrierAadhaar: (payload: { aadhaarNumber: string; otp?: string }) =>
    api.post('/users/carrier/verify-aadhaar', payload),
  saveCarrierPayout: (payload: {
    method: 'upi' | 'bank';
    upiId?: string;
    accountNumber?: string;
    ifsc?: string;
    holderName?: string;
  }) => api.post('/users/carrier/payout-method', payload),
  saveCarrierPreferences: (payload: {
    preferredModes?: string[];
    maxCapacityKg?: number;
    allowedCategories?: string[];
    instantBooking?: boolean;
    bio?: string;
    emergencyContact?: string;
  }) => api.post('/users/carrier/preferences', payload)
};
