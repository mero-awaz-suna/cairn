"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { incrementHelped } from "../actions";

interface Memory {
  id: string;
  quote_text: string;
  burden_tag: string;
  cultural_tag: string;
  helped_count: number;
  source_type: string;
  created_at: string;
}

const FILTERS = ["All", "Career", "Family", "Belonging", "Burnout", "Loneliness"];

const TAG_TO_DISPLAY: Record<string, string> = {
  job_search_rejection: "Career",
  impostor_syndrome_professional: "Career",
  visa_career_intersection_anxiety: "Career",
  first_gen_professional_pressure: "Career",
  family_expectation_gap: "Family",
  invisible_debt: "Family",
  cultural_identity_friction: "Belonging",
  belonging_nowhere: "Belonging",
  academic_performance_weight: "Career",
  loneliness_in_success: "Loneliness",
  financial_stress_hidden: "Family",
  parental_sacrifice_guilt: "Family",
  performance_of_okayness: "Belonging",
  opt_h1b_anxiety: "Career",
  burnout_silent: "Burnout",
  homesickness_complex: "Belonging",
  grief_distance: "Family",
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      delay: i * 0.08,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
};

export function EchoesClient({ memories }: { memories: Memory[] }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [helped, setHelped] = useState<Set<string>>(new Set());

  const filteredMemories =
    activeFilter === "All"
      ? memories
      : memories.filter((m) => {
          const display = TAG_TO_DISPLAY[m.burden_tag] || m.burden_tag;
          return display.toLowerCase() === activeFilter.toLowerCase();
        });

  function handleHelped(id: string) {
    if (helped.has(id)) return;
    setHelped((prev) => new Set(prev).add(id));
    // Fire-and-forget — no loading state, no await
    incrementHelped(id);
  }

  return (
    <>
      <div className="h-[52px] flex-shrink-0" />

      {/* Header */}
      <motion.div
        className="px-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <h2 className="font-display text-[24px] mb-1" style={{ color: "#2C2825" }}>Memory Wall</h2>
        <p className="text-[13px] font-light" style={{ color: "#8B7E74" }}>
          Echoes from past circles — what helped, what gave hope
        </p>
      </motion.div>

      {/* Filter pills — horizontal scroll, no scrollbar */}
      <div className="flex gap-2 px-6 py-4 overflow-x-auto hide-scrollbar">
        {FILTERS.map((filter) => (
          <motion.button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className="flex-shrink-0 rounded-full px-[14px] py-[6px] text-[12px] font-medium transition-colors duration-200"
            style={
              activeFilter === filter
                ? { backgroundColor: "#6B8F71", borderWidth: 1, borderStyle: "solid", borderColor: "#6B8F71", color: "#FFFFFF" }
                : { backgroundColor: "#FFFFFF", borderWidth: 1, borderStyle: "solid", borderColor: "#E8DFD3", color: "#8B7E74" }
            }
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {filter}
          </motion.button>
        ))}
      </div>

      {/* Memory Cards */}
      <div className="px-6 pb-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredMemories.length > 0 ? (
            filteredMemories.map((memory, i) => {
              const displayTag = (TAG_TO_DISPLAY[memory.burden_tag] || memory.burden_tag).toUpperCase();
              const isUserSubmitted = memory.source_type === "user_submitted";
              const isHelped = helped.has(memory.id);
              const count = memory.helped_count + (isHelped ? 1 : 0);

              return (
                <motion.div
                  key={memory.id}
                  custom={i}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  className="bg-white rounded-[16px] p-5 transition-shadow duration-300"
                  style={{
                    boxShadow: i === 0 ? "0 6px 24px rgba(44,40,37,0.08)" : "0 2px 12px rgba(44,40,37,0.05)",
                    borderLeft: "3px solid #6B8F71",
                    padding: i === 0 ? "24px" : undefined,
                  }}
                  whileHover={{ y: -2, boxShadow: "0 6px 24px rgba(44,40,37,0.08)" }}
                >
                  {/* Header */}
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-[3px] rounded-[4px]"
                      style={{ color: "#6B8F71", backgroundColor: "rgba(107,143,113,0.18)" }}
                    >
                      {displayTag}
                    </span>
                    <span className="text-[11px] font-normal" style={{ color: "#C9BFB2" }}>
                      {getRelativeTime(memory.created_at)}
                    </span>
                  </div>

                  {/* Quote — Caveat for user-submitted, Nunito for seeds */}
                  {isUserSubmitted ? (
                    <p className="font-hand text-[17px] leading-[1.5] mb-1" style={{ color: "#2C2825" }}>
                      &ldquo;{memory.quote_text}&rdquo;
                    </p>
                  ) : (
                    <>
                      <h4 className="text-[15px] font-semibold leading-[1.4] mb-[6px]" style={{ color: "#2C2825" }}>
                        &ldquo;{memory.quote_text.split(" — ")[0]}&rdquo;
                      </h4>
                      {memory.quote_text.includes(" — ") && (
                        <p className="text-[13px] font-light leading-[1.6]" style={{ color: "#8B7E74" }}>
                          {memory.quote_text.split(" — ").slice(1).join(" — ")}
                        </p>
                      )}
                    </>
                  )}

                  {/* Footer — helped reaction */}
                  <div className="mt-3">
                    <motion.button
                      onClick={() => handleHelped(memory.id)}
                      className="inline-flex items-center gap-[4px] text-[12px] cursor-pointer"
                      style={{ color: isHelped ? "#6B8F71" : "#8B7E74" }}
                      whileHover={{ color: "#6B8F71" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.span
                        style={{ display: "inline-block" }}
                        animate={isHelped ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as const }}
                      >
                        🌱
                      </motion.span>
                      {count} found this helpful
                    </motion.button>
                  </div>

                  {/* "for you" indicator on first card */}
                  {i === 0 && (
                    <p className="mt-2 text-[11px] font-normal italic" style={{ color: "#8B7E74" }}>
                      — for you
                    </p>
                  )}
                </motion.div>
              );
            })
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div
                className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(107,143,113,0.08)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                  <path d="m22 12-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12" />
                </svg>
              </div>
              <p className="text-[14px] font-light leading-[1.6]" style={{ color: "#8B7E74" }}>
                No memories yet for this — be the first to share<br />one after your next circle.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
