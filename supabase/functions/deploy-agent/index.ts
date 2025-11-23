import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AgentConfig {
  id: string;
  user_id: string;
  name: string;
  description: string;
  model: string;
  knowledge_base: {
    context: string;
    faq: Array<{ question: string; answer: string }>;
  };
  documents: any[];
  config: any;
}

Deno.serve(async (req: Request) => {
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

    const { agentId } = await req.json();

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', userData.user.id)
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

    const workerCode = generateWorkerCode(agent, profile);
    const workerMetadata = {
      agentId: agent.id,
      userId: agent.user_id,
      planType: profile.plan_type,
      generatedAt: new Date().toISOString(),
    };

    const deploymentResult = await deployToCloudflare(agent.id, workerCode, workerMetadata);

    if (!deploymentResult.success) {
      throw new Error(deploymentResult.error || 'Deployment failed');
    }

    await supabase
      .from('agents')
      .update({
        status: 'active',
        worker_url: deploymentResult.workerUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    return new Response(
      JSON.stringify({
        success: true,
        workerUrl: deploymentResult.workerUrl,
        message: 'Agent deployed successfully',
        metadata: workerMetadata,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Deploy error:', error);
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
});

function generateWorkerCode(agent: AgentConfig, profile: any): string {
  const faqContext = agent.knowledge_base.faq
    .map(f => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  const documentsContext = agent.documents
    .map(doc => `Document: ${doc.name}\nContent: ${doc.content || '[File content]'}`)
    .join('\n\n');

  const fullContext = `
${agent.knowledge_base.context}

--- FAQ ---
${faqContext}

--- Documents ---
${documentsContext}
  `.trim();

  return `
// Auto-generated Cloudflare Worker for Agent: ${agent.name}
// Generated: ${new Date().toISOString()}
// Agent ID: ${agent.id}
// User Plan: ${profile.plan_type}

const AGENT_CONFIG = {
  id: '${agent.id}',
  name: '${agent.name.replace(/'/g, "\\'")  }',
  model: '${agent.model}',
  userId: '${agent.user_id}',
  planType: '${profile.plan_type}',
};

const SUPABASE_URL = '${Deno.env.get('SUPABASE_URL')}';
const TRACKING_ENDPOINT = SUPABASE_URL + '/functions/v1/track-usage';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    try {
      const { query, userId } = await request.json();

      if (!query || typeof query !== 'string') {
        throw new Error('Invalid query');
      }

      const systemPrompt = \`You are an AI assistant named ${agent.name}. ${agent.description || ''}

Your knowledge base:
${fullContext}

You must answer questions based on this knowledge. If you don't know something, say so clearly. Be helpful, concise and professional.\`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ];

      const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${env.OPENROUTER_API_KEY}\`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agenthub.app',
          'X-Title': 'AgentHub',
        },
        body: JSON.stringify({
          model: AGENT_CONFIG.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!openRouterResponse.ok) {
        const errorData = await openRouterResponse.text();
        console.error('OpenRouter error:', errorData);
        throw new Error('AI service unavailable');
      }

      const data = await openRouterResponse.json();
      const answer = data.choices?.[0]?.message?.content || 'No response generated';
      const tokensUsed = data.usage?.total_tokens || 0;

      try {
        await fetch(TRACKING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            agentId: AGENT_CONFIG.id,
            queryText: query,
            responseText: answer,
            tokensUsed: tokensUsed,
            model: AGENT_CONFIG.model,
          }),
        });
      } catch (trackError) {
        console.error('Tracking error:', trackError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          answer: answer,
          tokens: tokensUsed,
          agentName: AGENT_CONFIG.name,
          model: AGENT_CONFIG.model,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Agent error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Internal server error',
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
  },
};
  `;
}

async function deployToCloudflare(
  agentId: string,
  workerCode: string,
  metadata: any
): Promise<{ success: boolean; workerUrl?: string; error?: string }> {
  const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const cloudflareApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');

  if (!cloudflareAccountId || !cloudflareApiToken) {
    console.warn('Cloudflare credentials not configured, simulating deployment');
    const simulatedUrl = `https://agent-${agentId.substring(0, 8)}.agenthub.workers.dev`;
    return {
      success: true,
      workerUrl: simulatedUrl,
    };
  }

  try {
    const workerName = `agent-${agentId.substring(0, 16).replace(/-/g, '')}`;

    const formData = new FormData();
    
    const metadataBlob = new Blob(
      [
        JSON.stringify({
          main_module: 'index.js',
          compatibility_date: '2024-01-01',
          ...metadata,
        }),
      ],
      { type: 'application/json' }
    );
    formData.append('metadata', metadataBlob);

    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    formData.append('index.js', workerBlob);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/workers/scripts/${workerName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Cloudflare API error:', result);
      throw new Error(result.errors?.[0]?.message || 'Deployment failed');
    }

    const workerUrl = `https://${workerName}.${cloudflareAccountId}.workers.dev`;

    return {
      success: true,
      workerUrl,
    };
  } catch (error) {
    console.error('Deployment error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
