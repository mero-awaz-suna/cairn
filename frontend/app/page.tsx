"use client";

import { useMemo, useState } from "react";
import Navbar, { type MenuView } from "@/components/Navbar";
import JoinSession from "@/components/Dashboard";
import FindMyCircle from "@/components/CircleScience";
import ViewPreviousSessions from "@/components/MemoryWall";
import ImmediateHelp from "@/components/ImmediateHelp";
import HomeImage from "@/components/HomeImage";
import styles from "./page.module.css";

export default function Home() {
  const [activeView, setActiveView] = useState<MenuView>("home");

  const currentView = useMemo(() => {
    if (activeView === "home") {
      return <HomeImage />;
    }

    if (activeView === "joinSession") {
      return <JoinSession />;
    }

    if (activeView === "viewPreviousSessions") {
      return <ViewPreviousSessions />;
    }

    if (activeView === "immediateHelp") {
      return <ImmediateHelp />;
    }

    return <FindMyCircle />;
  }, [activeView]);

  return (
    <main className={styles.main}>
      <Navbar activeView={activeView} onChangeView={setActiveView} isHome={activeView === "home"} />
      <section className={`${styles.content} ${activeView === "home" ? styles.homeContent : ""}`}>
        {currentView}
      </section>
    </main>
  );
}