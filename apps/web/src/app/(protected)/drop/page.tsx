"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";

type Phase = "write" | "pause" | "reveal";

export default function BurdenDropPage() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("write");
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("");

  function handleDrop() {
    if (!text.trim()) return;
    setPhase("pause");

    // Simulate AI extraction + count lookup
    // In production: POST /burden/drop → AI theme extraction → count
    setTimeout(() => {
      const themes = [
        { theme: "Career pressure", count: 312 },
        { theme: "Family weight", count: 247 },
        { theme: "The invisible debt", count: 183 },
        { theme: "Belonging nowhere fully", count: 156 },
        { theme: "Silent burnout", count: 201 },
      ];
      const selected = themes[Math.floor(Math.random() * themes.length)];
      setTheme(selected.theme);
      setCount(selected.count);
      setPhase("reveal");
    }, 2500); // 2.5s deliberate pause — this is not a loading spinner, it's a held breath
  }

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col pb-24">
      <div className="h-[52px] flex-shrink-0" />

      {phase === "write" && (
        <div className="flex-1 flex flex-col px-6 animate-[cardEnter_450ms_var(--ease-enter)_both]">
          {/* Header */}
          <div className="mb-8">
            <a
              href="/home"
              className="inline-flex items-center gap-2 text-[13px] text-dusk font-medium mb-6 hover:text-stone transition-colors duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </a>
            <h2 className="font-display text-[26px] text-stone leading-[1.2] mb-2">
              Put it down.
            </h2>
            <p className="text-[14px] text-dusk font-light leading-[1.6]">
              Name what you&apos;re carrying. No one sees your words — only that someone else is carrying the same weight.
            </p>
          </div>

          {/* Text area — borderless, clean */}
          <div className="flex-1 relative mb-6">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's weighing on you right now..."
              className="w-full h-full min-h-[200px] bg-white border border-sand rounded-[16px] p-5 text-[15px] text-stone font-normal leading-[1.7] resize-none focus:border-moss focus:shadow-[0_0_0_3px_var(--moss-soft)] focus:outline-none transition-all duration-300 placeholder:text-cloud"
            />
          </div>

          {/* "Put it down." button — only visible when there's text */}
          <div
            className="text-center transition-all duration-200"
            style={{
              opacity: text.trim() ? 1 : 0,
              transform: text.trim() ? "translateY(0)" : "translateY(8px)",
              pointerEvents: text.trim() ? "auto" : "none",
            }}
          >
            <button
              onClick={handleDrop}
              className="px-8 py-[14px] rounded-full bg-moss text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(107,143,113,0.4)] hover:bg-moss-deep active:scale-[0.97] transition-all duration-300"
            >
              Put it down.
            </button>
          </div>
        </div>
      )}

      {phase === "pause" && (
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* The deliberate pause — 2 seconds of held breath */}
          <div className="w-3 h-3 rounded-full bg-moss animate-[dotPulse_1.5s_infinite]" />
        </div>
      )}

      {phase === "reveal" && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          {/* The count — the core emotional moment */}
          <div
            className="mb-4"
            style={{
              animation: "burdenReveal 800ms var(--ease-enter) 0ms forwards",
            }}
          >
            <span className="font-display text-[56px] text-stone leading-[1]">
              {count}
            </span>
          </div>
          <p
            className="text-[15px] text-dusk font-light leading-[1.6] max-w-[280px] mb-10"
            style={{
              opacity: 0,
              animation: "fadeIn 600ms var(--ease-enter) 600ms forwards",
            }}
          >
            people in this community are carrying that exact weight right now.
          </p>

          {/* Peer memory card — arrives after count has landed */}
          <PeerMemoryCard theme={theme} />

          {/* Return home */}
          <a
            href="/home"
            className="mt-8 text-[13px] text-dusk font-medium hover:text-moss transition-colors duration-200"
            style={{
              opacity: 0,
              animation: "fadeIn 400ms var(--ease-enter) 3200ms forwards",
            }}
          >
            Return home
          </a>
        </div>
      )}

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
    <div
      className="w-full max-w-[340px] bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)] border-l-[3px] border-moss text-left"
      style={{
        opacity: 0,
        transform: "translateY(24px)",
        animation: "cardSlideUp 500ms var(--ease-enter) 2900ms forwards",
      }}
    >
      <p className="font-hand text-[16px] text-stone leading-[1.5]">
        {memory}
      </p>
      <div className="mt-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-moss bg-[var(--moss-glow)] px-2 py-[3px] rounded-[4px]">
          {theme.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
