"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// ── Aggregate data (no individual student data is ever exposed) ──
const WEEKLY_STATS = {
  activeStudents: 347,
  licensedSeats: 500,
  engagementRate: 69,
  counselingCenterAvg: 23,
  stressReduction: 18,
  circlesFormed: 42,
  avgSessionMinutes: 12,
  crisisInterventions: 3,
};

const PERSONA_DISTRIBUTION = [
  { label: "In the storm", pct: 28, color: "#D4845A", emoji: "🌊" },
  { label: "Finding ground", pct: 54, color: "#6B8F71", emoji: "🌱" },
  { label: "Through it", pct: 18, color: "#8FB996", emoji: "🌿" },
];

const BURDEN_THEMES = [
  { theme: "Visa & career pressure", count: 89, trend: "up" },
  { theme: "Family expectations", count: 67, trend: "stable" },
  { theme: "Job search rejection", count: 54, trend: "up" },
  { theme: "Belonging & identity", count: 43, trend: "down" },
  { theme: "OPT timeline anxiety", count: 38, trend: "up" },
  { theme: "Silent burnout", count: 31, trend: "stable" },
  { theme: "Impostor syndrome", count: 27, trend: "down" },
];

const WEEKLY_TREND = [
  { week: "W1", active: 198, circles: 12, burden_drops: 87 },
  { week: "W2", active: 234, circles: 19, burden_drops: 124 },
  { week: "W3", active: 289, circles: 28, burden_drops: 156 },
  { week: "W4", active: 312, circles: 35, burden_drops: 189 },
  { week: "W5", active: 347, circles: 42, burden_drops: 213 },
];

const DEMOGRAPHICS = [
  { label: "Nepali", pct: 34 },
  { label: "Indian", pct: 28 },
  { label: "Bangladeshi", pct: 12 },
  { label: "Pakistani", pct: 11 },
  { label: "Sri Lankan", pct: 8 },
  { label: "Other South Asian", pct: 7 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function UniversityDashboard() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "semester">("month");
  const maxTrend = Math.max(...WEEKLY_TREND.map((w) => w.active));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#2C2825" }}>
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b" style={{ backgroundColor: "rgba(44,40,37,0.92)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(107,143,113,0.15)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "#6B8F71" }}>
                Cairn for Universities
              </p>
              <p className="text-[10px]" style={{ color: "#8B7E74" }}>
                Institutional Wellness Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#6B8F71" }} />
            <span className="text-[11px] font-medium" style={{ color: "#8FB996" }}>Live</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-12">
        {/* ── Header ── */}
        <motion.div
          className="pt-6 pb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <h1
                className="text-[28px] leading-[1.15]"
                style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}
              >
                Carnegie Mellon University
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "#8B7E74" }}>
                Student Wellness Dashboard &middot; Spring 2026
              </p>
            </div>
          </div>

          {/* Time range toggle */}
          <div className="flex gap-1 mt-4 p-[3px] rounded-full w-fit" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
            {(["week", "month", "semester"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-4 py-[6px] rounded-full text-[11px] font-semibold capitalize transition-all duration-200"
                style={
                  timeRange === range
                    ? { backgroundColor: "#6B8F71", color: "white" }
                    : { color: "#8B7E74" }
                }
              >
                {range}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Key Metrics ── */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            {
              num: WEEKLY_STATS.activeStudents,
              label: "Active students",
              sub: `of ${WEEKLY_STATS.licensedSeats} licensed seats`,
              accent: "#6B8F71",
            },
            {
              num: `${WEEKLY_STATS.engagementRate}%`,
              label: "Engagement rate",
              sub: `vs ${WEEKLY_STATS.counselingCenterAvg}% counseling avg`,
              accent: "#8FB996",
            },
            {
              num: `-${WEEKLY_STATS.stressReduction}%`,
              label: "Avg stress level",
              sub: "semester over semester",
              accent: "#6B8F71",
            },
            {
              num: WEEKLY_STATS.circlesFormed,
              label: "Circles formed",
              sub: `${WEEKLY_STATS.avgSessionMinutes} min avg session`,
              accent: "#8FB996",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="absolute top-0 right-0 w-[60px] h-[60px] rounded-full"
                style={{
                  background: `radial-gradient(circle, ${stat.accent}10, transparent 70%)`,
                  transform: "translate(20%, -20%)",
                }}
              />
              <p
                className="text-[28px] leading-[1.1] mb-1"
                style={{ color: "#F2EAD8", fontFamily: "var(--font-display)" }}
              >
                {stat.num}
              </p>
              <p className="text-[12px] font-semibold mb-[2px]" style={{ color: "#F2EAD8" }}>
                {stat.label}
              </p>
              <p className="text-[10px]" style={{ color: "#8B7E74" }}>
                {stat.sub}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Engagement Comparison Callout ── */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-4 mb-4 flex items-center gap-4"
          style={{
            backgroundColor: "rgba(107,143,113,0.08)",
            border: "1px solid rgba(107,143,113,0.15)",
          }}
        >
          <div className="flex-shrink-0 relative">
            <svg width="56" height="56" viewBox="0 0 56 56">
              {/* Counseling center avg - gray ring */}
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24" fill="none" stroke="#8B7E74" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24 * 0.23} ${2 * Math.PI * 24 * 0.77}`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
                opacity="0.4"
              />
              {/* Cairn engagement - green ring */}
              <circle
                cx="28" cy="28" r="24" fill="none" stroke="#6B8F71" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24 * 0.69} ${2 * Math.PI * 24 * 0.31}`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold" style={{ color: "#6B8F71" }}>
              3x
            </span>
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#F2EAD8" }}>
              3x higher engagement than traditional counseling
            </p>
            <p className="text-[11px] mt-[2px]" style={{ color: "#8B7E74" }}>
              {WEEKLY_STATS.engagementRate}% of students use Cairn monthly vs {WEEKLY_STATS.counselingCenterAvg}% using the counseling center
            </p>
          </div>
        </motion.div>

        {/* ── Persona Distribution ── */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-5 mb-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold" style={{ color: "#F2EAD8" }}>
              Cohort emotional state
            </h3>
            <span className="text-[10px] font-medium px-2 py-[3px] rounded-full" style={{ backgroundColor: "rgba(107,143,113,0.1)", color: "#8FB996" }}>
              This week
            </span>
          </div>
          <div className="space-y-3">
            {PERSONA_DISTRIBUTION.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between items-center text-[12px] mb-[6px]">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px]">{p.emoji}</span>
                    <span style={{ color: "#C9BFB2" }}>{p.label}</span>
                  </span>
                  <span className="font-bold" style={{ color: p.color }}>
                    {p.pct}%
                  </span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: p.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Weekly Trend ── */}
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-5 mb-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="text-[13px] font-semibold mb-4" style={{ color: "#F2EAD8" }}>
            Adoption trend
          </h3>
          <div className="flex items-end gap-[6px] h-[100px]">
            {WEEKLY_TREND.map((w, i) => (
              <div key={w.week} className="flex-1 flex flex-col items-center gap-[6px]">
                <motion.div
                  className="w-full rounded-t-md"
                  style={{ backgroundColor: "#6B8F71" }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(w.active / maxTrend) * 80}px` }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="text-[9px] font-medium" style={{ color: "#8B7E74" }}>
                  {w.week}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[10px]" style={{ color: "#8B7E74" }}>
              <span className="font-bold" style={{ color: "#6B8F71" }}>+75%</span> growth in 5 weeks
            </span>
            <span className="text-[10px]" style={{ color: "#8B7E74" }}>
              <span className="font-bold" style={{ color: "#8FB996" }}>213</span> burden drops this week
            </span>
          </div>
        </motion.div>

        {/* ── Top Burden Themes ── */}
        <motion.div
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-5 mb-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="text-[13px] font-semibold mb-4" style={{ color: "#F2EAD8" }}>
            What students are carrying most
          </h3>
          <div className="space-y-[10px]">
            {BURDEN_THEMES.map((t, i) => (
              <motion.div
                key={t.theme}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.06 }}
              >
                <span
                  className="text-[12px] font-bold w-[28px] text-right flex-shrink-0"
                  style={{ color: "#F2EAD8" }}
                >
                  {t.count}
                </span>
                <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(t.count / 89) * 100}%`,
                      backgroundColor: i === 0 ? "#D4845A" : i < 3 ? "#6B8F71" : "#8B7E74",
                    }}
                  />
                </div>
                <span className="text-[11px] flex-shrink-0 min-w-[140px]" style={{ color: "#C9BFB2" }}>
                  {t.theme}
                </span>
                <span className="text-[9px] flex-shrink-0" style={{ color: t.trend === "up" ? "#D4845A" : t.trend === "down" ? "#8FB996" : "#8B7E74" }}>
                  {t.trend === "up" ? "↑" : t.trend === "down" ? "↓" : "—"}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Cultural Demographics ── */}
        <motion.div
          custom={8}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-5 mb-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="text-[13px] font-semibold mb-4" style={{ color: "#F2EAD8" }}>
            Cultural background distribution
          </h3>
          <div className="flex flex-wrap gap-2">
            {DEMOGRAPHICS.map((d) => (
              <div
                key={d.label}
                className="flex items-center gap-[6px] px-3 py-[6px] rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-[11px]" style={{ color: "#C9BFB2" }}>{d.label}</span>
                <span className="text-[11px] font-bold" style={{ color: "#F2EAD8" }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Crisis Interventions ── */}
        <motion.div
          custom={9}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-4 mb-4 flex items-start gap-3"
          style={{
            backgroundColor: "rgba(212,132,90,0.06)",
            border: "1px solid rgba(212,132,90,0.12)",
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-[2px]"
            style={{ backgroundColor: "rgba(212,132,90,0.12)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4845A" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "#D4845A" }}>
              {WEEKLY_STATS.crisisInterventions} crisis interventions this month
            </p>
            <p className="text-[11px] mt-[2px] leading-[1.6]" style={{ color: "#8B7E74" }}>
              AI facilitator detected and responded with verified crisis resources. All resolved within 4 minutes.
              No individual data was exposed.
            </p>
          </div>
        </motion.div>

        {/* ── What This Means (Insight card) ── */}
        <motion.div
          custom={10}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "linear-gradient(135deg, rgba(107,143,113,0.1), rgba(107,143,113,0.04))",
            border: "1px solid rgba(107,143,113,0.15)",
          }}
        >
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: "#8FB996" }}>
            What this data tells us
          </h3>
          <div className="space-y-3">
            {[
              "Visa & career pressure is the dominant stressor — and it's rising. Consider partnering with ISO for dedicated OPT/H1B workshops.",
              "54% of your cohort is in 'Finding Ground' — the stage where peer support has the highest measured impact.",
              "Students who complete 3+ circles show a 42% reduction in self-reported stress over 30 days.",
            ].map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: "#6B8F71" }} />
                <p className="text-[12px] leading-[1.65]" style={{ color: "#C9BFB2" }}>
                  {insight}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── ROI Summary ── */}
        <motion.div
          custom={11}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-5 mb-6"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: "#F2EAD8" }}>
            Return on investment
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "$4.20", label: "Cost per student/mo", sub: "vs $187 counseling session" },
              { value: "347", label: "Students reached", sub: "who wouldn't seek counseling" },
              { value: "91%", label: "Would recommend", sub: "to a friend carrying weight" },
            ].map((roi) => (
              <div key={roi.label} className="text-center">
                <p className="text-[20px] font-bold" style={{ color: "#6B8F71", fontFamily: "var(--font-display)" }}>
                  {roi.value}
                </p>
                <p className="text-[10px] font-semibold mt-1" style={{ color: "#C9BFB2" }}>
                  {roi.label}
                </p>
                <p className="text-[9px] mt-[2px]" style={{ color: "#8B7E74" }}>
                  {roi.sub}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Privacy Notice ── */}
        <motion.div
          custom={12}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl p-5 mb-6"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-[2px]" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B7E74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "#C9BFB2" }}>
                Privacy-first by design
              </p>
              <p className="text-[11px] leading-[1.7]" style={{ color: "#8B7E74" }}>
                This dashboard shows <strong style={{ color: "#C9BFB2" }}>aggregate statistics only</strong>.
                No individual student data, journal entries, burden drops, or circle conversations
                are visible, stored, or accessible to your institution. All personal data is encrypted
                at rest and in transit. Cairn is FERPA-compliant and designed to exceed
                institutional privacy requirements. Students control their own data —
                deletion is immediate and irreversible.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <div className="text-center pb-8">
          <p className="text-[10px]" style={{ color: "#8B7E74" }}>
            Cairn for Universities &middot; Aggregate Wellness Intelligence
          </p>
          <p className="text-[10px] mt-1" style={{ color: "rgba(139,126,116,0.5)" }}>
            Data refreshed every 24 hours &middot; No individual data is collected or displayed
          </p>
        </div>
      </div>
    </div>
  );
}
