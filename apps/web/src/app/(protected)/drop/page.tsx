"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { dropBurden } from "../actions";

type Phase = "write" | "pause" | "reveal";

const phaseVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function BurdenDropPage() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("write");
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("");

  const [peerQuote, setPeerQuote] = useState<string | null>(null);

  async function handleDrop() {
    if (!text.trim()) return;
    setPhase("pause");

    const fd = new FormData();
    fd.set("text", text);

    // Real DB save + deliberate 2s minimum pause (held breath, not a spinner)
    const [res] = await Promise.all([
      dropBurden(fd),
      new Promise((r) => setTimeout(r, 2000)),
    ]);

    if (res.error) {
      setTheme("Something you're carrying");
      setCount(1);
    } else {
      setTheme(res.theme || "Something you're carrying");
      setCount(res.count || 1);
      setPeerQuote(res.relatedQuote || null);
    }
    setPhase("reveal");
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: "#F5F0EA" }}>
      <div className="h-[52px] flex-shrink-0" />

      <AnimatePresence mode="wait">
        {phase === "write" && (
          <motion.div
            key="write"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col px-6"
          >
            {/* Header */}
            <div className="mb-8">
              <a
                href="/home"
                className="inline-flex items-center gap-2 text-[13px] font-medium mb-6 transition-colors duration-200"
                style={{ color: "#8B7E74" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Back
              </a>
              <h2 className="font-display text-[26px] leading-[1.2] mb-2" style={{ color: "#2C2825" }}>
                Put it down.
              </h2>
              <p className="text-[14px] font-light leading-[1.6]" style={{ color: "#8B7E74" }}>
                Name what you&apos;re carrying. No one sees your words — only that someone else is carrying the same weight.
              </p>
            </div>

            {/* Text area — borderless, clean */}
            <div className="flex-1 relative mb-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's weighing on you right now..."
                className="w-full h-full min-h-[200px] bg-white rounded-[16px] p-5 text-[15px] font-normal leading-[1.7] resize-none focus:outline-none transition-all duration-300"
                style={{
                  color: "#2C2825",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#E8DFD3",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6B8F71";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(107,143,113,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E8DFD3";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* "Put it down." button — only visible when there's text */}
            <motion.div
              className="text-center"
              animate={{
                opacity: text.trim() ? 1 : 0,
                y: text.trim() ? 0 : 8,
              }}
              transition={{ duration: 0.2 }}
              style={{ pointerEvents: text.trim() ? "auto" : "none" }}
            >
              <motion.button
                onClick={handleDrop}
                className="px-8 py-[14px] rounded-full text-white text-[15px] font-semibold"
                style={{
                  backgroundColor: "#6B8F71",
                  boxShadow: "0 4px 20px rgba(107,143,113,0.4)",
                }}
                whileHover={{ backgroundColor: "#5A7D60" }}
                whileTap={{ scale: 0.97 }}
              >
                Put it down.
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {phase === "pause" && (
          <motion.div
            key="pause"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col items-center justify-center px-8"
          >
            {/* The deliberate pause — smooth breathing animation */}
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#6B8F71" }}
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div
            key="reveal"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col items-center justify-center px-8 text-center"
          >
            {/* The count — the core emotional moment, scales in dramatically */}
            <motion.div
              className="mb-4"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1] as const,
                scale: {
                  type: "spring",
                  damping: 12,
                  stiffness: 100,
                },
              }}
            >
              <span className="font-display text-[56px] leading-[1]" style={{ color: "#2C2825" }}>
                {count}
              </span>
            </motion.div>
            <motion.p
              className="text-[15px] font-light leading-[1.6] max-w-[280px] mb-10"
              style={{ color: "#8B7E74" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
            >
              people in this community are carrying that exact weight right now.
            </motion.p>

            {/* Peer memory card — arrives after count has landed */}
            <PeerMemoryCard theme={theme} />

            {/* Return home */}
            <motion.a
              href="/home"
              className="mt-8 text-[13px] font-medium transition-colors duration-200"
              style={{ color: "#8B7E74" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 3.2, ease: [0.22, 1, 0.36, 1] as const }}
              whileHover={{ color: "#6B8F71" }}
            >
              Return home
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function PeerMemoryCard({ theme }: { theme: string }) {
  const PEER_MEMORIES: Record<string, string> = {
    "Career pressure": "The gap between where you are and where everyone expects you to be by now — someone named that yesterday. And 312 people nodded.",
    "Family weight": "I carry the weight of every meal my mother skipped so I could be here. That sentence showed up in a circle last week.",
    "The invisible debt": "Someone wrote: 'I can't tell them it's not working. They gave up everything for this.' 183 people felt that.",
    "Belonging nowhere fully": "Between two worlds, fully home in neither. A circle member said that — and the room went quiet because everyone recognized it.",
    "Silent burnout": "Some days the hardest part isn't the work — it's pretending the work is the hardest part. 201 people carried that this month.",
  };

  const memory = PEER_MEMORIES[theme] || PEER_MEMORIES["Career pressure"];

  return (
    <motion.div
      className="w-full max-w-[340px] bg-white rounded-[16px] p-5 text-left"
      style={{
        boxShadow: "0 2px 12px rgba(44,40,37,0.05)",
        borderLeft: "3px solid #6B8F71",
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 2.9, ease: [0.22, 1, 0.36, 1] as const }}
    >
      <p className="font-hand text-[16px] leading-[1.5]" style={{ color: "#2C2825" }}>
        {memory}
      </p>
      <div className="mt-3">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-[3px] rounded-[4px]"
          style={{ color: "#6B8F71", backgroundColor: "rgba(107,143,113,0.18)" }}
        >
          {theme.toUpperCase()}
        </span>
      </div>
    </motion.div>
  );
}
