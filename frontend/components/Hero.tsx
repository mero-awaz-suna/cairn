"use client";

import styles from "./Hero.module.css";
import CairnLogo from "./CairnLogo";

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Real mountain photo background */}
      <div className={styles.bgImage} />
      <div className={styles.bgOverlay} />
      <div className={styles.bgVignette} />

      <div className={styles.content}>
        <div className={styles.logoBlock}>
          <CairnLogo size={80} />
          <h1 className={styles.brandTitle}>Cairn</h1>
        </div>

        <h2 className={styles.tagline}>
          <span className={styles.taglineLine}>Speak your storm.</span>
          <span className={styles.taglineLine}>Find your circle.</span>
        </h2>

        <p className={styles.subtitle}>
          A voice journal that knows when you need people — and finds exactly the right ones.
        </p>

        <div className={styles.cta}>
          <button className={styles.primaryBtn}>Start Speaking Today</button>
        </div>
      </div>

      {/* Dark bottom feature bar matching design image 8 */}
      <div className={styles.featureBar}>
        <div className={styles.featureBarInner}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
              <div className={styles.iconRing} />
            </div>
            <div className={styles.featureText}>
              <span className={styles.featureLabel}>Voice Recording</span>
              <span className={styles.featureSub}>recording</span>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={styles.featureText}>
              <span className={styles.featureLabel}>AI Persona</span>
              <span className={styles.featureSub}>learns who you are</span>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className={styles.featureText}>
              <span className={styles.featureLabel}>Balanced Circle</span>
              <span className={styles.featureSub}>of support</span>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div className={styles.featureText}>
              <span className={styles.featureLabel}>Summary of Hope</span>
              <span className={styles.featureSub}>for recovery</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
