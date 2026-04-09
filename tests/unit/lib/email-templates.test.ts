import { describe, it, expect } from 'vitest';
import {
  welcomeEmail,
  paymentConfirmationEmail,
  lowCreditsAlertEmail,
  subscriptionConfirmationEmail,
} from '../../../src/lib/email-templates';

describe('email-templates', () => {
  describe('welcomeEmail', () => {
    it('returns subject, html and text', () => {
      const result = welcomeEmail({ name: 'Ana', email: 'ana@example.com' });
      expect(result.subject).toBeTruthy();
      expect(result.html).toContain('Ana');
      expect(result.text).toContain('Ana');
    });

    it('subject includes welcome phrasing', () => {
      const result = welcomeEmail({ name: 'Test', email: 't@t.com' });
      expect(result.subject.toLowerCase()).toMatch(/bienvenid|welcome/);
    });

    it('html is valid DOCTYPE document', () => {
      const result = welcomeEmail({ name: 'X', email: 'x@x.com' });
      expect(result.html.trim()).toMatch(/^<!DOCTYPE html>/i);
    });

    it('includes dashboard link', () => {
      const result = welcomeEmail({ name: 'X', email: 'x@x.com' });
      expect(result.html).toContain('dashboard');
    });
  });

  describe('paymentConfirmationEmail', () => {
    const data = {
      name: 'Pedro',
      amount: 29.99,
      credits: 29.99,
      invoiceNumber: 'INV-2024-001',
      date: '2024-01-15',
    };

    it('returns all three fields', () => {
      const result = paymentConfirmationEmail(data);
      expect(result.subject).toBeTruthy();
      expect(result.html).toBeTruthy();
      expect(result.text).toBeTruthy();
    });

    it('html includes invoice number', () => {
      const result = paymentConfirmationEmail(data);
      expect(result.html).toContain('INV-2024-001');
      expect(result.text).toContain('INV-2024-001');
    });

    it('html includes formatted amount', () => {
      const result = paymentConfirmationEmail(data);
      expect(result.html).toContain('29.99');
    });

    it('includes invoice URL when provided', () => {
      const result = paymentConfirmationEmail({ ...data, invoiceUrl: 'https://example.com/invoice.pdf' });
      expect(result.html).toContain('https://example.com/invoice.pdf');
    });

    it('omits invoice link when URL not provided', () => {
      const result = paymentConfirmationEmail(data);
      expect(result.html).not.toContain('Descargar Factura');
    });
  });

  describe('lowCreditsAlertEmail', () => {
    it('shows urgency level based on percentage', () => {
      const critical = lowCreditsAlertEmail({ name: 'X', creditsRemaining: 0.5, percentage: 5, dashboardUrl: 'https://app.com' });
      expect(critical.html).toContain('crítico');

      const important = lowCreditsAlertEmail({ name: 'X', creditsRemaining: 5, percentage: 15, dashboardUrl: 'https://app.com' });
      expect(important.html).toContain('importante');
    });

    it('includes remaining credits in output', () => {
      const result = lowCreditsAlertEmail({ name: 'Test', creditsRemaining: 3.75, percentage: 18, dashboardUrl: 'https://app.com' });
      expect(result.html).toContain('3.75');
      expect(result.text).toContain('3.75');
    });

    it('includes dashboard URL for recharge', () => {
      const result = lowCreditsAlertEmail({ name: 'X', creditsRemaining: 1, percentage: 5, dashboardUrl: 'https://myapp.com' });
      expect(result.html).toContain('https://myapp.com');
    });
  });

  describe('subscriptionConfirmationEmail', () => {
    const data = {
      name: 'María',
      planName: 'Premium Ultra',
      amount: 99,
      nextBillingDate: '2024-02-15',
      dashboardUrl: 'https://app.com',
    };

    it('returns all fields', () => {
      const result = subscriptionConfirmationEmail(data);
      expect(result.subject).toBeTruthy();
      expect(result.html).toBeTruthy();
      expect(result.text).toBeTruthy();
    });

    it('includes plan name in output', () => {
      const result = subscriptionConfirmationEmail(data);
      expect(result.html).toContain('Premium Ultra');
      expect(result.text).toContain('Premium Ultra');
    });

    it('subject mentions plan name', () => {
      const result = subscriptionConfirmationEmail(data);
      expect(result.subject).toContain('Premium Ultra');
    });

    it('includes billing amount', () => {
      const result = subscriptionConfirmationEmail(data);
      expect(result.html).toContain('99.00');
    });
  });
});
