export type NotificationChannel = 'push' | 'email' | 'sms';

export type NotificationPriority = 'high' | 'medium' | 'low';

export type NotificationDeliveryStatus = 'pending' | 'scheduled' | 'delivered' | 'failed' | 'retrying';

export interface NotificationTemplate {
  subject: string;
  body: string;
  ctaUrl?: string;
}

export interface NotificationJob {
  id: string;
  userId?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  template: NotificationTemplate;
  metadata?: Record<string, unknown>;
  scheduledFor?: string;
  maxRetries?: number;
  status: NotificationDeliveryStatus;
  attempts: DeliveryAttempt[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAttempt {
  channel: NotificationChannel;
  attemptedAt: string;
  success: boolean;
  errorMessage?: string;
}

export interface NotificationPreferenceCategory {
  key: string;
  label: string;
  description: string;
}

export interface NotificationPreferenceChannelConfig {
  enabled: boolean;
  quietHours?: { start: string; end: string };
}

export interface NotificationPreference {
  category: string;
  channels: Record<NotificationChannel, NotificationPreferenceChannelConfig>;
  digest?: 'immediate' | 'hourly' | 'daily';
}

export interface NotificationQueueSnapshot {
  queued: number;
  scheduled: number;
  processing: number;
  deliveredToday: number;
  failedToday: number;
  retries: number;
  oldestPending?: string;
}
