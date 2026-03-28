"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import styles from "./ViewMyCircle.module.css";

const CIRCLES_BASE_ENDPOINT = "http://127.0.0.1:8000/circles";
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
  const [circleIdInput, setCircleIdInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [circleData, setCircleData] = useState<CircleResponse | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedCircleId = window.localStorage.getItem(LAST_CIRCLE_ID_STORAGE_KEY);
    if (storedCircleId) {
      setCircleIdInput(storedCircleId);
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
      setError("Please enter a circle ID.");
      setCircleData(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = getStoredToken();
      const response = await fetch(`${CIRCLES_BASE_ENDPOINT}/${encodeURIComponent(targetCircleId)}`, {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadCircle(circleIdInput);
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>View My Circle</h2>
          <p className={styles.sub}>Check your circle details and current member snapshot.</p>

          <form className={styles.formRow} onSubmit={handleSubmit}>
            <input
              className={styles.circleInput}
              type="text"
              value={circleIdInput}
              onChange={(event) => setCircleIdInput(event.target.value)}
              placeholder="Paste circle ID"
              aria-label="Circle ID"
              disabled={isLoading}
            />
            <button className={styles.loadBtn} type="submit" disabled={isLoading}>
              {isLoading ? "Loading..." : "Load Circle"}
            </button>
          </form>

          {error ? <p className={styles.error}>{error}</p> : null}

          {circleData?.circle ? (
            <div className={styles.infoGrid}>
              <article className={styles.infoCard}>
                <h3>Circle</h3>
                <p><strong>ID:</strong> {circleData.circle.id ?? circleIdInput}</p>
                <p><strong>Status:</strong> {circleData.circle.status ?? "unknown"}</p>
                <p><strong>Primary burden:</strong> {circleData.circle.primary_burden_tag ?? "not set"}</p>
                <p><strong>Facilitator state keys:</strong> {facilitatorStateKeyCount}</p>
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
    </section>
  );
}
