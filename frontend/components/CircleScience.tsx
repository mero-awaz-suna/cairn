"use client";

import styles from "./CircleScience.module.css";

const pipeline = [
  {
    title: "Problem Embedding Match",
    detail: "We cluster by shared PTSD-related themes and lived context, not by exact symptom intensity.",
  },
  {
    title: "Voice Stress Stratification",
    detail: "Tone, pacing, and acoustic strain estimate stress band so each group has mixed recovery stages.",
  },
  {
    title: "Balance Constraint Solver",
    detail: "Each micro-cluster is composed with grounding participants to reduce emotional escalation risk.",
  },
  {
    title: "AI Facilitation Guardrails",
    detail: "Real-time moderation redirects harmful spirals and nudges toward constructive, supportive dialogue.",
  },
];

const stressMix = [
  { band: "High Activation", share: "25%", role: "Urgent expression and containment" },
  { band: "Mid Recovery", share: "50%", role: "Mutual reflection and coping exchange" },
  { band: "Stable Grounding", share: "25%", role: "Hope transfer and emotional anchoring" },
];

const safetySignals = ["Trigger drift detection", "Escalation phrase interrupt", "Gentle reframe prompts", "Human escalation flag"];

export default function FindMyCircle() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Balanced support clusters, not distress-only rooms</h2>
          <p className={styles.sub}>
            We intentionally mix people with similar core struggles but different stress levels so sessions stabilize participants
            instead of amplifying panic.
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.pipelinePanel}>
            <h3>How clusters are formed</h3>
            <div className={styles.pipelineList}>
              {pipeline.map((item, index) => (
                <article key={item.title} className={styles.pipelineItem}>
                  <span>{index + 1}</span>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* <div className={styles.mixPanel}>
            <h3>Target cluster composition</h3>
            <div className={styles.mixList}>
              {stressMix.map((item) => (
                <article key={item.band} className={styles.mixItem}>
                  <div className={styles.mixTop}>
                    <h4>{item.band}</h4>
                    <span>{item.share}</span>
                  </div>
                  <p>{item.role}</p>
                  <div className={styles.mixBarTrack}>
                    <div className={styles.mixBarFill} style={{ width: item.share }} />
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.systemNote}>
              <strong>Outcome objective:</strong> decrease emotional volatility while preserving high empathy and felt understanding.
            </div>
          </div> */}
        </div>

        <div className={styles.safety}>
          <h3>AI facilitator safeguards during live sessions</h3>
          <div className={styles.signalList}>
            {safetySignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
          <p>
            The facilitator does not replace human empathy. It protects conversational safety and keeps the group moving toward
            grounding and practical next steps.
          </p>
        </div>

        <div className={styles.bottomAction}>
          <button type="button" className={styles.pageBtn}>Find My Circle</button>
        </div>
      </div>
    </section>
  );
}
