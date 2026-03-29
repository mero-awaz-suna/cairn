"use client";

import { useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import styles from "./CircleScience.module.css";

const JOIN_CIRCLE_ENDPOINT = "/circles/join";
const CIRCLES_BASE_ENDPOINT = "/circles";
const LAST_CIRCLE_ID_STORAGE_KEY = "cairn.lastCircleId";

type JoinLookupResponse = {
  circle_id?: string;
  status?: string;
  message?: string;
};

export default function FindMyCircle() {
  const [isFinding, setIsFinding] = useState(false);
  const [isJoiningById, setIsJoiningById] = useState(false);
  const [circleId, setCircleId] = useState("");
  const [circleStatus, setCircleStatus] = useState("");
  const [joinCircleId, setJoinCircleId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function buildAuthHeaders(token: string | null, includeJsonContentType = false) {
    return {
      ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  function persistCircleId(value: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LAST_CIRCLE_ID_STORAGE_KEY, value);
  }

  async function handleFindCircle() {
    setIsFinding(true);
    setError("");
    setMessage("");

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl(JOIN_CIRCLE_ENDPOINT), {
        method: "POST",
        headers: buildAuthHeaders(token, true),
        body: "{}",
      });

      const data = (await response.json().catch(() => null)) as JoinLookupResponse | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to join a circle right now.");
      }

      if (!data?.circle_id) {
        throw new Error("Circle ID was not returned by the server.");
      }

      setCircleId(data.circle_id);
      setJoinCircleId(data.circle_id);
      setCircleStatus(data.status ?? "");
      persistCircleId(data.circle_id);
      // setMessage(data?.message ?? "Circle found. Use the Circle ID below to join.");
    } catch (apiError) {
      const apiMessage = apiError instanceof Error ? apiError.message : "Unable to join a circle right now.";
      setError(apiMessage);
    } finally {
      setIsFinding(false);
    }
  }

  async function handleJoinByCircleId() {
    const targetCircleId = joinCircleId.trim();
    if (!targetCircleId) {
      setError("Please enter a circle ID.");
      setMessage("");
      return;
    }

    setIsJoiningById(true);
    setError("");
    setMessage("");

    try {
      const token = getStoredToken();
      const endpoint = buildApiUrl(`${CIRCLES_BASE_ENDPOINT}/${encodeURIComponent(targetCircleId)}`);
      const response = await fetch(endpoint, {
        method: "GET",
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json().catch(() => null)) as { message?: string; status?: string } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to join this circle right now.");
      }

      setCircleId(targetCircleId);
      persistCircleId(targetCircleId);
      setMessage(data?.message ?? `Joined circle ${targetCircleId} successfully.`);
    } catch (apiError) {
      const apiMessage = apiError instanceof Error ? apiError.message : "Unable to join this circle right now.";
      setError(apiMessage);
    } finally {
      setIsJoiningById(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>Find My Circle</h2>
          <p className={styles.sub}>Tap once to retrieve your circle ID, then join with that ID.</p>
          <button type="button" className={styles.pageBtn} onClick={handleFindCircle} disabled={isFinding}>
            {isFinding ? "Finding..." : "Find Circle"}
          </button>

          {circleId ? (
            <div className={styles.circleInfo}>
              <p className={styles.circleIdText}>Circle ID: {circleId}</p>
              {circleStatus ? <p className={styles.statusPill}>Status: {circleStatus}</p> : null}
            </div>
          ) : null}

          <div className={styles.joinRow}>
            <input
              className={styles.circleInput}
              type="text"
              value={joinCircleId}
              onChange={(event) => setJoinCircleId(event.target.value)}
              placeholder="Paste circle ID"
              aria-label="Circle ID"
              disabled={isJoiningById}
            />
            <button
              type="button"
              className={styles.joinBtn}
              onClick={handleJoinByCircleId}
              disabled={isJoiningById}
            >
              {isJoiningById ? "Joining..." : "Join"}
            </button>
          </div>

          {message ? <p className={styles.success}>{message}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
