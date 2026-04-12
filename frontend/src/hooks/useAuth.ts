import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
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
}
