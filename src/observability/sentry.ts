import type { SeverityLevel } from './types';

declare global {
  interface Window {
    Sentry?: any;
  }
}

const SENTRY_SCRIPT_URL = import.meta.env.VITE_SENTRY_CDN ||
  'https://browser.sentry-cdn.com/7.120.1/bundle.tracing.replay.min.js';

let sentryClientPromise: Promise<any | null> | null = null;

const parseSampleRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

export function initObservability() {
  if (typeof window === 'undefined' || sentryClientPromise) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.info('[Observability] Sentry DSN no configurado, telemetría deshabilitada');
    return;
  }

  sentryClientPromise = loadSentryScript(SENTRY_SCRIPT_URL)
    .then(() => {
      if (!window.Sentry) {
        throw new Error('El SDK de Sentry no está disponible tras la carga del script');
      }

      const environment = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;
      const release = import.meta.env.VITE_RELEASE;

      window.Sentry.init({
        dsn,
        environment,
        release,
        tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.3),
        profilesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_PROFILES_SAMPLE_RATE, 0.1),
        replaysSessionSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_REPLAYS_SAMPLE_RATE, 0.0),
        replaysOnErrorSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 1.0),
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
          if (event.level === 'error' || event.level === 'fatal') {
            event.tags = { ...event.tags, severity: event.level };
          }
          return event;
        },
      });

      return window.Sentry;
    })
    .catch(error => {
      console.error('[Observability] No se pudo inicializar Sentry', error);
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
