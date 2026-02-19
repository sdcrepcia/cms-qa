"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTED_QUESTIONS = [
  "What is the projected MA growth percentage for 2027?",
  "What changes are proposed to the CMS-HCC risk adjustment model?",
  "What are the proposed Part D benefit parameters for 2027?",
  "How are MA benchmarks and quality bonus payments calculated?",
];

type QAPair = {
  question: string;
  answer: string;
};

export default function AskForm() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (q?: string) => {
    const activeQuestion = q || question;
    if (!activeQuestion.trim()) return;

    setIsLoading(true);
    setQuestion("");

    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: activeQuestion }),
    });
    const data = await res.json();

    setHistory((prev) => [
      { question: activeQuestion, answer: data.answer },
      ...prev,
    ]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Input Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="flex flex-col gap-3"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ask a question about the 2027 Advance Notice..."
            className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-xl transition-colors"
          >
            {isLoading ? "Thinking..." : "Ask"}
          </button>
        </form>

        {/* Suggested Questions */}
        {history.length === 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
              Try asking
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(q)}
                  className="text-left text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      )}

      {/* Chat History */}
      {history.map((pair, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">
            Question
          </p>
          <p className="text-gray-900 dark:text-white font-medium mb-4">
            {pair.question}
          </p>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">
            Answer
          </p>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <ReactMarkdown>{pair.answer}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}
