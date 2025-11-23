export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug' | 'log';
export type UptimeStatus = 'up' | 'degraded' | 'down';

type SpanStatus = 'ok' | 'deadline_exceeded' | 'unauthenticated' | 'permission_denied' | 'not_found' | 'resource_exhausted' | 'cancelled' | 'invalid_argument' | 'already_exists' | 'failed_precondition' | 'aborted' | 'out_of_range' | 'unimplemented' | 'internal_error' | 'unavailable' | 'data_loss';

export interface TraceOptions {
  op?: string;
  tags?: Record<string, string>;
  data?: Record<string, unknown>;
  status?: SpanStatus;
}
