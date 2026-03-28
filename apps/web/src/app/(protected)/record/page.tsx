"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

type Phase = "idle" | "recording" | "typing" | "processing" | "result";

const PERSONA_EMOJI: Record<string, string> = {
  storm: "🌊",
  ground: "🌱",
  through_it: "🌿",
};
const PERSONA_COLOR: Record<string, string> = {
  storm: "var(--ember-glow)",
  ground: "var(--moss-glow)",
  through_it: "var(--moss-glow)",
};
const PERSONA_LABEL: Record<string, string> = {
  storm: "In the storm",
  ground: "Finding ground",
  through_it: "Through it",
};

interface RecognitionResult {
  persona: string;
  stress_level: number;
  recognition_message: string;
  micro_intervention: string;
  community_count: number;
}

export default function RecordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [showPrompt, setShowPrompt] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);

  // Timer
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    const fadeTimer = setTimeout(() => setShowPrompt(false), 3000);
    return () => { clearInterval(t); clearTimeout(fadeTimer); };
  }, [phase]);

  const processEntry = useCallback(() => {
    setPhase("processing");

    // Simulate AI processing — minimum 1.5s (never flash a result instantly — it feels unread)
    setTimeout(() => {
      const personas = ["storm", "ground", "through_it"];
      const selected = personas[Math.floor(Math.random() * 3)];

      const messages: Record<string, string> = {
        storm: "The gap between what you're performing and what you're actually feeling — that distance is exhausting. You're not failing at being okay. You're carrying more than one person should carry without being seen.",
        ground: "You're in the middle of something that doesn't have a name yet. Not a crisis, not fine — somewhere in the unnamed space between. That space is real, and you're not imagining it.",
        through_it: "You've been here before and you found your way through. That doesn't make this lighter — but it means you know something about yourself that no one can take away.",
      };

      const interventions: Record<string, string> = {
        storm: "Step outside for 5 minutes. Don't bring your phone. Just stand somewhere and let the air hit your face.",
        ground: "Write down the one thing you're most afraid to say out loud. Then close the page. You don't have to do anything with it.",
        through_it: "Text one person who has been where you are. Not to vent — just to say 'thinking of you.'",
      };

      setResult({
        persona: selected,
        stress_level: Math.floor(Math.random() * 4) + 4,
        recognition_message: messages[selected],
        micro_intervention: interventions[selected],
        community_count: Math.floor(Math.random() * 200) + 100,
      });
      setPhase("result");
    }, 2500);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

  const bars = Array.from({ length: 24 }, (_, i) => ({
    h: [35,20,45,28,50,18,38,25,42,15,48,22,38,30,45,20,35,48,22,40,18,32,50,24][i],
    delay: [0,0.1,0.15,0.25,0.05,0.3,0.12,0.22,0.08,0.2,0.18,0.28,0.06,0.16,0.1,0.24,0.14,0.02,0.2,0.09,0.26,0.04,0.13,0.19][i],
  }));

  // ── RECORDING / IDLE PHASE ──
  if (phase === "idle" || phase === "recording") {
    return (
      <div className="min-h-screen bg-stone flex flex-col">
        <div className="flex justify-between items-center px-6 pt-[14px] pb-2 text-[12px] font-bold text-warm-cream flex-shrink-0 z-50">
          <a href="/home" className="hover:opacity-70 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </a>
          <span className="text-dusk text-[11px] font-medium">
            {phase === "recording" ? "Recording" : "Check-in"}
          </span>
          <div className="w-[18px]" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Pre-recording prompt */}
          <div
            className="text-center mb-6 transition-all duration-500"
            style={{
              opacity: showPrompt ? 1 : 0,
              transform: showPrompt ? "translateY(0)" : "translateY(-8px)",
              maxHeight: showPrompt ? "80px" : 0,
              overflow: "hidden",
            }}
          >
            <p className="text-[16px] text-dusk font-light leading-[1.6]">
              What are you carrying that you<br />haven&apos;t said out loud?
            </p>
          </div>

          <div className="font-display text-[56px] text-warm-cream leading-[1] tracking-[2px] mb-2">
            {phase === "recording" ? timeStr : "0:00"}
          </div>
          <p className="text-[14px] text-dusk font-light mb-10">
            {phase === "recording" ? "Speak what's on your mind" : "Tap to begin"}
          </p>

          <div className="flex items-center gap-[3px] h-[60px] mb-12">
            {bars.map((bar, i) => (
              <div
                key={i}
                className="w-[3px] rounded-[2px] bg-moss"
                style={{
                  height: phase === "recording" ? undefined : "8px",
                  opacity: phase === "recording" ? undefined : 0.3,
                  animation: phase === "recording"
                    ? `waveAnim 0.7s ease-in-out ${bar.delay}s infinite alternate`
                    : "none",
                  ["--h" as string]: `${bar.h}px`,
                  transition: "height 0.3s, opacity 0.3s",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (phase === "recording") {
                processEntry();
              } else {
                setPhase("recording");
                setSeconds(0);
                setShowPrompt(true);
              }
            }}
            className="w-20 h-20 rounded-full bg-red-soft border-4 border-white/15 flex items-center justify-center shadow-[0_0_40px_rgba(212,90,90,0.3)] hover:scale-[1.06] active:scale-[0.95] transition-all duration-300 mb-5"
          >
            {phase === "recording" ? (
              <div className="w-6 h-6 rounded-[4px] bg-white" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8" /></svg>
            )}
          </button>

          <p className="text-[12px] text-dusk font-normal">
            {phase === "recording" ? "Tap to stop recording" : "Tap the circle to record"}
          </p>

          {phase === "idle" && (
            <button
              onClick={() => setPhase("typing")}
              className="mt-6 text-[12px] text-dusk font-normal underline underline-offset-2 hover:text-cloud-light transition-colors duration-200"
            >
              I&apos;d rather type
            </button>
          )}
        </div>

        <BottomNav variant="dark" />
      </div>
    );
  }

  // ── TYPING PHASE ──
  if (phase === "typing") {
    return (
      <div className="min-h-screen bg-stone flex flex-col">
        <div className="flex justify-between items-center px-6 pt-[14px] pb-2 text-[12px] font-bold text-warm-cream flex-shrink-0 z-50">
          <button onClick={() => setPhase("idle")} className="hover:opacity-70 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-dusk text-[11px] font-medium">Type it out</span>
          <div className="w-[18px]" />
        </div>

        <div className="flex-1 flex flex-col px-6 pt-8 animate-[cardEnter_400ms_var(--ease-enter)_both]">
          <textarea
            autoFocus
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="What's on your mind..."
            className="flex-1 min-h-[300px] bg-transparent border-none text-[16px] text-cloud-light font-light leading-[1.8] resize-none focus:outline-none placeholder:text-dusk/50"
          />

          <div
            className="text-center pb-8 transition-all duration-200"
            style={{
              opacity: typedText.trim() ? 1 : 0,
              pointerEvents: typedText.trim() ? "auto" : "none",
            }}
          >
            <button
              onClick={processEntry}
              className="px-8 py-[14px] rounded-full bg-moss text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(107,143,113,0.4)] hover:bg-moss-deep active:scale-[0.97] transition-all duration-300"
            >
              Submit
            </button>
          </div>
        </div>

        <BottomNav variant="dark" />
      </div>
    );
  }

  // ── PROCESSING PHASE ──
  if (phase === "processing") {
    return (
      <div className="min-h-screen bg-stone flex flex-col items-center justify-center">
        {/* Single pulsing Moss dot + "Reading between the lines." */}
        <div className="w-3 h-3 rounded-full bg-moss animate-[dotPulse_1.5s_infinite] mb-6" />
        <p className="text-[14px] text-dusk font-light animate-[fadeIn_600ms_var(--ease-enter)_both]">
          Reading between the lines.
        </p>
      </div>
    );
  }

  // ── RESULT / RECOGNITION CARD PHASE ──
  if (phase === "result" && result) {
    const emoji = PERSONA_EMOJI[result.persona] || "🌱";
    const bgColor = PERSONA_COLOR[result.persona] || "var(--moss-glow)";
    const label = PERSONA_LABEL[result.persona] || "Finding ground";

    return (
      <div className="min-h-screen bg-warm-cream flex flex-col pb-28">
        <div className="h-[52px] flex-shrink-0" />

        {/* Back button */}
        <div className="px-6 mb-4">
          <button
            onClick={() => router.push("/home")}
            className="inline-flex items-center gap-2 text-[13px] text-dusk font-medium hover:text-stone transition-colors duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Home
          </button>
        </div>

        {/* Recognition Card — the core emotional output */}
        <div
          className="mx-6 bg-white rounded-[16px] p-6 shadow-[0_6px_24px_rgba(44,40,37,0.08)]"
          style={{ animation: "cardEnter 600ms var(--ease-enter) both" }}
        >
          {/* Persona badge */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[20px]"
              style={{ background: bgColor }}
            >
              {emoji}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-dusk">
                Today&apos;s persona
              </span>
              <h3 className="text-[16px] font-bold text-stone">{label}</h3>
            </div>
          </div>

          {/* Recognition message — the AI's witnessing */}
          <p
            className="text-[15px] text-stone font-normal leading-[1.7] mb-6"
            style={{ animation: "fadeIn 800ms var(--ease-enter) 400ms both" }}
          >
            {result.recognition_message}
          </p>

          {/* Community count */}
          <p
            className="text-[14px] text-moss font-semibold mb-6"
            style={{ animation: "fadeIn 600ms var(--ease-enter) 1000ms both" }}
          >
            {result.community_count} people in this community are standing in this exact place with you.
          </p>

          {/* Divider */}
          <div className="h-px bg-sand mb-5" />

          {/* Micro intervention */}
          <div style={{ animation: "cardEnter 500ms var(--ease-enter) 1400ms both" }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-dusk mb-2 block">
              One thing you can do right now
            </span>
            <p className="text-[14px] text-stone font-light leading-[1.6] bg-[var(--moss-soft)] rounded-[10px] px-4 py-3">
              {result.micro_intervention}
            </p>
          </div>
        </div>

        {/* Actions below card */}
        <div
          className="mx-6 mt-6 flex gap-3"
          style={{ animation: "fadeIn 400ms var(--ease-enter) 1800ms both" }}
        >
          <button
            onClick={() => router.push("/drop")}
            className="flex-1 py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
          >
            Drop a burden
          </button>
          <button
            onClick={() => router.push("/home")}
            className="flex-1 py-[14px] rounded-full bg-moss text-white text-[14px] font-semibold shadow-[0_4px_20px_rgba(107,143,113,0.4)] hover:bg-moss-deep active:scale-[0.97] transition-all duration-300"
          >
            Done
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  return null;
}
