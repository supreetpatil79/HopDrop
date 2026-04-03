import { api } from './client';

export const matchApi = {
  getMatch: (matchId: string) => api.get(`/matches/${matchId}`),
  carrierAccept: (matchId: string) => api.post(`/matches/${matchId}/carrier-accept`),
  carrierReject: (matchId: string) => api.post(`/matches/${matchId}/carrier-reject`),
  senderConfirm: (matchId: string) => api.post(`/matches/${matchId}/sender-confirm`),
  senderReject: (matchId: string) => api.post(`/matches/${matchId}/sender-reject`),
  generatePickupOtp: (matchId: string) => api.post(`/matches/${matchId}/generate-pickup-otp`),
  verifyPickupOtp: (matchId: string, otp: string) => api.post(`/matches/${matchId}/verify-pickup-otp`, { otp }),
  generateDeliveryOtp: (matchId: string) => api.post(`/matches/${matchId}/generate-delivery-otp`),
  verifyDeliveryOtp: (matchId: string, otp: string) => api.post(`/matches/${matchId}/verify-delivery-otp`, { otp }),
  rate: (matchId: string, payload: { score: number; comment?: string }) => api.post(`/matches/${matchId}/rate`, payload),
  dispute: (matchId: string, payload: { reason: string; description: string }) => api.post(`/matches/${matchId}/dispute`, payload),
  requestRapido: (matchId: string, payload: { pickupCoords: [number, number]; dropAddress: string }) =>
    api.post(`/matches/${matchId}/request-rapido`, payload)
};
