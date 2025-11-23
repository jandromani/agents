import { NotificationChannel, NotificationTemplate } from './types';

export interface DeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  errorMessage?: string;
}

const simulateNetworkDelay = async () => new Promise(resolve => setTimeout(resolve, 300));

export async function sendEmail(template: NotificationTemplate): Promise<DeliveryResult> {
  // Se usa el template para permitir trazabilidad y personalización futura
  const { subject } = template;
  await simulateNetworkDelay();
  const apiKey = import.meta.env.VITE_SENDGRID_KEY || 'missing-key';
  if (apiKey === 'missing-key') {
    return {
      channel: 'email',
      success: false,
      errorMessage: `SendGrid API key no configurada para ${subject}`,
    };
  }

  return {
    channel: 'email',
    success: true,
  };
}

export async function sendSMS(template: NotificationTemplate): Promise<DeliveryResult> {
  const { subject } = template;
  await simulateNetworkDelay();
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || 'missing-token';
  if (authToken === 'missing-token') {
    return {
      channel: 'sms',
      success: false,
      errorMessage: `Credenciales de Twilio no configuradas para ${subject}`,
    };
  }

  return {
    channel: 'sms',
    success: true,
  };
}

export async function sendPush(template: NotificationTemplate): Promise<DeliveryResult> {
  const { subject } = template;
  await simulateNetworkDelay();
  const missingSubject = !subject;
  return {
    channel: 'push',
    success: !missingSubject,
    errorMessage: missingSubject ? 'Falta asunto para la notificación push' : undefined,
  };
}

export const CHANNEL_SENDERS: Record<NotificationChannel, (template: NotificationTemplate) => Promise<DeliveryResult>> = {
  push: sendPush,
  email: sendEmail,
  sms: sendSMS,
};
