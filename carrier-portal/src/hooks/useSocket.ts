import { createUseSocket } from 'hopdrop-shared';
import { useAuthStore } from '../store/authStore';

export const useSocket = createUseSocket(useAuthStore);
