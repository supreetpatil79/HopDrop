import { useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function useSocket(matchId?: string): Socket | null {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const socket = useMemo(() => {
    if (!token) {
      return null;
    }

    return io(import.meta.env.VITE_SOCKET_URL || '/', {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token }
    });
  }, [token]);

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    socket.emit('join:user', { userId: user._id });
    if (matchId) {
      socket.emit('join:match', { matchId });
    }

    return () => {
      socket.disconnect();
    };
  }, [socket, user, matchId]);

  return socket;
}
