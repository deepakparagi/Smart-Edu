"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Award,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle,
  Check,
  Clock,
} from "lucide-react";
import { demoQuizResult, demoQuizzes } from "../../demo-data";
import { Navbar } from "../../navbar";

type Question = {
  question: string;
  options: string[];
  explanation: string;
  difficulty: string;
  source_reference: string;
  correctAnswer?: string;
  answer?: string;
};

type Quiz = {
  id: number;
  title: string;
  questions: Question[];
  createdAt?: string;
};

type ResultItem = {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
  sourceReference: string;
};

type Result = {
  score: number;
  total: number;
  accuracyPercent: number;
  results: ResultItem[];
  notice?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuizDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`${API}/quizzes/${id}`, { credentials: "include" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw new Error("Could not load this quiz from backend.");
      }
      const data = await response.json();
      setQuiz(data as Quiz);
      setAnswers(Array(data.questions?.length || 0).fill(""));
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
          correctAnswer: q.correctAnswer ?? q.answer ?? q.options[0],
        }));
        setResult(demoQuizResult(demoQuestions, answers));
        window.scrollTo({ top: 0, behavior: "smooth" });
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
        throw new Error(data.error || "Could not submit this quiz attempt.");
      }
      setResult(data as Result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit this quiz.");
    } finally {
      setBusy(false);
    }
  }

  function handleRetake() {
    if (!quiz) return;
    setAnswers(Array(quiz.questions.length).fill(""));
    setResult(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const answeredCount = answers.filter((a) => a.trim() !== "").length;
  const totalCount = quiz?.questions.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <>
      <Navbar
        customRightAction={
          <Link
            className="back-link"
            href="/quizzes"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <ArrowLeft size={13} /> Back to quizzes
          </Link>
        }
      />
      <main className="task-page" style={{ maxWidth: "1000px", margin: "0 auto", padding: "28px 20px 80px" }}>

      {/* Main Content */}
      <section className="task-content" style={{ padding: 0 }}>
        {demoMode && (
          <div
            className="demo-banner"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 16px",
              borderRadius: "10px",
              background: "rgba(196, 255, 106, 0.08)",
              border: "1px solid rgba(196, 255, 106, 0.25)",
              color: "var(--paper)",
              fontSize: "12px",
              marginBottom: "24px",
            }}
          >
            <strong style={{ color: "var(--lime)", fontSize: "11px", letterSpacing: "0.1em" }}>PREVIEW MODE</strong>
            <span style={{ color: "var(--mist)" }}>Sample interactive quiz round. Scores and explanations are calculated locally.</span>
          </div>
        )}

        {/* Title & Metadata Banner */}
        <div style={{ marginBottom: "28px" }}>
          <p className="eyebrow" style={{ color: "var(--mint)", marginBottom: "6px" }}>
            <Sparkles size={13} style={{ display: "inline", marginRight: "6px" }} />
            Active Recall &amp; Assessment
          </p>
          <h1
            style={{
              fontSize: "34px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: "6px 0 10px",
              color: "var(--paper)",
            }}
          >
            {quiz?.title ?? "Loading practice quiz..."}
          </h1>
          <p style={{ color: "var(--mist)", fontSize: "14px", margin: 0, maxWidth: "680px", lineHeight: 1.6 }}>
            Select the best option for each question. AI-powered evaluation provides instant accuracy grading and detailed concept explanations.
          </p>
        </div>

        {error && <p className="form-error" role="alert" style={{ marginBottom: "24px" }}>{error}</p>}

        {/* ===================== VIEW 1: RESULTS VIEW ===================== */}
        {result ? (
          <section className="results-view" style={{ animation: "rise-in 0.4s ease both" }}>
            {/* Scorecard Hero Banner */}
            <div
              className="glass-panel"
              style={{
                padding: "32px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, rgba(30, 68, 48, 0.8), rgba(6, 17, 12, 0.95))",
                border: "1px solid rgba(196, 255, 106, 0.35)",
                boxShadow: "var(--shadow)",
                marginBottom: "32px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
              }}
            >
              <div>
                <p className="eyebrow" style={{ color: "var(--lime)", marginBottom: "8px" }}>
                  <Award size={15} style={{ display: "inline", marginRight: "6px" }} />
                  Evaluation Completed
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontSize: "52px", fontWeight: 800, color: "var(--paper)", lineHeight: 1 }}>
                    {result.score}
                  </span>
                  <span style={{ fontSize: "24px", color: "var(--mist)", fontWeight: 500 }}>
                    / {result.total} Correct
                  </span>
                </div>
                <p style={{ marginTop: "10px", color: "var(--mint)", fontSize: "13px", fontWeight: 600 }}>
                  {result.accuracyPercent >= 80
                    ? "🌟 Outstanding Mastery! You have strong conceptual grasp."
                    : result.accuracyPercent >= 50
                    ? "👍 Solid Performance! Review incorrect items below to cement recall."
                    : "📖 Revision Needed! Check the explanations below and try flashcards."}
                </p>
                {result.notice && <p style={{ fontSize: "11px", color: "var(--mist)", margin: "4px 0 0" }}>{result.notice}</p>}
              </div>

              {/* Circular Progress Badge */}
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  border: "6px solid rgba(196, 255, 106, 0.2)",
                  borderTopColor: "var(--lime)",
                  borderRightColor: "var(--lime)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--lime)" }}>
                  {result.accuracyPercent}%
                </span>
                <span style={{ fontSize: "10px", color: "var(--mist)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Accuracy
                </span>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
              <button
                type="button"
                className="button primary"
                onClick={handleRetake}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <RotateCw size={15} /> Retake Quiz
              </button>
              <Link
                href="/flashcards"
                className="button quiet"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <Layers size={15} /> Study Topic Flashcards
              </Link>
              <Link
                href="/quizzes"
                className="button quiet"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <ArrowLeft size={15} /> All Quizzes
              </Link>
            </div>

            {/* Section Header */}
            <div style={{ marginBottom: "20px" }}>
              <p className="eyebrow" style={{ color: "var(--mist)", marginBottom: "4px" }}>
                Step-by-Step Breakdown
              </p>
              <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--paper)" }}>
                Question Explanations &amp; Answers
              </h2>
            </div>

            {/* Detailed Question Review Cards */}
            <div style={{ display: "grid", gap: "20px" }}>
              {result.results.map((item, idx) => {
                const isCorrect = item.correct;
                return (
                  <div
                    key={idx}
                    className="glass-panel"
                    style={{
                      padding: "24px",
                      borderRadius: "16px",
                      border: isCorrect ? "1px solid rgba(46, 213, 115, 0.4)" : "1px solid rgba(255, 107, 107, 0.4)",
                      background: isCorrect
                        ? "linear-gradient(135deg, rgba(46, 213, 115, 0.04), rgba(7, 24, 16, 0.85))"
                        : "linear-gradient(135deg, rgba(255, 107, 107, 0.04), rgba(28, 12, 12, 0.85))",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "11px", color: "var(--mist)", fontWeight: 700, letterSpacing: "0.08em" }}>
                        QUESTION {idx + 1}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "999px",
                          background: isCorrect ? "rgba(46, 213, 115, 0.15)" : "rgba(255, 107, 107, 0.15)",
                          color: isCorrect ? "var(--mint)" : "var(--coral)",
                        }}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={13} /> Correct (+1 point)
                          </>
                        ) : (
                          <>
                            <XCircle size={13} /> Incorrect (0 points)
                          </>
                        )}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--paper)", margin: "0 0 16px", lineHeight: 1.45 }}>
                      {item.question}
                    </h3>

                    {/* Answers side by side / stacked */}
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "rgba(0,0,0,0.35)",
                        border: "1px solid var(--line)",
                        marginBottom: "14px",
                        display: "grid",
                        gap: "8px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <span style={{ color: "var(--mist)", fontSize: "11px", width: "95px", flexShrink: 0 }}>Your answer:</span>
                        <strong style={{ color: isCorrect ? "var(--mint)" : "var(--coral)", fontWeight: 600 }}>
                          {item.selectedAnswer || "(No answer selected)"}
                        </strong>
                      </div>
                      {!isCorrect && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                          <span style={{ color: "var(--mist)", fontSize: "11px", width: "95px", flexShrink: 0 }}>Correct answer:</span>
                          <strong style={{ color: "var(--lime)", fontWeight: 600 }}>
                            {item.correctAnswer}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    <div style={{ fontSize: "13px", color: "var(--paper-soft)", lineHeight: 1.6, marginBottom: "8px" }}>
                      <strong style={{ color: "var(--paper)", display: "block", marginBottom: "4px", fontSize: "12px" }}>
                        Explanation:
                      </strong>
                      {item.explanation}
                    </div>

                    {item.sourceReference && (
                      <span style={{ fontSize: "11px", color: "var(--mist)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <BookOpen size={12} /> Reference: {item.sourceReference}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          /* ===================== VIEW 2: TAKING QUIZ VIEW ===================== */
          <section className="quiz-questions">
            {/* Sticky/Subtle Progress Indicator */}
            {totalCount > 0 && (
              <div
                className="glass-panel"
                style={{
                  padding: "14px 20px",
                  borderRadius: "14px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--paper)" }}>
                    Progress: {answeredCount} / {totalCount} Answered
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--mist)" }}>({progressPercent}%)</span>
                </div>

                <div
                  style={{
                    flex: "1 1 200px",
                    maxWidth: "340px",
                    height: "8px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPercent}%`,
                      background: "linear-gradient(90deg, var(--mint), var(--lime))",
                      transition: "width 0.3s ease",
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Questions List */}
            <div style={{ display: "grid", gap: "24px" }}>
              {quiz?.questions.map((question, qIdx) => {
                const isAnswered = Boolean(answers[qIdx]);
                return (
                  <div
                    key={qIdx}
                    className="glass-panel"
                    style={{
                      padding: "26px 28px",
                      borderRadius: "18px",
                      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(13, 25, 20, 0.85))",
                      border: isAnswered ? "1px solid rgba(132, 229, 188, 0.35)" : "1px solid var(--line-bright)",
                      boxShadow: "var(--shadow)",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    {/* Question Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          color: "var(--lime)",
                          textTransform: "uppercase",
                        }}
                      >
                        Question {qIdx + 1} of {quiz.questions.length}
                      </span>

                      {question.difficulty && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            background:
                              question.difficulty.toLowerCase() === "easy"
                                ? "rgba(46, 213, 115, 0.15)"
                                : question.difficulty.toLowerCase() === "hard"
                                ? "rgba(255, 107, 107, 0.15)"
                                : "rgba(255, 214, 105, 0.15)",
                            color:
                              question.difficulty.toLowerCase() === "easy"
                                ? "var(--mint)"
                                : question.difficulty.toLowerCase() === "hard"
                                ? "var(--coral)"
                                : "var(--gold)",
                          }}
                        >
                          {question.difficulty}
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <h2
                      style={{
                        fontSize: "19px",
                        fontWeight: 600,
                        color: "var(--paper)",
                        margin: "0 0 20px",
                        lineHeight: 1.45,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {question.question}
                    </h2>

                    {/* Modern Interactive Options Cards */}
                    <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                      {question.options.map((option, optIdx) => {
                        const isSelected = answers[qIdx] === option;
                        const optionLetter = OPTION_LETTERS[optIdx] ?? String(optIdx + 1);

                        return (
                          <div
                            key={optIdx}
                            onClick={() => {
                              setAnswers((curr) => {
                                const next = [...curr];
                                next[qIdx] = option;
                                return next;
                              });
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              padding: "13px 16px",
                              borderRadius: "12px",
                              cursor: "pointer",
                              border: isSelected ? "1.5px solid var(--lime)" : "1px solid rgba(255, 255, 255, 0.08)",
                              background: isSelected
                                ? "linear-gradient(90deg, rgba(196, 255, 106, 0.14), rgba(46, 213, 115, 0.06))"
                                : "rgba(0, 0, 0, 0.3)",
                              boxShadow: isSelected ? "0 4px 16px rgba(196, 255, 106, 0.15)" : "none",
                              transition: "all 0.18s ease",
                            }}
                          >
                            {/* Option Letter Pill */}
                            <span
                              style={{
                                display: "grid",
                                width: "28px",
                                height: "28px",
                                placeItems: "center",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 800,
                                flexShrink: 0,
                                background: isSelected ? "var(--lime)" : "rgba(255, 255, 255, 0.08)",
                                color: isSelected ? "#07100d" : "var(--paper-soft)",
                                transition: "all 0.18s ease",
                              }}
                            >
                              {optionLetter}
                            </span>

                            {/* Option Text */}
                            <span
                              style={{
                                fontSize: "14px",
                                color: isSelected ? "var(--paper)" : "var(--paper-soft)",
                                fontWeight: isSelected ? 600 : 400,
                                lineHeight: 1.45,
                                flex: 1,
                              }}
                            >
                              {option}
                            </span>

                            {/* Checkmark indicator */}
                            <div
                              style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                border: isSelected ? "2px solid var(--lime)" : "1.5px solid rgba(255, 255, 255, 0.2)",
                                display: "grid",
                                placeItems: "center",
                                background: isSelected ? "var(--lime)" : "transparent",
                                flexShrink: 0,
                                transition: "all 0.18s ease",
                              }}
                            >
                              {isSelected && <Check size={11} color="#07100d" strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {question.source_reference && (
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--mist)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <BookOpen size={12} /> Reference: {question.source_reference}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Action Card */}
            {quiz && (
              <div
                className="glass-panel"
                style={{
                  marginTop: "32px",
                  padding: "24px 28px",
                  borderRadius: "18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "var(--paper)" }}>
                    Ready to complete your round?
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)" }}>
                    {answeredCount === totalCount
                      ? "All questions answered. Click submit to calculate accuracy and review explanations."
                      : `${totalCount - answeredCount} question(s) remaining. You can submit now or finish answering.`}
                  </p>
                </div>

                <button
                  id="submit-quiz-btn"
                  className="button primary"
                  onClick={() => void submit()}
                  disabled={busy}
                  style={{
                    height: "46px",
                    padding: "0 28px",
                    fontSize: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {busy ? "Evaluating Answers..." : "Submit Quiz"}
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
    </>
  );
}
