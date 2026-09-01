import toast from 'react-hot-toast';
import { createApiClient } from 'hopdrop-shared';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '../store/authStore';

export const api = createApiClient<AuthUser>({
  apiBaseUrl: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL,
  clientName: 'sender-web',
  auth: {
    getAccessToken: () => useAuthStore.getState().accessToken,
    getRefreshToken: () => useAuthStore.getState().refreshToken,
    setAuth: (payload) => useAuthStore.getState().setAuth(payload),
    clearAuth: () => useAuthStore.getState().clearAuth()
  },
  onServerError: (message) => {
    toast.error(message);
  }
});
