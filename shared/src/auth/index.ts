import { useMemo } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
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

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapping: boolean;
  setAuth: (payload: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  setBootstrapping: (value: boolean) => void;
  clearAuth: () => void;
}

export type AuthStore = UseBoundStore<StoreApi<AuthState>>;

export function createAuthStore(storageKey: string): AuthStore {
  return create<AuthState>()(
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
        name: storageKey,
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken
        })
      }
    )
  );
}

export function createUseAuth(useAuthStore: AuthStore) {
  return function useAuth() {
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const refreshToken = useAuthStore((s) => s.refreshToken);
    const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
    const setAuth = useAuthStore((s) => s.setAuth);
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const updateUser = useAuthStore((s) => s.updateUser);
    const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

    return useMemo(
      () => ({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: Boolean(user && accessToken),
        isBootstrapping,
        setAuth,
        clearAuth,
        updateUser,
        setBootstrapping
      }),
      [user, accessToken, refreshToken, isBootstrapping, setAuth, clearAuth, updateUser, setBootstrapping]
    );
  };
}
