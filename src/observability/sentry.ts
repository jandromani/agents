import { appName, buildMonitorSlug, defaultTags, environment, parseSampleRate, release, sampleRates, sentryDsn } from './config';
import type { SeverityLevel } from './types';

declare global {
  interface Window {
    Sentry?: any;
  }
}

const SENTRY_SCRIPT_URL = import.meta.env.VITE_SENTRY_CDN ||
  'https://browser.sentry-cdn.com/7.120.1/bundle.tracing.replay.min.js';

let sentryClientPromise: Promise<any | null> | null = null;

async function loadSentryScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Sentry can only be initialized in the browser'));
      return;
    }

    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Sentry script')));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Failed to load Sentry script')));
    document.head.appendChild(script);
  });
}

const withStaticTags = <T extends { tags?: Record<string, string> }>(event: T): T => ({
  ...event,
  tags: {
    ...defaultTags,
    ...event.tags,
  },
});

const enrichEventContext = <T extends { tags?: Record<string, string>; release?: string }>(event: T): T => {
  const enriched = withStaticTags(event);
  if (release) {
    enriched.release = release;
  }
  return enriched;
};

const mapUptimeStatus = {
  up: 'ok',
  degraded: 'in_progress',
  down: 'error',
} as const;

export function initObservability() {
  if (typeof window === 'undefined' || sentryClientPromise) {
    return;
  }

  const shouldEnable = import.meta.env.PROD || ['production', 'staging'].includes(environment);
  if (!shouldEnable) {
    console.info('[Observability] Sentry solo se inicializa en builds productivos');
    return;
  }

  const dsn = sentryDsn;
  if (!dsn) {
    console.error('[Observabilidad] Sentry DSN ausente: la telemetría principal queda deshabilitada');

    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark('observability:sentry:dsn_missing');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('observability:sentry:disabled', {
        detail: { reason: 'missing-dsn' },
      }));
    }

    return;
  }

  sentryClientPromise = loadSentryScript(SENTRY_SCRIPT_URL)
    .then(() => {
      if (!window.Sentry) {
        throw new Error('El SDK de Sentry no está disponible tras la carga del script');
      }

      window.Sentry.init({
        dsn,
        environment,
        release,
        sampleRate: sampleRates.error,
        tracesSampleRate: sampleRates.traces,
        profilesSampleRate: sampleRates.profiles,
        replaysSessionSampleRate: sampleRates.replaysSession,
        replaysOnErrorSampleRate: sampleRates.replaysOnError,
        integrations: (integrations) => {
          const baseIntegrations = integrations || [];
          if (window.Sentry.BrowserTracing) {
            baseIntegrations.push(new window.Sentry.BrowserTracing());
          }
          if (window.Sentry.Replay) {
            baseIntegrations.push(new window.Sentry.Replay({ stickySession: true }));
          }
          if (window.Sentry.CaptureConsole) {
            baseIntegrations.push(new window.Sentry.CaptureConsole({ levels: ['error'] }));
          }
          return baseIntegrations;
        },
        beforeSend(event) {
          const enriched = enrichEventContext(event);
          enriched.fingerprint = enriched.fingerprint || ['{{ default }}', environment];
          return enriched;
        },
        beforeSendTransaction(event) {
          const enriched = enrichEventContext(event);
          enriched.contexts = {
            ...enriched.contexts,
            kpis: {
              apdexT: parseSampleRate(import.meta.env.VITE_APDEX_THRESHOLD, 0.3),
              monitor: buildMonitorSlug(),
            },
          };
          return enriched;
        },
      });

      window.Sentry.configureScope((scope: any) => {
        scope.setTags(defaultTags);
        scope.setContext('runtime', { app: appName, environment, release });
      });

      return window.Sentry;
    })
    .catch(error => {
      console.error('[Observabilidad] No se pudo inicializar Sentry', error);
      return null;
    });
}

export const getSentryClient = () => sentryClientPromise;

export const sendToSentry = (handler: (client: any) => void) => {
  if (!sentryClientPromise) return;
  void sentryClientPromise.then(client => {
    if (client) {
      handler(client);
    }
  });
};

export const captureWithLevel = (level: SeverityLevel, message: string, context?: Record<string, unknown>) => {
  sendToSentry(client => {
    client.addBreadcrumb({ level, message, data: context });
    if (level === 'error' || level === 'fatal') {
      client.captureMessage(message, { level, extra: context });
    }
  });
};

export const captureUptimeCheckIn = (service: string, status: keyof typeof mapUptimeStatus, duration?: number) => {
  const monitor = buildMonitorSlug(service);
  if (!monitor) return;

  sendToSentry(client => {
    client.captureCheckIn({
      monitorSlug: monitor,
      status: mapUptimeStatus[status],
      duration,
      release,
      environment,
    });
  });
};
