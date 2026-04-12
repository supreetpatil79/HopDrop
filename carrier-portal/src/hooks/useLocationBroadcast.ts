import { useEffect } from 'react';
import { Socket } from 'socket.io-client';

export function useLocationBroadcast(socket: Socket | null, matchId?: string, enabled = false) {
  useEffect(() => {
    if (!socket || !enabled || !matchId || !navigator.geolocation) {
      return;
    }

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          socket.emit('location:update', {
            matchId,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Ignore permission/location failures and continue with next interval.
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    }, 10_000);

    return () => clearInterval(interval);
  }, [socket, matchId, enabled]);
}
