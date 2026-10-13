"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoConversations, demoMaterials, demoTutorMessages } from "../demo-data";
import { Navbar } from "../navbar";

type Material = {
  id: number;
  title: string;
  fileName?: string;
  status: string;
};

type Conversation = {
  id: number;
  title: string;
  createdAt: string;
};

type SourceCitation = {
  materialTitle: string;
  reference: string;
  text: string;
};

type Message = {
  id: number;
  role: string;
  content: string;
  sources?: SourceCitation[];
  createdAt?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function formatMessageContent(content: string) {
  // Simple, clean markdown rendering for headers, bold, code blocks, lists
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const firstLineBreak = part.indexOf("\n");
      const language = firstLineBreak > 3 ? part.slice(3, firstLineBreak).trim() : "";
      const code = firstLineBreak !== -1 ? part.slice(firstLineBreak + 1, -3) : part.slice(3, -3);
      return (
        <pre key={index} className="chat-code-block">
          {language && <div className="code-lang-tag">{language}</div>}
          <code>{code}</code>
        </pre>
      );
    }

    // Format paragraphs, bold, lists
    const lines = part.split("\n");
    return (
      <span key={index}>
        {lines.map((line, lIndex) => {
          let formattedLine: React.ReactNode = line;

          // Headers
          if (line.startsWith("### ")) {
            return <h4 key={lIndex} className="chat-h4">{line.replace("### ", "")}</h4>;
          }
          if (line.startsWith("## ")) {
            return <h3 key={lIndex} className="chat-h3">{line.replace("## ", "")}</h3>;
          }
          if (line.startsWith("# ")) {
            return <h2 key={lIndex} className="chat-h2">{line.replace("# ", "")}</h2>;
          }

          // Bullet points
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <li key={lIndex} className="chat-li">
                {line.slice(2)}
              </li>
            );
          }

          return (
            <span key={lIndex}>
              {formattedLine}
              {lIndex < lines.length - 1 && <br />}
            </span>
          );
        })}
      </span>
    );
  });
}

export default function TutorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [materialId, setMaterialId] = useState<string>("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);

const DEFAULT_OPENROUTER_KEY =
  process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

const LEGACY_KEY_PREFIX = "sk-or-v1-8a9";

  // OpenRouter API Key State (defaults to configured key)
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("openrouter_api_key");
      if (stored && stored.trim().length > 0 && !stored.startsWith(LEGACY_KEY_PREFIX)) {
        return stored.trim();
      }
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
      if (stored && stored.trim().length > 0 && !stored.startsWith(LEGACY_KEY_PREFIX)) {
        return stored.trim();
      }
      return DEFAULT_OPENROUTER_KEY;
    }
    return DEFAULT_OPENROUTER_KEY;
  });

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
      const [m, c] = await Promise.all([
        fetch(`${API}/materials`, { credentials: "include" }),
        fetch(`${API}/tutor/conversations`, { credentials: "include" }),
      ]);
      if (m.status === 401 || m.status === 403) {
        router.push("/login");
        return;
      }
      if (!m.ok || !c.ok) throw Error("Could not load study materials and tutor history.");
      const rawMats = await m.json();
      const matList: Material[] = Array.isArray(rawMats) ? rawMats : (rawMats?.content ?? []);
      const ready = matList.filter((x) => x.status === "COMPLETED");
      setMaterials(ready);
      const rawConvs = await c.json();
      setConversations(Array.isArray(rawConvs) ? rawConvs : (rawConvs?.content ?? []));
    } catch {
      setDemoMode(true);
      setMaterials(demoMaterials);
      setConversations(demoConversations);
      setConversationId((current) => current ?? demoConversations[0].id);
      setMessages(demoTutorMessages);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function openConversation(id: number) {
    setError("");
    if (demoMode) {
      setConversationId(id);
      setMessages(demoTutorMessages);
      return;
    }
    try {
      const response = await fetch(`${API}/tutor/conversations/${id}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw Error("Could not open this conversation.");
      setConversationId(id);
      setMessages(data.messages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open this conversation.");
    }
  }

  // Handle direct file upload in chat
  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      if (demoMode) {
        const fakeId = Date.now();
        const fakeTitle = file.name.replace(/\.[^.]+$/, "");
        const newMat: Material = { id: fakeId, title: fakeTitle, fileName: file.name, status: "COMPLETED" };
        setMaterials((prev) => [newMat, ...prev]);
        setMaterialId(String(fakeId));
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "TUTOR",
            content: `📎 **Attached document:** *${file.name}*\n\nI have indexed this document. What would you like to know about it?`,
          },
        ]);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API}/materials`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || result.message || "Upload failed. Please ensure file is valid TXT, PDF, or DOCX.");
      }

      const newMaterial = result as Material;
      setMaterialId(String(newMaterial.id));

      // Reload materials list
      await load();

      // Post notice into chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "TUTOR",
          content: `📎 **Document uploaded & attached:** *${newMaterial.fileName || newMaterial.title}*\n\nYou can now ask questions about this document or chat freely.`,
        },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document upload failed.");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const question = String(form.get("question") ?? "").trim();
    if (!question) return;

    setBusy(true);
    setError("");

    const targetMaterialId = materialId ? Number(materialId) : null;
    const userMessage: Message = { id: Date.now(), role: "USER", content: question };
    setMessages((current) => [...current, userMessage]);

    try {
      if (demoMode) {
        const selected = materials.find((item) => item.id === targetMaterialId);
        const activeConversation = conversationId ?? Date.now();
        setConversationId(activeConversation);

        let tutorAnswer = "";
        let sourcesList: SourceCitation[] = [];

        if (selected) {
          tutorAnswer = `Based on **${selected.title}**, here is the explanation for *"${question}"*:\n\n` +
            `The key concepts describe how structured input maps to target outputs with high fidelity. You can test your understanding by trying related practice questions.`;
          sourcesList = [{ materialTitle: selected.title, reference: "Section 1", text: "Core definition passage." }];
        } else {
          tutorAnswer = `### AI Tutor (ChatGPT Mode)\n\n` +
            `Here is a comprehensive breakdown for **${question}**:\n\n` +
            `- **Concept:** Key educational overview.\n` +
            `- **Explanation:** Step-by-step reasoning.\n` +
            `- **Example:** Applicable real-world use case.\n\n` +
            `*Tip: Connect a free OpenRouter API key in the top right for live Nemotron 3 Ultra generation!*`;
        }

        setMessages((current) => [
          ...current,
          { id: Date.now() + 1, role: "TUTOR", content: tutorAnswer, sources: sourcesList },
        ]);
        setConversations((current) => [
          { id: activeConversation, title: question.slice(0, 100), createdAt: new Date().toISOString() },
          ...current.filter((item) => item.id !== activeConversation),
        ]);
        formElement.reset();
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (openRouterKey) {
        headers["X-OpenRouter-Api-Key"] = openRouterKey;
      }

      const response = await fetch(`${API}/tutor/ask`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          question,
          materialId: targetMaterialId,
          conversationId,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Error(data.error || data.detail || "The tutor could not answer.");
      }

      setConversationId(data.conversationId);
      setMessages(data.messages);
      setConversations((current) => [
        { id: data.conversationId, title: question.slice(0, 100), createdAt: new Date().toISOString() },
        ...current.filter((x) => x.id !== data.conversationId),
      ]);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The tutor could not answer.");
    } finally {
      setBusy(false);
    }
  }

  function newConversation() {
    setConversationId(null);
    setMessages([]);
    setError("");
  }

  const selectedMaterial = materials.find((m) => String(m.id) === materialId);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main className="tutor-layout" style={{ flex: 1, minHeight: "calc(100vh - 64px)" }}>
        {/* Sidebar */}
        <aside className="tutor-sidebar" style={{ top: "64px", height: "calc(100vh - 64px)" }}>
          <button className="button quiet new-chat" onClick={newConversation} style={{ marginTop: "8px" }}>
            + New chat
          </button>
          <p className="eyebrow">Recent conversations</p>
          <nav>
            {conversations.length === 0 ? (
              <p style={{ fontSize: "11px", color: "var(--mist)", padding: "8px" }}>No previous chats</p>
            ) : (
              conversations.map((item) => (
                <button
                  key={item.id}
                  className={conversationId === item.id ? "conversation-active" : ""}
                  onClick={() => void openConversation(item.id)}
                >
                  {item.title}
                </button>
              ))
            )}
          </nav>
        </aside>

      {/* Main chat */}
      <section className="tutor-main">
        {demoMode && (
          <div className="demo-banner">
            <strong>Preview mode</strong>
            <span>Answers use local preview synthesis. Conversations are temporary.</span>
          </div>
        )}

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>AI Learning Companion</span>
              <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "rgba(132,229,188,0.15)", color: "var(--mint)", border: "1px solid rgba(132,229,188,0.3)" }}>
                {openRouterKey ? "⚡ Nemotron 3 Ultra (OpenRouter)" : "🌐 General AI Mode"}
              </span>
            </p>
            <h1>Study tutor</h1>
            <p>
              Ask anything freely like ChatGPT, or upload lecture notes and study guides to get source-grounded answers.
            </p>
          </div>

          {/* Model / Key Settings button */}
          <button
            type="button"
            className="button quiet"
            onClick={() => setShowKeyModal(true)}
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
        </header>

        {error && (
          <p className="form-error" role="alert" style={{ margin: "16px 0 0" }}>
            {error}
          </p>
        )}

        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h3>Ask anything or attach notes to begin.</h3>
              <p>
                The AI Tutor can solve problems, write code, explain concepts step-by-step, or analyze your uploaded documents.
              </p>
              <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button"
                  className="button quiet"
                  style={{ fontSize: "11px" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 Upload a document
                </button>
                <button
                  type="button"
                  className="button quiet"
                  style={{ fontSize: "11px" }}
                  onClick={() => setShowKeyModal(true)}
                >
                  🔑 Enter OpenRouter API key
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <article className={`chat-message ${message.role.toLowerCase()}`} key={message.id}>
                <span className="eyebrow">
                  {message.role === "USER" ? "You" : "AI Tutor"}
                </span>
                <div style={{ marginTop: "8px", fontSize: "13px", lineHeight: 1.6 }}>
                  {formatMessageContent(message.content)}
                </div>

                {message.sources && message.sources.length > 0 && (
                  <details style={{ marginTop: "14px", background: "rgba(0,0,0,0.25)", borderRadius: "8px", padding: "8px 12px", border: "1px solid rgba(132,229,188,0.15)" }}>
                    <summary style={{ cursor: "pointer", fontSize: "11px", color: "var(--mint)", fontWeight: 600 }}>
                      📚 Citations & Sources ({message.sources.length})
                    </summary>
                    <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                      {message.sources.map((source, index) => (
                        <blockquote key={index} style={{ margin: 0 }}>
                          <small>
                            {source.materialTitle} | {source.reference}
                          </small>
                          <br />
                          {source.text}
                        </blockquote>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            ))
          )}

          {busy && (
            <article className="chat-message tutor" style={{ opacity: 0.85 }}>
              <span className="eyebrow">AI Tutor</span>
              <p style={{ fontStyle: "italic", color: "var(--mint)" }}>
                Thinking & generating response...
              </p>
            </article>
          )}

          {uploading && (
            <article className="chat-message tutor" style={{ opacity: 0.85 }}>
              <span className="eyebrow">System</span>
              <p style={{ fontStyle: "italic", color: "var(--mint)" }}>
                Uploading, parsing, and indexing document...
              </p>
            </article>
          )}
        </div>

        {/* Input Form */}
        <form className="chat-form" onSubmit={ask}>
          {/* Active Context / Attachment bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--mist)" }}>
                <span>Context:</span>
                <select
                  value={materialId}
                  onChange={(event) => setMaterialId(event.target.value)}
                  style={{
                    height: "28px",
                    padding: "0 8px",
                    fontSize: "11px",
                    borderRadius: "7px",
                    background: "rgba(0,0,0,0.35)",
                    color: "var(--paper)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <option value="">🌐 General ChatGPT Mode (No document)</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      📄 {material.title}
                    </option>
                  ))}
                </select>
              </label>

              {selectedMaterial && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "rgba(132,229,188,0.12)",
                    color: "var(--mint)",
                    border: "1px solid rgba(132,229,188,0.25)",
                  }}
                >
                  <span>📎 Attached: {selectedMaterial.title}</span>
                  <button
                    type="button"
                    onClick={() => setMaterialId("")}
                    title="Detach document"
                    style={{ background: "none", border: "none", color: "var(--mint)", cursor: "pointer", fontWeight: "bold" }}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>

            {/* Direct Upload button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx"
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="button quiet"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || busy}
              style={{
                fontSize: "11px",
                height: "28px",
                padding: "0 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                borderRadius: "7px",
              }}
            >
              📎 {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>

          {/* Textarea + Ask Button */}
          <div style={{ display: "flex", gap: "9px", alignItems: "flex-end" }}>
            <textarea
              name="question"
              required
              minLength={1}
              maxLength={4000}
              placeholder={
                selectedMaterial
                  ? `Ask a question about ${selectedMaterial.title}...`
                  : "Ask anything freely like ChatGPT (e.g. explain a concept, write code, solve a problem)..."
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button className="button primary" disabled={busy || uploading}>
              {busy ? "Thinking..." : "Ask"}
            </button>
          </div>
        </form>
      </section>

      {/* OpenRouter API Key Modal */}
      {showKeyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setShowKeyModal(false)}
        >
          <div
            style={{
              background: "#0c1813",
              border: "1px solid rgba(132,229,188,0.3)",
              borderRadius: "16px",
              padding: "24px",
              width: "min(100%, 480px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--paper)" }}>🔑 OpenRouter AI Configuration</h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{ background: "none", border: "none", color: "var(--mist)", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--mist)", lineHeight: 1.5, margin: "0 0 16px" }}>
              Smart Study connects to <strong>OpenRouter</strong> to run <strong>NVIDIA Nemotron 3 Ultra</strong> (<code>nvidia/nemotron-3-ultra-550b-a55b:free</code>) and high-performance free models.
              Enter your API key below:
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginBottom: "6px" }}>
                OpenRouter API Key (starts with <code>sk-or-v1-</code>)
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-or-v1-..."
                style={{
                  width: "100%",
                  height: "38px",
                  borderRadius: "8px",
                  padding: "0 10px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "13px",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <p style={{ fontSize: "12px", color: "var(--mist)", margin: "0 0 20px" }}>
              Get a free API key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--mint)", textDecoration: "underline" }}
              >
                openrouter.ai/keys
              </a>
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {openRouterKey && (
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => {
                    setKeyInput("");
                    localStorage.removeItem("openrouter_api_key");
                    setOpenRouterKey("");
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
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </div>
  );
}
