import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationQueue } from '../../lib/notifications/queue';
import {
  NotificationChannel,
  NotificationJob,
  NotificationPriority,
  NotificationQueueSnapshot,
  NotificationTemplate,
} from '../../lib/notifications/types';

const buildId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface ScheduleNotificationInput {
  channels: NotificationChannel[];
  priority?: NotificationPriority;
  template: NotificationTemplate;
  scheduledFor?: string;
  maxRetries?: number;
}

export function useNotificationEngine(userId?: string) {
  const queue = useMemo(() => new NotificationQueue(), []);
  const [snapshot, setSnapshot] = useState<NotificationQueueSnapshot>(queue.snapshot);
  const [pending, setPending] = useState<NotificationJob[]>(queue.pendingJobs);
  const [history, setHistory] = useState<NotificationJob[]>(queue.history);

  const refresh = useCallback(() => {
    setSnapshot({ ...queue.snapshot });
    setPending([...queue.pendingJobs]);
    setHistory([...queue.history]);
  }, [queue]);

  const scheduleNotification = useCallback(
    (input: ScheduleNotificationInput) => {
      const job: Omit<NotificationJob, 'createdAt' | 'updatedAt' | 'status' | 'attempts'> = {
        id: buildId(),
        userId,
        channels: input.channels,
        priority: input.priority || 'medium',
        template: input.template,
        scheduledFor: input.scheduledFor,
        maxRetries: input.maxRetries ?? 3,
        metadata: {},
      };

      queue.enqueue(job);
      refresh();
      return job.id;
    },
    [queue, refresh, userId]
  );

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      if (!mounted) return;
      await queue.processDueJobs();
      refresh();
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [queue, refresh]);

  return {
    snapshot,
    pending,
    history,
    scheduleNotification,
  };
}
