"use client";

import styles from "./ImmediateHelp.module.css";

const recommendations = [
  {
    title: "Career shock after layoffs",
    duration: "11 min recording",
    reason: "Matched by stress tone and work-related trigger",
    outcome: "Members reported reduced panic within 20 minutes after using the breathing protocol.",
  },
  {
    title: "Sleep disruption and hypervigilance",
    duration: "9 min recording",
    reason: "Similar voice strain pattern and nighttime escalation",
    outcome: "Listeners adopted a 3-step grounding loop and improved next-day functioning.",
  },
  {
    title: "Academic trauma and deadline freeze",
    duration: "13 min recording",
    reason: "Matched by topic embedding and cognitive overload cues",
    outcome: "Session summary highlighted micro-task planning that reduced avoidance behavior.",
  },
];

export default function ImmediateHelp() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <h2 className={styles.title}>No live group available right now? We route you to the most relevant past session.</h2>
          <p className={styles.sub}>
            The system compares your stress signals, voice tone, and problem context to prior sessions, then delivers recordings
            with proven calming outcomes.
          </p>
        </div>

        <div className={styles.alertBox}>
          <div className={styles.alertDot} />
          <p>
            If your risk score crosses safety threshold, you are escalated to crisis guidance immediately instead of asynchronous playback.
          </p>
        </div>

        {/* <div className={styles.grid}>
          {recommendations.map((item) => (
            <article key={item.title} className={styles.card}>
              <div className={styles.cardTop}>
                <h3>{item.title}</h3>
                <span>{item.duration}</span>
              </div>
              <p className={styles.reason}>{item.reason}</p>
              <p className={styles.outcome}>{item.outcome}</p>
              <button type="button" className={styles.playBtn}>Play Recommended Session</button>
            </article>
          ))}
        </div> */}

        <div className={styles.bottomAction}>
          <button type="button" className={`${styles.pageBtn} hover:cursor-pointer`}>Immediate Stabilization</button>
        </div>
      </div>
    </section>
  );
}
