import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createEdgeHandler } from '../_shared/observability.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !userData.user) {
      throw new Error('Unauthorized');
    }

    const { amount, description = 'Credit purchase' } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const platformFee = amount * 0.10;
    const userCredits = amount - platformFee;
    const newBalance = profile.credits + userCredits;

    await supabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('id', userData.user.id);

    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userData.user.id,
        amount: userCredits,
        transaction_type: 'purchase',
        description,
        balance_after: newBalance,
      });

    return new Response(
      JSON.stringify({
        success: true,
        newBalance,
        creditsAdded: userCredits,
        platformFee,
        message: 'Credits added successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

Deno.serve(createEdgeHandler({ feature: 'manage-credits', queueName: 'billing' }, handler));
