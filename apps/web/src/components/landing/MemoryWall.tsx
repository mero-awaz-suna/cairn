"use client";

import { useState } from "react";
import styles from "./MemoryWall.module.css";

const categories = ["Career Shock", "Burnout", "Academic Trauma"];

const summaries: Record<string, { title: string; insight: string; outcome: string; members: string }[]> = {
  "Career Shock": [
    {
      title: "Layoff-trigger panic loop",
      insight: "Members learned to separate immediate safety actions from catastrophic career narratives.",
      outcome: "Self-reported panic reduced from severe to moderate by session end.",
      members: "4-person mixed-stage cluster",
    },
    {
      title: "Interview freeze response",
      insight: "A stable member modeled a pre-interview grounding script that others adopted.",
      outcome: "Participants completed one exposure step within 24 hours.",
      members: "5-person mixed-stage cluster",
    },
  ],
  "Burnout": [
    {
      title: "Emotional numbness after overwork",
      insight: "The group normalized exhaustion and built a low-friction recovery routine.",
      outcome: "Sleep quality and focus scores improved over one week follow-up.",
      members: "4-person mixed-stage cluster",
    },
    {
      title: "Identity collapse after prolonged stress",
      insight: "Members reframed self-worth away from output metrics and used short reflection prompts.",
      outcome: "Rumination intensity dropped and daily functioning stabilized.",
      members: "5-person mixed-stage cluster",
    },
  ],
  "Academic Trauma": [
    {
      title: "Exam-triggered dissociation",
      insight: "Participants practiced voice-guided orientation cues during stress spikes.",
      outcome: "Acute shutdown episodes reduced during the next exam cycle.",
      members: "4-person mixed-stage cluster",
    },
    {
      title: "Thesis paralysis and shame spiral",
      insight: "A recovered participant shared a micro-task loop that reduced avoidance.",
      outcome: "Members completed first action step within same day.",
      members: "4-person mixed-stage cluster",
    },
  ],
};

export default function ViewPreviousSessions() {
  const [active, setActive] = useState("Career Shock");

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>LLM summaries from past clusters</h2>
          <p className={styles.sub}>
            Every completed session is transcribed and summarized into practical lessons, emotional outcomes, and next-step coping
            actions.
          </p>
        </div>

        <div className={styles.tabs}>
          {categories.map((category) => (
            <button key={category} className={`${styles.tab} ${active === category ? styles.tabActive : ""}`} onClick={() => setActive(category)}>
              {category}
            </button>
          ))}
        </div>

        {/* <div className={styles.grid}>
          {(summaries[active] || []).map((item) => (
            <article key={item.title} className={styles.summaryCard}>
              <h3>{item.title}</h3>
              <p className={styles.members}>{item.members}</p>
              <p className={styles.insight}>{item.insight}</p>
              <p className={styles.outcome}>{item.outcome}</p>
              <button type="button" className={styles.replayBtn}>Open Summary + Recording</button>
            </article>
          ))}
        </div> */}

        <div className={styles.bottomAction}>
          <button type="button" className={`${styles.pageBtn} hover:cursor-pointer`}>View Previous Sessions</button>
        </div>
      </div>
    </section>
  );
}
