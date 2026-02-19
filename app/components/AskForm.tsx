"use client";

import { useState, useEffect } from "react";
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
  confidence: "high" | "medium" | "low";
  visible?: boolean;
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
      body: JSON.stringify({ question: activeQuestion, history }),
    });
    const data = await res.json();

    // Add with visible: false first, then flip to true for animation
    const newPair: QAPair = {
      question: activeQuestion,
      answer: data.answer,
      confidence: data.confidence,
      visible: false,
    };

    setHistory((prev) => [newPair, ...prev]);

    // Slight delay so React renders the hidden state first
    setTimeout(() => {
      setHistory((prev) =>
        prev.map((p, i) => (i === 0 ? { ...p, visible: true } : p))
      );
    }, 50);

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Input Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask a question about the 2027 Advance Notice..."
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? "Thinking..." : <>Ask <span>→</span></>}
          </button>
        </form>

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

      {/* Loading — animated bouncing dots */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-1.5">
          <span className="text-sm text-gray-400 mr-2">Thinking</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      {/* Chat History */}
      {history.map((pair, i) => (
        <div
          key={i}
          className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 border-l-4 transition-all duration-500 ease-out ${
            pair.confidence === "high"
              ? "border-l-green-400"
              : pair.confidence === "medium"
              ? "border-l-yellow-400"
              : "border-l-red-400"
          } ${
            pair.visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
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
          <span
            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${
              pair.confidence === "high"
                ? "bg-green-100 text-green-700"
                : pair.confidence === "medium"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {pair.confidence === "high"
              ? "● High confidence"
              : pair.confidence === "medium"
              ? "● Medium confidence"
              : "● Low confidence"}
          </span>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <ReactMarkdown>{pair.answer}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}
