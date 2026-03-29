"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import styles from "./JournalPanel.module.css";

type AudioJournalResponse = {
  entry_id?: string;
  storage_path?: string;
  status?: string;
  message?: string;
  detail?: string;
};

type JournalHistoryEntry = {
  id: string;
  input_type?: "audio";
  assigned_persona: string;
  burden_themes: string[];
  crisis_detected: boolean;
  created_at: string;
  transcript?: string | null;
  transcript_length?: number | null;
  audio_url?: string | null;
  added_date?: string;
  added_time?: string;
};

type JournalHistoryResponse = {
  entries?: JournalHistoryEntry[];
  message?: string;
  detail?: string;
};

type JournalEntryDetailResponse = JournalHistoryEntry & {
  message?: string;
  detail?: string;
};

function buildAuthHeaders(token: string | null, includeJson = false) {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function JournalPanel() {
  const [activeTab, setActiveTab] = useState<"audio" | "history">("audio");

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioResult, setAudioResult] = useState<AudioJournalResponse | null>(null);
  const [audioError, setAudioError] = useState("");
  const [audioSubmitted, setAudioSubmitted] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<JournalHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<JournalEntryDetailResponse | null>(null);
  const [entryDetailLoading, setEntryDetailLoading] = useState(false);
  const [entryDetailError, setEntryDetailError] = useState("");

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  async function startRecording() {
    setAudioError("");
    setAudioResult(null);
    setAudioSubmitted(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl("");
      }

      setRecordedAudioBlob(null);
      setRecordingSeconds(0);
      setAudioSubmitted(false);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          setRecordedAudioBlob(audioBlob);
          setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((previous) => previous + 1);
      }, 1000);
    } catch (recordError) {
      const message = recordError instanceof Error ? recordError.message : "Unable to access microphone.";
      setAudioError(message);
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state !== "recording") {
      return;
    }

    recorderRef.current.stop();
    setIsRecording(false);
  }

  function discardRecording() {
    if (isRecording) {
      stopRecording();
    }

    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }

    setRecordedAudioBlob(null);
    setRecordedAudioUrl("");
    setRecordingSeconds(0);
    setAudioError("");
    setAudioResult(null);
    setAudioSubmitted(false);
  }

  async function handleAudioSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recordedAudioBlob) {
      setAudioError("Please record audio first.");
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
      formData.append("audio", recordedAudioBlob, `journal-${Date.now()}.webm`);

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
      setAudioSubmitted(true);
    } catch (apiError) {
      setAudioError(apiError instanceof Error ? apiError.message : "Failed to submit audio journal.");
    } finally {
      setAudioLoading(false);
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
      setSelectedEntryId(null);
      setSelectedEntryDetail(null);
      setEntryDetailError("");
    } catch (apiError) {
      setHistoryError(apiError instanceof Error ? apiError.message : "Failed to load journal history.");
      setHistoryData([]);
      setSelectedEntryId(null);
      setSelectedEntryDetail(null);
      setEntryDetailError("");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSelectHistoryEntry(entryId: string) {
    if (entryId === selectedEntryId) {
      setSelectedEntryId(null);
      setSelectedEntryDetail(null);
      setEntryDetailError("");
      return;
    }

    setSelectedEntryId(entryId);
    setEntryDetailLoading(true);
    setEntryDetailError("");
    setSelectedEntryDetail(null);

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl(`/journal/history/${encodeURIComponent(entryId)}`), {
        method: "GET",
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json().catch(() => null)) as JournalEntryDetailResponse | null;
      if (!response.ok) {
        throw new Error(data?.message ?? data?.detail ?? "Failed to load journal transcript.");
      }

      setSelectedEntryDetail(data);
    } catch (apiError) {
      setEntryDetailError(apiError instanceof Error ? apiError.message : "Failed to load journal transcript.");
    } finally {
      setEntryDetailLoading(false);
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
        <div className={styles.headingRow}>
          <span className={styles.headingIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 5.5h8.5a1.5 1.5 0 0 1 1.5 1.5v11.5H8.5A1.5 1.5 0 0 1 7 17V5.5Z" stroke="currentColor" strokeWidth="1.7" />
              <path d="M9.8 9.2h4.8M9.8 12h4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <h2 className={styles.heading}>Journal</h2>
        </div>
        <p className={styles.subtitle}>Speak and revisit your audio entries from one place.</p>

        <div className={styles.tabRow} role="tablist" aria-label="Journal tabs">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "audio" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            Audio Journal
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "history" ? styles.tabActive : ""}`}
            onClick={() => {
              setActiveTab("history");
              void handleLoadHistory();
            }}
          >
            History
          </button>
        </div>

        {activeTab === "audio" ? (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Record your voice journal</h3>
            <p className={styles.cardSub}>Use your microphone to capture what you are feeling right now.</p>

            <div className={styles.recorderRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={isRecording ? stopRecording : () => void startRecording()}
                disabled={audioLoading}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
              <span className={styles.timerBadge}>{isRecording ? `Recording ${recordingSeconds}s` : "Not recording"}</span>
            </div>

            {recordedAudioUrl ? <audio controls className={styles.audioPreview} src={recordedAudioUrl} /> : null}

            {recordedAudioBlob ? (
              <button type="button" className={styles.secondaryBtn} onClick={discardRecording} disabled={audioLoading}>
                Discard Recording
              </button>
            ) : null}

            <form onSubmit={handleAudioSubmit}>
              <button type="submit" className={styles.submitBtn} disabled={audioLoading || !recordedAudioBlob || audioSubmitted}>
                {audioLoading ? "Submitting..." : "Submit Audio Journal"}
              </button>
            </form>

            {audioError ? <p className={styles.error}>{audioError}</p> : null}
            {audioResult ? (
              <div className={styles.resultCard}>
                <p><strong>Entry ID:</strong> {audioResult.entry_id ?? "-"}</p>
                <p><strong>Status:</strong> {audioResult.status ?? "-"}</p>
                <p><strong>Storage:</strong> {audioResult.storage_path ?? "-"}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "history" ? (
          <section className={styles.card}>
            <div className={styles.historyHeader}>
              <h3 className={styles.cardTitle}>Journal History</h3>
              <button type="button" className={styles.primaryBtn} onClick={() => void handleLoadHistory()} disabled={historyLoading}>
                {historyLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {historyError ? <p className={styles.error}>{historyError}</p> : null}

            {historyData.length > 0 ? (
              <ul className={styles.historyList}>
                {historyData.map((entry) => (
                  <li
                    key={entry.id}
                    className={`${styles.historyItem} ${selectedEntryId === entry.id ? styles.historyItemActive : ""}`}
                    onClick={() => void handleSelectHistoryEntry(entry.id)}
                  >
                    <p className={styles.historyMain}>
                      <strong>Audio</strong>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </p>
                    <p>Persona: {entry.assigned_persona}</p>
                    <p>Themes: {entry.burden_themes?.length ? entry.burden_themes.join(", ") : "none"}</p>
                    <p>Crisis detected: {entry.crisis_detected ? "Yes" : "No"}</p>
                    <p className={styles.historyHint}>Tap to view transcript</p>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteHistoryEntry(entry.id);
                      }}
                      disabled={deletingEntryId === entry.id}
                    >
                      {deletingEntryId === entry.id ? "Deleting..." : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No journal entries found yet.</p>
            )}

            {selectedEntryId ? (
              <div className={styles.transcriptPanel}>
                <h4 className={styles.transcriptTitle}>Transcript</h4>
                {entryDetailLoading ? <p className={styles.muted}>Loading transcript...</p> : null}
                {!entryDetailLoading && entryDetailError ? <p className={styles.error}>{entryDetailError}</p> : null}
                {!entryDetailLoading && !entryDetailError ? (
                  <p className={styles.transcriptText}>
                    {selectedEntryDetail?.transcript?.trim() || "No transcription text available for this entry."}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}
