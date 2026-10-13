"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "../navbar";
import {
  ShieldAlert,
  Users,
  Server,
  FileText,
  Activity,
  Award,
  Clock,
  Search,
  RefreshCw,
  LogOut,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  materialsCount?: number;
  quizAttemptsCount?: number;
  studyMinutes?: number;
};

type DocumentRecord = {
  id: number;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  processingError?: string;
  createdAt: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
};

type ActivityFeed = {
  quizzes: {
    id: number;
    studentName: string;
    quizTitle: string;
    score: number;
    total: number;
    accuracyPercent: number;
    submittedAt: string;
  }[];
  sessions: {
    id: number;
    studentName: string;
    durationMinutes: number;
    status: string;
    startedAt: string;
  }[];
  users: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
};

type System = {
  users: number;
  students: number;
  parents: number;
  admins: number;
  totalMaterials: number;
  documentProcessing: Record<string, number>;
  totalQuizzes: number;
  quizAttempts: number;
  avgQuizAccuracyPercent: number;
  totalStudyMinutes: number;
  totalStudyHours: number;
  completedSessions: number;
  totalTasks: number;
  completedTasks: number;
  serverTelemetry: {
    jvmUsedMemoryMB: number;
    jvmTotalMemoryMB: number;
    jvmMaxMemoryMB: number;
    memoryUsagePercent: number;
    availableProcessors: number;
    javaVersion: string;
    serverTime: string;
    mlEngineStatus: string;
  };
  mode: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activity, setActivity] = useState<ActivityFeed | null>(null);
  const [system, setSystem] = useState<System | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"users" | "documents" | "activity" | "telemetry">("users");

  const loadData = useCallback(async () => {
    try {
      const [uRes, sRes, dRes, aRes] = await Promise.all([
        fetch(`${API}/admin/users`, { credentials: "include" }),
        fetch(`${API}/admin/system`, { credentials: "include" }),
        fetch(`${API}/admin/documents`, { credentials: "include" }),
        fetch(`${API}/admin/recent-activity`, { credentials: "include" }),
      ]);

      if (uRes.status === 401 || sRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!uRes.ok || !sRes.ok) {
        throw new Error("This area requires administrator privileges.");
      }

      setUsers(await uRes.json());
      setSystem(await sRes.json());
      if (dRes.ok) setDocuments(await dRes.json());
      if (aRes.ok) setActivity(await aRes.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load admin monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    setNotice("");
    await loadData();
  }

  async function handleRoleChange(user: User, newRole: string) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/admin/users/${user.id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update role.");
      setUsers((curr) => curr.map((u) => (u.id === user.id ? { ...u, role: result.role } : u)));
      setNotice(result.notice || `Updated ${user.name}'s role to ${newRole}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to change user role.");
    }
  }

  async function handleToggleStatus(user: User) {
    if (!confirm(`Are you sure you want to ${user.enabled ? "suspend" : "activate"} ${user.name}'s account?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/admin/users/${user.id}/toggle-status`, {
        method: "PATCH",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not toggle status.");
      setUsers((curr) => curr.map((u) => (u.id === user.id ? { ...u, enabled: result.enabled } : u)));
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to toggle status.");
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
            {refreshing ? "Refreshing..." : "Refresh Telemetry"}
          </button>
        }
      />
      <main className="task-page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px" }}>
        {/* Main Section */}
        <section className="task-content" style={{ padding: 0 }}>
        <div style={{ marginBottom: "24px" }}>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Server size={14} /> System Health &amp; Platform Monitoring
          </p>
          <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "6px 0", letterSpacing: "-0.03em" }}>
            System Infrastructure &amp; Operations.
          </h1>
          <p className="task-lead" style={{ maxWidth: "700px", color: "var(--mist)", fontSize: "14px", margin: 0 }}>
            Unified real-time telemetry, user management, document ingestion queues, and global academic activity.
          </p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="success-note" role="status">{notice}</p>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--mist)" }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <p>Connecting to system metrics and telemetry streams...</p>
          </div>
        ) : system ? (
          <div>
            {/* Primary KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              {/* Total Users */}
              <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                    Total Accounts
                  </span>
                  <Users size={16} color="var(--mint)" />
                </div>
                <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--paper)", letterSpacing: "-0.02em" }}>
                  {system.users}
                </div>
                <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "4px" }}>
                  {system.students} Students &bull; {system.parents} Parents &bull; {system.admins} Admins
                </div>
              </div>

              {/* Study Hours */}
              <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                    Study Volume
                  </span>
                  <Clock size={16} color="var(--lime)" />
                </div>
                <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--lime)", letterSpacing: "-0.02em" }}>
                  {system.totalStudyHours} <span style={{ fontSize: "14px", color: "var(--paper)" }}>hrs</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "4px" }}>
                  {system.completedSessions} sessions logged platform-wide
                </div>
              </div>

              {/* Documents Pipeline */}
              <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                    Document Pipeline
                  </span>
                  <FileText size={16} color="var(--blue)" />
                </div>
                <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--blue)", letterSpacing: "-0.02em" }}>
                  {system.totalMaterials}
                </div>
                <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "4px" }}>
                  {system.documentProcessing["COMPLETED"] ?? 0} Completed &bull; {system.documentProcessing["FAILED"] ?? 0} Failed
                </div>
              </div>

              {/* Quiz Volume */}
              <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mist)", fontWeight: 700 }}>
                    Quiz Volume &amp; Accuracy
                  </span>
                  <Award size={16} color="var(--gold)" />
                </div>
                <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.02em" }}>
                  {system.avgQuizAccuracyPercent}%
                </div>
                <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "4px" }}>
                  {system.quizAttempts} total attempts evaluated
                </div>
              </div>
            </div>

            {/* Server Telemetry Bar */}
            <div
              className="glass-panel"
              style={{
                padding: "16px 20px",
                borderRadius: "14px",
                marginBottom: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(16, 29, 24, 0.72))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Cpu size={18} color="var(--lime)" />
                <div>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mint)", fontWeight: 800 }}>
                    JVM Memory
                  </span>
                  <strong style={{ display: "block", fontSize: "13px" }}>
                    {system.serverTelemetry.jvmUsedMemoryMB} MB / {system.serverTelemetry.jvmMaxMemoryMB} MB ({system.serverTelemetry.memoryUsagePercent}%)
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Activity size={18} color="var(--mint)" />
                <div>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mint)", fontWeight: 800 }}>
                    ML Intelligence Engine
                  </span>
                  <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: system.serverTelemetry.mlEngineStatus === "ONLINE" ? "var(--lime)" : "var(--coral)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "4px", background: system.serverTelemetry.mlEngineStatus === "ONLINE" ? "var(--lime)" : "var(--coral)" }} />
                    {system.serverTelemetry.mlEngineStatus}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Server size={18} color="var(--blue)" />
                <div>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mint)", fontWeight: 800 }}>
                    Runtime Environment
                  </span>
                  <strong style={{ display: "block", fontSize: "13px" }}>
                    Java {system.serverTelemetry.javaVersion} &bull; {system.serverTelemetry.availableProcessors} Cores
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Layers size={18} color="var(--gold)" />
                <div>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mint)", fontWeight: 800 }}>
                    Architecture
                  </span>
                  <strong style={{ display: "block", fontSize: "13px" }}>
                    {system.mode} &bull; MySQL 8
                  </strong>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)", gap: "24px", marginBottom: "20px" }}>
              {[
                { key: "users", label: `👥 User Management (${users.length})` },
                { key: "documents", label: `📑 Document Pipeline (${documents.length})` },
                { key: "activity", label: `⚡ Platform Activity Stream` },
                { key: "telemetry", label: `💻 Diagnostics & Health` },
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

            {/* TAB 1: User Management */}
            {activeTab === "users" && (
              <div>
                {/* Search & Filter Bar */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: "1 1 280px" }}>
                    <Search size={15} style={{ position: "absolute", left: "12px", top: "13px", color: "var(--mist)" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search user by name or email..."
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 14px 0 34px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.35)",
                        border: "1px solid var(--line)",
                        color: "var(--paper)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                      height: "40px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid var(--line)",
                      color: "var(--paper)",
                      fontSize: "12px",
                    }}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Student</option>
                    <option value="PARENT">Parent</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <span style={{ fontSize: "12px", color: "var(--mist)", marginLeft: "auto" }}>
                    Showing {filteredUsers.length} of {users.length} accounts
                  </span>
                </div>

                {/* Users Table */}
                <div className="glass-panel" style={{ borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--line)", color: "var(--mist)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          <th style={{ padding: "14px 16px" }}>User</th>
                          <th style={{ padding: "14px 16px" }}>Role</th>
                          <th style={{ padding: "14px 16px" }}>Materials</th>
                          <th style={{ padding: "14px 16px" }}>Quizzes</th>
                          <th style={{ padding: "14px 16px" }}>Study Time</th>
                          <th style={{ padding: "14px 16px" }}>Status</th>
                          <th style={{ padding: "14px 16px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "12px 16px" }}>
                              <strong style={{ display: "block", color: "var(--paper)" }}>{u.name}</strong>
                              <span style={{ fontSize: "11px", color: "var(--mist)" }}>{u.email}</span>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <select
                                value={u.role}
                                onChange={(e) => void handleRoleChange(u, e.target.value)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: "8px",
                                  background: "rgba(0,0,0,0.4)",
                                  border: "1px solid var(--line)",
                                  color: u.role === "ADMIN" ? "var(--lime)" : u.role === "PARENT" ? "var(--mint)" : "var(--paper)",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                }}
                              >
                                <option value="STUDENT">STUDENT</option>
                                <option value="PARENT">PARENT</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </td>
                            <td style={{ padding: "12px 16px", color: "var(--mist)" }}>
                              {u.materialsCount ?? 0} docs
                            </td>
                            <td style={{ padding: "12px 16px", color: "var(--mist)" }}>
                              {u.quizAttemptsCount ?? 0} attempts
                            </td>
                            <td style={{ padding: "12px 16px", color: "var(--mist)" }}>
                              {u.studyMinutes ?? 0} mins
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: u.enabled ? "rgba(132, 229, 188, 0.15)" : "rgba(255, 151, 127, 0.15)",
                                  color: u.enabled ? "var(--mint)" : "var(--coral)",
                                  fontWeight: 700,
                                }}
                              >
                                {u.enabled ? "ACTIVE" : "SUSPENDED"}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <button
                                className="small-action"
                                onClick={() => void handleToggleStatus(u)}
                                style={{
                                  fontSize: "10px",
                                  color: u.enabled ? "var(--coral)" : "var(--mint)",
                                  borderColor: u.enabled ? "rgba(255, 151, 127, 0.3)" : "rgba(132, 229, 188, 0.3)",
                                }}
                              >
                                {u.enabled ? "Suspend" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Document Pipeline */}
            {activeTab === "documents" && (
              <div className="glass-panel" style={{ borderRadius: "16px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px" }}>
                      Document Ingestion &amp; NLP Extraction Pipeline
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)" }}>
                      Live monitor for documents uploaded across student accounts.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {Object.entries(system.documentProcessing).map(([st, cnt]) => (
                      <span key={st} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}>
                        {st}: <strong>{cnt}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--line)", color: "var(--mist)", fontSize: "11px", textTransform: "uppercase" }}>
                        <th style={{ padding: "12px 14px" }}>Document</th>
                        <th style={{ padding: "12px 14px" }}>Owner</th>
                        <th style={{ padding: "12px 14px" }}>Size</th>
                        <th style={{ padding: "12px 14px" }}>Status</th>
                        <th style={{ padding: "12px 14px" }}>Error / Diagnostic</th>
                        <th style={{ padding: "12px 14px" }}>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "12px 14px" }}>
                            <strong style={{ color: "var(--paper)" }}>{doc.title}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "var(--mist)" }}>{doc.fileName}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span>{doc.ownerName}</span>
                            <span style={{ display: "block", fontSize: "11px", color: "var(--mist)" }}>{doc.ownerEmail}</span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--mist)" }}>
                            {Math.round(doc.fileSize / 1024)} KB
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                background: doc.status === "COMPLETED" ? "rgba(132, 229, 188, 0.15)" : doc.status === "FAILED" ? "rgba(255, 151, 127, 0.15)" : "rgba(255, 214, 105, 0.15)",
                                color: doc.status === "COMPLETED" ? "var(--mint)" : doc.status === "FAILED" ? "var(--coral)" : "var(--gold)",
                                fontWeight: 700,
                              }}
                            >
                              {doc.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", color: doc.processingError ? "var(--coral)" : "var(--mist)", fontSize: "11px", maxWidth: "220px", wordBreak: "break-word" }}>
                            {doc.processingError ? doc.processingError : "None"}
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--mist)", fontSize: "11px" }}>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: Recent Activity Feed */}
            {activeTab === "activity" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
                {/* Recent Quizzes */}
                <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Award size={16} color="var(--gold)" /> Recent Quiz Submissions
                  </h3>
                  {activity?.quizzes && activity.quizzes.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {activity.quizzes.map((q) => (
                        <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--paper)" }}>{q.studentName}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "var(--mist)" }}>{q.quizTitle}</span>
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 800, color: q.accuracyPercent >= 70 ? "var(--mint)" : "var(--coral)" }}>
                            {q.score}/{q.total} ({q.accuracyPercent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "12px", color: "var(--mist)" }}>No recent quiz activity.</p>
                  )}
                </div>

                {/* Recent Study Sessions */}
                <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock size={16} color="var(--lime)" /> Recent Focus Blocks
                  </h3>
                  {activity?.sessions && activity.sessions.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {activity.sessions.map((s) => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--paper)" }}>{s.studentName}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "var(--mist)" }}>{new Date(s.startedAt).toLocaleString()}</span>
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lime)" }}>
                            {s.durationMinutes} min
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "12px", color: "var(--mist)" }}>No recent focus sessions.</p>
                  )}
                </div>

                {/* Recent Registrations */}
                <div className="glass-panel" style={{ padding: "20px", borderRadius: "16px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={16} color="var(--mint)" /> New User Sign-ups
                  </h3>
                  {activity?.users && activity.users.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {activity.users.map((u) => (
                        <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--paper)" }}>{u.name}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "var(--mist)" }}>{u.email}</span>
                          </div>
                          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "var(--paper)" }}>
                            {u.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "12px", color: "var(--mist)" }}>No recent registrations.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Telemetry Diagnostics */}
            {activeTab === "telemetry" && (
              <div className="glass-panel" style={{ padding: "24px", borderRadius: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>
                  Host Machine &amp; Microservice Diagnostic Telemetry
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                  <div style={{ padding: "16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--mist)", textTransform: "uppercase" }}>JVM Allocated Heap</span>
                    <h4 style={{ margin: "4px 0", fontSize: "20px", color: "var(--lime)" }}>{system.serverTelemetry.jvmUsedMemoryMB} MB / {system.serverTelemetry.jvmMaxMemoryMB} MB</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)" }}>Usage: {system.serverTelemetry.memoryUsagePercent}%</p>
                  </div>

                  <div style={{ padding: "16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--mist)", textTransform: "uppercase" }}>NLP / ML Microservice</span>
                    <h4 style={{ margin: "4px 0", fontSize: "20px", color: system.serverTelemetry.mlEngineStatus === "ONLINE" ? "var(--mint)" : "var(--coral)" }}>
                      {system.serverTelemetry.mlEngineStatus}
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)" }}>FastAPI Uvicorn port 8000</p>
                  </div>

                  <div style={{ padding: "16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--mist)", textTransform: "uppercase" }}>Host CPU Architecture</span>
                    <h4 style={{ margin: "4px 0", fontSize: "20px", color: "var(--paper)" }}>{system.serverTelemetry.availableProcessors} Available Cores</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)" }}>JDK {system.serverTelemetry.javaVersion}</p>
                  </div>

                  <div style={{ padding: "16px", background: "rgba(0,0,0,0.25)", borderRadius: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--mist)", textTransform: "uppercase" }}>Platform Server Clock</span>
                    <h4 style={{ margin: "4px 0", fontSize: "16px", color: "var(--paper)" }}>{new Date(system.serverTelemetry.serverTime).toLocaleTimeString()}</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)" }}>{new Date(system.serverTelemetry.serverTime).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
    </>
  );
}
