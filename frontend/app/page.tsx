"use client";

import { useMemo, useState } from "react";
import Navbar, { type MenuView } from "@/components/Navbar";
import JoinSession from "@/components/Dashboard";
import FindMyCircle from "@/components/CircleScience";
import ViewMyCircle from "../components/ViewMyCircle";
import JournalPanel from "../components/JournalPanel";
import ViewPreviousSessions from "@/components/MemoryWall";
import Memories from "@/components/Memories";
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
    <main className={styles.main}>
      <Navbar activeView={activeView} onChangeView={setActiveView} isHome={activeView === "home"} />
      <section className={`${styles.content} ${activeView === "home" ? styles.homeContent : ""}`}>
        {currentView}
      </section>
    </main>
  );
}