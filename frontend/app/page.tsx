"use client";

import { TouchEvent, useCallback, useMemo, useRef, useState } from "react";
import Navbar, { type MenuView } from "@/components/Navbar";
import JoinSession from "@/components/Dashboard";
import FindMyCircle from "@/components/CircleScience";
import ViewMyCircle from "../components/ViewMyCircle";
import JournalPanel from "../components/JournalPanel";
import ViewPreviousSessions from "@/components/MemoryWall";
import Memories from "@/components/Memories";
import HomeImage from "@/components/HomeImage";
import styles from "./page.module.css";

const VIEW_SEQUENCE: MenuView[] = [
  "home",
  "findMyCircle",
  "viewMyCircle",
  "journal",
  "joinSession",
  "viewPreviousSessions",
  "memories",
];

const SWIPE_MIN_DISTANCE = 36;
const SWIPE_DIRECTION_RATIO = 1.05;

export default function Home() {
  const [activeView, setActiveView] = useState<MenuView>("home");
  const touchStartRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  const currentIndex = VIEW_SEQUENCE.indexOf(activeView);

  const isMobileScreen = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth <= 768;
  }, []);

  const isInteractiveTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(target.closest("input, textarea, select, button, a, audio, video, [data-swipe-ignore='true']"));
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (!isMobileScreen() || event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, target: event.target };
  }, [isMobileScreen]);

  const handleTouchEnd = useCallback((event: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || !isMobileScreen() || event.changedTouches.length !== 1) {
      return;
    }

    if (isInteractiveTarget(start.target)) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < SWIPE_MIN_DISTANCE || absX < absY * SWIPE_DIRECTION_RATIO) {
      return;
    }

    const currentIndex = VIEW_SEQUENCE.indexOf(activeView);
    if (currentIndex < 0) {
      return;
    }

    // Requested behavior: right swipe -> previous view, left swipe -> next view.
    const targetIndex = deltaX > 0 ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= VIEW_SEQUENCE.length) {
      return;
    }

    setActiveView(VIEW_SEQUENCE[targetIndex]);
  }, [activeView, isInteractiveTarget, isMobileScreen]);

  const currentView = useMemo(() => {
    if (activeView === "home") {
      return <HomeImage />;
    }

    if (activeView === "joinSession") {
      return <JoinSession />;
    }

    if (activeView === "viewMyCircle") {
      return <ViewMyCircle />;
    }

    if (activeView === "journal") {
      return <JournalPanel />;
    }

    if (activeView === "viewPreviousSessions") {
      return <ViewPreviousSessions />;
    }

    if (activeView === "memories") {
      return <Memories />;
    }

    return <FindMyCircle />;
  }, [activeView]);

  return (
    <main className={styles.main} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Navbar activeView={activeView} onChangeView={setActiveView} isHome={activeView === "home"} />
      <section className={`${styles.content} ${activeView === "home" ? styles.homeContent : ""}`}>
        {currentView}
      </section>
      <div className={styles.mobileLocator} aria-hidden="true">
        <div className={styles.locatorDots}>
          {VIEW_SEQUENCE.map((view, index) => (
            <span key={view} className={`${styles.locatorDot} ${index === currentIndex ? styles.locatorDotActive : ""}`} />
          ))}
        </div>
      </div>
    </main>
  );
}