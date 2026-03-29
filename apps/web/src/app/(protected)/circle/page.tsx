"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";

type Phase = "searching" | "found";

const ringVariants = {
  animate: (i: number) => ({
    scale: [1, 1.15, 1],
    opacity: [0.25, 0.5, 0.25],
    transition: {
      duration: 2.4,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: i * 0.4,
    },
  }),
};

const CIRCLE_MEMBERS = [
  { alias: "Quiet River", stage: "In the Storm", color: "#D4845A", emoji: "🌊" },
  { alias: "Steady Peak", stage: "Finding Ground", color: "#8FB996", emoji: "🌱" },
  { alias: "Open Sky", stage: "Finding Ground", color: "#5A8FD4", emoji: "🌱" },
  { alias: "Still Water", stage: "Through It", color: "#6B8F71", emoji: "🌿" },
];

const SEARCH_MESSAGES = [
  "Scanning for people who understand your context...",
  "Matching stress patterns and burden themes...",
  "Balancing the circle — mixing stages for hope...",
  "Found compatible members. Verifying safety...",
];

export default function CirclePage() {
  const [phase, setPhase] = useState<Phase>("searching");
  const [searchMsg, setSearchMsg] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through search messages
    const msgInterval = setInterval(() => {
      setSearchMsg((prev) => Math.min(prev + 1, SEARCH_MESSAGES.length - 1));
    }, 1800);

    // Progress bar
    const progInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 120);

    // Transition to found after 7s
    const timeout = setTimeout(() => setPhase("found"), 7000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#2C2825" }}>
      <AnimatePresence mode="wait">
        {phase === "searching" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4 } }}
            className="flex-1 flex flex-col items-center justify-center px-6"
          >
            {/* Pulsing rings */}
            <div className="relative w-[200px] h-[200px] mb-8">
              {[180, 130, 80].map((size, i) => (
                <motion.div
                  key={size}
                  className="absolute rounded-full"
                  style={{
                    width: size, height: size,
                    border: "1.5px solid rgba(107,143,113,0.25)",
                    top: "50%", left: "50%", x: "-50%", y: "-50%",
                  }}
                  custom={i}
                  variants={ringVariants}
                  animate="animate"
                />
              ))}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#6B8F71", boxShadow: "0 0 40px rgba(107,143,113,0.5)" }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </motion.div>
            </div>

            <motion.h2
              className="text-[22px] text-center mb-3"
              style={{ color: "#F5F0EA", fontFamily: "var(--font-display)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Finding your circle...
            </motion.h2>

            {/* Animated search message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={searchMsg}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-[13px] text-center font-light max-w-[280px] mb-8"
                style={{ color: "#8B7E74" }}
              >
                {SEARCH_MESSAGES[searchMsg]}
              </motion.p>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="w-[200px] h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(107,143,113,0.15)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#6B8F71" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Tags */}
            <motion.div
              className="flex flex-wrap gap-[6px] justify-center mt-6"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } } }}
            >
              {[
                { label: "✓ Similar stage", filled: searchMsg >= 1 },
                { label: "✓ Matched burden", filled: searchMsg >= 2 },
                { label: "✓ Balanced mix", filled: searchMsg >= 3 },
              ].map((tag) => (
                <motion.span
                  key={tag.label}
                  className="text-[11px] font-medium px-3 py-[5px] rounded-full transition-all duration-500"
                  style={
                    tag.filled
                      ? { backgroundColor: "rgba(107,143,113,0.15)", border: "1px solid #6B8F71", color: "#8FB996" }
                      : { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B7E74" }
                  }
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                >
                  {tag.label}
                </motion.span>
              ))}
            </motion.div>

            <motion.button
              className="mt-8 text-[12px] font-normal underline underline-offset-2"
              style={{ color: "#8B7E74" }}
              whileTap={{ scale: 0.97 }}
            >
              I need to step away
            </motion.button>
          </motion.div>
        )}

        {phase === "found" && (
          <motion.div
            key="found"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
            className="flex-1 flex flex-col items-center justify-center px-6"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "#6B8F71", boxShadow: "0 0 50px rgba(107,143,113,0.4)" }}
            >
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </motion.svg>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[24px] text-center mb-2"
              style={{ color: "#F5F0EA", fontFamily: "var(--font-display)" }}
            >
              Circle found
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[14px] text-center font-light mb-10 max-w-[260px]"
              style={{ color: "#8B7E74" }}
            >
              4 people who understand what you&apos;re carrying. Balanced for hope.
            </motion.p>

            {/* Circle members */}
            <div className="w-full max-w-[320px] space-y-3 mb-10">
              {CIRCLE_MEMBERS.map((member, i) => (
                <motion.div
                  key={member.alias}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] flex-shrink-0"
                    style={{ backgroundColor: member.color + "25", border: `1.5px solid ${member.color}` }}
                  >
                    {member.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: "#F5F0EA" }}>{member.alias}</p>
                    <p className="text-[11px]" style={{ color: member.color }}>{member.stage}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#6B8F71" }} />
                </motion.div>
              ))}
            </div>

            {/* AI Facilitator note */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="w-full max-w-[320px] p-4 rounded-xl mb-8 text-center"
              style={{ backgroundColor: "rgba(107,143,113,0.08)", border: "1px solid rgba(107,143,113,0.15)" }}
            >
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-1" style={{ color: "#6B8F71" }}>
                AI Facilitator Active
              </p>
              <p className="text-[12px] font-light" style={{ color: "#8B7E74" }}>
                Monitoring safety signals. Will redirect if needed.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex gap-3"
            >
              <Link href="/home">
                <motion.span
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-3 rounded-full text-[14px] font-medium cursor-pointer"
                  style={{ border: "1px solid #E8DFD3", color: "#8B7E74" }}
                >
                  Not now
                </motion.span>
              </Link>
              <motion.span
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block px-8 py-3 rounded-full text-[14px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: "#6B8F71",
                  color: "white",
                  boxShadow: "0 4px 20px rgba(107,143,113,0.4)",
                }}
              >
                Join Circle
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav variant="dark" />
    </div>
  );
}
