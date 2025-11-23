const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyRequest {
  token: string;
  action?: string;
}

const allowedActions = new Set(['signup', 'password_reset']);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!turnstileSecret) {
      throw new Error('Turnstile not configured');
    }

    const body: VerifyRequest = await req.json();

    if (!body || typeof body.token !== 'string' || body.token.trim().length < 10) {
      throw new Error('Invalid verification token');
    }

    if (body.action && !allowedActions.has(body.action)) {
      throw new Error('Unsupported verification action');
    }

    const formData = new FormData();
    formData.append('secret', turnstileSecret);
    formData.append('response', body.token);

    const ip = req.headers.get('CF-Connecting-IP');
    if (ip) {
      formData.append('remoteip', ip);
    }

    if (body.action) {
      formData.append('action', body.action);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Turnstile verification failed', { errors: result['error-codes'] });
      throw new Error('Captcha validation failed');
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
