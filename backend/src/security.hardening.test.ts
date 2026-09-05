import { escapeRegex, sanitizeNoSql } from './utils/sanitize';
import jwt from 'jsonwebtoken';
import { requireInternalService } from './middleware/internalService.middleware';
import { errorHandler } from './middleware/errorHandler';
import { Request, Response } from 'express';

describe('Security Hardening Test Suite', () => {
  describe('1. ReDoS / Regex Metacharacter Sanitization', () => {
    it('escapes regex metacharacters properly', () => {
      const maliciousPayload = '.*+?^${}()|[]\\';
      const escaped = escapeRegex(maliciousPayload);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');

      // Ensure regex compiled with escaped string treats metacharacters literally
      const regex = new RegExp(escaped, 'i');
      expect(regex.test('.*+?^${}()|[]\\')).toBe(true);
      expect(regex.test('completely different string')).toBe(false);
    });

    it('neutralizes potential catastrophic backtracking patterns', () => {
      const evilPattern = '((a+)+)+$';
      const escaped = escapeRegex(evilPattern);
      const regex = new RegExp(escaped);
      // Tests literal match rather than catastrophic backtracking
      expect(regex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!')).toBe(false);
      expect(regex.test('((a+)+)+$')).toBe(true);
    });

    it('handles non-string inputs gracefully', () => {
      expect(escapeRegex(null as any)).toBe('');
      expect(escapeRegex(undefined as any)).toBe('');
      expect(escapeRegex(123 as any)).toBe('');
    });
  });

  describe('2. NoSQL Injection Sanitization (sanitizeNoSql)', () => {
    it('removes keys starting with $ or containing . from objects', () => {
      const payload = {
        name: 'test',
        $gt: '',
        $where: 'sleep(5000)',
        'nested.key': 'evil',
        safe: {
          $ne: null,
          innerSafe: 'ok'
        }
      };

      sanitizeNoSql(payload);

      expect(payload).toEqual({
        name: 'test',
        safe: {
          innerSafe: 'ok'
        }
      });
      expect((payload as any).$gt).toBeUndefined();
      expect((payload as any).$where).toBeUndefined();
      expect((payload as any)['nested.key']).toBeUndefined();
      expect((payload.safe as any).$ne).toBeUndefined();
    });

    it('sanitizes arrays containing objects', () => {
      const arrayPayload = [
        { $regex: '.*', city: 'Mumbai' },
        { regular: 'Delhi' }
      ];

      sanitizeNoSql(arrayPayload);

      expect(arrayPayload).toEqual([
        { city: 'Mumbai' },
        { regular: 'Delhi' }
      ]);
    });
  });

  describe('3. JWT Algorithm Confusion Defense', () => {
    const secret = 'hopdrop-test-secret-at-least-64-characters-long-for-super-secure-testing-12345';

    it('verifies standard HS256 tokens', () => {
      const token = jwt.sign({ id: 'u1', role: 'sender' }, secret, { algorithm: 'HS256' });
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
      expect(decoded.id).toBe('u1');
    });

    it('rejects tokens signed with unauthorized algorithms or none algorithm', () => {
      // Create a unsigned token / none algorithm simulation
      const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const unsignedPayload = Buffer.from(JSON.stringify({ id: 'u1', role: 'admin' })).toString('base64url');
      const fakeToken = `${unsignedHeader}.${unsignedPayload}.`;

      expect(() => {
        jwt.verify(fakeToken, secret, { algorithms: ['HS256'] });
      }).toThrow();
    });
  });

  describe('4. Timing-Safe Internal Service Middleware', () => {
    it('rejects unauthorized internal tokens', () => {
      const req = {
        headers: {
          'x-internal-service-token': 'wrong-token'
        }
      } as unknown as Request;
      const res = {} as Response;
      let errorThrown: any = null;
      const next = (err?: any) => {
        errorThrown = err;
      };

      requireInternalService(req, res, next);
      expect(errorThrown).toBeDefined();
      expect(errorThrown.statusCode).toBe(401);
    });

    it('rejects missing internal token header', () => {
      const req = { headers: {} } as unknown as Request;
      const res = {} as Response;
      let errorThrown: any = null;
      const next = (err?: any) => {
        errorThrown = err;
      };

      requireInternalService(req, res, next);
      expect(errorThrown).toBeDefined();
      expect(errorThrown.statusCode).toBe(401);
    });
  });

  describe('5. Production Error Leakage Masking', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('masks internal server error messages in production', () => {
      process.env.NODE_ENV = 'production';

      const req = {
        method: 'GET',
        originalUrl: '/api/v1/test',
        requestId: 'req-123'
      } as unknown as Request;

      let responseStatusCode = 0;
      let responseBody: any = null;

      const res = {
        status: (code: number) => {
          responseStatusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        }
      } as unknown as Response;

      const internalDbError = new Error('MongoServerError: authentication failed for user root on host 10.0.0.1');

      errorHandler(internalDbError, req, res, () => {});

      expect(responseStatusCode).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toBe('Internal server error');
      expect(responseBody.stack).toBeUndefined();
      expect(responseBody.message).not.toContain('MongoServerError');
      expect(responseBody.message).not.toContain('10.0.0.1');
    });
  });
});
