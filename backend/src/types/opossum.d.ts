// Type declaration stub for opossum until installed via npm install opossum @types/opossum
// Run: npm install opossum @types/opossum --workspace=backend
declare module 'opossum' {
  interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
    name?: string;
  }

  type CircuitBreakerFunction<T extends unknown[], R> = (...args: T) => Promise<R>;

  class CircuitBreaker<T extends unknown[] = unknown[], R = unknown> {
    constructor(action: CircuitBreakerFunction<T, R>, options?: CircuitBreakerOptions);
    fire(...args: T): Promise<R>;
    on(event: 'open' | 'close' | 'halfOpen' | 'fallback' | 'success' | 'failure' | 'timeout' | 'reject', listener: (result?: unknown) => void): this;
    opened: boolean;
    closed: boolean;
    halfOpen: boolean;
  }

  export = CircuitBreaker;
}
