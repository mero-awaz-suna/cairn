"use client";

import styles from "./HomeImage.module.css";

export default function HomeImage() {
  return (
    <section className={styles.imageOnly} aria-label="Home image">
      <div className={styles.copyWrap}>
        <p className={styles.kicker}>Cairn</p>
        <h1 className={styles.title}>Speak your storm. Find your circle.</h1>
        <p className={styles.subtitle}>
          Cairn forms balanced, real-time support clusters so people can feel understood safely and leave each session more grounded.
        </p>
      </div>
    </section>
  );
}
