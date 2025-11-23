import { captureException, logDebug } from './logging';
import { getSentryClient, sendToSentry } from './sentry';
import type { TraceOptions } from './types';

const markStatus = (status?: TraceOptions['status']) => status || 'ok';

export async function traceAsyncOperation<T>(name: string, handler: () => Promise<T>, options?: TraceOptions): Promise<T> {
  const clientPromise = getSentryClient();

  if (!clientPromise) {
    return handler();
  }

  const client = await clientPromise;
  if (!client) {
    return handler();
  }

  const transaction = client.startTransaction({
    name,
    op: options?.op || 'task',
    tags: options?.tags,
    data: options?.data,
  });

  client.configureScope((scope: any) => {
    scope.setSpan(transaction);
  });

  try {
    const result = await handler();
    transaction.setStatus(markStatus(options?.status));
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureException(error, { trace: name, ...options?.data });
    throw error;
  } finally {
    transaction.finish();
  }
}

export const annotateSpan = (label: string, data?: Record<string, unknown>) => {
  sendToSentry(client => {
    const scope = client.getCurrentHub?.().getScope?.();
    const span = scope?.getSpan?.();
    span?.setData?.(label, data || {});
    span?.setTag?.(label, 'true');
  });
  logDebug(`Anotación de span: ${label}`, data);
};
