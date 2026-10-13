"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "../navbar";
import {
  Users,
  Award,
  Clock,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Mail,
  UserX,
  Sparkles,
} from "lucide-react";

type Child = {
  id: number;
  name: string;
  email: string;
  linkId?: number;
  linkedSince?: string;
};

type SentLink = {
  id: number;
  student: { id: number; name: string; email: string };
  status: string;
  createdAt: string;
};

type QuizRecord = {
  id: number;
  quizId: number;
  title: string;
  score: number;
  total: number;
  accuracyPercent: number;
  submittedAt: string;
};

type SessionRecord = {
  id: number;
  durationMinutes: number;
  status: string;
  startedAt: string;
};

type TaskRecord = {
  id: number;
  title: string;
  status: string;
  priority: string;
  estimatedMinutes: number;
  scheduledDate?: string;
};

type MaterialRecord = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
};

type Report = {
  student?: { id: number; name: string; email: string };
  studyMinutes: number;
  todayStudyMinutes: number;
  weeklyStudyMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  taskCompletionPercent: number;
  quizAttempts: number;
  quizAccuracyPercent: number;
  statusAssessment?: string;
  recentQuizzes?: QuizRecord[];
  recentSessions?: SessionRecord[];
  recentTasks?: TaskRecord[];
  materialsStudied?: MaterialRecord[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export default function ParentPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [sentLinks, setSentLinks] = useState<SentLink[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [reports, setReports] = useState<Record<number, Report>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "quizzes" | "sessions" | "tasks" | "materials">("overview");

  const loadData = useCallback(async () => {
    try {
      const [childrenRes, sentRes] = await Promise.all([
        fetch(`${API}/parents/children`, { credentials: "include" }),
        fetch(`${API}/parents/links/sent`, { credentials: "include" }),
      ]);

      if (childrenRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!childrenRes.ok) {
        throw new Error("This page is for parent accounts. Please sign in with a parent role.");
      }

      const childrenData: Child[] = await childrenRes.json();
      setChildren(childrenData);

      if (sentRes.ok) {
        const sentData: SentLink[] = await sentRes.json();
        setSentLinks(sentData);
      }

      if (childrenData.length > 0) {
        const activeId = selectedChildId && childrenData.some((c) => c.id === selectedChildId)
          ? selectedChildId
          : childrenData[0].id;
        setSelectedChildId(activeId);
        await loadChildReport(activeId);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load linked students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, selectedChildId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function loadChildReport(studentId: number) {
    try {
      const response = await fetch(`${API}/parents/children/${studentId}/progress`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load student progress report.");
      const data = (await response.json()) as Report;
      setReports((curr) => ({ ...curr, [studentId]: data }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load progress details.");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    if (selectedChildId) {
      await loadChildReport(selectedChildId);
    }
    await loadData();
  }

  async function handleSendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = (data.get("email") as string)?.trim();
    if (!email) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/parents/links`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: email }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not send the request. Please check the email.");
      }
      setNotice(`Access request sent to ${result.student.name} (${result.student.email}). They will see an approval prompt on their dashboard.`);
      form.reset();
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the link request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelLink(linkId: number) {
    if (!confirm("Are you sure you want to cancel or remove this connection?")) return;
    try {
      const res = await fetch(`${API}/parents/links/${linkId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not remove this link.");
      setNotice("Student connection updated.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel link.");
    }
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const activeReport = selectedChildId ? reports[selectedChildId] : null;

  return (
    <>
      <Navbar
        customRightAction={
          <button
            className="small-action"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Updating..." : "Refresh Live Data"}
          </button>
        }
      />
      <main className="task-page" style={{ maxWidth: "1160px", margin: "0 auto", padding: "28px 24px" }}>
        {/* Main Content Area */}
        <section className="task-content" style={{ padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={14} /> Student Monitoring &amp; Academic Overview
            </p>
            <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "6px 0", letterSpacing: "-0.03em" }}>
              Support Their Learning Journey.
            </h1>
            <p className="task-lead" style={{ maxWidth: "680px", color: "var(--mist)", fontSize: "14px", margin: 0 }}>
              Real-time insights into your student&apos;s focus sessions, quiz results, study materials, and scheduled academic tasks.
            </p>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="success-note" role="status">{notice}</p>}

        {/* Section 1: Connect New Student Form */}
        <div
          className="glass-panel"
          style={{
            padding: "20px 24px",
            borderRadius: "16px",
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px", color: "var(--paper)" }}>
              Link a Student Account
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)" }}>
              Send an authorization invite. The student must approve from their dashboard before metrics are displayed.
            </p>
          </div>

          <form onSubmit={handleSendRequest} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Mail size={15} style={{ position: "absolute", left: "12px", top: "13px", color: "var(--mist)" }} />
              <input
                name="email"
                type="email"
                required
                placeholder="student@example.com"
                style={{
                  height: "40px",
                  padding: "0 14px 0 34px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "13px",
                  minWidth: "260px",
                }}
              />
            </div>
            <button type="submit" className="button primary" disabled={busy} style={{ height: "40px", padding: "0 18px" }}>
              {busy ? "Sending..." : "Request Access"}
              <ArrowRight size={14} />
            </button>
          </form>
        </div>

        {/* Section 2: Outgoing Pending Requests if any */}
        {sentLinks.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mint)", marginBottom: "10px" }}>
              Pending Student Approvals ({sentLinks.length})
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {sentLinks.map((link) => (
                <div
                  key={link.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px dashed var(--line-bright)",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "13px", color: "var(--paper)" }}>
                      {link.student.name}
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--mist)" }}>{link.student.email}</span>
                    <span style={{ display: "block", fontSize: "10px", color: "var(--gold)", marginTop: "2px" }}>
                      ⏳ Waiting for student approval
                    </span>
                  </div>
                  <button
                    className="small-action"
                    onClick={() => handleCancelLink(link.id)}
                    title="Cancel request"
                    style={{ borderColor: "rgba(255, 151, 127, 0.3)", color: "var(--coral)" }}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Linked Students & Progress Monitor */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--mist)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <p>Loading linked student profiles...</p>
          </div>
        ) : children.length === 0 ? (
          <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", borderRadius: "18px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "28px", background: "rgba(132, 229, 188, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--mint)" }}>
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>No Approved Student Links Yet</h3>
            <p style={{ maxWidth: "460px", margin: "0 auto 20px", fontSize: "13px", color: "var(--mist)", lineHeight: 1.6 }}>
              Enter your student&apos;s registered email above to send a linking request. Once they accept it from their dashboard, their study metrics and progress will appear here immediately.
            </p>
          </div>
        ) : (
          <div>
            {/* Student Switcher Bar */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "var(--mist)", fontWeight: 600 }}>Active Student:</span>
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedChildId(c.id);
                    if (!reports[c.id]) void loadChildReport(c.id);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "12px",
                    border: "1px solid",
                    borderColor: selectedChildId === c.id ? "var(--lime)" : "var(--line)",
                    background: selectedChildId === c.id ? "rgba(196, 255, 106, 0.12)" : "rgba(255, 255, 255, 0.03)",
                    color: selectedChildId === c.id ? "var(--lime)" : "var(--paper)",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Users size={14} />
                  {c.name}
                </button>
              ))}

              {selectedChild?.linkId && (
                <button
                  className="small-action"
                  onClick={() => handleCancelLink(selectedChild.linkId!)}
                  style={{ marginLeft: "auto", color: "var(--coral)", borderColor: "rgba(255, 151, 127, 0.3)" }}
                >
                  <UserX size={12} style={{ marginRight: "4px" }} /> Disconnect Student
                </button>
              )}
            </div>

            {/* Progress Display for Selected Child */}
            {activeReport ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Status Assessment Banner */}
                {activeReport.statusAssessment && (
                  <div
                    style={{
                      background: "linear-gradient(90deg, rgba(132, 229, 188, 0.14), rgba(196, 255, 106, 0.06))",
                      border: "1px solid rgba(132, 229, 188, 0.35)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--lime)", color: "#10190c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--mint)", fontWeight: 800 }}>
                        Academic Status Assessment
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 600, color: "var(--paper)" }}>
                        {activeReport.statusAssessment}
                      </p>
                    </div>
                  </div>
                )}

                {/* 4 Core KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  {/* Study Time */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                        Total Study Time
                      </span>
                      <Clock size={16} color="var(--mint)" />
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--lime)", letterSpacing: "-0.03em" }}>
                      {activeReport.studyMinutes} <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--paper)" }}>mins</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "6px" }}>
                      Today: <strong>{activeReport.todayStudyMinutes}m</strong> | Past 7 days: <strong>{activeReport.weeklyStudyMinutes}m</strong>
                    </div>
                  </div>

                  {/* Task Completion */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                        Task Completion
                      </span>
                      <CheckCircle2 size={16} color="var(--mint)" />
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--paper)", letterSpacing: "-0.03em" }}>
                      {activeReport.taskCompletionPercent}%
                    </div>
                    <div style={{ marginTop: "8px", background: "rgba(255,255,255,0.1)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(activeReport.taskCompletionPercent, 100)}%`,
                          background: "var(--mint)",
                          height: "100%",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "6px" }}>
                      {activeReport.tasksCompleted} of {activeReport.tasksTotal} tasks completed
                    </div>
                  </div>

                  {/* Quiz Mastery */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                        Quiz Accuracy
                      </span>
                      <Award size={16} color="var(--gold)" />
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.03em" }}>
                      {activeReport.quizAccuracyPercent}%
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "6px" }}>
                      Based on {activeReport.quizAttempts} quiz attempt{activeReport.quizAttempts === 1 ? "" : "s"}
                    </div>
                  </div>

                  {/* Materials Under Study */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                        Study Library
                      </span>
                      <BookOpen size={16} color="var(--blue)" />
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--blue)", letterSpacing: "-0.03em" }}>
                      {activeReport.materialsStudied?.length ?? 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "6px" }}>
                      Notes &amp; subject documents uploaded
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--line)", gap: "24px", margin: "8px 0" }}>
                  {[
                    { key: "overview", label: "📊 Overview & Recent Activity" },
                    { key: "quizzes", label: `📝 Quizzes (${activeReport.recentQuizzes?.length ?? 0})` },
                    { key: "sessions", label: `⏱️ Study Sessions (${activeReport.recentSessions?.length ?? 0})` },
                    { key: "tasks", label: `📋 Tasks (${activeReport.recentTasks?.length ?? 0})` },
                    { key: "materials", label: `📚 Library (${activeReport.materialsStudied?.length ?? 0})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      style={{
                        padding: "10px 4px",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === tab.key ? "2px solid var(--lime)" : "2px solid transparent",
                        color: activeTab === tab.key ? "var(--lime)" : "var(--mist)",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Overview */}
                {activeTab === "overview" && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
                    {/* Recent Quizzes Snapshot */}
                    <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Award size={16} color="var(--gold)" /> Recent Quiz Scores
                      </h4>
                      {activeReport.recentQuizzes && activeReport.recentQuizzes.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {activeReport.recentQuizzes.slice(0, 4).map((q) => (
                            <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: "10px" }}>
                              <div>
                                <span style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>{q.title}</span>
                                <span style={{ fontSize: "11px", color: "var(--mist)" }}>{new Date(q.submittedAt).toLocaleDateString()}</span>
                              </div>
                              <span style={{ fontSize: "13px", fontWeight: 800, color: q.accuracyPercent >= 70 ? "var(--mint)" : "var(--coral)", background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: "8px" }}>
                                {q.score}/{q.total} ({q.accuracyPercent}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: "12px", color: "var(--mist)" }}>No quizzes taken yet.</p>
                      )}
                    </div>

                    {/* Recent Focus Sessions Snapshot */}
                    <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Clock size={16} color="var(--mint)" /> Recent Study Sessions
                      </h4>
                      {activeReport.recentSessions && activeReport.recentSessions.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {activeReport.recentSessions.slice(0, 4).map((s) => (
                            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: "10px" }}>
                              <div>
                                <span style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>Focus Session</span>
                                <span style={{ fontSize: "11px", color: "var(--mist)" }}>{new Date(s.startedAt).toLocaleString()}</span>
                              </div>
                              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lime)" }}>
                                {s.durationMinutes} mins
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: "12px", color: "var(--mist)" }}>No focus sessions logged yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: All Quizzes */}
                {activeTab === "quizzes" && (
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px" }}>Quiz History &amp; Accuracy</h3>
                    {activeReport.recentQuizzes && activeReport.recentQuizzes.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {activeReport.recentQuizzes.map((q) => (
                          <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                            <div>
                              <strong style={{ fontSize: "14px", color: "var(--paper)", display: "block" }}>{q.title}</strong>
                              <span style={{ fontSize: "11px", color: "var(--mist)" }}>Completed on {new Date(q.submittedAt).toLocaleString()}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "15px", fontWeight: 800, color: q.accuracyPercent >= 70 ? "var(--mint)" : "var(--coral)" }}>
                                {q.score} / {q.total}
                              </span>
                              <span style={{ display: "block", fontSize: "11px", color: "var(--mist)" }}>
                                {q.accuracyPercent}% Accuracy
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: "13px", color: "var(--mist)" }}>No quizzes completed by this student yet.</p>
                    )}
                  </div>
                )}

                {/* Tab 3: All Sessions */}
                {activeTab === "sessions" && (
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px" }}>Focus Study Logs</h3>
                    {activeReport.recentSessions && activeReport.recentSessions.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {activeReport.recentSessions.map((s) => (
                          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                            <div>
                              <span style={{ fontSize: "14px", fontWeight: 600, display: "block" }}>Pomodoro / Focus Block</span>
                              <span style={{ fontSize: "11px", color: "var(--mist)" }}>{new Date(s.startedAt).toLocaleString()}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "rgba(132, 229, 188, 0.15)", color: "var(--mint)" }}>
                                {s.status}
                              </span>
                              <strong style={{ fontSize: "15px", color: "var(--lime)" }}>
                                {s.durationMinutes} min
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: "13px", color: "var(--mist)" }}>No study sessions recorded yet.</p>
                    )}
                  </div>
                )}

                {/* Tab 4: Study Tasks */}
                {activeTab === "tasks" && (
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px" }}>Scheduled Tasks &amp; Goals</h3>
                    {activeReport.recentTasks && activeReport.recentTasks.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {activeReport.recentTasks.map((t) => (
                          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                            <div>
                              <strong style={{ fontSize: "14px", color: t.status === "COMPLETED" ? "var(--mist)" : "var(--paper)", textDecoration: t.status === "COMPLETED" ? "line-through" : "none" }}>
                                {t.title}
                              </strong>
                              {t.scheduledDate && (
                                <span style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginTop: "2px" }}>
                                  Target date: {t.scheduledDate}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.08)", color: "var(--mist)" }}>
                                {t.estimatedMinutes}m est.
                              </span>
                              <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: t.status === "COMPLETED" ? "rgba(132, 229, 188, 0.15)" : "rgba(255, 214, 105, 0.15)", color: t.status === "COMPLETED" ? "var(--mint)" : "var(--gold)", fontWeight: 700 }}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: "13px", color: "var(--mist)" }}>No tasks created yet.</p>
                    )}
                  </div>
                )}

                {/* Tab 5: Library */}
                {activeTab === "materials" && (
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px" }}>Uploaded Study Materials</h3>
                    {activeReport.materialsStudied && activeReport.materialsStudied.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {activeReport.materialsStudied.map((m) => (
                          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <BookOpen size={16} color="var(--blue)" />
                              <div>
                                <strong style={{ fontSize: "14px", color: "var(--paper)", display: "block" }}>{m.title}</strong>
                                <span style={{ fontSize: "11px", color: "var(--mist)" }}>Uploaded on {new Date(m.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: "11px", padding: "4px 9px", borderRadius: "8px", background: "rgba(132, 229, 188, 0.15)", color: "var(--mint)", fontWeight: 600 }}>
                              {m.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: "13px", color: "var(--mist)" }}>No documents uploaded yet.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--mist)" }}>
                <p>Loading student report details...</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
    </>
  );
}
