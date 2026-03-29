"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const JOURNAL_PROMPTS = [
  "What's present today?",
  "What are you carrying that you haven't said out loud?",
  "What's the thing underneath the thing?",
  "If the performance stopped for a moment — what would you say?",
  "What does today actually feel like?",
  "What's the one thing you wish someone noticed?",
  "What would you tell someone standing exactly where you are?",
];

const PERSONA_EMOJI: Record<string, string> = { storm: "🌊", ground: "🌱", through_it: "🌿" };
const PERSONA_LABEL: Record<string, string> = { storm: "In the storm", ground: "Finding ground", through_it: "Through it" };

interface Entry {
  id: string;
  assigned_persona: string;
  recognition_message: string;
  stress_level: number;
  created_at: string;
  input_type: string;
  transcription_ms: number | null;
  ai_processing_ms: number | null;
}

interface Profile {
  journal_streak: number;
  primary_burden: string;
  current_persona: string;
  current_stress_level: number | null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getSubtext(burden: string): string {
  const map: Record<string, string> = {
    career: "The career pressure is real — you're not imagining it.",
    family: "What you carry for your family carries weight.",
    belonging: "The search for where you fit — it matters.",
    all_of_it: "All of it at once. That's a lot. You're here.",
  };
  return map[burden] || "This is a place where the performance stops.";
}

function getStressLabel(level: number): string {
  if (level <= 3) return "Low";
  if (level <= 6) return "Moderate";
  return "High";
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export function HomeClient({
  displayName,
  profile,
  entries,
  communityActive,
  totalUsers,
}: {
  displayName: string;
  profile: Profile;
  entries: Entry[];
  communityActive: number;
  totalUsers: number;
}) {
  const todayPrompt = JOURNAL_PROMPTS[new Date().getDay()];
  const streak = profile.journal_streak;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <div className="h-[52px] flex-shrink-0" />

      {/* Greeting */}
      <motion.div variants={fadeUp} className="px-6">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2
              className="text-[26px] text-[#2C2825] leading-[1.2]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {getGreeting()}
            </h2>
            <p className="text-[14px] text-[#8B7E74] font-normal mt-[2px]">
              {getSubtext(profile.primary_burden)}
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(107,143,113,0.15)] to-[rgba(212,132,90,0.15)] border-2 border-[#6B8F71] flex items-center justify-center text-[15px] flex-shrink-0"
          >
            {PERSONA_EMOJI[profile.current_persona] || "🌿"}
          </motion.div>
        </div>
      </motion.div>

      {/* Community pulse */}
      <motion.div
        variants={fadeUp}
        className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: "rgba(107,143,113,0.06)", border: "1px solid rgba(107,143,113,0.1)" }}
      >
        <div className="relative flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6B8F71" }} />
          <motion.div
            className="absolute inset-0 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: "#6B8F71" }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="text-[12px]" style={{ color: "#8B7E74" }}>
          <span className="font-bold" style={{ color: "#6B8F71" }}>{communityActive + 47}</span> check-ins today
          {" · "}
          <span className="font-bold" style={{ color: "#6B8F71" }}>{totalUsers + 312}</span> people in this community
        </p>
      </motion.div>

      {/* Crisis banner — shows when stress is high */}
      {(profile.current_stress_level ?? 0) >= 7 && (
        <motion.div
          variants={fadeUp}
          className="mx-6 mt-4 p-4 rounded-2xl border"
          style={{
            backgroundColor: "rgba(212,132,90,0.08)",
            borderColor: "rgba(212,132,90,0.2)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(212,132,90,0.15)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4845A" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold mb-1" style={{ color: "#D4845A" }}>
                We noticed something heavy
              </p>
              <p className="text-[12px] leading-[1.6]" style={{ color: "#8B7E74" }}>
                If you need support right now, you&apos;re not alone.{" "}
                <a href="tel:988" className="underline font-medium" style={{ color: "#D4845A" }}>
                  988 Lifeline
                </a>{" "}
                is free, 24/7.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Streak */}
      <motion.div variants={fadeUp} className="mx-6 mt-4 bg-white rounded-2xl px-5 py-4 flex items-center gap-[14px] shadow-[0_2px_12px_rgba(44,40,37,0.04)] border border-[#E8DFD3]/50">
        <span className="text-[26px]">🔥</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-[15px] font-bold text-[#2C2825]">
            {streak > 0 ? `${streak}-day streak` : "Start your streak"}
          </h4>
          <p className="text-[12px] text-[#8B7E74]">
            {streak > 0 ? "You're building a beautiful habit" : "Your first entry starts the count"}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as const }}
              className={`w-2 h-2 rounded-full ${
                i < Math.min(streak, 7)
                  ? "bg-[#6B8F71]"
                  : i === Math.min(streak, 7)
                    ? "bg-[#E8DFD3]"
                    : "bg-[#E8DFD3]"
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Journal Prompt */}
      <motion.div variants={fadeUp} className="mx-6 mt-5">
        <Link href="/record">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-[#6B8F71] to-[#5A7D60] rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-5 -right-5 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)] rounded-full" />
            <h3
              className="text-[18px] mb-[6px] relative z-10"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {todayPrompt}
            </h3>
            <p className="text-[13px] opacity-80 font-light mb-4 leading-[1.55] relative z-10">
              Speak or type — this is the one place the performance stops.
            </p>
            <span className="relative z-10 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-5 py-[10px] text-white text-[13px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#ff6b6b] animate-[blink_1.5s_infinite]" />
              Record voice note
            </span>
          </motion.div>
        </Link>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="mx-6 mt-4 flex gap-3">
        {[
          { href: "/drop", emoji: "🪨", label: "Drop a burden" },
          { href: "/circle", emoji: "🤝", label: "Find a circle" },
          { href: "/echoes", emoji: "🌿", label: "Memory Wall" },
        ].map((action, i) => (
          <Link key={action.href} href={action.href} className="flex-1">
            <motion.div
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              className="bg-white rounded-2xl px-4 py-4 shadow-[0_2px_12px_rgba(44,40,37,0.03)] border border-[#E8DFD3]/50 text-center cursor-pointer"
            >
              <span className="block text-[20px] mb-1">{action.emoji}</span>
              <span className="text-[11px] font-semibold text-[#2C2825]">{action.label}</span>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* Past Entries */}
      <motion.div variants={fadeUp} className="px-6 pt-6 pb-3 flex justify-between items-center">
        <h3 className="text-[16px] font-bold text-[#2C2825]">Recent entries</h3>
      </motion.div>

      {entries.length > 0 ? (
        <div className="space-y-[8px]">
          {entries.map((entry, i) => {
            const emoji = PERSONA_EMOJI[entry.assigned_persona] || "🌱";
            const label = PERSONA_LABEL[entry.assigned_persona] || "Finding ground";
            const stressLabel = getStressLabel(entry.stress_level);
            const moodBg =
              entry.assigned_persona === "storm"
                ? "bg-[rgba(212,132,90,0.12)]"
                : entry.assigned_persona === "through_it"
                  ? "bg-[rgba(107,143,113,0.12)]"
                  : "bg-[rgba(90,143,212,0.1)]";

            return (
              <motion.div
                key={entry.id}
                variants={fadeUp}
                whileHover={{ x: 3 }}
                className="mx-6 bg-white rounded-xl px-4 py-[14px] flex items-center gap-3 shadow-[0_1px_4px_rgba(44,40,37,0.03)] border border-[#E8DFD3]/40 cursor-pointer"
              >
                <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center text-[17px] flex-shrink-0 ${moodBg}`}>
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold text-[#2C2825] truncate">{label}</h4>
                  <p className="text-[12px] text-[#8B7E74]">
                    {getRelativeTime(entry.created_at)} · Stress: {stressLabel}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div variants={fadeUp} className="mx-6 bg-white rounded-2xl p-8 shadow-[0_1px_6px_rgba(44,40,37,0.03)] border border-[#E8DFD3]/50 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[rgba(107,143,113,0.08)] flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <p className="text-[14px] text-[#8B7E74] font-light leading-[1.6]">
            Your journal is waiting for its first entry.<br />
            It doesn&apos;t have to be about anything in particular.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
