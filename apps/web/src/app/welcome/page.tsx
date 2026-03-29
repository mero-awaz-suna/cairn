"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CairnLogo from "@/components/landing/CairnLogo";

const STAGES = [
  {
    emoji: "🌊",
    label: "In the Storm",
    desc: "When everything feels heavy",
    color: "#D4845A",
    bg: "rgba(212,132,90,0.12)",
  },
  {
    emoji: "🌱",
    label: "Finding Ground",
    desc: "Processing. Gaining clarity.",
    color: "#6B8F71",
    bg: "rgba(107,143,113,0.12)",
  },
  {
    emoji: "🌿",
    label: "Through It",
    desc: "Holding space for others",
    color: "#5A7D60",
    bg: "rgba(90,125,96,0.12)",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState(-1);
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    // Stagger the stage reveals
    const t1 = setTimeout(() => setActiveStage(0), 800);
    const t2 = setTimeout(() => setActiveStage(1), 2000);
    const t3 = setTimeout(() => setActiveStage(2), 3200);
    const t4 = setTimeout(() => setShowFinal(true), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center px-8" style={{ backgroundColor: "#2C2825" }}>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
        className="mb-10 relative"
      >
        <div className="absolute inset-0 blur-3xl rounded-full scale-[2]" style={{ backgroundColor: "rgba(107,143,113,0.15)" }} />
        <CairnLogo size={56} className="relative" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="text-[24px] text-center mb-2"
        style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}
      >
        Your journey has three stages
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-[14px] text-center font-light mb-12 max-w-[280px]"
        style={{ color: "#8B7E74" }}
      >
        Cairn meets you where you are — and walks with you
      </motion.p>

      {/* Stage cards */}
      <div className="w-full max-w-[320px] space-y-3 mb-12">
        {STAGES.map((stage, i) => (
          <AnimatePresence key={stage.label}>
            {activeStage >= i && (
              <motion.div
                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1] as const,
                }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
                  style={{ backgroundColor: stage.bg }}
                >
                  {stage.emoji}
                </motion.div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: stage.color }}>{stage.label}</p>
                  <p className="text-[12px] font-light" style={{ color: "#8B7E74" }}>{stage.desc}</p>
                </div>
                {i <= activeStage && activeStage === i && (
                  <motion.div
                    className="ml-auto w-1.5 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* CTA */}
      <AnimatePresence>
        {showFinal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p
              className="text-[16px] mb-8 max-w-[260px]"
              style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}
            >
              Your pace. Your words. Your circle.
            </p>
            <motion.button
              onClick={() => router.push("/home")}
              whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(107,143,113,0.3)" }}
              whileTap={{ scale: 0.97 }}
              className="px-10 py-[14px] rounded-full text-white text-[15px] font-semibold"
              style={{
                backgroundColor: "#6B8F71",
                boxShadow: "0 4px 20px rgba(107,143,113,0.4)",
              }}
            >
              Begin
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
