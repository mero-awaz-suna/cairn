"use client";

import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";

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

const dotColors = ["#D4845A", "#8FB996", "#5A8FD4", "#8B7E74", "#E8A870"];

export default function CirclePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#2C2825" }}>
      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 pt-[14px] pb-2 text-[12px] font-bold z-50" style={{ color: "#F5F0EA" }}>
        <span>9:41</span>
        <div className="flex gap-[5px] items-center">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-[15px] h-[15px]">
            <path d="M1 12h2v3H1zm4-4h2v7H5zm4-3h2v10H9zm4-4h2v14h-2z" />
          </svg>
        </div>
      </div>

      {/* Matching circles animation */}
      <div className="relative w-[200px] h-[200px] mb-8">
        {/* Rings — Framer Motion pulsing */}
        {[180, 130, 80].map((size, i) => (
          <motion.div
            key={size}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              border: "1.5px solid rgba(107,143,113,0.25)",
              top: "50%",
              left: "50%",
              x: "-50%",
              y: "-50%",
            }}
            custom={i}
            variants={ringVariants}
            animate="animate"
          />
        ))}

        {/* Center icon */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "#6B8F71",
            boxShadow: "0 0 30px rgba(107,143,113,0.4)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        {/* Anonymous colored dots — staggered appearances */}
        {[
          { top: "8px", left: "50%", x: "-50%", y: "0%" },
          { top: "35%", right: "8px", x: "0%", y: "0%" },
          { bottom: "30%", right: "15px", x: "0%", y: "0%" },
          { bottom: "8px", left: "50%", x: "-50%", y: "0%" },
          { top: "35%", left: "8px", x: "0%", y: "0%" },
        ].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 rounded-full"
            style={{
              backgroundColor: dotColors[i],
              border: "2px solid #2C2825",
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.5 + i * 0.5,
              ease: [0.22, 1, 0.36, 1] as const,
              scale: {
                type: "spring",
                damping: 15,
                stiffness: 200,
                delay: 0.5 + i * 0.5,
              },
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <motion.h2
        className="font-display text-[22px] text-center mb-2"
        style={{ color: "#F5F0EA" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        Finding your circle…
      </motion.h2>
      <motion.p
        className="text-[13px] text-center font-light max-w-[240px]"
        style={{ color: "#8B7E74" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
      >
        Matching people who understand your context right now
      </motion.p>

      {/* Tags */}
      <motion.div
        className="flex flex-wrap gap-[6px] justify-center mt-6 px-8"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } },
        }}
      >
        {[
          { label: "✓ Similar stage", filled: true },
          { label: "✓ Same field", filled: true },
          { label: "◌ Balanced mix", filled: false },
        ].map((tag) => (
          <motion.span
            key={tag.label}
            className="text-[11px] font-medium px-3 py-[5px] rounded-full"
            style={
              tag.filled
                ? { backgroundColor: "rgba(107,143,113,0.1)", border: "1px solid #6B8F71", color: "#8FB996" }
                : { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#C9BFB2" }
            }
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
            }}
          >
            {tag.label}
          </motion.span>
        ))}
      </motion.div>

      {/* Leave queue link */}
      <motion.button
        className="mt-8 text-[12px] font-normal underline underline-offset-2 transition-colors duration-200"
        style={{ color: "#8B7E74" }}
        whileHover={{ color: "#C9BFB2" }}
        whileTap={{ scale: 0.97 }}
      >
        I need to step away
      </motion.button>

      <BottomNav variant="dark" />
    </div>
  );
}
