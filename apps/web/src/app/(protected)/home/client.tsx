"use client";

import Link from "next/link";

const JOURNAL_PROMPTS = [
  "What's present today?",
  "What are you carrying that you haven't said out loud?",
  "What's the thing underneath the thing?",
  "If the performance stopped for a moment — what would you say?",
  "What does today actually feel like?",
  "What's the one thing you wish someone noticed?",
  "What would you tell someone standing exactly where you are?",
];

const PERSONA_EMOJI: Record<string, string> = {
  storm: "🌊",
  ground: "🌱",
  through_it: "🌿",
};

const PERSONA_LABEL: Record<string, string> = {
  storm: "In the storm",
  ground: "Finding ground",
  through_it: "Through it",
};

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
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
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
  return `${days} days ago`;
}

function getDurationStr(transcriptionMs: number | null, aiMs: number | null): string {
  const totalMs = (transcriptionMs || 0) + (aiMs || 0);
  if (totalMs <= 0) return "";
  const secs = Math.round(totalMs / 1000);
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}:${String(remSecs).padStart(2, "0")}`;
}

export function HomeClient({
  displayName,
  profile,
  entries,
}: {
  displayName: string;
  profile: Profile;
  entries: Entry[];
}) {
  const todayPrompt = JOURNAL_PROMPTS[new Date().getDay()];
  const streak = profile.journal_streak;

  return (
    <>
      {/* Status bar spacer */}
      <div className="h-[52px] flex-shrink-0" />

      {/* ── Greeting ── */}
      <div className="px-6 animate-[cardEnter_450ms_var(--ease-enter)_both]">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="font-display text-[26px] text-stone leading-[1.2]">
              {getGreeting()}
            </h2>
            <p className="text-[14px] text-dusk font-normal mt-[2px]">
              {getSubtext(profile.primary_burden)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--moss-glow)] to-[var(--ember-glow)] border-2 border-moss flex items-center justify-center text-[14px] flex-shrink-0">
            {PERSONA_EMOJI[profile.current_persona] || "🌿"}
          </div>
        </div>
      </div>

      {/* ── Streak Card ── */}
      <div
        className="mx-6 mt-4 bg-white rounded-[16px] px-5 py-4 flex items-center gap-[14px] shadow-[0_2px_12px_rgba(44,40,37,0.05)]"
        style={{ animation: "cardEnter 450ms var(--ease-enter) 80ms both" }}
      >
        <span className="text-[28px]">🔥</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-[15px] font-bold text-stone">
            {streak > 0 ? `${streak}-day streak` : "Start your streak"}
          </h4>
          <p className="text-[12px] text-dusk font-normal">
            {streak > 0
              ? "You're building a beautiful habit"
              : "Your first entry starts the count"}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < Math.min(streak, 7)
                  ? "bg-moss"
                  : i === Math.min(streak, 7)
                    ? "bg-sand animate-[dotPulse_2s_infinite]"
                    : "bg-sand"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Journal Prompt Card (Moss gradient) ── */}
      <div
        className="mx-6 mt-5 bg-gradient-to-br from-moss to-moss-deep rounded-[16px] p-6 px-5 text-white relative overflow-hidden"
        style={{ animation: "cardEnter 450ms var(--ease-enter) 160ms both" }}
      >
        {/* Decorative glow */}
        <div className="absolute -top-5 -right-5 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_70%)] rounded-full" />

        <h3 className="font-display text-[18px] mb-[6px] relative z-10">
          {todayPrompt}
        </h3>
        <p className="text-[13px] opacity-85 font-light mb-4 leading-[1.5] relative z-10">
          Speak or type — this is the one place the performance stops.
        </p>

        <Link
          href="/record"
          className="relative z-10 inline-flex items-center gap-2 bg-white/20 backdrop-blur-[10px] border border-white/25 rounded-full px-5 py-[10px] text-white text-[13px] font-semibold hover:bg-white/30 active:scale-[0.97] transition-all duration-300"
        >
          <span className="w-2 h-2 rounded-full bg-[#ff6b6b] animate-[blink_1.5s_infinite]" />
          Record voice note
        </Link>
      </div>

      {/* ── Quick Actions ── */}
      <div
        className="mx-6 mt-4 flex gap-3"
        style={{ animation: "cardEnter 450ms var(--ease-enter) 200ms both" }}
      >
        <Link
          href="/drop"
          className="flex-1 bg-white rounded-[16px] px-4 py-4 shadow-[0_2px_12px_rgba(44,40,37,0.05)] hover:-translate-y-[1px] hover:shadow-[0_6px_24px_rgba(44,40,37,0.08)] active:scale-[0.97] transition-all duration-300 text-center"
        >
          <span className="block text-[20px] mb-1">🪨</span>
          <span className="text-[12px] font-semibold text-stone">Drop a burden</span>
        </Link>
        <Link
          href="/circle"
          className="flex-1 bg-white rounded-[16px] px-4 py-4 shadow-[0_2px_12px_rgba(44,40,37,0.05)] hover:-translate-y-[1px] hover:shadow-[0_6px_24px_rgba(44,40,37,0.08)] active:scale-[0.97] transition-all duration-300 text-center"
        >
          <span className="block text-[20px] mb-1">🤝</span>
          <span className="text-[12px] font-semibold text-stone">Find a circle</span>
        </Link>
        <Link
          href="/echoes"
          className="flex-1 bg-white rounded-[16px] px-4 py-4 shadow-[0_2px_12px_rgba(44,40,37,0.05)] hover:-translate-y-[1px] hover:shadow-[0_6px_24px_rgba(44,40,37,0.08)] active:scale-[0.97] transition-all duration-300 text-center"
        >
          <span className="block text-[20px] mb-1">🌿</span>
          <span className="text-[12px] font-semibold text-stone">Memory Wall</span>
        </Link>
      </div>

      {/* ── Past Entries ── */}
      <div
        className="px-6 pt-6 pb-3 flex justify-between items-center"
        style={{ animation: "cardEnter 450ms var(--ease-enter) 280ms both" }}
      >
        <h3 className="text-[16px] font-bold text-stone">Recent entries</h3>
        {entries.length > 0 && (
          <span className="text-[13px] text-moss font-semibold cursor-pointer">
            See all
          </span>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="space-y-[10px] px-0">
          {entries.map((entry, i) => {
            const emoji = PERSONA_EMOJI[entry.assigned_persona] || "🌱";
            const label = PERSONA_LABEL[entry.assigned_persona] || "Finding ground";
            const stressLabel = getStressLabel(entry.stress_level);
            const moodBg =
              entry.assigned_persona === "storm"
                ? "bg-[var(--ember-glow)]"
                : entry.assigned_persona === "through_it"
                  ? "bg-[var(--moss-glow)]"
                  : "bg-[rgba(90,143,212,0.12)]";
            const duration = getDurationStr(entry.transcription_ms, entry.ai_processing_ms);

            return (
              <div
                key={entry.id}
                className="mx-6 bg-white rounded-[10px] px-4 py-[14px] flex items-center gap-3 shadow-[0_1px_6px_rgba(44,40,37,0.04)] hover:translate-x-[3px] transition-all duration-200 cursor-pointer"
                style={{ animation: `cardEnter 400ms var(--ease-enter) ${300 + i * 80}ms both` }}
              >
                <div className={`w-[38px] h-[38px] rounded-[12px] flex items-center justify-center text-[18px] flex-shrink-0 ${moodBg}`}>
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold text-stone truncate">
                    {label}
                  </h4>
                  <p className="text-[12px] text-dusk font-normal">
                    {getRelativeTime(entry.created_at)} · Stress: {stressLabel}
                  </p>
                </div>
                {duration && (
                  <span className="text-[11px] text-cloud font-medium flex-shrink-0">
                    {duration}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div
          className="mx-6 bg-white rounded-[16px] p-8 shadow-[0_1px_6px_rgba(44,40,37,0.04)] text-center"
          style={{ animation: "cardEnter 450ms var(--ease-enter) 300ms both" }}
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--moss-soft)] flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <p className="text-[14px] text-dusk font-light leading-[1.6]">
            Your journal is waiting for its first entry.
            <br />
            It doesn&apos;t have to be about anything in particular.
          </p>
        </div>
      )}
    </>
  );
}
