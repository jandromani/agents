declare module '@sentry/react' {
  export interface BrowserOptions {
    dsn?: string;
    release?: string;
    environment?: string;
    tracesSampleRate?: number;
    integrations?: unknown[];
  }

  export function init(options: BrowserOptions): void;
  export function addBreadcrumb(breadcrumb: { message: string; data?: Record<string, unknown> }): void;
  export function captureException(error: unknown, context?: { extra?: Record<string, unknown> }): void;
}

declare module '@sentry/replay' {
  const Replay: unknown;
  export default Replay;
}
