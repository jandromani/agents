import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createEdgeHandler } from '../_shared/observability.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MODEL_COSTS = {
  'gpt-3.5-turbo': 0.001,
  'gpt-4': 0.03,
  'gpt-4-turbo': 0.01,
  'claude-instant-1': 0.0008,
  'claude-2': 0.008,
  'claude-3-opus': 0.015,
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

    const { agentId, queryText, responseText, tokensUsed, model } = await req.json();

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const creditsConsumed = (MODEL_COSTS[model as keyof typeof MODEL_COSTS] || 0.001) * (tokensUsed / 1000);

    if (profile.plan_type === 'free') {
      const today = new Date().toISOString().split('T')[0];
      if (agent.last_query_date === today && agent.daily_query_count >= 5) {
        throw new Error('Daily query limit reached');
      }

      await supabase
        .from('agents')
        .update({
          daily_query_count: agent.last_query_date === today ? agent.daily_query_count + 1 : 1,
          last_query_date: today,
          total_queries: agent.total_queries + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', agentId);
    } else if (profile.plan_type === 'premium_ultra') {
      if (profile.credits < creditsConsumed) {
        throw new Error('Insufficient credits');
      }

      const newBalance = profile.credits - creditsConsumed;

      await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', userData.user.id);

      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userData.user.id,
          amount: -creditsConsumed,
          transaction_type: 'usage',
          description: `Query on agent ${agent.name}`,
          balance_after: newBalance,
        });

      if (newBalance <= profile.credits * 0.25 && profile.credits * 0.25 > 0) {
        const thresholds = [0.25, 0.10, 0.05];
        const oldBalance = profile.credits;
        
        for (const threshold of thresholds) {
          if (newBalance <= profile.credits * threshold && oldBalance > profile.credits * threshold) {
            await supabase
              .from('notifications')
              .insert({
                user_id: userData.user.id,
                type: 'credit_low',
                title: 'Créditos bajos',
                message: `Te quedan solo ${(threshold * 100).toFixed(0)}% de tus créditos. Considera recargar para continuar usando tus agentes.`,
                read: false,
              });
          }
        }
      }

      await supabase
        .from('agents')
        .update({
          total_queries: agent.total_queries + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', agentId);
    } else {
      await supabase
        .from('agents')
        .update({
          total_queries: agent.total_queries + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', agentId);
    }

    await supabase
      .from('usage_logs')
      .insert({
        agent_id: agentId,
        user_id: userData.user.id,
        query_text: queryText,
        response_text: responseText,
        tokens_used: tokensUsed,
        credits_consumed: creditsConsumed,
        model_used: model,
      });

    return new Response(
      JSON.stringify({
        success: true,
        creditsConsumed,
        remainingCredits: profile.plan_type === 'premium_ultra' ? profile.credits - creditsConsumed : null,
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

Deno.serve(createEdgeHandler({ feature: 'track-usage', queueName: 'usage' }, handler));
