"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { demoFlashcards, demoMaterials } from "../demo-data";
import { Navbar } from "../navbar";

type Card = {
  id: number;
  materialId: number | null;
  front: string;
  back: string;
  sourceReference: string | null;
  nextReview: string;
  reviewCount: number;
  intervalDays: number;
};

function renderCardContent(front: string, back: string, isRevealed: boolean) {
  const clozeRegex = /\{\{\s*c\d+::(.*?)(?:::.*?)?\s*\}\}/g;
  const hasCloze = clozeRegex.test(front);

  if (hasCloze) {
    if (!isRevealed) {
      const parts = front.split(/(\{\{\s*c\d+::.*?\s*\}\})/g);
      return (
        <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {parts.map((part, i) => {
            const match = part.match(/\{\{\s*c\d+::(.*?)(?:::.*?)?\s*\}\}/);
            if (match) {
              return (
                <span key={i} className="cloze-blank">
                  [ ... ]
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    } else {
      const parts = front.split(/(\{\{\s*c\d+::.*?\s*\}\})/g);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", width: "100%" }}>
          <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {parts.map((part, i) => {
              const match = part.match(/\{\{\s*c\d+::(.*?)(?:::.*?)?\s*\}\}/);
              if (match) {
                return (
                  <mark key={i} className="cloze-revealed">
                    {match[1]}
                  </mark>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </span>
          {back && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "12px",
                background: "rgba(196, 255, 106, 0.1)",
                border: "1px solid rgba(196, 255, 106, 0.35)",
                color: "var(--lime)",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              <span>Target:</span>
              <span>{back}</span>
            </div>
          )}
        </div>
      );
    }
  }

  // Standard Q&A card
  return (
    <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
      {isRevealed ? back : front}
    </span>
  );
}

type Material = {
  id: number;
  title: string;
  status: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [cardCount, setCardCount] = useState(6);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

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
      const [cRes, mRes] = await Promise.all([
        fetch(`${API}/flashcards`, { credentials: "include" }),
        fetch(`${API}/materials`, { credentials: "include" }),
      ]);

      if (cRes.status === 401 || cRes.status === 403) {
        router.push("/login");
        return;
      }

      if (!cRes.ok || !mRes.ok) throw new Error("Could not load flashcards.");

      const rawCards = await cRes.json();
      const rawMats = await mRes.json();
      setCards(Array.isArray(rawCards) ? rawCards : rawCards?.content ?? []);
      setMaterials(Array.isArray(rawMats) ? rawMats : rawMats?.content ?? []);
    } catch {
      setDemoMode(true);
      setCards(demoFlashcards);
      setMaterials(demoMaterials);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Generate flashcards by Topic
  async function generateByTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const formTopic = ((formData.get("topic") as string) || topicInput).trim();
    if (!formTopic) return;

    setBusy("topic");
    setError("");
    setNotice("");

    try {
      if (demoMode) {
        const synthesized: Card[] = [
          {
            id: Date.now() + 1,
            materialId: null,
            front: `What is the core definition of ${formTopic}?`,
            back: `${formTopic} involves foundational concepts, mechanisms, and systematic problem solving.`,
            sourceReference: `${formTopic} Fundamentals`,
            nextReview: new Date().toISOString().slice(0, 10),
            reviewCount: 0,
            intervalDays: 0,
          },
          {
            id: Date.now() + 2,
            materialId: null,
            front: `What are key applications and use cases of ${formTopic}?`,
            back: `Used for scalable architecture, optimization, and solving domain-specific challenges.`,
            sourceReference: `${formTopic} Applications`,
            nextReview: new Date().toISOString().slice(0, 10),
            reviewCount: 0,
            intervalDays: 0,
          },
        ];
        setCards((curr) => [...synthesized, ...curr]);
        setIndex(0);
        setRevealed(false);
        setNotice(`Generated flashcards for topic: ${formTopic}`);
        setTopicInput("");
        return;
      }

      const openRouterKey = typeof window !== "undefined" ? localStorage.getItem("openrouter_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (openRouterKey) headers["X-OpenRouter-Api-Key"] = openRouterKey;

      const response = await fetch(`${API}/flashcards/generate`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ topic: formTopic, count: cardCount }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.detail || result.message || "Could not generate cards.");

      setNotice(`Generated ${Array.isArray(result) ? result.length : "new"} flashcards on "${formTopic}"!`);
      setTopicInput("");
      await load();
      setIndex(0);
      setRevealed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to generate flashcards.");
    } finally {
      setBusy(null);
    }
  }

  // Generate flashcards from selected Material
  async function generateByMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const materialId = Number(new FormData(form).get("materialId"));
    if (!materialId) return;

    setBusy("material");
    setError("");
    setNotice("");

    try {
      if (demoMode) {
        const found = demoFlashcards.filter((card) => card.materialId === materialId);
        setCards((curr) => [...found, ...curr.filter((c) => c.materialId !== materialId)]);
        setIndex(0);
        setRevealed(false);
        return;
      }

      const openRouterKey = typeof window !== "undefined" ? localStorage.getItem("openrouter_api_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (openRouterKey) headers["X-OpenRouter-Api-Key"] = openRouterKey;

      const response = await fetch(`${API}/flashcards/generate`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ materialId, count: cardCount }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.detail || result.message || "Could not generate cards.");

      setNotice("Generated flashcards from your study material!");
      await load();
      setIndex(0);
      setRevealed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate cards from this material.");
    } finally {
      setBusy(null);
    }
  }

  // Create card manually
  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const front = String(form.get("front") || "").trim();
    const back = String(form.get("back") || "").trim();
    if (!front || !back) return;

    try {
      if (demoMode) {
        setCards((curr) => [
          {
            id: Date.now(),
            materialId: null,
            front,
            back,
            sourceReference: "manual",
            nextReview: new Date().toISOString().slice(0, 10),
            reviewCount: 0,
            intervalDays: 0,
          },
          ...curr,
        ]);
        formElement.reset();
        setNotice("Custom flashcard added.");
        return;
      }

      const response = await fetch(`${API}/flashcards`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front, back }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Could not save card.");

      setCards((curr) => [result as Card, ...curr]);
      formElement.reset();
      setNotice("Custom flashcard saved to your deck.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save card.");
    }
  }

  async function deleteCard(cardId: number) {
    if (demoMode) {
      setCards((curr) => curr.filter((c) => c.id !== cardId));
      if (index >= cards.length - 1) setIndex(Math.max(0, cards.length - 2));
      return;
    }
    try {
      const resp = await fetch(`${API}/flashcards/${cardId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (resp.ok) {
        setCards((curr) => curr.filter((c) => c.id !== cardId));
        if (index >= cards.length - 1) {
          setIndex(Math.max(0, cards.length - 2));
        }
        setNotice("Card removed from your deck.");
      }
    } catch {
      setError("Could not delete flashcard.");
    }
  }

  // SM-2 Review submission
  async function review(quality: number) {
    const card = cards[index];
    if (!card) return;
    setBusy("review");

    try {
      if (demoMode) {
        const intervals: Record<number, number> = { 0: 0, 2: 1, 3: 3, 5: 7 };
        const interval = intervals[quality] ?? 1;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + interval);
        setCards((curr) =>
          curr.map((item) =>
            item.id === card.id
              ? { ...item, reviewCount: item.reviewCount + 1, intervalDays: interval, nextReview: dueDate.toISOString().slice(0, 10) }
              : item
          )
        );
        setIndex((curr) => (curr + 1) % cards.length);
        setRevealed(false);
        return;
      }

      const mappedQuality = quality > 3 ? 3 : quality;
      const response = await fetch(`${API}/flashcards/${card.id}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality: mappedQuality }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error("Review could not be saved.");

      const cardData = (result.card ?? result) as Card;
      setCards((curr) => curr.map((item) => (item.id === card.id ? cardData : item)));
      setIndex((curr) => (cards.length > 0 ? (curr + 1) % cards.length : 0));
      setRevealed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  const currentCard = cards[index];
  const dueCount = cards.filter((item) => item.nextReview <= new Date().toISOString().slice(0, 10)).length;

  return (
    <>
      <Navbar />
      <main className="task-page" style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 24px" }}>
        {/* Main Content */}
        <section className="task-content">
        {demoMode && (
          <div className="demo-banner">
            <strong>Preview mode</strong>
            <span>Sample flashcards can be reviewed here. Ratings are saved locally for this preview.</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={14} /> Active Recall &amp; Spaced Repetition
              <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "rgba(132,229,188,0.15)", color: "var(--mint)", border: "1px solid rgba(132,229,188,0.3)" }}>
                {openRouterKey ? "⚡ Nemotron 3 Ultra (OpenRouter)" : "⚡ Free AI Models Active"}
              </span>
            </p>
            <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "6px 0", letterSpacing: "-0.03em" }}>
              Flashcards &amp; Memory Retention.
            </h1>
            <p className="task-lead" style={{ maxWidth: "700px", color: "var(--mist)", fontSize: "14px", margin: 0 }}>
              Generate high-yield flashcards according to any topic you enter or from your uploaded materials. Review using SM-2 spaced repetition intervals.
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

        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="success-note" role="status">{notice}</p>}

        {/* SECTION 1: Generate by Topic */}
        <section
          className="glass-panel"
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(16, 29, 24, 0.85))",
            padding: "22px 24px",
            borderRadius: "16px",
            border: "1px solid var(--line-bright)",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <p className="eyebrow" style={{ color: "var(--lime)", marginBottom: "4px" }}>
                <Sparkles size={13} style={{ display: "inline", marginRight: "4px" }} />
                Instant AI Deck Generator
              </p>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--paper)" }}>
                Generate Flashcards by Topic
              </h2>
            </div>
            <span style={{ fontSize: "11px", color: "var(--mint)" }}>⚡ Enter any subject, concept, or theorem</span>
          </div>

          <form
            id="topic-flashcards-form"
            onSubmit={generateByTopic}
            style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}
          >
            <div style={{ flex: "1 1 320px" }}>
              <label htmlFor="topic-flashcard-input" style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginBottom: "6px" }}>
                Topic / Subject Name
              </label>
              <input
                id="topic-flashcard-input"
                name="topic"
                type="text"
                required
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Operating Systems Virtual Memory, Python OOP, Calculus Derivatives..."
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ width: "120px" }}>
              <label htmlFor="card-count-select" style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginBottom: "6px" }}>
                Deck Size
              </label>
              <select
                id="card-count-select"
                name="count"
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 10px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "12px",
                }}
              >
                <option value={5}>5 Cards</option>
                <option value={8}>8 Cards</option>
                <option value={12}>12 Cards</option>
                <option value={16}>16 Cards</option>
              </select>
            </div>

            <button
              id="generate-topic-flashcards-btn"
              type="submit"
              className="button primary"
              disabled={busy === "topic"}
              style={{ height: "42px", padding: "0 22px" }}
            >
              {busy === "topic" ? "Generating..." : "Generate on Topic"}
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick topic starter chips */}
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
                id={`quick-topic-btn-${i}`}
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

        {/* SECTION 2: Generate from Notes Dropdown */}
        {materials.filter((m) => m.status === "COMPLETED").length > 0 && (
          <section
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--line)",
              marginBottom: "32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <BookOpen size={16} color="var(--mint)" />
              <div>
                <strong style={{ fontSize: "13px", display: "block", color: "var(--paper)" }}>
                  Generate from uploaded study notes
                </strong>
                <span style={{ fontSize: "11px", color: "var(--mist)" }}>
                  Extract definitions and cloze deletions from your library
                </span>
              </div>
            </div>

            <form onSubmit={generateByMaterial} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                name="materialId"
                required
                defaultValue=""
                style={{
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "9px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "12px",
                  maxWidth: "260px",
                }}
              >
                <option value="" disabled>Select note...</option>
                {materials
                  .filter((m) => m.status === "COMPLETED")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
              </select>
              <button
                type="submit"
                className="button quiet"
                disabled={busy === "material"}
                style={{ height: "38px", fontSize: "12px" }}
              >
                {busy === "material" ? "Extracting..." : "Generate from Notes"}
              </button>
            </form>
          </section>
        )}

        {/* SECTION 3: Flashcard Study Queue */}
        <section className="review-section" style={{ marginTop: "16px" }}>
          <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={12} /> {dueCount} due for review today
              </p>
              <h2 style={{ fontSize: "20px", margin: "2px 0 0" }}>Interactive Study Deck</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--mist)", padding: "4px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                {cards.length} cards total
              </span>
            </div>
          </div>

          {!currentCard ? (
            <div className="empty-state" style={{ padding: "48px 24px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px dashed var(--line)" }}>
              <Layers size={32} color="var(--mint)" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px" }}>No Flashcards in Deck</h3>
              <p style={{ fontSize: "13px", color: "var(--mist)", maxWidth: "440px", margin: "0 auto" }}>
                Enter any topic above to generate a new study deck, or create a card manually below.
              </p>
            </div>
          ) : (
            <div>
              {/* Interactive Flashcard Card */}
              <div
                tabIndex={0}
                role="button"
                onClick={() => setRevealed((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setRevealed((v) => !v);
                  }
                }}
                className="flashcard glass-panel"
                style={{
                  minHeight: "270px",
                  padding: "26px 30px",
                  borderRadius: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "stretch",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: revealed ? "1px solid var(--lime)" : "1px solid var(--line-bright)",
                  background: revealed
                    ? "linear-gradient(145deg, rgba(196, 255, 106, 0.08), rgba(16, 29, 24, 0.9))"
                    : "linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(16, 29, 24, 0.85))",
                }}
                aria-label={revealed ? "Hide explanation" : "Reveal explanation"}
              >
                <div className="flashcard-header">
                  <span
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontWeight: 800,
                      color: revealed ? "var(--lime)" : "var(--mint)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {revealed ? <CheckCircle2 size={13} /> : <RotateCw size={13} />}
                    {revealed ? "EXPLANATION / ANSWER" : "QUESTION / PROMPT"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--mist)" }}>
                      Card {index + 1} of {cards.length}
                    </span>
                    <button
                      type="button"
                      title="Delete card from deck"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCard(currentCard.id);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "8px",
                        color: "var(--mist)",
                        cursor: "pointer",
                        padding: "3px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#f87171";
                        e.currentTarget.style.borderColor = "rgba(248,113,113,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--mist)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                      }}
                    >
                      <Trash2 size={11} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="flashcard-body">
                  <div className="flashcard-text">
                    {renderCardContent(currentCard.front, currentCard.back, revealed)}
                  </div>
                </div>

                <div className="flashcard-footer" style={{ fontSize: "11px", color: "var(--mist)" }}>
                  <span>
                    Source: <strong style={{ color: "var(--paper)" }}>{currentCard.sourceReference ?? "Topic Synthesizer"}</strong>
                  </span>
                  <span style={{ color: "var(--mint)", fontWeight: 600 }}>
                    {revealed ? "Click to flip back" : "Click anywhere to flip"}
                  </span>
                </div>
              </div>

              {/* SM-2 Recall Controls */}
              <div
                className="review-controls"
                style={{
                  marginTop: "20px",
                  padding: "16px 20px",
                  borderRadius: "14px",
                  background: "rgba(0,0,0,0.3)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--mist)", fontWeight: 600 }}>
                    Rate your recall memory:
                  </p>
                  <span style={{ fontSize: "11px", color: "var(--mist)" }}>
                    Adjusts spaced repetition interval
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { q: 0, label: "Again", desc: "1 day", color: "var(--coral)" },
                    { q: 2, label: "Hard", desc: "2 days", color: "var(--gold)" },
                    { q: 3, label: "Good", desc: "3 days", color: "var(--mint)" },
                    { q: 5, label: "Easy", desc: "7 days", color: "var(--lime)" },
                  ].map((btn) => (
                    <button
                      key={btn.q}
                      className="button quiet"
                      disabled={!revealed || busy === "review"}
                      onClick={() => void review(btn.q)}
                      style={{
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: 700,
                        borderColor: revealed ? "var(--line-bright)" : "var(--line)",
                      }}
                    >
                      <span style={{ color: btn.color }}>{btn.label}</span>
                      <span style={{ fontSize: "10px", color: "var(--mist)", marginLeft: "4px" }}>
                        ({btn.desc})
                      </span>
                    </button>
                  ))}
                </div>

                {/* Deck Navigation Controls */}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="small-action"
                    disabled={index === 0}
                    onClick={() => {
                      setIndex((i) => Math.max(0, i - 1));
                      setRevealed(false);
                    }}
                    title="Previous Card"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="small-action"
                    disabled={index >= cards.length - 1}
                    onClick={() => {
                      setIndex((i) => Math.min(cards.length - 1, i + 1));
                      setRevealed(false);
                    }}
                    title="Next Card"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <p className="question-source" style={{ textAlign: "center", marginTop: "14px", fontSize: "11px", color: "var(--mist)" }}>
                Reviewed {currentCard.reviewCount} times &bull; Next due on {currentCard.nextReview} &bull; Interval: {currentCard.intervalDays} days
              </p>
            </div>
          )}
        </section>

        {/* SECTION 4: Create Flashcard Manually */}
        <details className="manual-task" style={{ marginTop: "32px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid var(--line)", padding: "16px 20px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "13px", color: "var(--paper)" }}>
            <Plus size={14} style={{ display: "inline", marginRight: "6px" }} />
            Create a custom card manually
          </summary>
          <form className="manual-card-form" onSubmit={handleCreate} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginBottom: "4px" }}>
                Front (Question or Term)
              </label>
              <textarea
                name="front"
                required
                maxLength={4000}
                placeholder="e.g. What is the Time Complexity of QuickSort in the average case?"
                style={{
                  width: "100%",
                  minHeight: "64px",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "13px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--mist)", marginBottom: "4px" }}>
                Back (Answer or Explanation)
              </label>
              <textarea
                name="back"
                required
                maxLength={10000}
                placeholder="e.g. O(N log N) on average when pivot splits array reasonably well; O(N^2) in worst case."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  fontSize: "13px",
                }}
              />
            </div>
            <button type="submit" className="button primary" style={{ alignSelf: "flex-start" }}>
              Save Custom Card
            </button>
          </form>
        </details>
      </section>

      {/* OpenRouter API Key Modal */}
      {showKeyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
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
              background: "#0f1715",
              border: "1px solid var(--line-bright)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🔑</span> Configure OpenRouter Key
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{ background: "none", border: "none", color: "var(--mist)", cursor: "pointer", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--mist)", lineHeight: "1.5", margin: "0 0 16px" }}>
              Enter your OpenRouter API key to power flashcard generation with <strong>NVIDIA Nemotron 3 Ultra</strong> (<code>nvidia/nemotron-3-ultra-550b-a55b:free</code>). Your key is stored securely in your browser session.
            </p>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", color: "var(--mint)", marginBottom: "6px", fontWeight: 600 }}>
                OPENROUTER API KEY
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-or-v1-..."
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.5)",
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
    </>
  );
}
