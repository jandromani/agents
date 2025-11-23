export type NotificationChannel = 'email' | 'push' | 'sms' | 'inapp';

export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface NotificationPayload {
  id: string;
  userId: string;
  channel: NotificationChannel;
  template: string;
  data: Record<string, string | number | boolean | null>;
  messageKey?: string; // idempotency key
  attempt?: number;
  scheduledAt?: number;
}

export interface DeliveryEvent {
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerMessageId?: string;
  deliveredAt?: number;
  error?: string;
}

export interface NotificationAnalytics {
  totalQueued: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  perChannel: Record<NotificationChannel, number>;
}

export class NotificationService {
  private readonly queue: NotificationPayload[] = [];
  private readonly events: DeliveryEvent[] = [];
  private readonly dedupeKeys = new Set<string>();

  enqueue(payload: NotificationPayload) {
    const key = payload.messageKey ?? `${payload.userId}-${payload.template}-${payload.channel}`;
    if (this.dedupeKeys.has(key)) return;

    this.dedupeKeys.add(key);
    this.queue.push({ ...payload, attempt: (payload.attempt ?? 0) + 1 });
  }

  next(): NotificationPayload | undefined {
    return this.queue.shift();
  }

  recordEvent(event: DeliveryEvent) {
    this.events.push({ ...event, deliveredAt: event.deliveredAt ?? Date.now() });
  }

  analytics(): NotificationAnalytics {
    const perChannel: Record<NotificationChannel, number> = {
      email: 0,
      push: 0,
      sms: 0,
      inapp: 0,
    };

    let totalQueued = 0;
    let totalSent = 0;
    let totalDelivered = 0;
    let totalFailed = 0;

    this.events.forEach((event) => {
      perChannel[event.channel] += 1;
      if (event.status === 'queued') totalQueued += 1;
      if (event.status === 'sent') totalSent += 1;
      if (event.status === 'delivered') totalDelivered += 1;
      if (event.status === 'failed') totalFailed += 1;
    });

    return { totalQueued, totalSent, totalDelivered, totalFailed, perChannel };
  }
}

export const notificationService = new NotificationService();
