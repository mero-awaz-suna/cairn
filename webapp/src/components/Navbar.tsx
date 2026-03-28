"use client";

import { useState, useEffect } from "react";
import CairnLogo from "./CairnLogo";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <a href="#" className={styles.brand}>
          <CairnLogo size={32} />
          <span className={styles.brandName}>Cairn</span>
        </a>
        <div className={`${styles.links} ${menuOpen ? styles.open : ""}`}>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#circle" onClick={() => setMenuOpen(false)}>The Circle</a>
          <a href="#memory-wall" onClick={() => setMenuOpen(false)}>Memory Wall</a>
          <a href="#safety" onClick={() => setMenuOpen(false)}>Safety</a>
        </div>
        <div className={styles.actions}>
          <button className={styles.helpBtn}>
            <span className={styles.helpDot} />
            I Need Help
          </button>
          <button className={styles.burger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerOpen : ""}`} />
            <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerOpen : ""}`} />
          </button>
        </div>
      </div>
    </nav>
  );
}
