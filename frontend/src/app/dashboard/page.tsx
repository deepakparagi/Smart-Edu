"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoMaterials, demoTasks } from "../demo-data";
import { Navbar } from "../navbar";

type Me = { name: string; email: string; role: string };
type ParentRequest = { id: number; parent: { name: string; email: string }; createdAt: string };
type Material = {
  id: number;
  title: string;
  fileName: string;
  status: string;
  summary?: string;
  processingError?: string;
  topicsJson?: string;
  keywordsJson?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "#materials", label: "Materials" },
  { href: "/tasks", label: "Tasks" },
  { href: "/focus", label: "Focus Mode" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/analytics", label: "Progress" },
  { href: "/ai-tutor", label: "AI Tutor" },
];

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parentRequests, setParentRequests] = useState<ParentRequest[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    try {
      const [userResponse, materialsResponse] = await Promise.all([
        fetch(API + "/auth/me", { credentials: "include" }),
        fetch(API + "/materials", { credentials: "include" }),
      ]);
      if (userResponse.status === 401) {
        router.push("/login");
        return;
      }
      if (!userResponse.ok || !materialsResponse.ok) {
        throw new Error("The study API could not load your account data.");
      }
      const user = (await userResponse.json()) as Me;
      setMe(user);
      if (user.role === "STUDENT") {
        const requestsResponse = await fetch(API + "/parents/links/pending", { credentials: "include" })
          .catch(() => null);
        if (requestsResponse && requestsResponse.ok) {
          const raw = await requestsResponse.json();
          setParentRequests(Array.isArray(raw) ? raw : (raw?.content ?? []));
        }
      }
      const rawMaterials = await materialsResponse.json();
      const materialList: Material[] = Array.isArray(rawMaterials)
        ? rawMaterials
        : (rawMaterials?.content ?? []);
      setMaterials(materialList);
    } catch {
      setDemoMode(true);
      setMe({ name: "Alex Morgan", email: "alex@example.test", role: "STUDENT" });
      setMaterials(demoMaterials);
      setError("");
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const processing = Array.isArray(materials) && materials.some((material) => material.status === "PROCESSING");
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => {
      void fetch(API + "/materials", { credentials: "include" })
        .then((response) => {
          if (!response.ok) throw new Error("Could not refresh processing status.");
          return response.json();
        })
        .then((raw) => {
          const list: Material[] = Array.isArray(raw) ? raw : (raw?.content ?? []);
          setMaterials(list);
        })
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : "Could not refresh processing status.");
        });
    }, 2500);
    return () => clearInterval(timer);
  }, [processing]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      if (demoMode) {
        const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        setMaterials((current) => [
          {
            id: Date.now(),
            title,
            fileName: file.name,
            status: "COMPLETED",
            summary: "Preview item added locally. Connect the study API to extract and save this document.",
          },
          ...current,
        ]);
        return;
      }
      const response = await fetch(API + "/materials", {
        method: "POST",
        credentials: "include",
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "Upload failed.");
      setMaterials((current) => [result as Material, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function retry(id: number) {
    if (demoMode) {
      setMaterials((current) =>
        current.map((material) =>
          material.id === id ? { ...material, status: "COMPLETED", processingError: undefined } : material
        )
      );
      return;
    }
    setError("");
    try {
      const response = await fetch(API + "/materials/" + id + "/process", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "Retry failed.");
      setMaterials((current) => current.map((material) => (material.id === id ? (result as Material) : material)));
      setTimeout(() => void load(), 1500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Retry failed.");
    }
  }

  async function logout() {
    if (!demoMode) await fetch(API + "/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  }

  async function acceptParentRequest(id: number) {
    try {
      const response = await fetch(API + "/parents/links/" + id + "/accept", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not approve this request.");
      setParentRequests((current) => current.filter((request) => request.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not approve this request.");
    }
  }

  const firstName = me?.name.split(" ")[0] ?? "there";
  const upcomingTasks = demoTasks.filter((task) => task.status === "PENDING").slice(0, 2);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, minHeight: "calc(100vh - 64px)", background: "linear-gradient(135deg, rgba(24,45,35,.14), transparent 38%), var(--ink-deep)" }}>
        <section className="dash-main">
          <header className="dash-header">
          <div>
            <p className="eyebrow">Student dashboard</p>
            <h1>Welcome, {firstName}.</h1>
            <p>Here is what is on your schedule today.</p>
          </div>
          <span className="avatar">{me?.name?.[0] ?? "?"}</span>
        </header>

        {demoMode && (
          <div className="demo-banner">
            <strong>Preview mode</strong>
            <span>Showing preview study data. Actions and uploads will update locally.</span>
          </div>
        )}

        <section className="dashboard-metrics">
          <article>
            <span>This week</span>
            <strong>3.8 <small>hrs</small></strong>
          </article>
          <article>
            <span>Tasks cleared</span>
            <strong>{demoTasks.filter((t) => t.status === "COMPLETED").length} <small>/ {demoTasks.length}</small></strong>
          </article>
          <article>
            <span>Quiz accuracy</span>
            <strong>84<small>%</small></strong>
          </article>
          <article>
            <span>Streak</span>
            <strong>4 <small>days</small></strong>
          </article>
        </section>

        <section className="focus-panel">
          <div>
            <p className="eyebrow">Today&apos;s focus</p>
            <h2>Stay on track with your study plan</h2>
            <p>Upload lecture notes, generate adaptive quizzes, and practice key definitions.</p>
          </div>
          <label className="button primary upload-button">
            {busy ? "Uploading..." : "Upload note"}
            <input type="file" accept=".pdf,.txt,.docx" onChange={upload} disabled={busy} hidden />
          </label>
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}

        {me?.role === "STUDENT" && parentRequests.length > 0 && (
          <section className="materials-section">
            <div className="section-title">
              <div>
                <p className="eyebrow">Approval requested</p>
                <h2>Parent link requests</h2>
              </div>
            </div>
            <div className="material-list">
              {parentRequests.map((request) => (
                <article className="material-item" key={request.id}>
                  <div className="material-copy">
                    <h3>{request.parent.name}</h3>
                    <p>{request.parent.email} would like to view your study progress</p>
                  </div>
                  <button className="small-action" onClick={() => void acceptParentRequest(request.id)}>
                    Approve
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="dashboard-lower">
          <div className="dashboard-next">
            <p className="eyebrow">Upcoming tasks</p>
            <h2>Next actions</h2>
            {upcomingTasks.map((task) => (
              <div className="dashboard-task" key={task.id}>
                <span className="dashboard-task-dot" />
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.subject} • {task.estimatedMinutes} min</small>
                </div>
              </div>
            ))}
            <Link className="small-action" href="/tasks">View all tasks →</Link>
          </div>

          <div className="dashboard-next">
            <p className="eyebrow">Quick links</p>
            <h2>Explore tools</h2>
            <div className="dashboard-shortcuts">
              <Link href="/focus">Focus Mode <span>Timer &amp; log →</span></Link>
              <Link href="/quizzes">Quizzes <span>MCQ practice →</span></Link>
              <Link href="/flashcards">Flashcards <span>Spaced repetition →</span></Link>
              <Link href="/ai-tutor">AI Tutor <span>Source-grounded →</span></Link>
            </div>
          </div>
        </div>

        <section id="materials" className="materials-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Knowledge base</p>
              <h2>Study materials</h2>
            </div>
            <span>{materials.length} uploaded</span>
          </div>

          {materials.length === 0 ? (
            <div className="empty-state">
              <h3>No study materials yet.</h3>
              <p>Upload a PDF, TXT, or DOCX note to get automated summaries, concepts, and quizzes.</p>
            </div>
          ) : (
            <div className="material-list">
              {materials.map((material) => (
                <article className="material-item" key={material.id}>
                  <div className="file-icon">DOC</div>
                  <div className="material-copy">
                    <h3>{material.title}</h3>
                    <p>{material.fileName}</p>
                    {material.summary && <p className="summary">{material.summary}</p>}
                    {material.processingError && (
                      <p className="form-error">
                        {material.processingError}{" "}
                        <button className="retry" onClick={() => void retry(material.id)}>Retry</button>
                      </p>
                    )}
                  </div>
                  <span className={`status ${material.status === "FAILED" ? "failed" : ""}`}>
                    {material.status}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  </div>
);
}
