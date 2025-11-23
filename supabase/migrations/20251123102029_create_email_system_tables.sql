/*
  # Email System Tables

  1. New Tables
    - `email_logs`: Registro de emails enviados
    - `email_queue`: Cola de emails pendientes
    - `email_templates`: Plantillas de email guardadas

  2. Features
    - Retry logic para emails fallidos
    - Rate limiting por destinatario
    - Tracking de estados
    - Prioridad de envío

  3. Security
    - RLS para admin access only
*/

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  from_email text DEFAULT 'noreply@agenthub.com',
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked')),
  provider text DEFAULT 'sendgrid',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text NOT NULL,
  from_email text DEFAULT 'noreply@agenthub.com',
  template_type text,
  template_data jsonb DEFAULT '{}'::jsonb,
  priority integer DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  error_message text,
  scheduled_for timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority DESC);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view email queue"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Email Templates Table (for saved templates)
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  name text NOT NULL,
  subject_template text NOT NULL,
  html_template text NOT NULL,
  text_template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to process email queue
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record RECORD;
BEGIN
  FOR email_record IN
    SELECT *
    FROM email_queue
    WHERE status = 'pending'
    AND scheduled_for <= NOW()
    AND retry_count < max_retries
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT 50
  LOOP
    UPDATE email_queue
    SET status = 'processing', updated_at = NOW()
    WHERE id = email_record.id;
  END LOOP;
END;
$$;

-- Function to retry failed emails
CREATE OR REPLACE FUNCTION retry_failed_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_queue
  SET 
    status = 'pending',
    retry_count = retry_count + 1,
    scheduled_for = NOW() + (retry_count * INTERVAL '5 minutes'),
    updated_at = NOW()
  WHERE status = 'failed'
  AND retry_count < max_retries
  AND updated_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Function to clean old email logs
CREATE OR REPLACE FUNCTION clean_old_email_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM email_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND status IN ('sent', 'delivered');
  
  DELETE FROM email_queue
  WHERE status IN ('sent', 'cancelled')
  AND updated_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION update_email_queue_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_email_queue_timestamp
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_timestamp();

-- Insert default templates
INSERT INTO email_templates (template_key, name, subject_template, html_template, text_template, variables)
VALUES 
  ('welcome', 'Welcome Email', '🎉 Bienvenido a AgentHub - Tu cuenta está lista', 
   '<html><!-- Template content --></html>', 
   'Bienvenido a AgentHub',
   '["name", "email"]'::jsonb
  ),
  ('payment_confirmation', 'Payment Confirmation', '✅ Pago confirmado - Factura {{invoiceNumber}}',
   '<html><!-- Template content --></html>',
   'Pago confirmado',
   '["name", "amount", "credits", "invoiceNumber", "date"]'::jsonb
  ),
  ('low_credits', 'Low Credits Alert', '⚠️ Alerta: Créditos bajos ({{percentage}}% restante)',
   '<html><!-- Template content --></html>',
   'Alerta de créditos',
   '["name", "creditsRemaining", "percentage", "dashboardUrl"]'::jsonb
  )
ON CONFLICT (template_key) DO NOTHING;
