"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredAuth, getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import CairnLogo from "./CairnLogo";
import styles from "./Navbar.module.css";

export type MenuView = "home" | "findMyCircle" | "viewMyCircle" | "journal" | "memories" | "me";

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
  { key: "memories", label: "Memories" },
];

export default function Navbar({ activeView, onChangeView, isHome }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
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

  useEffect(() => {
    if (!isDeleteConfirmOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeletingUser) {
        setIsDeleteConfirmOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDeleteConfirmOpen, isDeletingUser]);

  function handleLogout() {
    clearStoredAuth();
    setProfileMenuOpen(false);
    setMenuOpen(false);
    router.replace("/login");
  }

  async function handleDeleteUser() {
    setIsDeletingUser(true);

    try {
      const token = getStoredToken();
      const response = await fetch(buildApiUrl("/users/me"), {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = (await response.json().catch(() => null)) as { message?: string; detail?: string } | null;
      if (!response.ok) {
        throw new Error(data?.message ?? data?.detail ?? "Unable to delete your user account right now.");
      }

      clearStoredAuth();
      setIsDeleteConfirmOpen(false);
      setProfileMenuOpen(false);
      setMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete your user account right now.";
      window.alert(message);
    } finally {
      setIsDeletingUser(false);
    }
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
              <button
                type="button"
                className={styles.profileMenuItem}
                role="menuitem"
                onClick={() => {
                  onChangeView("me");
                  setMenuOpen(false);
                  setProfileMenuOpen(false);
                }}
                disabled={isDeletingUser}
              >
                Me
              </button>
              <button type="button" className={styles.profileMenuItem} role="menuitem" onClick={handleLogout} disabled={isDeletingUser}>
                Log out
              </button>
              <button
                type="button"
                className={`${styles.profileMenuItem} ${styles.profileMenuDanger}`}
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setIsDeleteConfirmOpen(true);
                }}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? "Deleting..." : "Delete user"}
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

      {isDeleteConfirmOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!isDeletingUser) {
              setIsDeleteConfirmOpen(false);
            }
          }}
        >
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-label="Delete user confirmation"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Delete your account?</h3>
            <p className={styles.modalText}>This action is permanent and cannot be undone.</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingUser}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={() => void handleDeleteUser()}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
