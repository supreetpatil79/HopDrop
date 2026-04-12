import { createUseAuth } from 'hopdrop-shared';
import { useAuthStore } from '../store/authStore';

export const useAuth = createUseAuth(useAuthStore);
