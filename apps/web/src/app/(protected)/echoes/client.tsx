"use client";

import { useState } from "react";
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
      <div className="px-6 animate-[cardEnter_450ms_var(--ease-enter)_both]">
        <h2 className="font-display text-[24px] text-stone mb-1">Memory Wall</h2>
        <p className="text-[13px] text-dusk font-light">
          Echoes from past circles — what helped, what gave hope
        </p>
      </div>

      {/* Filter pills — horizontal scroll, no scrollbar */}
      <div className="flex gap-2 px-6 py-4 overflow-x-auto hide-scrollbar">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`flex-shrink-0 rounded-full px-[14px] py-[6px] text-[12px] font-medium transition-all duration-200 ${
              activeFilter === filter
                ? "bg-moss border border-moss text-white"
                : "bg-white border border-sand text-dusk hover:border-cloud-light"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Memory Cards */}
      <div className="px-6 pb-4 space-y-3">
        {filteredMemories.length > 0 ? (
          filteredMemories.map((memory, i) => {
            const displayTag = (TAG_TO_DISPLAY[memory.burden_tag] || memory.burden_tag).toUpperCase();
            const isUserSubmitted = memory.source_type === "user_submitted";
            const isHelped = helped.has(memory.id);
            const count = memory.helped_count + (isHelped ? 1 : 0);

            return (
              <div
                key={memory.id}
                className={`bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)] border-l-[3px] border-moss hover:-translate-y-[2px] hover:shadow-[0_6px_24px_rgba(44,40,37,0.08)] transition-all duration-300 ${
                  i === 0 ? "shadow-[0_6px_24px_rgba(44,40,37,0.08)] p-6" : ""
                }`}
                style={{
                  animation: `cardEnter 400ms var(--ease-enter) ${i * 80}ms both`,
                }}
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-moss bg-[var(--moss-glow)] px-2 py-[3px] rounded-[4px]">
                    {displayTag}
                  </span>
                  <span className="text-[11px] text-cloud font-normal">
                    {getRelativeTime(memory.created_at)}
                  </span>
                </div>

                {/* Quote — Caveat for user-submitted, Nunito for seeds */}
                {isUserSubmitted ? (
                  <p className="font-hand text-[17px] text-stone leading-[1.5] mb-1">
                    &ldquo;{memory.quote_text}&rdquo;
                  </p>
                ) : (
                  <>
                    <h4 className="text-[15px] font-semibold text-stone leading-[1.4] mb-[6px]">
                      &ldquo;{memory.quote_text.split(" — ")[0]}&rdquo;
                    </h4>
                    {memory.quote_text.includes(" — ") && (
                      <p className="text-[13px] text-dusk font-light leading-[1.6]">
                        {memory.quote_text.split(" — ").slice(1).join(" — ")}
                      </p>
                    )}
                  </>
                )}

                {/* Footer — helped reaction */}
                <div className="mt-3">
                  <button
                    onClick={() => handleHelped(memory.id)}
                    className={`inline-flex items-center gap-[4px] text-[12px] cursor-pointer transition-colors duration-200 ${
                      isHelped ? "text-moss" : "text-dusk hover:text-moss"
                    }`}
                  >
                    <span
                      className={`transition-transform duration-200 ${
                        isHelped ? "scale-[1.3]" : ""
                      }`}
                      style={{
                        display: "inline-block",
                        transition: "transform 200ms cubic-bezier(0.34,1.56,0.64,1)",
                      }}
                    >
                      🌱
                    </span>
                    {count} found this helpful
                  </button>
                </div>

                {/* "for you" indicator on first card */}
                {i === 0 && (
                  <p className="mt-2 text-[11px] text-dusk font-normal italic">
                    — for you
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto rounded-full bg-[var(--moss-soft)] flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                <path d="m22 12-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12" />
              </svg>
            </div>
            <p className="text-[14px] text-dusk font-light leading-[1.6]">
              No memories yet for this — be the first to share<br />one after your next circle.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
