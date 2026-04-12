import { createAuthStore } from 'hopdrop-shared';

export type { AuthState, AuthUser } from 'hopdrop-shared';

export const useAuthStore = createAuthStore('hopdrop-sender-auth');
