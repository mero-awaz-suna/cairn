"use client";

import { TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearStoredAuth, getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import Navbar, { type MenuView } from "@/components/Navbar";
import FindMyCircle from "@/components/CircleScience";
import ViewMyCircle from "../components/ViewMyCircle";
import JournalPanel from "../components/JournalPanel";
import Memories from "@/components/Memories";
import ProfileMe from "@/components/ProfileMe";
import HomeImage from "@/components/HomeImage";
import OnboardPanel from "@/components/OnboardPanel";
import styles from "./page.module.css";

const VIEW_SEQUENCE: MenuView[] = [
  "home",
  "findMyCircle",
  "viewMyCircle",
  "journal",
  "memories",
];

const SWIPE_MIN_DISTANCE = 36;
const SWIPE_DIRECTION_RATIO = 1.05;

type UserOnboardingState = {
  age_group?: string | null;
  occupation?: string | null;
  industry?: string | null;
  language_code?: string | null;
  region_code?: string | null;
  living_situation?: string | null;
};

export default function Home() {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<MenuView>("home");
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isLoadingOnboardStatus, setIsLoadingOnboardStatus] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  const currentIndex = VIEW_SEQUENCE.indexOf(activeView);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (!requestedView) {
      return;
    }

    const allowedViews: MenuView[] = [
      "home",
      "findMyCircle",
      "viewMyCircle",
      "journal",
      "memories",
      "me",
    ];

    if (allowedViews.includes(requestedView as MenuView)) {
      setActiveView(requestedView as MenuView);
    }
  }, [searchParams]);

  // Check onboarding status on mount.
  // A user is considered onboarded only when required demographics are present on /users/me.
  useEffect(() => {
    let cancelled = false;

    async function checkOnboardingStatus() {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) {
          window.location.replace("/login?next=/");
          setIsLoadingOnboardStatus(false);
        }
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/users/me"), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              clearStoredAuth();
              window.location.replace("/login?next=/");
              setIsLoadingOnboardStatus(false);
              return;
            }

            // If onboarding status can't be verified for non-auth errors, keep onboarding gate active.
            setIsOnboarded(false);
            setIsLoadingOnboardStatus(false);
            return;
          }

          const data = (await response.json()) as UserOnboardingState | null;
          const onboarded = Boolean(
            data?.age_group &&
            data?.occupation &&
            data?.living_situation &&
            (data?.industry ?? "").trim()
          );
          setIsOnboarded(onboarded);
          setIsLoadingOnboardStatus(false);
        }
      } catch {
        if (!cancelled) {
          // Network/API failures should not silently bypass onboarding.
          setIsOnboarded(false);
          setIsLoadingOnboardStatus(false);
        }
      }
    }

    void checkOnboardingStatus();

    return () => {
      cancelled = true;
    };
  }, []);

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

    if (activeView === "viewMyCircle") {
      return <ViewMyCircle />;
    }

    if (activeView === "journal") {
      return <JournalPanel />;
    }

    if (activeView === "memories") {
      return <Memories />;
    }

    if (activeView === "me") {
      return <ProfileMe />;
    }

    return <FindMyCircle />;
  }, [activeView]);

  return (
    <>
      {!isLoadingOnboardStatus && isOnboarded === false ? (
        <OnboardPanel
          onOnboardingComplete={() => {
            setIsOnboarded(true);
            setActiveView("home");
          }}
        />
      ) : (
        <main className={styles.main} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <Navbar activeView={activeView} onChangeView={setActiveView} isHome={activeView === "home"} />
          <section className={`${styles.content} ${activeView === "home" ? styles.homeContent : ""}`}>
            {currentView}
          </section>
          {currentIndex >= 0 ? (
            <div className={styles.mobileLocator} aria-hidden="true">
              <div className={styles.locatorDots}>
                {VIEW_SEQUENCE.map((view, index) => (
                  <span key={view} className={`${styles.locatorDot} ${index === currentIndex ? styles.locatorDotActive : ""}`} />
                ))}
              </div>
            </div>
          ) : null}
        </main>
      )}
    </>
  );
}