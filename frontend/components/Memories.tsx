"use client";

import { useMemo } from "react";
import styles from "./Memories.module.css";

type MemoryWallRecord = {
  idx: number;
  id: string;
  source_circle_id: string;
  primary_stressor: string;
  headline: string;
  insights: string;
  stressor_dist: string;
  helpful_count: number;
  is_approved: boolean;
  ai_safety_score: number;
  cultural_context: string | null;
  created_at: string;
};

const HARD_CODED_MEMORY_WALL: MemoryWallRecord[] = [
  {
    idx: 0,
    id: "eff5dc99-3040-4499-8339-14242694a00a",
    source_circle_id: "f2eafc35-76c6-43d9-b810-c49e65b14870",
    primary_stressor: "isolation",
    headline: "Members found practical routines that reduced overwhelm.",
    insights: JSON.stringify([
      "Someone used a wind-down routine to improve sleep consistency.",
      "A member used short walks to reset between tasks.",
    ]),
    stressor_dist: JSON.stringify([0.05, 0.05, 0.1, 0.05, 0.05, 0.1, 0.5, 0.1]),
    helpful_count: 0,
    is_approved: true,
    ai_safety_score: 0.98,
    cultural_context: null,
    created_at: "2026-03-29 13:17:39.174004+00",
  },
  {
    idx: 1,
    id: "a621e661-4e91-45de-a1c5-f3cc603b1d31",
    source_circle_id: "f2eafc35-76c6-43d9-b810-c49e65b14870",
    primary_stressor: "work_stress",
    headline: "Tiny planning habits helped members regain control of busy days.",
    insights: JSON.stringify([
      "Writing only 3 priority tasks reduced decision fatigue.",
      "A 10-minute shutdown ritual made evenings less anxious.",
      "Pairing hard tasks with short breaks improved follow-through.",
    ]),
    stressor_dist: JSON.stringify([0.08, 0.06, 0.42, 0.07, 0.05, 0.1, 0.12, 0.1]),
    helpful_count: 3,
    is_approved: true,
    ai_safety_score: 0.97,
    cultural_context: "urban",
    created_at: "2026-03-28 09:11:21.882341+00",
  },
];

function parseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseNumberArray(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === "number") : [];
  } catch {
    return [];
  }
}

export default function Memories() {
  const records = useMemo(() => HARD_CODED_MEMORY_WALL, []);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M9.5 12h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className={styles.title}>Memory Wall</h2>
          </div>
          <p className={styles.sub}>Shared moments from circles, with insights and stressor distribution.</p>
        </div>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Memory Wall</h3>
          <p className={styles.cardSub}>Showing approved memories with key metadata.</p>

          <ul className={styles.memoryList}>
            {records.map((record) => {
              const insights = parseStringArray(record.insights);
              const distribution = parseNumberArray(record.stressor_dist);

              return (
                <li key={record.id} className={styles.memoryItem}>
                  <p className={styles.memoryText}>{record.headline}</p>

                  <p className={styles.memoryMeta}>
                    <span><strong>Primary stressor:</strong> {record.primary_stressor}</span>
                    <span><strong>Helpful count:</strong> {record.helpful_count}</span>
                    <span><strong>Approved:</strong> {record.is_approved ? "yes" : "no"}</span>
                    <span><strong>Safety score:</strong> {record.ai_safety_score.toFixed(2)}</span>
                  </p>

                  <p className={styles.memoryMeta}>
                    <span><strong>ID:</strong> {record.id}</span>
                    <span><strong>Circle ID:</strong> {record.source_circle_id}</span>
                    <span><strong>Created:</strong> {record.created_at}</span>
                  </p>

                  {insights.length > 0 ? (
                    <ul className={styles.insightList}>
                      {insights.map((insight, index) => (
                        <li key={`${record.id}-insight-${index}`}>{insight}</li>
                      ))}
                    </ul>
                  ) : null}

                  {distribution.length > 0 ? (
                    <p className={styles.memoryMeta}>
                      <span><strong>stressor_dist:</strong> [{distribution.map((value) => value.toFixed(2)).join(", ")}]</span>
                    </p>
                  ) : null}

                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </section>
  );
}
