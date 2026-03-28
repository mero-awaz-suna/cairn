"use client";

import styles from "./Dashboard.module.css";
import CairnLogo from "./CairnLogo";

export default function Dashboard() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Your Dashboard</span>
          <h2 className={styles.title}>Everything in one calm place</h2>
        </div>

        {/* Dashboard frame with mountain bg */}
        <div className={styles.frame}>
          <div className={styles.frameBg} />
          <div className={styles.frameOverlay} />

          {/* Nav */}
          <div className={styles.dashNav}>
            <div className={styles.dashBrand}>
              <CairnLogo size={26} />
              <span>Cairn</span>
            </div>
            <div className={styles.dashRight}>
              <div className={styles.avatar} />
              <button className={styles.dashHelp}>
                <CairnLogo size={14} />
                I Need Help
              </button>
            </div>
          </div>

          {/* Persona card */}
          <div className={styles.persona}>
            <h3 className={styles.personaTitle}>Persona Card</h3>
            <p className={styles.personaSub}>Finding Ground · 68% hope index</p>
            <div className={styles.stones}>
              {[1, 2, 3, 4].map((i) => <CairnLogo key={i} size={52} />)}
            </div>
            <div className={styles.slider}>
              <div className={styles.sliderFill} />
              <div className={styles.sliderDot} />
            </div>
          </div>

          {/* Bottom widgets */}
          <div className={styles.widgets}>
            <div className={styles.widget}>
              <div className={styles.widgetLabel}>Voice Journal</div>
              <div className={styles.widgetBig}>60<span className={styles.widgetUnit}>second</span></div>
              <div className={styles.mountainArt}>
                <svg viewBox="0 0 200 50" fill="none" preserveAspectRatio="none">
                  <path d="M0 50 L20 30 L45 40 L70 18 L95 28 L120 8 L150 22 L175 12 L200 25 L200 50Z" fill="url(#mg)" opacity="0.5"/>
                  <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="50"><stop offset="0%" stopColor="#E8DCC4"/><stop offset="100%" stopColor="#C4B08A" stopOpacity="0.2"/></linearGradient></defs>
                </svg>
              </div>
              <div className={styles.playIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
              </div>
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetLabel}>
                Relay Streak
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              <div className={styles.widgetBig}>7<span className={styles.widgetUnit}>Day</span></div>
              <div className={styles.dots}>
                {[1,2,3,4,5,6].map(i => <div key={i} className={styles.dot} />)}
                <div className={styles.dotMore}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
