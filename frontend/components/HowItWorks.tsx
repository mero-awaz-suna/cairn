"use client";

import styles from "./HowItWorks.module.css";

const steps = [
  { num: "01", title: "You speak, not type", desc: "Every day, record a 60-second voice note — how you're feeling, what's on your mind. No prompts, no forms. Just your voice.", visual: "voice" },
  { num: "02", title: "Cairn builds your persona", desc: "Over time, it quietly understands your stress level, challenges, and where you are in your recovery journey — your stage.", visual: "persona" },
  { num: "03", title: 'Press "I need help"', desc: "Within seconds, Cairn finds 4–6 real, anonymous people who match your context and are available right now.", visual: "circle" },
  { num: "04", title: "Leave better than you entered", desc: "When the session ends, get a personal summary of what helped. Your persona updates — so the next match is even better.", visual: "summary" },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>How It Works</span>
          <h2 className={styles.title}>Four moments that change everything</h2>
        </div>
        <div className={styles.steps}>
          {steps.map((step, i) => (
            <div key={step.num} className={styles.step} style={{ animationDelay: `${i * 0.15}s` }}>
              <div className={styles.stepNum}>{step.num}</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
              <div className={styles.stepVisual}>
                {step.visual === "voice" && <VoiceVisual />}
                {step.visual === "persona" && <PersonaVisual />}
                {step.visual === "circle" && <CircleVisual />}
                {step.visual === "summary" && <SummaryVisual />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VoiceVisual() {
  return (
    <div className={styles.card}>
      <div className={styles.cardRow}><span>Voice Journal</span><span className={styles.bigNum}>60<sup>s</sup></span></div>
      <div className={styles.waveform}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.08}s`, height: `${20 + Math.sin(i * 0.6) * 30 + ((i * 7 + 3) % 20)}%` }} />
        ))}
      </div>
      <div className={styles.micBtn}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0d1a10"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/></svg>
      </div>
    </div>
  );
}

function PersonaVisual() {
  return (
    <div className={styles.card}>
      <div className={styles.personaStage}>Finding Ground</div>
      <div className={styles.barRow}>
        <span className={styles.barLabel}>Hope Index</span>
        <div className={styles.barTrack}><div className={styles.barFill} style={{ width: "68%" }} /></div>
        <span className={styles.barVal}>68%</span>
      </div>
      <div className={styles.tags}>
        <span className={styles.tag}>Career Pressure</span>
        <span className={styles.tag}>Burnout</span>
        <span className={styles.tag}>Student</span>
      </div>
    </div>
  );
}

function CircleVisual() {
  const members = [
    { stage: "In the Storm", color: "#D4A574" },
    { stage: "Finding Ground", color: "#7a9a7e" },
    { stage: "Finding Ground", color: "#7a9a7e" },
    { stage: "Through It", color: "#4ADE80" },
    { stage: "Different Path", color: "#5EACB0" },
  ];
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>Your Circle · Balanced for Hope</div>
      <div className={styles.memberList}>
        {members.map((m, i) => (
          <div key={i} className={styles.member}>
            <div className={styles.memberDot} style={{ background: m.color }} />
            <span>{m.stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryVisual() {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>Session Summary</div>
      <div className={styles.sumList}>
        <div className={styles.sumItem}><span className={styles.check}>✓</span> Breaking tasks into 15-min chunks</div>
        <div className={styles.sumItem}><span className={styles.check}>✓</span> Pausing to breathe every hour</div>
        <div className={styles.sumItem}><span className={styles.check}>✓</span> Persona updated → Through It</div>
      </div>
    </div>
  );
}
