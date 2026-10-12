"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoMaterials, demoQuizzes } from "../demo-data";

type Material = { id: number; title: string; status: string };
type Quiz = { id: number; title: string; materialId: number; createdAt: string };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export default function QuizzesPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState(false);

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
      setMaterials(await materialsResponse.json());
      setQuizzes(await quizzesResponse.json());
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
      const response = await fetch(`${API}/quizzes/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      });
      const quiz = await response.json();
      if (!response.ok) throw Error(quiz.error || "Could not generate a quiz.");
      router.push(`/quizzes/${quiz.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate a quiz.");
    } finally {
      setBusy(null);
    }
  }

  const readyMaterials = materials.filter((material) => material.status === "COMPLETED");

  return (
    <main className="task-page">
      <header className="task-header">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">S</span> smart study
        </Link>
        <Link className="back-link" href="/dashboard">
          Back to dashboard
        </Link>
      </header>

      <section className="task-content">
        {demoMode && (
          <div className="demo-banner">
            <strong>Preview mode</strong>
            <span>Sample quizzes available. Generate creates an interactive preview round.</span>
          </div>
        )}

        <p className="eyebrow">Check your recall</p>
        <h1>Quizzes</h1>
        <p className="task-lead">
          Multiple-choice questions derived directly from definitions in your uploaded materials. Each round tracks accuracy to highlight weak topics.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}

        <section className="task-list-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Practice rounds</p>
              <h2>Generated quizzes</h2>
            </div>
            <span>{quizzes.length} saved</span>
          </div>

          {quizzes.length === 0 ? (
            <div className="empty-state">
              <h3>No quizzes yet.</h3>
              <p>Generate your first quiz from a processed note below.</p>
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

        <section className="task-list-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">New quiz</p>
              <h2>Generate from materials</h2>
            </div>
          </div>

          {readyMaterials.length === 0 ? (
            <div className="empty-state">
              <h3>No processed materials ready.</h3>
              <p>Upload a PDF, TXT, or DOCX note and wait for processing to complete.</p>
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
      </section>
    </main>
  );
}
