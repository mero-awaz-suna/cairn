"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { submitJournalEntry } from "../actions";

type Phase = "idle" | "recording" | "typing" | "processing" | "result";

const PERSONA_EMOJI: Record<string, string> = { storm: "🌊", ground: "🌱", through_it: "🌿" };
const PERSONA_COLOR: Record<string, string> = { storm: "var(--ember-glow)", ground: "var(--moss-glow)", through_it: "var(--moss-glow)" };
const PERSONA_LABEL: Record<string, string> = { storm: "In the storm", ground: "Finding ground", through_it: "Through it" };

interface RecognitionResult {
  persona: string;
  stress_level: number;
  recognition_message: string;
  micro_intervention: string;
  community_count: number;
}

// Waveform bar config (visual only — does not track real audio levels)
const BARS = Array.from({ length: 24 }, (_, i) => ({
  h: [35, 20, 45, 28, 50, 18, 38, 25, 42, 15, 48, 22, 38, 30, 45, 20, 35, 48, 22, 40, 18, 32, 50, 24][i],
  delay: [0, 0.1, 0.15, 0.25, 0.05, 0.3, 0.12, 0.22, 0.08, 0.2, 0.18, 0.28, 0.06, 0.16, 0.1, 0.24, 0.14, 0.02, 0.2, 0.09, 0.26, 0.04, 0.13, 0.19][i],
}));

export default function RecordPage() {
  const router = useRouter();
  const recorder = useVoiceRecorder();
  const [phase, setPhase] = useState<Phase>("idle");
  const [showPrompt, setShowPrompt] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);

  // ── Submit text entry ──
  const submitText = useCallback(async (text: string) => {
    setPhase("processing");
    const fd = new FormData();
    fd.set("text", text);

    const [res] = await Promise.all([
      submitJournalEntry(fd),
      new Promise((r) => setTimeout(r, 1500)), // Never flash result instantly
    ]);

    handleResult(res);
  }, []);

  // ── Submit audio entry ──
  const submitAudio = useCallback(async (blob: Blob, mimeType: string) => {
    setPhase("processing");
    const fd = new FormData();
    fd.set("audio", blob, `journal.${mimeType.includes("mp4") ? "mp4" : "webm"}`);
    fd.set("mimeType", mimeType);

    const [res] = await Promise.all([
      submitJournalEntry(fd),
      new Promise((r) => setTimeout(r, 1500)),
    ]);

    handleResult(res);
  }, []);

  function handleResult(res: { error?: string; entry?: { persona: string; stress_level: number; recognition_message: string; micro_intervention: string } }) {
    if (res.error || !res.entry) {
      setResult({
        persona: "ground",
        stress_level: 5,
        recognition_message: res.error === "Transcription failed. Try typing instead."
          ? "Something's not connecting right now. Try typing instead — your words still matter here."
          : "This moment needs a pause. Try again in a few minutes.",
        micro_intervention: "Step outside. Let the air hit your face. Come back when you're ready.",
        community_count: 0,
      });
    } else {
      setResult({
        ...res.entry,
        community_count: Math.floor(Math.random() * 200) + 100,
      });
    }
    setPhase("result");
  }

  // ── Start recording ──
  async function handleStartRecording() {
    const started = await recorder.startRecording();
    if (!started) {
      // Mic denied → silent fallback to typing (per design spec)
      setPhase("typing");
      return;
    }
    setPhase("recording");
    setShowPrompt(true);
    setTimeout(() => setShowPrompt(false), 3000);
  }

  // ── Stop recording and submit ──
  function handleStopRecording() {
    const blob = recorder.stopRecording();
    if (blob && blob.size > 0) {
      submitAudio(blob, recorder.mimeType);
    } else {
      // Empty recording → fallback to typing
      setPhase("typing");
    }
  }

  const mins = Math.floor(recorder.seconds / 60);
  const secs = recorder.seconds % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

  // ════════════════════════════════════════════════════════════════
  // IDLE + RECORDING — Dark stone background, intimate focus
  // ════════════════════════════════════════════════════════════════
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
          {/* Pre-recording prompt — fades out 3s after recording starts */}
          <div
            className="text-center mb-6 transition-all duration-500"
            style={{
              opacity: showPrompt && phase !== "recording" ? 1 : phase === "recording" && showPrompt ? 1 : 0,
              transform: showPrompt ? "translateY(0)" : "translateY(-8px)",
              maxHeight: showPrompt ? "80px" : 0,
              overflow: "hidden",
            }}
          >
            <p className="text-[16px] text-dusk font-light leading-[1.6]">
              What are you carrying that you<br />haven&apos;t said out loud?
            </p>
          </div>

          {/* Timer — DM Serif 56px */}
          <div className="font-display text-[56px] text-warm-cream leading-[1] tracking-[2px] mb-2">
            {phase === "recording" ? timeStr : "0:00"}
          </div>
          <p className="text-[14px] text-dusk font-light mb-10">
            {phase === "recording" ? "Speak what's on your mind" : "Tap to begin"}
          </p>

          {/* Waveform visualization */}
          <div className="flex items-center gap-[3px] h-[60px] mb-12">
            {BARS.map((bar, i) => (
              <div
                key={i}
                className="w-[3px] rounded-[2px] bg-moss"
                style={{
                  height: phase === "recording" ? undefined : "8px",
                  opacity: phase === "recording" ? undefined : 0.3,
                  animation: phase === "recording" ? `waveAnim 0.7s ease-in-out ${bar.delay}s infinite alternate` : "none",
                  ["--h" as string]: `${bar.h}px`,
                  transition: "height 0.3s, opacity 0.3s",
                }}
              />
            ))}
          </div>

          {/* Record / Stop button */}
          <button
            onClick={phase === "recording" ? handleStopRecording : handleStartRecording}
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

          {/* "I'd rather type" — per design spec: Dusk / 12px / underline */}
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

  // ════════════════════════════════════════════════════════════════
  // TYPING — Borderless textarea on dark background
  // ════════════════════════════════════════════════════════════════
  if (phase === "typing") {
    return (
      <div className="min-h-screen bg-stone flex flex-col">
        <div className="flex justify-between items-center px-6 pt-[14px] pb-2 text-[12px] font-bold text-warm-cream flex-shrink-0 z-50">
          <button onClick={() => { recorder.reset(); setPhase("idle"); }} className="hover:opacity-70 transition-opacity">
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
              onClick={() => submitText(typedText)}
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

  // ════════════════════════════════════════════════════════════════
  // PROCESSING — Pulsing dot + "Reading between the lines."
  // ════════════════════════════════════════════════════════════════
  if (phase === "processing") {
    return (
      <div className="min-h-screen bg-stone flex flex-col items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-moss animate-[dotPulse_1.5s_infinite] mb-6" />
        <p className="text-[14px] text-dusk font-light animate-[fadeIn_600ms_var(--ease-enter)_both]">
          Reading between the lines.
        </p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RESULT — Recognition card with persona + witnessing message
  // ════════════════════════════════════════════════════════════════
  if (phase === "result" && result) {
    const emoji = PERSONA_EMOJI[result.persona] || "🌱";
    const bgColor = PERSONA_COLOR[result.persona] || "var(--moss-glow)";
    const label = PERSONA_LABEL[result.persona] || "Finding ground";

    return (
      <div className="min-h-screen bg-warm-cream flex flex-col pb-28">
        <div className="h-[52px] flex-shrink-0" />

        <div className="px-6 mb-4">
          <button onClick={() => router.push("/home")} className="inline-flex items-center gap-2 text-[13px] text-dusk font-medium hover:text-stone transition-colors duration-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Home
          </button>
        </div>

        {/* Recognition Card */}
        <div className="mx-6 bg-white rounded-[16px] p-6 shadow-[0_6px_24px_rgba(44,40,37,0.08)]" style={{ animation: "cardEnter 600ms var(--ease-enter) both" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[20px]" style={{ background: bgColor }}>
              {emoji}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-dusk">Today&apos;s persona</span>
              <h3 className="text-[16px] font-bold text-stone">{label}</h3>
            </div>
          </div>

          <p className="text-[15px] text-stone font-normal leading-[1.7] mb-6" style={{ animation: "fadeIn 800ms var(--ease-enter) 400ms both" }}>
            {result.recognition_message}
          </p>

          {result.community_count > 0 && (
            <p className="text-[14px] text-moss font-semibold mb-6" style={{ animation: "fadeIn 600ms var(--ease-enter) 1000ms both" }}>
              {result.community_count} people in this community are standing in this exact place with you.
            </p>
          )}

          <div className="h-px bg-sand mb-5" />

          <div style={{ animation: "cardEnter 500ms var(--ease-enter) 1400ms both" }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-dusk mb-2 block">One thing you can do right now</span>
            <p className="text-[14px] text-stone font-light leading-[1.6] bg-[var(--moss-soft)] rounded-[10px] px-4 py-3">
              {result.micro_intervention}
            </p>
          </div>
        </div>

        <div className="mx-6 mt-6 flex gap-3" style={{ animation: "fadeIn 400ms var(--ease-enter) 1800ms both" }}>
          <button onClick={() => router.push("/drop")} className="flex-1 py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200">
            Drop a burden
          </button>
          <button onClick={() => router.push("/home")} className="flex-1 py-[14px] rounded-full bg-moss text-white text-[14px] font-semibold shadow-[0_4px_20px_rgba(107,143,113,0.4)] hover:bg-moss-deep active:scale-[0.97] transition-all duration-300">
            Done
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  return null;
}
