"use client";

import { useState } from "react";
import styles from "./MemoryWall.module.css";

const categories = ["Career Pressure", "Burnout", "Academic Stress"];
const echoes: Record<string, { text: string; tag: string }[]> = {
  "Career Pressure": [
    { text: "Breaking tasks into 15-minute chunks helped me stop feeling overwhelmed by the big picture.", tag: "Deadline Pressure" },
    { text: "Pausing to breathe every hour sounds simple but it was the only thing that kept me grounded.", tag: "Work Overload" },
    { text: "Hearing someone say 'I almost quit too' made me realize I wasn't weak — I was human.", tag: "Imposter Syndrome" },
    { text: "The group helped me see that saying no to one project wasn't career suicide.", tag: "Boundaries" },
  ],
  "Burnout": [
    { text: "Someone in my circle said 'rest is productive' and I wrote it on my mirror.", tag: "Recovery" },
    { text: "Learning that burnout isn't laziness — it's your body forcing you to stop — changed everything.", tag: "Understanding" },
    { text: "The 15-minute walk suggestion from a circle member became my daily ritual.", tag: "Small Steps" },
    { text: "Knowing others in tech also felt empty despite success made me feel less broken.", tag: "Validation" },
  ],
  "Academic Stress": [
    { text: "A grad student shared how they stopped comparing timelines. That freed me.", tag: "Comparison" },
    { text: "Breaking my thesis into daily micro-goals came from a circle insight. Game changer.", tag: "Strategy" },
    { text: "Someone reminded me that my worth isn't my GPA. I needed that from a stranger.", tag: "Self-Worth" },
    { text: "The breathing exercise shared in a past circle became my pre-exam ritual.", tag: "Coping" },
  ],
};

export default function MemoryWall() {
  const [active, setActive] = useState("Career Pressure");
  return (
    <section className={styles.section} id="memory-wall">
      <svg className={styles.mountainLine} viewBox="0 0 1200 100" fill="none" preserveAspectRatio="none">
        <path d="M0 70 L100 45 L180 58 L250 25 L320 48 L400 15 L480 38 L550 10 L620 35 L700 8 L780 30 L850 15 L920 38 L1000 22 L1080 45 L1200 30" stroke="#C4B08A" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
        <path d="M0 80 L120 55 L200 65 L280 35 L360 55 L440 25 L520 48 L600 18 L680 42 L760 15 L840 38 L920 24 L1000 45 L1100 32 L1200 50" stroke="#C4B08A" strokeWidth="1" strokeLinecap="round" opacity="0.2"/>
      </svg>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Memory Wall</span>
          <h2 className={styles.title}>Echoes from Past Circles</h2>
          <p className={styles.sub}>AI-curated summaries from people who faced what you&apos;re facing. Distilled to what helped.</p>
        </div>
        <div className={styles.tabs}>
          {categories.map(c => (
            <button key={c} className={`${styles.tab} ${active === c ? styles.tabActive : ""}`} onClick={() => setActive(c)}>{c}</button>
          ))}
        </div>
        <div className={styles.grid}>
          {(echoes[active] || []).map((e, i) => (
            <div key={i} className={styles.echoCard} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={styles.echoTag}>{e.tag}</div>
              <p className={styles.echoText}>{e.text}</p>
              <div className={styles.echoMeta}>🪨 From a past circle</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
