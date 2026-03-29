"use client";

import { FormEvent, useMemo, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import styles from "./Journal.module.css";

type AudioJournalResponse = {
  entry_id?: string;
  storage_path?: string;
  status?: string;
  message?: string;
  detail?: string;
};

type TextJournalResponse = {
  id?: string;
  input_type?: string;
  assigned_persona?: string;
  persona_confidence?: number;
  burden_themes?: string[];
  recognition_message?: string;
  micro_intervention?: string;
  crisis_detected?: boolean;
  created_at?: string;
  message?: string;
};

type JournalHistoryEntry = {
  id: string;
  input_type?: "audio" | "text";
  assigned_persona: string;
  burden_themes?: string[];
  crisis_detected: boolean;
  created_at: string;
};

type JournalHistoryResponse = {
  entries?: JournalHistoryEntry[];
  message?: string;
  detail?: string;
};

function buildAuthHeaders(token: string | null, includeJson = false) {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function Journal() {
  const [openPanel, setOpenPanel] = useState<"audio" | "text" | "history">("audio");

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioResult, setAudioResult] = useState<AudioJournalResponse | null>(null);
  const [audioError, setAudioError] = useState("");

  const [rawTranscript, setRawTranscript] = useState("");
  const [assignedPersona, setAssignedPersona] = useState("ground");
  const [personaConfidence, setPersonaConfidence] = useState("0.8");
  const [burdenThemes, setBurdenThemes] = useState("anxiety");
  const [recognitionMessage, setRecognitionMessage] = useState("I hear your burden, and you are not carrying this alone.");
  const [microIntervention, setMicroIntervention] = useState("Take three slow breaths and name one small step you can take today.");
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [crisisKeywords, setCrisisKeywords] = useState("");

  const [textLoading, setTextLoading] = useState(false);
  const [textResult, setTextResult] = useState<TextJournalResponse | null>(null);
  const [textError, setTextError] = useState("");

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<JournalHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const parsedThemes = useMemo(
    () => burdenThemes.split(",").map((item) => item.trim()).filter(Boolean),
    [burdenThemes],
  );

  const parsedCrisisKeywords = useMemo(
    () => crisisKeywords.split(",").map((item) => item.trim()).filter(Boolean),
    [crisisKeywords],
  );

  async function handleAudioSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!audioFile) {
      setAudioError("Please choose an audio file first.");
      setAudioResult(null);
      return;
    }

    setAudioLoading(true);
    setAudioError("");
    setAudioResult(null);

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error("You need to sign in before submitting an audio journal.");
      }

      const formData = new FormData();
      formData.append("audio", audioFile);

      const response = await fetch(buildApiUrl("/journal/audio"), {
        method: "POST",
        headers: buildAuthHeaders(token),
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as AudioJournalResponse | null;
      if (!response.ok) {
        const authFailure = response.status === 401 || response.status === 403;
        const errorMessage = data?.message ?? data?.detail;
        throw new Error(
          authFailure
            ? errorMessage ?? "Session expired. Please sign in again before submitting audio."
            : errorMessage ?? "Failed to submit audio journal.",
        );
      }

      setAudioResult(data);
    } catch (apiError) {
      setAudioError(apiError instanceof Error ? apiError.message : "Failed to submit audio journal.");
    } finally {
      setAudioLoading(false);
    }
  }

  async function handleTextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!rawTranscript.trim()) {
      setTextError("Please enter journal text.");
      setTextResult(null);
      return;
    }

    setTextLoading(true);
    setTextError("");
    setTextResult(null);

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl("/journal/text"), {
        method: "POST",
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({
          raw_transcript: rawTranscript.trim(),
          assigned_persona: assignedPersona.trim() || "ground",
          persona_confidence: Number(personaConfidence),
          burden_themes: parsedThemes,
          recognition_message: recognitionMessage.trim(),
          micro_intervention: microIntervention.trim(),
          crisis_detected: crisisDetected,
          crisis_keywords: parsedCrisisKeywords,
          ai_model_used: "claude-sonnet-4-20250514",
          ai_processing_ms: 0,
        }),
      });

      const data = (await response.json().catch(() => null)) as TextJournalResponse | null;
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to submit text journal.");
      }

      setTextResult(data);
    } catch (apiError) {
      setTextError(apiError instanceof Error ? apiError.message : "Failed to submit text journal.");
    } finally {
      setTextLoading(false);
    }
  }

  async function handleLoadHistory() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl("/journal/history"), {
        method: "GET",
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json().catch(() => null)) as JournalHistoryEntry[] | JournalHistoryResponse | null;
      if (!response.ok) {
        const maybeError = data as JournalHistoryResponse | null;
        throw new Error(maybeError?.message ?? "Failed to load journal history.");
      }

      const resolvedEntries = Array.isArray(data) ? data : (data?.entries ?? []);
      setHistoryData(resolvedEntries);
    } catch (apiError) {
      setHistoryError(apiError instanceof Error ? apiError.message : "Failed to load journal history.");
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDeleteHistoryEntry(entryId: string) {
    const approved = window.confirm("Delete this journal entry? This cannot be undone.");
    if (!approved) {
      return;
    }

    setDeletingEntryId(entryId);
    setHistoryError("");

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl(`/journal/history/${encodeURIComponent(entryId)}`), {
        method: "DELETE",
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json().catch(() => null)) as JournalHistoryResponse | null;
      if (!response.ok) {
        throw new Error(data?.message ?? data?.detail ?? "Failed to delete journal entry.");
      }

      setHistoryData((previous) => previous.filter((entry) => entry.id !== entryId));
    } catch (apiError) {
      setHistoryError(apiError instanceof Error ? apiError.message : "Failed to delete journal entry.");
    } finally {
      setDeletingEntryId(null);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Journal</h2>

        <div className={styles.panel}>
          <button type="button" className={styles.panelHeader} onClick={() => setOpenPanel((cur) => (cur === "audio" ? "history" : "audio"))}>
            <div className={styles.panelHeaderLeft}>
              <span className={`${styles.methodTag} ${styles.post}`}>POST</span>
              <strong>/journal/audio</strong>
              <span>Submit Audio Journal</span>
            </div>
            <span className={styles.chevron}>{openPanel === "audio" ? "^" : "v"}</span>
          </button>

          {openPanel === "audio" ? (
            <form className={styles.panelBody} onSubmit={handleAudioSubmit}>
              <input type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
              <button type="submit" className={styles.actionBtn} disabled={audioLoading}>
                {audioLoading ? "Submitting..." : "Submit Audio"}
              </button>
              {audioError ? <p className={styles.error}>{audioError}</p> : null}
              {audioResult ? (
                <div className={styles.resultCard}>
                  <p><strong>entry_id:</strong> {audioResult.entry_id ?? "-"}</p>
                  <p><strong>storage_path:</strong> {audioResult.storage_path ?? "-"}</p>
                  <p><strong>status:</strong> {audioResult.status ?? "-"}</p>
                </div>
              ) : null}
            </form>
          ) : null}
        </div>

        <div className={styles.panel}>
          <button type="button" className={styles.panelHeader} onClick={() => setOpenPanel((cur) => (cur === "text" ? "history" : "text"))}>
            <div className={styles.panelHeaderLeft}>
              <span className={`${styles.methodTag} ${styles.post}`}>POST</span>
              <strong>/journal/text</strong>
              <span>Submit Text Journal</span>
            </div>
            <span className={styles.chevron}>{openPanel === "text" ? "^" : "v"}</span>
          </button>

          {openPanel === "text" ? (
            <form className={styles.panelBody} onSubmit={handleTextSubmit}>
              <textarea
                className={styles.textarea}
                value={rawTranscript}
                onChange={(event) => setRawTranscript(event.target.value)}
                placeholder="Write your journal..."
                rows={4}
              />

              <div className={styles.grid2}>
                <label>
                  Assigned persona
                  <input value={assignedPersona} onChange={(event) => setAssignedPersona(event.target.value)} />
                </label>
                <label>
                  Persona confidence (0-1)
                  <input value={personaConfidence} onChange={(event) => setPersonaConfidence(event.target.value)} />
                </label>
                <label>
                  Burden themes (comma-separated)
                  <input value={burdenThemes} onChange={(event) => setBurdenThemes(event.target.value)} />
                </label>
                <label className={styles.full}>
                  Recognition message
                  <input value={recognitionMessage} onChange={(event) => setRecognitionMessage(event.target.value)} />
                </label>
                <label className={styles.full}>
                  Micro intervention
                  <input value={microIntervention} onChange={(event) => setMicroIntervention(event.target.value)} />
                </label>
                <label className={styles.full}>
                  Crisis keywords (comma-separated)
                  <input value={crisisKeywords} onChange={(event) => setCrisisKeywords(event.target.value)} />
                </label>
              </div>

              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={crisisDetected} onChange={(event) => setCrisisDetected(event.target.checked)} />
                <span>Crisis detected</span>
              </label>

              <button type="submit" className={styles.actionBtn} disabled={textLoading}>
                {textLoading ? "Submitting..." : "Submit Text"}
              </button>
              {textError ? <p className={styles.error}>{textError}</p> : null}
              {textResult ? (
                <div className={styles.resultCard}>
                  <p><strong>id:</strong> {textResult.id ?? "-"}</p>
                  <p><strong>persona:</strong> {textResult.assigned_persona ?? "-"}</p>
                  <p><strong>crisis_detected:</strong> {String(textResult.crisis_detected ?? false)}</p>
                  <p><strong>created_at:</strong> {textResult.created_at ?? "-"}</p>
                </div>
              ) : null}
            </form>
          ) : null}
        </div>

        <div className={styles.panel}>
          <button type="button" className={styles.panelHeader} onClick={() => setOpenPanel((cur) => (cur === "history" ? "audio" : "history"))}>
            <div className={styles.panelHeaderLeft}>
              <span className={`${styles.methodTag} ${styles.get}`}>GET</span>
              <strong>/journal/history</strong>
              <span>Get Journal History</span>
            </div>
            <span className={styles.chevron}>{openPanel === "history" ? "^" : "v"}</span>
          </button>

          {openPanel === "history" ? (
            <div className={styles.panelBody}>
              <button type="button" className={styles.actionBtn} onClick={handleLoadHistory} disabled={historyLoading}>
                {historyLoading ? "Loading..." : "Load History"}
              </button>
              {historyError ? <p className={styles.error}>{historyError}</p> : null}
              {historyData.length > 0 ? (
                <ul className={styles.historyList}>
                  {historyData.map((entry) => (
                    <li key={entry.id}>
                      <p><strong>{(entry.input_type ?? "audio").toUpperCase()}</strong> • {entry.assigned_persona}</p>
                      <p>themes: {entry.burden_themes?.join(", ") || "none"}</p>
                      <p>crisis: {String(entry.crisis_detected)} • {new Date(entry.created_at).toLocaleString()}</p>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => void handleDeleteHistoryEntry(entry.id)}
                        disabled={deletingEntryId === entry.id}
                      >
                        {deletingEntryId === entry.id ? "Deleting..." : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>No history loaded yet.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
