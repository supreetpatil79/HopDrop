import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { captureAnalyticsEvent, captureClientError } from '../telemetry';

export interface AuthAdapter<User> {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setAuth: (payload: { user: User; accessToken: string; refreshToken: string }) => void;
  clearAuth: () => void;
}

export interface CreateApiClientOptions<User> {
  apiBaseUrl?: string;
  clientName?: string;
  auth: AuthAdapter<User>;
  onServerError?: (message: string) => void;
}

export function buildApiBaseUrl(apiUrl?: string) {
  if (apiUrl && apiUrl.trim() !== '') {
    const trimmed = apiUrl.trim().replace(/\/$/, '');
    if (trimmed.endsWith('/api/v1')) {
      return trimmed;
    }
    return `${trimmed}/api/v1`;
  }

  // Automatic production fallback when deployed to Vercel without env vars set
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://hop-drop-backend.vercel.app/api/v1';
  }

  return '/api/v1';
}

export function createApiClient<User>({
  apiBaseUrl,
  clientName,
  auth,
  onServerError
}: CreateApiClientOptions<User>): AxiosInstance {
  const api = axios.create({
    baseURL: buildApiBaseUrl(apiBaseUrl),
    withCredentials: true
  });

  let isRefreshing = false;
  let pendingQueue: Array<(token: string | null) => void> = [];

  function onRefreshed(token: string | null) {
    pendingQueue.forEach((cb) => cb(token));
    pendingQueue = [];
  }

  function createRequestId() {
    if (typeof globalThis !== 'undefined' && 'crypto' in globalThis && typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = auth.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Request-Id'] = createRequestId();
    if (clientName) {
      config.headers['X-Client-App'] = clientName;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<any>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const statusCode = error.response?.status;
      const responseRequestId =
        (error.response?.headers?.['x-request-id'] as string | undefined) ||
        (error.response?.headers?.['X-Request-Id'] as string | undefined);

      if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
        if (statusCode && statusCode >= 500) {
          onServerError?.('Server error. Please try again.');
          captureClientError(error, {
            source: 'api_response',
            client_name: clientName || 'unknown',
            method: originalRequest?.method || 'unknown',
            path: originalRequest?.url || 'unknown',
            status_code: statusCode,
            request_id: responseRequestId || null
          });
        } else if (statusCode === 429) {
          captureAnalyticsEvent('api_rate_limited', {
            client_name: clientName || 'unknown',
            path: originalRequest?.url || 'unknown',
            request_id: responseRequestId || null
          });
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }

            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = auth.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const refreshResponse = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken
        });

        const data = refreshResponse.data?.data;
        auth.setAuth({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        });

        onRefreshed(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        captureClientError(refreshError, {
          source: 'auth_refresh',
          client_name: clientName || 'unknown'
        });
        auth.clearAuth();
        onRefreshed(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  return api;
}

export function createAuthApi(api: AxiosInstance) {
  return {
    sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
    verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
    register: (payload: { name: string; email: string; phone: string; otp: string }) => api.post('/auth/register', payload),
    login: (payload: { phone: string; otp: string }) => api.post('/auth/login', payload),
    demoLogin: (payload?: { persona?: 'carrier' | 'sender_priya' | 'sender_rahul' }) => api.post('/auth/demo-login', payload ?? {}),
    logout: () => api.post('/auth/logout')
  };
}

export function createDeliveryApi(api: AxiosInstance) {
  return {
    createRequest: (payload: any) => api.post('/deliveries', payload),
    getMyRequests: () => api.get('/deliveries/my'),
    getRequestById: (requestId: string) => api.get(`/deliveries/${requestId}`),
    updateRequest: (requestId: string, payload: any) => api.put(`/deliveries/${requestId}`, payload),
    deleteRequest: (requestId: string) => api.delete(`/deliveries/${requestId}`),
    payRequest: (requestId: string) => api.post(`/deliveries/${requestId}/pay`),
    confirmPay: (requestId: string, payload: any) => api.post(`/deliveries/${requestId}/confirm-pay`, payload),
    getMatches: (requestId: string) => api.get(`/deliveries/${requestId}/matches`)
  };
}

export function createMatchApi(api: AxiosInstance) {
  return {
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
}

export function createPaymentApi(api: AxiosInstance) {
  return {
    transactions: () => api.get('/payments/transactions')
  };
}

export function createTripApi(api: AxiosInstance) {
  return {
    createTrip: (payload: any) => api.post('/trips', payload),
    getTrips: (params: Record<string, unknown>) => api.get('/trips', { params }),
    getTripById: (tripId: string) => api.get(`/trips/${tripId}`),
    updateTrip: (tripId: string, payload: any) => api.put(`/trips/${tripId}`, payload),
    deleteTrip: (tripId: string) => api.delete(`/trips/${tripId}`),
    getMyTrips: () => api.get('/trips/my'),
    createPreTripDepositOrder: () => api.post('/trips/deposit-order'),
    payDeposit: (tripId: string) => api.post(`/trips/${tripId}/pay-deposit`),
    confirmDeposit: (tripId: string, payload: any) => api.post(`/trips/${tripId}/confirm-deposit`, payload)
  };
}

export function createPricingApi(api: AxiosInstance) {
  return {
    estimate: (params: {
      originCity: string;
      destinationCity: string;
      weightKg: number;
      category?: string;
      isFragile?: boolean;
      declaredValue?: number;
    }) => api.get('/pricing/estimate', { params }),
    carrierGuidance: (params: {
      originCity: string;
      destinationCity: string;
      capacityKg: number;
      categories?: string[] | string;
      pricePerKg?: number;
      modeOfTransport?: string;
      departureTime?: string;
    }) => api.get('/pricing/carrier-guidance', { params })
  };
}

export function createJobApi(api: AxiosInstance) {
  return {
    available: () => api.get('/jobs/available')
  };
}

export function createUserApi(api: AxiosInstance) {
  return {
    me: () => api.get('/users/me'),
    updateMe: (payload: { name?: string; email?: string; profilePhoto?: string }) => api.put('/users/me', payload),
    verifyId: (payload: { governmentIdType: string; governmentIdNumber: string }) => api.post('/users/me/verify-id', payload),
    wallet: () => api.get('/users/me/wallet'),
    publicProfile: (userId: string) => api.get(`/users/${userId}/public`)
  };
}
