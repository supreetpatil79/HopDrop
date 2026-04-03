import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';

export let io: Server;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Unauthorized socket connection'));
      }

      jwt.verify(token, env.JWT_ACCESS_SECRET);
      return next();
    } catch (error) {
      return next(new Error('Invalid socket token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:user', ({ userId }: { userId: string }) => {
      socket.join(`user:${userId}`);
    });

    socket.on('join:match', ({ matchId }: { matchId: string }) => {
      socket.join(`match:${matchId}`);
    });

    socket.on('location:update', (payload: { matchId: string; lat: number; lng: number }) => {
      io.to(`match:${payload.matchId}`).emit('location:update', payload);
    });
  });

  return io;
}
