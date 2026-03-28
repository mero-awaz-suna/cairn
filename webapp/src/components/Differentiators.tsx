"use client";

import styles from "./Differentiators.module.css";

const items = [
  {
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>,
    title: "Persona-Driven Matching",
    desc: "Not keywords or mood tags — a living model of who you are, built from your voice over days and weeks.",
  },
  {
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>,
    title: "Engineered Hope",
    desc: "The group composition guarantees someone in the room has been where you are — and found the other side.",
  },
  {
    icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>,
    title: "The Memory Wall",
    desc: "Past sessions don't disappear. Their positive essence lives on and becomes support for future strangers.",
  },
];

export default function Differentiators() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>What Makes This Different</span>
          <h2 className={styles.title}>Three things nobody else does</h2>
        </div>
        <div className={styles.grid}>
          {items.map((item, i) => (
            <div key={i} className={styles.card} style={{ animationDelay: `${i * 0.15}s` }}>
              <div className={styles.cardIcon}>{item.icon}</div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDesc}>{item.desc}</p>
              <div className={styles.cardLine} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
