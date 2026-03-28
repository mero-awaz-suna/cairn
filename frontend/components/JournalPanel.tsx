"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import styles from "./JournalPanel.module.css";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

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
  stress_level?: number;
  burden_themes?: string[];
  recognition_message?: string;
  micro_intervention?: string;
  crisis_detected?: boolean;
  created_at?: string;
  message?: string;
};

type JournalHistoryEntry = {
  id: string;
  input_type: "audio" | "text";
  assigned_persona: string;
  stress_level: number;
  burden_themes: string[];
  crisis_detected: boolean;
  created_at: string;
};

function buildAuthHeaders(token: string | null, includeJson = false) {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function JournalPanel() {
  const [activeTab, setActiveTab] = useState<"audio" | "text" | "history">("audio");

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioResult, setAudioResult] = useState<AudioJournalResponse | null>(null);
  const [audioError, setAudioError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [rawTranscript, setRawTranscript] = useState("");
  const [assignedPersona, setAssignedPersona] = useState("ground");
  const [personaConfidence, setPersonaConfidence] = useState("0.8");
  const [stressLevel, setStressLevel] = useState("5");
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

  const parsedThemes = useMemo(
    () => burdenThemes.split(",").map((item) => item.trim()).filter(Boolean),
    [burdenThemes],
  );

  const parsedCrisisKeywords = useMemo(
    () => crisisKeywords.split(",").map((item) => item.trim()).filter(Boolean),
    [crisisKeywords],
  );

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

      const response = await fetch(`${API_BASE}/journal/audio`, {
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
      const response = await fetch(`${API_BASE}/journal/text`, {
        method: "POST",
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({
          raw_transcript: rawTranscript.trim(),
          assigned_persona: assignedPersona.trim() || "ground",
          persona_confidence: Number(personaConfidence),
          stress_level: Number(stressLevel),
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
      const response = await fetch(`${API_BASE}/journal/history`, {
        method: "GET",
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json().catch(() => null)) as JournalHistoryEntry[] | { message?: string } | null;
      if (!response.ok) {
        const maybeError = data as { message?: string } | null;
        throw new Error(maybeError?.message ?? "Failed to load journal history.");
      }

      setHistoryData(Array.isArray(data) ? data : []);
    } catch (apiError) {
      setHistoryError(apiError instanceof Error ? apiError.message : "Failed to load journal history.");
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Journal</h2>
        <p className={styles.subtitle}>Speak, write, and revisit your entries from one place.</p>

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
            className={`${styles.tabBtn} ${activeTab === "text" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("text")}
          >
            Text Journal
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
              <button type="submit" className={styles.submitBtn} disabled={audioLoading || !recordedAudioBlob}>
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

        {activeTab === "text" ? (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Write your journal</h3>
            <p className={styles.cardSub}>Type your thoughts. We send this to your text journal endpoint.</p>

            <form className={styles.formBody} onSubmit={handleTextSubmit}>
              <textarea
                className={styles.textarea}
                value={rawTranscript}
                onChange={(event) => setRawTranscript(event.target.value)}
                placeholder="Write your journal entry..."
                rows={6}
              />

              <button type="submit" className={styles.submitBtn} disabled={textLoading}>
                {textLoading ? "Submitting..." : "Submit Text Journal"}
              </button>

              {textError ? <p className={styles.error}>{textError}</p> : null}
              {textResult ? (
                <div className={styles.resultCard}>
                  <p><strong>Entry ID:</strong> {textResult.id ?? "-"}</p>
                  <p><strong>Persona:</strong> {textResult.assigned_persona ?? "-"}</p>
                  <p><strong>Stress:</strong> {textResult.stress_level ?? "-"}</p>
                  <p><strong>Created:</strong> {textResult.created_at ? new Date(textResult.created_at).toLocaleString() : "-"}</p>
                </div>
              ) : null}
            </form>
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
                  <li key={entry.id} className={styles.historyItem}>
                    <p className={styles.historyMain}>
                      <strong>{entry.input_type === "audio" ? "Audio" : "Text"}</strong>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </p>
                    <p>Persona: {entry.assigned_persona} • Stress: {entry.stress_level}</p>
                    <p>Themes: {entry.burden_themes?.length ? entry.burden_themes.join(", ") : "none"}</p>
                    <p>Crisis detected: {entry.crisis_detected ? "Yes" : "No"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No journal entries found yet.</p>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
