export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface WelcomeEmailData {
  name: string;
  email: string;
}

interface PaymentConfirmationData {
  name: string;
  amount: number;
  credits: number;
  invoiceNumber: string;
  invoiceUrl?: string;
  date: string;
}

interface LowCreditsAlertData {
  name: string;
  creditsRemaining: number;
  percentage: number;
  dashboardUrl: string;
}

interface SubscriptionData {
  name: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
  dashboardUrl: string;
}

const emailStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1e293b;
      font-size: 24px;
      margin: 0 0 20px 0;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #64748b;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .stats-box {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .stats-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .stats-row:last-child {
      border-bottom: none;
    }
    .stats-label {
      color: #64748b;
      font-weight: 500;
    }
    .stats-value {
      color: #1e293b;
      font-weight: 700;
    }
    .alert-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .success-box {
      background: #f0fdf4;
      border-left: 4px solid #22c55e;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
    }
    .footer a {
      color: #06b6d4;
      text-decoration: none;
    }
  </style>
`;

export function welcomeEmail(data: WelcomeEmailData): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🤖 Bienvenido a AgentHub</h1>
        </div>
        <div class="content">
          <h2>¡Hola ${data.name}!</h2>
          <p>Estamos encantados de tenerte con nosotros. AgentHub te permite crear y desplegar agentes de IA personalizados en minutos, sin necesidad de programar.</p>

          <div class="success-box">
            <p style="margin: 0; color: #166534; font-weight: 600;">✓ Tu cuenta ha sido creada exitosamente</p>
          </div>

          <p><strong>¿Qué puedes hacer ahora?</strong></p>
          <ul style="color: #64748b; padding-left: 20px;">
            <li>Crear tu primer agente IA en 3 pasos simples</li>
            <li>Subir documentos para entrenar tu agente</li>
            <li>Desplegarlo y probarlo en tiempo real</li>
            <li>Gestionar consultas y estadísticas desde el dashboard</li>
          </ul>

          <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/dashboard" class="button">
            Ir al Dashboard
          </a>

          <p style="margin-top: 30px; font-size: 14px; color: #94a3b8;">
            Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:support@agenthub.com">support@agenthub.com</a>
          </p>
        </div>
        <div class="footer">
          <p>AgentHub - Agentes IA Personalizados</p>
          <p>
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/help">Centro de Ayuda</a> •
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/privacy">Privacidad</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Bienvenido a AgentHub

¡Hola ${data.name}!

Estamos encantados de tenerte con nosotros. AgentHub te permite crear y desplegar agentes de IA personalizados en minutos.

Tu cuenta ha sido creada exitosamente.

¿Qué puedes hacer ahora?
- Crear tu primer agente IA
- Subir documentos para entrenar tu agente
- Desplegarlo y probarlo en tiempo real
- Gestionar consultas y estadísticas

Visita tu dashboard: ${process.env.VITE_APP_URL || 'https://agenthub.com'}/dashboard

¿Preguntas? Escríbenos a support@agenthub.com

AgentHub - Agentes IA Personalizados
  `;

  return {
    subject: '🎉 Bienvenido a AgentHub - Tu cuenta está lista',
    html,
    text,
  };
}

export function paymentConfirmationEmail(data: PaymentConfirmationData): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Pago Confirmado</h1>
        </div>
        <div class="content">
          <h2>¡Gracias ${data.name}!</h2>
          <p>Tu pago ha sido procesado exitosamente. Los créditos han sido añadidos a tu cuenta y ya puedes usarlos.</p>

          <div class="success-box">
            <p style="margin: 0; color: #166534; font-weight: 600;">✓ Pago procesado correctamente</p>
          </div>

          <div class="stats-box">
            <div class="stats-row">
              <span class="stats-label">Monto pagado:</span>
              <span class="stats-value">€${data.amount.toFixed(2)}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">Créditos añadidos:</span>
              <span class="stats-value">€${data.credits.toFixed(2)}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">Número de factura:</span>
              <span class="stats-value">${data.invoiceNumber}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">Fecha:</span>
              <span class="stats-value">${data.date}</span>
            </div>
          </div>

          ${data.invoiceUrl ? `
            <a href="${data.invoiceUrl}" class="button">
              Descargar Factura (PDF)
            </a>
          ` : ''}

          <p style="margin-top: 30px;">
            Los créditos ya están disponibles en tu cuenta y puedes comenzar a usar tus agentes inmediatamente.
          </p>

          <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/dashboard" class="button">
            Ver Dashboard
          </a>
        </div>
        <div class="footer">
          <p>AgentHub - Agentes IA Personalizados</p>
          <p>
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/billing">Facturación</a> •
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/help">Ayuda</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Pago Confirmado

¡Gracias ${data.name}!

Tu pago ha sido procesado exitosamente.

Detalles:
- Monto pagado: €${data.amount.toFixed(2)}
- Créditos añadidos: €${data.credits.toFixed(2)}
- Factura: ${data.invoiceNumber}
- Fecha: ${data.date}

${data.invoiceUrl ? `Descarga tu factura: ${data.invoiceUrl}` : ''}

Los créditos ya están disponibles en tu cuenta.

Dashboard: ${process.env.VITE_APP_URL || 'https://agenthub.com'}/dashboard

AgentHub
  `;

  return {
    subject: `✅ Pago confirmado - Factura ${data.invoiceNumber}`,
    html,
    text,
  };
}

export function lowCreditsAlertEmail(data: LowCreditsAlertData): EmailTemplate {
  const urgency = data.percentage <= 10 ? 'crítico' : 'importante';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Alerta de Créditos</h1>
        </div>
        <div class="content">
          <h2>Hola ${data.name}</h2>
          <p>Tus créditos están bajos y es momento de recargar para que tus agentes sigan funcionando sin interrupciones.</p>

          <div class="alert-box">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">
              ⚠️ Nivel ${urgency}: Solo quedan €${data.creditsRemaining.toFixed(2)} (${data.percentage}%)
            </p>
          </div>

          <p><strong>¿Qué sucede si se agotan los créditos?</strong></p>
          <ul style="color: #64748b; padding-left: 20px;">
            <li>Tus agentes dejarán de responder consultas</li>
            <li>Los usuarios recibirán mensajes de error</li>
            <li>Perderás oportunidades de negocio</li>
          </ul>

          <p style="margin-top: 24px; font-weight: 600; color: #1e293b;">
            Recarga ahora y mantén tus agentes activos 24/7
          </p>

          <a href="${data.dashboardUrl}/billing" class="button">
            Recargar Créditos
          </a>

          <p style="margin-top: 30px; font-size: 14px; color: #94a3b8;">
            Consejo: Configura una recarga automática para no preocuparte por quedarte sin créditos.
          </p>
        </div>
        <div class="footer">
          <p>AgentHub - Agentes IA Personalizados</p>
          <p>
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/settings">Configuración</a> •
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/help">Ayuda</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Alerta de Créditos

Hola ${data.name}

Tus créditos están bajos: €${data.creditsRemaining.toFixed(2)} (${data.percentage}%)

Si se agotan los créditos:
- Tus agentes dejarán de funcionar
- Los usuarios recibirán errores
- Perderás oportunidades

Recarga ahora: ${data.dashboardUrl}/billing

AgentHub
  `;

  return {
    subject: `⚠️ Alerta: Créditos bajos (${data.percentage}% restante)`,
    html,
    text,
  };
}

export function subscriptionConfirmationEmail(data: SubscriptionData): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Suscripción Activada</h1>
        </div>
        <div class="content">
          <h2>¡Bienvenido ${data.name}!</h2>
          <p>Tu suscripción a <strong>${data.planName}</strong> ha sido activada exitosamente. Ahora tienes acceso completo a todas las funcionalidades de tu plan.</p>

          <div class="success-box">
            <p style="margin: 0; color: #166534; font-weight: 600;">✓ Suscripción activa</p>
          </div>

          <div class="stats-box">
            <div class="stats-row">
              <span class="stats-label">Plan:</span>
              <span class="stats-value">${data.planName}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">Precio:</span>
              <span class="stats-value">€${data.amount.toFixed(2)}/mes</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">Próxima facturación:</span>
              <span class="stats-value">${data.nextBillingDate}</span>
            </div>
          </div>

          <p><strong>Beneficios incluidos:</strong></p>
          <ul style="color: #64748b; padding-left: 20px;">
            <li>Agentes ilimitados (según tu plan)</li>
            <li>Modelos AI avanzados</li>
            <li>RAG con documentos ilimitados</li>
            <li>Soporte prioritario</li>
            <li>Estadísticas detalladas</li>
          </ul>

          <a href="${data.dashboardUrl}" class="button">
            Explorar Dashboard
          </a>

          <p style="margin-top: 30px; font-size: 14px; color: #94a3b8;">
            Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta.
          </p>
        </div>
        <div class="footer">
          <p>AgentHub - Agentes IA Personalizados</p>
          <p>
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/billing">Facturación</a> •
            <a href="${process.env.VITE_APP_URL || 'https://agenthub.com'}/help">Ayuda</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Suscripción Activada

¡Bienvenido ${data.name}!

Tu suscripción a ${data.planName} está activa.

Detalles:
- Plan: ${data.planName}
- Precio: €${data.amount.toFixed(2)}/mes
- Próxima facturación: ${data.nextBillingDate}

Beneficios incluidos:
- Agentes ilimitados
- Modelos AI avanzados
- RAG ilimitado
- Soporte prioritario

Dashboard: ${data.dashboardUrl}

AgentHub
  `;

  return {
    subject: `🎉 ¡Suscripción ${data.planName} activada!`,
    html,
    text,
  };
}
