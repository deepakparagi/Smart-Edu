"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoMaterials, demoQuizzes } from "../demo-data";
import { Navbar } from "../navbar";

type Material = { id: number; title: string; status: string };
type Quiz = { id: number; title: string; materialId: number; createdAt: string };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const DEFAULT_OPENROUTER_KEY =
  process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

export default function QuizzesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Topic input state
  const [topicInput, setTopicInput] = useState("");
  const [questionCount, setQuestionCount] = useState(5);

  // OpenRouter API Key State (defaults to configured key)
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("openrouter_api_key");
      if (stored && stored.trim().length > 0) return stored.trim();
      try {
        localStorage.setItem("openrouter_api_key", DEFAULT_OPENROUTER_KEY);
      } catch {}
      return DEFAULT_OPENROUTER_KEY;
    }
    return DEFAULT_OPENROUTER_KEY;
  });
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("openrouter_api_key");
      if (stored && stored.trim().length > 0) return stored.trim();
      return DEFAULT_OPENROUTER_KEY;
    }
    return DEFAULT_OPENROUTER_KEY;
  });

  const [testStatus, setTestStatus] = useState<{ testing: boolean; result?: { valid: boolean; message?: string; error?: string; rate_limited?: boolean } }>({ testing: false });
  const [showPassword, setShowPassword] = useState(false);

  const handleTestKey = async () => {
    const targetKey = keyInput.trim() || openRouterKey.trim();
    if (!targetKey) {
      setTestStatus({ testing: false, result: { valid: false, error: "Please paste your API key in the input box first." } });
      return;
    }
    setTestStatus({ testing: true, result: undefined });
    try {
      const res = await fetch(`${API}/quizzes/test-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: targetKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        setTestStatus({ testing: false, result: { valid: true, message: data.message || "Key is verified and ready for quiz generation!" } });
      } else {
        setTestStatus({
          testing: false,
          result: {
            valid: false,
            error: data.message || data.error || data.detail || `Validation failed (HTTP ${res.status})`,
            rate_limited: data.rate_limited || res.status === 429,
          },
        });
      }
    } catch (err: unknown) {
      setTestStatus({ testing: false, result: { valid: false, error: err instanceof Error ? err.message : "Could not reach backend test endpoint." } });
    }
  };

  const saveOpenRouterKey = () => {
    const clean = keyInput.trim();
    setOpenRouterKey(clean);
    if (typeof window !== "undefined") {
      if (clean) {
        localStorage.setItem("openrouter_api_key", clean);
      } else {
        localStorage.removeItem("openrouter_api_key");
      }
    }
    setShowKeyModal(false);
  };

  const load = useCallback(async () => {
    try {
      const [materialsResponse, quizzesResponse] = await Promise.all([
        fetch(`${API}/materials`, { credentials: "include" }),
        fetch(`${API}/quizzes`, { credentials: "include" }),
      ]);
      if (materialsResponse.status === 401 || materialsResponse.status === 403) {
        router.push("/login");
        return;
      }
      if (!materialsResponse.ok || !quizzesResponse.ok) {
        throw Error("Could not load your study materials and quizzes.");
      }
      const rawMaterials = await materialsResponse.json();
      setMaterials(Array.isArray(rawMaterials) ? rawMaterials : (rawMaterials?.content ?? []));
      const rawQuizzes = await quizzesResponse.json();
      setQuizzes(Array.isArray(rawQuizzes) ? rawQuizzes : (rawQuizzes?.content ?? []));
    } catch {
      setDemoMode(true);
      setMaterials(demoMaterials);
      setQuizzes(demoQuizzes);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Generate quiz by topic entered by user
  async function generateByTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const formTopic = ((formData.get("topic") as string) || topicInput).trim();
    if (!formTopic) return;

    setBusy("topic");
    setError("");

    try {
      if (demoMode) {
        const previewQuestions = [
          {
            question: `In ${formTopic}, what is the fundamental purpose and core mechanism?`,
            options: [
              `Core governing mechanism and standard implementation in ${formTopic}`,
              `An unrelated secondary configuration with minimal impact`,
              `A deprecated protocol that has been replaced by modern tooling`,
              `A client-side presentation filter without state persistence`,
            ],
            correctAnswer: `Core governing mechanism and standard implementation in ${formTopic}`,
            explanation: `Foundational understanding of ${formTopic} requires identifying its core mechanism and state lifecycle.`,
            difficulty: "medium",
            source_reference: `${formTopic} Overview`,
          },
          {
            question: `What critical prerequisite or invariant must be maintained when working with ${formTopic}?`,
            options: [
              `Strict validation of boundary constraints and domain integrity`,
              `Ignoring edge case exceptions during processing`,
              `Disabling concurrency controls entirely`,
              `Relying on arbitrary hardcoded offsets`,
            ],
            correctAnswer: `Strict validation of boundary constraints and domain integrity`,
            explanation: `Invariants and boundary validation prevent inconsistent state and runtime exceptions in ${formTopic}.`,
            difficulty: "medium",
            source_reference: `${formTopic} Best Practices`,
          },
          {
            question: `How does ${formTopic} handle optimization and performance trade-offs?`,
            options: [
              `Balancing throughput, latency, and resource utilization systematically`,
              `Allocating unbounded memory without garbage collection or cleanup`,
              `Removing all caching layers to force continuous re-computation`,
              `Executing sequential blocking loops on the main event thread`,
            ],
            correctAnswer: `Balancing throughput, latency, and resource utilization systematically`,
            explanation: `Effective optimization in ${formTopic} balances throughput, latency, and hardware constraints.`,
            difficulty: "hard",
            source_reference: `${formTopic} Performance`,
          },
        ].slice(0, questionCount);

        const customDemoQuiz = {
          id: 9999,
          title: `Quiz on ${formTopic}`,
          materialId: 101,
          createdAt: new Date().toISOString(),
          questions: previewQuestions,
        };
        if (typeof window !== "undefined") {
          sessionStorage.setItem("custom_demo_quiz", JSON.stringify(customDemoQuiz));
        }
        router.push("/quizzes/9999");
        return;
      }

      const openRouterKey = typeof window !== "undefined" ? localStorage.getItem("openrouter_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (openRouterKey) headers["X-OpenRouter-Api-Key"] = openRouterKey;

      const response = await fetch(`${API}/quizzes/generate`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ topic: formTopic, count: questionCount }),
      });

      const quiz = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(quiz.error || quiz.detail || quiz.message || "Could not generate quiz on this topic.");
      router.push(`/quizzes/${quiz.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate a quiz.");
    } finally {
      setBusy(null);
    }
  }

  // Generate quiz from selected uploaded material
  async function generate(materialId: number) {
    setBusy(materialId);
    setError("");
    try {
      if (demoMode) {
        const found = demoQuizzes.find((q) => q.materialId === materialId);
        if (found) {
          router.push(`/quizzes/${found.id}`);
          return;
        }
        router.push(`/quizzes/201`);
        return;
      }

      const openRouterKey = typeof window !== "undefined" ? localStorage.getItem("openrouter_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (openRouterKey) headers["X-OpenRouter-Api-Key"] = openRouterKey;

      const response = await fetch(`${API}/quizzes/generate`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ materialId, count: questionCount }),
      });
      const quiz = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(quiz.error || quiz.detail || quiz.message || "Could not generate a quiz.");
      router.push(`/quizzes/${quiz.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate a quiz.");
    } finally {
      setBusy(null);
    }
  }

  // Direct upload notes and immediately generate quiz
  async function handleNotesUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      if (demoMode) {
        router.push("/quizzes/201");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const uploadResp = await fetch(`${API}/materials`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const uploaded = await uploadResp.json().catch(() => ({}));
      if (!uploadResp.ok) throw Error(uploaded.error || uploaded.message || "Upload failed.");

      // Generate quiz from this new material
      const openRouterKey = typeof window !== "undefined" ? localStorage.getItem("openrouter_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (openRouterKey) headers["X-OpenRouter-Api-Key"] = openRouterKey;

      const quizResp = await fetch(`${API}/quizzes/generate`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ materialId: uploaded.id, count: questionCount }),
      });

      const quiz = await quizResp.json().catch(() => ({}));
      if (!quizResp.ok) throw Error(quiz.error || quiz.detail || "Could not generate quiz from uploaded file.");
      router.push(`/quizzes/${quiz.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload and quiz generation failed.");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  }

  // Delete a saved quiz
  async function deleteQuiz(quizId: number, event?: React.MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!window.confirm("Are you sure you want to delete this quiz? All associated attempts and scores will also be removed.")) {
      return;
    }
    setBusy(`delete-quiz-${quizId}`);
    setError("");
    setNotice("");
    try {
      if (!demoMode) {
        const response = await fetch(`${API}/quizzes/${quizId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) {
          const res = await response.json().catch(() => ({}));
          throw new Error(res.error || res.message || "Failed to delete quiz.");
        }
      }
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setNotice("Quiz deleted successfully.");
      setTimeout(() => setNotice(""), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete quiz.");
    } finally {
      setBusy(null);
    }
  }

  // Delete an uploaded study note
  async function deleteMaterial(materialId: number, event?: React.MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!window.confirm("Are you sure you want to delete this study note? Associated quizzes and flashcards will also be deleted.")) {
      return;
    }
    setBusy(`delete-mat-${materialId}`);
    setError("");
    setNotice("");
    try {
      if (!demoMode) {
        const response = await fetch(`${API}/materials/${materialId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) {
          const res = await response.json().catch(() => ({}));
          throw new Error(res.error || res.message || "Failed to delete note.");
        }
      }
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      setQuizzes((prev) => prev.filter((q) => q.materialId !== materialId));
      setNotice("Study note deleted successfully.");
      setTimeout(() => setNotice(""), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete note.");
    } finally {
      setBusy(null);
    }
  }

  const readyMaterials = materials.filter((material) => material.status === "COMPLETED");

  return (
    <>
      <Navbar />
      <main className="task-page">
        <section className="task-content">
        {demoMode && (
          <div className="demo-banner">
            <strong>Preview mode</strong>
            <span>Sample quizzes available. Generate creates an interactive preview round.</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "8px" }}>
          <div>
            <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Check your recall & mastery</span>
              <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "rgba(132,229,188,0.15)", color: "var(--mint)", border: "1px solid rgba(132,229,188,0.3)" }}>
                {openRouterKey ? "⚡ Gemma 4 26B (OpenRouter)" : "⚡ Free AI Models Active"}
              </span>
            </p>
            <h1>Quizzes</h1>
            <p className="task-lead">
              Generate quizzes based on any topic you enter or from your uploaded notes. Each round evaluates your answers, provides explanations, and tracks accuracy.
            </p>
          </div>

          <button
            type="button"
            className="button quiet"
            onClick={() => {
              setKeyInput(openRouterKey || (typeof window !== "undefined" ? localStorage.getItem("openrouter_api_key") || "" : ""));
              setShowKeyModal(true);
            }}
            style={{
              fontSize: "11px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: openRouterKey ? "1px solid rgba(132,229,188,0.3)" : "1px solid rgba(255,180,50,0.4)",
              color: openRouterKey ? "var(--mint)" : "var(--paper)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{openRouterKey ? "🔑 OpenRouter Active" : "🔑 Set OpenRouter Key"}</span>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: openRouterKey ? "#4ade80" : "#f59e0b" }} />
          </button>
        </div>

        {notice && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: "rgba(132, 229, 188, 0.12)",
              border: "1px solid rgba(132, 229, 188, 0.3)",
              color: "var(--mint)",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✅</span> {notice}
          </div>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* Section 1: Generate by Topic */}
        <section className="task-list-section" style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", border: "1px solid var(--line-bright)" }}>
          <div className="section-title" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <p className="eyebrow">AI Quiz Generator</p>
              <h2>Generate by Topic</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                id="connect-key-btn"
                onClick={() => {
                  setKeyInput(openRouterKey || (typeof window !== "undefined" ? localStorage.getItem("openrouter_api_key") || "" : ""));
                  setTestStatus({ testing: false });
                  setShowKeyModal(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "5px 13px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: openRouterKey ? "rgba(132,229,188,0.12)" : "rgba(255,180,50,0.12)",
                  border: openRouterKey ? "1px solid rgba(132,229,188,0.3)" : "1px solid rgba(255,180,50,0.4)",
                  color: openRouterKey ? "var(--mint)" : "#f8b739",
                  transition: "all 0.2s ease"
                }}
              >
                <span>🔑</span>
                <span>{openRouterKey ? "API Key Connected" : "Connect API Key"}</span>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: openRouterKey ? "#4ade80" : "#f59e0b" }} />
              </button>
              <span style={{ fontSize: "11px", color: "var(--mint)" }}>⚡ Enter any subject or concept</span>
            </div>
          </div>

          <form id="topic-quiz-form" onSubmit={generateByTopic} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 280px" }}>
              <label htmlFor="topic-input" style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginBottom: "6px" }}>
                Topic / Subject
              </label>
              <input
                id="topic-input"
                name="topic"
                type="text"
                required
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Python Object Oriented Programming, Linear Algebra, Cell Biology..."
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 12px",
                  borderRadius: "9px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ width: "110px" }}>
              <label htmlFor="question-count-select" style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginBottom: "6px" }}>
                Questions
              </label>
              <select
                id="question-count-select"
                name="count"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 10px",
                  borderRadius: "9px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "12px",
                }}
              >
                <option value={3}>3 MCQs</option>
                <option value={5}>5 MCQs</option>
                <option value={10}>10 MCQs</option>
              </select>
            </div>

            <button
              id="generate-topic-btn"
              type="submit"
              className="button primary"
              disabled={busy === "topic"}
              style={{ height: "42px", padding: "0 20px" }}
            >
              {busy === "topic" ? "Generating Quiz..." : "Generate Quiz on Topic"}
            </button>
          </form>

          {/* Quick starter topic chips */}
          <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--mist)", fontWeight: 500 }}>⚡ Popular topics:</span>
            {[
              "Operating Systems Concurrency & Deadlocks",
              "Database Normalization & ACID",
              "Computer Networks TCP/IP",
              "Data Structures Trees & Heaps",
            ].map((topic, i) => (
              <button
                key={topic}
                id={`quick-quiz-topic-${i}`}
                type="button"
                onClick={() => setTopicInput(topic)}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: topicInput === topic ? "rgba(46, 213, 115, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: topicInput === topic ? "1px solid var(--lime)" : "1px solid rgba(255, 255, 255, 0.1)",
                  color: topicInput === topic ? "var(--lime)" : "var(--paper)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                + {topic}
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Generate from Uploaded Notes */}
        <section className="task-list-section" style={{ marginTop: "32px" }}>
          <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p className="eyebrow">Document Grounded</p>
              <h2>Generate from uploaded notes</h2>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleNotesUpload}
                accept=".pdf,.txt,.docx"
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="button quiet"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                📎 {uploading ? "Uploading & Generating..." : "Upload notes to quiz"}
              </button>
            </div>
          </div>

          {readyMaterials.length === 0 ? (
            <div className="empty-state">
              <h3>No processed notes yet.</h3>
              <p>Upload a PDF, TXT, or DOCX note above or generate a quiz by entering a topic!</p>
            </div>
          ) : (
            <div className="material-list">
              {readyMaterials.map((material) => (
                <article className="material-item" key={material.id}>
                  <div className="file-icon">DOC</div>
                  <div className="material-copy">
                    <h3>{material.title}</h3>
                    <p>Ready for question generation</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      className="button primary"
                      onClick={() => void generate(material.id)}
                      disabled={busy === material.id || busy === `delete-mat-${material.id}`}
                    >
                      {busy === material.id ? "Generating..." : "Generate quiz"}
                    </button>
                    <button
                      type="button"
                      className="button quiet"
                      onClick={(e) => void deleteMaterial(material.id, e)}
                      disabled={busy === `delete-mat-${material.id}`}
                      style={{
                        padding: "7px 11px",
                        fontSize: "12px",
                        color: "#ff7070",
                        borderColor: "rgba(255, 112, 112, 0.3)",
                        background: "rgba(255, 70, 70, 0.08)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Delete this study note"
                    >
                      {busy === `delete-mat-${material.id}` ? "Deleting..." : "🗑️ Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Past Generated Quizzes */}
        <section className="task-list-section" style={{ marginTop: "32px" }}>
          <div className="section-title">
            <div>
              <p className="eyebrow">Practice rounds</p>
              <h2>Past quizzes</h2>
            </div>
            <span>{quizzes.length} saved</span>
          </div>

          {quizzes.length === 0 ? (
            <div className="empty-state">
              <h3>No quizzes saved yet.</h3>
              <p>Create your first quiz using the topic generator above.</p>
            </div>
          ) : (
            <div className="material-list">
              {quizzes.map((quiz) => (
                <article className="material-item" key={quiz.id}>
                  <div className="file-icon">QUIZ</div>
                  <div className="material-copy">
                    <h3>{quiz.title}</h3>
                    <p>Created {new Date(quiz.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Link className="small-action" href={`/quizzes/${quiz.id}`}>
                      Take quiz →
                    </Link>
                    <button
                      type="button"
                      className="button quiet"
                      onClick={(e) => void deleteQuiz(quiz.id, e)}
                      disabled={busy === `delete-quiz-${quiz.id}`}
                      style={{
                        padding: "6px 11px",
                        fontSize: "12px",
                        color: "#ff7070",
                        borderColor: "rgba(255, 112, 112, 0.3)",
                        background: "rgba(255, 70, 70, 0.08)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Delete this quiz"
                    >
                      {busy === `delete-quiz-${quiz.id}` ? "Deleting..." : "🗑️ Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* LLM / OpenRouter API Key Modal */}
      {showKeyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowKeyModal(false);
          }}
        >
          <div
            style={{
              background: "#0c1512",
              border: "1px solid var(--line-bright)",
              borderRadius: "18px",
              padding: "26px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 24px 50px rgba(0,0,0,0.75)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
                <span>🔑</span> Configure AI Key for Quizzes
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{ background: "none", border: "none", color: "var(--mist)", cursor: "pointer", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--mist)", lineHeight: "1.55", margin: "0 0 16px" }}>
              Connect your API key to generate deep, accurate multiple-choice quizzes on <strong>any searched topic</strong>. We support both <strong>Groq</strong> (recommended, 100% free with 14,400 daily requests) and <strong>OpenRouter</strong>.
            </p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", padding: "4px 9px", borderRadius: "12px", background: "rgba(132,229,188,0.1)", border: "1px solid rgba(132,229,188,0.25)", color: "var(--mint)" }}>
                ⚡ Groq: <code>gsk_...</code> (Free &amp; Ultra-Fast)
              </span>
              <span style={{ fontSize: "11px", padding: "4px 9px", borderRadius: "12px", background: "rgba(168,231,255,0.1)", border: "1px solid rgba(168,231,255,0.25)", color: "var(--blue)" }}>
                🌐 OpenRouter: <code>sk-or-v1-...</code>
              </span>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", color: "var(--mint)", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.05em" }}>
                API KEY
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setTestStatus({ testing: false });
                  }}
                  placeholder="gsk_... or sk-or-v1-..."
                  style={{
                    flex: 1,
                    height: "42px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid var(--line)",
                    color: "var(--paper)",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: "0 12px",
                    height: "42px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--line)",
                    color: "var(--mist)",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Test & Verification Result Box */}
            {testStatus.testing && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(168,231,255,0.08)", border: "1px solid rgba(168,231,255,0.2)", fontSize: "12px", color: "var(--blue)", marginBottom: "14px" }}>
                ⏳ Testing connection to AI service...
              </div>
            )}
            {testStatus.result && (
              <div
                style={{
                  padding: "11px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  lineHeight: "1.5",
                  marginBottom: "14px",
                  background: testStatus.result.valid
                    ? "rgba(132,229,188,0.12)"
                    : testStatus.result.rate_limited
                    ? "rgba(255,180,50,0.14)"
                    : "rgba(255,90,90,0.12)",
                  border: `1px solid ${
                    testStatus.result.valid
                      ? "rgba(132,229,188,0.35)"
                      : testStatus.result.rate_limited
                      ? "rgba(255,180,50,0.4)"
                      : "rgba(255,90,90,0.3)"
                  }`,
                  color: testStatus.result.valid
                    ? "var(--mint)"
                    : testStatus.result.rate_limited
                    ? "#f8b739"
                    : "#ff7070",
                }}
              >
                {testStatus.result.valid ? (
                  <div>
                    <strong>✅ Key Verified &amp; Active!</strong>
                    <div style={{ marginTop: "3px", fontSize: "11px", opacity: 0.9 }}>{testStatus.result.message}</div>
                  </div>
                ) : testStatus.result.rate_limited ? (
                  <div>
                    <strong>⚠️ Rate Limit Exceeded (HTTP 429)</strong>
                    <div style={{ marginTop: "3px", fontSize: "11px" }}>
                      This key has reached its free request quota. Tip: Get a free Groq key from{" "}
                      <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "inherit", fontWeight: 700 }}>
                        console.groq.com/keys
                      </a>{" "}
                      for instant 14,400 daily requests.
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong>❌ Connection Failed:</strong> {testStatus.result.error}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 18px", fontSize: "12px", color: "var(--mist)", flexWrap: "wrap", gap: "8px" }}>
              <span>
                Free keys:{" "}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--mint)", textDecoration: "underline", marginRight: "10px" }}
                >
                  Groq (Instant)
                </a>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--blue)", textDecoration: "underline" }}
                >
                  OpenRouter
                </a>
              </span>
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus.testing}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--line-bright)",
                  color: "var(--paper)",
                  padding: "5px 11px",
                  borderRadius: "7px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🧪 Test &amp; Verify Key
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {openRouterKey && (
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => {
                    setKeyInput("");
                    localStorage.removeItem("openrouter_api_key");
                    setOpenRouterKey("");
                    setTestStatus({ testing: false });
                    setShowKeyModal(false);
                  }}
                  style={{ fontSize: "12px" }}
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                className="button primary"
                onClick={saveOpenRouterKey}
                style={{ fontSize: "12px" }}
              >
                Save &amp; Connect Key
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
