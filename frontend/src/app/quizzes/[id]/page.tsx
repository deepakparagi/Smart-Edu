"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { demoQuizResult, demoQuizzes } from "../../demo-data";

type Question = {
  question: string;
  options: string[];
  explanation: string;
  difficulty: string;
  source_reference: string;
  correctAnswer?: string;
};
type Quiz = { id: number; title: string; questions: Question[] };
type Result = {
  score: number;
  total: number;
  accuracyPercent: number;
  results: {
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    correct: boolean;
    explanation: string;
    sourceReference: string;
  }[];
  notice: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API}/quizzes/${id}`, { credentials: "include" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw Error("Could not load this quiz.");
      }
      const data = await response.json();
      setQuiz(data as Quiz);
      setAnswers(Array(data.questions.length).fill(""));
    } catch {
      setDemoMode(true);
      const found = demoQuizzes.find((q) => String(q.id) === String(id)) ?? demoQuizzes[0];
      setQuiz(found as unknown as Quiz);
      setAnswers(Array(found.questions.length).fill(""));
    }
  }, [id, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function submit() {
    if (!quiz) return;
    setBusy(true);
    setError("");
    try {
      if (demoMode) {
        const demoQuestions = quiz.questions.map((q) => ({
          ...q,
          correctAnswer: q.correctAnswer ?? q.options[0],
        }));
        setResult(demoQuizResult(demoQuestions, answers));
        return;
      }
      const response = await fetch(`${API}/quizzes/${id}/attempts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw Error(data.error || "Could not submit this quiz.");
      }
      setResult(data as Result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit this quiz.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="task-page">
      <header className="task-header">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">S</span> smart study
        </Link>
        <Link className="back-link" href="/quizzes">
          ← Back to quizzes
        </Link>
      </header>

      <section className="task-content">
        {demoMode && (
          <div className="demo-banner">
            <strong>Preview mode</strong>
            <span>Sample quiz. Submission will display an interactive preview score.</span>
          </div>
        )}

        <p className="eyebrow">Practice round</p>
        <h1>{quiz?.title ?? "Loading quiz..."}</h1>
        <p className="task-lead">
          Choose the best answer for each question. All questions are based on definitions in your uploaded notes.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}

        {result ? (
          <section>
            <div className="quiz-score">
              <div>
                <p className="eyebrow">Attempt complete</p>
                <strong>{result.score} / {result.total}</strong>
              </div>
              <div>
                <span>Accuracy: {result.accuracyPercent}%</span>
                <p className="notice">{result.notice}</p>
              </div>
            </div>

            <div className="section-title">
              <div>
                <p className="eyebrow">Review</p>
                <h2>Explanations</h2>
              </div>
            </div>

            {result.results.map((item, index) => (
              <fieldset className="question-card" key={index}>
                <legend>
                  <p className="eyebrow">Question {index + 1}</p>
                  <h2>{item.question}</h2>
                </legend>
                <p>
                  Your answer:{" "}
                  <strong className={item.correct ? "answer-good" : "answer-review"}>
                    {item.selectedAnswer || "(no answer)"}
                  </strong>
                </p>
                {!item.correct && (
                  <p>
                    Correct answer: <strong className="answer-good">{item.correctAnswer}</strong>
                  </p>
                )}
                <p className="question-explanation">{item.explanation}</p>
                <p className="question-source">Source: {item.sourceReference}</p>
              </fieldset>
            ))}

            <Link className="button primary" href="/quizzes" style={{ marginTop: "20px" }}>
              Back to quizzes
            </Link>
          </section>
        ) : (
          <>
            {quiz?.questions.map((question, index) => (
              <fieldset className="question-card" key={index}>
                <legend>
                  <p className="eyebrow">Question {index + 1} of {quiz.questions.length}</p>
                  <h2>{question.question}</h2>
                </legend>
                <div className="answer-options">
                  {question.options.map((option, optionIndex) => (
                    <label
                      className={`answer-option ${answers[index] === option ? "selected" : ""}`}
                      key={optionIndex}
                    >
                      <input
                        type="radio"
                        name={`q-${index}`}
                        value={option}
                        checked={answers[index] === option}
                        onChange={() => {
                          setAnswers((current) => {
                            const next = [...current];
                            next[index] = option;
                            return next;
                          });
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <p className="question-source">
                  Difficulty: {question.difficulty} | Reference: {question.source_reference}
                </p>
              </fieldset>
            ))}

            {quiz && (
              <button
                className="button primary"
                onClick={() => void submit()}
                disabled={busy}
                style={{ marginTop: "24px" }}
              >
                {busy ? "Submitting..." : "Submit quiz"}
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
