"use client";

import styles from "./Safety.module.css";

const items = [
  { marker: "A", title: "No permanent identity", desc: "Groups dissolve after every session. Nothing is stored about who said what.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  { marker: "B", title: "AI circuit breaker", desc: "If sentiment turns harmful, the AI facilitator redirects — or surfaces a crisis helpline immediately.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { marker: "C", title: "Positive-only memory wall", desc: "Past session summaries are filtered by AI — only insights that helped, nothing that could re-trigger.", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
];

export default function Safety() {
  return (
    <section className={styles.section} id="safety">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Safety</span>
          <h2 className={styles.title}>Anonymous by default. Safe by design.</h2>
        </div>
        <div className={styles.grid}>
          {items.map(item => (
            <div key={item.marker} className={styles.card}>
              <div className={styles.marker}>{item.marker}</div>
              <div className={styles.cardIcon}>{item.icon}</div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
