"use client";

import styles from "./CircleScience.module.css";

const stages = [
  { label: "In the Storm", color: "#D4A574", glow: "rgba(212,165,116,0.4)", desc: "1 person — triggered, needs to be heard right now", count: "1" },
  { label: "Finding Ground", color: "#7a9a7e", glow: "rgba(122,154,126,0.4)", desc: "1–2 people — still raw, but processing", count: "1–2" },
  { label: "Through It", color: "#4ADE80", glow: "rgba(74,222,128,0.4)", desc: "1 person — recovered, offers real hope", count: "1" },
  { label: "Different Paths", color: "#5EACB0", glow: "rgba(94,172,176,0.4)", desc: "No two members share the same trauma type", count: "—" },
];
const factors = ["Region", "Language", "Life Stage", "Occupation", "Stressor Type"];

export default function CircleScience() {
  return (
    <section className={styles.section} id="circle">
      <div className={styles.bg} />
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>The Science</span>
          <h2 className={styles.title}>We design groups like ecosystems</h2>
          <p className={styles.sub}>Every circle is deliberately balanced — because a room full of people in crisis only spirals deeper.</p>
        </div>
        <div className={styles.grid}>
          <div className={styles.vizWrap}>
            <div className={styles.facilBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              AI Facilitator is listening
            </div>
            <div className={styles.circleCenter}>
              <div className={styles.centerLabel}>Your Circle</div>
              <div className={styles.centerSub}>Balanced for Hope</div>
            </div>
            {stages.map((s, i) => (
              <div key={s.label} className={styles.orb} style={{ "--angle": `${i * 90 - 45}deg`, "--color": s.color, "--glow": s.glow, "--delay": `${i * 0.3}s` } as React.CSSProperties}>
                <div className={styles.orbBall} />
                <span className={styles.orbLabel}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.cards}>
            {stages.map(s => (
              <div key={s.label} className={styles.card}>
                <div className={styles.dot} style={{ background: s.color }} />
                <div className={styles.cardText}>
                  <div className={styles.cardTitle}>{s.label}</div>
                  <div className={styles.cardDesc}>{s.desc}</div>
                </div>
                <div className={styles.cardCount}>{s.count}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.matchSection}>
          <h3 className={styles.matchTitle}>Members are matched on</h3>
          <div className={styles.pills}>{factors.map(f => <span key={f} className={styles.pill}>{f}</span>)}</div>
          <p className={styles.matchNote}>So conversations feel familiar, not foreign.</p>
        </div>
      </div>
    </section>
  );
}
