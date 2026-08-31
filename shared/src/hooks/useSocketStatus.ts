import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type SocketConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export function useSocketStatus(socket: Socket | null) {
  const [state, setState] = useState<{ status: SocketConnectionStatus; attempt: number }>({
    status: socket?.connected ? 'connected' : 'disconnected',
    attempt: 0
  });

  useEffect(() => {
    if (!socket) {
      setState({ status: 'disconnected', attempt: 0 });
      return;
    }

    const handleConnect = () => {
      setState({ status: 'connected', attempt: 0 });
    };

    const handleDisconnect = () => {
      setState((current) => ({
        status: current.attempt > 0 ? 'reconnecting' : 'disconnected',
        attempt: current.attempt
      }));
    };

    const handleReconnectAttempt = (attempt: number) => {
      setState({ status: 'reconnecting', attempt });
    };

    const handleReconnectError = () => {
      setState((current) => ({
        status: 'reconnecting',
        attempt: current.attempt > 0 ? current.attempt : 1
      }));
    };

    if (socket.connected) {
      handleConnect();
    } else {
      handleDisconnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.io.on('reconnect_error', handleReconnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.io.off('reconnect_error', handleReconnectError);
    };
  }, [socket]);

  return state;
}
