import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('security utilities', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as any).window = {
      setInterval: setInterval,
      clearInterval: clearInterval,
    };
    (globalThis as any).navigator = { userAgent: 'test-agent' };
  });

  it('enforces rate limits with blocking window', async () => {
    const security = await import('../../../src/lib/security');
    const limiter = security.rateLimiter;

    const config = { maxRequests: 2, windowMs: 1000, blockDurationMs: 500 };
    expect(limiter.check('user', config).allowed).toBe(true);
    expect(limiter.check('user', config).allowed).toBe(true);
    const blocked = limiter.check('user', config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('validates password complexity and email format', async () => {
    const security = await import('../../../src/lib/security');
    expect(security.validateEmail('bad-email')).toBe(false);
    expect(security.validateEmail('valid@example.com')).toBe(true);

    const weak = security.validatePassword('short');
    expect(weak.valid).toBe(false);
    expect(weak.errors.length).toBeGreaterThan(0);

    const strong = security.validatePassword('StrongerPass123!');
    expect(strong.valid).toBe(true);
  });

  it('sanitizes input and builds CSP headers', async () => {
    const security = await import('../../../src/lib/security');
    expect(security.sanitizeInput(' <bad> ')).toBe('bad');
    const headers = security.getSecurityHeaders();
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['X-Frame-Options']).toBe('DENY');
  });
});
