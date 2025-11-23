import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@agenthub.com';

    if (!sendgridApiKey) {
      throw new Error('SendGrid not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing email queue...');

    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('retry_count', 3)
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!emails || emails.length === 0) {
      console.log('No emails to process');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No emails in queue' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`Found ${emails.length} emails to process`);

    let successCount = 0;
    let failureCount = 0;

    for (const email of emails) {
      await supabase
        .from('email_queue')
        .update({ status: 'processing' })
        .eq('id', email.id);

      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: email.to_email }],
                subject: email.subject,
              },
            ],
            from: {
              email: email.from_email || fromEmail,
              name: 'AgentHub',
            },
            content: [
              {
                type: 'text/html',
                value: email.html_content,
              },
              {
                type: 'text/plain',
                value: email.text_content,
              },
            ],
            reply_to: {
              email: 'support@agenthub.com',
              name: 'AgentHub Support',
            },
            tracking_settings: {
              click_tracking: { enable: true },
              open_tracking: { enable: true },
            },
          }),
        });

        if (response.ok) {
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          await supabase.from('email_logs').insert({
            to_email: email.to_email,
            from_email: email.from_email || fromEmail,
            subject: email.subject,
            status: 'sent',
            provider: 'sendgrid',
            sent_at: new Date().toISOString(),
            metadata: {
              template_type: email.template_type,
              queue_id: email.id,
            },
          });

          successCount++;
          console.log(`Email sent successfully to ${email.to_email}`);
        } else {
          const errorText = await response.text();
          throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error(`Failed to send email to ${email.to_email}:`, error);

        const retryCount = email.retry_count + 1;
        const maxRetries = email.max_retries || 3;

        if (retryCount >= maxRetries) {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              error_message: error.message,
              retry_count: retryCount,
            })
            .eq('id', email.id);

          await supabase.from('email_logs').insert({
            to_email: email.to_email,
            from_email: email.from_email || fromEmail,
            subject: email.subject,
            status: 'failed',
            provider: 'sendgrid',
            error_message: error.message,
            metadata: {
              template_type: email.template_type,
              queue_id: email.id,
              retry_count: retryCount,
            },
          });
        } else {
          const nextRetry = new Date();
          nextRetry.setMinutes(nextRetry.getMinutes() + (retryCount * 5));

          await supabase
            .from('email_queue')
            .update({
              status: 'pending',
              error_message: error.message,
              retry_count: retryCount,
              scheduled_for: nextRetry.toISOString(),
            })
            .eq('id', email.id);
        }

        failureCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Processing complete: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        processed: emails.length,
        success: successCount,
        failed: failureCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Queue processing error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
