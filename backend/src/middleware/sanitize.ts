import { NextFunction, Request, Response } from 'express';
import { sanitizeNoSql } from '../utils/sanitize';

/**
 * Express Middleware: NoSQL Injection Sanitizer
 * Neutralizes query/body/param operator injections ($gt, $ne, $where, prototype pollution keys)
 */
export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) {
    sanitizeNoSql(req.body);
  }
  if (req.query) {
    sanitizeNoSql(req.query);
  }
  if (req.params) {
    sanitizeNoSql(req.params);
  }
  next();
}
