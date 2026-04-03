import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        roles: string[];
      } & JwtPayload;
    }
  }
}

export {};
