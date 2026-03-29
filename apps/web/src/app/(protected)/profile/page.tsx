import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { ProfileClient } from "./client";

const PERSONA_EMOJI: Record<string, string> = {
  storm: "🌊",
  ground: "🌱",
  through_it: "🌿",
};

const PERSONA_LABEL: Record<string, string> = {
  storm: "In the Storm",
  ground: "Finding Ground",
  through_it: "Through It",
};

const PERSONA_DESC: Record<string, string> = {
  storm: "Processing something heavy right now",
  ground: "Processing and gaining clarity",
  through_it: "On the other side, holding space",
};

const BURDEN_DISPLAY: Record<string, string> = {
  career: "Career pressure",
  family: "Family weight",
  belonging: "Belonging",
  all_of_it: "All of it",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("supabase_auth_id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: personaHistory } = await supabase
    .from("user_persona_history")
    .select("persona, recorded_at")
    .eq("user_id", profile.id)
    .gte("recorded_at", thirtyDaysAgo)
    .order("recorded_at", { ascending: true });

  // Get last 3 burden drops for display
  const { data: burdenDrops } = await supabase
    .from("burden_drops")
    .select("id, extracted_theme, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const persona = profile.current_persona || "ground";
  const emoji = PERSONA_EMOJI[persona] || "🌱";
  const label = PERSONA_LABEL[persona] || "Finding Ground";
  const desc = PERSONA_DESC[persona] || "Processing and gaining clarity";

  const lastJournal = profile.last_journal_at
    ? getRelativeDate(profile.last_journal_at)
    : "Never";

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Status bar */}
      <div className="h-[52px] flex-shrink-0" />

      {/* ── Profile Header (Moss gradient with curved edge) ── */}
      <div
        className="px-6 pt-5 pb-12 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(to bottom right, #6B8F71, #5A7D60)" }}
      >
        <div
          className="absolute left-[-20px] right-[-20px] h-[60px] rounded-[50%_50%_0_0]"
          style={{ bottom: -30, backgroundColor: "#F5F0EA" }}
        />

        {/* Settings gear — top right */}
        <a href="/settings" className="absolute top-5 right-6 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors duration-200 z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </a>

        <div className="w-[72px] h-[72px] mx-auto rounded-full bg-white/20 backdrop-blur-[10px] border-[3px] border-white/30 flex items-center justify-center text-[28px] mb-[10px]">
          {emoji}
        </div>
        <h2 className="font-display text-[22px] text-white mb-[2px]">
          {emoji} {label}
        </h2>
        <p className="text-[13px] text-white/70 font-light">
          Your persona · Last entry: {lastJournal}
        </p>
      </div>

      {/* ── Content ── */}
      <div className="px-6 relative z-10 -mt-2">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-[10px] mb-4">
          {[
            { num: profile.journal_streak, label: "Day streak", href: "/record" },
            { num: profile.circles_joined, label: "Circles", href: "/circle" },
            { num: profile.burdens_dropped, label: "Dropped", href: "/drop" },
          ].map((stat) => (
            <a
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-[10px] py-4 px-3 text-center transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(44,40,37,0.1)]"
              style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}
            >
              <div className="font-display text-[24px]" style={{ color: "#2C2825" }}>{stat.num}</div>
              <div className="text-[11px] font-medium mt-[2px]" style={{ color: "#8B7E74" }}>{stat.label}</div>
            </a>
          ))}
        </div>

        {/* 30-Day Arc */}
        {personaHistory && personaHistory.length > 0 && (
          <div className="bg-white rounded-[16px] p-5 mb-4" style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}>
            <div className="text-[13px] font-bold mb-3 flex items-center gap-[6px]" style={{ color: "#2C2825" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              Your 30-day arc
            </div>
            <div className="flex items-end gap-[3px] h-8">
              {personaHistory.map((entry, i) => {
                const color =
                  entry.persona === "storm" ? "#D4845A"
                    : entry.persona === "through_it" ? "#6B8F71"
                    : "#E8DFD3";
                return (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                    title={`${entry.persona} — ${new Date(entry.recorded_at).toLocaleDateString()}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px]" style={{ color: "#C9BFB2" }}>30 days ago</span>
              <span className="text-[10px]" style={{ color: "#C9BFB2" }}>Today</span>
            </div>
          </div>
        )}

        {/* Today's Persona */}
        <div className="bg-white rounded-[16px] p-5 mb-4" style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}>
          <div className="text-[13px] font-bold mb-[14px] flex items-center gap-[6px]" style={{ color: "#2C2825" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Your Persona
          </div>
          <div className="flex items-center gap-3 rounded-[10px] px-4 py-[14px]" style={{ backgroundColor: "rgba(107,143,113,0.18)" }}>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[16px] flex-shrink-0" style={{ backgroundColor: "#6B8F71" }}>
              {emoji}
            </div>
            <div>
              <h4 className="text-[14px] font-semibold" style={{ color: "#2C2825" }}>{label}</h4>
              <p className="text-[12px] font-normal" style={{ color: "#8B7E74" }}>{desc}</p>
            </div>
          </div>
        </div>

        {/* Burdens Dropped */}
        <div className="bg-white rounded-[16px] p-5 mb-4" style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}>
          <div className="text-[13px] font-bold mb-[14px] flex items-center gap-[6px]" style={{ color: "#2C2825" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20" />
            </svg>
            Burdens dropped
          </div>
          {burdenDrops && burdenDrops.length > 0 ? (
            <div className="space-y-3">
              {burdenDrops.map((drop) => (
                <div key={drop.id} className="flex items-center justify-between">
                  <span className="text-[13px] font-light" style={{ color: "#8B7E74" }}>
                    {drop.extracted_theme.replace(/_/g, " ")}
                  </span>
                  <span className="text-[12px]" style={{ color: "#C9BFB2" }}>
                    {getRelativeDate(drop.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] font-light" style={{ color: "#8B7E74" }}>
              When you drop a burden, it shows up here — with how many others are carrying the same weight.
            </p>
          )}
        </div>

        {/* Matching Context Tags */}
        <div className="bg-white rounded-[16px] p-5 mb-4" style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}>
          <div className="text-[13px] font-bold mb-[14px] flex items-center gap-[6px]" style={{ color: "#2C2825" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" x2="7.01" y1="7" y2="7" />
            </svg>
            Matching Context
          </div>
          <div className="flex flex-wrap gap-[6px]">
            <span
              className="text-[12px] font-medium px-3 py-[5px] rounded-full"
              style={{ backgroundColor: "rgba(212,132,90,0.18)", color: "#D4845A" }}
            >
              {BURDEN_DISPLAY[profile.primary_burden] || profile.primary_burden}
            </span>
            {profile.cultural_context && (
              <span
                className="text-[12px] font-medium px-3 py-[5px] rounded-full"
                style={{ backgroundColor: "rgba(107,143,113,0.18)", color: "#6B8F71" }}
              >
                {profile.cultural_context}
              </span>
            )}
            <span
              className="text-[12px] font-medium px-3 py-[5px] rounded-full"
              style={{ backgroundColor: "rgba(90,143,212,0.1)", color: "#5A8FD4" }}
            >
              {profile.academic_stage?.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Circles summary */}
        <div className="bg-white rounded-[16px] p-5 mb-6" style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}>
          <div className="text-[13px] font-bold mb-[14px] flex items-center gap-[6px]" style={{ color: "#2C2825" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Circles
          </div>
          <p className="text-[13px] font-light" style={{ color: "#8B7E74" }}>
            {profile.circles_joined > 0
              ? `${profile.circles_joined} circle${profile.circles_joined > 1 ? "s" : ""}. You've shown up for others — and they've shown up for you.`
              : "You haven't been in a circle yet. The center button will find you the right one."}
          </p>
          <a href="/circle" className="inline-flex items-center gap-1 mt-3 text-[12px] font-semibold" style={{ color: "#6B8F71" }}>
            Find a circle
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </a>
        </div>

        {/* Sign out */}
        <ProfileClient />
      </div>

      <BottomNav />
    </div>
  );
}

function getRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}
