import { supabase } from './supabase';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry>;
  private cleanupInterval: number;

  constructor() {
    this.storage = new Map();
    this.cleanupInterval = window.setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime < now && (!entry.blocked || (entry.blockUntil && entry.blockUntil < now))) {
        this.storage.delete(key);
      }
    }
  }

  check(identifier: string, config: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry) {
      this.storage.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
      });
      return { allowed: true };
    }

    if (entry.blocked && entry.blockUntil) {
      if (entry.blockUntil > now) {
        return {
          allowed: false,
          retryAfter: Math.ceil((entry.blockUntil - now) / 1000)
        };
      }
      entry.blocked = false;
      entry.blockUntil = undefined;
      entry.count = 0;
    }

    if (entry.resetTime < now) {
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
      return { allowed: true };
    }

    if (entry.count >= config.maxRequests) {
      if (config.blockDurationMs) {
        entry.blocked = true;
        entry.blockUntil = now + config.blockDurationMs;
      }
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    entry.count++;
    return { allowed: true };
  }

  reset(identifier: string) {
    this.storage.delete(identifier);
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.storage.clear();
  }
}

export const rateLimiter = new RateLimiter();

export const RATE_LIMITS = {
  AUTH: {
    LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 },
    REGISTER: { maxRequests: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },
    PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  },
  API: {
    AGENT_CREATION: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
    AGENT_DEPLOY: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
    AGENT_QUERY: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
  },
};

export async function logSecurityEvent(
  eventType: string,
  userId: string | null,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  try {
    const { error } = await supabase.from('security_logs').insert({
      event_type: eventType,
      user_id: userId,
      details,
      severity,
      ip_address: null,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 10000);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('La contraseña debe tener al menos 12 caracteres');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una letra minúscula');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una letra mayúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Debe incluir al menos un carácter especial');
  }

  const commonPasswords = [
    'password123', '12345678', 'qwerty123', 'admin123',
    'welcome123', 'password1234', '123456789012'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Esta contraseña es demasiado común');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function checkSuspiciousActivity(
  userId: string,
  action: string
): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('security_logs')
      .select('event_type, severity')
      .eq('user_id', userId)
      .gte('timestamp', oneHourAgo)
      .in('severity', ['high', 'critical']);

    if (error) throw error;

    if (data && data.length >= 5) {
      await logSecurityEvent(
        'suspicious_activity_detected',
        userId,
        { action, recentHighSeverityEvents: data.length },
        'critical'
      );
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error checking suspicious activity:', err);
    return false;
  }
}

export function generateCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://openrouter.ai https://api.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': generateCSPHeader(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

export async function createAuditLog(
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  changes?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      changes,
      timestamp: new Date().toISOString(),
      ip_address: null,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
