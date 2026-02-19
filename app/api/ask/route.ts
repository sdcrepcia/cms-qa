import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { question, history = [] } = await req.json();

  // ----------------------------------------
  // #4 — Query Expansion
  // ----------------------------------------
  const expansionResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Medicare Advantage policy expert. Given a question, generate 3 alternative phrasings that capture the same intent but use different terminology. Return only a JSON array of strings, no explanation.`,
      },
      { role: 'user', content: question },
    ],
  });

  let expandedQuestions: string[] = [question];
  try {
    const parsed = JSON.parse(expansionResponse.choices[0].message.content || '[]');
    expandedQuestions = [question, ...parsed];
  } catch {
    // fallback to original question if parsing fails
  }

  // ----------------------------------------
  // Embed all expanded questions and search Supabase
  // ----------------------------------------
  const allChunks = new Map<string, number>(); // content → similarity score

  await Promise.all(
    expandedQuestions.map(async (q) => {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: q,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      const { data: chunks } = await supabase.rpc('match_pdf_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: 0.1,
        match_count: 8,
      });

      chunks?.forEach((chunk: any) => {
        if (!allChunks.has(chunk.content)) {
          allChunks.set(chunk.content, chunk.similarity);
        }
      });
    })
  );

  // Build context from deduplicated chunk content
  const context = Array.from(allChunks.keys()).join('\n\n');

  // #8 — Confidence score based on average similarity
  const similarities = Array.from(allChunks.values());
  const avgSimilarity = similarities.length
    ? similarities.reduce((a, b) => a + b, 0) / similarities.length
    : 0;
  const confidence =
    avgSimilarity > 0.5 ? 'high' : avgSimilarity > 0.3 ? 'medium' : 'low';

  // ----------------------------------------
  // #6 — Conversation Memory (last 3 pairs)
  // ----------------------------------------
  const memoryMessages = history.slice(-3).flatMap(
    (pair: { question: string; answer: string }) => [
      { role: 'user' as const, content: pair.question },
      { role: 'assistant' as const, content: pair.answer },
    ]
  );

  // ----------------------------------------
  // Generate answer
  // ----------------------------------------
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a helpful Medicare Advantage policy expert.
Answer questions using the context below.
For broad questions, summarize the most significant changes you can identify from the context.
Only say you don't know if the context is truly empty.

Format your responses clearly using:
- Short paragraphs for explanations
- Bullet points for lists of changes or items
- **Bold** for key terms or important figures
- Keep answers concise and scannable

Context:
${context}`,
      },
      ...memoryMessages,
      { role: 'user', content: question },
    ],
  });

  const answer = completion.choices[0].message.content;

  return Response.json({ answer, confidence });
}
