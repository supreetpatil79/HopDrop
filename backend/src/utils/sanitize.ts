/**
 * HopDrop Security & Input Sanitization Utilities
 * - Prevents ReDoS (Regular Expression Denial of Service)
 * - Prevents NoSQL Operator Injection ($gt, $ne, $where, etc.)
 */

export function escapeRegex(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeNoSql<T = any>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = sanitizeNoSql(data[i]);
    }
    return data;
  }

  const obj = data as Record<string, any>;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = sanitizeNoSql(obj[key]);
    }
  }

  return data;
}
