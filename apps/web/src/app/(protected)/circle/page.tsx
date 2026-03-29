"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Phase = "searching" | "found" | "session" | "winding" | "summary";

const CIRCLE_MEMBERS = [
  { alias: "Quiet River", stage: "In the Storm", color: "#D4845A", emoji: "\u{1F30A}" },
  { alias: "Steady Peak", stage: "Finding Ground", color: "#8FB996", emoji: "\u{1F331}" },
  { alias: "Open Sky", stage: "Finding Ground", color: "#5A8FD4", emoji: "\u{1F331}" },
  { alias: "Still Water", stage: "Through It", color: "#6B8F71", emoji: "\u{1F33F}" },
];

const SEARCH_MESSAGES = [
  "Scanning for people who understand your context...",
  "Matching stress patterns and burden themes...",
  "Balancing the circle \u2014 mixing stages for hope...",
  "Found compatible members. Verifying safety...",
];

// Scripted chat messages for demo flow
const SCRIPTED_CHAT: { sender: string; type: "member" | "facilitator"; text: string; delay: number }[] = [
  { sender: "facilitator", type: "facilitator", text: "Welcome, everyone. This is a safe space. No names, no judgment. Share what feels right.", delay: 2000 },
  { sender: "Quiet River", type: "member", text: "I\u2019ve been sitting with something all week. Another rejection email. I know it\u2019s just one, but when you\u2019re on a visa\u2026 each one feels like a countdown.", delay: 5000 },
  { sender: "facilitator", type: "facilitator", text: "That\u2019s a heavy weight to carry alone. Does anyone else recognize that feeling?", delay: 8500 },
  { sender: "Still Water", type: "member", text: "I was there 14 months ago. Same emails, same pit in my stomach. I can\u2019t say it gets easy but\u2026 I\u2019m still here. That counts for something.", delay: 11000 },
  { sender: "Steady Peak", type: "member", text: "The worst part for me is pretending everything is fine at work. Like the rejection doesn\u2019t exist. Performing okayness.", delay: 14000 },
  { sender: "Open Sky", type: "member", text: "My family has no idea. They think everything is going great because I can\u2019t bring myself to tell them.", delay: 17500 },
  { sender: "Quiet River", type: "member", text: "That\u2019s exactly it. The gap between what they see and what\u2019s actually happening\u2026 it\u2019s exhausting.", delay: 20000 },
  { sender: "facilitator", type: "facilitator", text: "I\u2019m noticing something powerful here \u2014 four people, same invisible weight. Still Water, you mentioned you\u2019re on the other side now. What shifted?", delay: 23000 },
  { sender: "Still Water", type: "member", text: "Honestly? I stopped carrying it alone. Found people who got it without me having to explain the visa part. That changed everything.", delay: 26500 },
  { sender: "facilitator", type: "facilitator", text: "We\u2019re approaching the end of our time together. Let\u2019s each name one thing that helped tonight.", delay: 30000 },
  { sender: "Steady Peak", type: "member", text: "Knowing that someone who was exactly where I am made it through. That\u2019s not motivation \u2014 that\u2019s evidence.", delay: 33000 },
  { sender: "Open Sky", type: "member", text: "Just saying it out loud to people who understand. I didn\u2019t realize how much I needed that.", delay: 35500 },
];

const SESSION_INSIGHTS = [
  { text: "Knowing someone who was exactly where you are made it through", emoji: "\u{1F33F}", tag: "Hope transfer" },
  { text: "The \u2018performing okayness\u2019 pattern was named and recognized", emoji: "\u{1F3AD}", tag: "Pattern identified" },
  { text: "Carrying weight alone vs. sharing it changes the weight itself", emoji: "\u{1F91D}", tag: "Core insight" },
];

const ringVariants = {
  animate: (i: number) => ({
    scale: [1, 1.15, 1],
    opacity: [0.25, 0.5, 0.25],
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const, delay: i * 0.4 },
  }),
};

export default function CirclePage() {
  const [phase, setPhase] = useState<Phase>("searching");
  const [searchMsg, setSearchMsg] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visibleMsgs, setVisibleMsgs] = useState<typeof SCRIPTED_CHAT>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [liveCircleId, setLiveCircleId] = useState<string | null>(null);
  const [facilitatorActive, setFacilitatorActive] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const facilitatorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Facilitator polling ──
  const checkFacilitator = useCallback(async () => {
    if (!liveCircleId) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${API_URL}/facilitator/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ circle_id: liveCircleId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.action !== "PASS" && data.message) {
          setFacilitatorActive(true);
          // The message is written to DB by the backend — Supabase Realtime
          // will pick it up. But for the demo, we also inject it locally.
          setVisibleMsgs((prev) => [
            ...prev,
            {
              sender: "facilitator",
              type: "facilitator" as const,
              text: data.message,
              delay: 0,
            },
          ]);
          setTimeout(() => setFacilitatorActive(false), 3000);
        }
      }
    } catch {
      // Facilitator check failed silently — not critical
    }
  }, [liveCircleId, API_URL]);

  // Start facilitator polling when in session with a real circle
  useEffect(() => {
    if (phase !== "session" || !liveCircleId) return;
    // Check every 45 seconds
    facilitatorIntervalRef.current = setInterval(checkFacilitator, 45000);
    // Also check once after 10 seconds
    const initial = setTimeout(checkFacilitator, 10000);
    return () => {
      if (facilitatorIntervalRef.current) clearInterval(facilitatorIntervalRef.current);
      clearTimeout(initial);
    };
  }, [phase, liveCircleId, checkFacilitator]);

  // Search phase
  useEffect(() => {
    if (phase !== "searching") return;
    const msgInterval = setInterval(() => setSearchMsg((p) => Math.min(p + 1, SEARCH_MESSAGES.length - 1)), 1800);
    const progInterval = setInterval(() => setProgress((p) => Math.min(p + 2, 100)), 120);
    const timeout = setTimeout(() => setPhase("found"), 7000);
    return () => { clearInterval(msgInterval); clearInterval(progInterval); clearTimeout(timeout); };
  }, [phase]);

  // Session phase — drip scripted messages
  useEffect(() => {
    if (phase !== "session") return;
    const timer = setInterval(() => setSessionTime((p) => p + 1), 1000);
    const timeouts = SCRIPTED_CHAT.map((msg) =>
      setTimeout(() => {
        setVisibleMsgs((prev) => [...prev, msg]);
      }, msg.delay)
    );
    const windDown = setTimeout(() => setPhase("winding"), 37000);
    return () => { clearInterval(timer); timeouts.forEach(clearTimeout); clearTimeout(windDown); };
  }, [phase]);

  // Wind down -> summary
  useEffect(() => {
    if (phase !== "winding") return;
    const t = setTimeout(() => setPhase("summary"), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMsgs]);

  const sessionMins = Math.floor(sessionTime / 60);
  const sessionSecs = sessionTime % 60;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#2C2825" }}>
      <AnimatePresence mode="wait">
        {/* SEARCHING */}
        {phase === "searching" && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4 } }}
            className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="relative w-[200px] h-[200px] mb-8">
              {[180, 130, 80].map((size, i) => (
                <motion.div key={size} className="absolute rounded-full" style={{ width: size, height: size, border: "1.5px solid rgba(107,143,113,0.25)", top: "50%", left: "50%", x: "-50%", y: "-50%" }}
                  custom={i} variants={ringVariants} animate="animate" />
              ))}
              <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#6B8F71", boxShadow: "0 0 40px rgba(107,143,113,0.5)" }}
                animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </motion.div>
            </div>
            <motion.h2 className="text-[22px] text-center mb-3" style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>Finding your circle...</motion.h2>
            <AnimatePresence mode="wait">
              <motion.p key={searchMsg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
                className="text-[13px] text-center font-light max-w-[280px] mb-8" style={{ color: "#8B7E74" }}>{SEARCH_MESSAGES[searchMsg]}</motion.p>
            </AnimatePresence>
            <div className="w-[200px] h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(107,143,113,0.15)" }}>
              <motion.div className="h-full rounded-full" style={{ backgroundColor: "#6B8F71" }} animate={{ width: `${progress}%` }} />
            </div>
            <motion.div className="flex flex-wrap gap-[6px] justify-center mt-6" initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } } }}>
              {["\u2713 Similar stage", "\u2713 Matched burden", "\u2713 Balanced mix"].map((label, i) => (
                <motion.span key={label} className="text-[11px] font-medium px-3 py-[5px] rounded-full transition-all duration-500"
                  style={searchMsg >= i + 1 ? { backgroundColor: "rgba(107,143,113,0.15)", border: "1px solid #6B8F71", color: "#8FB996" }
                    : { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B7E74" }}
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>{label}</motion.span>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* FOUND */}
        {phase === "found" && (
          <motion.div key="found" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="flex-1 flex flex-col items-center justify-center px-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: "#6B8F71", boxShadow: "0 0 50px rgba(107,143,113,0.4)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-[24px] text-center mb-2" style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}>Circle found</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-[14px] text-center font-light mb-8 max-w-[260px]" style={{ color: "#8B7E74" }}>4 people balanced for hope. AI facilitator active.</motion.p>
            <div className="w-full max-w-[320px] space-y-2.5 mb-8">
              {CIRCLE_MEMBERS.map((m, i) => (
                <motion.div key={m.alias} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[14px]" style={{ backgroundColor: m.color + "25", border: `1.5px solid ${m.color}` }}>{m.emoji}</div>
                  <div className="flex-1"><p className="text-[13px] font-semibold" style={{ color: "#F5F0EA" }}>{m.alias}</p>
                    <p className="text-[11px]" style={{ color: m.color }}>{m.stage}</p></div>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#6B8F71" }} />
                </motion.div>
              ))}
            </div>
            <motion.button onClick={() => setPhase("session")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
              className="px-10 py-[14px] rounded-full text-white text-[15px] font-semibold"
              style={{ backgroundColor: "#6B8F71", boxShadow: "0 4px 20px rgba(107,143,113,0.4)" }}>
              Join Circle
            </motion.button>
          </motion.div>
        )}

        {/* SESSION — Live Chat */}
        {phase === "session" && (
          <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "#F5F0EA" }}>Circle Session</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px]" style={{ color: "#6B8F71" }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ backgroundColor: "#6B8F71" }} />
                    {sessionMins}:{String(sessionSecs).padStart(2, "0")} &middot; 4 members
                  </p>
                  {/* AI Facilitator indicator */}
                  <div className="flex items-center gap-1 px-2 py-[2px] rounded-full" style={{ backgroundColor: facilitatorActive ? "rgba(212,132,90,0.15)" : "rgba(107,143,113,0.1)" }}>
                    <div
                      className="w-[5px] h-[5px] rounded-full"
                      style={{ backgroundColor: facilitatorActive ? "#D4845A" : "#6B8F71" }}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-[0.05em]" style={{ color: facilitatorActive ? "#D4845A" : "#8FB996" }}>
                      {facilitatorActive ? "Speaking" : "AI Active"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex -space-x-2">
                {CIRCLE_MEMBERS.map((m) => (
                  <div key={m.alias} className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] border-2" style={{ backgroundColor: m.color + "30", borderColor: "#2C2825" }}>{m.emoji}</div>
                ))}
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 hide-scrollbar" style={{ paddingBottom: "80px" }}>
              <AnimatePresence>
                {visibleMsgs.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}>
                    {msg.type === "facilitator" ? (
                      <div className="p-3.5 rounded-2xl rounded-tl-sm max-w-[85%]" style={{ backgroundColor: "rgba(232,223,211,0.08)", border: "1px solid rgba(232,223,211,0.1)" }}>
                        <div className="flex items-center gap-[6px] mb-1.5">
                          <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(212,132,90,0.15)" }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#D4845A" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            </svg>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#D4845A" }}>Cairn Facilitator</p>
                        </div>
                        <p className="text-[13.5px] leading-[1.65] font-light" style={{ color: "#E8DFD3" }}>{msg.text}</p>
                      </div>
                    ) : (
                      <div className="flex gap-2.5 items-start">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: (CIRCLE_MEMBERS.find((m) => m.alias === msg.sender)?.color || "#8B7E74") + "25" }}>
                          {CIRCLE_MEMBERS.find((m) => m.alias === msg.sender)?.emoji || "\u{1F331}"}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold mb-1" style={{ color: CIRCLE_MEMBERS.find((m) => m.alias === msg.sender)?.color || "#8B7E74" }}>{msg.sender}</p>
                          <div className="p-3 rounded-2xl rounded-tl-sm" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                            <p className="text-[13.5px] leading-[1.65] font-light" style={{ color: "#C9BFB2" }}>{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(0,0,0,0.2)" }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2.5 rounded-full text-[13px]" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#8B7E74" }}>
                  Share what feels right...
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "#6B8F71" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* WINDING DOWN */}
        {phase === "winding" && (
          <motion.div key="winding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-8">
            <motion.div className="w-4 h-4 rounded-full mb-6" style={{ backgroundColor: "#6B8F71" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
            <motion.p className="text-[16px] text-center mb-2" style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Winding down...</motion.p>
            <motion.p className="text-[13px] text-center font-light" style={{ color: "#8B7E74" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>Building your session summary</motion.p>
          </motion.div>
        )}

        {/* SUMMARY */}
        {phase === "summary" && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col pb-28 overflow-y-auto">
            <div className="h-[52px] flex-shrink-0" />

            {/* Header */}
            <motion.div className="px-6 mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-[24px] mb-1" style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}>Session Complete</h2>
              <p className="text-[13px] font-light" style={{ color: "#8B7E74" }}>4 people &middot; {Math.floor(sessionTime / 60)} minutes &middot; AI facilitated</p>
            </motion.div>

            {/* What helped */}
            <motion.div className="mx-6 mb-5 p-5 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{ color: "#6B8F71" }}>What Helped</p>
              <div className="space-y-3">
                {SESSION_INSIGHTS.map((insight, i) => (
                  <motion.div key={i} className="flex items-start gap-3" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}>
                    <span className="text-[16px] mt-0.5">{insight.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[13.5px] leading-[1.6]" style={{ color: "#E8DFD3" }}>{insight.text}</p>
                      <p className="text-[10px] font-medium mt-1" style={{ color: "#6B8F71" }}>{insight.tag}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quote to keep */}
            <motion.div className="mx-6 mb-5 p-5 rounded-2xl border-l-[3px]"
              style={{ backgroundColor: "rgba(107,143,113,0.06)", borderColor: "#6B8F71" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: "#6B8F71" }}>Quote to Keep</p>
              <p className="text-[15px] leading-[1.7]" style={{ color: "#F2EAD8", fontFamily: "var(--font-hand, serif)", fontStyle: "italic" }}>
                &ldquo;Knowing that someone who was exactly where I am made it through &mdash; that&apos;s not motivation. That&apos;s evidence.&rdquo;
              </p>
              <p className="text-[11px] mt-2" style={{ color: "#8B7E74" }}>&mdash; Steady Peak, Finding Ground</p>
            </motion.div>

            {/* AI Facilitator summary card */}
            <motion.div className="mx-6 mb-5 p-4 rounded-2xl"
              style={{ backgroundColor: "rgba(212,132,90,0.06)", border: "1px solid rgba(212,132,90,0.1)" }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(212,132,90,0.12)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4845A" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: "#D4845A" }}>
                    AI Facilitator Report
                  </p>
                  <p className="text-[12px] leading-[1.6]" style={{ color: "#C9BFB2" }}>
                    Session was emotionally balanced. Hope transfer occurred naturally between
                    &ldquo;Through It&rdquo; and &ldquo;Storm&rdquo; members. No crisis signals detected.
                    The &ldquo;performing okayness&rdquo; pattern was identified as a shared experience
                    across all members.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Persona updated */}
            <motion.div className="mx-6 mb-6 p-4 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: "rgba(107,143,113,0.08)", border: "1px solid rgba(107,143,113,0.15)" }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <span className="text-[20px]">{"\u{1F331}"}</span>
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "#8FB996" }}>Persona updated &rarr; Finding Ground</p>
                <p className="text-[11px] font-light" style={{ color: "#8B7E74" }}>Your next circle match will be even better</p>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div className="mx-6 flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
              <Link href="/echoes" className="flex-1">
                <motion.span whileTap={{ scale: 0.97 }} className="block text-center py-[14px] rounded-full text-[14px] font-medium"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#8B7E74" }}>Memory Wall</motion.span>
              </Link>
              <Link href="/home" className="flex-1">
                <motion.span whileTap={{ scale: 0.97 }} className="block text-center py-[14px] rounded-full text-white text-[14px] font-semibold"
                  style={{ backgroundColor: "#6B8F71", boxShadow: "0 4px 20px rgba(107,143,113,0.4)" }}>Done</motion.span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav variant="dark" />
    </div>
  );
}
