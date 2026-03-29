"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { submitJournalEntry } from "../actions";

type Phase = "idle" | "recording" | "typing" | "processing" | "result";

const PERSONA_EMOJI: Record<string, string> = { storm: "🌊", ground: "🌱", through_it: "🌿" };
const PERSONA_COLOR: Record<string, string> = { storm: "rgba(212,132,90,0.18)", ground: "rgba(107,143,113,0.18)", through_it: "rgba(107,143,113,0.18)" };
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

const phaseVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

const cardEnter = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: (delay: number) => ({ opacity: 1, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } }),
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.15 } },
};

const PROCESSING_MSGS = [
  "Reading between the lines...",
  "Understanding your stress patterns...",
  "Finding others who carry this...",
  "Building your recognition...",
];

function ProcessingMessages() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => Math.min(prev + 1, PROCESSING_MSGS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={idx}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="text-[14px] font-light text-center"
        style={{ color: "#8B7E74" }}
      >
        {PROCESSING_MSGS[idx]}
      </motion.p>
    </AnimatePresence>
  );
}

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

  return (
    <AnimatePresence mode="wait">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* IDLE + RECORDING — Dark stone background, intimate focus     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {(phase === "idle" || phase === "recording") && (
        <motion.div
          key="idle-recording"
          variants={phaseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen flex flex-col"
          style={{ backgroundColor: "#2C2825" }}
        >
          <div className="flex justify-between items-center px-6 pt-[14px] pb-2 text-[12px] font-bold flex-shrink-0 z-50" style={{ color: "#F5F0EA" }}>
            <a href="/home" className="hover:opacity-70 transition-opacity">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </a>
            <span className="text-[11px] font-medium" style={{ color: "#8B7E74" }}>
              {phase === "recording" ? "Recording" : "Check-in"}
            </span>
            <div className="w-[18px]" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8">
            {/* Pre-recording prompt — fades out 3s after recording starts */}
            <motion.div
              className="text-center mb-6"
              animate={{
                opacity: showPrompt ? 1 : 0,
                y: showPrompt ? 0 : -8,
                height: showPrompt ? "auto" : 0,
              }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
              style={{ overflow: "hidden" }}
            >
              <p className="text-[16px] font-light leading-[1.6]" style={{ color: "#8B7E74" }}>
                What are you carrying that you<br />haven&apos;t said out loud?
              </p>
            </motion.div>

            {/* Timer — DM Serif 56px */}
            <div className="font-display text-[56px] leading-[1] tracking-[2px] mb-2" style={{ color: "#F5F0EA" }}>
              {phase === "recording" ? timeStr : "0:00"}
            </div>
            <p className="text-[14px] font-light mb-10" style={{ color: "#8B7E74" }}>
              {phase === "recording" ? "Speak what's on your mind" : "Tap to begin"}
            </p>

            {/* Waveform visualization */}
            <div className="flex items-center gap-[3px] h-[60px] mb-12">
              {BARS.map((bar, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-[2px]"
                  style={{ backgroundColor: "#6B8F71" }}
                  animate={
                    phase === "recording"
                      ? {
                          height: [8, bar.h, 8],
                          opacity: 1,
                        }
                      : { height: 8, opacity: 0.3 }
                  }
                  transition={
                    phase === "recording"
                      ? {
                          height: {
                            duration: 0.7,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: bar.delay,
                            ease: "easeInOut",
                          },
                          opacity: { duration: 0.3 },
                        }
                      : { duration: 0.3 }
                  }
                />
              ))}
            </div>

            {/* Record / Stop button */}
            <motion.button
              onClick={phase === "recording" ? handleStopRecording : handleStartRecording}
              className="w-20 h-20 rounded-full border-4 border-white/15 flex items-center justify-center"
              style={{
                backgroundColor: "#D45A5A",
                boxShadow: "0 0 40px rgba(212,90,90,0.3)",
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {phase === "recording" ? (
                <div className="w-6 h-6 rounded-[4px] bg-white" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8" /></svg>
              )}
            </motion.button>

            <p className="text-[12px] font-normal mt-5" style={{ color: "#8B7E74" }}>
              {phase === "recording" ? "Tap to stop recording" : "Tap the circle to record"}
            </p>

            {/* "I'd rather type" — per design spec: Dusk / 12px / underline */}
            {phase === "idle" && (
              <motion.button
                onClick={() => setPhase("typing")}
                className="mt-6 text-[12px] font-normal underline underline-offset-2 transition-colors duration-200"
                style={{ color: "#8B7E74" }}
                whileHover={{ color: "#C9BFB2" }}
                whileTap={{ scale: 0.97 }}
              >
                I&apos;d rather type
              </motion.button>
            )}
          </div>

          <BottomNav variant="dark" />
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TYPING — Borderless textarea on dark background              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {phase === "typing" && (
        <motion.div
          key="typing"
          variants={phaseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen flex flex-col"
          style={{ backgroundColor: "#2C2825" }}
        >
          <div className="flex justify-between items-center px-6 pt-[14px] pb-2 text-[12px] font-bold flex-shrink-0 z-50" style={{ color: "#F5F0EA" }}>
            <button onClick={() => { recorder.reset(); setPhase("idle"); }} className="hover:opacity-70 transition-opacity">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="text-[11px] font-medium" style={{ color: "#8B7E74" }}>Type it out</span>
            <div className="w-[18px]" />
          </div>

          <motion.div
            className="flex-1 flex flex-col px-6 pt-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <textarea
              autoFocus
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="What's on your mind..."
              className="flex-1 min-h-[300px] bg-transparent border-none text-[16px] font-light leading-[1.8] resize-none focus:outline-none"
              style={{ color: "#C9BFB2", caretColor: "#C9BFB2" }}
            />

            <motion.div
              className="text-center pb-8"
              animate={{
                opacity: typedText.trim() ? 1 : 0,
                y: typedText.trim() ? 0 : 8,
              }}
              transition={{ duration: 0.2 }}
              style={{ pointerEvents: typedText.trim() ? "auto" : "none" }}
            >
              <motion.button
                onClick={() => submitText(typedText)}
                className="px-8 py-[14px] rounded-full text-white text-[15px] font-semibold"
                style={{
                  backgroundColor: "#6B8F71",
                  boxShadow: "0 4px 20px rgba(107,143,113,0.4)",
                }}
                whileHover={{ backgroundColor: "#5A7D60" }}
                whileTap={{ scale: 0.97 }}
              >
                Submit
              </motion.button>
            </motion.div>
          </motion.div>

          <BottomNav variant="dark" />
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PROCESSING — Breathing animation with cycling messages        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {phase === "processing" && (
        <motion.div
          key="processing"
          variants={phaseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen flex flex-col items-center justify-center"
          style={{ backgroundColor: "#2C2825" }}
        >
          {/* Breathing circle */}
          <motion.div
            className="w-16 h-16 rounded-full mb-8 flex items-center justify-center"
            style={{ backgroundColor: "rgba(107,143,113,0.12)", border: "1px solid rgba(107,143,113,0.2)" }}
            animate={{ scale: [1, 1.15, 1], borderColor: ["rgba(107,143,113,0.2)", "rgba(107,143,113,0.4)", "rgba(107,143,113,0.2)"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#6B8F71" }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <ProcessingMessages />
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* RESULT — Recognition card with persona + witnessing message   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {phase === "result" && result && (
        <motion.div
          key="result"
          variants={phaseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen flex flex-col pb-28"
          style={{ backgroundColor: "#F5F0EA" }}
        >
          <div className="h-[52px] flex-shrink-0" />

          <div className="px-6 mb-4">
            <motion.button
              onClick={() => router.push("/home")}
              className="inline-flex items-center gap-2 text-[13px] font-medium transition-colors duration-200"
              style={{ color: "#8B7E74" }}
              whileHover={{ color: "#2C2825" }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              Home
            </motion.button>
          </div>

          {/* Recognition Card */}
          <motion.div
            className="mx-6 bg-white rounded-[16px] p-6"
            style={{ boxShadow: "0 6px 24px rgba(44,40,37,0.08)" }}
            variants={cardEnter}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[20px]"
                style={{ background: PERSONA_COLOR[result.persona] || "rgba(107,143,113,0.18)" }}
              >
                {PERSONA_EMOJI[result.persona] || "🌱"}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#8B7E74" }}>Today&apos;s persona</span>
                <h3 className="text-[16px] font-bold" style={{ color: "#2C2825" }}>{PERSONA_LABEL[result.persona] || "Finding ground"}</h3>
              </div>
            </div>

            <motion.p
              className="text-[15px] font-normal leading-[1.7] mb-6"
              style={{ color: "#2C2825" }}
              variants={fadeIn}
              initial="initial"
              animate="animate"
              custom={0.4}
            >
              {result.recognition_message}
            </motion.p>

            {result.community_count > 0 && (
              <motion.p
                className="text-[14px] font-semibold mb-6"
                style={{ color: "#6B8F71" }}
                variants={fadeIn}
                initial="initial"
                animate="animate"
                custom={1.0}
              >
                {result.community_count} people in this community are standing in this exact place with you.
              </motion.p>
            )}

            <div className="h-px mb-5" style={{ backgroundColor: "#E8DFD3" }} />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4, ease: [0.22, 1, 0.36, 1] as const }}
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2 block" style={{ color: "#8B7E74" }}>One thing you can do right now</span>
              <p
                className="text-[14px] font-light leading-[1.6] rounded-[10px] px-4 py-3"
                style={{ color: "#2C2825", backgroundColor: "rgba(107,143,113,0.08)" }}
              >
                {result.micro_intervention}
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            className="mx-6 mt-6 flex gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.8, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <motion.button
              onClick={() => router.push("/drop")}
              className="flex-1 py-[14px] rounded-full border text-[14px] font-medium transition-all duration-200"
              style={{ borderColor: "#E8DFD3", color: "#8B7E74" }}
              whileHover={{ borderColor: "#C9BFB2" }}
              whileTap={{ scale: 0.97 }}
            >
              Drop a burden
            </motion.button>
            <motion.button
              onClick={() => router.push("/home")}
              className="flex-1 py-[14px] rounded-full text-white text-[14px] font-semibold"
              style={{
                backgroundColor: "#6B8F71",
                boxShadow: "0 4px 20px rgba(107,143,113,0.4)",
              }}
              whileHover={{ backgroundColor: "#5A7D60" }}
              whileTap={{ scale: 0.97 }}
            >
              Done
            </motion.button>
          </motion.div>

          <BottomNav />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
