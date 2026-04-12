import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      traceId?: string;
      spanId?: string;
      user?: {
        id: string;
        phone: string;
        roles: string[];
      } & JwtPayload;
    }
  }
}

export {};
