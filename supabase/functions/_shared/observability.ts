import * as Sentry from "npm:@sentry/deno@7.120.1";

interface EdgeObservabilityOptions {
  feature: string;
  queueName?: string;
  queueDepthHeader?: string;
}

interface MetricRecord {
  status: number;
  latencyMs: number;
  feature: string;
  queueName?: string;
  queueDepth?: number;
  error?: Error;
}

const parseSampleRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

let sentryInitialized = false;

export const initEdgeObservability = () => {
  if (sentryInitialized) return;

  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) {
    console.info('[Observability] Sentry deshabilitado en Edge (sin DSN)');
    return;
  }

  Sentry.init({
    dsn,
    environment: Deno.env.get('ENVIRONMENT') || Deno.env.get('MODE') || Deno.env.get('NODE_ENV') || 'development',
    tracesSampleRate: parseSampleRate(Deno.env.get('SENTRY_TRACES_SAMPLE_RATE'), 0.2),
    profilesSampleRate: parseSampleRate(Deno.env.get('SENTRY_PROFILES_SAMPLE_RATE'), 0.05),
    sampleRate: parseSampleRate(Deno.env.get('SENTRY_ERROR_SAMPLE_RATE'), 0.5),
    release: Deno.env.get('RELEASE'),
    debug: Deno.env.get('SENTRY_DEBUG') === 'true',
    integrations: (integrations) => integrations,
  });

  sentryInitialized = true;
};

const getQueueDepth = (req: Request, headerName?: string) => {
  const header = headerName ? req.headers.get(headerName) : null;
  const queueDepthHeader = header || req.headers.get('x-queue-depth');
  const depth = queueDepthHeader ? Number(queueDepthHeader) : Number.NaN;
  return Number.isFinite(depth) ? depth : undefined;
};

const pushGatewayUrl = Deno.env.get('PROM_PUSHGATEWAY_URL');

const pushMetrics = async (metric: MetricRecord) => {
  const job = metric.feature.replace(/[^a-zA-Z0-9_]/g, '_');
  const instance = Deno.env.get('HOSTNAME') || 'edge-function';
  const labels = `feature=\"${metric.feature}\"` + (metric.queueName ? `,queue=\"${metric.queueName}\"` : '');
  const errorFlag = metric.status >= 500 || !!metric.error ? 1 : 0;
  const payload = [
    `edge_latency_ms{${labels},status=\"${metric.status}\",instance=\"${instance}\"} ${metric.latencyMs.toFixed(2)}`,
    `edge_failure_total{${labels},instance=\"${instance}\"} ${errorFlag}`,
    metric.queueDepth !== undefined
      ? `edge_queue_depth{${labels},instance=\"${instance}\"} ${metric.queueDepth}`
      : null,
  ].filter(Boolean).join('\n');

  console.log('[metrics]', payload);

  if (!pushGatewayUrl) return;

  try {
    await fetch(`${pushGatewayUrl}/metrics/job/${job}/instance/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    });
  } catch (error) {
    console.error('[Observability] No se pudo enviar métricas a Pushgateway', error);
  }
};

const recordWithSentry = (metric: MetricRecord) => {
  if (!sentryInitialized) return;

  const scopeCallback = (scope: Sentry.Scope) => {
    scope.setTag('feature', metric.feature);
    if (metric.queueName) scope.setTag('queue', metric.queueName);
    scope.setExtra('latency_ms', metric.latencyMs);
    scope.setExtra('status', metric.status);
    if (metric.queueDepth !== undefined) scope.setExtra('queue_depth', metric.queueDepth);
    return scope;
  };

  if (metric.error) {
    Sentry.captureException(metric.error, scope => {
      scopeCallback(scope);
      return scope;
    });
  } else {
    Sentry.addBreadcrumb({
      category: 'edge.metrics',
      message: 'Edge request processed',
      level: 'info',
      data: {
        status: metric.status,
        latencyMs: metric.latencyMs,
        queueDepth: metric.queueDepth,
        queue: metric.queueName,
      },
    });
  }
};

export const createEdgeHandler = (
  options: EdgeObservabilityOptions,
  handler: (req: Request) => Promise<Response>,
) => {
  initEdgeObservability();

  return async (req: Request) => {
    const start = performance.now();
    const queueDepth = getQueueDepth(req, options.queueDepthHeader);
    try {
      const response = await handler(req);
      const latencyMs = performance.now() - start;
      const metric: MetricRecord = {
        feature: options.feature,
        queueName: options.queueName,
        status: response.status,
        latencyMs,
        queueDepth,
      };
      await pushMetrics(metric);
      recordWithSentry(metric);
      return response;
    } catch (error) {
      const latencyMs = performance.now() - start;
      const metric: MetricRecord = {
        feature: options.feature,
        queueName: options.queueName,
        status: 500,
        latencyMs,
        queueDepth,
        error: error as Error,
      };
      await pushMetrics(metric);
      recordWithSentry(metric);
      const fallbackResponse = new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
      return fallbackResponse;
    }
  };
};

export const captureEdgeException = (error: unknown, feature: string, queueName?: string) => {
  if (!sentryInitialized) return;

  Sentry.captureException(error, scope => {
    scope.setTag('feature', feature);
    if (queueName) scope.setTag('queue', queueName);
    return scope;
  });
};
