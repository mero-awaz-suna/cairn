"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredAuth } from "@/lib/auth-client";
import CairnLogo from "./CairnLogo";
import styles from "./Navbar.module.css";

export type MenuView = "home" | "findMyCircle" | "viewMyCircle" | "journal" | "joinSession" | "viewPreviousSessions" | "memories";

type NavbarProps = {
  activeView: MenuView;
  onChangeView: (view: MenuView) => void;
  isHome: boolean;
};

const MENU_ITEMS: Array<{ key: MenuView; label: string }> = [
  { key: "home", label: "Home" },
  { key: "findMyCircle", label: "Find My Circle" },
  { key: "viewMyCircle", label: "View My Circle" },
  { key: "journal", label: "Journal" },
  { key: "joinSession", label: "Join a Session" },
  { key: "viewPreviousSessions", label: "View Previous Sessions" },
  { key: "memories", label: "Memories" },
];

export default function Navbar({ activeView, onChangeView, isHome }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) {
        return;
      }

      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  function handleLogout() {
    clearStoredAuth();
    setProfileMenuOpen(false);
    setMenuOpen(false);
    router.replace("/login");
  }

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
            setProfileMenuOpen(false);
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
                setProfileMenuOpen(false);
              }}
              className={`${styles.linkBtn} ${activeView === item.key ? styles.linkActive : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <div className={styles.profileMenu} ref={profileMenuRef}>
            <button
              type="button"
              className={styles.profileBtn}
              aria-label="Profile"
              aria-haspopup="menu"
              aria-controls="profile-menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((previous) => !previous)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </button>
            <div id="profile-menu" className={styles.profileDropdown} data-open={profileMenuOpen ? "true" : "false"} role="menu" aria-label="Profile options">
              <button type="button" className={styles.profileMenuItem} role="menuitem" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
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
