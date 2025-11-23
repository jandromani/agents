export const environment =
  import.meta.env.VITE_APP_ENV || import.meta.env.REACT_APP_ENV || import.meta.env.MODE || 'development';
export const release = import.meta.env.VITE_RELEASE;
export const appName = import.meta.env.VITE_APP_NAME || 'agents-frontend';
export const sentryDsn = import.meta.env.VITE_SENTRY_DSN || import.meta.env.REACT_APP_SENTRY_DSN;
export const monitorSlug = import.meta.env.VITE_SENTRY_MONITOR_SLUG;

export const defaultTags = {
  app: appName,
  environment,
  runtime: 'browser',
};

export const parseSampleRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const sampleRates = {
  error: parseSampleRate(import.meta.env.VITE_SENTRY_ERROR_SAMPLE_RATE, 1.0),
  traces: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.3),
  profiles: parseSampleRate(import.meta.env.VITE_SENTRY_PROFILES_SAMPLE_RATE, 0.1),
  replaysSession: parseSampleRate(import.meta.env.VITE_SENTRY_REPLAYS_SAMPLE_RATE, 0.0),
  replaysOnError: parseSampleRate(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 1.0),
};

export const buildMonitorSlug = (service?: string) => {
  if (!monitorSlug && !service) return undefined;
  return [monitorSlug, service].filter(Boolean).join('.');
};
