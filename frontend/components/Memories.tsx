"use client";

import { FormEvent, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import styles from "./Memories.module.css";

type MemoryItem = {
  id: string;
  quote_text: string;
  burden_tag: string;
  cultural_tag: string;
  helped_count: number;
  author_persona?: string;
  is_featured?: boolean;
  created_at: string;
};

type SubmitMemoryResponse = {
  id?: string;
  quote_text?: string;
  burden_tag?: string;
  cultural_tag?: string;
  is_approved?: boolean;
  message?: string;
  detail?: string;
};

type HelpfulResponse = {
  status?: string;
  message?: string;
  detail?: string;
};

type ApiError = {
  message?: string;
  detail?: string;
  error?: string;
};

function buildAuthHeaders(token: string | null, includeJson = false) {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function parseApiError(data: ApiError | null, fallbackMessage: string) {
  return data?.message ?? data?.detail ?? data?.error ?? fallbackMessage;
}

type TabKey = "browse" | "submit" | "helpful";

export default function Memories() {
  const [activeTab, setActiveTab] = useState<TabKey>("browse");

  const [culturalFilter, setCulturalFilter] = useState("");
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesError, setMemoriesError] = useState("");
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  const [quoteText, setQuoteText] = useState("");
  const [burdenTag, setBurdenTag] = useState("anxiety");
  const [culturalTag, setCulturalTag] = useState("universal");
  const [sourceSessionId, setSourceSessionId] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState<SubmitMemoryResponse | null>(null);

  const [helpfulMemoryId, setHelpfulMemoryId] = useState("");
  const [helpfulLoading, setHelpfulLoading] = useState(false);
  const [helpfulError, setHelpfulError] = useState("");
  const [helpfulResult, setHelpfulResult] = useState<HelpfulResponse | null>(null);

  async function handleGetMemories(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    setMemoriesLoading(true);
    setMemoriesError("");

    try {
      const query = culturalFilter.trim()
        ? `?cultural_tag=${encodeURIComponent(culturalFilter.trim())}`
        : "";

      const response = await fetch(buildApiUrl(`/memories/${query}`), {
        method: "GET",
      });

      const data = (await response.json().catch(() => null)) as MemoryItem[] | ApiError | null;
      if (!response.ok) {
        throw new Error(parseApiError(data as ApiError | null, "Failed to load memories."));
      }

      setMemories(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load memories.";
      setMemoriesError(message);
      setMemories([]);
    } finally {
      setMemoriesLoading(false);
    }
  }

  async function handleSubmitMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quoteText.trim()) {
      setSubmitError("Quote text is required.");
      setSubmitResult(null);
      return;
    }

    if (!burdenTag.trim()) {
      setSubmitError("Burden tag is required.");
      setSubmitResult(null);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setSubmitError("You need to sign in before submitting a memory.");
      setSubmitResult(null);
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");
    setSubmitResult(null);

    try {
      const response = await fetch(buildApiUrl("/memories/"), {
        method: "POST",
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({
          quote_text: quoteText.trim(),
          burden_tag: burdenTag.trim(),
          cultural_tag: culturalTag.trim() || "universal",
          source_session_id: sourceSessionId.trim() || null,
        }),
      });

      const data = (await response.json().catch(() => null)) as SubmitMemoryResponse | ApiError | null;
      if (!response.ok) {
        const authFailure = response.status === 401 || response.status === 403;
        const fallback = authFailure
          ? "Session expired. Please sign in again before submitting memory."
          : "Failed to submit memory.";
        throw new Error(parseApiError(data as ApiError | null, fallback));
      }

      setSubmitResult(data as SubmitMemoryResponse);
      setQuoteText("");
      setBurdenTag("anxiety");
      setCulturalTag("universal");
      setSourceSessionId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit memory.";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleMarkHelpful(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!helpfulMemoryId.trim()) {
      setHelpfulError("Memory ID is required.");
      setHelpfulResult(null);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setHelpfulError("You need to sign in before marking a memory as helpful.");
      setHelpfulResult(null);
      return;
    }

    setHelpfulLoading(true);
    setHelpfulError("");
    setHelpfulResult(null);

    try {
      const response = await fetch(buildApiUrl(`/memories/${encodeURIComponent(helpfulMemoryId.trim())}/helpful`), {
        method: "POST",
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json().catch(() => null)) as HelpfulResponse | ApiError | null;
      if (!response.ok) {
        const authFailure = response.status === 401 || response.status === 403;
        const fallback = authFailure
          ? "Session expired. Please sign in again before marking helpful."
          : "Failed to mark memory as helpful.";
        throw new Error(parseApiError(data as ApiError | null, fallback));
      }

      setHelpfulResult(data as HelpfulResponse);
      setHelpfulMemoryId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to mark memory as helpful.";
      setHelpfulError(message);
    } finally {
      setHelpfulLoading(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Memory Wall</h2>
          <p className={styles.sub}>Browse shared moments from the community, add your own wisdom, and recognize what helps.</p>
        </div>

        <div className={styles.tabRow} role="tablist" aria-label="Memory tabs">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "browse" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("browse")}
            role="tab"
            aria-selected={activeTab === "browse"}
          >
            Browse Memories
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "submit" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("submit")}
            role="tab"
            aria-selected={activeTab === "submit"}
          >
            Share Your Memory
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "helpful" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("helpful")}
            role="tab"
            aria-selected={activeTab === "helpful"}
          >
            Mark as Helpful
          </button>
        </div>

        {activeTab === "browse" ? (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Browse approved memories</h3>
            <p className={styles.cardSub}>Filter by cultural background.</p>

            <form className={styles.formBody} onSubmit={handleGetMemories}>
              <input
                className={styles.input}
                type="text"
                value={culturalFilter}
                onChange={(event) => setCulturalFilter(event.target.value)}
                placeholder="Leave blank for all, or enter: universal, christian, muslim, jewish, etc."
              />
              <button type="submit" className={styles.submitBtn} disabled={memoriesLoading}>
                {memoriesLoading ? "Loading..." : "Load Memories"}
              </button>
            </form>

            {memoriesError ? <p className={styles.error}>{memoriesError}</p> : null}

            {memories.length > 0 ? (
              <ul className={styles.memoryList}>
                {memories.map((memory) => (
                  <li key={memory.id} className={styles.memoryItem}>
                    <p className={styles.memoryText}>{memory.quote_text}</p>
                    <p className={styles.memoryMeta}>
                      {memory.burden_tag && <span><strong>Burden:</strong> {memory.burden_tag}</span>}
                      {memory.cultural_tag && <span><strong>Culture:</strong> {memory.cultural_tag}</span>}
                      {memory.helped_count > 0 && <span><strong>Helpful:</strong> {memory.helped_count}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No memories loaded yet.</p>
            )}
          </section>
        ) : null}

        {activeTab === "submit" ? (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Share your memory</h3>
            <p className={styles.cardSub}>What wisdom or moment helped you? It will go through safety review before appearing.</p>

            <form className={styles.formBody} onSubmit={handleSubmitMemory}>
              <label className={styles.label} htmlFor="quote-text">
                Your memory
              </label>
              <textarea
                id="quote-text"
                className={styles.textarea}
                value={quoteText}
                onChange={(event) => setQuoteText(event.target.value)}
                placeholder="Write a quote, lesson, or moment that helped you..."
                rows={5}
              />

              <label className={styles.label} htmlFor="burden-tag">
                Primary burden or theme
              </label>
              <input
                id="burden-tag"
                className={styles.input}
                value={burdenTag}
                onChange={(event) => setBurdenTag(event.target.value)}
                placeholder="e.g., anxiety, grief, isolation, work stress"
              />

              <label className={styles.label} htmlFor="cultural-tag">
                Cultural background (optional)
              </label>
              <input
                id="cultural-tag"
                className={styles.input}
                value={culturalTag}
                onChange={(event) => setCulturalTag(event.target.value)}
                placeholder="e.g., universal, christian, muslim, jewish"
              />

              <label className={styles.label} htmlFor="source-session-id">
                Session ID (optional)
              </label>
              <input
                id="source-session-id"
                className={styles.input}
                value={sourceSessionId}
                onChange={(event) => setSourceSessionId(event.target.value)}
                placeholder="Link to session if this memory came from a group"
              />

              <button type="submit" className={styles.submitBtn} disabled={submitLoading}>
                {submitLoading ? "Submitting..." : "Submit Memory"}
              </button>
            </form>

            {submitError ? <p className={styles.error}>{submitError}</p> : null}
            {submitResult ? (
              <div className={styles.resultCard}>
                <p><strong>Memory submitted!</strong></p>
                <p>{submitResult.id && `ID: ${submitResult.id}`}</p>
                <p>Your memory has been sent for review.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "helpful" ? (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Mark a memory as helpful</h3>
            <p className={styles.cardSub}>Let others know when a memory resonated with you.</p>

            <form className={styles.formBody} onSubmit={handleMarkHelpful}>
              <label className={styles.label} htmlFor="memory-id">
                Memory ID
              </label>
              <input
                id="memory-id"
                className={styles.input}
                value={helpfulMemoryId}
                onChange={(event) => setHelpfulMemoryId(event.target.value)}
                placeholder="Paste the memory ID you found helpful"
              />

              <button type="submit" className={styles.submitBtn} disabled={helpfulLoading}>
                {helpfulLoading ? "Saving..." : "Mark as Helpful"}
              </button>
            </form>

            {helpfulError ? <p className={styles.error}>{helpfulError}</p> : null}
            {helpfulResult ? (
              <div className={styles.resultCard}>
                <p><strong>Thanks!</strong> Your vote has been recorded.</p>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}
