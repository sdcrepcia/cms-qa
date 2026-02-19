import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { question } = await req.json();

  // 1. Embed the question
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: question,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // 2. Find matching chunks from Supabase
  const { data: chunks, error } = await supabase.rpc('match_pdf_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) throw new Error(error.message);

  // 3. Build context from matched chunks
  const context = chunks?.map((c: any) => c.content).join('\n\n') ?? '';

  // 4. Ask OpenAI with context
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
  role: 'system',
  content: `You are a helpful Medicare Advantage policy expert. 
  Answer questions using the context below. 
  For broad questions, summarize the most significant changes you can identify from the context. 
  Only say you don't know if the context is truly empty.
  
  Context:
  ${context}`
},
    ],
  });

  const answer = completion.choices[0].message.content;

  return Response.json({ answer });
}
