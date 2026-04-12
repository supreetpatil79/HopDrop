import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: string[];
  rating?: {
    average: number;
    count: number;
  };
  wallet?: {
    balance: number;
    escrowHeld: number;
  };
  profilePhoto?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapping: boolean;
  setAuth: (payload: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  setBootstrapping: (value: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isBootstrapping: false,
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({
          user,
          accessToken,
          refreshToken,
          isBootstrapping: false
        }),
      updateUser: (user) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...user } : state.user
        })),
      setBootstrapping: (value) =>
        set({
          isBootstrapping: value
        }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isBootstrapping: false
        })
    }),
    {
      name: 'hopdrop-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
);
