"use client";

import styles from "./Vision.module.css";
import CairnLogo from "./CairnLogo";

export default function Vision() {
  return (
    <>
      <section className={styles.section}>
        <div className={styles.bg} />
        <div className={styles.overlay} />
        <div className={styles.content}>
          <CairnLogo size={56} />
          <h2 className={styles.title}>Mental health support that meets you at the moment you need it — not weeks later.</h2>
          <p className={styles.sub}>No waiting lists. No stigma. No commitment. Just a circle of people who get it, exactly when you need them most.</p>
          <p className={styles.audience}>Built for students and professionals facing career pressure, burnout, and uncertainty — everywhere.</p>
        </div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <CairnLogo size={26} />
            <span className={styles.footerName}>Cairn</span>
          </div>
          <p className={styles.footerTag}>Speak your storm. Find your circle.</p>
          <div className={styles.footerLinks}>
            <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Safety</a><a href="#">Contact</a>
          </div>
          <p className={styles.footerCopy}>© 2026 Cairn. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
