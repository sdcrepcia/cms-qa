// loadPdf.js
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { extractText, getDocumentProxy } from "unpdf";

// ---------------------------
// 1️⃣ Load environment variables
// ---------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env.local") });

// Check required env vars
const requiredEnv = [
  "OPENAI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
}

// ---------------------------
// 2️⃣ Initialize OpenAI and Supabase (service role key bypasses RLS)
// ---------------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // bypasses RLS
);

// ---------------------------
// 3️⃣ Load PDF and extract text
// ---------------------------
async function loadPdf(filePath) {
  console.log("📄 Reading PDF...");
  const buffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(buffer);

  console.log("🔹 Parsing PDF with unpdf...");
  const pdf = await getDocumentProxy(uint8Array);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  console.log(`✅ Extracted ${totalPages} pages`);
  return text;
}

// ---------------------------
// 4️⃣ Chunk text
// ---------------------------
function chunkText(text, chunkSize = 1000) {
  const regex = new RegExp(`(.|[\r\n]){1,${chunkSize}}`, "g");
  const chunks = text.match(regex) || [];
  console.log(`📊 Split text into ${chunks.length} chunks`);
  return chunks;
}

// ---------------------------
// 5️⃣ Embed chunks and save to Supabase
// ---------------------------
async function embedAndSave(chunks) {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error } = await supabase
        .from("pdf_embeddings")
        .insert([{ content: chunk, embedding }]);

      if (error) throw error;

      console.log(`✅ Embedded chunk ${i + 1} / ${chunks.length}`);
    } catch (err) {
      console.error(`❌ Error embedding chunk ${i + 1}:`, err);
    }
  }
}

// ---------------------------
// 6️⃣ Main function
// ---------------------------
async function main() {
  const text = await loadPdf("./cms.pdf");
  const chunks = chunkText(text, 1000);
  await embedAndSave(chunks);
  console.log("🎉 All chunks embedded and saved to Supabase!");
}

// Run
main();
