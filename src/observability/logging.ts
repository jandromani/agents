import { captureWithLevel, sendToSentry } from './sentry';
import type { SeverityLevel } from './types';

const consoleMethod: Record<SeverityLevel, 'error' | 'warn' | 'info' | 'debug' | 'log'> = {
  fatal: 'error',
  error: 'error',
  warning: 'warn',
  info: 'info',
  debug: 'debug',
  log: 'log',
};

const logPrefix = '[Observability]';

const logWithSeverity = (level: SeverityLevel, message: string, context?: Record<string, unknown>) => {
  const method = consoleMethod[level] || 'log';
  const payload = context ? { context } : undefined;
  console[method](`${logPrefix} ${message}`, payload || '');
  captureWithLevel(level, message, context);
};

export const logInfo = (message: string, context?: Record<string, unknown>) => logWithSeverity('info', message, context);
export const logWarning = (message: string, context?: Record<string, unknown>) => logWithSeverity('warning', message, context);
export const logError = (message: string, context?: Record<string, unknown>) => logWithSeverity('error', message, context);
export const logDebug = (message: string, context?: Record<string, unknown>) => logWithSeverity('debug', message, context);

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  console.error(`${logPrefix} Excepción capturada`, error, context || '');
  sendToSentry(client => {
    client.captureException(error, { extra: context });
  });
};

export const recordUptimeHeartbeat = (service: string, status: 'up' | 'degraded' | 'down') => {
  logInfo(`Heartbeat de uptime para ${service}: ${status}`, { service, status });
};
