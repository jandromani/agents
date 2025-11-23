import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface SearchRequest {
  query: string;
  agentId: string;
  matchThreshold?: number;
  matchCount?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      query,
      agentId,
      matchThreshold = 0.7,
      matchCount = 5,
    }: SearchRequest = await req.json();

    if (!query || !agentId) {
      throw new Error('Missing required fields');
    }

    console.log(`Searching for: "${query}" in agent ${agentId}`);

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const { data: matches, error: searchError } = await supabase.rpc(
      'search_similar_chunks',
      {
        query_embedding: queryEmbedding,
        p_agent_id: agentId,
        match_threshold: matchThreshold,
        match_count: matchCount,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    const responseTime = Date.now() - startTime;

    console.log(`Found ${matches?.length || 0} relevant chunks in ${responseTime}ms`);

    await supabase.from('rag_queries').insert({
      agent_id: agentId,
      query: query,
      query_embedding: queryEmbedding,
      retrieved_chunks: matches || [],
      relevance_scores: (matches || []).map((m: any) => m.similarity),
      response_time_ms: responseTime,
    });

    const context = matches && matches.length > 0
      ? matches.map((m: any) => m.content).join('\n\n')
      : '';

    return new Response(
      JSON.stringify({
        success: true,
        context: context,
        matches: matches || [],
        responseTime: responseTime,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Semantic search error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        context: '',
        matches: [],
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
