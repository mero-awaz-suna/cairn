"use client";

import { useState } from "react";
import CairnLogo from "./CairnLogo";
import styles from "./Navbar.module.css";

export type MenuView = "home" | "findMyCircle" | "joinSession" | "viewPreviousSessions" | "immediateHelp";

type NavbarProps = {
  activeView: MenuView;
  onChangeView: (view: MenuView) => void;
  isHome: boolean;
};

const MENU_ITEMS: Array<{ key: MenuView; label: string }> = [
  { key: "home", label: "Home" },
  { key: "findMyCircle", label: "Find My Circle" },
  { key: "joinSession", label: "Join a Session" },
  { key: "viewPreviousSessions", label: "View Previous Sessions" },
  { key: "immediateHelp", label: "Immediate Help" },
];

export default function Navbar({ activeView, onChangeView, isHome }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={`${styles.nav} ${isHome ? "" : styles.navContrast}`}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.brand}
          aria-label="Open Home"
          onClick={() => {
            onChangeView("home");
            setMenuOpen(false);
          }}
        >
          <CairnLogo size={32} />
        </button>
        <div id="main-menu" className={styles.links} data-open={menuOpen ? "true" : "false"}>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onChangeView(item.key);
                setMenuOpen(false);
              }}
              className={`${styles.linkBtn} ${activeView === item.key ? styles.linkActive : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.profileBtn} aria-label="Profile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </button>
          <button
            className={styles.burger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            data-open={menuOpen ? "true" : "false"}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
        </div>
      </div>
    </nav>
  );
}
