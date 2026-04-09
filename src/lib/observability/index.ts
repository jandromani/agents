import type { BrowserOptions } from '@sentry/react';

const DEFAULT_SAMPLE_RATE = 0.1;

export interface ObservabilityConfig {
  sentryDsn?: string;
  release?: string;
  environment?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}

export async function initObservability(config: ObservabilityConfig) {
  if (!config.sentryDsn) return;

  const options: BrowserOptions = {
    dsn: config.sentryDsn,
    release: config.release,
    environment: config.environment ?? 'development',
    tracesSampleRate: config.tracesSampleRate ?? DEFAULT_SAMPLE_RATE,
    integrations: [],
  };

  try {
    const Sentry = await import('@sentry/react');
    try {
      if ((Sentry as any).replayIntegration) {
        options.integrations = [(Sentry as any).replayIntegration()];
      }
    } catch {
      // Replay not available, continue without it
    }

    Sentry.init(options);
  } catch (error) {
    console.warn('Observability init skipped:', error);
  }
}

export function recordBreadcrumb(message: string, data?: Record<string, unknown>) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.addBreadcrumb({ message, data });
    })
    .catch(() => {
      // no-op
    });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.captureException(error, { extra: context });
    })
    .catch(() => {
      console.error('Captured error', error, context);
    });
}
