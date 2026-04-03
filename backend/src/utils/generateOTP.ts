import crypto from 'crypto';

export function generateSecureOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}
