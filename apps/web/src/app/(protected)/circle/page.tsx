"use client";

import { BottomNav } from "@/components/bottom-nav";

export default function CirclePage() {
  return (
    <div className="min-h-screen bg-stone flex flex-col items-center justify-center">
      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 pt-[14px] pb-2 text-[12px] font-bold text-warm-cream z-50">
        <span>9:41</span>
        <div className="flex gap-[5px] items-center">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-[15px] h-[15px]">
            <path d="M1 12h2v3H1zm4-4h2v7H5zm4-3h2v10H9zm4-4h2v14h-2z" />
          </svg>
        </div>
      </div>

      {/* Matching circles animation */}
      <div className="relative w-[200px] h-[200px] mb-8">
        {/* Rings */}
        <div className="absolute w-[180px] h-[180px] rounded-full border-[1.5px] border-[rgba(107,143,113,0.25)] top-1/2 left-1/2 animate-[matchPulse_2.4s_ease-in-out_0.8s_infinite]" />
        <div className="absolute w-[130px] h-[130px] rounded-full border-[1.5px] border-[rgba(107,143,113,0.25)] top-1/2 left-1/2 animate-[matchPulse_2.4s_ease-in-out_0.4s_infinite]" />
        <div className="absolute w-[80px] h-[80px] rounded-full border-[1.5px] border-[rgba(107,143,113,0.25)] top-1/2 left-1/2 animate-[matchPulse_2.4s_ease-in-out_infinite]" />

        {/* Center icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-moss flex items-center justify-center shadow-[0_0_30px_rgba(107,143,113,0.4)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        {/* Anonymous colored dots (no letters — design spec) */}
        {[
          { top: "8px", left: "50%", transform: "translateX(-50%)", bg: "bg-ember" },
          { top: "35%", right: "8px", bg: "bg-moss-light" },
          { bottom: "30%", right: "15px", bg: "bg-blue-soft" },
          { bottom: "8px", left: "50%", transform: "translateX(-50%)", bg: "bg-dusk" },
          { top: "35%", left: "8px", bg: "bg-ember-light" },
        ].map((pos, i) => (
          <div
            key={i}
            className={`absolute w-8 h-8 rounded-full ${pos.bg} border-2 border-stone`}
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
              transform: pos.transform,
              opacity: 0,
              animation: `fadeIn 800ms var(--ease-enter) ${500 + i * 500}ms forwards`,
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <h2 className="font-display text-[22px] text-warm-cream text-center mb-2">
        Finding your circle…
      </h2>
      <p className="text-[13px] text-dusk text-center font-light max-w-[240px]">
        Matching people who understand your context right now
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-[6px] justify-center mt-6 px-8">
        <span className="bg-[rgba(107,143,113,0.1)] border border-moss text-moss-light text-[11px] font-medium px-3 py-[5px] rounded-full">
          ✓ Similar stage
        </span>
        <span className="bg-[rgba(107,143,113,0.1)] border border-moss text-moss-light text-[11px] font-medium px-3 py-[5px] rounded-full">
          ✓ Same field
        </span>
        <span className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-cloud text-[11px] font-medium px-3 py-[5px] rounded-full">
          ◌ Balanced mix
        </span>
      </div>

      {/* Leave queue link */}
      <button className="mt-8 text-[12px] text-dusk font-normal underline underline-offset-2 hover:text-cloud-light transition-colors duration-200">
        I need to step away
      </button>

      <BottomNav variant="dark" />
    </div>
  );
}
