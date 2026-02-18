import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);
