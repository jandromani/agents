import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createEdgeHandler } from '../_shared/observability.ts';
import { chunkText, estimateTokens, extractTextContent } from './utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProcessDocumentRequest {
  documentId: string;
  content?: string;
  agentId?: string;
  fileType?: string;
  base64Content?: string;
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { documentId, content, agentId, fileType, base64Content }: ProcessDocumentRequest = await req.json();

    if (!documentId) {
      throw new Error('Missing required fields');
    }

    const { data: documentRecord, error: documentError } = await supabase
      .from('documents')
      .select('id, user_id, file_type, content_type, raw_content')
      .eq('id', documentId)
      .single();

    if (documentError || !documentRecord) {
      throw new Error('Document not found');
    }

    if (documentRecord.user_id !== user.id) {
      throw new Error('Unauthorized document access');
    }

    const extractedText = await extractTextContent({
      providedText: content,
      base64Payload: base64Content,
      storedRawContent: documentRecord.raw_content,
      fileType: fileType || documentRecord.content_type || documentRecord.file_type,
    });

    if (!extractedText || extractedText.length < 10) {
      throw new Error('No extractable text found in document');
    }

    await supabase
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    console.log('Chunking document...');
    const chunks = chunkText(extractedText, 1000, 200);
    console.log(`Created ${chunks.length} chunks`);

    let processedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: chunk,
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error('OpenAI error:', errorText);
          throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        const tokenCount = estimateTokens(chunk);

        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: documentId,
            agent_id: agentId,
            chunk_index: i,
            content: chunk,
            embedding: embedding,
            token_count: tokenCount,
            metadata: {
              position: i,
              total_chunks: chunks.length,
            },
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        processedChunks++;

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
        throw error;
      }
    }

    await supabase
      .from('documents')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        extracted_text: extractedText,
        chunk_count: processedChunks,
      })
      .eq('id', documentId);

    console.log(`Document processed successfully: ${processedChunks} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        chunksCreated: processedChunks,
        documentId: documentId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Document processing error:', error);

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
};

Deno.serve(createEdgeHandler({ feature: 'process-document', queueName: 'documents' }, handler));
