import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

interface AuthPayload extends JwtPayload {
  id: string;
  phone: string;
  roles: string[];
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = {
      ...decoded,
      id: decoded.id,
      phone: decoded.phone,
      roles: decoded.roles
    };
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Unauthorized'));
      return;
    }

    if (!req.user.roles.includes(role) && !req.user.roles.includes('admin')) {
      next(new ApiError(403, 'Forbidden'));
      return;
    }

    next();
  };
}
