import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Server-only: Node environment
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { question } = await req.json();

  if (!question) return new Response(JSON.stringify({ error: "Missing question" }), { status: 400 });

  try {
    const { data: matches, error } = await supabase.rpc("match_pdf_embeddings", {
      query_embedding: await getEmbedding(question),
      match_threshold: 0.1,
      match_count: 3
    });
    if (error) throw error;

    const context = matches.map((m: any) => m.text).join("\n---\n");
    const prompt = `You are a helpful assistant. Answer the question based on the context below:\n\n${context}\n\nQuestion: ${question}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    });

    return new Response(JSON.stringify({ answer: response.choices[0].message.content }), { status: 200 });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

async function getEmbedding(text: string) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text
  });
  return res.data[0].embedding;
}
