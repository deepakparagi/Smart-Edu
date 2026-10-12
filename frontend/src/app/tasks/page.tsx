"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoPlan, demoTasks } from "../demo-data";

type Task = {
  id: number;
  title: string;
  subject?: string;
  scheduledDate?: string;
  estimatedMinutes: number;
  priority: string;
  status: string;
};
type Plan = { id: number; startDate: string; endDate: string; dailyAvailableMinutes: number };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const prettyDate = (date?: string) => {
  if (!date) return "Unscheduled";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    try {
      const [taskResponse, planResponse] = await Promise.all([
        fetch(`${API}/tasks`, { credentials: "include" }),
        fetch(`${API}/plans/current`, { credentials: "include" }),
      ]);
      if (taskResponse.status === 401) {
        router.push("/login");
        return;
      }
      if (!taskResponse.ok || ![200, 204].includes(planResponse.status)) {
        throw new Error("Could not load your plan.");
      }
      setTasks(await taskResponse.json());
      setPlan(planResponse.status === 204 ? null : (await planResponse.json()).plan);
    } catch {
      setDemoMode(true);
      setTasks(demoTasks);
      setPlan(demoPlan);
      setError("");
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      if (demoMode) {
        const startDate = String(form.get("startDate") || new Date().toISOString().slice(0, 10));
        const end = new Date(`${startDate}T12:00:00`);
        end.setDate(end.getDate() + 6);
        setPlan({
          ...demoPlan,
          startDate,
          endDate: end.toISOString().slice(0, 10),
          dailyAvailableMinutes: Number(form.get("minutes")),
        });
        setTasks(demoTasks);
        return;
      }
      const response = await fetch(`${API}/plans/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableMinutesPerDay: Number(form.get("minutes")),
          startDate: form.get("startDate") || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the plan.");
      setPlan(result.plan);
      setTasks(result.tasks);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the plan.");
    } finally {
      setBusy(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      title: String(form.get("title")),
      subject: String(form.get("subject") || ""),
      scheduledDate: (form.get("date") as string) || undefined,
      estimatedMinutes: Number(form.get("duration")),
      priority: String(form.get("priority")),
    };
    try {
      if (demoMode) {
        setTasks((current) => [...current, { ...body, id: Date.now(), status: "PENDING" }]);
        formElement.reset();
        return;
      }
      const response = await fetch(`${API}/tasks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Could not add the task.");
      setTasks((current) => [...current, result as Task]);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the task.");
    }
  }

  async function updateTask(event: FormEvent<HTMLFormElement>, task: Task) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      title: String(form.get("title")),
      subject: String(form.get("subject") || ""),
      scheduledDate: (form.get("date") as string) || undefined,
      estimatedMinutes: Number(form.get("duration")),
      priority: String(form.get("priority")),
    };
    try {
      if (demoMode) {
        setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...body } : item)));
        setEditing(null);
        return;
      }
      const response = await fetch(`${API}/tasks/${task.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Could not update this task.");
      setTasks((current) => current.map((item) => (item.id === task.id ? (result as Task) : item)));
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this task.");
    }
  }

  async function complete(task: Task) {
    if (demoMode) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" } : item));
      return;
    }
    const response = await fetch(`${API}/tasks/${task.id}/${task.status === "COMPLETED" ? "reopen" : "complete"}`, { method: "POST", credentials: "include" });
    if (response.ok) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" } : item));
    } else {
      setError("Could not update this task.");
    }
  }

  async function remove(task: Task) {
    if (demoMode) {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      return;
    }
    const response = await fetch(`${API}/tasks/${task.id}`, { method: "DELETE", credentials: "include" });
    if (response.ok) setTasks((current) => current.filter((item) => item.id !== task.id));
    else setError("Could not delete this task.");
  }

  const completed = tasks.filter((task) => task.status === "COMPLETED").length;

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
            <span>Example study plan shown. Edits and tasks are temporary.</span>
          </div>
        )}

        <p className="eyebrow">Your schedule</p>
        <h1>Study plan &amp; tasks</h1>
        <p className="task-lead">
          Generated tasks from your processed notes, ranked by topic importance. Adjust due dates, duration, or create custom tasks.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}

        <section className="plan-card">
          <div>
            <p className="eyebrow">Current plan</p>
            <h2>{plan ? `${prettyDate(plan.startDate)} – ${prettyDate(plan.endDate)}` : "No active plan"}</h2>
            <p>
              {plan
                ? `${plan.dailyAvailableMinutes} minutes of focused study per day.`
                : "Generate a weekly schedule based on your available daily study time."}
            </p>
          </div>

          <form className="plan-form" onSubmit={generate}>
            <label>
              Daily minutes
              <input name="minutes" type="number" min="15" max="480" defaultValue="60" required />
            </label>
            <label>
              Start date
              <input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "Generating..." : "Generate plan"}
            </button>
          </form>
        </section>

        <section className="task-list-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Tasks</p>
              <h2>Upcoming work</h2>
            </div>
            <span>{completed}/{tasks.length} completed</span>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks created yet.</h3>
              <p>Generate a plan from processed notes or add your own tasks below.</p>
            </div>
          ) : (
            <div className="material-list">
              {tasks.map((task) => (
                <article className="material-item task-item" key={task.id}>
                  <button
                    className={`task-check ${task.status === "COMPLETED" ? "checked" : ""}`}
                    onClick={() => void complete(task)}
                    aria-label={task.status === "COMPLETED" ? "Mark pending" : "Mark completed"}
                  >
                    {task.status === "COMPLETED" ? "✓" : ""}
                  </button>

                  <div className="material-copy">
                    {editing?.id === task.id ? (
                      <form className="task-edit-form" onSubmit={(event) => void updateTask(event, task)}>
                        <input name="title" defaultValue={task.title} required maxLength={255} />
                        <input name="subject" defaultValue={task.subject ?? ""} maxLength={120} placeholder="Subject" />
                        <input name="date" type="date" defaultValue={task.scheduledDate ?? ""} />
                        <input name="duration" type="number" min="5" max="360" defaultValue={task.estimatedMinutes} />
                        <select name="priority" defaultValue={task.priority}>
                          <option>LOW</option>
                          <option>MEDIUM</option>
                          <option>HIGH</option>
                        </select>
                        <button className="small-action">Save</button>
                        <button type="button" className="small-action" onClick={() => setEditing(null)}>Cancel</button>
                      </form>
                    ) : (
                      <>
                        <h3 className={task.status === "COMPLETED" ? "task-done" : ""}>{task.title}</h3>
                        <p>
                          {task.subject ? `${task.subject} | ` : ""}
                          {prettyDate(task.scheduledDate)} | {task.estimatedMinutes} min | Priority: {task.priority}
                        </p>
                      </>
                    )}
                  </div>

                  {editing?.id !== task.id && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="retry" onClick={() => setEditing(task)}>Edit</button>
                      <button className="task-delete" onClick={() => void remove(task)}>Delete</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <details className="manual-task">
          <summary>Add a custom task</summary>
          <form className="task-create-form" onSubmit={createTask}>
            <label>
              Title
              <input name="title" required maxLength={255} placeholder="e.g. Read biology chapter 4" />
            </label>
            <label>
              Subject
              <input name="subject" maxLength={120} placeholder="Biology" />
            </label>
            <label>
              Due date
              <input name="date" type="date" />
            </label>
            <label>
              Minutes
              <input name="duration" type="number" min="5" max="360" defaultValue="30" required />
            </label>
            <label>
              Priority
              <select name="priority" defaultValue="MEDIUM">
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
              </select>
            </label>
            <button className="button primary">Add task</button>
          </form>
        </details>
      </section>
    </main>
  );
}
