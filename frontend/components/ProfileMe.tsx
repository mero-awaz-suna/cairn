"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import styles from "./ProfileMe.module.css";

type UserMeResponse = {
  id?: string;
  email?: string;
  academic_stage?: string;
  primary_burden?: string;
  current_persona?: string;
  persona_confidence?: number;
  cultural_context?: string;
  last_journal_at?: string | null;
  journal_streak?: number;
  circles_joined?: number;
  burdens_dropped?: number;
  memories_saved?: number;
  is_in_crisis?: boolean;
  data_deletion_requested?: boolean;
  created_at?: string;
  updated_at?: string;
  message?: string;
  detail?: string;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatLabel(value?: string | null) {
  if (!value || !value.trim()) {
    return "-";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProfileMe() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserMeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      setLoading(true);
      setError("");

      try {
        const token = getStoredToken();
        if (!token) {
          throw new Error("Please log in again to view your profile.");
        }

        const response = await fetch(buildApiUrl("/users/me"), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = (await response.json().catch(() => null)) as UserMeResponse | null;
        if (!response.ok) {
          throw new Error(data?.message ?? data?.detail ?? "Unable to load profile details.");
        }

        if (!cancelled) {
          setUser(data);
        }
      } catch (apiError) {
        if (!cancelled) {
          const message = apiError instanceof Error ? apiError.message : "Unable to load profile details.";
          setError(message);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  const keyStats = useMemo(() => {
    if (!user) {
      return [];
    }

    return [
      { label: "Persona", value: formatLabel(user.current_persona) },
      { label: "Journal Streak", value: user.journal_streak ?? 0 },
      { label: "Circles Joined", value: user.circles_joined ?? 0 },
      { label: "Memories Saved", value: user.memories_saved ?? 0 },
      { label: "Last Journal", value: formatDate(user.last_journal_at) },
      { label: "In Crisis", value: user.is_in_crisis ? "Yes" : "No" },
      { label: "Joined", value: formatDate(user.created_at) },
      { label: "Last Updated", value: formatDate(user.updated_at) },
    ];
  }, [user]);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5 19c1.7-3 4.2-4.5 7-4.5s5.3 1.5 7 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className={styles.title}>Me</h2>
          </div>
          <p className={styles.sub}>Your current profile, progress, and wellness snapshot.</p>

          {loading ? <p className={styles.muted}>Loading profile...</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          {user && !loading ? (
            <>
              <div className={styles.identityCard}>
                <p><strong>Email:</strong> {user.email ?? "-"}</p>
                <p><strong>User ID:</strong> {user.id ?? "-"}</p>
                <p><strong>Academic Stage:</strong> {formatLabel(user.academic_stage)}</p>
                <p><strong>Cultural Context:</strong> {formatLabel(user.cultural_context)}</p>
              </div>

              <div className={styles.grid}>
                {keyStats.map((item) => (
                  <article key={item.label} className={styles.statCard}>
                    <p className={styles.statLabel}>{item.label}</p>
                    <p className={styles.statValue}>{String(item.value)}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
