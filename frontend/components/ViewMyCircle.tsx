"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import styles from "./ViewMyCircle.module.css";

const CIRCLES_BASE_ENDPOINT = "/circles";
const LAST_CIRCLE_ID_STORAGE_KEY = "cairn.lastCircleId";

type CircleRecord = {
  id?: string;
  status?: string;
  primary_burden_tag?: string | null;
  facilitator_state?: Record<string, unknown> | null;
  created_at?: string;
};

type CircleMember = {
  id?: string;
  role_label?: string | null;
  anonymous_alias?: string | null;
  joined_at?: string | null;
  message_count?: number | null;
};

type CircleResponse = {
  circle?: CircleRecord;
  members?: CircleMember[];
  message?: string;
};

export default function ViewMyCircle() {
  const [circleId, setCircleId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLeavingCircle, setIsLeavingCircle] = useState(false);
  const [isEnteringChat, setIsEnteringChat] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [circleData, setCircleData] = useState<CircleResponse | null>(null);
  const [leaveMessage, setLeaveMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedCircleId = window.localStorage.getItem(LAST_CIRCLE_ID_STORAGE_KEY);
    if (storedCircleId) {
      setCircleId(storedCircleId);
      void loadCircle(storedCircleId);
    } else {
      setCircleData(null);
    }
  }, []);

  const activeMembers = useMemo(() => circleData?.members ?? [], [circleData]);
  const facilitatorStateKeyCount = useMemo(() => {
    const state = circleData?.circle?.facilitator_state;
    return state ? Object.keys(state).length : 0;
  }, [circleData]);

  async function loadCircle(circleId: string) {
    const targetCircleId = circleId.trim();
    if (!targetCircleId) {
      setError("No joined circle found yet. Go to Find My Circle first.");
      setCircleData(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl(`${CIRCLES_BASE_ENDPOINT}/${encodeURIComponent(targetCircleId)}`), {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = (await response.json().catch(() => null)) as CircleResponse | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to load circle details.");
      }

      setCircleData(data);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_CIRCLE_ID_STORAGE_KEY, targetCircleId);
      }
    } catch (apiError) {
      const apiMessage = apiError instanceof Error ? apiError.message : "Unable to load circle details.";
      setError(apiMessage);
      setCircleData(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLeaveCircle() {
    const targetCircleId = circleId.trim();
    if (!targetCircleId) {
      setError("Circle ID is missing.");
      return;
    }

    setIsLeavingCircle(true);
    setError("");
    setLeaveMessage("");

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl(`${CIRCLES_BASE_ENDPOINT}/${encodeURIComponent(targetCircleId)}/leave`), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = (await response.json().catch(() => null)) as { status?: string; message?: string } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to leave this circle right now.");
      }

      setLeaveMessage("You have successfully left the circle.");
      setCircleData(null);
      setCircleId("");
      setIsLeaveConfirmOpen(false);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LAST_CIRCLE_ID_STORAGE_KEY);
      }
    } catch (apiError) {
      const apiMessage = apiError instanceof Error ? apiError.message : "Unable to leave this circle right now.";
      setError(apiMessage);
    } finally {
      setIsLeavingCircle(false);
    }
  }

  async function handleEnterChatRoom() {
    const targetCircleId = (circleData?.circle?.id ?? circleId).trim();
    if (!targetCircleId) {
      setError("Circle ID is missing.");
      return;
    }

    setIsEnteringChat(true);
    setError("");

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error("Please log in again to enter chat.");
      }

      const response = await fetch(buildApiUrl(`${CIRCLES_BASE_ENDPOINT}/${encodeURIComponent(targetCircleId)}/chatroom/enter`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json().catch(() => null)) as
        | { message?: string; detail?: string | { reason?: string }; status?: string }
        | null;

      if (!response.ok) {
        const detail = data?.detail;
        const detailMessage = typeof detail === "string" ? detail : detail?.reason;
        throw new Error(detailMessage ?? data?.message ?? "Unable to enter chat room right now.");
      }

      window.location.href = `/chat/${encodeURIComponent(targetCircleId)}`;
    } catch (apiError) {
      const apiMessage = apiError instanceof Error ? apiError.message : "Unable to enter chat room right now.";
      setError(apiMessage);
    } finally {
      setIsEnteringChat(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M6 18c1.2-2.4 3.4-3.7 6-3.7s4.8 1.3 6 3.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className={styles.title}>View My Circle</h2>
          </div>
          <p className={styles.sub}>Your previously joined circle is listed here.</p>

          {isLoading ? <p className={styles.muted}>Loading joined circle...</p> : null}

          {error ? <p className={styles.error}>{error}</p> : null}
          {leaveMessage ? <p className={styles.success}>{leaveMessage}</p> : null}

          {circleId && !circleData?.circle && !isLoading && !error && !leaveMessage ? (
            <div className={styles.infoGrid}>
              <article className={styles.infoCard}>
                <h3>Joined Circle</h3>
                <p><strong>ID:</strong> {circleId}</p>
                <div className={styles.actionsRow}>
                  <button type="button" className={styles.actionBtn} onClick={() => void handleEnterChatRoom()} disabled={isEnteringChat}>
                    {isEnteringChat ? "Entering..." : "Enter Chat Room"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionDanger}`}
                    onClick={() => setIsLeaveConfirmOpen(true)}
                    disabled={isLeavingCircle}
                  >
                    {isLeavingCircle ? "Leaving..." : "Leave the Circle"}
                  </button>
                </div>
              </article>
            </div>
          ) : null}

          {circleData?.circle ? (
            <div className={styles.infoGrid}>
              <article className={styles.infoCard}>
                <h3>Joined Circle</h3>
                <p><strong>ID:</strong> {circleData.circle.id ?? circleId}</p>
                <p><strong>Status:</strong> {circleData.circle.status ?? "unknown"}</p>
                <p><strong>Primary burden:</strong> {circleData.circle.primary_burden_tag ?? "not set"}</p>
                <p><strong>Facilitator state keys:</strong> {facilitatorStateKeyCount}</p>
                <div className={styles.actionsRow}>
                  <button type="button" className={styles.actionBtn} onClick={() => void handleEnterChatRoom()} disabled={isEnteringChat}>
                    {isEnteringChat ? "Entering..." : "Enter Chat Room"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionDanger}`}
                    onClick={() => setIsLeaveConfirmOpen(true)}
                    disabled={isLeavingCircle}
                  >
                    {isLeavingCircle ? "Leaving..." : "Leave the Circle"}
                  </button>
                </div>
              </article>

              <article className={styles.infoCard}>
                <h3>Members</h3>
                <p><strong>Active members:</strong> {activeMembers.length}</p>
                {activeMembers.length === 0 ? (
                  <p className={styles.muted}>No active members found.</p>
                ) : (
                  <ul className={styles.memberList}>
                    {activeMembers.map((member) => (
                      <li key={member.id ?? `${member.anonymous_alias}-${member.joined_at}`}>
                        <span>{member.anonymous_alias ?? "anonymous"}</span>
                        <span>{member.role_label ?? "member"}</span>
                        <span>{member.message_count ?? 0} msgs</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          ) : null}
        </div>
      </div>

      {isLeaveConfirmOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!isLeavingCircle) {
              setIsLeaveConfirmOpen(false);
            }
          }}
        >
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-label="Leave circle confirmation"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Leave this circle?</h3>
            <p className={styles.modalText}>You can join another circle later, but you will exit this one now.</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setIsLeaveConfirmOpen(false)}
                disabled={isLeavingCircle}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={() => void handleLeaveCircle()}
                disabled={isLeavingCircle}
              >
                {isLeavingCircle ? "Leaving..." : "Leave Circle"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
