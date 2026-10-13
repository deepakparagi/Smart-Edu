"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoMaterials, demoQuizzes } from "../demo-data";
import { Navbar } from "../navbar";

type Material = { id: number; title: string; status: string };
type Quiz = { id: number; title: string; materialId: number; createdAt: string };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export default function QuizzesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Topic input state
  const [topicInput, setTopicInput] = useState("");
  const [questionCount, setQuestionCount] = useState(5);

  const load = useCallback(async () => {
    try {
      const [materialsResponse, quizzesResponse] = await Promise.all([
        fetch(`${API}/materials`, { credentials: "include" }),
        fetch(`${API}/quizzes`, { credentials: "include" }),
      ]);
      if (materialsResponse.status === 401) {
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
        router.push("/quizzes/201");
        return;
      }

      const groqKey = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (groqKey) headers["X-Groq-Api-Key"] = groqKey;

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

      const groqKey = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (groqKey) headers["X-Groq-Api-Key"] = groqKey;

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
      const groqKey = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (groqKey) headers["X-Groq-Api-Key"] = groqKey;

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

        <p className="eyebrow">Check your recall & mastery</p>
        <h1>Quizzes</h1>
        <p className="task-lead">
          Generate quizzes based on any topic you enter or from your uploaded notes. Each round evaluates your answers, provides explanations, and tracks accuracy.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* Section 1: Generate by Topic */}
        <section className="task-list-section" style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", border: "1px solid var(--line-bright)" }}>
          <div className="section-title" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">AI Quiz Generator</p>
              <h2>Generate by Topic</h2>
            </div>
            <span style={{ fontSize: "11px", color: "var(--mint)" }}>⚡ Enter any subject or concept</span>
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
                  <button
                    className="button primary"
                    onClick={() => void generate(material.id)}
                    disabled={busy === material.id}
                  >
                    {busy === material.id ? "Generating..." : "Generate quiz"}
                  </button>
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
                  <Link className="small-action" href={`/quizzes/${quiz.id}`}>
                    Take quiz →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
    </>
  );
}
