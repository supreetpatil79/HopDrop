import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { allowedOrigins, env } from './env';
import { Match } from '../models/Match';

export let io: Server;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Unauthorized socket connection'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as { id: string };
      socket.data.userId = decoded.id;
      return next();
    } catch (error) {
      return next(new Error('Invalid socket token'));
    }
  });

  io.on('connection', (socket) => {
    const authenticatedUserId = socket.data.userId;
    if (authenticatedUserId) {
      socket.join(`user:${authenticatedUserId}`);
    }

    // Only allow joining own user room (prevents cross-user IDOR event sniffing)
    socket.on('join:user', ({ userId }: { userId: string }) => {
      if (userId && userId === authenticatedUserId) {
        socket.join(`user:${userId}`);
      }
    });

    // Only allow joining match room if the user is either the carrier or the sender
    socket.on('join:match', async ({ matchId }: { matchId: string }) => {
      if (!matchId || typeof matchId !== 'string') return;
      try {
        const match = await Match.findById(matchId).select('carrier sender');
        if (match) {
          const carrierId = match.carrier?.toString();
          const senderId = match.sender?.toString();
          if (carrierId === authenticatedUserId || senderId === authenticatedUserId) {
            socket.join(`match:${matchId}`);
          }
        }
      } catch (_e) {}
    });

    // Only allow carrier of the match to broadcast GPS location updates
    socket.on('location:update', async (payload: { matchId: string; lat: number; lng: number }) => {
      if (!payload?.matchId || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;
      try {
        const match = await Match.findById(payload.matchId).select('carrier');
        if (match && match.carrier?.toString() === authenticatedUserId) {
          const enriched = { ...payload, at: Date.now() };
          io.to(`match:${payload.matchId}`).emit('location:update', enriched);
          io.to(`match:${payload.matchId}`).emit('carrier:location', enriched);
        }
      } catch (_e) {}
    });
  });

  return io;
}
