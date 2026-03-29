"use client";

import styles from "./HomeImage.module.css";

export default function HomeImage() {
  return (
    <section className={styles.imageOnly} aria-label="Home image">
      <div className={styles.copyWrap}>
        <h1 className={styles.title}>CAIRN</h1>
        <p className={styles.mottoEnglish}>Speak your storm. Find your circle.</p>
        <p className={styles.mottoDevanagari}>मेरो आवाज सुन</p>
        <p className={styles.subtitle}>
          Cairn forms balanced, real-time support circles so people can feel understood safely and leave circle whenever they want
        </p>
      </div>
    </section>
  );
}
