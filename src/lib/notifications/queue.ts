import { CHANNEL_SENDERS } from './services';
import {
  DeliveryAttempt,
  NotificationChannel,
  NotificationJob,
  NotificationPriority,
  NotificationQueueSnapshot,
} from './types';

export class NotificationQueue {
  private jobs: NotificationJob[] = [];
  private processing: Set<string> = new Set();

  enqueue(job: Omit<NotificationJob, 'createdAt' | 'updatedAt' | 'status' | 'attempts'>) {
    const prepared: NotificationJob = {
      ...job,
      status: job.scheduledFor ? 'scheduled' : 'pending',
      attempts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobs.push(prepared);
    this.sortJobs();
  }

  get snapshot(): NotificationQueueSnapshot {
    const today = new Date().toDateString();
    const deliveredToday = this.jobs.filter(j =>
      j.status === 'delivered' && new Date(j.updatedAt).toDateString() === today
    ).length;

    const failedToday = this.jobs.filter(j =>
      j.status === 'failed' && new Date(j.updatedAt).toDateString() === today
    ).length;

    const retries = this.jobs.reduce((total, job) => total + Math.max(0, (job.attempts?.length || 0) - 1), 0);

    const pending = this.jobs.filter(j => j.status === 'pending');

    return {
      queued: pending.length,
      scheduled: this.jobs.filter(j => j.status === 'scheduled').length,
      processing: this.processing.size,
      deliveredToday,
      failedToday,
      retries,
      oldestPending: pending[0]?.createdAt,
    };
  }

  get pendingJobs() {
    return this.jobs.filter(job => job.status === 'pending' || job.status === 'scheduled');
  }

  get history() {
    return this.jobs.filter(job => job.status === 'delivered' || job.status === 'failed');
  }

  async processDueJobs() {
    const now = new Date();
    const dueJobs = this.jobs.filter(job => {
      if (job.status === 'delivered' || job.status === 'failed') return false;
      if (job.scheduledFor) {
        return new Date(job.scheduledFor) <= now;
      }
      return true;
    });

    for (const job of dueJobs) {
      await this.processJob(job);
    }
  }

  private async processJob(job: NotificationJob) {
    if (this.processing.has(job.id)) return;
    this.processing.add(job.id);

    if (job.scheduledFor) {
      job.status = 'scheduled';
      const scheduledAt = new Date(job.scheduledFor);
      if (scheduledAt > new Date()) {
        this.processing.delete(job.id);
        return;
      }
    }

    job.status = 'pending';
    job.updatedAt = new Date().toISOString();

    for (const channel of job.channels) {
      const attempt: DeliveryAttempt = {
        channel,
        attemptedAt: new Date().toISOString(),
        success: false,
      };

      const result = await CHANNEL_SENDERS[channel](job.template);
      attempt.success = result.success;
      attempt.errorMessage = result.errorMessage;
      job.attempts.push(attempt);

      if (!result.success) {
        await this.handleFailure(job, channel, result.errorMessage);
        break;
      }
    }

    if (job.attempts.every(a => a.success)) {
      job.status = 'delivered';
      job.updatedAt = new Date().toISOString();
    }

    this.processing.delete(job.id);
    this.sortJobs();
  }

  private async handleFailure(job: NotificationJob, channel: NotificationChannel, errorMessage?: string) {
    const maxRetries = job.maxRetries ?? 3;
    const attemptsForChannel = job.attempts.filter(a => a.channel === channel);

    if (attemptsForChannel.length < maxRetries) {
      job.status = 'retrying';
      job.updatedAt = new Date().toISOString();
      const delayMs = Math.pow(2, attemptsForChannel.length) * 500;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await this.processJob(job);
      return;
    }

    job.status = 'failed';
    job.updatedAt = new Date().toISOString();
    job.metadata = {
      ...job.metadata,
      lastError: errorMessage,
    };
  }

  private sortJobs() {
    const priorityWeight: Record<NotificationPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    this.jobs.sort((a, b) => {
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const dateA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : new Date(b.createdAt).getTime();

      return dateA - dateB;
    });
  }
}
