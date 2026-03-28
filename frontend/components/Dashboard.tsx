"use client";

import styles from "./Dashboard.module.css";

const safetyStream = [
  "Escalation probability: low and stable",
  "Trigger vocabulary detected: gently redirected",
  "Grounding contribution ratio: healthy",
  "Facilitator intervention count: 2",
];

const sessionMoments = [
  {
    step: "00:03",
    title: "High-stress member voiced panic",
    action: "AI facilitator asked for paced breathing check-in",
  },
  {
    step: "00:09",
    title: "Recovered member shared practical grounding habit",
    action: "Group repeated action in-chat and reflected impact",
  },
  {
    step: "00:14",
    title: "Conversation drifted toward hopeless framing",
    action: "Facilitator reframed with constructive prompt",
  },
];

export default function JoinSession() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Real-time support session with active AI facilitation</h2>
          <p className={styles.sub}>
            We match participants by shared problem embedding but maintain mixed stress levels, so support remains empathic and
            emotionally grounding.
          </p>
        </div>

        <div className={styles.grid}>
          <article className={styles.card}>
            <h3>Live cluster snapshot</h3>
            <ul className={styles.snapshotList}>
              <li>
                <span>Topic Match:</span>
                <strong>Career instability and trauma-linked anxiety</strong>
              </li>
              <li>
                <span>Participants:</span>
                <strong>4 total (1 high stress, 2 mid recovery, 1 stable grounding)</strong>
              </li>
              <li>
                <span>Session Goal:</span>
                <strong>Reduce panic intensity and define one safe next action</strong>
              </li>
            </ul>

            <div className={styles.availabilityRow}>
              <div>
                <p className={styles.value}>2 min</p>
                <p className={styles.caption}>Estimated wait</p>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h3>AI safety monitor</h3>
            <div className={styles.monitorList}>
              {safetyStream.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>

            <div className={styles.guardrail}>
              The facilitator can pause harmful spirals, encourage grounding language, and escalate to human-led safety support when
              risk rises.
            </div>
          </article>
        </div>

        {/* <article className={styles.timelineCard}>
          <div className={styles.timelineHeader}>
            <h3>Session recording and LLM outcome summary</h3>
            <span>Auto-generated after close</span>
          </div>
          <div className={styles.timelineList}>
            {sessionMoments.map((moment) => (
              <div key={moment.step} className={styles.timelineItem}>
                <p className={styles.time}>{moment.step}</p>
                <div>
                  <h4>{moment.title}</h4>
                  <p>{moment.action}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.summaryBox}>
            <h4>What participants learned</h4>
            <p>
              Members reported lower panic and adopted one repeatable regulation skill: 4-6 breath cadence before speaking during
              conflict spikes.
            </p>
          </div>
        </article> */}

        <div className={styles.bottomAction}>
          <button type="button" className={styles.pageBtn}>Join a Session</button>
        </div>
      </div>
    </section>
  );
}
